// Package sms sends OTP codes via the sms.ir verify API.
package sms

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"vodda/backend/internal/config"
)

// Sender delivers a verification code to a mobile number.
type Sender interface {
	SendOTP(ctx context.Context, mobile, code string) error
}

// SmsIR is the production sms.ir implementation.
type SmsIR struct {
	cfg    config.SMSConfig
	client *http.Client
}

// New returns a Sender. When no API key is configured it returns a logging
// stub, which is convenient for local development.
func New(cfg config.SMSConfig) Sender {
	if cfg.APIKey == "" {
		return &logStub{}
	}
	return &SmsIR{cfg: cfg, client: &http.Client{Timeout: cfg.RequestTimeout}}
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
		Parameters: []verifyParamKV{{Name: "CODE", Value: code}},
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

type logStub struct{}

func (l *logStub) SendOTP(_ context.Context, mobile, code string) error {
	log.Printf("📲 [sms-stub] OTP for %s = %s", mobile, code)
	return nil
}
