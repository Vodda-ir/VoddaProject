package controllers

import (
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// RatingController handles rating endpoints.
type RatingController struct {
	service *services.AppService
}

func NewRatingController(service *services.AppService) *RatingController {
	return &RatingController{service: service}
}

func (c *RatingController) CreateRating(ctx *gin.Context) {
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
