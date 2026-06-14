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
	sessions domain.SessionRepository
	teachers domain.TeacherRepository
	users    domain.UserRepository
	wallet   domain.WalletRepository
	notif    domain.NotificationRepository
	cfg      *config.Config
}

// NewSessionUsecase builds a SessionUsecase.
func NewSessionUsecase(s domain.SessionRepository, t domain.TeacherRepository, u domain.UserRepository, w domain.WalletRepository, n domain.NotificationRepository, cfg *config.Config) *SessionUsecase {
	return &SessionUsecase{sessions: s, teachers: t, users: u, wallet: w, notif: n, cfg: cfg}
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
	if teacher.Status != domain.TeacherApproved {
		return nil, domain.ErrTeacherNotReady
	}
	svc, err := uc.teachers.ServiceByID(ctx, in.ServiceID)
	if err != nil || svc.TeacherID != teacher.ID {
		return nil, domain.ErrValidation
	}

	learner, err := uc.users.ByID(ctx, learnerID)
	if err != nil {
		return nil, err
	}
	if learner.Wallet < svc.Price {
		return nil, domain.ErrInsufficient
	}

	s := &domain.Session{
		LearnerID:   learnerID,
		TeacherID:   teacher.ID,
		ServiceID:   svc.ID,
		Title:       svc.Title,
		ScheduledAt: in.ScheduledAt,
		Duration:    svc.Duration,
		Price:       svc.Price,
		Status:      domain.SessionPending,
		Note:        in.Note,
	}
	if err := uc.sessions.Create(ctx, s); err != nil {
		return nil, err
	}

	// hold the fee: debit learner wallet and ledger it
	if err := uc.users.AddWallet(ctx, learnerID, -svc.Price); err != nil {
		return nil, err
	}
	_ = uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: learnerID, Type: domain.TxSession,
		Title: "رزرو جلسه: " + svc.Title, Amount: -svc.Price, RefID: s.ID,
	})
	uc.notify(ctx, teacher.UserID, "درخواست جلسه‌ی جدید", "یک درخواست جلسه‌ی جدید دریافت کردید.")
	return s, nil
}

// Accept confirms a pending session (teacher action).
func (uc *SessionUsecase) Accept(ctx context.Context, userID, sessionID uint) (*domain.Session, error) {
	s, t, err := uc.ownTeacherSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}
	if s.Status != domain.SessionPending {
		return nil, domain.ErrConflict
	}
	s.Status = domain.SessionConfirmed
	if err := uc.sessions.Update(ctx, s); err != nil {
		return nil, err
	}
	uc.notify(ctx, s.LearnerID, "جلسه تأیید شد", "استاد درخواست جلسه‌ی شما را تأیید کرد.")
	_ = t
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
	s.Status = domain.SessionCanceled
	s.RejectNote = reason
	if err := uc.sessions.Update(ctx, s); err != nil {
		return nil, err
	}
	uc.refund(ctx, s)
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
	if s.Status == domain.SessionDone || s.Status == domain.SessionCanceled {
		return nil, domain.ErrConflict
	}
	s.Status = domain.SessionCanceled
	if err := uc.sessions.Update(ctx, s); err != nil {
		return nil, err
	}
	uc.refund(ctx, s)
	return s, nil
}

// Complete marks a confirmed session done and settles the teacher's earnings,
// deducting the platform commission.
func (uc *SessionUsecase) Complete(ctx context.Context, userID, sessionID uint) (*domain.Session, error) {
	s, t, err := uc.ownTeacherSession(ctx, userID, sessionID)
	if err != nil {
		return nil, err
	}
	if s.Status != domain.SessionConfirmed {
		return nil, domain.ErrConflict
	}
	s.Status = domain.SessionDone
	if err := uc.sessions.Update(ctx, s); err != nil {
		return nil, err
	}

	commission := s.Price * int64(uc.cfg.PlatformCommissionPercent) / 100
	earning := s.Price - commission

	_ = uc.users.AddWallet(ctx, t.UserID, earning)
	_ = uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: t.UserID, Type: domain.TxEarning,
		Title: "درآمد جلسه: " + s.Title, Amount: earning, RefID: s.ID,
	})
	_ = uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: t.UserID, Type: domain.TxCommission,
		Title: "کارمزد پلتفرم", Amount: -commission, RefID: s.ID,
	})

	t.Sessions++
	_ = uc.teachers.Update(ctx, t)
	uc.notify(ctx, s.LearnerID, "جلسه برگزار شد", "جلسه‌ی شما به پایان رسید. لطفاً امتیاز دهید.")
	return s, nil
}

// LearnerSessions lists a learner's sessions ("upcoming" | "past" | "").
func (uc *SessionUsecase) LearnerSessions(ctx context.Context, learnerID uint, when string) ([]domain.Session, error) {
	return uc.sessions.ForLearner(ctx, learnerID, when)
}

// TeacherSessions lists a teacher's sessions by status set.
func (uc *SessionUsecase) TeacherSessions(ctx context.Context, userID uint, statuses []domain.SessionStatus) ([]domain.Session, error) {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	return uc.sessions.ForTeacher(ctx, t.ID, statuses)
}

func (uc *SessionUsecase) ownTeacherSession(ctx context.Context, userID, sessionID uint) (*domain.Session, *domain.Teacher, error) {
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, nil, err
	}
	s, err := uc.sessions.ByID(ctx, sessionID)
	if err != nil {
		return nil, nil, err
	}
	if s.TeacherID != t.ID {
		return nil, nil, domain.ErrForbidden
	}
	return s, t, nil
}

func (uc *SessionUsecase) refund(ctx context.Context, s *domain.Session) {
	_ = uc.users.AddWallet(ctx, s.LearnerID, s.Price)
	_ = uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: s.LearnerID, Type: domain.TxCharge,
		Title: "بازگشت وجه جلسه: " + s.Title, Amount: s.Price, RefID: s.ID,
	})
}

func (uc *SessionUsecase) notify(ctx context.Context, userID uint, title, body string) {
	_ = uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}
