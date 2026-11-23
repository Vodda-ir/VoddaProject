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

// sessionEndOverlapExpr returns the dialect-aware overlap predicate for a
// session window: existing rows whose [scheduled_at, scheduled_at+duration)
// intersects [start, end).
func (r *financialRepo) sessionEndOverlapExpr() string {
	if r.db != nil && r.db.Dialector.Name() == "sqlite" {
		return "scheduled_at < ? AND datetime(scheduled_at, '+' || duration || ' minutes') > ?"
	}
	return "scheduled_at < ? AND TIMESTAMPADD(MINUTE, duration, scheduled_at) > ?"
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
		if service.TeacherID != teacher.ID || !service.Active || service.Price < 0 || service.Duration <= 0 || service.Duration > 240 {
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
			Where(r.sessionEndOverlapExpr(), end, session.ScheduledAt).
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

// CreateFreeSession books a zero-price service (خدمات رایگان) atomically:
// same teacher/service/overlap guards as funded bookings, but no wallet debit
// and no ledger rows — nothing financial happens.
func (r *financialRepo) CreateFreeSession(ctx context.Context, session *domain.Session) error {
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
		if service.TeacherID != teacher.ID || !service.Active || service.Price != 0 || service.Duration <= 0 || service.Duration > 240 {
			return domain.ErrValidation
		}

		var learner domain.User
		if err := tx.Select("id", "active").First(&learner, session.LearnerID).Error; err != nil {
			return recordError(err)
		}
		if !learner.Active {
			return domain.ErrForbidden
		}

		end := session.ScheduledAt.Add(time.Duration(service.Duration) * time.Minute)
		var overlaps int64
		if err := tx.Model(&domain.Session{}).
			Where("status IN ?", []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed}).
			Where("(teacher_id = ? OR learner_id = ?)", teacher.ID, session.LearnerID).
			Where(r.sessionEndOverlapExpr(), end, session.ScheduledAt).
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
		return tx.Create(session).Error
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
		// جلسات رایگان: پولی در کار نیست — بدون برگشت وجه و بدون ردیف تراکنش صفر
		if locked.Price > 0 {
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
		// جلسات رایگان: درآمدی نیست — فقط وضعیت جلسه و شمارندهٔ جلسات به‌روز می‌شود
		if locked.Price > 0 {
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

// AdminAdjustWallet moves a signed amount in one transaction: the balance is
// updated under a row lock and a signed ledger row is written. Negative final
// balances are rejected so adjustments can never bankrupt a wallet.
func (r *financialRepo) AdminAdjustWallet(ctx context.Context, userID uint, amount int64, title string) error {
	if amount == 0 {
		return domain.ErrValidation
	}
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, userID).Error; err != nil {
			return recordError(err)
		}
		if user.Wallet+amount < 0 {
			return domain.ErrInsufficient
		}
		if err := tx.Model(&domain.User{}).Where("id = ?", userID).
			UpdateColumn("wallet", gorm.Expr("wallet + ?", amount)).Error; err != nil {
			return err
		}
		return tx.Create(&domain.Transaction{
			UserID: userID,
			Type:   domain.TxAdjust,
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

// SettlePaymentOrder finalizes a gateway payment in one transaction: the order
// row is locked, lifecycle is checked, gateway RefNum uniqueness is enforced
// (replay protection), the wallet balance is credited and a charge ledger row
// is written. Re-invoking an already-paid order is an idempotent no-op that
// returns the stored order, so duplicate gateway callbacks are safe.
func (r *financialRepo) SettlePaymentOrder(ctx context.Context, orderID uint, refNum, traceNo, cardPan string) (*domain.PaymentOrder, error) {
	var settled domain.PaymentOrder
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order domain.PaymentOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, orderID).Error; err != nil {
			return recordError(err)
		}
		if order.Status == domain.PaymentPaid {
			settled = order
			return nil
		}
		if order.Status != domain.PaymentPending {
			return domain.ErrConflict
		}
		var replay int64
		if err := tx.Model(&domain.PaymentOrder{}).
			Where("gateway = ? AND ref_num = ? AND id <> ? AND status = ?", order.Gateway, refNum, order.ID, domain.PaymentPaid).
			Count(&replay).Error; err != nil {
			return err
		}
		if replay > 0 {
			return domain.ErrConflict
		}
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, order.UserID).Error; err != nil {
			return recordError(err)
		}
		if !user.Active {
			return domain.ErrForbidden
		}
		updates := map[string]any{
			"status":     domain.PaymentPaid,
			"ref_num":    refNum,
			"trace_no":   traceNo,
			"card_pan":   cardPan,
			"updated_at": time.Now(),
		}
		if err := tx.Model(&domain.PaymentOrder{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
			return err
		}
		if err := tx.Model(&domain.User{}).Where("id = ?", order.UserID).
			UpdateColumn("wallet", gorm.Expr("wallet + ?", order.Amount)).Error; err != nil {
			return err
		}
		if err := tx.Create(&domain.Transaction{
			UserID: order.UserID,
			Type:   domain.TxCharge,
			Title:  "شارژ کیف پول از درگاه پرداخت",
			Amount: order.Amount,
			RefID:  order.ID,
		}).Error; err != nil {
			return err
		}
		order.Status = domain.PaymentPaid
		order.RefNum = refNum
		order.TraceNo = traceNo
		order.CardPan = cardPan
		settled = order
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &settled, nil
}

// MarkPaymentOrderFailed closes a pending order after a declined/canceled
// payment. Already-settled orders keep their paid state (money already moved).
func (r *financialRepo) MarkPaymentOrderFailed(ctx context.Context, orderID uint, reason string) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		result := tx.Model(&domain.PaymentOrder{}).
			Where("id = ? AND status = ?", orderID, domain.PaymentPending).
			Updates(map[string]any{
				"status":      domain.PaymentFailed,
				"fail_reason": reason,
				"updated_at":  time.Now(),
			})
		if result.Error != nil {
			return result.Error
		}
		return nil
	})
}

// FailPendingBookingOrders closes every still-pending booking order raised for
// one session, e.g. before the learner re-initiates the gateway payment.
func (r *financialRepo) FailPendingBookingOrders(ctx context.Context, sessionID uint, reason string) error {
	result := r.db.WithContext(ctx).Model(&domain.PaymentOrder{}).
		Where("order_type = ? AND ref_id = ? AND status = ?", domain.PaymentOrderBooking, sessionID, domain.PaymentPending).
		Updates(map[string]any{
			"status":      domain.PaymentFailed,
			"fail_reason": reason,
			"updated_at":  time.Now(),
		})
	return result.Error
}

// CreateAwaitingSession validates and reserves a slot for a gateway-paid
// booking in one transaction. No wallet money moves; the session stays in
// awaiting_payment until the payment settles or expires.
func (r *financialRepo) CreateAwaitingSession(ctx context.Context, session *domain.Session) error {
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
		if service.TeacherID != teacher.ID || !service.Active || service.Price < 0 || service.Duration <= 0 || service.Duration > 240 {
			return domain.ErrValidation
		}

		var learner domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&learner, session.LearnerID).Error; err != nil {
			return recordError(err)
		}
		if !learner.Active {
			return domain.ErrForbidden
		}

		end := session.ScheduledAt.Add(time.Duration(service.Duration) * time.Minute)
		var overlaps int64
		if err := tx.Model(&domain.Session{}).
			Where("status IN ?", []domain.SessionStatus{domain.SessionPending, domain.SessionConfirmed, domain.SessionAwaitingPayment}).
			Where("(teacher_id = ? OR learner_id = ?)", teacher.ID, session.LearnerID).
			Where(r.sessionEndOverlapExpr(), end, session.ScheduledAt).
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
		session.Status = domain.SessionAwaitingPayment
		return tx.Create(session).Error
	})
}

