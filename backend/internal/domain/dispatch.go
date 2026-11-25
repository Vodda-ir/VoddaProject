package domain

import "time"

// DispatchCallStatus enumerates the lifecycle of a teacher call-out
// (فراخوان استاد). A call starts as searching — broadcast to every eligible
// teacher teaching the requested topic — and ends matched, canceled or
// expired.
type DispatchCallStatus string

const (
	DispatchSearching DispatchCallStatus = "searching"
	DispatchMatched   DispatchCallStatus = "matched"
	DispatchCanceled  DispatchCallStatus = "canceled"
	DispatchExpired   DispatchCallStatus = "expired"
)

// DispatchOfferStatus enumerates the per-teacher response state inside a
// call. waiting = teacher accepted and is a live candidate; chosen = the
// learner confirmed this teacher (a booking was created); released = the
// teacher was not picked (learner chose someone else, canceled, or the
// teacher withdrew); declined = the learner explicitly rejected the
// candidate.
type DispatchOfferStatus string

const (
	DispatchOfferWaiting  DispatchOfferStatus = "waiting"
	DispatchOfferChosen   DispatchOfferStatus = "chosen"
	DispatchOfferReleased DispatchOfferStatus = "released"
	DispatchOfferDeclined DispatchOfferStatus = "declined"
)

// DispatchCall is a learner's broadcast request for one teaching topic.
// Learners either pick a time (ScheduledAt) or mark the call flexible
// ("در اسرع وقت"), in which case the final hour is agreed with the teacher.
type DispatchCall struct {
	ID                uint               `gorm:"primaryKey" json:"id"`
	LearnerID         uint               `gorm:"index" json:"learner_id"`
	OfficialServiceID uint               `gorm:"index" json:"official_service_id"`
	TopicTitle        string             `gorm:"size:160" json:"topic_title"`
	TopicIcon         string             `gorm:"size:30" json:"topic_icon"`
	Note              string             `gorm:"size:300" json:"note"`
	Flexible          bool               `json:"flexible"`
	ScheduledAt       *time.Time         `json:"scheduled_at,omitempty"`
	Status            DispatchCallStatus `gorm:"size:16;index;default:searching" json:"status"`
	MatchedTeacherID  *uint              `gorm:"index" json:"matched_teacher_id,omitempty"`
	SessionID         *uint              `gorm:"index" json:"session_id,omitempty"`
	ExpiresAt         time.Time          `gorm:"index" json:"expires_at"`
	OfferCount        int                `gorm:"default:0" json:"offer_count"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`

	Learner *User           `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
	Offers  []DispatchOffer `gorm:"foreignKey:CallID" json:"offers,omitempty"`
}

// DispatchOffer is one teacher's acceptance of a call. The unique
// (call_id, teacher_id) pair guarantees a teacher can answer a call once,
// which makes the "first to accept" race deterministic under concurrency.
type DispatchOffer struct {
	ID          uint                `gorm:"primaryKey" json:"id"`
	CallID      uint                `gorm:"uniqueIndex:idx_dispatch_offer_call_teacher" json:"call_id"`
	TeacherID   uint                `gorm:"uniqueIndex:idx_dispatch_offer_call_teacher" json:"teacher_id"`
	Status      DispatchOfferStatus `gorm:"size:16;index;default:waiting" json:"status"`
	ServiceID   uint                `json:"service_id"`
	ServiceDur  int                 `json:"service_duration"`
	ServicePric int64               `json:"service_price"`
	RespondedAt time.Time           `json:"responded_at"`
	CreatedAt   time.Time           `json:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at"`

	Call    *DispatchCall `gorm:"foreignKey:CallID" json:"call,omitempty"`
	Teacher *Teacher      `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
}

// DispatchIgnore records a teacher's dismissal of a call so the same call
// never reappears in their inbox after they reject it.
type DispatchIgnore struct {
	CallID    uint      `gorm:"primaryKey;autoIncrement:false" json:"call_id"`
	TeacherID uint      `gorm:"primaryKey;autoIncrement:false" json:"teacher_id"`
	CreatedAt time.Time `json:"created_at"`
}

// Candidate is the learner-facing projection of a waiting offer. It embeds
// everything the dispatch screen needs to present the teacher without
// leaking teacher-internal columns.
type Candidate struct {
	OfferID     uint      `json:"offer_id"`
	RespondedAt time.Time `json:"responded_at"`
	ServiceID   uint      `json:"service_id"`
	Duration    int       `json:"duration"`
	Price       int64     `json:"price"`
	TeacherID   uint      `json:"teacher_id"`
	Name        string    `json:"name"`
	AvatarURL   string    `json:"avatar_url"`
	Tag         string    `json:"tag"`
	Field       string    `json:"field"`
	City        string    `json:"city"`
	Level       string    `json:"level"`
	Tier        string    `json:"tier"`
	Female      bool      `json:"female"`
	Rating      float64   `json:"rating"`
	Reviews     int       `json:"reviews"`
	Sessions    int       `json:"sessions"`
	Bio         string    `json:"bio"`
}

// DispatchCallView is the learner-facing payload of a call with its live
// candidates in acceptance order. PaymentState mirrors the booked session's
// status when the call is matched — the client uses it to tell a genuinely
// reserved session (pending/confirmed) from an abandoned gateway window
// (awaiting_payment) instead of showing a premature success card.
type DispatchCallView struct {
	Call           *DispatchCall `json:"call"`
	Candidates     []Candidate   `json:"candidates"`
	TopicTeachable bool          `json:"topic_teachable"`
	PaymentState   string        `json:"payment_state,omitempty"`
}

// TeacherCallView is the teacher-facing projection of an open call, with a
// flag telling whether this teacher already accepted it.
type TeacherCallView struct {
	Call             *DispatchCall  `json:"call"`
	OfferID          uint           `json:"offer_id"`
	Accepted         bool           `json:"accepted"`
	MyOffer          *DispatchOffer `json:"my_offer,omitempty"`
	HasActiveBooking bool           `json:"has_active_booking"`
}

// TeacherInbox is the teacher's live dispatch payload: open calls to answer
// plus the offers awaiting the learner's decision.
type TeacherInbox struct {
	Calls  []TeacherCallView `json:"calls"`
	Offers []DispatchOffer   `json:"offers"`
}

// LiveCallSummary is the teacher dashboard badge payload.
type LiveCallSummary struct {
	OpenCalls   int `json:"open_calls"`
	WaitingMine int `json:"waiting_mine"`
}
