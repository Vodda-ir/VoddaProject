package controllers

import (
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// WalletController handles wallet topup/withdraw endpoints.
type WalletController struct {
	service *services.AppService
}

func NewWalletController(service *services.AppService) *WalletController {
	return &WalletController{service: service}
}

func (c *WalletController) WalletTopupInitiate(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	var req services.TopupInitiateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.service.TopupInitiate(userID, req)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *WalletController) WalletTopupVerify(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	var req services.TopupVerifyRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.service.TopupVerify(userID, req)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *WalletController) WalletTransactions(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	res, err := c.service.WalletTransactions(userID)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *WalletController) CreateWithdrawRequest(ctx *gin.Context) {
	if !requireRole(ctx, "teacher") {
		return
	}
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	var req services.WithdrawRequestCreate
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.service.CreateWithdrawRequest(userID, req)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusCreated, res)
}
