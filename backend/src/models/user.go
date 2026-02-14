package models

import "time"

type User struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement"`
	Mobile    string    `gorm:"size:20;uniqueIndex;not null"`
	Name      string    `gorm:"size:255;not null;default:''"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}

func (User) TableName() string {
	return "users"
}

type UserRole struct {
	ID        uint64    `gorm:"primaryKey;autoIncrement"`
	UserID    uint64    `gorm:"not null;uniqueIndex:uk_user_role"`
	Role      string    `gorm:"type:enum('learner','teacher','admin');not null"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
}

func (UserRole) TableName() string {
	return "user_roles"
}
