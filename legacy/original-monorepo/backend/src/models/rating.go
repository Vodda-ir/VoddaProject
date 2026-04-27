package models

import "time"

type Rating struct {
	ID               uint64    `gorm:"primaryKey;autoIncrement"`
	BookingID        uint64    `gorm:"not null"`
	LearnerID        uint64    `gorm:"not null"`
	TeacherProfileID uint64    `gorm:"not null;index:idx_ratings_teacher"`
	Score            uint8     `gorm:"not null"`
	Comment          string    `gorm:"type:text"`
	CreatedAt        time.Time `gorm:"autoCreateTime"`
}

func (Rating) TableName() string {
	return "ratings"
}
