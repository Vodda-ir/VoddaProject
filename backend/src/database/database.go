package database

import (
	"fmt"
	"log"
	"strings"

	"vodda/backend/src/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

func Connect(dsn string) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		return nil, fmt.Errorf("open mysql: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get sql db: %w", err)
	}
	sqlDB.SetMaxOpenConns(10)
	sqlDB.SetMaxIdleConns(5)

	if err := sqlDB.Ping(); err != nil {
		return nil, fmt.Errorf("ping mysql: %w", err)
	}

	return db, nil
}

// Migrate runs GORM AutoMigrate on all models.
func Migrate(db *gorm.DB) error {
	if err := db.AutoMigrate(models.All()...); err != nil {
		return fmt.Errorf("auto migrate: %w", err)
	}
	if err := applyManualMigrations(db); err != nil {
		return fmt.Errorf("manual migrations: %w", err)
	}
	log.Println("Migrations applied successfully")
	return nil
}

func applyManualMigrations(db *gorm.DB) error {
	if err := ensureUserRolesCompositeUnique(db); err != nil {
		return err
	}
	if err := normalizeActiveRoles(db); err != nil {
		return err
	}
	return nil
}

func ensureUserRolesCompositeUnique(db *gorm.DB) error {
	var idxCount int64
	if err := db.Raw(`
		SELECT COUNT(1)
		FROM information_schema.statistics
		WHERE table_schema = DATABASE()
		  AND table_name = 'user_roles'
		  AND index_name = 'uk_user_role'
	`).Scan(&idxCount).Error; err != nil {
		return err
	}

	if idxCount > 0 {
		if err := db.Exec("ALTER TABLE user_roles DROP INDEX uk_user_role").Error; err != nil {
			lower := strings.ToLower(err.Error())
			if !strings.Contains(lower, "check that column/key exists") && !strings.Contains(lower, "can't drop") {
				return err
			}
		}
	}

	if err := db.Exec("CREATE UNIQUE INDEX uk_user_role ON user_roles (user_id, role)").Error; err != nil {
		lower := strings.ToLower(err.Error())
		if !strings.Contains(lower, "duplicate key name") {
			return err
		}
	}
	return nil
}

func normalizeActiveRoles(db *gorm.DB) error {
	return db.Exec(`
		UPDATE users
		SET active_role = 'learner'
		WHERE active_role IS NULL
		   OR active_role = ''
		   OR active_role NOT IN ('learner', 'teacher', 'admin')
	`).Error
}
