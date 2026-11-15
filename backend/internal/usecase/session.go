package usecase

import (
        "context"
        "errors"
        "log"
        "strings"
        "time"

        "vodda/backend/internal/config"
        "vodda/backend/internal/domain"
)

// AwaitingPaymentWindow bounds how long a gateway reservation holds its slot
// before the lazy sweep cancels it and frees the time again.
const AwaitingPaymentWindow = 45 * time.Minute

// BookingGateway is the subset of the payment usecase the booking flow needs.
type BookingGateway interface {
        CreateBookingPayment(ctx context.Context, user *domain.User, session *domain.Session, returnPath string) (*TopupResult, error)
}

// BookResult carries the created session plus, for online payments, the Sep
// token the client posts to OnlinePG (Monafaseh create semantics — the token
// never travels in a URL).
type BookResult struct {
        Session       *domain.Session `json:"session"`
        Token         string          `json:"token,omitempty"`
        ResNum        string          `json:"res_num,omitempty"`
        PaidViaWallet bool            `json:"paid_via_wallet"`
}

// SessionUsecase orchestrates bookings, the session lifecycle, and the
// associated wallet movements (escrow on booking, payout on completion).
type SessionUsecase struct {
        sessions  domain.SessionRepository
        teachers  domain.TeacherRepository
        users     domain.UserRepository
        wallet    domain.WalletRepository
        financial domain.FinancialRepository
        notif     domain.NotificationRepository
        payments  BookingGateway
        cfg       *config.Config
}

// NewSessionUsecase builds a SessionUsecase. The optional FinancialRepository
// preserves compatibility with existing tests while production injects an atomic
// transaction boundary.
func NewSessionUsecase(s domain.SessionRepository, t domain.TeacherRepository, u domain.UserRepository, w domain.WalletRepository, n domain.NotificationRepository, cfg *config.Config, financial ...domain.FinancialRepository) *SessionUsecase {
        var f domain.FinancialRepository
        if len(financial) > 0 {
                f = financial[0]
        }
        return &SessionUsecase{sessions: s, teachers: t, users: u, wallet: w, financial: f, notif: n, cfg: cfg}
}

// WithBookingGateway attaches the online-payment usecase used by the
// "gateway" booking method. Passing nil keeps wallet-only bookings.
func (uc *SessionUsecase) WithBookingGateway(payments BookingGateway) *SessionUsecase {
        uc.payments = payments
        return uc
}

// BookInput is the learner's booking request.
type BookInput struct {
        TeacherID     uint
        ServiceID     uint
        ScheduledAt   time.Time
        Note          string
        PaymentMethod string // "wallet" (default) | "gateway"
        // ReturnPath is the client-chosen callback landing path. Only
        // validated "/app..." paths are stored on the payment order; empty
        // keeps the legacy panel landing.
        ReturnPath string
        // SkipWorkTimeCheck bypasses the teacher's weekly work-time template.
        // The dispatch (فراخوان) confirm path uses it: the teacher already opted
        // in by accepting the call, so the learner's chosen hour stands even if
        // it falls outside the weekly template. Overlap checks still apply.
        SkipWorkTimeCheck bool
        // Instant marks a جلسهٔ فوری — an immediate booking created minutes
        // before start. Requires the teacher's instant switch to be on and
        // ignores the weekly template.
        Instant bool
        // ViaDispatch marks the booking as born from a فراخوان confirm — used
        // by the settlement path to auto-confirm instant dispatch sessions.
        ViaDispatch bool
}

