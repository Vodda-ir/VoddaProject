package domain

import "time"

// SupportMessageStatus tracks the lifecycle of a contact/support request.
type SupportMessageStatus string

const (
	SupportMessageNew      SupportMessageStatus = "new"
	SupportMessageResolved SupportMessageStatus = "resolved"
)

// SupportMessage is submitted from the public contact form and handled by admins.
type SupportMessage struct {
	ID         uint                 `gorm:"primaryKey" json:"id"`
	Name       string               `gorm:"size:120" json:"name"`
	Contact    string               `gorm:"size:160;index" json:"contact"`
	Message    string               `gorm:"type:text" json:"message"`
	Status     SupportMessageStatus `gorm:"size:16;default:new;index" json:"status"`
	CreatedAt  time.Time            `gorm:"index" json:"created_at"`
	ResolvedAt *time.Time           `json:"resolved_at,omitempty"`
}

// AdminAuditLog records privileged mutations for accountability and incident review.
type AdminAuditLog struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	ActorID    uint      `gorm:"index" json:"actor_id"`
	Action     string    `gorm:"size:80;index" json:"action"`
	TargetType string    `gorm:"size:40;index" json:"target_type"`
	TargetID   uint      `gorm:"index" json:"target_id"`
	RequestID  string    `gorm:"size:64;index" json:"request_id"`
	Metadata   string    `gorm:"type:text" json:"metadata,omitempty"`
	CreatedAt  time.Time `gorm:"index" json:"created_at"`
}
