package controllers

import (
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// BookingController handles booking flow endpoints.
type BookingController struct {
	service *services.AppService
}

func NewBookingController(service *services.AppService) *BookingController {
	return &BookingController{service: service}
}

func (c *BookingController) CreateBooking(ctx *gin.Context) {
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

func (c *BookingController) ListMyBookings(ctx *gin.Context) {
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

func (c *BookingController) ListTeacherBookings(ctx *gin.Context) {
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

func (c *BookingController) AcceptBooking(ctx *gin.Context) {
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

func (c *BookingController) RejectBooking(ctx *gin.Context) {
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
