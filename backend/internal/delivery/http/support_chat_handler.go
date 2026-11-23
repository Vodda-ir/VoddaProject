package http

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

// Handlers of the live support chat + ticketing system. The same
// SupportChatUsecase backs the in-app widget (user side) and the admin-panel
// support inbox (staff side: admins + appointed support agents).

// ---------- user side ----------

type SupportChatDeps struct {
	Chat *usecase.SupportChatUsecase
}

func createTicketHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			Subject string `json:"subject" binding:"required"`
			Body    string `json:"body" binding:"required"`
		}
		if err := c.ShouldBindJSON(&in); err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		ticket, err := chat.CreateTicket(c, usecase.CreateTicketInput{
			UserID: userID(c), Subject: in.Subject, Body: in.Body,
		})
		if err != nil {
			fail(c, err)
			return
		}
		created(c, gin.H{"ticket": ticket})
	}
}

func listUserTicketsHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		tickets, total, err := chat.UserTickets(c, userID(c), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
		if err != nil {
			fail(c, err)
			return
		}
		okList(c, tickets, total)
	}
}

func userThreadHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		ticket, messages, err := chat.UserThread(c, userID(c), paramID(c), uint(queryInt(c, "after_id", 0)), queryInt(c, "limit", 300))
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"ticket": ticket, "messages": messages})
	}
}

func sendUserMessageHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			Kind       string `json:"kind"`
			Body       string `json:"body"`
			Attachment string `json:"attachment_url"`
			Mime       string `json:"mime"`
			DurationMS int    `json:"duration_ms"`
		}
		if err := c.ShouldBindJSON(&in); err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		message, err := chat.SendUserMessage(c, usecase.SendMessageInput{
			TicketID:   paramID(c),
			SenderID:   userID(c),
			Kind:       domain.ChatKind(in.Kind),
			Body:       in.Body,
			Attachment: in.Attachment,
			Mime:       in.Mime,
			DurationMS: in.DurationMS,
		})
		if err != nil {
			fail(c, err)
			return
		}
		created(c, gin.H{"message": message})
	}
}

func userCloseTicketHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := chat.UserClose(c, userID(c), paramID(c)); err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"closed": true})
	}
}

func userChatUnreadHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		total, err := chat.UserUnreadTotal(c, userID(c))
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"unread": total})
	}
}

// ---------- staff side (admin panel inbox) ----------

func staffTicketsHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		assigned := uint(queryInt(c, "assigned_to", 0))
		if c.Query("mine") == "1" {
			assigned = userID(c)
		}
		tickets, total, err := chat.StaffTickets(c, domain.TicketStatus(c.Query("status")), assigned, queryInt(c, "limit", 40), queryInt(c, "offset", 0))
		if err != nil {
			fail(c, err)
			return
		}
		okList(c, tickets, total)
	}
}

func staffThreadHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		ticket, messages, err := chat.StaffThread(c, paramID(c), uint(queryInt(c, "after_id", 0)), queryInt(c, "limit", 300))
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"ticket": ticket, "messages": messages})
	}
}

func sendStaffMessageHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			Kind       string `json:"kind"`
			Body       string `json:"body"`
			Attachment string `json:"attachment_url"`
			Mime       string `json:"mime"`
			DurationMS int    `json:"duration_ms"`
		}
		if err := c.ShouldBindJSON(&in); err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		message, err := chat.SendStaffMessage(c, userID(c), usecase.SendMessageInput{
			TicketID:   paramID(c),
			Kind:       domain.ChatKind(in.Kind),
			Body:       in.Body,
			Attachment: in.Attachment,
			Mime:       in.Mime,
			DurationMS: in.DurationMS,
		})
		if err != nil {
			fail(c, err)
			return
		}
		created(c, gin.H{"message": message})
	}
}

func assignTicketHandler(chat *usecase.SupportChatUsecase, users domain.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			UserID uint `json:"user_id"`
		}
		_ = c.ShouldBindJSON(&in)
		isAdmin := false
		if users != nil {
			if user, err := users.ByID(c, userID(c)); err == nil && user != nil && user.Role == domain.RoleAdmin {
				isAdmin = true
			}
		} else if role, exists := c.Get(ctxRole); exists {
			current, _ := role.(domain.Role)
			isAdmin = current == domain.RoleAdmin
		}
		ticket, err := chat.AssignTicket(c, userID(c), paramID(c), in.UserID, isAdmin)
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"ticket": ticket})
	}
}

func staffTicketStatusHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			Status string `json:"status" binding:"required"`
		}
		if err := c.ShouldBindJSON(&in); err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		ticket, err := chat.SetTicketStatus(c, domain.TicketStatus(in.Status), paramID(c))
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"ticket": ticket})
	}
}

func staffChatUnreadHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		total, err := chat.StaffUnreadTotal(c)
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"unread": total})
	}
}

// ---------- support agents (کارشناسان پشتیبانی) ----------

func listAgentsHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		agents, err := chat.ListAgents(c)
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"agents": agents})
	}
}

func appointAgentHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			Mobile string `json:"mobile"`
			UserID uint   `json:"user_id"`
		}
		if err := c.ShouldBindJSON(&in); err != nil || (in.Mobile == "" && in.UserID == 0) {
			fail(c, domain.ErrValidation)
			return
		}
		user, err := chat.AppointAgent(c, in.Mobile, in.UserID)
		if err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"agent": gin.H{"id": user.ID, "name": user.Name, "mobile": user.Mobile}})
	}
}

func revokeAgentHandler(chat *usecase.SupportChatUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := chat.RevokeAgent(c, paramID(c)); err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"revoked": true})
	}
}

// ---------- attachment upload (audio/image) ----------

// The router applies a global 6MB BodyLimit; keep chat uploads comfortably
// below it since multipart encoding adds overhead.
const (
	chatImageMaxBytes = 4 << 20 // 4MB image
	chatAudioMaxBytes = 5 << 20 // 5MB voice note (~15+ min of opus audio)
)

func saveChatAttachment(c *gin.Context, field string, kind domain.ChatKind) (url, mime string, e error) {
	file, header, err := c.Request.FormFile(field)
	if err != nil {
		return "", "", domain.ErrValidation
	}
	defer file.Close()

	maxBytes := int64(chatImageMaxBytes)
	if kind == domain.ChatAudio {
		maxBytes = int64(chatAudioMaxBytes)
	}
	if header.Size <= 0 || header.Size > maxBytes {
		return "", "", domain.ErrValidation
	}

	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext == "" {
		// MediaRecorder often produces ".ogg/.webm" without a name; infer from mime.
		switch {
		case strings.Contains(header.Header.Get("Content-Type"), "webm"):
			ext = ".webm"
		case strings.Contains(header.Header.Get("Content-Type"), "ogg"):
			ext = ".ogg"
		case strings.Contains(header.Header.Get("Content-Type"), "mp4"):
			ext = ".mp4"
		default:
			ext = ".bin"
		}
	}
	allowed := map[string]bool{}
	if kind == domain.ChatImage {
		allowed = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	} else {
		allowed = map[string]bool{".webm": true, ".ogg": true, ".oga": true, ".mp3": true, ".m4a": true, ".aac": true, ".wav": true, ".mp4": true, ".opus": true}
	}
	if !allowed[ext] {
		return "", "", domain.ErrValidation
	}

	uploadDir := filepath.Join("uploads", "chat")
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		return "", "", domain.ErrInternal
	}
	filename := fmt.Sprintf("%s_%d%s", kind, time.Now().UnixNano(), ext)
	savePath := filepath.Join(uploadDir, filename)
	dst, err := os.OpenFile(savePath, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return "", "", domain.ErrInternal
	}
	_, copyErr := io.Copy(dst, file)
	closeErr := dst.Close()
	if copyErr != nil || closeErr != nil {
		_ = os.Remove(savePath)
		return "", "", domain.ErrInternal
	}
	return "/" + filepath.ToSlash(savePath), header.Header.Get("Content-Type"), nil
}

// Uploads are decoupled from tickets on purpose: an authed user or staff
// member posts the binary first, then references the returned URL in a
// message. Ticket ownership is enforced when the message is appended.
func uploadChatAttachmentHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		kind := domain.ChatKind(c.PostForm("kind"))
		if kind != domain.ChatImage && kind != domain.ChatAudio {
			fail(c, domain.ErrValidation)
			return
		}
		url, mime, err := saveChatAttachment(c, "file", kind)
		if err != nil {
			fail(c, err)
			return
		}
		created(c, gin.H{"url": url, "mime": mime, "kind": kind})
	}
}
