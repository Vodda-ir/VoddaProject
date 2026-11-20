package http

import (
	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
)

// ─────────────────────────────────────────────────────────────────────────────
// بیگ‌بلوباتن — کلاس زنده روی زیرساخت اشتراک BigBlueButton ایران.
// هر سهٔ مسیر از LiveAccess همان کلاسِ داخلی استفاده می‌کنند (قرآن‌آموز،
// استادِ همین جلسه و مدیر)؛ URL امضاشدهٔ ورود فقط از سمت سرور ساخته می‌شود
// و Secret هرگز به کلاینت نمی‌رسد.
// ─────────────────────────────────────────────────────────────────────────────

// BbbJoin guarantees the session's BBB room exists and returns the signed
// join URL for the caller (teacher/admin → MODERATOR, learner → VIEWER).
func (h *Handler) BbbJoin(c *gin.Context) {
	uid, role, identOk := liveIdentity(c)
	if !identOk {
		fail(c, domain.ErrUnauthorized)
		return
	}
	if h.BBB == nil {
		fail(c, domain.ErrInternal)
		return
	}
	result, err := h.BBB.Join(c.Request.Context(), uid, role, paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, result)
}

// BbbStatus reports whether the provider-side room is running now and how
// many participants are inside.
func (h *Handler) BbbStatus(c *gin.Context) {
	uid, role, identOk := liveIdentity(c)
	if !identOk {
		fail(c, domain.ErrUnauthorized)
		return
	}
	if h.BBB == nil {
		fail(c, domain.ErrInternal)
		return
	}
	result, err := h.BBB.Status(c.Request.Context(), uid, role, paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, result)
}

// BbbEnd finishes the provider-side meeting (teacher/admin only).
func (h *Handler) BbbEnd(c *gin.Context) {
	uid, role, identOk := liveIdentity(c)
	if !identOk {
		fail(c, domain.ErrUnauthorized)
		return
	}
	if h.BBB == nil {
		fail(c, domain.ErrInternal)
		return
	}
	result, err := h.BBB.End(c.Request.Context(), uid, role, paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, result)
}
