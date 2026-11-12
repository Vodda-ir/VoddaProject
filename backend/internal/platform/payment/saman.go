// Package payment — Saman Sep (سامان‌سپ) gateway, rebuilt as a faithful port
// of the Monafaseh service's proven implementation (src/lib/payment/saman.ts).
// All bank amounts are Rial.
//
// The flow, step by step:
//
//  1. GatewayConfig validates the terminal (positive integer) and the public
//     site origin (bare HTTPS URL, no path/query/userinfo/localhost).
//  2. RequestPaymentToken POSTs {"action":"token","TerminalId":<number>,
//     "Amount":<rial>,"ResNum":"...","RedirectUrl":"<callback>"} to
//     {base}/onlinepg/onlinepg — exactly the Monafaseh payload: no MerchantId,
//     no CellNumber. A dropped connection is retried once with the same order;
//     a bank rejection is returned immediately.
//  3. The payer's browser loads a self-submitting hand-off page served from
//     the vodda.ir origin and POSTs the token (field «Token») to
//     {base}/OnlinePG/OnlinePG. (A direct GET redirect with ?token= does not
//     work, and the gateway enforces the merchant's registered Referer.)
//  4. The gateway posts the result back to RedirectUrl: State=OK|NOK plus a
//     Token echo, ResNum, RefNum, Amount, TerminalId/MID fields.
//  5. VerifyTransaction POSTs {"RefNum","TerminalNumber":<number>} to
//     {base}/verifyTxnRandomSessionkey/ipg/VerifyTransaction and accepts only
//     ResultCode 0 (verified) or 2 (already verified) with a fully matching
//     bank detail block — amount, terminal and receipt. Fail-closed.
package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

// TokenURL is the Sep OnlinePG token endpoint.
const TokenURL = "/onlinepg/onlinepg"

// PayFormURLPath is the OnlinePG entry point that accepts the token as a POST
// form field. (payment.aspx — the old GET entry — is decommissioned and
// bounces every token to the generic error page.)
const PayFormURLPath = "/OnlinePG/OnlinePG"

// VerifyURL is the credential-free verify endpoint — the same REST call the
// Monafaseh service proved in production. Only the terminal number is
// required; no panel username/password.
const VerifyURL = "/verifyTxnRandomSessionkey/ipg/VerifyTransaction"

// Saman talks to sep.shaparak.ir. siteURL is the merchant's registered public
// origin; every hand-off and callback URL derives from it.
type Saman struct {
	terminal string
	siteURL  string
	baseURL  string
	client   *http.Client
}

// NewSaman builds a gateway client with production-safe defaults.
func NewSaman(terminalID, siteURL, baseURL string) *Saman {
	if baseURL == "" {
		baseURL = "https://sep.shaparak.ir"
	}
	return &Saman{
		terminal: strings.TrimSpace(terminalID),
		siteURL:  strings.TrimSpace(siteURL),
		baseURL:  strings.TrimRight(baseURL, "/"),
		client:   &http.Client{Timeout: 30 * time.Second},
	}
}

// GatewayConfig mirrors Monafaseh's gatewayConfig(): the terminal must be a
// positive integer and the site origin must be a bare public HTTPS URL. The
// callback URL is the site origin plus the fixed BFF callback path.
type GatewayConfig struct {
	TerminalID  int64
	CallbackURL string
}

// gatewayCallbackPath is the public BFF route the gateway posts results to.
const gatewayCallbackPath = "/api/payments/saman/callback"

// GatewayConfig validates the runtime configuration, fail-closed. The caller
// answers order-creation requests with a 503-style Persian message when it
// fails (exactly the Monafaseh create-route semantics).
func (s *Saman) GatewayConfig() (GatewayConfig, error) {
	terminal := s.terminal
	if !isDigits(terminal) {
		return GatewayConfig{}, fmt.Errorf("درگاه پرداخت هنوز پیکربندی نشده است")
	}
	n, err := strconv.ParseInt(terminal, 10, 64)
	if err != nil || n <= 0 || n > int64(^uint32(0)>>1<<1) { // safe-integer-ish guard
		return GatewayConfig{}, fmt.Errorf("درگاه پرداخت هنوز پیکربندی نشده است")
	}
	site, err := url.Parse(s.siteURL)
	if err != nil || site.Scheme != "https" || site.Host == "" ||
		site.User != nil || site.Hostname() == "localhost" || site.Hostname() == "127.0.0.1" ||
		(site.Path != "" && site.Path != "/") || site.RawQuery != "" || site.Fragment != "" {
		return GatewayConfig{}, fmt.Errorf("آدرس عمومی HTTPS سایت برای پرداخت تنظیم نشده است")
	}
	return GatewayConfig{
		TerminalID:  n,
		CallbackURL: site.Scheme + "://" + site.Host + gatewayCallbackPath,
	}, nil
}

