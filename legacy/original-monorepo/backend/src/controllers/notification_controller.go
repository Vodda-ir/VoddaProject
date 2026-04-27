package controllers

import (
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// NotificationController handles user notification endpoints.
type NotificationController struct {
	service *services.AppService
}

func NewNotificationController(service *services.AppService) *NotificationController {
	return &NotificationController{service: service}
}

func (c *NotificationController) ListNotifications(ctx *gin.Context) {
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

func (c *NotificationController) MarkNotificationRead(ctx *gin.Context) {
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