// CancelBookingSession cancels a session that has not left awaiting_payment,
// freeing its slot. Returning sessions in other states is a no-op conflict.
func (r *financialRepo) CancelBookingSession(ctx context.Context, sessionID uint, reason string) error {
	result := r.db.WithContext(ctx).Model(&domain.Session{}).
		Where("id = ? AND status = ?", sessionID, domain.SessionAwaitingPayment).
		Updates(map[string]any{
			"status":      domain.SessionCanceled,
			"reject_note": reason,
			"updated_at":  time.Now(),
		})
	if result.Error != nil {
		return result.Error
	}
	return nil
}

// CancelExpiredAwaitingSessions batch-cancels gateway bookings whose payment
// window elapsed. Slots become bookable again right after this call.
func (r *financialRepo) CancelExpiredAwaitingSessions(ctx context.Context, cutoff time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Model(&domain.Session{}).
		Where("status = ? AND created_at < ?", domain.SessionAwaitingPayment, cutoff).
		Updates(map[string]any{
			"status":      domain.SessionCanceled,
			"reject_note": "مهلت پرداخت آنلاین به پایان رسید",
			"updated_at":  time.Now(),
		})
	return result.RowsAffected, result.Error
}

// SettleBookingPaymentOrder finalizes a booking payment in one transaction:
// the order is locked, RefNum replay protection applies, and the attached
// session is activated (awaiting_payment → pending) so the teacher receives
// the request. No wallet balance moves — the money came straight from the
// gateway. If the session can no longer be activated (expired/canceled in the
// meantime), the paid amount lands in the learner wallet as a compensating
// charge with a ledger row, so the payer never loses money.
func (r *financialRepo) SettleBookingPaymentOrder(ctx context.Context, orderID uint, refNum, traceNo, cardPan string) (*domain.PaymentOrder, error) {
	var settled domain.PaymentOrder
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order domain.PaymentOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, orderID).Error; err != nil {
			return recordError(err)
		}
		if order.Status == domain.PaymentPaid {
			settled = order
			return nil
		}
		if order.Status != domain.PaymentPending || order.OrderType != domain.PaymentOrderBooking {
			return domain.ErrConflict
		}
		var replay int64
		if err := tx.Model(&domain.PaymentOrder{}).
			Where("gateway = ? AND ref_num = ? AND id <> ? AND status = ?", order.Gateway, refNum, order.ID, domain.PaymentPaid).
			Count(&replay).Error; err != nil {
			return err
		}
		if replay > 0 {
			return domain.ErrConflict
		}
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, order.UserID).Error; err != nil {
			return recordError(err)
		}
		if !user.Active {
			return domain.ErrForbidden
		}

		updates := map[string]any{
			"status":     domain.PaymentPaid,
			"ref_num":    refNum,
			"trace_no":   traceNo,
			"card_pan":   cardPan,
			"updated_at": time.Now(),
		}
		if err := tx.Model(&domain.PaymentOrder{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
			return err
		}

		var session domain.Session
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&session, order.RefID).Error; err != nil {
			return recordError(err)
		}
		if session.Status == domain.SessionAwaitingPayment {
			// جلسهٔ فوریِ برخاسته از فراخوان: استاد با ثبت پیشنهاد وعده
			// داده است؛ پس از تسویه بدون تأیید دوم قطعی می‌شود.
			newStatus := domain.SessionPending
			if session.Instant && session.ViaDispatch {
				newStatus = domain.SessionConfirmed
			}
			if err := tx.Model(&domain.Session{}).Where("id = ? AND status = ?", session.ID, domain.SessionAwaitingPayment).
				Update("status", newStatus).Error; err != nil {
				return err
			}
		} else {
			// Booking no longer activatable — refund into the wallet so the
			// gateway money stays reachable by the payer.
			if err := tx.Model(&domain.User{}).Where("id = ?", order.UserID).
				UpdateColumn("wallet", gorm.Expr("wallet + ?", order.Amount)).Error; err != nil {
				return err
			}
			if err := tx.Create(&domain.Transaction{
				UserID: order.UserID,
				Type:   domain.TxCharge,
				Title:  "شارژ کیف پول (جلسه قابل فعال‌سازی نبود)",
				Amount: order.Amount,
				RefID:  order.ID,
			}).Error; err != nil {
				return err
			}
		}

		order.Status = domain.PaymentPaid
		order.RefNum = refNum
		order.TraceNo = traceNo
		order.CardPan = cardPan
		settled = order
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &settled, nil
}

