// Package payment implements thin HTTP clients for Iranian payment gateways.
// Saman Sep (سامان‌سپ) uses the modern Sep-24 REST flow:
//
//  1. POST {base}/onlinepg/onlinepg  {"action":"token",...}  → {"status":1,"token":...}
//  2. Redirect the payer to {base}/payment.aspx?token=<token>
//  3. The gateway posts the result back to RedirectURL (State=OK|NOK form fields)
//  4. POST {base}/verify.aspx with panel credentials → "Success" / "Failed"
package payment

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// SamanConfig holds gateway credentials. Username/Password are the Saman Sep
// panel credentials used by the verify call; they may be empty, in which case
// remote verification is skipped (callback-only validation).
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

// PayURL is the page where the payer completes the transaction.
func (s *Saman) PayURL(token string) string {
	return s.cfg.BaseURL + "/payment.aspx?token=" + url.QueryEscape(token)
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

func truncate(b []byte, max int) string {
	if len(b) <= max {
		return string(b)
	}
	return string(b[:max]) + "…"
}
