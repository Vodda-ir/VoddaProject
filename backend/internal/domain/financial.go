package domain

import "context"

// FinancialRepository owns operations that must update balances, ledger rows and
// lifecycle records in one database transaction. Implementations must be safe to
// retry and must reject stale lifecycle states rather than duplicating money moves.
type FinancialRepository interface {
	CreateFundedSession(ctx context.Context, session *Session) error
	CancelAndRefundSession(ctx context.Context, session *Session, allowed []SessionStatus, reason string) error
	CompleteAndSettleSession(ctx context.Context, session *Session, teacherUserID uint, earning, commission int64) error
	ChargeWallet(ctx context.Context, userID uint, amount int64, title string) error
	CreateFundedWithdrawal(ctx context.Context, withdrawal *Withdrawal) error
	ProcessWithdrawal(ctx context.Context, withdrawal *Withdrawal, paid bool) error
	AdminAdjustWallet(ctx context.Context, userID uint, amount int64, title string) error
}