// ── خدمات حضوری قرآنی — ceremony escrow lifecycle ──

// PayCeremonyDepositFromWallet settles a ceremony booking's escrow deposit
// from the organizer's wallet in one transaction. The deposit is NOT the
// provider's money yet: it is platform-held escrow released at settlement or
// returned by the cancellation policy.
func (r *financialRepo) PayCeremonyDepositFromWallet(ctx context.Context, bookingID, organizerID uint, amount int64) (*domain.CeremonyBooking, error) {
	var out *domain.CeremonyBooking
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		booking, err := lockCeremonyBooking(tx, bookingID)
		if err != nil {
			return err
		}
		if booking.OrganizerID != organizerID || booking.Status != domain.CeremonyBookingDepositPending {
			return domain.ErrConflict
		}
		if amount != booking.DepositAmount || amount <= 0 {
			return domain.ErrValidation
		}
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, organizerID).Error; err != nil {
			return recordError(err)
		}
		if !user.Active {
			return domain.ErrForbidden
		}
		result := tx.Model(&domain.User{}).
			Where("id = ? AND wallet >= ?", organizerID, amount).
			UpdateColumn("wallet", gorm.Expr("wallet - ?", amount))
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected != 1 {
			return domain.ErrInsufficient
		}
		if err := tx.Create(&domain.Transaction{
			UserID: organizerID,
			Type:   domain.TxSession,
			Title:  "ودیعه قرارداد مراسم: " + booking.ServiceTitle,
			Amount: -amount,
			RefID:  booking.ID,
		}).Error; err != nil {
			return err
		}
		if err := tx.Model(&domain.CeremonyBooking{}).
			Where("id = ? AND status = ?", booking.ID, domain.CeremonyBookingDepositPending).
			Update("status", domain.CeremonyBookingDepositPaid).Error; err != nil {
			return err
		}
		booking.Status = domain.CeremonyBookingDepositPaid
		out = booking
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

