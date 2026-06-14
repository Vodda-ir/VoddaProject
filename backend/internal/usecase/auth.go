// Package usecase holds the application's business logic, orchestrating
// domain repositories and platform services. It depends only on domain
// interfaces, never on the delivery (HTTP) or persistence (GORM) layers.
package usecase

import (
	"context"
	"crypto/rand"
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

// NewAuthUsecase builds an AuthUsecase.
func NewAuthUsecase(u domain.UserRepository, o domain.OTPRepository, s sms.Sender, t *token.Manager, cfg *config.Config) *AuthUsecase {
	return &AuthUsecase{users: u, otps: o, sender: s, tokens: t, cfg: cfg}
}

// AuthResult is returned after a successful verification.
type AuthResult struct {
	Token       string       `json:"token"`
	User        *domain.User `json:"user"`
	NeedProfile bool         `json:"need_profile"`
}

// RequestOTP issues (and sends) a verification code for the mobile number.
func (uc *AuthUsecase) RequestOTP(ctx context.Context, mobile string) error {
	mobile = normalizeMobile(mobile)
	if len(mobile) != 11 || !strings.HasPrefix(mobile, "09") {
		return domain.ErrValidation
	}

	// enforce resend cooldown
	if last, err := uc.otps.Latest(ctx, mobile); err == nil && last != nil {
		if time.Since(last.CreatedAt) < uc.cfg.OTPResendCooldown {
			return domain.ErrOTPCooldown
		}
	}

	code := uc.generateCode(mobile)
	now := time.Now()
	otp := &domain.OTPCode{
		Mobile:    mobile,
		Code:      code,
		ExpiresAt: now.Add(uc.cfg.OTPExpiration),
		CreatedAt: now,
	}
	if err := uc.otps.Create(ctx, otp); err != nil {
		return err
	}

	// In bypass mode (dev) we skip the actual SMS for the test code.
	if uc.cfg.OTPTestBypassEnabled && code == uc.cfg.OTPTestCode {
		return nil
	}
	return uc.sender.SendOTP(ctx, mobile, code)
}

// VerifyOTP validates a code and returns a token, creating the user on first login.
func (uc *AuthUsecase) VerifyOTP(ctx context.Context, mobile, code string) (*AuthResult, error) {
	mobile = normalizeMobile(mobile)

	bypass := uc.cfg.OTPTestBypassEnabled && code == uc.cfg.OTPTestCode &&
		(uc.cfg.OTPTestMobile == "" || uc.cfg.OTPTestMobile == mobile)

	if !bypass {
		otp, err := uc.otps.Latest(ctx, mobile)
		if err != nil {
			return nil, domain.ErrOTPInvalid
		}
		if otp.Code != code || time.Now().After(otp.ExpiresAt) {
			return nil, domain.ErrOTPInvalid
		}
		_ = uc.otps.Consume(ctx, otp.ID)
	}

	user, err := uc.users.ByMobile(ctx, mobile)
	needProfile := false
	if err == domain.ErrNotFound {
		user = &domain.User{Mobile: mobile, Role: domain.RoleLearner, Active: true}
		if err := uc.users.Create(ctx, user); err != nil {
			return nil, err
		}
		needProfile = true
	} else if err != nil {
		return nil, err
	} else if strings.TrimSpace(user.Name) == "" {
		needProfile = true
	}

	tkn, err := uc.tokens.Generate(user.ID, user.Role)
	if err != nil {
		return nil, err
	}
	return &AuthResult{Token: tkn, User: user, NeedProfile: needProfile}, nil
}

func (uc *AuthUsecase) generateCode(mobile string) string {
	if uc.cfg.OTPTestBypassEnabled && (uc.cfg.OTPTestMobile == "" || uc.cfg.OTPTestMobile == mobile) {
		return uc.cfg.OTPTestCode
	}
	n, err := rand.Int(rand.Reader, big.NewInt(90000))
	if err != nil {
		return "12345"
	}
	return big.NewInt(10000 + n.Int64()).String()
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
