package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

// CreateDispatchCall handles POST /dispatch/calls — the learner broadcasts
// a topic request to eligible teachers (فراخوان).
func (h *Handler) CreateDispatchCall(c *gin.Context) {
	var in struct {
		OfficialServiceID uint   `json:"official_service_id" binding:"required"`
		Note              string `json:"note"`
		ScheduledAt       string `json:"scheduled_at"`
		Flexible          bool   `json:"flexible"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	var scheduledAt *time.Time
	if !in.Flexible {
		if in.ScheduledAt == "" {
			fail(c, domain.ErrValidation)
			return
		}
		at, err := time.Parse(time.RFC3339, in.ScheduledAt)
		if err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		scheduledAt = &at
	}
	view, err := h.Dispatch.CreateCall(c, userID(c), usecase.CreateCallInput{
		OfficialServiceID: in.OfficialServiceID,
		Note:              in.Note,
		ScheduledAt:       scheduledAt,
		Flexible:          in.Flexible,
	})
	if err != nil {
		fail(c, err)
		return
	}
	created(c, view)
}

// CurrentDispatchCall handles GET /dispatch/calls/current — the learner's
// live call with candidates (polled while the dispatch screen is open).
func (h *Handler) CurrentDispatchCall(c *gin.Context) {
	view, err := h.Dispatch.CurrentCallForLearner(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

// ChooseDispatchOffer handles POST /dispatch/calls/:id/choose — the learner
// confirms a candidate and a booking is created through the payment pipeline.
func (h *Handler) ChooseDispatchOffer(c *gin.Context) {
	var in struct {
		OfferID       uint   `json:"offer_id" binding:"required"`
		PaymentMethod string `json:"payment_method"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	result, err := h.Dispatch.ChooseOffer(c, userID(c), paramID(c), in.OfferID, in.PaymentMethod)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, result)
}

// DeclineDispatchOffer handles POST /dispatch/calls/:id/decline — removes
// one candidate; the race keeps running for the others.
func (h *Handler) DeclineDispatchOffer(c *gin.Context) {
	var in struct {
		OfferID uint `json:"offer_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	view, err := h.Dispatch.DeclineOffer(c, userID(c), paramID(c), in.OfferID)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

// CancelDispatchCall handles POST /dispatch/calls/:id/cancel.
func (h *Handler) CancelDispatchCall(c *gin.Context) {
	if err := h.Dispatch.CancelCall(c, userID(c), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"canceled": true})
}

// TeacherDispatchInbox handles GET /teacher/dispatch/inbox — the teacher's
// live call-out inbox (open calls + waiting offers). Polling doubles as the
// presence heartbeat.
func (h *Handler) TeacherDispatchInbox(c *gin.Context) {
	inbox, err := h.Dispatch.TeacherIncoming(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, inbox)
}

// TeacherDispatchAccept handles POST /teacher/dispatch/calls/:id/accept —
// the teacher joins the race for the call.
func (h *Handler) TeacherDispatchAccept(c *gin.Context) {
	offer, err := h.Dispatch.TeacherAccept(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, offer)
}

// TeacherDispatchWithdraw handles POST /teacher/dispatch/offers/:id/withdraw.
func (h *Handler) TeacherDispatchWithdraw(c *gin.Context) {
	if err := h.Dispatch.TeacherWithdraw(c, userID(c), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"withdrawn": true})
}

// TeacherDispatchReject handles POST /teacher/dispatch/calls/:id/reject —
// dismisses the call so it never reappears in this teacher's inbox.
func (h *Handler) TeacherDispatchReject(c *gin.Context) {
	if err := h.Dispatch.TeacherReject(c, userID(c), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"rejected": true})
}

var _ = http.StatusOK // keep net/http import when handlers change
