package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type teacherRepo struct{ db *gorm.DB }

// NewTeacherRepository builds a domain.TeacherRepository.
func NewTeacherRepository(db *gorm.DB) domain.TeacherRepository { return &teacherRepo{db: db} }

func (r *teacherRepo) Create(ctx context.Context, t *domain.Teacher) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *teacherRepo) Update(ctx context.Context, t *domain.Teacher) error {
	return r.db.WithContext(ctx).Save(t).Error
}

func (r *teacherRepo) ByID(ctx context.Context, id uint) (*domain.Teacher, error) {
	var t domain.Teacher
	err := r.db.WithContext(ctx).
		Preload("User").Preload("Services").Preload("Samples").
		First(&t, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &t, err
}

func (r *teacherRepo) ByUserID(ctx context.Context, userID uint) (*domain.Teacher, error) {
	var t domain.Teacher
	err := r.db.WithContext(ctx).
		Preload("User").Preload("Services").Preload("Samples").
		Where("user_id = ?", userID).First(&t).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &t, err
}

func (r *teacherRepo) List(ctx context.Context, f domain.TeacherFilter) ([]domain.Teacher, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.Teacher{}).
		Joins("JOIN users ON users.id = teachers.user_id")

	if f.Status != "" {
		q = q.Where("teachers.status = ?", f.Status)
	}
	if f.Field != "" {
		q = q.Where("teachers.field = ?", f.Field)
	}
	if f.City != "" {
		q = q.Where("teachers.city = ?", f.City)
	}
	if f.Female != nil {
		q = q.Where("teachers.female = ?", *f.Female)
	}
	if f.Query != "" {
		like := "%" + f.Query + "%"
		q = q.Where("users.name LIKE ? OR teachers.tag LIKE ? OR teachers.field LIKE ?", like, like, like)
	}

	var total int64
	q.Count(&total)

	limit := f.Limit
	if limit <= 0 {
		limit = 20
	}
	var teachers []domain.Teacher
	err := q.Preload("User").Preload("Services").Preload("Samples").
		Order("teachers.rating desc, teachers.followers desc").
		Limit(limit).Offset(f.Offset).Find(&teachers).Error
	return teachers, total, err
}

func (r *teacherRepo) RecomputeRating(ctx context.Context, teacherID uint) error {
	var res struct {
		Avg   float64
		Count int
	}
	if err := r.db.WithContext(ctx).Model(&domain.Review{}).
		Select("COALESCE(AVG(rating),0) as avg, COUNT(*) as count").
		Where("teacher_id = ?", teacherID).Scan(&res).Error; err != nil {
		return err
	}
	return r.db.WithContext(ctx).Model(&domain.Teacher{}).
		Where("id = ?", teacherID).
		Updates(map[string]any{"rating": res.Avg, "reviews": res.Count}).Error
}

func (r *teacherRepo) Count(ctx context.Context, status domain.TeacherStatus) (int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.Teacher{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var n int64
	return n, q.Count(&n).Error
}

func (r *teacherRepo) AddService(ctx context.Context, s *domain.Service) error {
	return r.db.WithContext(ctx).Create(s).Error
}

func (r *teacherRepo) UpdateService(ctx context.Context, s *domain.Service) error {
	return r.db.WithContext(ctx).Save(s).Error
}

func (r *teacherRepo) DeleteService(ctx context.Context, teacherID, serviceID uint) error {
	return r.db.WithContext(ctx).
		Where("id = ? AND teacher_id = ?", serviceID, teacherID).
		Delete(&domain.Service{}).Error
}

func (r *teacherRepo) ServiceByID(ctx context.Context, id uint) (*domain.Service, error) {
	var s domain.Service
	err := r.db.WithContext(ctx).First(&s, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &s, err
}

func (r *teacherRepo) SetWorkTimes(ctx context.Context, teacherID uint, wt []domain.WorkTime) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("teacher_id = ?", teacherID).Delete(&domain.WorkTime{}).Error; err != nil {
			return err
		}
		for i := range wt {
			wt[i].ID = 0
			wt[i].TeacherID = teacherID
		}
		if len(wt) == 0 {
			return nil
		}
		return tx.Create(&wt).Error
	})
}

func (r *teacherRepo) WorkTimes(ctx context.Context, teacherID uint) ([]domain.WorkTime, error) {
	var wt []domain.WorkTime
	err := r.db.WithContext(ctx).Where("teacher_id = ?", teacherID).
		Order("weekday asc, from_time asc").Find(&wt).Error
	return wt, err
}