// Enabled reports whether a payment can be attempted at all. Full validation
// (including the public HTTPS origin) happens at token time.
func (s *Saman) Enabled() bool {
	return s != nil && isDigits(s.terminal)
}

// Terminal exposes the configured terminal number for callback echo guards.
func (s *Saman) Terminal() string {
	if s == nil {
		return ""
	}
	return s.terminal
}

// tokenRequest is the JSON body for the token action — exactly the Monafaseh
// payload (no MerchantId, no CellNumber).
type tokenRequest struct {
	Action      string `json:"action"`
	TerminalID  int64  `json:"TerminalId"`
	Amount      int64  `json:"Amount"`
	ResNum      string `json:"ResNum"`
	RedirectURL string `json:"RedirectUrl"`
}

// tokenResponse mirrors the gateway reply.
type tokenResponse struct {
	Status int    `json:"status"`
	Token  string `json:"token"`
	Error  string `json:"error"`
}

// RequestPaymentToken mints a one-time payment token for one order.
// redirectURL must equal the configured callback URL; the token request is
// retried once on a dropped connection (same order, same reference). An
// actual bank rejection is returned immediately and never retried as success.
func (s *Saman) RequestPaymentToken(ctx context.Context, resNum string, amountRial int64, redirectURL string) (string, error) {
	cfg, err := s.GatewayConfig()
	if err != nil {
		return "", err
	}
	if resNum == "" || len(resNum) > 100 || amountRial <= 0 || redirectURL != cfg.CallbackURL {
		return "", fmt.Errorf("اطلاعات درخواست پرداخت نامعتبر است")
	}
	body, err := json.Marshal(tokenRequest{
		Action:      "token",
		TerminalID:  cfg.TerminalID,
		Amount:      amountRial,
		ResNum:      resNum,
		RedirectURL: redirectURL,
	})
	if err != nil {
		return "", err
	}
	var status int
	var payload []byte
	for attempt := 0; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+TokenURL, bytes.NewReader(body))
		if err != nil {
			return "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		resp, err := s.client.Do(req)
		if err != nil {
			if attempt == 0 {
				time.Sleep(300 * time.Millisecond)
				continue
			}
			return "", fmt.Errorf("ارتباط با درگاه پرداخت برقرار نشد")
		}
		status = resp.StatusCode
		payload, err = io.ReadAll(io.LimitReader(resp.Body, 1<<16))
		resp.Body.Close()
		if err != nil {
			if attempt == 0 {
				time.Sleep(300 * time.Millisecond)
				continue
			}
			return "", fmt.Errorf("ارتباط با درگاه پرداخت برقرار نشد")
		}
		break
	}
	var parsed tokenResponse
	if err := json.Unmarshal(payload, &parsed); err != nil {
		return "", fmt.Errorf("درگاه درخواست پرداخت را نپذیرفت؛ لطفاً بعداً تلاش کنید")
	}
	if status == http.StatusOK && parsed.Status == 1 && parsed.Token != "" {
		return parsed.Token, nil
	}
	return "", fmt.Errorf("درگاه درخواست پرداخت را نپذیرفت؛ لطفاً بعداً تلاش کنید")
}

// PayFormURL is the absolute OnlinePG entry point for the hand-off form.
func (s *Saman) PayFormURL() string {
	return s.baseURL + PayFormURLPath
}

