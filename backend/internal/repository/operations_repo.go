package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type supportMessageRepo struct{ db *gorm.DB }

func NewSupportMessageRepository(db *gorm.DB) domain.SupportMessageRepository {
	return &supportMessageRepo{db: db}
}

func (r *supportMessageRepo) Create(ctx context.Context, message *domain.SupportMessage) error {
	return r.db.WithContext(ctx).Create(message).Error
}

func (r *supportMessageRepo) List(ctx context.Context, status domain.SupportMessageStatus, limit, offset int) ([]domain.SupportMessage, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.SupportMessage{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	limit, offset = normalizedPage(limit, offset, 30, 100)
	var messages []domain.SupportMessage
	err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&messages).Error
	return messages, total, err
}

func (r *supportMessageRepo) Resolve(ctx context.Context, id uint) error {
	now := time.Now().UTC()
	result := r.db.WithContext(ctx).Model(&domain.SupportMessage{}).
		Where("id = ? AND status = ?", id, domain.SupportMessageNew).
		Updates(map[string]any{"status": domain.SupportMessageResolved, "resolved_at": now})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		var count int64
		if err := r.db.WithContext(ctx).Model(&domain.SupportMessage{}).Where("id = ?", id).Count(&count).Error; err != nil {
			return err
		}
		if count == 0 {
			return domain.ErrNotFound
		}
		return domain.ErrConflict
	}
	return nil
}

type adminAuditRepo struct{ db *gorm.DB }

func NewAdminAuditRepository(db *gorm.DB) domain.AdminAuditRepository {
	return &adminAuditRepo{db: db}
}

func (r *adminAuditRepo) Create(ctx context.Context, entry *domain.AdminAuditLog) error {
	return r.db.WithContext(ctx).Create(entry).Error
}

func (r *adminAuditRepo) List(ctx context.Context, limit, offset int) ([]domain.AdminAuditLog, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.AdminAuditLog{})
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	limit, offset = normalizedPage(limit, offset, 50, 200)
	var entries []domain.AdminAuditLog
	err := q.Order("created_at DESC").Limit(limit).Offset(offset).Find(&entries).Error
	return entries, total, err
}

func normalizedPage(limit, offset, defaultLimit, maxLimit int) (int, int) {
	if limit <= 0 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}
