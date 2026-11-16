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

// TicketStatus tracks the lifecycle of a live support conversation.
type TicketStatus string

const (
        TicketOpen     TicketStatus = "open"     // ساخته‌شده و در انتظار اولین پاسخ کارشناس
        TicketPending  TicketStatus = "pending"  // کاربر پاسخ داده؛ در انتظار کارشناس
        TicketAnswered TicketStatus = "answered" // کارشناس پاسخ داده؛ در انتظار کاربر
        TicketClosed   TicketStatus = "closed"   // بسته‌شده توسط کاربر یا کارشناس
)

// ChatKind is the media type of one chat message.
type ChatKind string

const (
        ChatText  ChatKind = "text"
        ChatAudio ChatKind = "audio"
        ChatImage ChatKind = "image"
)

// SenderSide marks which side of the conversation a message belongs to.
type SenderSide string

const (
        SideUser  SenderSide = "user"
        SideStaff SenderSide = "staff"
)

// SupportTicket is a live conversation between an app user (learner/teacher)
// and the support team. Answered by admins or appointed support agents
// (کارشناس پشتیبانی) from the admin panel.
type SupportTicket struct {
        ID            uint         `gorm:"primaryKey" json:"id"`
        UserID        uint         `gorm:"index:idx_ticket_user" json:"user_id"`
        Subject       string       `gorm:"size:150" json:"subject"`
        Status        TicketStatus `gorm:"size:16;default:open;index" json:"status"`
        AssignedTo    *uint        `gorm:"index" json:"assigned_to,omitempty"`
        LastMessageAt time.Time    `gorm:"index" json:"last_message_at"`
        UnreadUser    int          `gorm:"default:0" json:"unread_user"`
        UnreadStaff   int          `gorm:"default:0" json:"unread_staff"`
        CreatedAt     time.Time    `json:"created_at"`
        UpdatedAt     time.Time    `json:"updated_at"`

        User     *User `gorm:"foreignKey:UserID" json:"user,omitempty"`
        Assignee *User `gorm:"foreignKey:AssignedTo" json:"assignee,omitempty"`
}

// SupportChatMessage is one message inside a ticket. Body carries text;
// audio/image messages reference an uploaded attachment instead.
type SupportChatMessage struct {
        ID             uint       `gorm:"primaryKey" json:"id"`
        TicketID       uint       `gorm:"index:idx_chat_ticket" json:"ticket_id"`
        SenderID       uint       `json:"sender_id"`
        SenderName     string     `gorm:"size:120" json:"sender_name"`
        SenderSide     SenderSide `gorm:"size:10;index" json:"sender_side"`
        Kind           ChatKind   `gorm:"size:10;default:text" json:"kind"`
        Body           string     `gorm:"type:text" json:"body"`
        AttachmentURL  string     `gorm:"size:255" json:"attachment_url,omitempty"`
        AttachmentMime string     `gorm:"size:100" json:"attachment_mime,omitempty"`
        DurationMS     int        `gorm:"default:0" json:"duration_ms,omitempty"`
        CreatedAt      time.Time  `gorm:"index" json:"created_at"`
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

// Setting is a platform-level configuration value editable by admins and read
// by the public site (contact info, announcement banner, ...). Keys are
// restricted to a whitelist enforced by the admin usecase.
type Setting struct {
        Key       string    `gorm:"size:60;primaryKey" json:"key"`
        Value     string    `gorm:"size:500" json:"value"`
        UpdatedAt time.Time `json:"updated_at"`
}
