package models

import (
	"database/sql"
	"time"
)

type OTPRequest struct {
	ID         uint64       `gorm:"primaryKey;autoIncrement"`
	Mobile     string       `gorm:"size:20;not null;index:idx_otp_mobile"`
	Code       string       `gorm:"size:10;not null"`
	ExpiresAt  time.Time    `gorm:"not null;index:idx_otp_expires"`
	VerifiedAt sql.NullTime
	CreatedAt  time.Time    `gorm:"autoCreateTime"`
}

func (OTPRequest) TableName() string {
	return "otp_requests"
}
