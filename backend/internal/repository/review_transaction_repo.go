package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"vodda/backend/internal/domain"
)

type reviewTransactionRepo struct{ db *gorm.DB }

// NewReviewTransactionRepository creates the atomic review transaction boundary.
func NewReviewTransactionRepository(db *gorm.DB) domain.ReviewTransactionRepository {
	return &reviewTransactionRepo{db: db}
}

func (r *reviewTransactionRepo) RateCompletedSession(ctx context.Context, learnerID uint, review *domain.Review) error {
	if review == nil || learnerID == 0 || review.SessionID == 0 {
		return domain.ErrValidation
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var session domain.Session
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&session, review.SessionID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domain.ErrNotFound
			}
			return err
		}
		if session.LearnerID != learnerID {
			return domain.ErrForbidden
		}
		if session.Status != domain.SessionDone || session.Rated {
			return domain.ErrConflict
		}

		review.ID = 0
		review.TeacherID = session.TeacherID
		review.LearnerID = learnerID
		if err := tx.Create(review).Error; err != nil {
			return err
		}

		result := tx.Model(&domain.Session{}).
			Where("id = ? AND rated = ?", session.ID, false).
			Update("rated", true)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return domain.ErrConflict
		}

		var stats struct {
			Average float64
			Count   int
		}
		if err := tx.Model(&domain.Review{}).
			Select("COALESCE(AVG(rating), 0) AS average, COUNT(*) AS count").
			Where("teacher_id = ?", session.TeacherID).
			Scan(&stats).Error; err != nil {
			return err
		}
		result = tx.Model(&domain.Teacher{}).
			Where("id = ?", session.TeacherID).
			Updates(map[string]any{"rating": stats.Average, "reviews": stats.Count})
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return domain.ErrNotFound
		}
		return nil
	})
}
