// Package usecase holds the application's business logic, orchestrating
// domain repositories and platform services.
package usecase

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"math/big"
	"strings"
	"time"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
	"vodda/backend/internal/platform/sms"
	"vodda/backend/internal/platform/token"
)

// AuthUsecase implements OTP-based authentication.
type AuthUsecase struct {
	users  domain.UserRepository
	otps   domain.OTPRepository
	sender sms.Sender
	tokens *token.Manager
	cfg    *config.Config
}

func NewAuthUsecase(u domain.UserRepository, o domain.OTPRepository, s sms.Sender, t *token.Manager, cfg *config.Config) *AuthUsecase {
	return &AuthUsecase{users: u, otps: o, sender: s, tokens: t, cfg: cfg}
}

type AuthResult struct {
	Token       string       `json:"token"`
	User        *domain.User `json:"user"`
	NeedProfile bool         `json:"need_profile"`
}

func (uc *AuthUsecase) RequestOTP(ctx context.Context, mobile string) error {
	mobile = normalizeMobile(mobile)
	if !validMobile(mobile) {
		return domain.ErrValidation
	}

	if last, err := uc.otps.Latest(ctx, mobile); err == nil && last != nil {
		if time.Since(last.CreatedAt) < uc.cfg.OTPResendCooldown {
			return nil
		}
	}

	code, err := uc.generateCode(mobile)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	otp := &domain.OTPCode{
		Mobile:    mobile,
		Code:      uc.otpDigest(mobile, code),
		ExpiresAt: now.Add(uc.cfg.OTPExpiration),
		CreatedAt: now,
	}
	if err := uc.otps.Create(ctx, otp); err != nil {
		return err
	}

	if uc.cfg.OTPTestBypassEnabled {
		log.Printf("[dev] OTP generated for %s", maskMobile(mobile))
		return nil
	}

	if err := uc.sender.SendOTP(ctx, mobile, code); err != nil {
		_ = uc.otps.Consume(ctx, otp.ID)
		log.Printf("sms provider failed for %s: %v", maskMobile(mobile), err)
		return err
	}
	return nil
}

func (uc *AuthUsecase) VerifyOTP(ctx context.Context, mobile, code string) (*AuthResult, error) {
	mobile = normalizeMobile(mobile)
	code = strings.TrimSpace(faToEnDigits(code))
	if !validMobile(mobile) || len(code) != 5 {
		return nil, domain.ErrOTPInvalid
	}

	bypass := uc.cfg.OTPTestBypassEnabled && code == uc.cfg.OTPTestCode &&
		(uc.cfg.OTPTestMobile == "" || uc.cfg.OTPTestMobile == mobile)

	if !bypass {
		otp, err := uc.otps.Latest(ctx, mobile)
		if err != nil {
			return nil, domain.ErrOTPInvalid
		}
		if !uc.matchesOTP(otp.Code, mobile, code) || time.Now().After(otp.ExpiresAt) {
			return nil, domain.ErrOTPInvalid
		}
		if err := uc.otps.Consume(ctx, otp.ID); err != nil {
			return nil, err
		}
	}

	user, err := uc.users.ByMobile(ctx, mobile)
	if err == domain.ErrNotFound {
		user = &domain.User{Mobile: mobile, Role: domain.RoleLearner, Active: true}
		if err := uc.users.Create(ctx, user); err != nil {
			return nil, err
		}
	} else if err != nil {
		return nil, err
	}

	if !user.Active {
		return nil, domain.ErrForbidden
	}

	needProfile := NeedsProfile(user)
	tkn, err := uc.tokens.Generate(user.ID, user.Role)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: tkn, User: user, NeedProfile: needProfile}, nil
}

func (uc *AuthUsecase) otpDigest(mobile, code string) string {
	mac := hmac.New(sha256.New, []byte(uc.cfg.JWTSecret))
	_, _ = mac.Write([]byte(mobile + ":" + code))
	return hex.EncodeToString(mac.Sum(nil))
}

func (uc *AuthUsecase) matchesOTP(stored, mobile, code string) bool {
	expected := uc.otpDigest(mobile, code)
	if len(stored) == sha256.Size*2 {
		return hmac.Equal([]byte(stored), []byte(expected))
	}
	// Rolling-deploy compatibility for short-lived rows created by older builds.
	return hmac.Equal([]byte(stored), []byte(code))
}

func (uc *AuthUsecase) generateCode(mobile string) (string, error) {
	if uc.cfg.OTPTestBypassEnabled && (uc.cfg.OTPTestMobile == "" || uc.cfg.OTPTestMobile == mobile) {
		return uc.cfg.OTPTestCode, nil
	}
	n, err := rand.Int(rand.Reader, big.NewInt(90000))
	if err != nil {
		return "", err
	}
	return big.NewInt(10000 + n.Int64()).String(), nil
}

func validMobile(mobile string) bool {
	if len(mobile) != 11 || !strings.HasPrefix(mobile, "09") {
		return false
	}
	for _, char := range mobile {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}

func normalizeMobile(m string) string {
	m = strings.TrimSpace(m)
	m = strings.ReplaceAll(m, " ", "")
	m = strings.ReplaceAll(m, "-", "")
	m = faToEnDigits(m)
	if strings.HasPrefix(m, "+98") {
		m = "0" + m[3:]
	} else if strings.HasPrefix(m, "98") && len(m) == 12 {
		m = "0" + m[2:]
	}
	return m
}

func maskMobile(m string) string {
	if len(m) < 7 {
		return "***"
	}
	return m[:4] + "***" + m[len(m)-4:]
}

func faToEnDigits(s string) string {
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= '۰' && r <= '۹':
			b.WriteRune('0' + (r - '۰'))
		case r >= '٠' && r <= '٩':
			b.WriteRune('0' + (r - '٠'))
		default:
			b.WriteRune(r)
		}
	}
	return b.String()
}
