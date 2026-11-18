package usecase

import (
	"context"

	"vodda/backend/internal/domain"
)

// MyReviews returns persisted learner reviews for the calling teacher.
func (uc *TeacherUsecase) MyReviews(ctx context.Context, userID uint) ([]domain.Review, error) {
	teacher, err := uc.teacherForUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	return uc.reviews.ForTeacher(ctx, teacher.ID)
}
