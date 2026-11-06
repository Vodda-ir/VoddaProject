package http

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"

	"vodda/backend/internal/domain"
)

// LiveEvent is one signaling/classroom message relayed inside a room.
type LiveEvent struct {
	Seq     uint64          `json:"seq"`
	From    uint            `json:"from"`
	Role    string          `json:"role"`
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
	At      int64           `json:"at"`
}

const (
	liveHistoryLimit  = 600
	liveSubBuffer     = 512
	liveRoomLinger    = 45 * time.Second
	liveTicketTTL     = 90 * time.Second
	liveLongPollWait  = 18 * time.Second
	liveEventMaxBytes = 32 << 10
)

// liveSubscriber is one connected participant (WebSocket or HTTP poller).
type liveSubscriber struct {
	userID uint
	role   domain.Role
	ch     chan *LiveEvent
}

// liveRoom holds the relay state of one session's classroom.
type liveRoom struct {
	id      uint
	seq     uint64
	history []*LiveEvent
	mu      sync.Mutex
	subs    map[*liveSubscriber]struct{}
	emptyAt time.Time
}

func (r *liveRoom) append(ev *LiveEvent) {
	r.seq = ev.Seq
	r.history = append(r.history, ev)
	if len(r.history) > liveHistoryLimit {
		r.history = r.history[len(r.history)-liveHistoryLimit:]
	}
}

// LiveHub relays classroom events for all active sessions in memory.
type LiveHub struct {
	mu      sync.Mutex
	rooms   map[uint]*liveRoom
	tickets map[string]*liveTicket
	upgrader websocket.Upgrader
}

type liveTicket struct {
	userID    uint
	role      domain.Role
	expiresAt time.Time
}

// NewLiveHub builds the classroom relay hub.
func NewLiveHub() *LiveHub {
	return &LiveHub{
		rooms:   map[uint]*liveRoom{},
		tickets: map[string]*liveTicket{},
		upgrader: websocket.Upgrader{
			ReadBufferSize:  4096,
			WriteBufferSize: 4096,
			// Authentication is enforced by the ticket check before the
			// upgrade; the browser may send any origin since api.vodda.ir
			// fronts the endpoint.
			CheckOrigin: func(*http.Request) bool { return true },
		},
	}
}

// MintTicket issues a single-use short-lived ticket bound to a user identity.
func (h *LiveHub) MintTicket(userID uint, role domain.Role) (string, time.Time) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", time.Time{}
	}
	ticket := hex.EncodeToString(raw)
	expires := time.Now().Add(liveTicketTTL)

	h.mu.Lock()
	defer h.mu.Unlock()
	h.sweepTicketsLocked()
	h.tickets[ticket] = &liveTicket{userID: userID, role: role, expiresAt: expires}
	return ticket, expires
}

// RedeemTicket consumes a ticket and returns the bound identity.
func (h *LiveHub) RedeemTicket(ticket string) (uint, domain.Role, bool) {
	h.mu.Lock()
	defer h.mu.Unlock()
	entry, ok := h.tickets[ticket]
	if !ok || time.Now().After(entry.expiresAt) {
		delete(h.tickets, ticket)
		return 0, "", false
	}
	delete(h.tickets, ticket) // single-use
	return entry.userID, entry.role, true
}

func (h *LiveHub) sweepTicketsLocked() {
	now := time.Now()
	for key, entry := range h.tickets {
		if now.After(entry.expiresAt) {
			delete(h.tickets, key)
		}
	}
}

func (h *LiveHub) room(id uint) *liveRoom {
	h.mu.Lock()
	defer h.mu.Unlock()
	room, ok := h.rooms[id]
	if !ok {
		room = &liveRoom{id: id, subs: map[*liveSubscriber]struct{}{}}
		h.rooms[id] = room
	}
	room.emptyAt = time.Time{}
	return room
}

// Join registers a subscriber for a room and returns events already buffered
// (so HTTP pollers can resume) plus a release function.
func (h *LiveHub) Join(sessionID uint, userID uint, role domain.Role, after uint64) (*liveSubscriber, []*LiveEvent, func()) {
	room := h.room(sessionID)
	sub := &liveSubscriber{userID: userID, role: role, ch: make(chan *LiveEvent, liveSubBuffer)}

	room.mu.Lock()
	room.subs[sub] = struct{}{}
	var backlog []*LiveEvent
	if after > 0 {
		for _, ev := range room.history {
			if ev.Seq > after {
				backlog = append(backlog, ev)
			}
		}
	}
	room.mu.Unlock()

	release := func() {
		room.mu.Lock()
		delete(room.subs, sub)
		if len(room.subs) == 0 {
			room.emptyAt = time.Now()
		}
		room.mu.Unlock()
		close(sub.ch)
	}
	return sub, backlog, release
}

// Publish fans out one event to every subscriber of a room and stores it in
// the replay history for pollers.
func (h *LiveHub) Publish(sessionID uint, from uint, role domain.Role, eventType string, payload json.RawMessage) *LiveEvent {
	room := h.room(sessionID)

	room.mu.Lock()
	room.seq++
	ev := &LiveEvent{
		Seq:     room.seq,
		From:    from,
		Role:    string(role),
		Type:    eventType,
		Payload: payload,
		At:      time.Now().UnixMilli(),
	}
	room.append(ev)
	targets := make([]*liveSubscriber, 0, len(room.subs))
	for sub := range room.subs {
		targets = append(targets, sub)
	}
	room.mu.Unlock()

	for _, sub := range targets {
		select {
		case sub.ch <- ev:
		default: // slow consumer: drop rather than block the publisher
		}
	}
	return ev
}

// Subscribe waits for the next events of a subscriber up to the long-poll
// budget, returning whatever arrives (never blocks forever).
func (h *LiveHub) Subscribe(sub *liveSubscriber, deadline time.Time) []*LiveEvent {
	var batch []*LiveEvent
	timer := time.NewTimer(time.Until(deadline))
	defer timer.Stop()
	for {
		select {
		case ev, ok := <-sub.ch:
			if !ok {
				return batch
			}
			batch = append(batch, ev)
			// deliver small batches promptly for snappy signaling
			if len(batch) >= 64 {
				return batch
			}
		case <-timer.C:
			return batch
		}
	}
}

// Sweep closes idle rooms periodically (called from a background goroutine).
func (h *LiveHub) Sweep() {
	h.mu.Lock()
	defer h.mu.Unlock()
	now := time.Now()
	for id, room := range h.rooms {
		room.mu.Lock()
		idle := len(room.subs) == 0 && !room.emptyAt.IsZero() && now.Sub(room.emptyAt) > liveRoomLinger
		room.mu.Unlock()
		if idle {
			delete(h.rooms, id)
		}
	}
}
