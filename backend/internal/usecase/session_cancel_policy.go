package usecase

import (
	"context"
	"time"

	"vodda/backend/internal/domain"
)

// CancelBeforeStart lets a learner cancel a funded session only before its
// scheduled start. The refund remains atomic when the production financial
// repository is configured.
func (uc *SessionUsecase) CancelBeforeStart(ctx context.Context, learnerID, sessionID uint) (*domain.Session, error) {
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
	if !time.Now().Before(s.ScheduledAt) {
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
		uc.notify(ctx, teacher.UserID, "جلسه لغو شد", "قرآن‌آموز جلسه را پیش از زمان شروع لغو کرد.")
	}
	return s, nil
}
