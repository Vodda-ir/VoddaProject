package models

import (
	"database/sql"
	"time"
)

type Session struct {
	ID        uint64       `gorm:"primaryKey;autoIncrement"`
	BookingID uint64       `gorm:"uniqueIndex;not null"`
	Status    string       `gorm:"type:enum('scheduled','in_progress','ended','failed');not null;default:'scheduled'"`
	StartedAt sql.NullTime
	EndedAt   sql.NullTime
	CreatedAt time.Time    `gorm:"autoCreateTime"`
	UpdatedAt time.Time    `gorm:"autoUpdateTime"`
}

func (Session) TableName() string {
	return "sessions"
}
