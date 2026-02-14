package auth

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	uc *Usecase
}

func NewHandler(uc *Usecase) *Handler {
	return &Handler{uc: uc}
}

func (h *Handler) RequestOTP(c *gin.Context) {
	var req OTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if err := h.uc.RequestOTP(req.Mobile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to send OTP"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "OTP sent"})
}

func (h *Handler) VerifyOTP(c *gin.Context) {
	var req OTPVerify
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := h.uc.VerifyOTP(req.Mobile, req.Code)
	if err != nil {
		if errors.Is(err, ErrInvalidOTP) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired OTP"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "verification failed"})
		return
	}
	c.JSON(http.StatusOK, res)
}
