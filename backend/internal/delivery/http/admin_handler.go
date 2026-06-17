package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
)

func (h *Handler) AdminDashboard(c *gin.Context) {
	d, err := h.Admin.Dashboard(c)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, d)
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
		Active bool `json:"active"`
	}
	_ = c.ShouldBindJSON(&in)
	if err := h.Admin.SetUserActive(c, paramID(c), in.Active); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"active": in.Active})
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
		Approve bool `json:"approve"`
	}
	_ = c.ShouldBindJSON(&in)
	t, err := h.Admin.ReviewTeacher(c, paramID(c), in.Approve)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, t)
}

func (h *Handler) AdminSessions(c *gin.Context) {
	s, total, err := h.Admin.ListSessions(c, domain.SessionStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, s, total)
}

func (h *Handler) AdminWithdrawals(c *gin.Context) {
	w, total, err := h.Admin.ListWithdrawals(c, domain.WithdrawalStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
	if err != nil {
		fail(c, err)
		return
	}
	okList(c, w, total)
}

func (h *Handler) AdminProcessWithdrawal(c *gin.Context) {
	var in struct {
		Paid bool `json:"paid"`
	}
	_ = c.ShouldBindJSON(&in)
	w, err := h.Wallet.ProcessWithdrawal(c, paramID(c), in.Paid)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, w)
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