// SettleCeremonyDepositOrder finalizes a gateway-paid ceremony deposit in one
// transaction: the order is marked paid and the booking is firmed up
// (deposit_pending → deposit_paid). The money is escrow — no wallet balance
// moves. If the booking can no longer be firmed up (cancelled meanwhile),
// the paid amount lands in the payer's wallet as a compensating charge.
func (r *financialRepo) SettleCeremonyDepositOrder(ctx context.Context, orderID uint, refNum, traceNo, cardPan string) (*domain.PaymentOrder, error) {
	var settled domain.PaymentOrder
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var order domain.PaymentOrder
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&order, orderID).Error; err != nil {
			return recordError(err)
		}
		if order.Status == domain.PaymentPaid {
			settled = order
			return nil
		}
		if order.Status != domain.PaymentPending || order.OrderType != domain.PaymentOrderCeremony {
			return domain.ErrConflict
		}
		var replay int64
		if err := tx.Model(&domain.PaymentOrder{}).
			Where("gateway = ? AND ref_num = ? AND id <> ? AND status = ?", order.Gateway, refNum, order.ID, domain.PaymentPaid).
			Count(&replay).Error; err != nil {
			return err
		}
		if replay > 0 {
			return domain.ErrConflict
		}
		var user domain.User
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&user, order.UserID).Error; err != nil {
			return recordError(err)
		}
		if !user.Active {
			return domain.ErrForbidden
		}

		updates := map[string]any{
			"status":     domain.PaymentPaid,
			"ref_num":    refNum,
			"trace_no":   traceNo,
			"card_pan":   cardPan,
			"updated_at": time.Now(),
		}
		if err := tx.Model(&domain.PaymentOrder{}).Where("id = ?", order.ID).Updates(updates).Error; err != nil {
			return err
		}

		booking, err := lockCeremonyBooking(tx, order.RefID)
		if err != nil {
			return err
		}
		if booking.OrganizerID != order.UserID || booking.Status != domain.CeremonyBookingDepositPending {
			// Booking no longer firmable — refund into the wallet so the
			// gateway money stays reachable by the payer.
			if err := tx.Model(&domain.User{}).Where("id = ?", order.UserID).
				UpdateColumn("wallet", gorm.Expr("wallet + ?", order.Amount)).Error; err != nil {
				return err
			}
			if err := tx.Create(&domain.Transaction{
				UserID: order.UserID,
				Type:   domain.TxCharge,
				Title:  "شارژ کیف پول (قرارداد مراسم قابل قطعی‌سازی نبود)",
				Amount: order.Amount,
				RefID:  order.ID,
			}).Error; err != nil {
				return err
			}
		} else {
			if err := tx.Model(&domain.CeremonyBooking{}).
				Where("id = ? AND status = ?", booking.ID, domain.CeremonyBookingDepositPending).
				Update("status", domain.CeremonyBookingDepositPaid).Error; err != nil {
				return err
			}
			booking.Status = domain.CeremonyBookingDepositPaid
		}

		order.Status = domain.PaymentPaid
		order.RefNum = refNum
		order.TraceNo = traceNo
		order.CardPan = cardPan
		settled = order
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &settled, nil
}

// FailPendingCeremonyOrders closes every still-pending ceremony order raised
// for one booking, e.g. before the organizer re-initiates payment.
func (r *financialRepo) FailPendingCeremonyOrders(ctx context.Context, bookingID uint, reason string) error {
	result := r.db.WithContext(ctx).Model(&domain.PaymentOrder{}).
		Where("order_type = ? AND ref_id = ? AND status = ?", domain.PaymentOrderCeremony, bookingID, domain.PaymentPending).
		Updates(map[string]any{
			"status":      domain.PaymentFailed,
			"fail_reason": reason,
			"updated_at":  time.Now(),
		})
	return result.Error
}

