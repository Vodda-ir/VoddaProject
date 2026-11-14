// Package domain holds the core business entities and repository contracts.
// It has no dependency on any framework or database driver.
package domain

import (
        "strings"
        "time"
)

// Role enumerates account roles.
type Role string

const (
        RoleLearner Role = "learner"
        RoleTeacher Role = "teacher"
        RoleAdmin   Role = "admin"
)

// TeacherStatus enumerates the approval state of a teacher profile.
type TeacherStatus string

const (
        TeacherPending  TeacherStatus = "pending"
        TeacherApproved TeacherStatus = "approved"
        TeacherRejected TeacherStatus = "rejected"
)

// SessionStatus enumerates booking/session lifecycle states.
type SessionStatus string

const (
        SessionPending   SessionStatus = "pending"
        SessionConfirmed SessionStatus = "confirmed"
        SessionDone      SessionStatus = "done"
        SessionCanceled  SessionStatus = "canceled"
        // SessionAwaitingPayment holds a slot while the learner completes the
        // gateway payment. It is invisible to the teacher and expires after a
        // payment window; on a successful callback it becomes pending.
        SessionAwaitingPayment SessionStatus = "awaiting_payment"
)

// TxType enumerates wallet transaction kinds.
type TxType string

const (
        TxCharge     TxType = "charge"
        TxSession    TxType = "session"
        TxEarning    TxType = "earning"
        TxWithdrawal TxType = "withdrawal"
        TxCommission TxType = "commission"
        TxAdjust     TxType = "adjust"
)

// WithdrawalStatus enumerates payout request states.
type WithdrawalStatus string

const (
        WithdrawalPending  WithdrawalStatus = "pending"
        WithdrawalPaid     WithdrawalStatus = "paid"
        WithdrawalRejected WithdrawalStatus = "rejected"
)

// User is an account. A user may also have a Teacher profile.
type User struct {
        ID        uint      `gorm:"primaryKey" json:"id"`
        Name      string    `gorm:"size:120" json:"name"`
        Mobile    string    `gorm:"size:15;uniqueIndex" json:"mobile"`
        Role      Role      `gorm:"size:16;default:learner;index" json:"role"`
        City      string    `gorm:"size:80" json:"city"`
        AvatarURL string    `gorm:"size:255" json:"avatar_url"`
        Bio       string    `gorm:"size:500" json:"bio"`
        Active    bool      `gorm:"default:true" json:"active"`
        Wallet    int64     `gorm:"default:0" json:"wallet"`
        CreatedAt time.Time `json:"created_at"`
        UpdatedAt time.Time `json:"updated_at"`

        Teacher *Teacher `gorm:"foreignKey:UserID" json:"teacher,omitempty"`
}

// Teacher is the professional profile attached to a teacher-role user.
type Teacher struct {
        ID        uint     `gorm:"primaryKey" json:"id"`
        UserID    uint     `gorm:"uniqueIndex" json:"user_id"`
        Field     string   `gorm:"size:60" json:"field"`
        Tag       string   `gorm:"size:60" json:"tag"`
        Level     string   `gorm:"size:30" json:"level"`
        City      string   `gorm:"size:80;index" json:"city"`
        Bio       string   `gorm:"size:1000" json:"bio"`
        Skills    string   `gorm:"size:500" json:"-"`
        SkillList []string `gorm:"-" json:"skills"`
        Price30   int64    `json:"price30"`
        Price60   int64    `json:"price60"`
        Female    bool     `json:"female"`
        Verified  bool     `json:"verified"`
        Available bool     `gorm:"default:true" json:"available"`
        // Tier رتبه‌بندی کیفی استاد: "" | "international" (درجه یک/بین‌المللی)
        // | "grade2" | "grade3" — تیک نشان کنار نام استاد از همین تعیین می‌شود.
        Tier   string        `gorm:"size:16;default:''" json:"tier"`
        Status TeacherStatus `gorm:"size:16;default:pending;index" json:"status"`
        // DispatchSeenAt updates whenever the teacher polls the dispatch inbox;
        // it doubles as a lightweight online-presence signal for the فراخوان.
        DispatchSeenAt *time.Time `gorm:"index" json:"dispatch_seen_at,omitempty"`
        Rating         float64    `gorm:"default:0" json:"rating"`
        Reviews        int        `gorm:"default:0" json:"reviews"`
        Sessions       int        `gorm:"default:0" json:"sessions"`
        Followers      int        `gorm:"default:0" json:"followers"`
        CreatedAt      time.Time  `json:"created_at"`
        UpdatedAt      time.Time  `json:"updated_at"`

        User     *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
        Services []Service `gorm:"foreignKey:TeacherID" json:"services,omitempty"`
        Samples  []Sample  `gorm:"foreignKey:TeacherID" json:"samples,omitempty"`
}

