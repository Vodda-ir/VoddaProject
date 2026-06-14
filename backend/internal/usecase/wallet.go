package usecase

import (
	"context"

	"vodda/backend/internal/domain"
)

// WalletUsecase handles wallet top-ups, transactions and teacher withdrawals.
type WalletUsecase struct {
	wallet   domain.WalletRepository
	users    domain.UserRepository
	teachers domain.TeacherRepository
	notif    domain.NotificationRepository
}

// NewWalletUsecase builds a WalletUsecase.
func NewWalletUsecase(w domain.WalletRepository, u domain.UserRepository, t domain.TeacherRepository, n domain.NotificationRepository) *WalletUsecase {
	return &WalletUsecase{wallet: w, users: u, teachers: t, notif: n}
}

// Transactions returns the user's ledger.
func (uc *WalletUsecase) Transactions(ctx context.Context, userID uint, limit, offset int) ([]domain.Transaction, error) {
	return uc.wallet.Transactions(ctx, userID, limit, offset)
}

// Charge tops up a learner's wallet. In a real deployment this is invoked by
// the payment gateway callback after a verified transaction.
func (uc *WalletUsecase) Charge(ctx context.Context, userID uint, amount int64) (*domain.User, error) {
	if amount <= 0 {
		return nil, domain.ErrValidation
	}
	if err := uc.users.AddWallet(ctx, userID, amount); err != nil {
		return nil, err
	}
	_ = uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: userID, Type: domain.TxCharge, Title: "شارژ کیف پول", Amount: amount,
	})
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
	if in.Amount <= 0 {
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
	if err := uc.wallet.CreateWithdrawal(ctx, w); err != nil {
		return nil, err
	}
	// reserve the funds immediately
	_ = uc.users.AddWallet(ctx, userID, -in.Amount)
	_ = uc.wallet.AddTx(ctx, &domain.Transaction{
		UserID: userID, Type: domain.TxWithdrawal,
		Title: "درخواست برداشت وجه", Amount: -in.Amount, RefID: w.ID,
	})
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
	if paid {
		w.Status = domain.WithdrawalPaid
		uc.notify(ctx, w.UserID, "برداشت وجه انجام شد", "درخواست برداشت شما پرداخت شد.")
	} else {
		w.Status = domain.WithdrawalRejected
		_ = uc.users.AddWallet(ctx, w.UserID, w.Amount)
		_ = uc.wallet.AddTx(ctx, &domain.Transaction{
			UserID: w.UserID, Type: domain.TxCharge,
			Title: "بازگشت وجه برداشت", Amount: w.Amount, RefID: w.ID,
		})
		uc.notify(ctx, w.UserID, "برداشت وجه رد شد", "درخواست برداشت شما رد و مبلغ بازگردانده شد.")
	}
	if err := uc.wallet.UpdateWithdrawal(ctx, w); err != nil {
		return nil, err
	}
	return w, nil
}

func (uc *WalletUsecase) notify(ctx context.Context, userID uint, title, body string) {
	_ = uc.notif.Create(ctx, &domain.Notification{UserID: userID, Title: title, Body: body})
}