// CancelCeremonyBooking terminates a booking and applies the refund policy in
// one transaction: organizerRefund returns to the organizer's wallet,
// providerShare credits the provider's wallet. Zero amounts skip the move.
func (r *financialRepo) CancelCeremonyBooking(ctx context.Context, bookingID uint, organizerRefund, providerShare int64) (*domain.CeremonyBooking, error) {
	var out *domain.CeremonyBooking
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		booking, err := lockCeremonyBooking(tx, bookingID)
		if err != nil {
			return err
		}
		if booking.Status != domain.CeremonyBookingDepositPaid && booking.Status != domain.CeremonyBookingDepositPending {
			return domain.ErrConflict
		}
		deposit := booking.DepositAmount
		if booking.Status == domain.CeremonyBookingDepositPending {
			deposit = 0
		}
		if organizerRefund+providerShare > deposit {
			return domain.ErrValidation
		}
		if err := tx.Model(&domain.CeremonyBooking{}).
			Where("id = ?", booking.ID).
			Updates(map[string]any{
				"status":     domain.CeremonyBookingCancelled,
				"updated_at": time.Now(),
			}).Error; err != nil {
			return err
		}
		booking.Status = domain.CeremonyBookingCancelled

		if organizerRefund > 0 {
			if err := tx.Model(&domain.User{}).Where("id = ?", booking.OrganizerID).
				UpdateColumn("wallet", gorm.Expr("wallet + ?", organizerRefund)).Error; err != nil {
				return err
			}
			if err := tx.Create(&domain.Transaction{
				UserID: booking.OrganizerID,
				Type:   domain.TxCharge,
				Title:  "بازگشت ودیعه مراسم: " + booking.ServiceTitle,
				Amount: organizerRefund,
				RefID:  booking.ID,
			}).Error; err != nil {
				return err
			}
		}
		if providerShare > 0 {
			if err := tx.Model(&domain.User{}).Where("id = ?", booking.ProviderUserID).
				UpdateColumn("wallet", gorm.Expr("wallet + ?", providerShare)).Error; err != nil {
				return err
			}
			if err := tx.Create(&domain.Transaction{
				UserID: booking.ProviderUserID,
				Type:   domain.TxEarning,
				Title:  "ودیعه به‌دلیل لغو مراسم: " + booking.ServiceTitle,
				Amount: providerShare,
				RefID:  booking.ID,
			}).Error; err != nil {
				return err
			}
		}
		out = booking
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}

// SettleCeremonyBooking pays the provider for an executed ceremony in one
// transaction — mirror of CompleteAndSettleSession: booking → settled,
// provider wallet credited with the payout and earning/commission ledger
// rows are written.
func (r *financialRepo) SettleCeremonyBooking(ctx context.Context, bookingID, providerUserID uint, payout, commission, gross int64) (*domain.CeremonyBooking, error) {
	var out *domain.CeremonyBooking
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		booking, err := lockCeremonyBooking(tx, bookingID)
		if err != nil {
			return err
		}
		if booking.Status != domain.CeremonyBookingDepositPaid {
			return domain.ErrConflict
		}
		now := time.Now()
		if err := tx.Model(&domain.CeremonyBooking{}).
			Where("id = ? AND status = ?", booking.ID, domain.CeremonyBookingDepositPaid).
			Updates(map[string]any{
				"status":     domain.CeremonyBookingSettled,
				"settled_at": now,
				"updated_at": now,
			}).Error; err != nil {
			return err
		}
		booking.Status = domain.CeremonyBookingSettled
		booking.SettledAt = &now

		if err := tx.Model(&domain.User{}).Where("id = ?", providerUserID).
			UpdateColumn("wallet", gorm.Expr("wallet + ?", payout)).Error; err != nil {
			return err
		}
		if err := tx.Create(&domain.Transaction{
			UserID: providerUserID,
			Type:   domain.TxEarning,
			Title:  "درآمد مراسم: " + booking.ServiceTitle,
			Amount: gross,
			RefID:  booking.ID,
		}).Error; err != nil {
			return err
		}
		if commission > 0 {
			if err := tx.Create(&domain.Transaction{
				UserID: providerUserID,
				Type:   domain.TxCommission,
				Title:  "کارمزد پلتفرم",
				Amount: -commission,
				RefID:  booking.ID,
			}).Error; err != nil {
				return err
			}
		}
		out = booking
		return nil
	})
	if err != nil {
		return nil, err
	}
	return out, nil
}
