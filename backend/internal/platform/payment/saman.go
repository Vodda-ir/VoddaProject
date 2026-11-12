// Package payment implements thin HTTP clients for Iranian payment gateways.
// Saman Sep (سامان‌سپ) uses the modern Sep-24 (OnlinePG) REST flow:
//
//  1. POST {base}/onlinepg/onlinepg  {"action":"token",...}  → {"status":1,"token":...}
//  2. Serve the payer a self-submitting HTML form that POSTs {token} to
//     {base}/OnlinePG/OnlinePG. The legacy payment.aspx entry is dead for
//     newer terminals: it answers 302 → ErrorPage «بروز خطای ناشناخته». The
//     OnlinePG UI also rejects requests whose Referer is missing or differs
//     from the merchant's registered site («آدرس ارجاع دهنده دریافت نشد»),
//     so the hand-off page must be served from vodda.ir itself.
//  3. The gateway posts the result back to RedirectURL (State=OK|NOK form fields)
//  4. POST {base}/verifyTxnRandomSessionkey/ipg/VerifyTransaction with the
//     terminal number only (Monafaseh-proven, credential-free) → JSON verdict
//     {Success, ResultCode, TransactionDetail}. Panel credentials (verify.aspx)
//     remain available as a fallback for deployments that have them.
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

// SamanConfig holds gateway credentials. Username/Password are the optional
// Saman Sep panel credentials for the legacy verify.aspx handshake; they may
// be empty — primary verification runs through VerifyTransaction (terminal
// number only, Monafaseh-proven) and settles fail-closed.
type SamanConfig struct {
        TerminalID string
        MerchantID string
        Username   string
        Password   string
        BaseURL    string
        Timeout    time.Duration
}

// Saman talks to sep.shaparak.ir.
type Saman struct {
        cfg    SamanConfig
        client *http.Client
}

// NewSaman builds a client with production-safe defaults.
func NewSaman(cfg SamanConfig) *Saman {
        if cfg.BaseURL == "" {
                cfg.BaseURL = "https://sep.shaparak.ir"
        }
        if cfg.Timeout <= 0 {
                cfg.Timeout = 30 * time.Second
        }
        return &Saman{
                cfg:    cfg,
                client: &http.Client{Timeout: cfg.Timeout},
        }
}

// Enabled reports whether the gateway is configured enough to mint tokens.
func (s *Saman) Enabled() bool {
        return s != nil && s.cfg.TerminalID != "" && s.cfg.MerchantID != ""
}

// VerifyConfigured reports whether panel credentials allow remote verify.
func (s *Saman) VerifyConfigured() bool {
        return s.Enabled() && s.cfg.Username != "" && s.cfg.Password != ""
}

// MerchantID exposes the configured merchant identifier for callback guards.
func (s *Saman) MerchantID() string {
        if s == nil {
                return ""
        }
        return s.cfg.MerchantID
}

// tokenRequest is the JSON body for the token action.
type tokenRequest struct {
        Action      string `json:"action"`
        TerminalID  string `json:"TerminalId"`
        MerchantID  string `json:"MerchantId"`
        Amount      int64  `json:"Amount"`
        ResNum      string `json:"ResNum"`
        RedirectURL string `json:"RedirectURL"`
        CellNumber  string `json:"CellNumber,omitempty"`
}

// tokenResponse mirrors the gateway reply.
type tokenResponse struct {
        Status int    `json:"status"`
        Token  string `json:"token"`
        Error  string `json:"error"`
}

// RequestToken mints a payment token for one order. amountRial is the order
// total in Rial (Toman * 10).
func (s *Saman) RequestToken(ctx context.Context, amountRial int64, resNum, redirectURL, cellNumber string) (string, error) {
        if !s.Enabled() {
                return "", fmt.Errorf("saman gateway not configured")
        }
        body, err := json.Marshal(tokenRequest{
                Action:      "token",
                TerminalID:  s.cfg.TerminalID,
                MerchantID:  s.cfg.MerchantID,
                Amount:      amountRial,
                ResNum:      resNum,
                RedirectURL: redirectURL,
                CellNumber:  cellNumber,
        })
        if err != nil {
                return "", err
        }
        req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.BaseURL+"/onlinepg/onlinepg", bytes.NewReader(body))
        if err != nil {
                return "", err
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("Accept", "application/json")

        resp, err := s.client.Do(req)
        if err != nil {
                return "", fmt.Errorf("saman token request failed: %w", err)
        }
        defer resp.Body.Close()
        payload, err := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
        if err != nil {
                return "", fmt.Errorf("saman token response read failed: %w", err)
        }
        var parsed tokenResponse
        if err := json.Unmarshal(payload, &parsed); err != nil {
                return "", fmt.Errorf("saman token response malformed (http %d): %s", resp.StatusCode, truncate(payload, 160))
        }
        if resp.StatusCode != http.StatusOK || parsed.Status != 1 || parsed.Token == "" {
                reason := parsed.Error
                if reason == "" {
                        reason = truncate(payload, 160)
                }
                return "", fmt.Errorf("saman token rejected (status=%d http=%d): %s", parsed.Status, resp.StatusCode, reason)
        }
        return parsed.Token, nil
}

// PayFormURL is the OnlinePG entry point that accepts the token as a POST
// form field. (payment.aspx — the old GET entry — is decommissioned and
// bounces every token to the generic error page.)
func (s *Saman) PayFormURL() string {
        return s.cfg.BaseURL + "/OnlinePG/OnlinePG"
}

