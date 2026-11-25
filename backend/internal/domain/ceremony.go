package domain

import (
	"context"
	"time"
)

// ── خدمات حضوری قرآنی ──
// این فایل مدل «فراخوان مراسم» و «قرارداد قطعی مراسم» است: برگزارکننده
// فراخوان می‌گذارد، قاریان پذیرش می‌دهند، برگزارکننده انتخاب می‌کند و
// قرارداد با ودیعه/تسویه از همان خط لوله مالی پلتفرم قطعی می‌شود.

// CeremonyCallStatus lifecycle of a ceremony call (فراخوان مراسم).
type CeremonyCallStatus string

const (
	CeremonySearching CeremonyCallStatus = "searching"
	CeremonyAssigned  CeremonyCallStatus = "assigned"
	CeremonyCompleted CeremonyCallStatus = "completed"
	CeremonyCanceled  CeremonyCallStatus = "canceled"
	CeremonyExpired   CeremonyCallStatus = "expired"
)

// CeremonyOfferStatus is one reciter's answer inside a ceremony call.
// waiting = live candidate; chosen = picked (a booking exists); released =
// not picked / call closed / teacher withdrew; declined = organizer rejected.
type CeremonyOfferStatus string

const (
	CeremonyOfferWaiting  CeremonyOfferStatus = "waiting"
	CeremonyOfferChosen   CeremonyOfferStatus = "chosen"
	CeremonyOfferReleased CeremonyOfferStatus = "released"
	CeremonyOfferDeclined CeremonyOfferStatus = "declined"
)

// CeremonyBookingStatus is the contract (قرارداد) lifecycle. deposit_pending
// = awaiting the organizer's escrow deposit; deposit_paid = escrow held, the
// ceremony is firm; settled = executed and the provider was paid out;
// cancelled = terminated (policy refunds already applied).
type CeremonyBookingStatus string

const (
	CeremonyBookingDepositPending CeremonyBookingStatus = "deposit_pending"
	CeremonyBookingDepositPaid    CeremonyBookingStatus = "deposit_paid"
	CeremonyBookingSettled        CeremonyBookingStatus = "settled"
	CeremonyBookingCancelled      CeremonyBookingStatus = "cancelled"
)

// Ceremony audiences — مراسم تک‌جنس یا مختلط.
const (
	CeremonyAudienceBoth     = "both"
	CeremonyAudienceBrothers = "brothers"
	CeremonyAudienceSisters  = "sisters"
)

// Official catalog modes: online teaching (existing) vs in-person services.
const (
	OfficialServiceModeOnline    = "online"
	OfficialServiceModeInPerson  = "in_person"
	PresenceServiceMaxPerTeacher = 12
)

// CeremonyCall is an organizer's broadcast request for in-person Quranic
// services (تلاوت، ختم، جشن قرآنی، اذان…). reciters_needed>1 supports group
// ceremonies (e.g. ختم گروهی): the call stays open until that many offers
// are chosen.
type CeremonyCall struct {
	ID                uint               `gorm:"primaryKey" json:"id"`
	OrganizerID       uint               `gorm:"index" json:"organizer_id"`
	OfficialServiceID uint               `gorm:"index" json:"official_service_id"`
	Title             string             `gorm:"size:160" json:"title"`
	Icon              string             `gorm:"size:30" json:"icon"`
	Note              string             `gorm:"size:300" json:"note"`
	ScheduledAt       time.Time          `gorm:"index" json:"scheduled_at"`
	City              string             `gorm:"size:80;index" json:"city"`
	VenueHint         string             `gorm:"size:255" json:"venue_hint"`
	GuestsCount       int                `json:"guests_count"`
	RecitersNeeded    int                `gorm:"default:1" json:"reciters_needed"`
	BudgetMin         int64              `json:"budget_min"`
	BudgetMax         int64              `json:"budget_max"`
	Audience          string             `gorm:"size:12;default:both" json:"audience"`
	Status            CeremonyCallStatus `gorm:"size:16;index;default:searching" json:"status"`
	Deadline          time.Time          `gorm:"index" json:"deadline"`
	DepositRate       int                `gorm:"default:50" json:"deposit_rate"`
	OfferCount        int                `gorm:"default:0" json:"offer_count"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`

	Organizer *User           `gorm:"foreignKey:OrganizerID" json:"-"`
	Offers    []CeremonyOffer `gorm:"foreignKey:CallID" json:"offers,omitempty"`

	// OrganizerName / OrganizerAvatarURL are display-only projections of
	// the organizer (populated by the usecase before serialization). The
	// full Organizer user row is never serialized: it carries the mobile
	// number and wallet balance, which must not leak into the reciters'
	// فراخوان inbox.
	OrganizerName      string `gorm:"-" json:"organizer_name,omitempty"`
	OrganizerAvatarURL string `gorm:"-" json:"organizer_avatar,omitempty"`
}

