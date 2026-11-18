package http

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"vodda/backend/internal/domain"
	"vodda/backend/internal/usecase"
)

// ── خدمات حضوری قرآنی — ceremony HTTP handlers ──

// CreateCeremonyCall handles POST /ceremony/calls — the organizer broadcasts
// an in-person ceremony request to eligible reciters.
func (h *Handler) CreateCeremonyCall(c *gin.Context) {
	var in struct {
		OfficialServiceID uint   `json:"official_service_id" binding:"required"`
		Note              string `json:"note"`
		ScheduledAt       string `json:"scheduled_at" binding:"required"`
		City              string `json:"city" binding:"required"`
		VenueHint         string `json:"venue_hint"`
		GuestsCount       int    `json:"guests_count"`
		RecitersNeeded    int    `json:"reciters_needed"`
		BudgetMin         int64  `json:"budget_min"`
		BudgetMax         int64  `json:"budget_max"`
		Audience          string `json:"audience"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	scheduledAt, err := time.Parse(time.RFC3339, in.ScheduledAt)
	if err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	view, err := h.Ceremony.CreateCall(c, userID(c), usecase.CreateCeremonyCallInput{
		OfficialServiceID: in.OfficialServiceID,
		Note:              in.Note,
		ScheduledAt:       scheduledAt,
		City:              in.City,
		VenueHint:         in.VenueHint,
		GuestsCount:       in.GuestsCount,
		RecitersNeeded:    in.RecitersNeeded,
		BudgetMin:         in.BudgetMin,
		BudgetMax:         in.BudgetMax,
		Audience:          in.Audience,
	})
	if err != nil {
		fail(c, err)
		return
	}
	created(c, view)
}

// MyCeremonyCalls handles GET /ceremony/calls.
func (h *Handler) MyCeremonyCalls(c *gin.Context) {
	views, err := h.Ceremony.OrganizerCalls(c, userID(c), queryInt(c, "limit", 50))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, views)
}

// CeremonyCallDetail handles GET /ceremony/calls/:id.
func (h *Handler) CeremonyCallDetail(c *gin.Context) {
	view, err := h.Ceremony.CallViewForOrganizer(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

// ChooseCeremonyOffer handles POST /ceremony/calls/:id/choose — picks a
// reciter and creates the deposit_pending contract.
func (h *Handler) ChooseCeremonyOffer(c *gin.Context) {
	var in struct {
		OfferID uint `json:"offer_id" binding:"required"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	view, err := h.Ceremony.ChooseOffer(c, userID(c), paramID(c), in.OfferID)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

// CancelCeremonyCall handles POST /ceremony/calls/:id/cancel.
func (h *Handler) CancelCeremonyCall(c *gin.Context) {
	if err := h.Ceremony.CancelCall(c, userID(c), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"canceled": true})
}

// DirectCeremonyBooking handles POST /ceremony/bookings/direct — books a
// reciter straight from their presence service.
func (h *Handler) DirectCeremonyBooking(c *gin.Context) {
	var in struct {
		PresenceServiceID uint   `json:"presence_service_id" binding:"required"`
		ScheduledAt       string `json:"scheduled_at" binding:"required"`
		City              string `json:"city" binding:"required"`
		VenueHint         string `json:"venue_hint"`
		Note              string `json:"note"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	scheduledAt, err := time.Parse(time.RFC3339, in.ScheduledAt)
	if err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	view, err := h.Ceremony.DirectBooking(c, userID(c), usecase.DirectBookingInput{
		PresenceServiceID: in.PresenceServiceID,
		ScheduledAt:       scheduledAt,
		City:              in.City,
		VenueHint:         in.VenueHint,
		Note:              in.Note,
	})
	if err != nil {
		fail(c, err)
		return
	}
	created(c, view)
}

// MyCeremonyBookings handles GET /ceremony/bookings.
func (h *Handler) MyCeremonyBookings(c *gin.Context) {
	views, err := h.Ceremony.MyBookings(c, userID(c), queryInt(c, "limit", 50))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, views)
}

// CeremonyBookingDetail handles GET /ceremony/bookings/:id.
func (h *Handler) CeremonyBookingDetail(c *gin.Context) {
	view, err := h.Ceremony.BookingView(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

// PayCeremonyDeposit handles POST /ceremony/bookings/:id/pay — wallet path
// settles instantly, gateway path returns the OnlinePG token.
func (h *Handler) PayCeremonyDeposit(c *gin.Context) {
	var in struct {
		Method   string `json:"method" binding:"required"`
		ReturnTo string `json:"return_to"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	result, err := h.Ceremony.PayDeposit(c, userID(c), paramID(c), in.Method, in.ReturnTo)
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, result)
}

// ConfirmCeremonyBooking handles POST /ceremony/bookings/:id/confirm — the
// organizer confirms the executed ceremony and the reciter is paid out.
func (h *Handler) ConfirmCeremonyBooking(c *gin.Context) {
	view, err := h.Ceremony.ConfirmBooking(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

// CancelCeremonyBooking handles POST /ceremony/bookings/:id/cancel —
// applies the escrow refund policy.
func (h *Handler) CancelCeremonyBooking(c *gin.Context) {
	view, err := h.Ceremony.CancelBooking(c, userID(c), paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

// ── Reciter (teacher) side ──

// TeacherCeremonyInbox handles GET /teacher/ceremony/inbox.
func (h *Handler) TeacherCeremonyInbox(c *gin.Context) {
	inbox, err := h.Ceremony.TeacherCeremonyInbox(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, inbox)
}

// TeacherCeremonyAccept handles POST /teacher/ceremony/calls/:id/accept.
func (h *Handler) TeacherCeremonyAccept(c *gin.Context) {
	var in struct {
		Price   *int64 `json:"price"`
		Message string `json:"message"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	view, err := h.Ceremony.TeacherAccept(c, userID(c), paramID(c), in.Price, in.Message)
	if err != nil {
		fail(c, err)
		return
	}
	created(c, view)
}

// TeacherCeremonyWithdraw handles POST /teacher/ceremony/offers/:id/withdraw.
func (h *Handler) TeacherCeremonyWithdraw(c *gin.Context) {
	if err := h.Ceremony.TeacherWithdraw(c, userID(c), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"withdrawn": true})
}

// ── Presence services ──

// MyPresenceServices handles GET /teacher/presence-services.
func (h *Handler) MyPresenceServices(c *gin.Context) {
	services, err := h.Ceremony.MyPresenceServices(c, userID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, services)
}

func presenceServiceInput(in struct {
	OfficialServiceID uint   `json:"official_service_id" binding:"required"`
	BasePrice         int64  `json:"base_price"`
	Duration          int    `json:"duration"`
	Cities            string `json:"cities"`
	Note              string `json:"note"`
}) usecase.PresenceServiceInput {
	return usecase.PresenceServiceInput{
		OfficialServiceID: in.OfficialServiceID,
		BasePrice:         in.BasePrice,
		Duration:          in.Duration,
		Cities:            in.Cities,
		Note:              in.Note,
	}
}

// AddPresenceService handles POST /teacher/presence-services.
func (h *Handler) AddPresenceService(c *gin.Context) {
	var in struct {
		OfficialServiceID uint   `json:"official_service_id" binding:"required"`
		BasePrice         int64  `json:"base_price"`
		Duration          int    `json:"duration"`
		Cities            string `json:"cities"`
		Note              string `json:"note"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	service, err := h.Ceremony.AddPresenceService(c, userID(c), presenceServiceInput(in))
	if err != nil {
		fail(c, err)
		return
	}
	created(c, service)
}

// UpdatePresenceService handles PUT /teacher/presence-services/:id.
func (h *Handler) UpdatePresenceService(c *gin.Context) {
	var in struct {
		OfficialServiceID uint   `json:"official_service_id" binding:"required"`
		BasePrice         int64  `json:"base_price"`
		Duration          int    `json:"duration"`
		Cities            string `json:"cities"`
		Note              string `json:"note"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		fail(c, domain.ErrValidation)
		return
	}
	service, err := h.Ceremony.UpdatePresenceService(c, userID(c), paramID(c), presenceServiceInput(in))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, service)
}

// DeletePresenceService handles DELETE /teacher/presence-services/:id.
func (h *Handler) DeletePresenceService(c *gin.Context) {
	if err := h.Ceremony.DeletePresenceService(c, userID(c), paramID(c)); err != nil {
		fail(c, err)
		return
	}
	ok(c, gin.H{"deleted": true})
}

// ── Public presence catalog ──

// PresenceProviders handles GET /presence/providers — public reciter catalog.
func (h *Handler) PresenceProviders(c *gin.Context) {
	city := c.Query("city")
	var officialServiceID uint
	if v := c.Query("official_service_id"); v != "" {
		id, err := parseUintParam(v)
		if err != nil {
			fail(c, domain.ErrValidation)
			return
		}
		officialServiceID = id
	}
	views, err := h.Ceremony.PresenceProviders(c, city, officialServiceID, queryInt(c, "limit", 60))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, views)
}

// PresenceProviderDetail handles GET /presence/providers/:id.
func (h *Handler) PresenceProviderDetail(c *gin.Context) {
	view, err := h.Ceremony.PresenceProvider(c, paramID(c))
	if err != nil {
		fail(c, err)
		return
	}
	ok(c, view)
}

func parseUintParam(v string) (uint, error) {
	var id uint64
	var err error
	for _, r := range v {
		if r < '0' || r > '9' {
			return 0, domain.ErrValidation
		}
		id = id*10 + uint64(r-'0')
	}
	_ = err
	if id == 0 {
		return 0, domain.ErrValidation
	}
	return uint(id), nil
}

var _ = http.StatusOK // keep net/http import when handlers change
