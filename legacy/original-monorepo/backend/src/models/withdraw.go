package models

import (
	"database/sql"
	"time"
)

type WithdrawRequest struct {
	ID          uint64       `gorm:"primaryKey;autoIncrement"`
	UserID      uint64       `gorm:"not null"`
	Amount      uint64       `gorm:"not null"`
	Status      string       `gorm:"type:enum('pending','approved','rejected','paid');not null;default:'pending'"`
	BankInfo    string       `gorm:"type:json"`
	ProcessedAt sql.NullTime
	CreatedAt   time.Time    `gorm:"autoCreateTime"`
	UpdatedAt   time.Time    `gorm:"autoUpdateTime"`
}

func (WithdrawRequest) TableName() string {
	return "withdraw_requests"
}
