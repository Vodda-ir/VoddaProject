// Package token issues and verifies JWT access tokens.
package token

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"vodda/backend/internal/domain"
)

// Claims is the JWT payload for an authenticated user.
type Claims struct {
	UserID uint        `json:"uid"`
	Role   domain.Role `json:"role"`
	jwt.RegisteredClaims
}

// Manager creates and validates tokens.
type Manager struct {
	secret []byte
	ttl    time.Duration
}

// NewManager builds a token Manager.
func NewManager(secret string, ttl time.Duration) *Manager {
	return &Manager{secret: []byte(secret), ttl: ttl}
}

// Generate returns a signed token for the user.
func (m *Manager) Generate(userID uint, role domain.Role) (string, error) {
	now := time.Now()
	claims := Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(m.ttl)),
			Issuer:    "vodda",
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(m.secret)
}

// Verify parses and validates a token string.
func (m *Manager) Verify(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return m.secret, nil
	})
	if err != nil || !token.Valid {
		return nil, domain.ErrUnauthorized
	}
	return claims, nil
}
