package http

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

// ValidateRouteID rejects malformed or zero :id path parameters before handlers
// can accidentally turn them into a not-found lookup for ID zero.
func ValidateRouteID() gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := c.Param("id")
		if raw != "" {
			id, err := strconv.ParseUint(raw, 10, 64)
			if err != nil || id == 0 {
				fail(c, domain.ErrValidation)
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

func createSupportMessageHandler(support *usecase.SupportUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		var in struct {
			Name    string `json:"name" binding:"required"`
			Contact string `json:"contact" binding:"required"`
			Message string `json:"message" binding:"required"`
		}
		if err := c.ShouldBindJSON(&in); err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		message, err := support.Create(c, usecase.CreateSupportMessageInput{
			Name: in.Name, Contact: in.Contact, Message: in.Message,
		})
		if err != nil {
			fail(c, err)
			return
		}
		created(c, gin.H{"id": message.ID, "received": true})
	}
}

func listSupportMessagesHandler(support *usecase.SupportUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		messages, total, err := support.List(c, domain.SupportMessageStatus(c.Query("status")), queryInt(c, "limit", 30), queryInt(c, "offset", 0))
		if err != nil {
			fail(c, err)
			return
		}
		okList(c, messages, total)
	}
}

func resolveSupportMessageHandler(support *usecase.SupportUsecase) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := support.Resolve(c, paramID(c)); err != nil {
			fail(c, err)
			return
		}
		ok(c, gin.H{"resolved": true})
	}
}

func listAdminAuditHandler(audit domain.AdminAuditRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		entries, total, err := audit.List(c, queryInt(c, "limit", 50), queryInt(c, "offset", 0))
		if err != nil {
			fail(c, err)
			return
		}
		okList(c, entries, total)
	}
}

// AuditAdminMutations records successful privileged writes. Audit persistence is
// best-effort after the business action: a logging outage must not cause clients
// to retry an already-committed financial or moderation mutation.
func AuditAdminMutations(audit domain.AdminAuditRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
		if c.Request.Method == http.MethodGet || c.Request.Method == http.MethodHead || c.Request.Method == http.MethodOptions || c.Writer.Status() >= 400 {
			return
		}
		path := c.FullPath()
		if path == "" {
			path = c.Request.URL.Path
		}
		targetType := "admin"
		parts := strings.Split(strings.Trim(path, "/"), "/")
		if len(parts) >= 4 {
			targetType = parts[3]
		}
		metadata, _ := json.Marshal(map[string]any{"method": c.Request.Method, "path": path, "status": c.Writer.Status()})
		entry := &domain.AdminAuditLog{
			ActorID: userID(c), Action: c.Request.Method + " " + path,
			TargetType: targetType, TargetID: paramID(c),
			RequestID: c.GetString("request_id"), Metadata: string(metadata),
		}
		if err := audit.Create(c, entry); err != nil {
			log.Printf("admin audit write failed request_id=%s: %v", c.GetString("request_id"), err)
		}
	}
}
