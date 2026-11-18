package usecase

import (
	"context"

	"vodda/backend/internal/domain"
)

// LearnerAnalyticsUsecase serves the personal analytics payload of the
// learner panel (GET /me/analytics). It adds the reporting window bounds on
// top of the read-only analytics repository.
type LearnerAnalyticsUsecase struct {
	analytics domain.LearnerAnalyticsRepository
}

// NewLearnerAnalyticsUsecase builds a LearnerAnalyticsUsecase.
func NewLearnerAnalyticsUsecase(a domain.LearnerAnalyticsRepository) *LearnerAnalyticsUsecase {
	return &LearnerAnalyticsUsecase{analytics: a}
}

// Overview returns the learner-scoped analytics for the requested day window.
func (uc *LearnerAnalyticsUsecase) Overview(ctx context.Context, userID uint, days int) (*domain.LearnerAnalytics, error) {
	if days <= 0 {
		days = 30
	}
	if days > 90 {
		days = 90
	}
	return uc.analytics.LearnerOverview(ctx, userID, days)
}
