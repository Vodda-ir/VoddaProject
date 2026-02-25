package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

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
