package repository

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"vodda/backend/internal/domain"
)

type settingRepo struct{ db *gorm.DB }

// NewSettingRepository builds a domain.SettingRepository.
func NewSettingRepository(db *gorm.DB) domain.SettingRepository { return &settingRepo{db: db} }

// All returns every stored setting as a map. An empty table yields an empty map.
func (r *settingRepo) All(ctx context.Context) (map[string]string, error) {
	var rows []domain.Setting
	if err := r.db.WithContext(ctx).Find(&rows).Error; err != nil {
		return nil, err
	}
	values := make(map[string]string, len(rows))
	for _, row := range rows {
		values[row.Key] = row.Value
	}
	return values, nil
}

// SetMany upserts the given settings in one transaction.
func (r *settingRepo) SetMany(ctx context.Context, values map[string]string) error {
	if len(values) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for key, value := range values {
			row := domain.Setting{Key: key, Value: value}
			if err := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "key"}},
				DoUpdates: clause.AssignmentColumns([]string{"value", "updated_at"}),
			}).Create(&row).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
