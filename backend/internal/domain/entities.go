// Package domain holds the core business entities and repository contracts.
// It has no dependency on any framework or database driver.
package domain

import (
	"strings"
	"time"

	"gorm.io/gorm"
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
	SessionPending   SessionStatus = "pending"   // awaiting teacher acceptance
	SessionConfirmed SessionStatus = "confirmed" // accepted, upcoming
	SessionDone      SessionStatus = "done"      // finished
	SessionCanceled  SessionStatus = "canceled"  // rejected or canceled
)

// TxType enumerates wallet transaction kinds.
type TxType string

const (
	TxCharge     TxType = "charge"     // wallet top-up (learner)
	TxSession    TxType = "session"    // session fee paid (learner)
	TxEarning    TxType = "earning"    // session income (teacher)
	TxWithdrawal TxType = "withdrawal" // teacher payout
	TxCommission TxType = "commission" // platform fee
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
	Wallet    int64     `gorm:"default:0" json:"wallet"` // balance in Toman
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`

	Teacher *Teacher `gorm:"foreignKey:UserID" json:"teacher,omitempty"`
}

// Teacher is the professional profile attached to a teacher-role user.
type Teacher struct {
	ID        uint          `gorm:"primaryKey" json:"id"`
	UserID    uint          `gorm:"uniqueIndex" json:"user_id"`
	Field     string        `gorm:"size:60" json:"field"` // "آموزش قرآن کریم" | "مداحی اهل‌بیت"
	Tag       string        `gorm:"size:60" json:"tag"`
	Level     string        `gorm:"size:30" json:"level"`
	City      string        `gorm:"size:80;index" json:"city"`
	Bio       string        `gorm:"size:1000" json:"bio"`
	Skills    string        `gorm:"size:500" json:"-"` // comma-separated storage
	SkillList []string      `gorm:"-" json:"skills"`   // populated from Skills on read
	Price30   int64         `json:"price30"`
	Price60   int64         `json:"price60"`
	Female    bool          `json:"female"`
	Verified  bool          `json:"verified"`
	Status    TeacherStatus `gorm:"size:16;default:pending;index" json:"status"`
	Rating    float64       `gorm:"default:0" json:"rating"`
	Reviews   int           `gorm:"default:0" json:"reviews"`
	Sessions  int           `gorm:"default:0" json:"sessions"`
	Followers int           `gorm:"default:0" json:"followers"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`

	User     *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Services []Service `gorm:"foreignKey:TeacherID" json:"services,omitempty"`
	Samples  []Sample  `gorm:"foreignKey:TeacherID" json:"samples,omitempty"`
}

// AfterFind splits the stored comma-separated Skills into SkillList for output.
func (t *Teacher) AfterFind(*gorm.DB) error {
	t.SkillList = nil
	for _, s := range strings.Split(t.Skills, ",") {
		if s = strings.TrimSpace(s); s != "" {
			t.SkillList = append(t.SkillList, s)
		}
	}
	return nil
}

// Service is a bookable offering of a teacher.
type Service struct {
	ID        uint   `gorm:"primaryKey" json:"id"`
	TeacherID uint   `gorm:"index" json:"teacher_id"`
	Title     string `gorm:"size:160" json:"title"`
	Duration  int    `json:"duration"` // minutes (30 / 60)
	Price     int64  `json:"price"`
	Icon      string `gorm:"size:30" json:"icon"`
	Active    bool   `gorm:"default:true" json:"active"`
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
	Weekday   int    `json:"weekday"` // 0=Saturday .. 6=Friday
	FromTime  string `gorm:"size:5" json:"from"`
	ToTime    string `gorm:"size:5" json:"to"`
	Active    bool   `gorm:"default:true" json:"active"`
}

// Session is a booked/held session between a learner and teacher.
type Session struct {
	ID          uint          `gorm:"primaryKey" json:"id"`
	LearnerID   uint          `gorm:"index" json:"learner_id"`
	TeacherID   uint          `gorm:"index" json:"teacher_id"`
	ServiceID   uint          `json:"service_id"`
	Title       string        `gorm:"size:160" json:"service"`
	ScheduledAt time.Time     `gorm:"column:scheduled_at" json:"scheduled_at"`
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
	Type      TxType    `gorm:"size:16" json:"type"`
	Title     string    `gorm:"size:160" json:"title"`
	Amount    int64     `json:"amount"` // signed: + credit, - debit
	RefID     uint      `json:"ref_id"`
	CreatedAt time.Time `json:"created_at"`
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

// OTPCode is a one-time password issued for mobile verification.
type OTPCode struct {
	ID        uint      `gorm:"primaryKey" json:"-"`
	Mobile    string    `gorm:"size:15;index" json:"-"`
	Code      string    `gorm:"size:8" json:"-"`
	ExpiresAt time.Time `json:"-"`
	Consumed  bool      `gorm:"default:false" json:"-"`
	CreatedAt time.Time `json:"-"`
}

// Notification is an in-app notification.
type Notification struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"index" json:"user_id"`
	Title     string    `gorm:"size:160" json:"title"`
	Body      string    `gorm:"size:500" json:"body"`
	Read      bool      `gorm:"default:false" json:"read"`
	CreatedAt time.Time `json:"created_at"`
}
