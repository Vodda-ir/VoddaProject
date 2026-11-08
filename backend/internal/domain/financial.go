package domain

import (
	"context"
	"time"
)

// FinancialRepository owns operations that must update balances, ledger rows and
// lifecycle records in one database transaction. Implementations must be safe to
// retry and must reject stale lifecycle states rather than duplicating money moves.
type FinancialRepository interface {
	CreateFundedSession(ctx context.Context, session *Session) error
	// CreateAwaitingSession reserves the slot for a gateway-paid booking: the
	// session is stored as awaiting_payment and no wallet money moves yet.
	CreateAwaitingSession(ctx context.Context, session *Session) error
	CancelAndRefundSession(ctx context.Context, session *Session, allowed []SessionStatus, reason string) error
	CompleteAndSettleSession(ctx context.Context, session *Session, teacherUserID uint, earning, commission int64) error
	ChargeWallet(ctx context.Context, userID uint, amount int64, title string) error
	CreateFundedWithdrawal(ctx context.Context, withdrawal *Withdrawal) error
	ProcessWithdrawal(ctx context.Context, withdrawal *Withdrawal, paid bool) error
	AdminAdjustWallet(ctx context.Context, userID uint, amount int64, title string) error
	SettlePaymentOrder(ctx context.Context, orderID uint, refNum, traceNo, cardPan string) (*PaymentOrder, error)
	// SettleBookingPaymentOrder marks a booking order paid and activates its
	// session (awaiting_payment → pending) without moving wallet money. If the
	// session can no longer be activated, the amount lands in the wallet as a
	// compensating charge so the payer never loses money.
	SettleBookingPaymentOrder(ctx context.Context, orderID uint, refNum, traceNo, cardPan string) (*PaymentOrder, error)
	MarkPaymentOrderFailed(ctx context.Context, orderID uint, reason string) error
	// FailPendingBookingOrders closes stale pending orders raised for a session
	// (e.g. before re-initiating the payment).
	FailPendingBookingOrders(ctx context.Context, sessionID uint, reason string) error
	// CancelBookingSession cancels a session that is still awaiting payment.
	CancelBookingSession(ctx context.Context, sessionID uint, reason string) error
	// CancelExpiredAwaitingSessions batch-cancels abandoned gateway bookings
	// whose payment window elapsed, freeing their slots again.
	CancelExpiredAwaitingSessions(ctx context.Context, cutoff time.Time) (int64, error)
}
