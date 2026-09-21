package usecase

import (
	"context"
	"time"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
)

// SessionUsecase orchestrates bookings, the session lifecycle, and the
// associated wallet movements (escrow on booking, payout on completion).
type SessionUsecase struct {
	sessions  domain.SessionRepository
	teachers  domain.TeacherRepository
	users     domain.UserRepository
	wallet    domain.WalletRepository
	financial domain.FinancialRepository
	notif     domain.NotificationRepository
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

// BookInput is the learner's booking request.
type BookInput struct {
	TeacherID   uint
	ServiceID   uint
	ScheduledAt time.Time
	Note        string
}

// Book creates a pending session, charging the learner's wallet up front.
func (uc *SessionUsecase) Book(ctx context.Context, learnerID uint, in BookInput) (*domain.Session, error) {
	teacher, err := uc.teachers.ByID(ctx, in.TeacherID)
	if err != nil {
		return nil, err
	}
	if teacher.Status != domain.TeacherApproved || !teacher.Verified || !teacher.Available {
		return nil, domain.ErrTeacherNotReady
	}
	if teacher.UserID == learnerID {
		return nil, domain.ErrForbidden
	}

	svc, err := uc.teachers.ServiceByID(ctx, in.ServiceID)
	if err != nil || svc.TeacherID != teacher.ID || !svc.Active || svc.Price <= 0 || svc.Duration <= 0 || svc.Duration > 240 {
		return nil, domain.ErrValidation
	}
	if len(in.Note) > 500 {
		return nil, domain.ErrValidation
	}

	now := time.Now()
	if in.ScheduledAt.Before(now.Add(5*time.Minute)) || in.ScheduledAt.After(now.AddDate(0, 6, 0)) {
		return nil, domain.ErrValidation
	}
	if err := uc.ensureWithinWorkTime(ctx, teacher.ID, in.ScheduledAt, svc.Duration); err != nil {
		return nil, err
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
	if learner.Wallet < svc.Price {
		return nil, domain.ErrInsufficient
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

	uc.notify(ctx, teacher.UserID, "درخواست جلسه‌ی جدید", "یک درخواست جلسه‌ی جدید دریافت کردید.")
	return s, nil
}

// Accept confirms a pending session (teacher action).
func (uc *SessionUsecase) Accept(ctx context.Context, userID, sessionID uint) (*domain.Session, error) {
	s, _, err := uc.ownTeacherSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}
	if s.Status != domain.SessionPending || time.Now().After(s.ScheduledAt) {
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
	if time.Now().Before(s.ScheduledAt.Add(time.Duration(s.Duration) * time.Minute)) {
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
	statuses := []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}
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
		if existing.Status != domain.SessionPending && existing.Status != domain.SessionConfirmed {
			continue
		}
		if overlaps(start, end, existing.ScheduledAt, existing.ScheduledAt.Add(time.Duration(existing.Duration)*time.Minute)) {
			return domain.ErrConflict
		}
	}
	return nil
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