// StartFormHTML renders the self-submitting payment hand-off page. The
// payer's browser loads it from the vodda.ir origin and immediately POSTs the
// token (field «Token», per Sep documentation) to the Sep OnlinePG UI,
// carrying the registered Referer the gateway enforces.
func (s *Saman) StartFormHTML(token string) []byte {
	page := `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>انتقال به درگاه پرداخت سامان‌سپ — وُدّا</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf7f0;font-family:Vazirmatn,Tahoma,sans-serif;color:#3d4a33}
  .card{max-width:420px;margin:20px;padding:32px 28px;background:#fff;border-radius:20px;box-shadow:0 10px 30px rgba(61,74,51,.12);text-align:center}
  .ring{width:72px;height:72px;margin:0 auto 18px;border-radius:50%;background:#eef2e6;display:grid;place-items:center}
  .ring span{width:34px;height:34px;border-radius:50%;border:4px solid #5e7e8c;border-top-color:transparent;animation:s .8s linear infinite;display:block}
  @keyframes s{to{transform:rotate(360deg)}}
  h1{font-size:18px;margin:0 0 10px}
  p{font-size:13px;line-height:2;color:#8a9480;margin:0}
  button{margin-top:18px;padding:11px 22px;border:0;border-radius:999px;background:#5e7e8c;color:#fff;font-size:14px;font-family:inherit;cursor:pointer}
</style>
</head>
<body>
<main class="card">
  <div class="ring" aria-hidden="true"><span></span></div>
  <h1>در حال انتقال به درگاه پرداخت سامان‌سپ…</h1>
  <p>لطفاً چند لحظه صبر کنید. اگر انتقال خودکار انجام نشد، دکمهٔ زیر را بزنید.</p>
  <form method="post" action="` + s.PayFormURL() + `" id="payform">
    <input type="hidden" name="Token" value="` + token + `">
    <noscript><button type="submit">رفتن به درگاه پرداخت</button></noscript>
  </form>
</main>
<script>
  document.getElementById('payform').submit();
</script>
</body>
</html>`
	return []byte(page)
}

// FailureStartHTML is the plain error page served instead of the hand-off when
// the token shape is invalid or the gateway is disabled.
func FailureStartHTML() []byte {
	page := `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>نشست پرداخت معتبر نیست — وُدّا</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf7f0;font-family:Vazirmatn,Tahoma,sans-serif;color:#3d4a33}
  .card{max-width:420px;margin:20px;padding:32px 28px;background:#fff;border-radius:20px;box-shadow:0 10px 30px rgba(61,74,51,.12);text-align:center}
  h1{font-size:17px;margin:0 0 10px}
  p{font-size:13px;line-height:2;color:#8a9480;margin:0}
</style>
</head>
<body>
<main class="card">
  <h1>نشست پرداخت معتبر نیست</h1>
  <p>لینک پرداخت منقضی شده یا ناقص است. لطفاً از پنل خود، دکمهٔ پرداخت جلسه یا شارژ کیف پول را دوباره بزنید.</p>
</main>
</body>
</html>`
	return []byte(page)
}

// CallbackForm carries the fields the gateway posts back to RedirectUrl —
// exactly the Monafaseh readCallback set (ResNum, RefNum, State, Token,
// TerminalId/MID, Amount), plus Status/TraceNo/SecurePan that Sep may echo
// and Vodda records at settlement. Values arrive as strings; amount is Rial.
type CallbackForm struct {
	State        string // OK / NOK
	Status       string
	Amount       string
	TerminalEcho string // TerminalId or MID echo
	TraceNo      string
	RefNum       string
	SecurePan    string
	CRN          string // our ResNum
	Token        string // bank token echo — must match the stored order token
	Raw          url.Values
}

// ParseCallback extracts gateway fields from a POST form or GET query.
func ParseCallback(r *http.Request) CallbackForm {
	values := url.Values{}
	if strings.EqualFold(r.Method, http.MethodPost) {
		if r.PostForm == nil {
			_ = r.ParseForm()
		}
		values = r.PostForm
		if len(values) == 0 {
			values = r.Form
		}
	} else {
		values = r.URL.Query()
	}
	get := func(keys ...string) string {
		for _, key := range keys {
			if v := values.Get(key); v != "" {
				return strings.TrimSpace(v)
			}
		}
		return ""
	}
	return CallbackForm{
		State:        get("State", "state"),
		Status:       get("Status", "status"),
		Amount:       get("Amount", "amount"),
		TerminalEcho: get("TerminalId", "terminalId", "MID", "mid"),
		TraceNo:      get("TraceNo", "traceNo"),
		RefNum:       get("RefNum", "refNum"),
		SecurePan:    get("SecurePan", "securePan"),
		CRN:          get("ResNum", "resNum", "CRN", "crn"),
		Token:        get("Token", "token"),
		Raw:          values,
	}
}

// flexibleString unmarshals a JSON string OR number into a trimmed string.
// Sep replies switch field types between endpoints and deployments.
type flexibleString struct{ v string }

