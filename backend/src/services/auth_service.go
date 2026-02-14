package services

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Auth request/response types
const OTPStub = "123456" // For testing; replace with real OTP in production

var ErrInvalidOTP = errors.New("invalid or expired OTP")

// OTPRequest is the request body for requesting OTP.
type OTPRequest struct {
	Mobile string `json:"mobile" binding:"required"`
}

// OTPVerify is the request body for verifying OTP.
type OTPVerify struct {
	Mobile string `json:"mobile" binding:"required"`
	Code   string `json:"code" binding:"required"`
}

// TokenResponse is the response for successful OTP verification.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// Claims for JWT.
type Claims struct {
	Sub        int64    `json:"sub"`
	Roles      []string `json:"roles"`
	ActiveRole string   `json:"active_role"`
	SessionID  string   `json:"session_id"`
	jwt.RegisteredClaims
}

// AuthService handles auth business logic.
type AuthService struct {
	repo       AuthRepository
	jwtSecret  string
	jwtRefresh string
}

// NewAuthService creates an AuthService.
func NewAuthService(repo AuthRepository, jwtSecret, jwtRefresh string) *AuthService {
	return &AuthService{
		repo:       repo,
		jwtSecret:  jwtSecret,
		jwtRefresh: jwtRefresh,
	}
}

func (s *AuthService) RequestOTP(mobile string) error {
	expiresAt := time.Now().Add(5 * time.Minute)
	return s.repo.CreateOTP(mobile, OTPStub, sql.NullTime{Time: expiresAt, Valid: true})
}

func (s *AuthService) VerifyOTP(mobile, code string) (*TokenResponse, error) {
	ok, err := s.repo.VerifyOTP(mobile, code)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrInvalidOTP
	}
	userID, err := s.repo.CreateUserIfNotExists(mobile, "")
	if err != nil {
		return nil, err
	}
	roles, err := s.repo.GetUserRoles(userID)
	if err != nil {
		return nil, err
	}
	activeRole := "learner"
	for _, r := range roles {
		if r == "learner" {
			break
		}
		if r == "teacher" || r == "admin" {
			activeRole = r
			break
		}
	}
	exp := time.Now().Add(15 * time.Minute)
	claims := &Claims{
		Sub:        userID,
		Roles:      roles,
		ActiveRole: activeRole,
		SessionID:  "",
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
			Subject:   fmt.Sprintf("%d", userID),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	access, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, err
	}
	refreshExp := time.Now().Add(30 * 24 * time.Hour)
	refreshClaims := &Claims{Sub: userID, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(refreshExp)}}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refresh, err := refreshToken.SignedString([]byte(s.jwtRefresh))
	if err != nil {
		return nil, err
	}
	return &TokenResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    900,
	}, nil
}
