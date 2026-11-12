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

// PaymentStartPath is the public BFF route serving the self-submitting
// payment hand-off page (SamanStart). The payer's browser loads it from
// vodda.ir so the Sep OnlinePG UI receives the vodda.ir Referer it enforces;
// pointing the payer straight at sep.shaparak.ir/payment.aspx no longer
// works (the gateway answers with its generic error page).
const PaymentStartPath = "/api/backend/payments/saman/start"

// PaymentUsecase coordinates gateway payments (wallet top-ups and session
// bookings) through Saman Sep.
type PaymentUsecase struct {
	payments    domain.PaymentOrderStore
	financial   domain.FinancialRepository
	users       domain.UserRepository
	teachers    domain.TeacherRepository
	notifs      domain.NotificationRepository
	sessions    domain.SessionRepository
	saman       *payment.Saman
	frontendURL string
}

// NewPaymentUsecase wires the gateway dependencies. Gateway nil disables top-ups.
func NewPaymentUsecase(
	payments domain.PaymentOrderStore,
	financial domain.FinancialRepository,
	users domain.UserRepository,
	teachers domain.TeacherRepository,
	notifs domain.NotificationRepository,
	sessions domain.SessionRepository,
	saman *payment.Saman,
	cfg *config.Config,
) *PaymentUsecase {
	return &PaymentUsecase{
		payments:    payments,
		financial:   financial,
		users:       users,
		teachers:    teachers,
		notifs:      notifs,
		sessions:    sessions,
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
		RedirectURL: uc.startURL(token),
		Amount:      order.Amount,
	}, nil
}

// startURL points the payer at the vodda.ir hand-off page that carries the
// freshly minted token into the Sep OnlinePG payment UI.
func (uc *PaymentUsecase) startURL(token string) string {
	return uc.frontendURL + PaymentStartPath + "?token=" + url.QueryEscape(token)
}

// StartPage renders the payment hand-off page for a minted Sep token.
// ok=false when the gateway is disabled or the token shape is invalid — the
// caller then serves the plain failure page instead of a hand-off.
func (uc *PaymentUsecase) StartPage(token string) ([]byte, bool) {
	token = strings.TrimSpace(token)
	if uc == nil || uc.saman == nil || !hexSepToken(token) {
		return nil, false
	}
	return uc.saman.StartFormHTML(token), true
}

// hexSepToken checks the Sep OnlinePG token shape: 32 lowercase hex chars.
func hexSepToken(token string) bool {
	if len(token) != 32 {
		return false
	}
	for _, r := range token {
		if !((r >= '0' && r <= '9') || (r >= 'a' && r <= 'f')) {
			return false
		}
	}
	return true
}

// walletResultURL builds the frontend landing URL after gateway round-trip.
func (uc *PaymentUsecase) walletResultURL(status, refNum string) string {
	target := uc.frontendURL + "/panel/user/wallet?payment=" + url.QueryEscape(status)
	if refNum != "" {
		target += "&ref=" + url.QueryEscape(refNum)
	}
	return target
}

// bookingResultURL sends the payer back to their sessions list, where the
// booked session now appears (pending, awaiting teacher confirmation).
func (uc *PaymentUsecase) bookingResultURL(status, refNum string) string {
	target := uc.frontendURL + "/panel/user/sessions?payment=" + url.QueryEscape(status)
	if refNum != "" {
		target += "&ref=" + url.QueryEscape(refNum)
	}
	return target
}

// CreateBookingPayment opens a pending order attached to a reserved session
// and returns the Sep payment page URL. Amount equals the session price.
func (uc *PaymentUsecase) CreateBookingPayment(ctx context.Context, user *domain.User, session *domain.Session) (*TopupResult, error) {
	if !uc.GatewayReady() {
		return nil, domain.ErrForbidden
	}
	if user == nil || session == nil || session.Price <= 0 {
		return nil, domain.ErrValidation
	}
	if !user.Active {
		return nil, domain.ErrForbidden
	}

	order := &domain.PaymentOrder{
		UserID:    user.ID,
		Gateway:   "saman",
		OrderType: domain.PaymentOrderBooking,
		RefID:     session.ID,
		ResNum:    newResNum(),
		Amount:    session.Price,
		Status:    domain.PaymentPending,
	}
	if err := uc.payments.Create(ctx, order); err != nil {
		return nil, err
	}

	// Saman works in Rial; the platform prices are denominated in Toman.
	token, err := uc.saman.RequestToken(ctx, order.Amount*10, order.ResNum, uc.frontendURL+PaymentCallbackURL, user.Mobile)
	if err != nil {
		if markErr := uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "token: "+err.Error()); markErr != nil {
			log.Printf("[payment] booking order %d token+markfailed errors: %v / %v", order.ID, err, markErr)
		}
		return nil, fmt.Errorf("درگاه پرداخت موقتاً در دسترس نیست؛ لطفاً چند دقیقه دیگر تلاش کنید")
	}
	return &TopupResult{
		ResNum:      order.ResNum,
		RedirectURL: uc.startURL(token),
		Amount:      order.Amount,
	}, nil
}

