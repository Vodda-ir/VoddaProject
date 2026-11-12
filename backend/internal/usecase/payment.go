// Package usecase — payment orchestration for external gateways, rebuilt as a
// faithful port of the Monafaseh service's proven payment flow.
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

// TopupResult gives the frontend everything needed to hand the payer to Sep —
// Monafaseh create semantics: the minted token travels in the JSON answer and
// the purchaser's own browser POSTs the form to OnlinePG. The token never
// rides in a URL.
type TopupResult struct {
        ResNum string `json:"res_num"`
        Token  string `json:"token"`
        Amount int64  `json:"amount"`
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

// gatewayNotReadyErr is the Monafaseh create-route 503 message: misconfigured
// gateway settings answer order creation with this Persian fail-closed text.
func gatewayNotReadyErr() error {
        return fmt.Errorf("درگاه پرداخت در حال آماده‌سازی است؛ لطفاً بعداً تلاش کنید")
}

// CreateTopup opens a pending order and mints the Sep payment token that the
// frontend posts to OnlinePG (Monafaseh create semantics).
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
        cfg, cfgErr := uc.saman.GatewayConfig()
        if cfgErr != nil {
                return nil, gatewayNotReadyErr()
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
        token, err := uc.saman.RequestPaymentToken(ctx, order.ResNum, order.Amount*10, cfg.CallbackURL)
        if err != nil {
                uc.failOrder(ctx, order, "token: "+err.Error())
                return nil, fmt.Errorf("درگاه پرداخت موقتاً در دسترس نیست؛ لطفاً چند دقیقه دیگر تلاش کنید")
        }
        // Bind the bank token to this order before exposing it to the purchaser
        // (Monafaseh semantics — the callback must echo this exact token).
        if err := uc.payments.BindBankToken(ctx, order.ID, token); err != nil {
                uc.failOrder(ctx, order, "bind token: "+err.Error())
                return nil, fmt.Errorf("درگاه پرداخت موقتاً در دسترس نیست؛ لطفاً چند دقیقه دیگر تلاش کنید")
        }
        return &TopupResult{
                ResNum: order.ResNum,
                Token:  token,
                Amount: order.Amount,
        }, nil
}

// failOrder marks a pending order failed, tolerating mark failures (log only).
func (uc *PaymentUsecase) failOrder(ctx context.Context, order *domain.PaymentOrder, reason string) {
        if markErr := uc.financial.MarkPaymentOrderFailed(ctx, order.ID, reason); markErr != nil {
                log.Printf("[payment] order %d mark-failed error: %v", order.ID, markErr)
        }
}

// walletResultURL builds the frontend landing URL after gateway round-trip.
func (uc *PaymentUsecase) walletResultURL(status, refNum string) string {
        return uc.resultURL("/panel/user/wallet", status, refNum)
}

// bookingResultURL sends the payer back to their sessions list, where the
// booked session now appears (pending, awaiting teacher confirmation).
func (uc *PaymentUsecase) bookingResultURL(status, refNum string) string {
        return uc.resultURL("/panel/user/sessions", status, refNum)
}

func (uc *PaymentUsecase) resultURL(path, status, refNum string) string {
        target := uc.frontendURL + path + "?payment=" + url.QueryEscape(status)
        if refNum != "" {
                target += "&ref=" + url.QueryEscape(refNum)
        }
        return target
}

// CreateBookingPayment opens a pending order attached to a reserved session
// and returns the Sep payment token for the client-side form post. Amount
// equals the session price.
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
        cfg, cfgErr := uc.saman.GatewayConfig()
        if cfgErr != nil {
                return nil, gatewayNotReadyErr()
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
        token, err := uc.saman.RequestPaymentToken(ctx, order.ResNum, order.Amount*10, cfg.CallbackURL)
        if err != nil {
                uc.failOrder(ctx, order, "token: "+err.Error())
                return nil, fmt.Errorf("درگاه پرداخت موقتاً در دسترس نیست؛ لطفاً چند دقیقه دیگر تلاش کنید")
        }
        if err := uc.payments.BindBankToken(ctx, order.ID, token); err != nil {
                uc.failOrder(ctx, order, "bind token: "+err.Error())
                return nil, fmt.Errorf("درگاه پرداخت موقتاً در دسترس نیست؛ لطفاً چند دقیقه دیگر تلاش کنید")
        }
        return &TopupResult{
                ResNum: order.ResNum,
                Token:  token,
                Amount: order.Amount,
        }, nil
}

// HandleCallback processes the gateway POST/GET back-channel, rebuilt as an
// exact port of the Monafaseh handlePaymentCallback sequence:
//
//  1. resNum/token shape guards;
//  2. order lookup by ResNum; the bank Token echo MUST match the token bound
//     to this exact order (callback fields are untrusted);
//  3. terminal and amount echo guards;
//  4. already-paid → idempotent success redirect;
//  5. State != OK → fail the order (and free the booked slot);
//  6. RefNum shape guard;
//  7. atomic receipt binding (unique receipt per order, replay-tolerant);
//  8. VerifyTransaction, fail-closed — on failure the receipt STAYS bound and
//     the order keeps pending/failed status for a safe verification retry
//     (Monafaseh's «پرداخت هنوز تأیید نشده» path — never a lost payment);
//  9. atomic settlement (wallet credit or booking activation).
//
// It always returns a frontend redirect URL, regardless of outcome, so the
// payer never lands on a raw API response.
func (uc *PaymentUsecase) HandleCallback(ctx context.Context, form payment.CallbackForm) string {
        const failurePrefix = "[payment] saman callback"

        // 1. Shape guards.
        if form.CRN == "" || len(form.CRN) > 100 || form.Token == "" || len(form.Token) > 512 {
                log.Printf("%s: incomplete callback fields resnum=%q token_len=%d", failurePrefix, form.CRN, len(form.Token))
                return uc.walletResultURL("failed", "")
        }

        // 2. Order lookup + token binding.
        order, err := uc.payments.ByResNum(ctx, form.CRN)
        if err != nil {
                log.Printf("%s: unknown resnum=%s refnum=%s", failurePrefix, form.CRN, form.RefNum)
                return uc.walletResultURL("failed", "")
        }
        isBooking := order.OrderType == domain.PaymentOrderBooking
        failureURL := uc.walletResultURL("failed", "")
        if isBooking {
                failureURL = uc.bookingResultURL("failed", "")
        }
        if order.Token == "" || order.Token != form.Token {
                // A bank token must belong to this exact order.
                log.Printf("%s: token mismatch resnum=%s", failurePrefix, form.CRN)
                return failureURL
        }

        // 3. Echo guards (terminal and amount) when the gateway echoes them.
        if _, cfgErr := uc.saman.GatewayConfig(); cfgErr != nil {
                log.Printf("%s: gateway config invalid: %v", failurePrefix, cfgErr)
                return failureURL
        }
        if form.TerminalEcho != "" && form.TerminalEcho != uc.saman.Terminal() {
                log.Printf("%s: terminal echo mismatch resnum=%s echo=%s", failurePrefix, form.CRN, form.TerminalEcho)
                return failureURL
        }
        if form.Amount != "" && (!isDigits(form.Amount) || mustInt64(form.Amount) != order.Amount*10) {
                log.Printf("%s: amount mismatch resnum=%s callback_rial=%s order_toman=%d", failurePrefix, form.CRN, form.Amount, order.Amount)
                return failureURL
        }

        // 4. Idempotent replay of a settled order.
        if order.Status == domain.PaymentPaid {
                refNum := order.RefNum
                if isBooking {
                        return uc.bookingResultURL("success", refNum)
                }
                return uc.walletResultURL("success", refNum)
        }

        // 5. Bank-side failure / payer cancellation.
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

        // 6. Receipt shape guard.
        refNum := form.RefNum
        if refNum == "" || len(refNum) > 100 || strings.HasPrefix(refNum, "DEMO-") {
                log.Printf("%s: invalid receipt resnum=%s refnum=%q", failurePrefix, form.CRN, refNum)
                return failureURL
        }

        // 7. Atomic receipt binding — allows pending or failed orders whose
        // receipt slot is empty or already holds this same receipt (replay).
        if err := uc.payments.BindReceipt(ctx, order.ID, refNum); err != nil {
                if errors.Is(err, domain.ErrConflict) {
                        latest, fetchErr := uc.payments.ByID(ctx, order.ID)
                        if fetchErr == nil && latest.Status == domain.PaymentPaid && latest.RefNum == refNum {
                                if isBooking {
                                        return uc.bookingResultURL("success", refNum)
                                }
                                return uc.walletResultURL("success", refNum)
                        }
                        log.Printf("%s: receipt bound elsewhere resnum=%s refnum=%s", failurePrefix, form.CRN, refNum)
                        return failureURL
                }
                log.Printf("%s: bind receipt error resnum=%s: %v", failurePrefix, form.CRN, err)
                return failureURL
        }

        // 8. Bank verification, fail-closed (Monafaseh-proven VerifyTransaction —
        // only the terminal number is required). On rejection or transport error
        // the receipt stays bound and the order keeps its pending/failed status
        // for a safe verification retry — the payment is never lost.
        verified, raw, verifyErr := uc.saman.VerifyTransaction(ctx, refNum, order.Amount*10)
        if verifyErr != nil || !verified {
                log.Printf("%s: verify pending resnum=%s refnum=%s raw=%s err=%v", failurePrefix, form.CRN, refNum, raw, verifyErr)
                if isBooking {
                        return uc.bookingResultURL("verify", refNum)
                }
                return uc.walletResultURL("verify", refNum)
        }

        // 9. Settlement — atomic claim, credit and ledger (topup) or booking
        // activation (booking). Duplicate callbacks settle at most once.
        if isBooking {
                settled, err := uc.financial.SettleBookingPaymentOrder(ctx, order.ID, refNum, form.TraceNo, form.SecurePan)
                if err != nil {
                        switch {
                        case errors.Is(err, domain.ErrConflict):
                                log.Printf("%s: booking replay/conflict resnum=%s refnum=%s", failurePrefix, form.CRN, refNum)
                        default:
                                log.Printf("%s: booking settle error resnum=%s: %v", failurePrefix, form.CRN, err)
                        }
                        return failureURL
                }
                log.Printf("[payment] settled booking order=%d session=%d user=%d amount=%d toman refnum=%s trace=%s",
                        settled.ID, settled.RefID, settled.UserID, settled.Amount, settled.RefNum, settled.TraceNo)
                uc.notifyBookingSettled(ctx, settled)
                return uc.bookingResultURL("success", settled.RefNum)
        }

        settled, err := uc.financial.SettlePaymentOrder(ctx, order.ID, refNum, form.TraceNo, form.SecurePan)
        if err != nil {
                switch {
                case errors.Is(err, domain.ErrConflict):
                        log.Printf("%s: replay/conflict resnum=%s refnum=%s", failurePrefix, form.CRN, refNum)
                default:
                        log.Printf("%s: settle error resnum=%s: %v", failurePrefix, form.CRN, err)
                }
                return failureURL
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

func isDigits(s string) bool {
        if s == "" {
                return false
        }
        for _, r := range s {
                if r < '0' || r > '9' {
                        return false
                }
        }
        return true
}

func mustInt64(s string) int64 {
        n, _ := strconv.ParseInt(strings.TrimSpace(s), 10, 64)
        return n
}
