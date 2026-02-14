package auth

import "github.com/golang-jwt/jwt/v5"

const OTPStub = "123456" // For testing; replace with real OTP in production

type OTPRequest struct {
	Mobile string `json:"mobile" binding:"required"`
}

type OTPVerify struct {
	Mobile string `json:"mobile" binding:"required"`
	Code   string `json:"code" binding:"required"`
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int64  `json:"expires_in"`
}

type Claims struct {
	Sub        int64    `json:"sub"`
	Roles      []string `json:"roles"`
	ActiveRole string   `json:"active_role"`
	SessionID  string   `json:"session_id"`
	jwt.RegisteredClaims
}
