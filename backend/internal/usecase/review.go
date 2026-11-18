package usecase

import (
	"context"
	"strings"

	"vodda/backend/internal/domain"
)

// ReviewUsecase handles post-session ratings.
type ReviewUsecase struct {
	reviews     domain.ReviewRepository
	sessions    domain.SessionRepository
	teachers    domain.TeacherRepository
	transaction domain.ReviewTransactionRepository
}

// NewReviewUsecase builds a ReviewUsecase. Production injects the optional
// transaction repository so review, session and aggregate updates commit together.
func NewReviewUsecase(r domain.ReviewRepository, s domain.SessionRepository, t domain.TeacherRepository, transaction ...domain.ReviewTransactionRepository) *ReviewUsecase {
	var atomic domain.ReviewTransactionRepository
	if len(transaction) > 0 {
		atomic = transaction[0]
	}
	return &ReviewUsecase{reviews: r, sessions: s, teachers: t, transaction: atomic}
}

// RateInput is a learner's rating for a finished session.
type RateInput struct {
	SessionID uint
	Rating    int
	Text      string
}

// Rate records a review for a completed session and refreshes the teacher's
// aggregate rating.
func (uc *ReviewUsecase) Rate(ctx context.Context, learnerID uint, in RateInput) (*domain.Review, error) {
	in.Text = strings.TrimSpace(in.Text)
	if in.SessionID == 0 || in.Rating < 1 || in.Rating > 5 || len([]rune(in.Text)) > 1000 {
		return nil, domain.ErrValidation
	}

	rv := &domain.Review{SessionID: in.SessionID, Rating: in.Rating, Text: in.Text}
	if uc.transaction != nil {
		if err := uc.transaction.RateCompletedSession(ctx, learnerID, rv); err != nil {
			return nil, err
		}
		return rv, nil
	}

	// Compatibility fallback for isolated mocks. Production always uses the
	// transaction repository above.
	s, err := uc.sessions.ByID(ctx, in.SessionID)
	if err != nil {
		return nil, err
	}
	if s.LearnerID != learnerID {
		return nil, domain.ErrForbidden
	}
	if s.Status != domain.SessionDone || s.Rated {
		return nil, domain.ErrConflict
	}
	rv.TeacherID = s.TeacherID
	rv.LearnerID = learnerID
	if err := uc.reviews.Create(ctx, rv); err != nil {
		return nil, err
	}
	s.Rated = true
	if err := uc.sessions.Update(ctx, s); err != nil {
		return nil, err
	}
	if err := uc.teachers.RecomputeRating(ctx, s.TeacherID); err != nil {
		return nil, err
	}
	return rv, nil
}

// ForTeacher lists a teacher's reviews.
func (uc *ReviewUsecase) ForTeacher(ctx context.Context, teacherID uint) ([]domain.Review, error) {
	return uc.reviews.ForTeacher(ctx, teacherID)
}