// Book creates a booking: the wallet method charges the learner's wallet up
// front; the gateway method reserves the slot and hands the learner to the
// Saman Sep payment page, activating the session after settlement.
func (uc *SessionUsecase) Book(ctx context.Context, learnerID uint, in BookInput) (*BookResult, error) {
        uc.cancelExpiredAwaiting(ctx)
        uc.expireStaleInstantPending(ctx)

        gatewayPayment := in.PaymentMethod == "gateway"
        if in.PaymentMethod != "" && in.PaymentMethod != "wallet" && in.PaymentMethod != "gateway" {
                return nil, domain.ErrValidation
        }
        if gatewayPayment && uc.payments == nil {
                return nil, domain.ErrForbidden
        }

        teacher, err := uc.teachers.ByID(ctx, in.TeacherID)
        if err != nil {
                return nil, err
        }
        if teacher.Status != domain.TeacherApproved || !teacher.Verified {
                return nil, domain.ErrTeacherNotReady
        }
        if !teacher.Available {
                return nil, domain.ErrTeacherOffline
        }
        if in.Instant && !teacher.InstantEnabled {
                return nil, domain.ErrInstantUnavailable
        }
        if teacher.UserID == learnerID {
                return nil, domain.ErrSelfBooking
        }

        svc, err := uc.teachers.ServiceByID(ctx, in.ServiceID)
        if err != nil || svc.TeacherID != teacher.ID || !svc.Active || svc.Price < 0 || svc.Duration <= 0 || svc.Duration > 240 {
                return nil, domain.ErrValidation
        }
        if len(in.Note) > 500 {
                return nil, domain.ErrValidation
        }
        if svc.Price == 0 && !teacher.FreeEnabled {
                return nil, domain.ErrFreeUnavailable
        }

        now := time.Now()
        if in.Instant {
                // جلسهٔ فوری — رزرو همین لحظه: پنجرهٔ آغاز کوتاه و بدون قالب هفتگی.
                if in.ScheduledAt.Before(now.Add(-time.Minute)) || in.ScheduledAt.After(now.Add(15*time.Minute)) {
                        return nil, domain.ErrValidation
                }
        } else if in.ScheduledAt.Before(now.Add(5*time.Minute)) || in.ScheduledAt.After(now.AddDate(0, 6, 0)) {
                return nil, domain.ErrValidation
        }
        if !in.SkipWorkTimeCheck && !in.Instant {
                if err := uc.ensureWithinWorkTime(ctx, teacher.ID, in.ScheduledAt, svc.Duration); err != nil {
                        return nil, err
                }
        }
        if err := uc.ensureNoOverlap(ctx, learnerID, teacher.ID, in.ScheduledAt, svc.Duration); err != nil {
                return nil, err
        }

        learner, err := uc.users.ByID(ctx, learnerID)
        if err != nil {
                return nil, err
        }
        if !learner.Active {
                return nil, domain.ErrForbidden
        }
        if !gatewayPayment && learner.Wallet < svc.Price {
                return nil, domain.ErrInsufficient
        }

        // Title/body of the teacher notification — the mobile client rings the
        // summon chime for these titles (see CallAlertBar matching).
        notifyTitle := "درخواست جلسه جدید: " + svc.Title
        notifyBody := "یک قرآن‌آموز برای «" + svc.Title + "» درخواست جلسه ثبت کرد؛ از بخش درخواست‌ها تأیید یا رد کنید."
        if in.Instant {
                notifyTitle = "جلسهٔ فوری جدید: " + svc.Title
                notifyBody = "یک قرآن‌آموز همین حالا درخواست جلسهٔ فوری ثبت کرد؛ سریع تأیید کنید تا کلاس آغاز شود."
        } else if svc.Price == 0 {
                notifyTitle = "درخواست جلسهٔ رایگان: " + svc.Title
                notifyBody = "یک قرآن‌آموز جلسهٔ رایگان شما را رزرو کرد؛ از بخش درخواست‌های جلسه تأیید کنید."
        }

        s := &domain.Session{
                LearnerID:   learnerID,
                TeacherID:   teacher.ID,
                ServiceID:   svc.ID,
                Title:       svc.Title,
                ScheduledAt: in.ScheduledAt.UTC(),
                Duration:    svc.Duration,
                Price:       svc.Price,
                Status:      domain.SessionPending,
                Note:        in.Note,
                Instant:     in.Instant,
                ViaDispatch: in.ViaDispatch,
        }

        if gatewayPayment {
                if uc.financial != nil {
                        if err := uc.financial.CreateAwaitingSession(ctx, s); err != nil {
                                return nil, err
                        }
                } else {
                        s.Status = domain.SessionAwaitingPayment
                        if err := uc.sessions.Create(ctx, s); err != nil {
                                return nil, err
                        }
                }
                payment, err := uc.payments.CreateBookingPayment(ctx, learner, s, in.ReturnPath)
                if err != nil {
                        // Free the reserved slot so the learner can retry cleanly.
                        uc.cancelAwaitingSession(ctx, s.ID, "شروع پرداخت ناموفق بود")
                        return nil, err
                }
                return &BookResult{Session: s, Token: payment.Token, ResNum: payment.ResNum, PaidViaWallet: false}, nil
        }

        // خدمات رایگان — جلسهٔ صفر تومانی: بدون کسر کیف پول، بدون درگاه؛
        // درخواست مستقیم به صف تأیید استاد می‌رود.
        if svc.Price == 0 {
                if uc.financial != nil {
                        if err := uc.financial.CreateFreeSession(ctx, s); err != nil {
                                return nil, err
                        }
                } else {
                        if err := uc.sessions.Create(ctx, s); err != nil {
                                return nil, err
                        }
                }
                uc.notify(ctx, teacher.UserID, notifyTitle, notifyBody)
                return &BookResult{Session: s, PaidViaWallet: false}, nil
        }

        if uc.financial != nil {
                if err := uc.financial.CreateFundedSession(ctx, s); err != nil {
                        return nil, err
                }
        } else {
                // Compatibility fallback for isolated tests; production always injects the
                // atomic financial repository.
                if err := uc.sessions.Create(ctx, s); err != nil {
                        return nil, err
                }
                if err := uc.users.AddWallet(ctx, learnerID, -svc.Price); err != nil {
                        uc.cancelUnfundedSession(ctx, s)
                        return nil, err
                }
                if err := uc.wallet.AddTx(ctx, &domain.Transaction{
                        UserID: learnerID, Type: domain.TxSession,
                        Title: "رزرو جلسه: " + svc.Title, Amount: -svc.Price, RefID: s.ID,
                }); err != nil {
                        _ = uc.users.AddWallet(ctx, learnerID, svc.Price)
                        uc.cancelUnfundedSession(ctx, s)
                        return nil, err
                }
        }

        uc.notify(ctx, teacher.UserID, notifyTitle, notifyBody)
        return &BookResult{Session: s, PaidViaWallet: true}, nil
}

