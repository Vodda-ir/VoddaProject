package http

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

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

// SessionMessages handles GET /sessions/:id/messages — persisted chat between
// the learner and the teacher of the session (coordination + full text-mode
// conversation with voice notes and images).
func (h *Handler) SessionMessages(c *gin.Context) {
	items, err := h.Session.SessionMessages(c, userID(c), callerRole(c), paramID(c), queryInt(c, "limit", 200))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, items)
}

const (
	sessionMediaDir      = "uploads/session-media"
	sessionMediaAudioMax = 5 << 20 // 5MB — about 5 minutes of opus voice
	sessionMediaImageMax = 5 << 20 // 5MB — compressed client-side photos
)

var sessionAudioExts = map[string]bool{
	".webm": true, ".ogg": true, ".oga": true, ".m4a": true, ".mp3": true, ".wav": true, ".aac": true, ".mp4": true,
}

var sessionImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

// SendSessionMessage handles POST /sessions/:id/messages in two shapes:
//   - JSON {"body": "..."} — plain text (legacy coordination chat + text mode)
//   - multipart with kind=audio|image, the media file, optional caption body
//     and duration_ms for voice notes — the rich text-session conversation.
func (h *Handler) SendSessionMessage(c *gin.Context) {
	if strings.HasPrefix(c.ContentType(), "multipart/form-data") {
		kind := strings.ToLower(strings.TrimSpace(c.PostForm("kind")))
		if kind != "audio" && kind != "image" {
			fail(c, domain.ErrValidation)
			return
		}
		header, err := c.FormFile("file")
		if err != nil || header == nil {
			fail(c, domain.ErrValidation)
			return
		}
		maxBytes := int64(sessionMediaImageMax)
		allowed := sessionImageExts
		if kind == "audio" {
			maxBytes = int64(sessionMediaAudioMax)
			allowed = sessionAudioExts
		}
		if header.Size <= 0 || header.Size > maxBytes {
			fail(c, domain.ErrValidation)
			return
		}
		ext := strings.ToLower(filepath.Ext(header.Filename))
		if ext == ".oga" {
			ext = ".ogg"
		}
		if !allowed[ext] {
			fail(c, domain.ErrValidation)
			return
		}
		sessionID := paramID(c)
		// Access is verified before a single byte hits the disk.
		if _, _, err := h.Session.LiveAccess(c.Request.Context(), userID(c), callerRole(c), sessionID); err != nil {
			fail(c, err)
			return
		}
		if err := os.MkdirAll(sessionMediaDir, 0o755); err != nil {
			fail(c, domain.ErrInternal)
			return
		}
		filename := fmt.Sprintf("s%d_u%d_%d%s", sessionID, userID(c), time.Now().UnixNano(), ext)
		savePath := filepath.Join(sessionMediaDir, filename)
		src, err := header.Open()
		if err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		defer src.Close()
		dst, err := os.OpenFile(savePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
		if err != nil {
			fail(c, domain.ErrInternal)
			return
		}
		_, copyErr := io.Copy(dst, src)
		closeErr := dst.Close()
		if copyErr != nil || closeErr != nil {
			_ = os.Remove(savePath)
			fail(c, domain.ErrInternal)
			return
		}

		durationMS := 0
		if raw := strings.TrimSpace(c.PostForm("duration_ms")); raw != "" {
			parsed, parseErr := strconv.Atoi(raw)
			if parseErr != nil || parsed < 0 || parsed > 600_000 {
				_ = os.Remove(savePath)
				fail(c, domain.ErrValidation)
				return
			}
			durationMS = parsed
		}
		caption := strings.TrimSpace(c.PostForm("body"))
		if len(caption) > 1000 {
			caption = caption[:1000]
		}
		mediaURL := "/" + sessionMediaDir + "/" + filename
		message, err := h.Session.SendSessionMessage(c, userID(c), callerRole(c), sessionID, caption, kind, mediaURL, durationMS)
		if err != nil {
			_ = os.Remove(savePath)
			fail(c, err)
			return
		}
		created(c, message)
		return
	}

	var in struct {
		Body string `json:"body" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	message, err := h.Session.SendSessionMessage(c, userID(c), callerRole(c), paramID(c), in.Body, "text", "", 0)
	if err != nil {
		fail(c, err)
		return
	}
	created(c, message)
}

// AnnounceSessionStart handles POST /sessions/:id/announce — either party
// rings the counterpart when ready to start; the counterpart gets an
// actionable «آمادهٔ جلسه» notification that deep-links back here.
func (h *Handler) AnnounceSessionStart(c *gin.Context) {
	session, err := h.Session.AnnounceSessionStart(c, userID(c), callerRole(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"announced": true, "status": string(session.Status)})
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

// MarkTeacherSessionsSeen handles POST /teacher/sessions/mark-seen — the
// sessions list calls it shortly after rendering unseen rows.
func (h *Handler) MarkTeacherSessionsSeen(c *gin.Context) {
	marked, err := h.Session.MarkTeacherSessionsSeenAll(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"marked": marked})
}
