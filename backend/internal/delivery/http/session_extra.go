package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
)

// callerRole reads the authenticated role stored by AuthRequired.
func callerRole(c *gin.Context) domain.Role {
	value, _ := c.Get(ctxRole)
	role, _ := value.(domain.Role)
	return role
}

// SessionDetail handles GET /sessions/:id — the role-aware full payload of
// the session detail screen. A teacher view also stamps teacher_seen_at.
func (h *Handler) SessionDetail(c *gin.Context) {
	detail, err := h.Session.SessionDetailFor(c, userID(c), callerRole(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, detail)
}

// SessionMessages handles GET /sessions/:id/messages — persisted coordination
// chat between the learner and the teacher of the session.
func (h *Handler) SessionMessages(c *gin.Context) {
	items, err := h.Session.SessionMessages(c, userID(c), callerRole(c), paramID(c), queryInt(c, "limit", 200))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, items)
}

// SendSessionMessage handles POST /sessions/:id/messages.
func (h *Handler) SendSessionMessage(c *gin.Context) {
	var in struct {
		Body string `json:"body" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	message, err := h.Session.SendSessionMessage(c, userID(c), callerRole(c), paramID(c), in.Body)
	if err != nil {
		fail(c, err)
		return
	}
	created(c, message)
}

// TeacherUnseenSessions handles GET /teacher/sessions/unseen-count — the red
// counter shown on the sessions tab of the teacher shell.
func (h *Handler) TeacherUnseenSessions(c *gin.Context) {
	count, err := h.Session.TeacherUnseenSessionCount(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"count": count})
}
