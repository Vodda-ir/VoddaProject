package http

import (
	"strings"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/platform/token"
)

const (
	ctxUserID = "uid"
	ctxRole   = "role"
)

// AuthRequired validates the Bearer token and stores the identity in context.
func AuthRequired(tm *token.Manager) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			fail(c, domain.ErrUnauthorized)
			return
		}
		claims, err := tm.Verify(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			fail(c, domain.ErrUnauthorized)
			return
		}
		c.Set(ctxUserID, claims.UserID)
		c.Set(ctxRole, claims.Role)
		c.Next()
	}
}

// RequireRole ensures the caller holds one of the allowed roles.
func RequireRole(roles ...domain.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get(ctxRole)
		r, _ := role.(domain.Role)
		for _, allowed := range roles {
			if r == allowed {
				c.Next()
				return
			}
		}
		fail(c, domain.ErrForbidden)
	}
}

func userID(c *gin.Context) uint {
	v, _ := c.Get(ctxUserID)
	id, _ := v.(uint)
	return id
}