func (f *flexibleString) UnmarshalJSON(b []byte) error {
	b = bytes.TrimSpace(b)
	if len(b) == 0 || bytes.Equal(b, []byte("null")) {
		f.v = ""
		return nil
	}
	if b[0] == '"' {
		var s string
		if err := json.Unmarshal(b, &s); err != nil {
			return err
		}
		f.v = strings.TrimSpace(s)
		return nil
	}
	f.v = strings.TrimSpace(string(b))
	return nil
}

// sepVerifyRequest is the credential-free verify payload (Monafaseh-proven).
type sepVerifyRequest struct {
	RefNum         string `json:"RefNum"`
	TerminalNumber int64  `json:"TerminalNumber"`
}

// sepVerifyResponse mirrors the VerifyTransaction JSON reply.
type sepVerifyResponse struct {
	Success           bool   `json:"Success"`
	ResultCode        int    `json:"ResultCode"`
	ResultDescription string `json:"ResultDescription"`
	TransactionDetail struct {
		OrginalAmount  flexibleString `json:"OrginalAmount"`
		RefNum         flexibleString `json:"RefNum"`
		TerminalNumber flexibleString `json:"TerminalNumber"`
		StraceNo       flexibleString `json:"StraceNo"`
	} `json:"TransactionDetail"`
}

// VerifyTransaction asks Sep to confirm a settled transaction using only the
// terminal number. Mirrors the strict, fail-closed checks of the Monafaseh
// service: ResultCode 0 (verified) or 2 (already verified) are accepted, and
// only with a fully matching bank detail block — amount (Rial), terminal and
// bank receipt must all match. Returns (verified, rawBody, err); err signals
// a transport/config failure, distinct from a bank rejection (verified=false).
func (s *Saman) VerifyTransaction(ctx context.Context, refNum string, expectedAmountRial int64) (bool, string, error) {
	cfg, err := s.GatewayConfig()
	if err != nil {
		return false, "", fmt.Errorf("saman verify: gateway not configured")
	}
	if refNum == "" || len(refNum) > 100 || strings.HasPrefix(refNum, "DEMO-") ||
		expectedAmountRial <= 0 {
		return false, "", fmt.Errorf("saman verify: invalid input")
	}
	body, err := json.Marshal(sepVerifyRequest{RefNum: refNum, TerminalNumber: cfg.TerminalID})
	if err != nil {
		return false, "", err
	}
	// Retry a dropped connection once, same receipt. A bank rejection is
	// returned immediately and never retried as a success.
	var raw []byte
	status := 0
	for attempt := 0; ; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.baseURL+VerifyURL, bytes.NewReader(body))
		if err != nil {
			return false, "", err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Accept", "application/json")
		resp, err := s.client.Do(req)
		if err != nil {
			if attempt == 0 {
				time.Sleep(300 * time.Millisecond)
				continue
			}
			return false, "", fmt.Errorf("saman verify request failed: %w", err)
		}
		status = resp.StatusCode
		raw, err = io.ReadAll(io.LimitReader(resp.Body, 1<<16))
		resp.Body.Close()
		if err != nil {
			if attempt == 0 {
				time.Sleep(300 * time.Millisecond)
				continue
			}
			return false, "", fmt.Errorf("saman verify response read failed: %w", err)
		}
		break
	}
	var parsed sepVerifyResponse
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return false, truncate(raw, 300), fmt.Errorf("saman verify response malformed (http %d)", status)
	}
	// Duplicate verification (ResultCode 2) is usable only with complete
	// matching bank details. Ambiguous or missing responses never pass.
	confirmed := (parsed.Success && parsed.ResultCode == 0) || parsed.ResultCode == 2
	amountRial, amountErr := strconv.ParseInt(parsed.TransactionDetail.OrginalAmount.v, 10, 64)
	terminalEcho := strings.TrimSpace(parsed.TransactionDetail.TerminalNumber.v)
	receipt := strings.TrimSpace(parsed.TransactionDetail.RefNum.v)
	if status != http.StatusOK || !confirmed || amountErr != nil || amountRial != expectedAmountRial ||
		receipt != refNum || terminalEcho != s.terminal {
		return false, truncate(raw, 300), nil
	}
	return true, truncate(raw, 300), nil
}

// isDigits reports whether the whole string is ASCII digits (non-empty).
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

// ValidHandoffToken reports whether the token shape can be handed to the
// bank's payment UI (used by the start-page guard).
func ValidHandoffToken(token string) bool {
	return hexSepToken(strings.TrimSpace(token))
}

func truncate(b []byte, max int) string {
	if len(b) <= max {
		return string(b)
	}
	return string(b[:max]) + "…"
}
