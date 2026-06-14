package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

// ── Review ──

type reviewRepo struct{ db *gorm.DB }

// NewReviewRepository builds a domain.ReviewRepository.
func NewReviewRepository(db *gorm.DB) domain.ReviewRepository { return &reviewRepo{db: db} }

func (r *reviewRepo) Create(ctx context.Context, rv *domain.Review) error {
	return r.db.WithContext(ctx).Create(rv).Error
}

func (r *reviewRepo) ForTeacher(ctx context.Context, teacherID uint) ([]domain.Review, error) {
	var rv []domain.Review
	err := r.db.WithContext(ctx).Preload("Learner").
		Where("teacher_id = ?", teacherID).Order("created_at desc").Find(&rv).Error
	return rv, err
}

func (r *reviewRepo) Stats(ctx context.Context, teacherID uint) (float64, int, error) {
	var res struct {
		Avg   float64
		Count int
	}
	err := r.db.WithContext(ctx).Model(&domain.Review{}).
		Select("COALESCE(AVG(rating),0) as avg, COUNT(*) as count").
		Where("teacher_id = ?", teacherID).Scan(&res).Error
	return res.Avg, res.Count, err
}

// ── Wallet ──

type walletRepo struct{ db *gorm.DB }

// NewWalletRepository builds a domain.WalletRepository.
func NewWalletRepository(db *gorm.DB) domain.WalletRepository { return &walletRepo{db: db} }

func (r *walletRepo) AddTx(ctx context.Context, t *domain.Transaction) error {
	return r.db.WithContext(ctx).Create(t).Error
}

func (r *walletRepo) Transactions(ctx context.Context, userID uint, limit, offset int) ([]domain.Transaction, error) {
	if limit <= 0 {
		limit = 30
	}
	var tx []domain.Transaction
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("created_at desc").Limit(limit).Offset(offset).Find(&tx).Error
	return tx, err
}

func (r *walletRepo) CreateWithdrawal(ctx context.Context, w *domain.Withdrawal) error {
	return r.db.WithContext(ctx).Create(w).Error
}

func (r *walletRepo) UpdateWithdrawal(ctx context.Context, w *domain.Withdrawal) error {
	return r.db.WithContext(ctx).Save(w).Error
}

func (r *walletRepo) WithdrawalByID(ctx context.Context, id uint) (*domain.Withdrawal, error) {
	var w domain.Withdrawal
	err := r.db.WithContext(ctx).Preload("User").First(&w, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &w, err
}

func (r *walletRepo) Withdrawals(ctx context.Context, status domain.WithdrawalStatus, limit, offset int) ([]domain.Withdrawal, int64, error) {
	q := r.db.WithContext(ctx).Model(&domain.Withdrawal{})
	if status != "" {
		q = q.Where("status = ?", status)
	}
	var total int64
	q.Count(&total)
	if limit <= 0 {
		limit = 30
	}
	var w []domain.Withdrawal
	err := q.Preload("User").Order("created_at desc").Limit(limit).Offset(offset).Find(&w).Error
	return w, total, err
}

func (r *walletRepo) WithdrawalsForUser(ctx context.Context, userID uint) ([]domain.Withdrawal, error) {
	var w []domain.Withdrawal
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("created_at desc").Find(&w).Error
	return w, err
}

func (r *walletRepo) SumByType(ctx context.Context, t domain.TxType) (int64, error) {
	var sum int64
	err := r.db.WithContext(ctx).Model(&domain.Transaction{}).
		Where("type = ?", t).
		Select("COALESCE(SUM(ABS(amount)),0)").Scan(&sum).Error
	return sum, err
}

// ── OTP ──

type otpRepo struct{ db *gorm.DB }

// NewOTPRepository builds a domain.OTPRepository.
func NewOTPRepository(db *gorm.DB) domain.OTPRepository { return &otpRepo{db: db} }

func (r *otpRepo) Create(ctx context.Context, c *domain.OTPCode) error {
	return r.db.WithContext(ctx).Create(c).Error
}

func (r *otpRepo) Latest(ctx context.Context, mobile string) (*domain.OTPCode, error) {
	var c domain.OTPCode
	err := r.db.WithContext(ctx).Where("mobile = ? AND consumed = ?", mobile, false).
		Order("created_at desc").First(&c).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, domain.ErrNotFound
	}
	return &c, err
}

func (r *otpRepo) Consume(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&domain.OTPCode{}).
		Where("id = ?", id).Update("consumed", true).Error
}

// ── Notification ──

type notifRepo struct{ db *gorm.DB }

// NewNotificationRepository builds a domain.NotificationRepository.
func NewNotificationRepository(db *gorm.DB) domain.NotificationRepository { return &notifRepo{db: db} }

func (r *notifRepo) Create(ctx context.Context, n *domain.Notification) error {
	n.CreatedAt = time.Now()
	return r.db.WithContext(ctx).Create(n).Error
}

func (r *notifRepo) ForUser(ctx context.Context, userID uint, limit int) ([]domain.Notification, error) {
	if limit <= 0 {
		limit = 30
	}
	var n []domain.Notification
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).
		Order("created_at desc").Limit(limit).Find(&n).Error
	return n, err
}

func (r *notifRepo) MarkRead(ctx context.Context, userID, id uint) error {
	return r.db.WithContext(ctx).Model(&domain.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).Update("read", true).Error
}
