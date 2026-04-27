package models

import "time"

type AvailabilitySlot struct {
	ID               uint64    `gorm:"primaryKey;autoIncrement"`
	TeacherProfileID uint64    `gorm:"not null"`
	DayOfWeek        uint8     `gorm:"not null"`
	StartTime        string    `gorm:"type:time;not null"`
	EndTime          string    `gorm:"type:time;not null"`
	CreatedAt        time.Time `gorm:"autoCreateTime"`
}

func (AvailabilitySlot) TableName() string {
	return "availability_slots"
}

type Booking struct {
	ID               uint64    `gorm:"primaryKey;autoIncrement"`
	LearnerID        uint64    `gorm:"not null;index:idx_bookings_learner"`
	TeacherProfileID uint64    `gorm:"not null;index:idx_bookings_teacher"`
	SlotDate         string    `gorm:"type:date;not null;index:idx_bookings_slot,priority:1"`
	SlotStart        string    `gorm:"type:time;not null;index:idx_bookings_slot,priority:2"`
	SlotEnd          string    `gorm:"type:time;not null"`
	Status           string    `gorm:"type:enum('pending','accepted','rejected','cancelled','completed');not null;default:'pending';index:idx_bookings_status"`
	Notes            string    `gorm:"type:text"`
	CreatedAt        time.Time `gorm:"autoCreateTime"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime"`
}

func (Booking) TableName() string {
	return "bookings"
}
