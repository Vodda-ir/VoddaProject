package models

import (
	"database/sql"
	"time"
)

type TeacherProfile struct {
	ID                  uint64       `gorm:"primaryKey;autoIncrement"`
	UserID              uint64       `gorm:"uniqueIndex;not null"`
	Specialty           string       `gorm:"size:100;not null"`
	Level               string       `gorm:"type:enum('beginner','intermediate','advanced');not null"`
	Bio                 string       `gorm:"type:text"`
	PricePer30min       uint         `gorm:"not null;default:0"`
	VerificationStatus  string       `gorm:"type:enum('pending','approved','rejected');not null;default:'pending'"`
	DeletedAt           sql.NullTime `gorm:"index"`
	CreatedAt           time.Time    `gorm:"autoCreateTime"`
	UpdatedAt           time.Time    `gorm:"autoUpdateTime"`
}

func (TeacherProfile) TableName() string {
	return "teacher_profiles"
}

type TeacherMedia struct {
	ID               uint64    `gorm:"primaryKey;autoIncrement"`
	TeacherProfileID uint64    `gorm:"not null"`
	MediaType        string    `gorm:"type:enum('photo','audio');not null"`
	URL              string    `gorm:"size:512;not null"`
	CreatedAt        time.Time `gorm:"autoCreateTime"`
}

func (TeacherMedia) TableName() string {
	return "teacher_media"
}