// BookingPayment re-initiates the gateway payment for a session that is still
// awaiting payment (e.g. the learner closed the browser mid-checkout).
func (uc *SessionUsecase) BookingPayment(ctx context.Context, learnerID, sessionID uint, returnPath string) (*TopupResult, error) {
        uc.cancelExpiredAwaiting(ctx)
        s, err := uc.sessions.ByID(ctx, sessionID)
        if err != nil {
                return nil, err
        }
        if s.LearnerID != learnerID {
                return nil, domain.ErrForbidden
        }
        if s.Status != domain.SessionAwaitingPayment {
                return nil, domain.ErrConflict
        }
        if uc.payments == nil {
                return nil, domain.ErrForbidden
        }
        learner, err := uc.users.ByID(ctx, learnerID)
        if err != nil {
                return nil, err
        }
        if !learner.Active {
                return nil, domain.ErrForbidden
        }
        _ = uc.financialFailStaleOrders(ctx, s.ID)
        return uc.payments.CreateBookingPayment(ctx, learner, s, returnPath)
}

// ConfirmInstantDispatch auto-confirms an instant session created through the
// فراخوان: the teacher already committed by submitting the offer, so the class
// is ready the same moment the learner confirms — no second accept needed.
// Silently skips anything that does not match (wrong teacher, not instant,
// not pending — e.g. awaiting gateway payment) so callers can stay optimistic.
func (uc *SessionUsecase) ConfirmInstantDispatch(ctx context.Context, sessionID, teacherID uint) error {
        s, err := uc.sessions.ByID(ctx, sessionID)
        if err != nil {
                return err
        }
        if s.TeacherID != teacherID || !s.Instant || !s.ViaDispatch || s.Status != domain.SessionPending {
                return nil
        }
        s.Status = domain.SessionConfirmed
        if err := uc.sessions.Update(ctx, s); err != nil {
                return err
        }
        uc.notify(ctx, s.LearnerID, "جلسهٔ فوری آماده است",
                "استاد فراخوان شما را پذیرفت و جلسه قطعی شد؛ همین حالا می‌توانید وارد کلاس تصویری شوید.")
        if s.Teacher != nil {
                uc.notify(ctx, s.Teacher.UserID, "جلسهٔ فوری قطعی شد",
                        "کاربر پیشنهاد شما را انتخاب کرد و جلسه فوری قطعی شد؛ همین حالا وارد کلاس شوید.")
        }
        return nil
}