// HandleCallback processes the gateway POST/GET back-channel. It always
// returns a frontend redirect URL, regardless of outcome, so the payer never
// lands on a raw API response. Settlement branches on the order type:
// topups credit the wallet, bookings activate the reserved session.
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
	isBooking := order.OrderType == domain.PaymentOrderBooking
	failureURL := uc.walletResultURL("failed", "")
	if isBooking {
		failureURL = uc.bookingResultURL("failed", "")
	}

	if !strings.EqualFold(form.State, "OK") {
		reason := "پرداخت ناموفق یا لغو شده توسط کاربر"
		if form.Status != "" && form.Status != "OK" && form.Status != "0" {
			reason += " (کد " + form.Status + ")"
		}
		_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, reason)
		if isBooking {
			if err := uc.financial.CancelBookingSession(ctx, order.RefID, "پرداخت آنلاین انجام نشد"); err != nil {
				log.Printf("%s: cancel booking session %d failed: %v", failurePrefix, order.RefID, err)
			}
		}
		return failureURL
	}

	// Amount guard: callback Amount is Rial, order.Amount is Toman.
	callbackRial, amountErr := strconv.ParseInt(strings.TrimSpace(form.Amount), 10, 64)
	if amountErr != nil || callbackRial != order.Amount*10 {
		log.Printf("%s: amount mismatch resnum=%s callback_rial=%s order_toman=%d", failurePrefix, resNum, form.Amount, order.Amount)
		_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "مبلغ بازگشتی با سفارش مطابقت ندارد")
		if isBooking {
			_ = uc.financial.CancelBookingSession(ctx, order.RefID, "پرداخت آنلاین انجام نشد")
		}
		return failureURL
	}

	// Terminal/MID guard when the gateway echoes them.
	if form.MID != "" && uc.saman != nil && uc.saman.MerchantID() != "" && form.MID != uc.saman.MerchantID() {
		log.Printf("%s: MID mismatch resnum=%s mid=%s", failurePrefix, resNum, form.MID)
		_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "شناسه پذیرنده مطابقت ندارد")
		if isBooking {
			_ = uc.financial.CancelBookingSession(ctx, order.RefID, "پرداخت آنلاین انجام نشد")
		}
		return failureURL
	}

	// Bank-side verification, fail-closed (Monafaseh-proven path): the
	// VerifyTransaction REST call needs only the terminal number — no panel
	// credentials. A bank rejection, any mismatched detail, or an unreachable
	// verify endpoint voids the settlement; the receipt stays recorded for
	// bank follow-up.
	verified, raw, verifyErr := uc.saman.VerifyTransaction(ctx, form.RefNum, order.Amount*10)
	if verifyErr != nil && uc.saman.VerifyConfigured() {
		// Transport failure — deployments that DO have panel credentials get
		// a second chance through the legacy verify.aspx handshake.
		verified, raw, verifyErr = uc.saman.Verify(ctx, form)
	}
	if verifyErr != nil || !verified {
		log.Printf("%s: verify failed resnum=%s refnum=%s raw=%s err=%v", failurePrefix, resNum, form.RefNum, raw, verifyErr)
		_ = uc.financial.MarkPaymentOrderFailed(ctx, order.ID, "تأیید درگاه ناموفق بود؛ رسید برای پیگیری بانک حفظ شد")
		if isBooking {
			_ = uc.financial.CancelBookingSession(ctx, order.RefID, "پرداخت آنلاین انجام نشد")
		}
		return failureURL
	}

	if isBooking {
		settled, err := uc.financial.SettleBookingPaymentOrder(ctx, order.ID, form.RefNum, form.TraceNo, form.SecurePan)
		if err != nil {
			switch {
			case errors.Is(err, domain.ErrConflict):
				log.Printf("%s: booking replay/conflict resnum=%s refnum=%s", failurePrefix, resNum, form.RefNum)
			default:
				log.Printf("%s: booking settle error resnum=%s: %v", failurePrefix, resNum, err)
			}
			return failureURL
		}
		log.Printf("[payment] settled booking order=%d session=%d user=%d amount=%d toman refnum=%s trace=%s",
			settled.ID, settled.RefID, settled.UserID, settled.Amount, settled.RefNum, settled.TraceNo)
		uc.notifyBookingSettled(ctx, settled)
		return uc.bookingResultURL("success", settled.RefNum)
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

// notifyBookingSettled tells the teacher a gateway-paid request just became
// actionable. Best-effort: settlement itself already committed.
func (uc *PaymentUsecase) notifyBookingSettled(ctx context.Context, order *domain.PaymentOrder) {
	if uc.teachers == nil || uc.notifs == nil || order.RefID == 0 {
		return
	}
	session, err := uc.sessionsByID(ctx, order.RefID)
	if err != nil || session == nil {
		return
	}
	teacher, err := uc.teachers.ByID(ctx, session.TeacherID)
	if err != nil || teacher == nil {
		return
	}
	_ = uc.notifs.Create(ctx, &domain.Notification{
		UserID: teacher.UserID,
		Title:  "درخواست جلسه‌ی جدید",
		Body:   "یک درخواست جلسه‌ی جدید دریافت کردید.",
	})
}

// sessionsByID resolves a session for post-settlement notifications.
func (uc *PaymentUsecase) sessionsByID(ctx context.Context, id uint) (*domain.Session, error) {
	if uc.sessions == nil {
		return nil, domain.ErrNotFound
	}
	return uc.sessions.ByID(ctx, id)
}

// RecentTopups lists the user's latest gateway orders.
func (uc *PaymentUsecase) RecentTopups(ctx context.Context, userID uint, limit int) ([]domain.PaymentOrder, error) {
	return uc.payments.RecentForUser(ctx, userID, limit)
}
