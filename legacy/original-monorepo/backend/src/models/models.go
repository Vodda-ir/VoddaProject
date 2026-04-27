package models

// All returns all models for GORM AutoMigrate in dependency order.
func All() []interface{} {
	return []interface{}{
		&User{},
		&UserRole{},
		&TeacherProfile{},
		&TeacherMedia{},
		&AvailabilitySlot{},
		&Booking{},
		&Session{},
		&Wallet{},
		&Transaction{},
		&WithdrawRequest{},
		&Rating{},
		&Notification{},
		&OTPRequest{},
	}
}
