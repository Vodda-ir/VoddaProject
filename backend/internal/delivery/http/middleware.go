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

// AuthRequired validates the Bearer token and stores the current identity in
// context. Production injects UserRepository so account deactivation and role
// changes take effect immediately instead of waiting for JWT expiry.
func AuthRequired(tm *token.Manager, repositories ...domain.UserRepository) gin.HandlerFunc {
	var users domain.UserRepository
	if len(repositories) > 0 {
		users = repositories[0]
	}

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

		role := claims.Role
		if users != nil {
			user, err := users.ByID(c, claims.UserID)
			if err != nil || user == nil || !user.Active {
				fail(c, domain.ErrUnauthorized)
				return
			}
			role = user.Role
		}

		c.Set(ctxUserID, claims.UserID)
		c.Set(ctxRole, role)
		c.Next()
	}
}

// RequireRole ensures the caller holds one of the allowed current roles.
func RequireRole(roles ...domain.Role) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, _ := c.Get(ctxRole)
		current, _ := role.(domain.Role)
		for _, allowed := range roles {
			if current == allowed {
				c.Next()
				return
			}
		}
		fail(c, domain.ErrForbidden)
	}
}

func userID(c *gin.Context) uint {
	value, _ := c.Get(ctxUserID)
	id, _ := value.(uint)
	return id
}
