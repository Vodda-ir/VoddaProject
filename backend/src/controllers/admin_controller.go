package controllers

import (
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// AdminController handles admin-only endpoints.
type AdminController struct {
	service *services.AppService
}

func NewAdminController(service *services.AppService) *AdminController {
	return &AdminController{service: service}
}

func (c *AdminController) ListPendingTeachers(ctx *gin.Context) {
	if !requireRole(ctx, "admin") {
		return
	}
	res, err := c.service.ListAdminPendingTeachers()
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"items": res})
}

func (c *AdminController) ApproveTeacher(ctx *gin.Context) {
	if !requireRole(ctx, "admin") {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	res, err := c.service.UpdateTeacherVerification(id, "approved")
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AdminController) RejectTeacher(ctx *gin.Context) {
	if !requireRole(ctx, "admin") {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	res, err := c.service.UpdateTeacherVerification(id, "rejected")
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AdminController) ListWithdrawRequests(ctx *gin.Context) {
	if !requireRole(ctx, "admin") {
		return
	}
	res, err := c.service.ListWithdrawRequests(ctx.Query("status"))
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"items": res})
}

func (c *AdminController) ProcessWithdrawRequest(ctx *gin.Context) {
	if !requireRole(ctx, "admin") {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req services.WithdrawRequestProcess
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.service.ProcessWithdrawRequest(id, req)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}
