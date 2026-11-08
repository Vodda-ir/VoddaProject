// Package usecase — payment orchestration for external gateways (marker7).
package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand"
	"net/url"
	"strconv"
	"strings"
	"time"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
	"vodda/backend/internal/platform/payment"
)

// Wallet top-up bounds (Toman). Values chosen to defeat typos and abuse while
// staying practical for real lesson budgets.
const (
	TopupMinAmount int64 = 10_000
	TopupMaxAmount int64 = 100_000_000
)

// PaymentCallbackURL is the public endpoint the gateway posts back to. It is
// served by the BFF (public, no session) and forwarded to the backend.
const PaymentCallbackURL = "/api/payments/saman/callback"

// PaymentUsecase coordinates wallet top-ups through Saman Sep.
type PaymentUsecase struct {
	payments    domain.PaymentOrderStore
	financial   domain.FinancialRepository
	users       domain.UserRepository
	saman       *payment.Saman
	frontendURL string
}

// NewPaymentUsecase wires the gateway dependencies. Gateway nil disables top-ups.
func NewPaymentUsecase(
	payments domain.PaymentOrderStore,
	financial domain.FinancialRepository,
	users domain.UserRepository,
	saman *payment.Saman,
	cfg *config.Config,
) *PaymentUsecase {
	return &PaymentUsecase{
		payments:    payments,
		financial:   financial,
		users:       users,
		saman:       saman,
		frontendURL: strings.TrimRight(cfg.FrontendBaseURL, "/"),
	}
}

// GatewayReady reports whether wallet top-ups can be initiated.
func (uc *PaymentUsecase) GatewayReady() bool {
	return uc != nil && uc.saman != nil && uc.saman.Enabled()
}

// TopupResult gives the frontend everything needed to hand the payer to Sep.
type TopupResult struct {
	ResNum      string `json:"res_num"`
	RedirectURL string `json:"redirect_url"`
	Amount      int64  `json:"amount"`
}

// newResNum mints a collision-safe merchant reference number.
func newResNum() string {
	var sb strings.Builder
	sb.WriteString("VODDA-")
	sb.WriteString(strconv.FormatInt(time.Now().UnixNano()/1000, 36))
	sb.WriteString("-")
	const charset = "abcdefghjkmnpqrstuvwxyz23456789"
	for i := 0; i < 6; i++ {
		sb.WriteByte(charset[rand.Intn(len(charset))])
	}
	return sb.String()
}

// CreateTopup opens a pending order and returns the Sep payment page URL.
func (uc *PaymentUsecase) CreateTopup(ctx context.Context, userID uint, amount int64) (*TopupResult, error) {
	if !uc.GatewayReady() {
		return nil, domain.ErrForbidden
	}
	if amount < TopupMinAmount || amount > TopupMaxAmount {
		return nil, domain.ErrValidation
	}
	user, err := uc.users.ByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if !user.Active {
		return nil, domain.ErrForbidden
	}

	order := &domain.PaymentOrder{
		UserID:  userID,
		Gateway: "saman",
		ResNum:  newResNum(),
		Amount:  amount,
		Status:  domain.PaymentPending,
	}
	if err := uc.payments.Create(ctx, order); err != nil {
		return nil, err
	}

	// Saman works in Rial; the platform wallet is denominated in Toman.
	token, err := uc.saman.RequestToken(ctx, order.Amount*10, order.ResNum, uc.frontendURL+PaymentCallbackURL, user.Mobile)
	if err != nil {
		if markErr := uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "token: "+err.Error()); markErr != nil {
			log.Printf("[payment] order %d token+markfailed errors: %v / %v", order.ID, err, markErr)
		}
		return nil, fmt.Errorf("درگاه پرداخت موقتاً در دسترس نیست؛ لطفاً چند دقیقه دیگر تلاش کنید")
	}
	return &TopupResult{
		ResNum:      order.ResNum,
		RedirectURL: uc.saman.PayURL(token),
		Amount:      order.Amount,
	}, nil
}

