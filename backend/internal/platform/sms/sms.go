// Package sms sends OTP codes through a configured SMS provider.
package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"mime/multipart"
	"net/http"
	"net/url"
	"strings"
	"time"

	"vodda/backend/internal/config"
)

// Sender delivers a verification code to a mobile number.
type Sender interface {
	SendOTP(ctx context.Context, mobile, code string) error
}

// retry wraps a Sender and retries transient transport failures. Container
// egress on some hosts is flaky (~30-40% TLS failures); two fast retries turn
// a partial outage into a rare error without slowing the happy path.
type retry struct {
	inner    Sender
	attempts int
	delay    time.Duration
}

func (r *retry) SendOTP(ctx context.Context, mobile, code string) error {
	var err error
	for i := 0; i < r.attempts; i++ {
		if i > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(r.delay):
			}
		}
		if err = r.inner.SendOTP(ctx, mobile, code); err == nil {
			return nil
		}
	}
	return err
}

// SmsIR is the production sms.ir implementation.
type SmsIR struct {
	cfg    config.SMSConfig
	client *http.Client
}

// Faraz sends pattern messages through the legacy IPPanel endpoint used by
// Vodda's Laravel implementation.
type Faraz struct {
	cfg    config.SMSConfig
	client *http.Client
}

// New returns a configured provider sender. When its credentials are missing,
// it returns a logging stub for local development; production validation rejects
// missing provider credentials before this function is called.
func New(cfg config.SMSConfig) Sender {
	client := &http.Client{Timeout: cfg.RequestTimeout}
	switch strings.ToLower(strings.TrimSpace(cfg.Provider)) {
	case "faraz", "ippanel":
		if cfg.FarazUsername == "" || cfg.FarazPassword == "" {
			return &logStub{}
		}
		client.CheckRedirect = func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		}
		return &retry{inner: &Faraz{cfg: cfg, client: client}, attempts: 3, delay: 700 * time.Millisecond}
	case "sms.ir", "smsir":
		if cfg.APIKey == "" {
			return &logStub{}
		}
		return &retry{inner: &SmsIR{cfg: cfg, client: client}, attempts: 3, delay: 700 * time.Millisecond}
	default:
		return &logStub{}
	}
}

type verifyRequest struct {
	Mobile     string          `json:"mobile"`
	TemplateID int             `json:"templateId"`
	Parameters []verifyParamKV `json:"parameters"`
}

type verifyParamKV struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// SendOTP posts the code to sms.ir.
func (s *SmsIR) SendOTP(ctx context.Context, mobile, code string) error {
	body, _ := json.Marshal(verifyRequest{
		Mobile:     mobile,
		TemplateID: s.cfg.BodyID,
		Parameters: []verifyParamKV{{Name: "VERIFICATIONCODE", Value: code}},
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.cfg.APIURL, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-api-key", s.cfg.APIKey)

	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("sms.ir request: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return fmt.Errorf("sms.ir status %d", resp.StatusCode)
	}
	return nil
}

// SendOTP sends the OTP with the template parameters and pattern ID from the
// previous Laravel application. The endpoint takes credentials and pattern
// data as query parameters, so transport errors are deliberately sanitized.
func (s *Faraz) SendOTP(ctx context.Context, mobile, code string) error {
	inputData, err := json.Marshal(map[string]string{"code": code})
	if err != nil {
		return errors.New("faraz SMS request could not be encoded")
	}
	recipients, err := json.Marshal([]string{mobile})
	if err != nil {
		return errors.New("faraz SMS recipient could not be encoded")
	}

	endpoint, err := url.Parse(s.cfg.FarazAPIURL)
	if err != nil || endpoint.Scheme != "https" || endpoint.Host == "" {
		return errors.New("faraz SMS endpoint is invalid")
	}
	query := endpoint.Query()
	query.Set("username", s.cfg.FarazUsername)
	query.Set("password", s.cfg.FarazPassword)
	query.Set("from", s.cfg.FarazFrom)
	query.Set("to", string(recipients))
	query.Set("input_data", string(inputData))
	query.Set("pattern_code", s.cfg.FarazPatternID)
	endpoint.RawQuery = query.Encode()

	var body bytes.Buffer
	form := multipart.NewWriter(&body)
	if err := form.WriteField("code", code); err != nil {
		return errors.New("faraz SMS request could not be encoded")
	}
	if err := form.Close(); err != nil {
		return errors.New("faraz SMS request could not be encoded")
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.String(), &body)
	if err != nil {
		return errors.New("faraz SMS request could not be created")
	}
	req.Header.Set("Content-Type", form.FormDataContentType())
	req.Header.Set("Accept", "application/json, text/plain, */*")

	resp, err := s.client.Do(req)
	if err != nil {
		// The URL contains credentials and the OTP in this legacy API.
		return errors.New("faraz SMS request failed")
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("faraz SMS status %d", resp.StatusCode)
	}
	return nil
}

type logStub struct{}

func (l *logStub) SendOTP(_ context.Context, mobile, code string) error {
	log.Printf("📲 [sms-stub] OTP for %s = %s", mobile, code)
	return nil
}
