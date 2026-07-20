package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"vodda/backend/internal/domain"
)

type financialRepo struct{ db *gorm.DB }

// NewFinancialRepository builds the transaction boundary for wallet and session flows.
func NewFinancialRepository(db *gorm.DB) domain.FinancialRepository {
	return &financialRepo{db: db}
}

func (r *financialRepo) CreateFundedSession(ctx context.Context, session *domain.Session) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var teacher domain.Teacher
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&teacher, session.TeacherID).Error; err != nil {
			return recordError(err)
		}
		if teacher.Status != domain.TeacherApproved || !teacher.Verified || !teacher.Available || teacher.UserID == session.LearnerID {
			return domain.ErrTeacherNotReady
		}

		var teacherUser domain.User
		if err := tx.Select("id", "active").First(&teacherUser, teacher.UserID).Error; err != nil {
			return recordError(err)
		}
		if !teacherUser.Active {
			return domain.ErrTeacherNotReady
		}

		var service domain.Service
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&service, session.ServiceID).Error; err != nil {
			return recordError(err)
		}
		if service.TeacherID != teacher.ID || !service.Active || service.Price <= 0 || service.Duration <= 0 || service.Duration > 240 {
			return domain.ErrValidation
		}

		var learner domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&learner, session.LearnerID).Error; err != nil {
			return recordError(err)
		}
		if !learner.Active {
			return domain.ErrForbidden
		}
		if learner.Wallet < service.Price {
			return domain.ErrInsufficient
		}

		end := session.ScheduledAt.Add(time.Duration(service.Duration) * time.Minute)
		var overlaps int64
		if err := tx.Model(&domain.Session{}).
			Where("status IN ?", []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}).
			Where("(teacher_id = ? OR learner_id = ?)", teacher.ID, session.LearnerID).
			Where("scheduled_at < ? AND TIMESTAMPADD(MINUTE, duration, scheduled_at) > ?", end, session.ScheduledAt).
			Count(&overlaps).Error; err != nil {
			return err
		}
		if overlaps > 0 {
			return domain.ErrConflict
		}

		session.ID = 0
		session.TeacherID = teacher.ID
		session.ServiceID = service.ID
		session.Title = service.Title
		session.Duration = service.Duration
		session.Price = service.Price
		session.Status = domain.SessionPending
		if err := tx.Create(session).Error; err != nil {
			return err
		}

		result := tx.Model(&domain.User{}).
			Where("id = ? AND active = ? AND wallet >= ?", learner.ID, true, service.Price).
			UpdateColumn("wallet", gorm.Expr("wallet - ?", service.Price))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return domain.ErrInsufficient
		}

		return tx.Create(&domain.Transaction{
			UserID: learner.ID,
			Type:   domain.TxSession,
			Title:  "رزرو جلسه: " + service.Title,
			Amount: -service.Price,
			RefID:  session.ID,
		}).Error
	})
}

func (r *financialRepo) CancelAndRefundSession(ctx context.Context, session *domain.Session, allowed []domain.SessionStatus, reason string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var locked domain.Session
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, session.ID).Error; err != nil {
			return recordError(err)
		}
		if !sessionStatusAllowed(locked.Status, allowed) {
			return domain.ErrConflict
		}

		locked.Status = domain.SessionCanceled
		locked.RejectNote = reason
		if err := tx.Model(&domain.Session{}).Where("id = ?", locked.ID).Updates(map[string]any{
			"status":      locked.Status,
			"reject_note": locked.RejectNote,
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&domain.User{}).Where("id = ?", locked.LearnerID).
			UpdateColumn("wallet", gorm.Expr("wallet + ?", locked.Price)).Error; err != nil {
			return err
		}
		if err := tx.Create(&domain.Transaction{
			UserID: locked.LearnerID,
			Type:   domain.TxCharge,
			Title:  "بازگشت وجه جلسه: " + locked.Title,
			Amount: locked.Price,
			RefID:  locked.ID,
		}).Error; err != nil {
			return err
		}
		*session = locked
		return nil
	})
}