// Normalize prepares persistence-backed fields for API/domain use without
// coupling the domain package to a specific ORM lifecycle hook.
func (t *Teacher) Normalize() {
        if t == nil {
                return
        }
        t.SkillList = nil
        for _, skill := range strings.Split(t.Skills, ",") {
                if skill = strings.TrimSpace(skill); skill != "" {
                        t.SkillList = append(t.SkillList, skill)
                }
        }
}

// Service is a bookable offering of a teacher. The title is always sourced
// from the platform's official service catalog (OfficialServiceID); teachers
// cannot invent custom service titles.
type Service struct {
        ID                uint     `gorm:"primaryKey" json:"id"`
        TeacherID         uint     `gorm:"index" json:"teacher_id"`
        OfficialServiceID *uint    `gorm:"index" json:"official_service_id,omitempty"`
        Title             string   `gorm:"size:160" json:"title"`
        Duration          int      `json:"duration"`
        Price             int64    `json:"price"`
        Icon              string   `gorm:"size:30" json:"icon"`
        Active            bool     `gorm:"default:false" json:"active"`
        Teacher           *Teacher `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
}

// OfficialService is a platform-approved service catalog entry. Teachers can
// only publish bookable services by selecting one of these entries, which
// guarantees every service title on the marketplace is official and verified.
// Mode separates online teaching ("online") from in-person services
// ("in_person" — مراسم تلاوت، ختم، اذان…).
type OfficialService struct {
        ID          uint      `gorm:"primaryKey" json:"id"`
        Category    string    `gorm:"size:60;index" json:"category"`
        Title       string    `gorm:"size:160" json:"title"`
        Description string    `gorm:"size:500" json:"description"`
        Icon        string    `gorm:"size:30" json:"icon"`
        SortOrder   int       `json:"sort_order"`
        Active      bool      `gorm:"default:true" json:"active"`
        Mode        string    `gorm:"size:16;default:online;index" json:"mode"`
        // RequiresAudio forces reciters to attach a work sample when accepting
        // in-person calls of this entry (quality bar for ceremonies).
        RequiresAudio bool     `gorm:"default:false" json:"requires_audio"`
        // GroupCapable marks entries a group of reciters can perform together
        // (ختم گروهی، تواشیح) — reciters_needed > 1 is meaningful.
        GroupCapable bool      `gorm:"default:false" json:"group_capable"`
        CreatedAt   time.Time `json:"created_at"`
        UpdatedAt   time.Time `json:"updated_at"`
}

// FreeServiceCard is one row of the public «خدمات رایگان» board: an active
// zero-price service of a public, approved, verified and available teacher.
type FreeServiceCard struct {
        ServiceID   uint    `json:"service_id"`
        OfficialID  uint    `json:"official_id"`
        Title       string  `json:"title"`
        Icon        string  `json:"icon"`
        Category    string  `json:"category"`
        Duration    int     `json:"duration"`
        TeacherID   uint    `json:"teacher_id"`
        TeacherName string  `json:"teacher_name"`
        AvatarURL   string  `json:"avatar_url"`
        Field       string  `json:"field"`
        Tag         string  `json:"tag"`
        City        string  `json:"city"`
        Level       string  `json:"level"`
        Tier        string  `json:"tier"`
        Female      bool    `json:"female"`
        Rating      float64 `json:"rating"`
        Reviews     int     `json:"reviews"`
        Sessions    int     `json:"sessions"`
}

// Sample is an audio work sample of a teacher.
type Sample struct {
        ID        uint   `gorm:"primaryKey" json:"id"`
        TeacherID uint   `gorm:"index" json:"teacher_id"`
        Title     string `gorm:"size:160" json:"title"`
        Length    string `gorm:"size:12" json:"len"`
        URL       string `gorm:"size:255" json:"url"`
}

// WorkTime is a teacher availability slot template.
type WorkTime struct {
        ID        uint   `gorm:"primaryKey" json:"id"`
        TeacherID uint   `gorm:"index" json:"teacher_id"`
        Weekday   int    `json:"weekday"`
        FromTime  string `gorm:"size:5" json:"from"`
        ToTime    string `gorm:"size:5" json:"to"`
        Active    bool   `gorm:"default:true" json:"active"`
}

// Session is a booked/held session between a learner and teacher.
type Session struct {
        ID          uint          `gorm:"primaryKey" json:"id"`
        LearnerID   uint          `gorm:"index" json:"learner_id"`
        TeacherID   uint          `gorm:"index" json:"teacher_id"`
        ServiceID   uint          `gorm:"index" json:"service_id"`
        Title       string        `gorm:"size:160" json:"service"`
        ScheduledAt time.Time     `gorm:"column:scheduled_at;index" json:"scheduled_at"`
        Duration    int           `json:"duration"`
        Price       int64         `json:"price"`
        Status      SessionStatus `gorm:"size:16;default:pending;index" json:"status"`
        Note        string        `gorm:"size:500" json:"note"`
        RejectNote  string        `gorm:"size:255" json:"reject_note"`
        Rated       bool          `gorm:"default:false" json:"rated"`
        CreatedAt   time.Time     `json:"created_at"`
        UpdatedAt   time.Time     `json:"updated_at"`

        Learner *User    `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
        Teacher *Teacher `gorm:"foreignKey:TeacherID" json:"teacher,omitempty"`
}