// Accept confirms a pending session (teacher action).
func (uc *SessionUsecase) Accept(ctx context.Context, userID, sessionID uint) (*domain.Session, error) {
        s, _, err := uc.ownTeacherSession(ctx, userID, sessionID)
        if err != nil {
                return nil, err
        }
        if s.Status != domain.SessionPending {
                return nil, domain.ErrConflict
        }
        // جلسهٔ فوری تا پایان بازهٔ خودش قابل تأیید است (استاد ممکن است با
        // کمی تأخیر ببیند)؛ جلسهٔ معمولی فقط پیش از آغاز رسمی.
        acceptDeadline := s.ScheduledAt
        if s.Instant {
                acceptDeadline = s.ScheduledAt.Add(time.Duration(s.Duration) * time.Minute)
        }
        if time.Now().After(acceptDeadline) {
                return nil, domain.ErrConflict
        }
        s.Status = domain.SessionConfirmed
        if err := uc.sessions.Update(ctx, s); err != nil {
                return nil, err
        }
        uc.notify(ctx, s.LearnerID, "جلسه تأیید شد", "استاد درخواست جلسه‌ی شما را تأیید کرد.")
        return s, nil
}

// Reject declines a pending session and refunds the learner.
func (uc *SessionUsecase) Reject(ctx context.Context, userID, sessionID uint, reason string) (*domain.Session, error) {
        s, _, err := uc.ownTeacherSession(ctx, userID, sessionID)
        if err != nil {
                return nil, err
        }
        if s.Status != domain.SessionPending {
                return nil, domain.ErrConflict
        }
        if len(reason) > 255 {
                return nil, domain.ErrValidation
        }

        if uc.financial != nil {
                if err := uc.financial.CancelAndRefundSession(ctx, s, []domain.SessionStatus{domain.SessionPending}, reason); err != nil {
                        return nil, err
                }
        } else {
                previousStatus, previousReason := s.Status, s.RejectNote
                s.Status = domain.SessionCanceled
                s.RejectNote = reason
                if err := uc.sessions.Update(ctx, s); err != nil {
                        return nil, err
                }
                if err := uc.refund(ctx, s); err != nil {
                        s.Status, s.RejectNote = previousStatus, previousReason
                        _ = uc.sessions.Update(ctx, s)
                        return nil, err
                }
        }
        uc.notify(ctx, s.LearnerID, "جلسه لغو شد", "استاد درخواست جلسه را رد کرد و مبلغ بازگشت داده شد.")
        return s, nil
}