func (r *financialRepo) CompleteAndSettleSession(ctx context.Context, session *domain.Session, teacherUserID uint, earning, commission int64) error {
	if earning < 0 || commission < 0 || earning+commission != session.Price {
		return domain.ErrValidation
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var locked domain.Session
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, session.ID).Error; err != nil {
			return recordError(err)
		}
		if locked.Status != domain.SessionConfirmed {
			return domain.ErrConflict
		}
		if earning+commission != locked.Price {
			return domain.ErrConflict
		}

		var teacher domain.Teacher
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&teacher, locked.TeacherID).Error; err != nil {
			return recordError(err)
		}
		if teacher.UserID != teacherUserID {
			return domain.ErrForbidden
		}

		locked.Status = domain.SessionDone
		if err := tx.Model(&domain.Session{}).Where("id = ? AND status = ?", locked.ID, domain.SessionConfirmed).
			Update("status", domain.SessionDone).Error; err != nil {
			return err
		}
		if err := tx.Model(&domain.User{}).Where("id = ?", teacherUserID).
			UpdateColumn("wallet", gorm.Expr("wallet + ?", earning)).Error; err != nil {
			return err
		}
		if err := tx.Create(&domain.Transaction{
			UserID: teacherUserID,
			Type:   domain.TxEarning,
			Title:  "درآمد ناخالص جلسه: " + locked.Title,
			Amount: locked.Price,
			RefID:  locked.ID,
		}).Error; err != nil {
			return err
		}
		if commission > 0 {
			if err := tx.Create(&domain.Transaction{
				UserID: teacherUserID,
				Type:   domain.TxCommission,
				Title:  "کارمزد پلتفرم",
				Amount: -commission,
				RefID:  locked.ID,
			}).Error; err != nil {
				return err
			}
		}
		if err := tx.Model(&domain.Teacher{}).Where("id = ?", teacher.ID).
			UpdateColumn("sessions", gorm.Expr("sessions + 1")).Error; err != nil {
			return err
		}
		*session = locked
		return nil
	})
}

func (r *financialRepo) ChargeWallet(ctx context.Context, userID uint, amount int64, title string) error {
	if amount <= 0 {
		return domain.ErrValidation
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			return recordError(err)
		}
		if !user.Active {
			return domain.ErrForbidden
		}
		if err := tx.Model(&domain.User{}).Where("id = ?", userID).
			UpdateColumn("wallet", gorm.Expr("wallet + ?", amount)).Error; err != nil {
			return err
		}
		return tx.Create(&domain.Transaction{
			UserID: userID,
			Type:   domain.TxCharge,
			Title:  title,
			Amount: amount,
		}).Error
	})
}

func (r *financialRepo) CreateFundedWithdrawal(ctx context.Context, withdrawal *domain.Withdrawal) error {
	if withdrawal.Amount <= 0 {
		return domain.ErrValidation
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, withdrawal.UserID).Error; err != nil {
			return recordError(err)
		}
		if !user.Active {
			return domain.ErrForbidden
		}
		if user.Wallet < withdrawal.Amount {
			return domain.ErrInsufficient
		}

		withdrawal.ID = 0
		withdrawal.Status = domain.WithdrawalPending
		if err := tx.Create(withdrawal).Error; err != nil {
			return err
		}
		result := tx.Model(&domain.User{}).
			Where("id = ? AND wallet >= ?", user.ID, withdrawal.Amount).
			UpdateColumn("wallet", gorm.Expr("wallet - ?", withdrawal.Amount))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return domain.ErrInsufficient
		}
		return tx.Create(&domain.Transaction{
			UserID: user.ID,
			Type:   domain.TxWithdrawal,
			Title:  "درخواست برداشت وجه",
			Amount: -withdrawal.Amount,
			RefID:  withdrawal.ID,
		}).Error
	})
}

func (r *financialRepo) ProcessWithdrawal(ctx context.Context, withdrawal *domain.Withdrawal, paid bool) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var locked domain.Withdrawal
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, withdrawal.ID).Error; err != nil {
			return recordError(err)
		}
		if locked.Status != domain.WithdrawalPending {
			return domain.ErrConflict
		}

		if paid {
			locked.Status = domain.WithdrawalPaid
			if err := tx.Model(&domain.Withdrawal{}).Where("id = ? AND status = ?", locked.ID, domain.WithdrawalPending).
				Update("status", locked.Status).Error; err != nil {
				return err
			}
			*withdrawal = locked
			return nil
		}

		locked.Status = domain.WithdrawalRejected
		if err := tx.Model(&domain.Withdrawal{}).Where("id = ? AND status = ?", locked.ID, domain.WithdrawalPending).
			Update("status", locked.Status).Error; err != nil {
			return err
		}
		if err := tx.Model(&domain.User{}).Where("id = ?", locked.UserID).
			UpdateColumn("wallet", gorm.Expr("wallet + ?", locked.Amount)).Error; err != nil {
			return err
		}
		if err := tx.Create(&domain.Transaction{
			UserID: locked.UserID,
			Type:   domain.TxCharge,
			Title:  "بازگشت وجه برداشت",
			Amount: locked.Amount,
			RefID:  locked.ID,
		}).Error; err != nil {
			return err
		}
		*withdrawal = locked
		return nil
	})
}

func sessionStatusAllowed(status domain.SessionStatus, allowed []domain.SessionStatus) bool {
	for _, candidate := range allowed {
		if status == candidate {
			return true
		}
	}
	return false
}

func recordError(err error) error {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.ErrNotFound
	}
	return err
}
