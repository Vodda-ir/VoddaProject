package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// AppController handles all non-auth MVP API endpoints.
type AppController struct {
	service *services.AppService
}

func NewAppController(service *services.AppService) *AppController {
	return &AppController{service: service}
}

func (c *AppController) UpsertTeacherProfile(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	var req services.TeacherProfileUpsertRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.service.UpsertTeacherProfile(userID, req)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AppController) ListTeachers(ctx *gin.Context) {
	res, err := c.service.ListTeachers(services.TeacherListFilter{
		Query:        ctx.Query("query"),
		Specialty:    ctx.Query("specialty"),
		Level:        ctx.Query("level"),
		OnlyApproved: true,
	})
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"items": res})
}

func (c *AppController) GetTeacher(ctx *gin.Context) {
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	res, err := c.service.GetTeacherByID(id)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AppController) ListPendingTeachers(ctx *gin.Context) {
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

func (c *AppController) ApproveTeacher(ctx *gin.Context) {
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

func (c *AppController) RejectTeacher(ctx *gin.Context) {
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

func (c *AppController) CreateBooking(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	var req services.BookingCreateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.service.CreateBooking(userID, req)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusCreated, res)
}

func (c *AppController) ListMyBookings(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	res, err := c.service.ListLearnerBookings(userID)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"items": res})
}

func (c *AppController) ListTeacherBookings(ctx *gin.Context) {
	if !requireRole(ctx, "teacher") {
		return
	}
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	res, err := c.service.ListTeacherBookings(userID)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"items": res})
}

func (c *AppController) AcceptBooking(ctx *gin.Context) {
	if !requireRole(ctx, "teacher") {
		return
	}
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	res, err := c.service.AcceptBooking(userID, id)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AppController) RejectBooking(ctx *gin.Context) {
	if !requireRole(ctx, "teacher") {
		return
	}
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req services.BookingActionRequest
	_ = ctx.ShouldBindJSON(&req)
	res, err := c.service.RejectBooking(userID, id, req.Reason)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AppController) SessionToken(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	res, err := c.service.GenerateSessionToken(userID, id)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AppController) EndSession(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	res, err := c.service.EndSession(userID, id)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, res)
}

func (c *AppController) WalletTopupInitiate(ctx *gin.Context) {
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

func (c *AppController) WalletTopupVerify(ctx *gin.Context) {
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

func (c *AppController) WalletTransactions(ctx *gin.Context) {
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

func (c *AppController) CreateWithdrawRequest(ctx *gin.Context) {
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

func (c *AppController) ListWithdrawRequests(ctx *gin.Context) {
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

func (c *AppController) ProcessWithdrawRequest(ctx *gin.Context) {
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

func (c *AppController) CreateRating(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	var req services.RatingCreateRequest
	if err := ctx.ShouldBindJSON(&req); err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	res, err := c.service.CreateRating(userID, req)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusCreated, res)
}

func (c *AppController) ListNotifications(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	res, err := c.service.ListNotifications(userID)
	if err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"items": res})
}

func (c *AppController) MarkNotificationRead(ctx *gin.Context) {
	userID, ok := getUserIDFromContext(ctx)
	if !ok {
		return
	}
	id, err := parsePathInt64(ctx, "id")
	if err != nil {
		ctx.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := c.service.MarkNotificationRead(userID, id); err != nil {
		writeAppError(ctx, err)
		return
	}
	ctx.JSON(http.StatusOK, gin.H{"message": "ok"})
}

func parsePathInt64(ctx *gin.Context, key string) (int64, error) {
	return strconv.ParseInt(ctx.Param(key), 10, 64)
}

func requireRole(ctx *gin.Context, role string) bool {
	rolesVal, ok := ctx.Get("roles")
	if !ok {
		ctx.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return false
	}
	roles, ok := rolesVal.([]string)
	if !ok {
		ctx.JSON(http.StatusForbidden, gin.H{"error": "invalid role context"})
		return false
	}
	for _, r := range roles {
		if r == role {
			return true
		}
	}
	ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
	return false
}

func writeAppError(ctx *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrInvalidInput):
		ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrForbidden):
		ctx.JSON(http.StatusForbidden, gin.H{"error": "forbidden"})
	case errors.Is(err, services.ErrNotFound):
		ctx.JSON(http.StatusNotFound, gin.H{"error": "not found"})
	case errors.Is(err, services.ErrConflict):
		ctx.JSON(http.StatusConflict, gin.H{"error": "conflict"})
	case errors.Is(err, services.ErrInsufficientBalance):
		ctx.JSON(http.StatusUnprocessableEntity, gin.H{"error": "insufficient balance"})
	default:
		ctx.JSON(http.StatusInternalServerError, gin.H{"error": "internal server error"})
	}
}