// Cancel lets the learner cancel a not-yet-held session and refunds them.
func (uc *SessionUsecase) Cancel(ctx context.Context, learnerID, sessionID uint) (*domain.Session, error) {
        s, err := uc.sessions.ByID(ctx, sessionID)
        if err != nil {
                return nil, err
        }
        if s.LearnerID != learnerID {
                return nil, domain.ErrForbidden
        }
        if s.Status != domain.SessionPending && s.Status != domain.SessionConfirmed {
                return nil, domain.ErrConflict
        }

        if uc.financial != nil {
                if err := uc.financial.CancelAndRefundSession(ctx, s, []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}, "لغو توسط قرآن‌آموز"); err != nil {
                        return nil, err
                }
        } else {
                previousStatus := s.Status
                s.Status = domain.SessionCanceled
                if err := uc.sessions.Update(ctx, s); err != nil {
                        return nil, err
                }
                if err := uc.refund(ctx, s); err != nil {
                        s.Status = previousStatus
                        _ = uc.sessions.Update(ctx, s)
                        return nil, err
                }
        }
        if teacher, err := uc.teachers.ByID(ctx, s.TeacherID); err == nil {
                uc.notify(ctx, teacher.UserID, "جلسه لغو شد", "قرآن‌آموز جلسه را لغو کرد.")
        }
        return s, nil
}

// Complete marks a confirmed session done and settles the teacher's earnings,
// deducting the platform commission.
func (uc *SessionUsecase) Complete(ctx context.Context, userID, sessionID uint) (*domain.Session, error) {
        s, teacher, err := uc.ownTeacherSession(ctx, userID, sessionID)
        if err != nil {
                return nil, err
        }
        if s.Status != domain.SessionConfirmed {
                return nil, domain.ErrConflict
        }
        // پایان جلسه پس از آغاز رسمی مجاز است (جلسه ممکن است زودتر از مدت
        // رزروشده تمام شود)؛ پیش از آغاز رسمی خیر.
        if time.Now().Before(s.ScheduledAt) {
                return nil, domain.ErrConflict
        }

        commission := s.Price * int64(uc.cfg.PlatformCommissionPercent) / 100
        earning := s.Price - commission
        if earning < 0 {
                return nil, domain.ErrInternal
        }

        if uc.financial != nil {
                if err := uc.financial.CompleteAndSettleSession(ctx, s, teacher.UserID, earning, commission); err != nil {
                        return nil, err
                }
        } else {
                // Compatibility fallback for isolated tests.
                s.Status = domain.SessionDone
                if err := uc.sessions.Update(ctx, s); err != nil {
                        return nil, err
                }
                if err := uc.users.AddWallet(ctx, teacher.UserID, earning); err != nil {
                        s.Status = domain.SessionConfirmed
                        _ = uc.sessions.Update(ctx, s)
                        return nil, err
                }
                if err := uc.wallet.AddTx(ctx, &domain.Transaction{
                        UserID: teacher.UserID, Type: domain.TxEarning,
                        Title: "درآمد ناخالص جلسه: " + s.Title, Amount: s.Price, RefID: s.ID,
                }); err != nil {
                        _ = uc.users.AddWallet(ctx, teacher.UserID, -earning)
                        s.Status = domain.SessionConfirmed
                        _ = uc.sessions.Update(ctx, s)
                        return nil, err
                }
                _ = uc.wallet.AddTx(ctx, &domain.Transaction{
                        UserID: teacher.UserID, Type: domain.TxCommission,
                        Title: "کارمزد پلتفرم", Amount: -commission, RefID: s.ID,
                })
                teacher.Sessions++
                _ = uc.teachers.Update(ctx, teacher)
        }
        uc.notify(ctx, s.LearnerID, "جلسه برگزار شد", "جلسه‌ی شما به پایان رسید. لطفاً امتیاز دهید.")
        return s, nil
}

// LearnerSessions lists a learner's sessions ("upcoming" | "past" | "").
func (uc *SessionUsecase) LearnerSessions(ctx context.Context, learnerID uint, when string) ([]domain.Session, error) {
        return uc.sessions.ForLearner(ctx, learnerID, when)
}

// TeacherSessions lists a teacher's sessions by status set.
func (uc *SessionUsecase) TeacherSessions(ctx context.Context, userID uint, statuses []domain.SessionStatus) ([]domain.Session, error) {
        teacher, err := uc.teacherProfileForUser(ctx, userID)
        if err != nil {
                return nil, err
        }
        return uc.sessions.ForTeacher(ctx, teacher.ID, statuses)
}

