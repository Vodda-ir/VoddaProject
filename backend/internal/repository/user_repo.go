// Package repository contains GORM-backed implementations of the domain repositories.
package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type userRepo struct{ db *gorm.DB }

// NewUserRepository builds a domain.UserRepository.
func NewUserRepository(db *gorm.DB) domain.UserRepository { return &userRepo{db: db} }

func (r *userRepo) Create(ctx context.Context, u *domain.User) error {
	return r.db.WithContext(ctx).Create(u).Error
}

func (r *userRepo) Update(ctx context.Context, u *domain.User) error {
	return r.db.WithContext(ctx).Save(u).Error
}

func (r *userRepo) ByID(ctx context.Context, id uint) (*domain.User, error) {
	var u domain.User
	err := r.db.WithContext(ctx).Preload("Teacher").First(&u, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &u, err
}

func (r *userRepo) ByMobile(ctx context.Context, mobile string) (*domain.User, error) {
	var u domain.User
	err := r.db.WithContext(ctx).Preload("Teacher").Where("mobile = ?", mobile).First(&u).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &u, err
}

func (r *userRepo) List(ctx context.Context, role domain.Role, limit, offset int) ([]domain.User, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.User{})
	if role != "" {
		q = q.Where("role = ?", role)
	}
	var total int64
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	if limit <= 0 {
		limit = 30
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	var users []domain.User
	err := q.Order("created_at desc").Limit(limit).Offset(offset).Find(&users).Error
	return users, total, err
}

// AddWallet performs a single conditional SQL update. Debits can never move the
// wallet below zero, even when concurrent booking or withdrawal requests race.
func (r *userRepo) AddWallet(ctx context.Context, userID uint, delta int64) error {
	q := r.db.WithContext(ctx).Model(&domain.User{}).Where("id = ?", userID)
	if delta < 0 {
		q = q.Where("wallet >= ?", -delta)
	}
	result := q.UpdateColumn("wallet", gorm.Expr("wallet + ?", delta))
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		if delta < 0 {
			return domain.ErrInsufficient
		}
		return domain.ErrNotFound
	}
	return nil
}

func (r *userRepo) Count(ctx context.Context, role domain.Role) (int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.User{})
	if role != "" {
		q = q.Where("role = ?", role)
	}
	var n int64
	return n, q.Count(&n).Error
}
