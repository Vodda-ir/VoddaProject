package usecase

import (
	"context"

	"vodda/backend/internal/domain"
)

// WalletUsecase handles wallet top-ups, transactions and teacher withdrawals.
type WalletUsecase struct {
	wallet            domain.WalletRepository
	users             domain.UserRepository
	teachers          domain.TeacherRepository
	financial         domain.FinancialRepository
	notif             domain.NotificationRepository
	allowDirectCharge bool
}

// NewWalletUsecase builds a WalletUsecase. Direct wallet charging is a development-only
// facility and must remain disabled in production until a verified payment callback exists.
// The variadic argument preserves compatibility with older tests and callers.
func NewWalletUsecase(w domain.WalletRepository, u domain.UserRepository, t domain.TeacherRepository, n domain.NotificationRepository, allowDirectCharge ...bool) *WalletUsecase {
	allow := false
	if len(allowDirectCharge) > 0 {
		allow = allowDirectCharge[0]
	}
	return &WalletUsecase{wallet: w, users: u, teachers: t, notif: n, allowDirectCharge: allow}
}

// NewWalletUsecaseWithFinancial is the production constructor. It injects a
// transaction boundary for every operation that changes money.
func NewWalletUsecaseWithFinancial(w domain.WalletRepository, u domain.UserRepository, t domain.TeacherRepository, n domain.NotificationRepository, financial domain.FinancialRepository, allowDirectCharge bool) *WalletUsecase {
	return &WalletUsecase{
		wallet: w, users: u, teachers: t, financial: financial,
		notif: n, allowDirectCharge: allowDirectCharge,
	}
}

// Transactions returns the user's ledger.
func (uc *WalletUsecase) Transactions(ctx context.Context, userID uint, limit, offset int) ([]domain.Transaction, error) {
	return uc.wallet.Transactions(ctx, userID, limit, offset)
}

// Charge tops up a learner's wallet. This endpoint is intentionally limited to
// explicitly-enabled development environments. Production credit must only be created
// by a payment gateway callback after server-side verification.
func (uc *WalletUsecase) Charge(ctx context.Context, userID uint, amount int64) (*domain.User, error) {
	if !uc.allowDirectCharge {
		return nil, domain.ErrForbidden
	}
	if amount <= 0 {
		return nil, domain.ErrValidation
	}
	if uc.financial != nil {
		if err := uc.financial.ChargeWallet(ctx, userID, amount, "شارژ آزمایشی کیف پول"); err != nil {
			return nil, err
		}
		return uc.users.ByID(ctx, userID)
	}

	if err := uc.users.AddWallet(ctx, userID, amount); err != nil {
		return nil, err
	}
	if err := uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: userID, Type: domain.TxCharge, Title: "شارژ آزمایشی کیف پول", Amount: amount,
	}); err != nil {
		_ = uc.users.AddWallet(ctx, userID, -amount)
		return nil, err
	}
	return uc.users.ByID(ctx, userID)
}

// WithdrawInput is a teacher payout request.
type WithdrawInput struct {
	Amount int64
	Card   string
	Sheba  string
}

// RequestWithdrawal files a payout request, debiting the teacher's wallet.
func (uc *WalletUsecase) RequestWithdrawal(ctx context.Context, userID uint, in WithdrawInput) (*domain.Withdrawal, error) {
	if in.Amount <= 0 || (in.Card == "" && in.Sheba == "") {
		return nil, domain.ErrValidation
	}
	t, err := uc.teachers.ByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	user, err := uc.users.ByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.Wallet < in.Amount {
		return nil, domain.ErrInsufficient
	}

	w := &domain.Withdrawal{
		TeacherID: t.ID, UserID: userID, Amount: in.Amount,
		Card: in.Card, Sheba: in.Sheba, Status: domain.WithdrawalPending,
	}
	if uc.financial != nil {
		if err := uc.financial.CreateFundedWithdrawal(ctx, w); err != nil {
			return nil, err
		}
		return w, nil
	}

	if err := uc.wallet.CreateWithdrawal(ctx, w); err != nil {
		return nil, err
	}
	if err := uc.users.AddWallet(ctx, userID, -in.Amount); err != nil {
		w.Status = domain.WithdrawalRejected
		_ = uc.wallet.UpdateWithdrawal(ctx, w)
		return nil, err
	}
	if err := uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: userID, Type: domain.TxWithdrawal,
		Title: "درخواست برداشت وجه", Amount: -in.Amount, RefID: w.ID,
	}); err != nil {
		_ = uc.users.AddWallet(ctx, userID, in.Amount)
		w.Status = domain.WithdrawalRejected
		_ = uc.wallet.UpdateWithdrawal(ctx, w)
		return nil, err
	}
	return w, nil
}

// MyWithdrawals lists a teacher's payout requests.
func (uc *WalletUsecase) MyWithdrawals(ctx context.Context, userID uint) ([]domain.Withdrawal, error) {
	return uc.wallet.WithdrawalsForUser(ctx, userID)
}

// ── admin actions ──

// ProcessWithdrawal marks a payout paid or rejected (admin action). On reject
// the reserved funds are returned to the teacher's wallet.
func (uc *WalletUsecase) ProcessWithdrawal(ctx context.Context, id uint, paid bool) (*domain.Withdrawal, error) {
	w, err := uc.wallet.WithdrawalByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if w.Status != domain.WithdrawalPending {
		return nil, domain.ErrConflict
	}

	if uc.financial != nil {
		if err := uc.financial.ProcessWithdrawal(ctx, w, paid); err != nil {
			return nil, err
		}
		if paid {
			uc.notify(ctx, w.UserID, "برداشت وجه انجام شد", "درخواست برداشت شما پرداخت شد.")
		} else {
			uc.notify(ctx, w.UserID, "برداشت وجه رد شد", "درخواست برداشت شما رد و مبلغ بازگردانده شد.")
		}
		return w, nil
	}

	if paid {
		w.Status = domain.WithdrawalPaid
		if err := uc.wallet.UpdateWithdrawal(ctx, w); err != nil {
			return nil, err
		}
		uc.notify(ctx, w.UserID, "برداشت وجه انجام شد", "درخواست برداشت شما پرداخت شد.")
		return w, nil
	}

	if err := uc.users.AddWallet(ctx, w.UserID, w.Amount); err != nil {
		return nil, err
	}
	w.Status = domain.WithdrawalRejected
	if err := uc.wallet.UpdateWithdrawal(ctx, w); err != nil {
		_ = uc.users.AddWallet(ctx, w.UserID, -w.Amount)
		return nil, err
	}
	if err := uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: w.UserID, Type: domain.TxCharge,
		Title: "بازگشت وجه برداشت", Amount: w.Amount, RefID: w.ID,
	}); err != nil {
		return nil, err
	}
	uc.notify(ctx, w.UserID, "برداشت وجه رد شد", "درخواست برداشت شما رد و مبلغ بازگردانده شد.")
	return w, nil
}

func (uc *WalletUsecase) notify(ctx context.Context, userID uint, title, body string) {
	_ = uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}
