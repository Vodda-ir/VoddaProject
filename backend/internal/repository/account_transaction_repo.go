package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"vodda/backend/internal/domain"
)

type accountTransactionRepo struct{ db *gorm.DB }

// NewTeacherOnboardingRepository creates the atomic teacher onboarding boundary.
func NewTeacherOnboardingRepository(db *gorm.DB) domain.TeacherOnboardingRepository {
	return &accountTransactionRepo{db: db}
}

func (r *accountTransactionRepo) CreateTeacherProfile(ctx context.Context, userID uint, teacher *domain.Teacher) error {
	if teacher == nil || userID == 0 {
		return domain.ErrValidation
	}

	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return domain.ErrNotFound
			}
			return err
		}
		if !user.Active {
			return domain.ErrForbidden
		}

		var count int64
		if err := tx.Model(&domain.Teacher{}).Where("user_id = ?", userID).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return domain.ErrConflict
		}

		teacher.ID = 0
		teacher.UserID = userID
		if err := tx.Create(teacher).Error; err != nil {
			return err
		}

		result := tx.Model(&domain.User{}).
			Where("id = ? AND active = ?", userID, true).
			Update("role", domain.RoleTeacher)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return domain.ErrConflict
		}
		return nil
	})
}
