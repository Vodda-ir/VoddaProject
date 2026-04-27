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
	if err := seedSystemUsers(db); err != nil {
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

func seedSystemUsers(db *gorm.DB) error {
	adminID, err := upsertUserByMobile(db, "09136336002", "سید محمد امین عمرانی", "admin")
	if err != nil {
		return fmt.Errorf("seed admin user: %w", err)
	}
	if err := ensureUserRole(db, adminID, "admin"); err != nil {
		return fmt.Errorf("seed admin role: %w", err)
	}
	if err := ensureUserRole(db, adminID, "learner"); err != nil {
		return fmt.Errorf("seed admin learner role: %w", err)
	}

	teacherID, err := upsertUserByMobile(db, "09914932678", "سارا حقیقی", "teacher")
	if err != nil {
		return fmt.Errorf("seed teacher user: %w", err)
	}
	if err := ensureUserRole(db, teacherID, "teacher"); err != nil {
		return fmt.Errorf("seed teacher role: %w", err)
	}
	if err := ensureUserRole(db, teacherID, "learner"); err != nil {
		return fmt.Errorf("seed teacher learner role: %w", err)
	}
	if err := ensureTeacherProfileApproved(db, teacherID, "آموزش قرآن کریم", "intermediate", "مدرس قرآن", 200000); err != nil {
		return fmt.Errorf("seed teacher profile: %w", err)
	}

	log.Println("System users seeded successfully")
	return nil
}

func upsertUserByMobile(db *gorm.DB, mobile, name, activeRole string) (uint64, error) {
	if err := db.Exec(`
		INSERT INTO users (mobile, name, active_role, created_at, updated_at)
		VALUES (?, ?, ?, NOW(), NOW())
		ON DUPLICATE KEY UPDATE
			name = VALUES(name),
			active_role = VALUES(active_role),
			updated_at = NOW()
	`, mobile, name, activeRole).Error; err != nil {
		return 0, err
	}

	var userID uint64
	if err := db.Raw("SELECT id FROM users WHERE mobile = ? LIMIT 1", mobile).Scan(&userID).Error; err != nil {
		return 0, err
	}
	if userID == 0 {
		return 0, fmt.Errorf("user not found after upsert: %s", mobile)
	}
	return userID, nil
}

func ensureUserRole(db *gorm.DB, userID uint64, role string) error {
	return db.Exec("INSERT IGNORE INTO user_roles (user_id, role, created_at) VALUES (?, ?, NOW())", userID, role).Error
}

func ensureTeacherProfileApproved(db *gorm.DB, userID uint64, specialty, level, bio string, pricePer30min int64) error {
	return db.Exec(`
		INSERT INTO teacher_profiles (user_id, specialty, level, bio, price_per30min, verification_status, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, 'approved', NOW(), NOW())
		ON DUPLICATE KEY UPDATE
			specialty = VALUES(specialty),
			level = VALUES(level),
			bio = VALUES(bio),
			price_per30min = VALUES(price_per30min),
			verification_status = 'approved',
			deleted_at = NULL,
			updated_at = NOW()
	`, userID, specialty, level, bio, pricePer30min).Error
}