// Review is a learner rating + comment for a teacher after a session.
type Review struct {
        ID        uint      `gorm:"primaryKey" json:"id"`
        SessionID uint      `gorm:"uniqueIndex" json:"session_id"`
        TeacherID uint      `gorm:"index" json:"teacher_id"`
        LearnerID uint      `gorm:"index" json:"learner_id"`
        Rating    int       `json:"rating"`
        Text      string    `gorm:"size:1000" json:"text"`
        CreatedAt time.Time `json:"created_at"`

        Learner *User `gorm:"foreignKey:LearnerID" json:"learner,omitempty"`
}

// Transaction is a wallet ledger entry.
type Transaction struct {
        ID        uint      `gorm:"primaryKey" json:"id"`
        UserID    uint      `gorm:"index" json:"user_id"`
        Type      TxType    `gorm:"size:16;index" json:"type"`
        Title     string    `gorm:"size:160" json:"title"`
        Amount    int64     `json:"amount"`
        RefID     uint      `gorm:"index" json:"ref_id"`
        CreatedAt time.Time `gorm:"index" json:"created_at"`
}

// Withdrawal is a teacher payout request.
type Withdrawal struct {
        ID        uint             `gorm:"primaryKey" json:"id"`
        TeacherID uint             `gorm:"index" json:"teacher_id"`
        UserID    uint             `gorm:"index" json:"user_id"`
        Amount    int64            `json:"amount"`
        Card      string           `gorm:"size:32" json:"card"`
        Sheba     string           `gorm:"size:34" json:"sheba"`
        Status    WithdrawalStatus `gorm:"size:16;default:pending;index" json:"status"`
        CreatedAt time.Time        `json:"created_at"`
        UpdatedAt time.Time        `json:"updated_at"`

        User *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

// PaymentStatus enumerates gateway order states.
type PaymentStatus string

const (
        PaymentPending PaymentStatus = "pending"
        PaymentPaid    PaymentStatus = "paid"
        PaymentFailed  PaymentStatus = "failed"
)

// PaymentOrder tracks a gateway payment initiated through an external payment
// gateway such as Saman Sep. Amount is stored in Toman; gateways receive the
// Rial equivalent (amount * 10). OrderType selects the settlement path:
// "topup" credits the wallet, "booking" funds a Session whose ID is RefID.
type PaymentOrder struct {
        ID         uint          `gorm:"primaryKey" json:"id"`
        UserID     uint          `gorm:"index" json:"user_id"`
        Gateway    string        `gorm:"size:24;default:saman;index" json:"gateway"`
        OrderType  string        `gorm:"size:16;default:topup;index" json:"order_type"`
        RefID      uint          `gorm:"index" json:"ref_id"`
        ResNum     string        `gorm:"size:64;uniqueIndex" json:"res_num"`
        Token      string        `gorm:"size:64;default:''" json:"-"`
        Amount     int64         `json:"amount"`
        Status     PaymentStatus `gorm:"size:16;index;default:pending" json:"status"`
        RefNum     string        `gorm:"size:64;index" json:"ref_num"`
        TraceNo    string        `gorm:"size:64" json:"trace_no"`
        CardPan    string        `gorm:"size:32" json:"card_pan"`
        FailReason string        `gorm:"size:255" json:"fail_reason"`
        // ReturnPath is the client-chosen landing path for the gateway
        // round-trip. Only validated "/app..." paths are stored (universal
        // app); empty keeps the legacy panel landing for old clients.
        ReturnPath string        `gorm:"size:255;default:''" json:"return_path"`
        CreatedAt  time.Time     `gorm:"index" json:"created_at"`
        UpdatedAt  time.Time     `json:"updated_at"`
}

// Payment order purposes.
const (
        PaymentOrderTopup    = "topup"
        PaymentOrderBooking  = "booking"
        PaymentOrderCeremony = "ceremony"
)

// OTPCode is a one-time password issued for mobile verification. Code stores a
// keyed digest rather than the user-visible OTP in production code paths.
type OTPCode struct {
        ID        uint      `gorm:"primaryKey" json:"-"`
        Mobile    string    `gorm:"size:15;index" json:"-"`
        Code      string    `gorm:"size:64" json:"-"`
        ExpiresAt time.Time `gorm:"index" json:"-"`
        Consumed  bool      `gorm:"default:false;index" json:"-"`
        CreatedAt time.Time `gorm:"index" json:"-"`
}

// PostStatus enumerates blog article publication states.
type PostStatus string

const (
        PostDraft     PostStatus = "draft"
        PostPublished PostStatus = "published"
)

// Notification is an in-app notification.
type Notification struct {
        ID        uint      `gorm:"primaryKey" json:"id"`
        UserID    uint      `gorm:"index" json:"user_id"`
        Title     string    `gorm:"size:160" json:"title"`
        Body      string    `gorm:"size:500" json:"body"`
        Read      bool      `gorm:"default:false;index" json:"read"`
        CreatedAt time.Time `gorm:"index" json:"created_at"`
}

// Post is a blog article authored by the platform team. Content is plain
// text: blank lines separate paragraphs, "## " marks a heading and "- "
// lines render as a list — the web renderer understands exactly this.
type Post struct {
        ID          uint       `gorm:"primaryKey" json:"id"`
        Slug        string     `gorm:"size:190;uniqueIndex" json:"slug"`
        Title       string     `gorm:"size:180" json:"title"`
        Excerpt     string     `gorm:"size:400" json:"excerpt"`
        Content     string     `gorm:"type:text" json:"content"`
        CoverURL    string     `gorm:"size:255" json:"cover_url"`
        Category    string     `gorm:"size:60;index" json:"category"`
        Status      PostStatus `gorm:"size:16;default:draft;index" json:"status"`
        AuthorID    uint       `gorm:"index" json:"author_id"`
        Author      *User      `gorm:"foreignKey:AuthorID" json:"author,omitempty"`
        ReadMinutes int        `gorm:"default:1" json:"read_minutes"`
        Views       int64      `gorm:"default:0" json:"views"`
        PublishedAt *time.Time `gorm:"index" json:"published_at,omitempty"`
        CreatedAt   time.Time  `json:"created_at"`
        UpdatedAt   time.Time  `json:"updated_at"`
}