func (uc *SessionUsecase) ownTeacherSession(ctx context.Context, userID, sessionID uint) (*domain.Session, *domain.Teacher, error) {
        teacher, err := uc.teacherProfileForUser(ctx, userID)
        if err != nil {
                return nil, nil, err
        }
        s, err := uc.sessions.ByID(ctx, sessionID)
        if err != nil {
                return nil, nil, err
        }
        if s.TeacherID != teacher.ID {
                return nil, nil, domain.ErrForbidden
        }
        return s, teacher, nil
}

func (uc *SessionUsecase) teacherProfileForUser(ctx context.Context, userID uint) (*domain.Teacher, error) {
        teacher, err := uc.teachers.ByUserID(ctx, userID)
        if errors.Is(err, domain.ErrNotFound) {
                return nil, domain.ErrTeacherProfileRequired
        }
        return teacher, err
}

// LiveAccess resolves a session for online-classroom participation. The
// learner, the session's teacher, and admins may join; everyone else is
// rejected. The returned role reflects the caller's position in this session.
func (uc *SessionUsecase) LiveAccess(ctx context.Context, userID uint, role domain.Role, sessionID uint) (*domain.Session, domain.Role, error) {
        s, err := uc.sessions.ByID(ctx, sessionID)
        if err != nil {
                return nil, "", err
        }
        if s.LearnerID == userID {
                return s, domain.RoleLearner, nil
        }
        if role == domain.RoleAdmin {
                return s, domain.RoleAdmin, nil
        }
        if teacher, terr := uc.teachers.ByUserID(ctx, userID); terr == nil && teacher != nil && teacher.ID == s.TeacherID {
                return s, domain.RoleTeacher, nil
        }
        return nil, "", domain.ErrForbidden
}

func (uc *SessionUsecase) ensureWithinWorkTime(ctx context.Context, teacherID uint, scheduledAt time.Time, duration int) error {
        location, err := time.LoadLocation(uc.cfg.AppTimezone)
        if err != nil {
                return err
        }
        local := scheduledAt.In(location)
        weekday := (int(local.Weekday()) + 1) % 7 // Go Sunday=0; Vodda Saturday=0.
        startMinute := local.Hour()*60 + local.Minute()
        endMinute := startMinute + duration

        workTimes, err := uc.teachers.WorkTimes(ctx, teacherID)
        if err != nil {
                return err
        }
        for _, slot := range workTimes {
                if !slot.Active || slot.Weekday != weekday {
                        continue
                }
                from, okFrom := parseClock(slot.FromTime)
                to, okTo := parseClock(slot.ToTime)
                if okFrom && okTo && startMinute >= from && endMinute <= to {
                        return nil
                }
        }
        return domain.ErrValidation
}

func (uc *SessionUsecase) ensureNoOverlap(ctx context.Context, learnerID, teacherID uint, start time.Time, duration int) error {
        end := start.Add(time.Duration(duration) * time.Minute)
        statuses := []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed, domain.SessionAwaitingPayment}
        teacherSessions, err := uc.sessions.ForTeacher(ctx, teacherID, statuses)
        if err != nil {
                return err
        }
        for _, existing := range teacherSessions {
                if overlaps(start, end, existing.ScheduledAt, existing.ScheduledAt.Add(time.Duration(existing.Duration)*time.Minute)) {
                        return domain.ErrConflict
                }
        }

        learnerSessions, err := uc.sessions.ForLearner(ctx, learnerID, "upcoming")
        if err != nil {
                return err
        }
        for _, existing := range learnerSessions {
                if existing.Status != domain.SessionPending && existing.Status != domain.SessionConfirmed && existing.Status != domain.SessionAwaitingPayment {
                        continue
                }
                if overlaps(start, end, existing.ScheduledAt, existing.ScheduledAt.Add(time.Duration(existing.Duration)*time.Minute)) {
                        return domain.ErrConflict
                }
        }
        return nil
}

