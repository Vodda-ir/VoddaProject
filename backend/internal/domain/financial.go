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
	// CreateFreeSession stores a zero-price (خدمات رایگان) booking in one
	// transaction: identical slot/eligibility guards as funded bookings but
	// no wallet movement and no ledger rows.
	CreateFreeSession(ctx context.Context, session *Session) error
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

	// PayCeremonyDepositFromWallet settles a ceremony booking's escrow deposit
	// from the organizer's wallet in one transaction (deduct + ledger +
	// deposit_pending → deposit_paid).
	PayCeremonyDepositFromWallet(ctx context.Context, bookingID, organizerID uint, amount int64) (*CeremonyBooking, error)
	// SettleCeremonyDepositOrder marks a ceremony deposit order paid and flips
	// its booking (deposit_pending → deposit_paid) without moving wallet
	// money — the money came from the gateway and is held as escrow. If the
	// booking can no longer be firmed up, the amount lands in the payer's
	// wallet as a compensating charge so the payer never loses money.
	SettleCeremonyDepositOrder(ctx context.Context, orderID uint, refNum, traceNo, cardPan string) (*PaymentOrder, error)
	// FailPendingCeremonyOrders closes stale pending ceremony deposit orders
	// raised for one booking before re-initiating payment.
	FailPendingCeremonyOrders(ctx context.Context, bookingID uint, reason string) error
	// CancelCeremonyBooking terminates a booking and applies the refund
	// policy in one transaction: organizerRefund goes back to the
	// organizer's wallet, providerShare goes to the provider's wallet.
	CancelCeremonyBooking(ctx context.Context, bookingID uint, organizerRefund, providerShare int64) (*CeremonyBooking, error)
	// SettleCeremonyBooking pays the provider for an executed ceremony in one
	// transaction: booking → settled, provider wallet += payout (gross minus
	// commission) with earning + commission ledger rows.
	SettleCeremonyBooking(ctx context.Context, bookingID, providerUserID uint, payout, commission int64, gross int64) (*CeremonyBooking, error)
}
