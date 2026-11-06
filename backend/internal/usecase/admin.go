package usecase

import (
        "context"

        "vodda/backend/internal/domain"
)

// validTeacherTiers mirrors the badge set used by the learner-facing UI.
var validTeacherTiers = map[string]bool{"": true, "international": true, "grade2": true, "grade3": true}

// AdminUsecase powers the admin panel: moderation and reporting.
type AdminUsecase struct {
        users     domain.UserRepository
        teachers  domain.TeacherRepository
        sessions  domain.SessionRepository
        wallet    domain.WalletRepository
        notif     domain.NotificationRepository
        analytics domain.AdminAnalyticsRepository
}

// NewAdminUsecase builds an AdminUsecase.
func NewAdminUsecase(u domain.UserRepository, t domain.TeacherRepository, s domain.SessionRepository, w domain.WalletRepository, n domain.NotificationRepository, a domain.AdminAnalyticsRepository) *AdminUsecase {
        return &AdminUsecase{users: u, teachers: t, sessions: s, wallet: w, notif: n, analytics: a}
}

// Dashboard aggregates headline metrics for the admin home.
type Dashboard struct {
        Learners        int64 `json:"learners"`
        Teachers        int64 `json:"teachers"`
        PendingTeachers int64 `json:"pending_teachers"`
        Sessions        int64 `json:"sessions"`
        DoneSessions    int64 `json:"done_sessions"`
        ChargeVolume    int64 `json:"charge_volume"`
        Commission      int64 `json:"commission"`
}

// Dashboard computes the admin dashboard metrics. Reporting errors are returned
// instead of silently publishing partially-zero statistics.
func (uc *AdminUsecase) Dashboard(ctx context.Context) (*Dashboard, error) {
        d := &Dashboard{}
        var err error

        if d.Learners, err = uc.users.Count(ctx, domain.RoleLearner); err != nil {
                return nil, err
        }
        if d.Teachers, err = uc.teachers.Count(ctx, ""); err != nil {
                return nil, err
        }
        if d.PendingTeachers, err = uc.teachers.Count(ctx, domain.TeacherPending); err != nil {
                return nil, err
        }
        if d.Sessions, err = uc.sessions.Count(ctx, ""); err != nil {
                return nil, err
        }
        if d.DoneSessions, err = uc.sessions.Count(ctx, domain.SessionDone); err != nil {
                return nil, err
        }
        if d.ChargeVolume, err = uc.wallet.SumByType(ctx, domain.TxCharge); err != nil {
                return nil, err
        }
        if d.Commission, err = uc.wallet.SumByType(ctx, domain.TxCommission); err != nil {
                return nil, err
        }
        // Commission ledger entries are stored as negative deductions from the teacher.
        if d.Commission < 0 {
                d.Commission = -d.Commission
        }
        return d, nil
}

// Analytics returns the reporting payload for the admin dashboard.
func (uc *AdminUsecase) Analytics(ctx context.Context, days int) (*domain.AnalyticsOverview, error) {
        return uc.analytics.Overview(ctx, days)
}

// ListUsers returns paginated accounts, optionally by role and free-text search.
func (uc *AdminUsecase) ListUsers(ctx context.Context, role domain.Role, q string, limit, offset int) ([]domain.User, int64, error) {
        return uc.users.List(ctx, role, q, limit, offset)
}

// SetUserActive toggles account access.
func (uc *AdminUsecase) SetUserActive(ctx context.Context, id uint, active bool) error {
        u, err := uc.users.ByID(ctx, id)
        if err != nil {
                return err
        }
        u.Active = active
        return uc.users.Update(ctx, u)
}

// ListTeachers returns teachers filtered by status.
func (uc *AdminUsecase) ListTeachers(ctx context.Context, status domain.TeacherStatus, limit, offset int) ([]domain.Teacher, int64, error) {
        return uc.ListTeachersFiltered(ctx, domain.TeacherFilter{Status: status, Limit: limit, Offset: offset})
}

// ListTeachersFiltered powers the operational teacher directory in the admin
// panel. It deliberately reuses the repository filter contract so search,
// city, field, gender and moderation status are applied server-side.
func (uc *AdminUsecase) ListTeachersFiltered(ctx context.Context, filter domain.TeacherFilter) ([]domain.Teacher, int64, error) {
        return uc.teachers.List(ctx, filter)
}

