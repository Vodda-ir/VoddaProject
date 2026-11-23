package http

import (
	"context"
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"

	"vodda/backend/internal/domain"
)

const (
	liveTypeChat       = "chat"
	liveTypeWhiteboard = "wb"
	liveTypeReading    = "reading"
	liveTypeControl    = "control"
	liveTypeOffer      = "offer"
	liveTypeAnswer     = "answer"
	liveTypeIce        = "ice"
	liveTypeSystem     = "system"
)

var (
	liveSweepOnce sync.Once
)

// liveIdentity resolves the calling user for the classroom endpoints.
func liveIdentity(c *gin.Context) (uint, domain.Role, bool) {
	value, exists := c.Get(ctxUserID)
	if !exists {
		return 0, "", false
	}
	uid, _ := value.(uint)
	role, _ := c.Get(ctxRole)
	roleValue, _ := role.(domain.Role)
	return uid, roleValue, uid > 0
}

// LiveTicket issues a short-lived single-use WebSocket ticket. The web panel
// stores its JWT in an HttpOnly cookie and cannot attach headers to a WebSocket
// handshake, so the browser exchanges the cookie for this ticket first.
func (h *Handler) LiveTicket(c *gin.Context) {
	uid, role, identOk := liveIdentity(c)
	if !identOk {
		fail(c, domain.ErrUnauthorized)
		return
	}
	ticket, _ := h.liveHub().MintTicket(uid, role)
	if ticket == "" {
		fail(c, domain.ErrInternal)
		return
	}
	ok(c, gin.H{"ticket": ticket})
}