// cancelExpiredAwaiting lazily frees slots abandoned during checkout.
func (uc *SessionUsecase) cancelExpiredAwaiting(ctx context.Context) {
        if uc.financial == nil {
                return
        }
        if _, err := uc.financial.CancelExpiredAwaitingSessions(ctx, time.Now().Add(-AwaitingPaymentWindow)); err != nil {
                _ = err
        }
}

func (uc *SessionUsecase) cancelAwaitingSession(ctx context.Context, sessionID uint, reason string) {
        if uc.financial == nil {
                return
        }
        if err := uc.financial.CancelBookingSession(ctx, sessionID, reason); err != nil {
                _ = err
        }
}

func (uc *SessionUsecase) financialFailStaleOrders(ctx context.Context, sessionID uint) error {
        if uc.financial == nil {
                return nil
        }
        return uc.financial.FailPendingBookingOrders(ctx, sessionID, "سفارش جدیدی برای این جلسه صادر شد")
}

func (uc *SessionUsecase) refund(ctx context.Context, s *domain.Session) error {
        if err := uc.users.AddWallet(ctx, s.LearnerID, s.Price); err != nil {
                return err
        }
        if err := uc.wallet.AddTx(ctx, &domain.Transaction{
                UserID: s.LearnerID, Type: domain.TxCharge,
                Title: "بازگشت وجه جلسه: " + s.Title, Amount: s.Price, RefID: s.ID,
        }); err != nil {
                _ = uc.users.AddWallet(ctx, s.LearnerID, -s.Price)
                return err
        }
        return nil
}

func (uc *SessionUsecase) cancelUnfundedSession(ctx context.Context, s *domain.Session) {
        s.Status = domain.SessionCanceled
        s.RejectNote = "خطا در رزرو وجه"
        _ = uc.sessions.Update(ctx, s)
}

func (uc *SessionUsecase) notify(ctx context.Context, userID uint, title, body string) {
        if userID == 0 {
                return
        }
        _ = uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}

func parseClock(value string) (int, bool) {
        parsed, err := time.Parse("15:04", value)
        if err != nil {
                return 0, false
        }
        return parsed.Hour()*60 + parsed.Minute(), true
}

func overlaps(aStart, aEnd, bStart, bEnd time.Time) bool {
        return aStart.Before(bEnd) && aEnd.After(bStart)
}

// SessionDetail is the role-aware single-session payload of the detail screen.
type SessionDetail struct {
        SessionDisplay
        ViewerRole string `json:"viewer_role"`
}

// SessionDetailFor returns one session with full display fields when the
// caller is its learner, its teacher, or an admin. A teacher view stamps
// teacher_seen_at so the unseen counter clears once opened.
func (uc *SessionUsecase) SessionDetailFor(ctx context.Context, callerID uint, callerRole domain.Role, sessionID uint) (*SessionDetail, error) {
        s, role, err := uc.LiveAccess(ctx, callerID, callerRole, sessionID)
        if err != nil {
                return nil, err
        }
        if role == domain.RoleTeacher && s.TeacherSeenAt == nil &&
                (s.Status == domain.SessionPending || s.Status == domain.SessionConfirmed) {
                if err := uc.sessions.MarkSessionsSeen(ctx, []uint{s.ID}); err != nil {
                        log.Printf("session: mark seen: %v", err)
                }
                now := time.Now().UTC()
                s.TeacherSeenAt = &now
        }
        location, err := uc.displayLocation()
        if err != nil {
                return nil, err
        }
        return &SessionDetail{SessionDisplay: uc.sessionDisplay(*s, location), ViewerRole: string(role)}, nil
}

// SessionMessages lists the persisted coordination chat of a session.
func (uc *SessionUsecase) SessionMessages(ctx context.Context, callerID uint, callerRole domain.Role, sessionID uint, limit int) ([]domain.SessionMessage, error) {
        if _, _, err := uc.LiveAccess(ctx, callerID, callerRole, sessionID); err != nil {
                return nil, err
        }
        return uc.sessions.SessionMessages(ctx, sessionID, limit)
}

