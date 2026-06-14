package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type sessionRepo struct{ db *gorm.DB }

// NewSessionRepository builds a domain.SessionRepository.
func NewSessionRepository(db *gorm.DB) domain.SessionRepository { return &sessionRepo{db: db} }

func (r *sessionRepo) Create(ctx context.Context, s *domain.Session) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *sessionRepo) Update(ctx context.Context, s *domain.Session) error {
	return r.db.WithContext(ctx).Save(s).Error
}

func (r *sessionRepo) ByID(ctx context.Context, id uint) (*domain.Session, error) {
	var s domain.Session
	err := r.db.WithContext(ctx).
		Preload("Learner").Preload("Teacher").Preload("Teacher.User").
		First(&s, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &s, err
}

func (r *sessionRepo) ForLearner(ctx context.Context, learnerID uint, when string) ([]domain.Session, error) {
	q := r.db.WithContext(ctx).
		Preload("Teacher").Preload("Teacher.User").
		Where("learner_id = ?", learnerID)
	switch when {
	case "upcoming":
		q = q.Where("status IN ?", []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed})
	case "past":
		q = q.Where("status IN ?", []domain.SessionStatus{domain.SessionDone, domain.SessionCanceled})
	}
	var s []domain.Session
	err := q.Order("scheduled_at desc").Find(&s).Error
	return s, err
}

func (r *sessionRepo) ForTeacher(ctx context.Context, teacherID uint, statuses []domain.SessionStatus) ([]domain.Session, error) {
	q := r.db.WithContext(ctx).
		Preload("Learner").
		Where("teacher_id = ?", teacherID)
	if len(statuses) > 0 {
		q = q.Where("status IN ?", statuses)
	}
	var s []domain.Session
	err := q.Order("scheduled_at desc").Find(&s).Error
	return s, err
}

func (r *sessionRepo) List(ctx context.Context, status domain.SessionStatus, limit, offset int) ([]domain.Session, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.Session{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	q.Count(&total)
	if limit <= 0 {
		limit = 30
	}
	var s []domain.Session
	err := q.Preload("Learner").Preload("Teacher").Preload("Teacher.User").
		Order("created_at desc").Limit(limit).Offset(offset).Find(&s).Error
	return s, total, err
}

func (r *sessionRepo) Count(ctx context.Context, status domain.SessionStatus) (int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.Session{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var n int64
	return n, q.Count(&n).Error
}
