package services

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"strings"
	"time"

	"vodda/backend/src/config"

	"github.com/golang-jwt/jwt/v5"
)

// Auth request/response types
const OTPStub = "12345" // For testing when SMS not configured
const OTPTestMobile = "09136336002"
const OTPTestCode = "33365"

var ErrInvalidOTP = errors.New("invalid or expired OTP")
var ErrInvalidRole = errors.New("invalid active role")

// OTPRequest is the request body for requesting OTP.
type OTPRequest struct {
	Mobile string `json:"mobile" binding:"required"`
}

// OTPVerify is the request body for verifying OTP.
type OTPVerify struct {
	Mobile string `json:"mobile" binding:"required"`
	Code   string `json:"code" binding:"required"`
}

// UpdateProfileRequest is the request body for updating profile.
type UpdateProfileRequest struct {
	Name string `json:"name" binding:"required"`
}

// SetActiveRoleRequest is the request body for switching active role.
type SetActiveRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// TokenResponse is the response for successful auth actions.
type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

// MeResponse is the response for GET /me.
type MeResponse struct {
	ID         int64    `json:"id"`
	Mobile     string   `json:"mobile"`
	Name       string   `json:"name"`
	Roles      []string `json:"roles"`
	ActiveRole string   `json:"active_role"`
}

// Claims for JWT.
type Claims struct {
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
	smsConfig  config.SMSConfig
}

// NewAuthService creates an AuthService.
func NewAuthService(repo AuthRepository, jwtSecret, jwtRefresh string, smsConfig config.SMSConfig) *AuthService {
	return &AuthService{
		repo:       repo,
		jwtSecret:  jwtSecret,
		jwtRefresh: jwtRefresh,
		smsConfig:  smsConfig,
	}
}

func (s *AuthService) RequestOTP(mobile string) error {
	expiresAt := time.Now().Add(2 * time.Minute)
	var code string
	if mobile == OTPTestMobile {
		code = OTPTestCode
		log.Printf("[SMS] Test mobile detected, use fixed code %s for %s", code, mobile)
	} else if s.smsConfig.APIKey != "" && s.smsConfig.BodyID != "" {
		code = s.generateOTP()
		if err := s.sendSMSVerification(mobile, code); err != nil {
			log.Printf("[SMS] Send failed: %v", err)
			return err
		}
	} else {
		code = OTPStub
		log.Printf("[SMS] Not configured, use code %s for %s", code, mobile)
	}
	return s.repo.CreateOTP(mobile, code, sql.NullTime{Time: expiresAt, Valid: true})
}

func (s *AuthService) generateOTP() string {
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	return fmt.Sprintf("%05d", rng.Intn(100000))
}

func (s *AuthService) sendSMSVerification(mobile, code string) error {
	apiKey := s.smsConfig.APIKey
	url := fmt.Sprintf("https://console.melipayamak.com/api/send/shared/%s", apiKey)
	payload := map[string]interface{}{
		"bodyId": s.smsConfig.BodyID,
		"to":     mobile,
		"args":   []string{code},
	}
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonPayload))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("SMS send failed: %s", string(body))
	}
	log.Printf("[SMS] Sent to %s", mobile)
	return nil
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

	_, _, activeRole, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}

	normalizedRole := normalizeActiveRole(activeRole, roles)
	if normalizedRole != activeRole {
		if err := s.repo.SetActiveRole(userID, normalizedRole); err != nil {
			return nil, err
		}
	}

	return s.issueTokens(userID, roles, normalizedRole)
}

// GetMe returns the current user profile and roles by user ID.
func (s *AuthService) GetMe(userID int64) (*MeResponse, error) {
	mobile, name, activeRole, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	roles, err := s.repo.GetUserRoles(userID)
	if err != nil {
		return nil, err
	}
	normalizedRole := normalizeActiveRole(activeRole, roles)
	if normalizedRole != activeRole {
		if err := s.repo.SetActiveRole(userID, normalizedRole); err != nil {
			return nil, err
		}
	}
	return &MeResponse{
		ID:         userID,
		Mobile:     mobile,
		Name:       name,
		Roles:      roles,
		ActiveRole: normalizedRole,
	}, nil
}

func (s *AuthService) UpdateProfile(userID int64, req UpdateProfileRequest) (*MeResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, fmt.Errorf("name is required")
	}
	if err := s.repo.UpdateUserName(userID, name); err != nil {
		return nil, err
	}
	return s.GetMe(userID)
}

func (s *AuthService) SetActiveRole(userID int64, req SetActiveRoleRequest) (*TokenResponse, error) {
	role := strings.TrimSpace(req.Role)
	if !isValidRole(role) {
		return nil, ErrInvalidRole
	}
	roles, err := s.repo.GetUserRoles(userID)
	if err != nil {
		return nil, err
	}
	if !hasRole(roles, role) {
		return nil, ErrInvalidRole
	}
	if err := s.repo.SetActiveRole(userID, role); err != nil {
		return nil, err
	}
	return s.issueTokens(userID, roles, role)
}

func (s *AuthService) issueTokens(userID int64, roles []string, activeRole string) (*TokenResponse, error) {
	exp := time.Now().Add(15 * time.Minute)
	claims := &Claims{
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
	refreshClaims := &Claims{RegisteredClaims: jwt.RegisteredClaims{
		Subject:   fmt.Sprintf("%d", userID),
		ExpiresAt: jwt.NewNumericDate(refreshExp),
	}}
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

func isValidRole(role string) bool {
	return role == "learner" || role == "teacher" || role == "admin"
}

func hasRole(roles []string, role string) bool {
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	return false
}

func normalizeActiveRole(activeRole string, roles []string) string {
	if hasRole(roles, activeRole) {
		return activeRole
	}
	if hasRole(roles, "learner") {
		return "learner"
	}
	if hasRole(roles, "teacher") {
		return "teacher"
	}
	if hasRole(roles, "admin") {
		return "admin"
	}
	return "learner"
}
