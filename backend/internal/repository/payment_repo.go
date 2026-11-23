package repository

import (
	"context"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type paymentRepo struct{ db *gorm.DB }

// NewPaymentRepository provides CRUD access to gateway payment orders.
func NewPaymentRepository(db *gorm.DB) domain.PaymentOrderStore {
	return &paymentRepo{db: db}
}

func (r *paymentRepo) Create(ctx context.Context, o *domain.PaymentOrder) error {
	return r.db.WithContext(ctx).Create(o).Error
}

func (r *paymentRepo) ByResNum(ctx context.Context, resNum string) (*domain.PaymentOrder, error) {
	var order domain.PaymentOrder
	if err := r.db.WithContext(ctx).Where("res_num = ?", resNum).First(&order).Error; err != nil {
		return nil, recordError(err)
	}
	return &order, nil
}

func (r *paymentRepo) ByID(ctx context.Context, id uint) (*domain.PaymentOrder, error) {
	var order domain.PaymentOrder
	if err := r.db.WithContext(ctx).First(&order, id).Error; err != nil {
		return nil, recordError(err)
	}
	return &order, nil
}

// BindBankToken stores the freshly minted gateway token on the pending order
// before the token is exposed to the purchaser (Monafaseh semantics).
func (r *paymentRepo) BindBankToken(ctx context.Context, id uint, token string) error {
	result := r.db.WithContext(ctx).Model(&domain.PaymentOrder{}).
		Where("id = ? AND status = ? AND token = ''", id, domain.PaymentPending).
		Update("token", token)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrConflict
	}
	return nil
}

// BindReceipt atomically claims the bank receipt for this order. Pending and
// failed orders are both bindable, and re-binding the same receipt is a no-op
// — a safe verification retry can therefore never lose a payment.
func (r *paymentRepo) BindReceipt(ctx context.Context, id uint, refNum string) error {
	result := r.db.WithContext(ctx).Model(&domain.PaymentOrder{}).
		Where("id = ? AND status IN ? AND (ref_num = '' OR ref_num = ?)",
			id, []domain.PaymentStatus{domain.PaymentPending, domain.PaymentFailed}, refNum).
		Update("ref_num", refNum)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return domain.ErrConflict
	}
	return nil
}

func (r *paymentRepo) RecentForUser(ctx context.Context, userID uint, limit int) ([]domain.PaymentOrder, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	var orders []domain.PaymentOrder
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("id DESC").Limit(limit).Find(&orders).Error
	return orders, err
}

func (r *paymentRepo) List(ctx context.Context, f domain.PaymentOrderFilter) ([]domain.PaymentOrder, int64, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 30
	}
	query := r.db.WithContext(ctx).Model(&domain.PaymentOrder{})
	if f.UserID > 0 {
		query = query.Where("user_id = ?", f.UserID)
	}
	if f.Status != "" {
		query = query.Where("status = ?", f.Status)
	}
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	var orders []domain.PaymentOrder
	err := query.Order("id DESC").Limit(f.Limit).Offset(f.Offset).Find(&orders).Error
	return orders, total, err
}