// StartFormHTML renders the self-submitting payment hand-off page. The payer's
// browser loads it from vodda.ir and immediately POSTs the token to the Sep
// OnlinePG UI, carrying the vodda.ir Referer the gateway requires.
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
    <input type="hidden" name="token" value="` + token + `">
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

// CallbackForm carries the fields the gateway posts back to RedirectURL.
// Values arrive as strings; amount is Rial.
type CallbackForm struct {
        State       string // OK / NOK
        Status      string
        Amount      string
        MID         string
        TerminalNum string
        TraceNo     string
        RN          string
        RefNum      string
        RRN         string
        SecurePan   string
        CRN         string // our ResNum
        STPN        string
        Raw         url.Values
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
                State:       get("State", "state"),
                Status:      get("Status", "status"),
                Amount:      get("Amount", "amount"),
                MID:         get("MID", "mid"),
                TerminalNum: get("TerminalNum", "terminalNum"),
                TraceNo:     get("TraceNo", "traceNo"),
                RN:          get("RN", "rn"),
                RefNum:      get("RefNum", "refNum"),
                RRN:         get("RRN", "rrn"),
                SecurePan:   get("SecurePan", "securePan"),
                CRN:         get("CRN", "crn", "ResNum", "resNum"),
                STPN:        get("STPN", "stpn"),
                Raw:         values,
        }
}

// Verify asks the gateway to confirm a settled transaction. Returns
// (verified, rawBody, err). Verification uses panel credentials.
func (s *Saman) Verify(ctx context.Context, form CallbackForm) (bool, string, error) {
        if !s.VerifyConfigured() {
                return false, "", fmt.Errorf("saman verify credentials not configured")
        }
        payload := url.Values{
                "merchantId":   {s.cfg.MerchantID},
                "terminalId":   {s.cfg.TerminalID},
                "userName":     {s.cfg.Username},
                "userPassword": {s.cfg.Password},
                "State":        {form.State},
                "Status":       {form.Status},
                "amount":       {form.Amount},
                "traceNo":      {form.TraceNo},
                "rrn":          {form.RRN},
                "refNum":       {form.RefNum},
                "crn":          {form.CRN},
                "stpn":         {form.STPN},
        }
        req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.BaseURL+"/verify.aspx", strings.NewReader(payload.Encode()))
        if err != nil {
                return false, "", err
        }
        req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
        req.Header.Set("Accept", "application/json, text/plain")

        resp, err := s.client.Do(req)
        if err != nil {
                return false, "", fmt.Errorf("saman verify request failed: %w", err)
        }
        defer resp.Body.Close()
        body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<16))
        if err != nil {
                return false, "", err
        }
        raw := strings.TrimSpace(string(body))
        // The gateway historically answers "Success"/"Failed" (plain text) or a
        // JSON body {"status":1,...}. Accept both shapes defensively.
        verified := strings.Contains(strings.ToLower(raw), "success") ||
                strings.Contains(raw, `"status":1`) ||
                strings.Contains(strings.ToLower(raw), `"status": 1`)
        return verified, truncate(body, 300), nil
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

// VerifyTransactionURL is the credential-free verify endpoint — the same REST
// call the Monafaseh service proved in production. Only the terminal number
// is required; no panel username/password.
func (s *Saman) VerifyTransactionURL() string {
        return s.cfg.BaseURL + "/verifyTxnRandomSessionkey/ipg/VerifyTransaction"
}

// VerifyTransaction asks Sep to confirm a settled transaction using only the
// terminal number. Mirrors the strict, fail-closed checks of the Monafaseh
// service: ResultCode 0 (verified) or 2 (already verified) are accepted, and
// only with a fully matching bank detail block — amount (Rial), terminal and
// bank receipt must all match. Returns (verified, rawBody, err); err signals
// a transport/config failure, distinct from a bank rejection (verified=false).
func (s *Saman) VerifyTransaction(ctx context.Context, refNum string, expectedAmountRial int64) (bool, string, error) {
        if s == nil || s.cfg.TerminalID == "" {
                return false, "", fmt.Errorf("saman verify: terminal not configured")
        }
        if refNum == "" || len(refNum) > 100 || strings.HasPrefix(refNum, "DEMO-") ||
                expectedAmountRial <= 0 {
                return false, "", fmt.Errorf("saman verify: invalid input")
        }
        terminal, parseErr := strconv.ParseInt(strings.TrimSpace(s.cfg.TerminalID), 10, 64)
        if parseErr != nil {
                return false, "", fmt.Errorf("saman verify: terminal id not numeric")
        }
        body, err := json.Marshal(sepVerifyRequest{RefNum: refNum, TerminalNumber: terminal})
        if err != nil {
                return false, "", err
        }
        // Retry a dropped connection once, same receipt. A bank rejection is
        // returned immediately and never retried as a success.
        var raw []byte
        status := 0
        for attempt := 0; ; attempt++ {
                req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.VerifyTransactionURL(), bytes.NewReader(body))
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
                receipt != refNum || terminalEcho != strings.TrimSpace(s.cfg.TerminalID) {
                return false, truncate(raw, 300), nil
        }
        return true, truncate(raw, 300), nil
}

func truncate(b []byte, max int) string {
        if len(b) <= max {
                return string(b)
        }
        return string(b[:max]) + "…"
}
