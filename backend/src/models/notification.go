package models

import (
	"database/sql"
	"time"
)

type Notification struct {
	ID        uint64       `gorm:"primaryKey;autoIncrement"`
	UserID    uint64       `gorm:"not null;index:idx_notifications_user"`
	Title     string       `gorm:"size:255;not null"`
	Body      string       `gorm:"type:text"`
	ReadAt    sql.NullTime
	CreatedAt time.Time    `gorm:"autoCreateTime"`
}

func (Notification) TableName() string {
	return "notifications"
}
