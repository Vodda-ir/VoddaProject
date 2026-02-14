package auth

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var ErrInvalidOTP = errors.New("invalid or expired OTP")

type Usecase struct {
	repo       Repository
	jwtSecret  string
	jwtRefresh string
}

func NewUsecase(repo Repository, jwtSecret, jwtRefresh string) *Usecase {
	return &Usecase{
		repo:       repo,
		jwtSecret:  jwtSecret,
		jwtRefresh: jwtRefresh,
	}
}

func (u *Usecase) RequestOTP(mobile string) error {
	expiresAt := time.Now().Add(5 * time.Minute)
	return u.repo.CreateOTP(mobile, OTPStub, sql.NullTime{Time: expiresAt, Valid: true})
}

func (u *Usecase) VerifyOTP(mobile, code string) (*TokenResponse, error) {
	ok, err := u.repo.VerifyOTP(mobile, code)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrInvalidOTP
	}
	userID, err := u.repo.CreateUserIfNotExists(mobile, "")
	if err != nil {
		return nil, err
	}
	roles, err := u.repo.GetUserRoles(userID)
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
	access, err := token.SignedString([]byte(u.jwtSecret))
	if err != nil {
		return nil, err
	}
	refreshExp := time.Now().Add(30 * 24 * time.Hour)
	refreshClaims := &Claims{Sub: userID, RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(refreshExp)}}
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refresh, err := refreshToken.SignedString([]byte(u.jwtRefresh))
	if err != nil {
		return nil, err
	}
	return &TokenResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    900,
	}, nil
}
