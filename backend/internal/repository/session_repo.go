package repository

import (
	"context"
	"time"
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
		q = q.Where("status IN ?", []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed, domain.SessionAwaitingPayment})
	case "past":
		q = q.Where("status IN ?", []domain.SessionStatus{domain.SessionDone, domain.SessionCanceled})
	}
	var sessions []domain.Session
	err := q.Order("scheduled_at desc").Limit(200).Find(&sessions).Error
	return sessions, err
}

func (r *sessionRepo) ForTeacher(ctx context.Context, teacherID uint, statuses []domain.SessionStatus) ([]domain.Session, error) {
	q := r.db.WithContext(ctx).
		Preload("Learner").
		Where("teacher_id = ?", teacherID)
	if len(statuses) > 0 {
		q = q.Where("status IN ?", statuses)
	}
	var sessions []domain.Session
	err := q.Order("scheduled_at desc").Limit(200).Find(&sessions).Error
	return sessions, err
}

func (r *sessionRepo) List(ctx context.Context, status domain.SessionStatus, limit, offset int) ([]domain.Session, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.Session{})
	if status != "" {
		q = q.Where("status = ?", status)
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
	var sessions []domain.Session
	err := q.Preload("Learner").Preload("Teacher").Preload("Teacher.User").
		Order("created_at desc").Limit(limit).Offset(offset).Find(&sessions).Error
	return sessions, total, err
}

func (r *sessionRepo) Count(ctx context.Context, status domain.SessionStatus) (int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.Session{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var n int64
	return n, q.Count(&n).Error
}

// MarkSessionsSeen stamps teacher_seen_at on the given sessions (idempotent;
// rows that already carry a stamp are left untouched).
func (r *sessionRepo) MarkSessionsSeen(ctx context.Context, ids []uint) error {
        if len(ids) == 0 {
                return nil
        }
        return r.db.WithContext(ctx).Model(&domain.Session{}).
                Where("id IN ? AND teacher_seen_at IS NULL", ids).
                Update("teacher_seen_at", time.Now().UTC()).Error
}

// StaleInstantPendings returns instant sessions still pending after their own
// window fully elapsed (start + duration) — they must be cancelled + refunded.
func (r *sessionRepo) StaleInstantPendings(ctx context.Context, now time.Time) ([]domain.Session, error) {
        var rows []domain.Session
        err := r.db.WithContext(ctx).
                Where("instant = ? AND status = ? AND scheduled_at + INTERVAL duration MINUTE < ?",
                        true, domain.SessionPending, now).
                Order("id asc").Limit(50).Find(&rows).Error
        return rows, err
}

// MarkAllTeacherSessionsSeen stamps every unseen active session of a teacher
// at once — the client calls it after rendering the unseen rows.
func (r *sessionRepo) MarkAllTeacherSessionsSeen(ctx context.Context, teacherID uint) (int64, error) {
        res := r.db.WithContext(ctx).Model(&domain.Session{}).
                Where("teacher_id = ? AND teacher_seen_at IS NULL AND status IN ?",
                        teacherID, []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}).
                Update("teacher_seen_at", time.Now().UTC())
        return res.RowsAffected, res.Error
}

// CountTeacherUnseen counts the teacher's active (pending/confirmed) sessions
// that were never viewed — the red counter on the sessions tab.
func (r *sessionRepo) CountTeacherUnseen(ctx context.Context, teacherID uint) (int64, error) {
        var n int64
        err := r.db.WithContext(ctx).Model(&domain.Session{}).
                Where("teacher_id = ? AND teacher_seen_at IS NULL AND status IN ?",
                        teacherID, []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}).
                Count(&n).Error
        return n, err
}

// SessionMessages returns the latest coordination messages of a session in
// chronological order (oldest first) so clients can append naturally.
func (r *sessionRepo) SessionMessages(ctx context.Context, sessionID uint, limit int) ([]domain.SessionMessage, error) {
        if limit <= 0 || limit > 300 {
                limit = 200
        }
        var rows []domain.SessionMessage
        err := r.db.WithContext(ctx).
                Where("session_id = ?", sessionID).
                Order("id desc").Limit(limit).Find(&rows).Error
        if err != nil {
                return nil, err
        }
        for i, j := 0, len(rows)-1; i < j; i, j = i+1, j-1 {
                rows[i], rows[j] = rows[j], rows[i]
        }
        return rows, nil
}

func (r *sessionRepo) CreateSessionMessage(ctx context.Context, m *domain.SessionMessage) error {
        return r.db.WithContext(ctx).Create(m).Error
}