// LiveSignal is the HTTP fallback send path (used when WebSockets are blocked,
// e.g. by restrictive CDNs or proxies).
func (h *Handler) LiveSignal(c *gin.Context) {
	uid, role, identOk := liveIdentity(c)
	if !identOk {
		fail(c, domain.ErrUnauthorized)
		return
	}
	var in struct {
		Session uint            `json:"session" binding:"required"`
		Type    string          `json:"type" binding:"required"`
		Payload json.RawMessage `json:"payload"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	if !liveEventTypeAllowed(in.Type) || (in.Payload != nil && len(in.Payload) > liveEventMaxBytes) {
		fail(c, domain.ErrValidation)
		return
	}
	session, _, err := h.Session.LiveAccess(c.Request.Context(), uid, role, in.Session)
	if err != nil {
		fail(c, err)
		return
	}
	ev := h.liveHub().Publish(session.ID, uid, role, in.Type, in.Payload)
	ok(c, gin.H{"seq": ev.Seq})
}

// LiveEvents is the HTTP fallback receive path: a long-poll that returns as
// soon as new events arrive or the wait budget elapses.
func (h *Handler) LiveEvents(c *gin.Context) {
	uid, role, identOk := liveIdentity(c)
	if !identOk {
		fail(c, domain.ErrUnauthorized)
		return
	}
	sessionID := uint(queryInt(c, "session", 0))
	after := uint64(queryInt(c, "after", 0))
	if sessionID == 0 {
		fail(c, domain.ErrValidation)
		return
	}
	if _, _, err := h.Session.LiveAccess(c.Request.Context(), uid, role, sessionID); err != nil {
		fail(c, err)
		return
	}

	sub, backlog, release := h.liveHub().Join(sessionID, uid, role, after)
	defer release()

	events := backlog
	if len(events) == 0 {
		ctx, cancel := context.WithTimeout(c.Request.Context(), liveLongPollWait)
		defer cancel()
		done := make(chan []*LiveEvent, 1)
		go func() { done <- h.liveHub().Subscribe(sub, time.Now().Add(liveLongPollWait)) }()
		select {
		case batch := <-done:
			events = batch
		case <-ctx.Done():
			events = nil
		}
	}

	if events == nil {
		events = []*LiveEvent{}
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, gin.H{"data": events})
}

// LiveWS upgrades to a WebSocket and pumps classroom events both ways.
func (h *Handler) LiveWS(c *gin.Context) {
	sessionID := uint(queryInt(c, "session", 0))
	ticket := strings.TrimSpace(c.Query("ticket"))
	if sessionID == 0 || ticket == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "missing ticket"})
		return
	}
	// after optionally resumes from the client's cursor (a poller upgrading
	// to a socket can skip already-seen events); a bad or out-of-range value
	// falls back to 0 so a full replay stays the safe default.
	after := uint64(0)
	if afterStr := c.Query("after"); afterStr != "" {
		if value, err := strconv.ParseUint(afterStr, 10, 64); err == nil {
			if value > 1<<31 {
				value = 1 << 31
			}
			after = value
		}
	}
	uid, role, valid := h.liveHub().RedeemTicket(ticket)
	if !valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid ticket"})
		return
	}
	session, roomRole, err := h.Session.LiveAccess(c.Request.Context(), uid, role, sessionID)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not allowed"})
		return
	}

	conn, err := h.liveHub().upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	hub := h.liveHub()
	sub, backlog, release := hub.Join(session.ID, uid, roomRole, after)
	defer release()

	_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	conn.SetPongHandler(func(string) error {
		_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		return nil
	})

	// Replay the signaling backlog synchronously: history first, then the
	// join announce below, then live events from the writer goroutine. Join
	// subscribed us atomically before snapshotting history, so nothing
	// published after Join is lost — it queues on sub.ch until the writer
	// starts. Only signaling-critical types are replayed; stale chat/control
	// frames from a previous class-life must not poison a fresh session.
	for _, ev := range backlog {
		switch ev.Type {
		case liveTypeOffer, liveTypeAnswer, liveTypeIce, liveTypeSystem:
		default:
			continue
		}
		_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
		if err := conn.WriteJSON(ev); err != nil {
			_ = conn.Close()
			return
		}
	}

	// writer: hub -> socket
	writeDone := make(chan struct{})
	go func() {
		defer close(writeDone)
		ping := time.NewTicker(25 * time.Second)
		defer ping.Stop()
		for {
			select {
			case ev, okChan := <-sub.ch:
				if !okChan {
					_ = conn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseGoingAway, "room closed"))
					return
				}
				_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteJSON(ev); err != nil {
					_ = conn.Close()
					return
				}
			case <-ping.C:
				_ = conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
				if err := conn.WriteMessage(websocket.PingMessage, nil); err != nil {
					_ = conn.Close()
					return
				}
			}
		}
	}()

	hub.Publish(session.ID, uid, roomRole, liveTypeSystem, mustJSON(gin.H{"action": "join", "user_id": uid, "role": string(roomRole)}))

	// reader: socket -> hub
	defer func() {
		_ = conn.Close()
		<-writeDone
		hub.Publish(session.ID, uid, roomRole, liveTypeSystem, mustJSON(gin.H{"action": "leave", "user_id": uid, "role": string(roomRole)}))
	}()
	for {
		messageType, raw, err := conn.ReadMessage()
		if err != nil {
			return
		}
		if messageType != websocket.TextMessage || len(raw) > liveEventMaxBytes {
			continue
		}
		var frame struct {
			Type    string          `json:"type"`
			Payload json.RawMessage `json:"payload"`
		}
		if err := json.Unmarshal(raw, &frame); err != nil || !liveEventTypeAllowed(frame.Type) {
			continue
		}
		_ = conn.SetReadDeadline(time.Now().Add(90 * time.Second))
		hub.Publish(session.ID, uid, roomRole, frame.Type, frame.Payload)
	}
}

// liveHub lazily builds the process-wide classroom hub.
func (h *Handler) liveHub() *LiveHub {
	liveSweepOnce.Do(func() {
		go func() {
			ticker := time.NewTicker(2 * time.Minute)
			defer ticker.Stop()
			for range ticker.C {
				h.Live.Sweep()
			}
		}()
	})
	return h.Live
}

func liveEventTypeAllowed(eventType string) bool {
	switch eventType {
	case liveTypeChat, liveTypeWhiteboard, liveTypeReading, liveTypeControl, liveTypeOffer, liveTypeAnswer, liveTypeIce, "media-ready":
		return true
	}
	return false
}

func mustJSON(v any) json.RawMessage {
	raw, err := json.Marshal(v)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return raw
}
