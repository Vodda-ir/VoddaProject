package controllers

import (
	"errors"
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// AuthController handles auth HTTP endpoints.
type AuthController struct {
	authService *services.AuthService
}

// NewAuthController creates an AuthController.
func NewAuthController(authService *services.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

func (c *AuthController) RequestOTP(ctx *gin.Context) {
	var req services.OTPRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := c.authService.RequestOTP(req.Mobile); err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send OTP"})
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "OTP sent"})
}

func (c *AuthController) VerifyOTP(ctx *gin.Context) {
	var req services.OTPVerify
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.authService.VerifyOTP(req.Mobile, req.Code)
	if err != nil {
		if errors.Is(err, services.ErrInvalidOTP) {
			ctx.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired OTP"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
		return
	}
	ctx.JSON(http.StatusOK, res)
}

// Me returns the current user profile. Requires AuthMiddleware.
func (c *AuthController) Me(ctx *gin.Context) {
	userIDVal, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user context"})
		return
	}
	me, err := c.authService.GetMe(userID)
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get profile"})
		return
	}
	ctx.JSON(http.StatusOK, me)
}

// UpdateProfile updates basic profile fields of the current user.
func (c *AuthController) UpdateProfile(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}

	var req services.UpdateProfileRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	me, err := c.authService.UpdateProfile(userID, req)
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	ctx.JSON(http.StatusOK, me)
}

// SetActiveRole switches active role and returns refreshed tokens.
func (c *AuthController) SetActiveRole(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}

	var req services.SetActiveRoleRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	res, err := c.authService.SetActiveRole(userID, req)
	if err != nil {
		if errors.Is(err, services.ErrInvalidRole) {
			ctx.JSON(http.StatusForbidden, gin.H{"error": "role not allowed for user"})
			return
		}
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "failed to switch active role"})
		return
	}

	ctx.JSON(http.StatusOK, res)
}

func getUserIDFromContext(ctx *gin.Context) (int64, bool) {
	userIDVal, exists := ctx.Get("user_id")
	if !exists {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return 0, false
	}
	userID, ok := userIDVal.(int64)
	if !ok {
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "invalid user context"})
		return 0, false
	}
	return userID, true
}