// walletResultURL builds the frontend landing URL after gateway round-trip.
func (uc *PaymentUsecase) walletResultURL(status, refNum string) string {
	target := uc.frontendURL + "/panel/user/wallet?payment=" + url.QueryEscape(status)
	if refNum != "" {
		target += "&ref=" + url.QueryEscape(refNum)
	}
	return target
}

// HandleCallback processes the gateway POST/GET back-channel. It always
// returns a frontend redirect URL, regardless of outcome, so the payer never
// lands on a raw API response.
func (uc *PaymentUsecase) HandleCallback(ctx context.Context, form payment.CallbackForm) string {
	const failurePrefix = "[payment] saman callback"
	resNum := form.CRN
	if resNum == "" {
		log.Printf("%s: missing CRN (resnum) fields=%v", failurePrefix, form.Raw)
		return uc.walletResultURL("failed", "")
	}
	order, err := uc.payments.ByResNum(ctx, resNum)
	if err != nil {
		log.Printf("%s: unknown resnum=%s refnum=%s", failurePrefix, resNum, form.RefNum)
		return uc.walletResultURL("failed", "")
	}

	if !strings.EqualFold(form.State, "OK") {
		reason := "پرداخت ناموفق یا لغو شده توسط کاربر"
		if form.Status != "" && form.Status != "OK" && form.Status != "0" {
			reason += " (کد " + form.Status + ")"
		}
		_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, reason)
		return uc.walletResultURL("failed", "")
	}

	// Amount guard: callback Amount is Rial, order.Amount is Toman.
	callbackRial, amountErr := strconv.ParseInt(strings.TrimSpace(form.Amount), 10, 64)
	if amountErr != nil || callbackRial != order.Amount*10 {
		log.Printf("%s: amount mismatch resnum=%s callback_rial=%s order_toman=%d", failurePrefix, resNum, form.Amount, order.Amount)
		_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "مبلغ بازگشتی با سفارش مطابقت ندارد")
		return uc.walletResultURL("failed", "")
	}

	// Terminal/MID guard when the gateway echoes them.
	if form.MID != "" && uc.saman != nil && uc.saman.MerchantID() != "" && form.MID != uc.saman.MerchantID() {
		log.Printf("%s: MID mismatch resnum=%s mid=%s", failurePrefix, resNum, form.MID)
		_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "شناسه پذیرنده مطابقت ندارد")
		return uc.walletResultURL("failed", "")
	}

	// Remote verification when panel credentials are configured.
	if uc.saman.VerifyConfigured() {
		verified, raw, verifyErr := uc.saman.Verify(ctx, form)
		if verifyErr != nil || !verified {
			log.Printf("%s: verify failed resnum=%s raw=%s err=%v", failurePrefix, resNum, raw, verifyErr)
			_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "تأیید درگاه ناموفق بود")
			return uc.walletResultURL("failed", "")
		}
	} else {
		log.Printf("[payment] verify credentials absent — settling callback with strict validation only (resnum=%s)", resNum)
	}

	settled, err := uc.financial.SettlePaymentOrder(ctx, order.ID, form.RefNum, form.TraceNo, form.SecurePan)
	if err != nil {
		switch {
		case errors.Is(err, domain.ErrConflict):
			log.Printf("%s: replay/conflict resnum=%s refnum=%s", failurePrefix, resNum, form.RefNum)
			return uc.walletResultURL("failed", "")
		default:
			log.Printf("%s: settle error resnum=%s: %v", failurePrefix, resNum, err)
			return uc.walletResultURL("failed", "")
		}
	}
	log.Printf("[payment] settled order=%d user=%d amount=%d toman refnum=%s trace=%s",
		settled.ID, settled.UserID, settled.Amount, settled.RefNum, settled.TraceNo)
	return uc.walletResultURL("success", settled.RefNum)
}

// RecentTopups lists the user's latest gateway orders.
func (uc *PaymentUsecase) RecentTopups(ctx context.Context, userID uint, limit int) ([]domain.PaymentOrder, error) {
	return uc.payments.RecentForUser(ctx, userID, limit)
}
