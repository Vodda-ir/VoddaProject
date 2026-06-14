package usecase

import (
	"context"

	"vodda/backend/internal/domain"
)

// ReviewUsecase handles post-session ratings.
type ReviewUsecase struct {
	reviews  domain.ReviewRepository
	sessions domain.SessionRepository
	teachers domain.TeacherRepository
}

// NewReviewUsecase builds a ReviewUsecase.
func NewReviewUsecase(r domain.ReviewRepository, s domain.SessionRepository, t domain.TeacherRepository) *ReviewUsecase {
	return &ReviewUsecase{reviews: r, sessions: s, teachers: t}
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
	if in.Rating < 1 || in.Rating > 5 {
		return nil, domain.ErrValidation
	}
	s, err := uc.sessions.ByID(ctx, in.SessionID)
	if err != nil {
		return nil, err
	}
	if s.LearnerID != learnerID {
		return nil, domain.ErrForbidden
	}
	if s.Status != domain.SessionDone {
		return nil, domain.ErrConflict
	}
	if s.Rated {
		return nil, domain.ErrConflict
	}

	rv := &domain.Review{
		SessionID: s.ID, TeacherID: s.TeacherID, LearnerID: learnerID,
		Rating: in.Rating, Text: in.Text,
	}
	if err := uc.reviews.Create(ctx, rv); err != nil {
		return nil, err
	}

	s.Rated = true
	_ = uc.sessions.Update(ctx, s)
	_ = uc.teachers.RecomputeRating(ctx, s.TeacherID)
	return rv, nil
}

// ForTeacher lists a teacher's reviews.
func (uc *ReviewUsecase) ForTeacher(ctx context.Context, teacherID uint) ([]domain.Review, error) {
	return uc.reviews.ForTeacher(ctx, teacherID)
}
