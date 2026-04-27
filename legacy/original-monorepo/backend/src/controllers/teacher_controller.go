package controllers

import (
	"net/http"

	"vodda/backend/src/services"

	"github.com/gin-gonic/gin"
)

// TeacherController handles teacher profile and discovery endpoints.
type TeacherController struct {
	service *services.AppService
}

func NewTeacherController(service *services.AppService) *TeacherController {
	return &TeacherController{service: service}
}

func (c *TeacherController) UpsertTeacherProfile(ctx *gin.Context) {
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

func (c *TeacherController) ListTeachers(ctx *gin.Context) {
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

func (c *TeacherController) GetTeacher(ctx *gin.Context) {
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
