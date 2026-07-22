// Package database wires up the GORM MySQL connection and migrations.
package database

import (
	"fmt"
	"log"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"vodda/backend/internal/config"
	"vodda/backend/internal/domain"
)

// Connect opens a MySQL connection, retrying until the server is ready.
func Connect(cfg *config.Config) (*gorm.DB, error) {
	// Persist and read timestamps consistently regardless of the container host timezone.
	// Multi-statements are intentionally disabled to reduce SQL injection blast radius.
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=UTC",
		cfg.DB.User, cfg.DB.Password, cfg.DB.Host, cfg.DB.Port, cfg.DB.Name,
	)

	logLevel := logger.Warn
	if cfg.IsProduction() {
		logLevel = logger.Error
	}

	var db *gorm.DB
	var err error
	for attempt := 1; attempt <= 30; attempt++ {
		db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
			Logger:                                   logger.Default.LogMode(logLevel),
			DisableForeignKeyConstraintWhenMigrating: true,
		})
		if err == nil {
			break
		}
		log.Printf("db: waiting for MySQL (attempt %d/30): %v", attempt, err)
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return nil, fmt.Errorf("connect mysql: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(time.Hour)
	sqlDB.SetConnMaxIdleTime(15 * time.Minute)

	return db, nil
}

// Migrate runs auto-migration for all domain entities.
func Migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&domain.User{},
		&domain.Teacher{},
		&domain.Service{},
		&domain.Sample{},
		&domain.WorkTime{},
		&domain.Session{},
		&domain.Review{},
		&domain.Transaction{},
		&domain.Withdrawal{},
		&domain.OTPCode{},
		&domain.Notification{},
		&domain.SupportMessage{},
		&domain.AdminAuditLog{},
	)
}
