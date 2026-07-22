package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
)

func (h *Handler) AdminDashboard(c *gin.Context) {
	dashboard, err := h.Admin.Dashboard(c)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, dashboard)
}

func (h *Handler) AdminUsers(c *gin.Context) {
	users, total, err := h.Admin.ListUsers(c, domain.Role(c.Query("role")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, users, total)
}

func (h *Handler) AdminSetUserActive(c *gin.Context) {
	var in struct {
		Active *bool `json:"active" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.Active == nil {
		fail(c, domain.ErrValidation)
		return
	}
	if paramID(c) == userID(c) && !*in.Active {
		fail(c, domain.ErrConflict)
		return
	}
	if err := h.Admin.SetUserActive(c, paramID(c), *in.Active); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"active": *in.Active})
}

func (h *Handler) AdminTeachers(c *gin.Context) {
	teachers, total, err := h.Admin.ListTeachers(c, domain.TeacherStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, teachers, total)
}

func (h *Handler) AdminReviewTeacher(c *gin.Context) {
	var in struct {
		Approve *bool `json:"approve" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.Approve == nil {
		fail(c, domain.ErrValidation)
		return
	}
	teacher, err := h.Admin.ReviewTeacher(c, paramID(c), *in.Approve)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, teacher)
}

func (h *Handler) AdminSessions(c *gin.Context) {
	sessions, total, err := h.Admin.ListSessions(c, domain.SessionStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, sessions, total)
}

func (h *Handler) AdminWithdrawals(c *gin.Context) {
	withdrawals, total, err := h.Admin.ListWithdrawals(c, domain.WithdrawalStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, withdrawals, total)
}

func (h *Handler) AdminProcessWithdrawal(c *gin.Context) {
	var in struct {
		Paid *bool `json:"paid" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil || in.Paid == nil {
		fail(c, domain.ErrValidation)
		return
	}
	withdrawal, err := h.Wallet.ProcessWithdrawal(c, paramID(c), *in.Paid)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, withdrawal)
}

func (h *Handler) AdminServices(c *gin.Context) {
	services, err := h.Admin.ListPendingServices(c)
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, services, int64(len(services)))
}

func (h *Handler) AdminApproveService(c *gin.Context) {
	if err := h.Admin.ApproveService(c, paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"approved": true})
}

func (h *Handler) AdminRejectService(c *gin.Context) {
	if err := h.Admin.RejectService(c, paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"rejected": true})
}
