package controllers

import (
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// SessionController handles class session endpoints.
type SessionController struct {
	service *services.AppService
}

func NewSessionController(service *services.AppService) *SessionController {
	return &SessionController{service: service}
}

func (c *SessionController) SessionToken(ctx *gin.Context) {
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

func (c *SessionController) EndSession(ctx *gin.Context) {
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