// CeremonyOffer is one reciter's پذیرش of a ceremony call. The unique
// (call_id, teacher_id) pair — same proven pattern as dispatch — keeps the
// race deterministic under concurrency.
type CeremonyOffer struct {
	ID          uint                `gorm:"primaryKey" json:"id"`
	CallID      uint                `gorm:"uniqueIndex:idx_ceremony_offer_call_teacher" json:"call_id"`
	TeacherID   uint                `gorm:"uniqueIndex:idx_ceremony_offer_call_teacher" json:"teacher_id"`
	Status      CeremonyOfferStatus `gorm:"size:16;index;default:waiting" json:"status"`
	Price       int64               `json:"price"`
	Message     string              `gorm:"size:300" json:"message"`
	RespondedAt time.Time           `json:"responded_at"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`

	Call    *CeremonyCall `gorm:"foreignKey:CallID" json:"call,omitempty"`
	Teacher *Teacher      `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
}

// CeremonyBooking is the firm contract between an organizer and one reciter
// for one ceremony. It is created either from a chosen offer (CallID>0) or
// as a direct booking from a presence service (CallID=0, OfferID=0).
type CeremonyBooking struct {
	ID                uint                  `gorm:"primaryKey" json:"id"`
	CallID            uint                  `gorm:"index" json:"call_id"`
	OfferID           uint                  `gorm:"index" json:"offer_id"`
	ProviderID        uint                  `gorm:"index" json:"provider_id"`
	ProviderUserID    uint                  `gorm:"index" json:"provider_user_id"`
	OrganizerID       uint                  `gorm:"index" json:"organizer_id"`
	OfficialServiceID uint                  `gorm:"index" json:"official_service_id"`
	ServiceTitle      string                `gorm:"size:160" json:"service_title"`
	ScheduledAt       time.Time             `gorm:"index" json:"scheduled_at"`
	City              string                `gorm:"size:80" json:"city"`
	Venue             string                `gorm:"size:255" json:"venue"`
	GuestsCount       int                   `json:"guests_count"`
	Audience          string                `gorm:"size:12;default:both" json:"audience"`
	Price             int64                 `json:"price"`
	CommissionRate    int                   `json:"commission_rate"`
	CommissionAmount  int64                 `json:"commission_amount"`
	DepositRate       int                   `json:"deposit_rate"`
	DepositAmount     int64                 `json:"deposit_amount"`
	Note              string                `gorm:"size:300" json:"note"`
	Status            CeremonyBookingStatus `gorm:"size:16;index;default:deposit_pending" json:"status"`
	SettledAt         *time.Time            `gorm:"index" json:"settled_at,omitempty"`
	CreatedAt         time.Time             `json:"created_at"`
	UpdatedAt         time.Time             `json:"updated_at"`

	Provider  *Teacher `gorm:"foreignKey:ProviderID" json:"provider,omitempty"`
	Organizer *User    `gorm:"foreignKey:OrganizerID" json:"organizer,omitempty"`
}

// PresenceService is a reciter's published in-person offering bound to an
// official in-person catalog entry (تلاوت مجلسی، ختم، اذان…).
type PresenceService struct {
	ID                uint      `gorm:"primaryKey" json:"id"`
	TeacherID         uint      `gorm:"index" json:"teacher_id"`
	OfficialServiceID uint      `gorm:"index" json:"official_service_id"`
	Title             string    `gorm:"size:160" json:"title"`
	BasePrice         int64     `json:"base_price"`
	Duration          int       `json:"duration"`
	Cities            string    `gorm:"size:255" json:"cities"`
	Note              string    `gorm:"size:300" json:"note"`
	Active            bool      `gorm:"default:true;index" json:"active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`

	Teacher         *Teacher         `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
	OfficialService *OfficialService `gorm:"foreignKey:OfficialServiceID" json:"official_service,omitempty"`
}

// ── Projections (learner/teacher-facing payloads) ──

// CeremonySampleView is a reciter's audio work sample reference.
type CeremonySampleView struct {
	ID     uint   `json:"id"`
	Title  string `json:"title"`
	URL    string `json:"url"`
	Length string `json:"length"`
}

// CeremonyProviderView is the reciter projection used in offers, the public
// presence catalog and booking views.
type CeremonyProviderView struct {
	TeacherID uint                 `json:"teacher_id"`
	Name      string               `json:"name"`
	AvatarURL string               `json:"avatar_url"`
	Tag       string               `json:"tag"`
	Field     string               `json:"field"`
	City      string               `json:"city"`
	Level     string               `json:"level"`
	Tier      string               `json:"tier"`
	Female    bool                 `json:"female"`
	Rating    float64              `json:"rating"`
	Reviews   int                  `json:"reviews"`
	Sessions  int                  `json:"sessions"`
	Bio       string               `json:"bio,omitempty"`
	Services  []PresenceService    `json:"services,omitempty"`
	Samples   []CeremonySampleView `json:"samples"`
}

// CeremonyOfferView is the organizer-facing offer with its reciter.
type CeremonyOfferView struct {
	ID          uint                  `json:"id"`
	CallID      uint                  `json:"call_id"`
	Status      CeremonyOfferStatus   `json:"status"`
	Price       int64                 `json:"price"`
	Message     string                `json:"message"`
	RespondedAt time.Time             `json:"responded_at"`
	Provider    *CeremonyProviderView `json:"provider"`
}

// CeremonyCallView is the organizer-facing call with its live offers.
type CeremonyCallView struct {
	Call   *CeremonyCall       `json:"call"`
	Offers []CeremonyOfferView `json:"offers"`
}

// CeremonyBookingParty is a compact person reference inside booking views.
type CeremonyBookingParty struct {
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Phone     string `json:"phone"`
}

// CeremonyBookingProvider is the provider side of a booking view.
type CeremonyBookingProvider struct {
	TeacherID uint   `json:"teacher_id"`
	Name      string `json:"name"`
	AvatarURL string `json:"avatar_url"`
	Tag       string `json:"tag"`
	City      string `json:"city"`
	Tier      string `json:"tier"`
	Phone     string `json:"phone"`
}

// CeremonyBookingView is the flat booking projection shared by organizer and
// provider roles (role selects what is visible: venue/phones unlock after
// the deposit is paid).
type CeremonyBookingView struct {
	ID               uint                    `json:"id"`
	CallID           uint                    `json:"call_id"`
	Role             string                  `json:"role"`
	Status           CeremonyBookingStatus   `json:"status"`
	ScheduledAt      time.Time               `json:"scheduled_at"`
	City             string                  `json:"city"`
	Venue            string                  `json:"venue"`
	GuestsCount      int                     `json:"guests_count"`
	Audience         string                  `json:"audience"`
	ServiceTitle     string                  `json:"service_title"`
	Price            int64                   `json:"price"`
	CommissionRate   int                     `json:"commission_rate"`
	CommissionAmount int64                   `json:"commission_amount"`
	DepositRate      int                     `json:"deposit_rate"`
	DepositAmount    int64                   `json:"deposit_amount"`
	Note             string                  `json:"note"`
	CreatedAt        time.Time               `json:"created_at"`
	SettledAt        *time.Time              `json:"settled_at"`
	Provider         CeremonyBookingProvider `json:"provider"`
	Organizer        CeremonyBookingParty    `json:"organizer"`
}

// TeacherCeremonyCallView is the reciter-facing open call in their inbox.
// VenueHint is stripped (confidential until the contract is firm).
// MatchesServices marks calls whose official service is one of the reciter's
// active presence services (price default + relevance ranking on the client).
type TeacherCeremonyCallView struct {
	Call            *CeremonyCall      `json:"call"`
	Accepted        bool               `json:"accepted"`
	MatchesServices bool               `json:"matches_services"`
	MyOffer         *CeremonyOfferView `json:"my_offer,omitempty"`
}

// CeremonyTeacherInbox is the reciter's پذیرش payload: open calls plus the
// offers they already placed.
type CeremonyTeacherInbox struct {
	Calls  []TeacherCeremonyCallView `json:"calls"`
	Offers []CeremonyOfferView       `json:"offers"`
}

// CeremonyRepository persists ceremony calls, offers, bookings and the
// reciters' presence services.
type CeremonyRepository interface {
	CreateCall(ctx context.Context, call *CeremonyCall) error
	CallByID(ctx context.Context, id uint) (*CeremonyCall, error)
	UpdateCall(ctx context.Context, call *CeremonyCall) error
	CallsForOrganizer(ctx context.Context, organizerID uint, limit int) ([]CeremonyCall, error)
	SearchingCallsForOrganizer(ctx context.Context, organizerID uint) ([]CeremonyCall, error)
	ExpireStaleCalls(ctx context.Context, now time.Time) (int64, error)
	// OpenCalls returns every searching call whose deadline is still open
	// and whose audience rule admits the given gender, excluding calls owned
	// by the teacher's own user account. Relevance to the teacher's presence
	// services is ranked by the usecase, not the store.
	OpenCalls(ctx context.Context, female bool, selfUserID uint, limit int) ([]CeremonyCall, error)

	CountOffers(ctx context.Context, callID uint) (int64, error)
	ChosenOfferCount(ctx context.Context, callID uint) (int64, error)
	CreateOffer(ctx context.Context, offer *CeremonyOffer) error
	OfferByID(ctx context.Context, id uint) (*CeremonyOffer, error)
	UpdateOffer(ctx context.Context, offer *CeremonyOffer) error
	OffersOfCall(ctx context.Context, callID uint) ([]CeremonyOffer, error)
	MyOfferOfCall(ctx context.Context, callID, teacherID uint) (*CeremonyOffer, error)
	OffersOfTeacher(ctx context.Context, teacherID uint, limit int) ([]CeremonyOffer, error)
	// ClaimOfferForChoose atomically flips a waiting offer to chosen — the
	// double-tap guard of ChooseOffer: under concurrent chooses exactly one
	// caller wins the offer and mints the booking.
	ClaimOfferForChoose(ctx context.Context, offerID uint) (bool, error)

	CreateBooking(ctx context.Context, b *CeremonyBooking) error
	BookingByID(ctx context.Context, id uint) (*CeremonyBooking, error)
	UpdateBooking(ctx context.Context, b *CeremonyBooking) error
	BookingsForUser(ctx context.Context, userID uint, limit int) ([]CeremonyBooking, error)

	CreatePresenceService(ctx context.Context, s *PresenceService) error
	PresenceServiceByID(ctx context.Context, id uint) (*PresenceService, error)
	UpdatePresenceService(ctx context.Context, s *PresenceService) error
	DeletePresenceService(ctx context.Context, teacherID, id uint) error
	PresenceServicesOfTeacher(ctx context.Context, teacherID uint) ([]PresenceService, error)
	PresenceServiceTeacherIDs(ctx context.Context, limit int) ([]uint, error)
	CountPresenceServicesOfTeacher(ctx context.Context, teacherID uint) (int64, error)
}
