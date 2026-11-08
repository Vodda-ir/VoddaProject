package seed

import (
	"context"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

// legacyTeacherSeedJSON contains only profile-level data extracted from the
// legacy vodda_db.sql dump. It intentionally excludes services, schedules,
// orders, wallets, reviews and sensitive identity/financial fields.
//
//go:embed legacy_teachers.json
var legacyTeacherSeedJSON []byte

type requiredAdminSeed struct {
	Name   string
	Mobile string
}

type legacyTeacherProfileSeed struct {
	LegacyID int    `json:"legacy_id"`
	Name     string `json:"name"`
	Mobile   string `json:"mobile"`
	Tag      string `json:"tag"`
	Level    string `json:"level"`
	City     string `json:"city"`
	Bio      string `json:"bio"`
	Female   bool   `json:"female"`
	Price30  int64  `json:"price30"`
	Price60  int64  `json:"price60"`
}

var requiredAdmins = []requiredAdminSeed{
	{Name: "سید محمد امین عمرانی", Mobile: "09136336002"},
	{Name: "محمد حبیب زاده", Mobile: "09105912852"},
}

// RunRequired applies idempotent bootstrap data that must exist in every
// environment, including production. Unlike Run, this is not demo data and it
// does not depend on AUTO_SEED.
//
// Existing teacher profiles are never overwritten so profile edits made after
// the migration remain authoritative. Required admin identity/role is
// authoritative and is repaired on every startup.
func RunRequired(db *gorm.DB) error {
	var teachers []legacyTeacherProfileSeed
	if err := json.Unmarshal(legacyTeacherSeedJSON, &teachers); err != nil {
		return fmt.Errorf("decode required legacy teachers: %w", err)
	}
	if err := validateLegacyTeacherSeeds(teachers); err != nil {
		return err
	}

	ctx := context.Background()
	err := db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, admin := range requiredAdmins {
			if err := ensureRequiredAdmin(tx, admin); err != nil {
				return fmt.Errorf("ensure required admin %s: %w", admin.Mobile, err)
			}
		}

		for _, teacher := range teachers {
			if err := ensureLegacyTeacher(tx, teacher); err != nil {
				return fmt.Errorf("ensure legacy teacher %d: %w", teacher.LegacyID, err)
			}
		}
		return nil
	})
	if err != nil {
		return err
	}

	// Official service catalog + legacy mapping runs after profile boot
	// so every existing free-text service gets an official reference.
	if err := RunCatalog(db); err != nil {
		return fmt.Errorf("ensure official service catalog: %w", err)
	}

	log.Printf("seed: required bootstrap ensured (%d admins, %d legacy teachers)", len(requiredAdmins), len(teachers))
	return nil
}

func ensureRequiredAdmin(tx *gorm.DB, seed requiredAdminSeed) error {
	var user domain.User
	err := tx.Where("mobile = ?", seed.Mobile).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		user = domain.User{
			Name:   seed.Name,
			Mobile: seed.Mobile,
			Role:   domain.RoleAdmin,
			Active: true,
		}
		return tx.Create(&user).Error
	}
	if err != nil {
		return err
	}

	return tx.Model(&user).Updates(map[string]any{
		"name":   seed.Name,
		"role":   domain.RoleAdmin,
		"active": true,
	}).Error
}

func ensureLegacyTeacher(tx *gorm.DB, seed legacyTeacherProfileSeed) error {
	var user domain.User
	err := tx.Where("mobile = ?", seed.Mobile).First(&user).Error
	switch {
	case errors.Is(err, gorm.ErrRecordNotFound):
		user = domain.User{
			Name:   truncateRunes(seed.Name, 120),
			Mobile: seed.Mobile,
			Role:   domain.RoleTeacher,
			City:   truncateRunes(seed.City, 80),
			Bio:    truncateRunes(seed.Bio, 500),
			Active: true,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}
	case err != nil:
		return err
	default:
		updates := map[string]any{}
		// Admins may also have a teacher profile. Never downgrade an admin.
		if user.Role != domain.RoleAdmin && user.Role != domain.RoleTeacher {
			updates["role"] = domain.RoleTeacher
		}
		if strings.TrimSpace(user.Name) == "" {
			updates["name"] = truncateRunes(seed.Name, 120)
		}
		if strings.TrimSpace(user.City) == "" {
			updates["city"] = truncateRunes(seed.City, 80)
		}
		if strings.TrimSpace(user.Bio) == "" && strings.TrimSpace(seed.Bio) != "" {
			updates["bio"] = truncateRunes(seed.Bio, 500)
		}
		if len(updates) > 0 {
			if err := tx.Model(&user).Updates(updates).Error; err != nil {
				return err
			}
		}
	}

	var teacher domain.Teacher
	err = tx.Where("user_id = ?", user.ID).First(&teacher).Error
	if err == nil {
		// Seed-once semantics: after the first import, product/admin edits win.
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	teacher = domain.Teacher{
		UserID:    user.ID,
		Field:     "آموزش قرآن کریم",
		Tag:       truncateRunes(seed.Tag, 60),
		Level:     truncateRunes(seed.Level, 30),
		City:      truncateRunes(seed.City, 80),
		Bio:       truncateRunes(seed.Bio, 1000),
		Skills:    truncateRunes(seed.Tag, 500),
		Price30:   seed.Price30,
		Price60:   seed.Price60,
		Female:    seed.Female,
		Verified:  true,
		Available: true,
		Status:    domain.TeacherApproved,
	}
	return tx.Create(&teacher).Error
}

func validateLegacyTeacherSeeds(seeds []legacyTeacherProfileSeed) error {
	const expectedLegacyTeachers = 45
	if len(seeds) != expectedLegacyTeachers {
		return fmt.Errorf("required legacy teachers: expected %d rows, got %d", expectedLegacyTeachers, len(seeds))
	}

	seenMobiles := make(map[string]int, len(seeds))
	for _, seed := range seeds {
		if seed.LegacyID <= 0 {
			return errors.New("required legacy teachers: legacy_id must be positive")
		}
		if len(seed.Mobile) != 11 || !strings.HasPrefix(seed.Mobile, "09") {
			return fmt.Errorf("required legacy teacher %d: invalid normalized mobile", seed.LegacyID)
		}
		if previous, exists := seenMobiles[seed.Mobile]; exists {
			return fmt.Errorf("required legacy teachers: duplicate mobile for legacy ids %d and %d", previous, seed.LegacyID)
		}
		seenMobiles[seed.Mobile] = seed.LegacyID
	}
	return nil
}

func truncateRunes(value string, max int) string {
	value = strings.TrimSpace(value)
	runes := []rune(value)
	if len(runes) <= max {
		return value
	}
	return string(runes[:max])
}
