// Package seed populates an empty development database with coherent demo data.
package seed

import (
	"context"
	"log"
	"strings"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type teacherSeed struct {
	name, mobile, field, tag, level, city, bio string
	price30, price60                           int64
	female                                     bool
	skills                                     []string
	services                                   []domain.Service
}

// Run seeds development accounts and published teacher profiles only when the
// database is empty. The operation is atomic and never fabricates aggregate
// ratings, session counts or follower counts without source records.
func Run(db *gorm.DB) error {
	ctx := context.Background()
	var count int64
	if err := db.WithContext(ctx).Model(&domain.User{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	log.Println("seed: populating coherent development data…")
	return db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		accounts := []domain.User{
		{Name: "مدیر وُدّا", Mobile: "09130000000", Role: domain.RoleAdmin, City: "تهران", Active: true},
		{Name: "قرآن‌آموز آزمایشی", Mobile: "09130000001", Role: domain.RoleLearner, City: "قم", Active: true},
		}
		if err := tx.Create(&accounts).Error; err != nil {
			return err
		}

		seeds := []teacherSeed{
			{
				name: "استاد قرآن آزمایشی", mobile: "09130000002", field: "آموزش قرآن کریم", tag: "مدرس تجوید", level: "پیشرفته",
				city: "قم", bio: "پروفایل نمونهٔ محیط توسعه برای آزمون جستجو، خدمات و رزرو.",
				price30: 85000, price60: 150000,
				skills: []string{"تجوید", "صوت و لحن", "روان‌خوانی"},
				services: []domain.Service{
					{Title: "تصحیح قرائت و تجوید", Duration: 30, Price: 85000, Icon: "book", Active: true},
					{Title: "آموزش صوت و لحن", Duration: 60, Price: 150000, Icon: "mic", Active: true},
				},
			},
			{
				name: "استاد مداحی آزمایشی", mobile: "09130000003", field: "مداحی اهل‌بیت", tag: "مدرس مداحی", level: "متوسط",
				city: "تهران", bio: "پروفایل نمونهٔ محیط توسعه برای آزمون گردش تأیید و رزرو خدمات مداحی.",
				price30: 90000, price60: 160000,
				skills: []string{"نوحه‌خوانی", "تنظیم نفس", "دستگاه آوازی"},
				services: []domain.Service{
					{Title: "مبانی مداحی", Duration: 60, Price: 160000, Icon: "mic", Active: true},
				},
			},
			{
				name: "استاد بانوی آزمایشی", mobile: "09130000004", field: "آموزش قرآن کریم", tag: "مدرس حفظ", level: "پیشرفته",
				city: "مشهد", bio: "پروفایل نمونهٔ بانوان در محیط توسعه.",
				price30: 95000, price60: 170000, female: true,
				skills: []string{"روخوانی", "حفظ", "ویژهٔ بانوان"},
				services: []domain.Service{
					{Title: "روخوانی از پایه", Duration: 30, Price: 95000, Icon: "quran", Active: true},
				},
			},
		}

		for _, seed := range seeds {
			user := &domain.User{
				Name: seed.name, Mobile: seed.mobile, Role: domain.RoleTeacher,
				City: seed.city, Bio: seed.bio, Active: true,
			}
			if err := tx.Create(user).Error; err != nil {
				return err
			}
			teacher := &domain.Teacher{
				UserID: user.ID, Field: seed.field, Tag: seed.tag, Level: seed.level,
				City: seed.city, Bio: seed.bio, Skills: strings.Join(seed.skills, ","),
				Price30: seed.price30, Price60: seed.price60, Female: seed.female,
				Verified: true, Available: true, Status: domain.TeacherApproved,
			}
			if err := tx.Create(teacher).Error; err != nil {
				return err
			}
			for _, serviceSeed := range seed.services {
				service := serviceSeed
				service.ID = 0
				service.TeacherID = teacher.ID
				if err := tx.Create(&service).Error; err != nil {
					return err
				}
			}
		}

		log.Println("seed: development data created")
		return nil
	})
}