// ReviewTeacher approves or rejects a pending teacher profile.
func (uc *AdminUsecase) ReviewTeacher(ctx context.Context, id uint, approve bool) (*domain.Teacher, error) {
        t, err := uc.teachers.ByID(ctx, id)
        if err != nil {
                return nil, err
        }
        if t.Status != domain.TeacherPending {
                return nil, domain.ErrConflict
        }
        if approve {
                t.Status = domain.TeacherApproved
                t.Verified = true
        } else {
                t.Status = domain.TeacherRejected
                t.Verified = false
        }
        if err := uc.teachers.Update(ctx, t); err != nil {
                return nil, err
        }
        if approve {
                uc.notify(ctx, t.UserID, "پروفایل تأیید شد", "پروفایل استادی شما تأیید و منتشر شد.")
        } else {
                uc.notify(ctx, t.UserID, "پروفایل رد شد", "پروفایل استادی شما تأیید نشد.")
        }
        return t, nil
}

// ListSessions returns paginated sessions filtered by status.
func (uc *AdminUsecase) ListSessions(ctx context.Context, status domain.SessionStatus, limit, offset int) ([]domain.Session, int64, error) {
        return uc.sessions.List(ctx, status, limit, offset)
}

// SetTeacherModeration updates the public trust markers of an approved teacher:
// the verified checkmark and the quality tier badge. nil fields stay unchanged.
func (uc *AdminUsecase) SetTeacherModeration(ctx context.Context, id uint, verified *bool, tier *string) (*domain.Teacher, error) {
        if tier != nil && !validTeacherTiers[*tier] {
                return nil, domain.ErrValidation
        }
        t, err := uc.teachers.ByID(ctx, id)
        if err != nil {
                return nil, err
        }
        if verified != nil {
                t.Verified = *verified
        }
        if tier != nil {
                t.Tier = *tier
        }
        if err := uc.teachers.Update(ctx, t); err != nil {
                return nil, err
        }
        return t, nil
}

// ListWithdrawals returns payout requests filtered by status.
func (uc *AdminUsecase) ListWithdrawals(ctx context.Context, status domain.WithdrawalStatus, limit, offset int) ([]domain.Withdrawal, int64, error) {
        return uc.wallet.Withdrawals(ctx, status, limit, offset)
}

func (uc *AdminUsecase) ListPendingServices(ctx context.Context) ([]domain.Service, error) {
        return uc.teachers.ListPendingServices(ctx)
}

func (uc *AdminUsecase) ApproveService(ctx context.Context, serviceID uint) error {
        s, err := uc.teachers.ServiceByID(ctx, serviceID)
        if err != nil {
                return err
        }
        if s.Active {
                return domain.ErrConflict
        }
        s.Active = true
        if err := uc.teachers.UpdateService(ctx, s); err != nil {
                return err
        }
        uc.notifyTeacher(ctx, s.TeacherID, "خدمت تأیید شد", "خدمت «"+s.Title+"» توسط ادمین تأیید شد.")
        return nil
}

func (uc *AdminUsecase) RejectService(ctx context.Context, serviceID uint) error {
        s, err := uc.teachers.ServiceByID(ctx, serviceID)
        if err != nil {
                return err
        }
        if s.Active {
                return domain.ErrConflict
        }
        if err := uc.teachers.DeleteService(ctx, s.TeacherID, serviceID); err != nil {
                return err
        }
        uc.notifyTeacher(ctx, s.TeacherID, "خدمت رد شد", "خدمت «"+s.Title+"» توسط ادمین رد شد.")
        return nil
}

func (uc *AdminUsecase) notifyTeacher(ctx context.Context, teacherID uint, title, body string) {
        teacher, err := uc.teachers.ByID(ctx, teacherID)
        if err != nil {
                return
        }
        uc.notify(ctx, teacher.UserID, title, body)
}

func (uc *AdminUsecase) notify(ctx context.Context, userID uint, title, body string) {
        if userID == 0 {
                return
        }
        _ = uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}