// SendSessionMessage appends a coordination message and notifies the
// counterpart (best effort) so neither side misses it.
func (uc *SessionUsecase) SendSessionMessage(ctx context.Context, callerID uint, callerRole domain.Role, sessionID uint, body string) (*domain.SessionMessage, error) {
        body = strings.TrimSpace(body)
        if len(body) == 0 || len(body) > 1000 {
                return nil, domain.ErrValidation
        }
        s, role, err := uc.LiveAccess(ctx, callerID, callerRole, sessionID)
        if err != nil {
                return nil, err
        }
        if s.Status == domain.SessionCanceled {
                return nil, domain.ErrConflict
        }
        message := &domain.SessionMessage{SessionID: s.ID, SenderID: callerID, Body: body}
        if err := uc.sessions.CreateSessionMessage(ctx, message); err != nil {
                return nil, err
        }
        if role == domain.RoleLearner {
                if teacher, terr := uc.teachers.ByID(ctx, s.TeacherID); terr == nil {
                        uc.notify(ctx, teacher.UserID, "پیام جدید در جلسه", "قرآن‌آموز برای جلسه «"+s.Title+"» پیامی فرستاد.")
                }
        } else if role == domain.RoleTeacher {
                uc.notify(ctx, s.LearnerID, "پیام جدید از استاد", "استاد برای جلسه «"+s.Title+"» پیامی فرستاد.")
        }
        return message, nil
}

// TeacherUnseenSessionCount powers the red counter on the teacher sessions tab.
func (uc *SessionUsecase) TeacherUnseenSessionCount(ctx context.Context, userID uint) (int64, error) {
        teacher, err := uc.teacherProfileForUser(ctx, userID)
        if err != nil {
                return 0, err
        }
        return uc.sessions.CountTeacherUnseen(ctx, teacher.ID)
}

// MarkTeacherSessionsSeenAll stamps all unseen active sessions of the calling
// teacher; returns how many rows were marked.
func (uc *SessionUsecase) MarkTeacherSessionsSeenAll(ctx context.Context, userID uint) (int64, error) {
        teacher, err := uc.teacherProfileForUser(ctx, userID)
        if err != nil {
                return 0, err
        }
        return uc.sessions.MarkAllTeacherSessionsSeen(ctx, teacher.ID)
}

// ExpireSweep cancels instant sessions that were never accepted within their
// own window (start..start+duration) and refunds the learner. Runs on the
// one-minute background ticker.
func (uc *SessionUsecase) ExpireSweep(ctx context.Context) error {
        uc.expireStaleInstantPending(ctx)
        return nil
}

func (uc *SessionUsecase) expireStaleInstantPending(ctx context.Context) {
        stale, err := uc.sessions.StaleInstantPendings(ctx, time.Now())
        if err != nil {
                log.Printf("session: stale instant sweep: %v", err)
                return
        }
        for _, s := range stale {
                if uc.financial != nil {
                        if err := uc.financial.CancelAndRefundSession(ctx, &s, []domain.SessionStatus{domain.SessionPending}, "انقضای جلسهٔ فوری"); err != nil {
                                log.Printf("session: refund stale instant #%d: %v", s.ID, err)
                                continue
                        }
                } else {
                        s.Status = domain.SessionCanceled
                        if err := uc.sessions.Update(ctx, &s); err != nil {
                                continue
                        }
                        _ = uc.refund(ctx, &s)
                }
                uc.notify(ctx, s.LearnerID, "جلسهٔ فوری تأیید نشد", "استاد در بازهٔ جلسهٔ فوری پاسخ نداد و مبلغ به کیف پول شما بازگشت.")
                if teacher, terr := uc.teachers.ByID(ctx, s.TeacherID); terr == nil {
                        uc.notify(ctx, teacher.UserID, "جلسهٔ فوری منقضی شد", "به درخواست جلسهٔ فوری پاسخ ندادید؛ مبلغ به قرآن‌آموز بازگشت.")
                }
        }
}
