// Package seed populates the database with demo data mirroring the design mocks.
package seed

import (
	"context"
	"log"
	"strings"
	"time"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

type teacherSeed struct {
	name, mobile, field, tag, level, city, bio string
	price30, price60                           int64
	female, verified                           bool
	rating                                     float64
	reviews, sessions, followers               int
	skills                                     []string
	services                                   []domain.Service
	samples                                    []domain.Sample
}

// Run seeds demo accounts, teachers, services and an admin if the DB is empty.
func Run(db *gorm.DB) error {
	ctx := context.Background()
	var count int64
	db.WithContext(ctx).Model(&domain.User{}).Count(&count)
	if count > 0 {
		return nil
	}
	log.Println("seed: populating demo data…")

	// admin
	admin := &domain.User{Name: "مدیر وُدّا", Mobile: "09000000000", Role: domain.RoleAdmin, City: "تهران", Active: true}
	db.Create(admin)

	// a learner with wallet balance
	learner := &domain.User{Name: "مجتبی شعبان‌زاده", Mobile: "09120000000", Role: domain.RoleLearner, City: "قم", Active: true, Wallet: 105000}
	db.Create(learner)

	seeds := []teacherSeed{
		{
			name: "عباس ملک‌محمدی", mobile: "09120000001", field: "آموزش قرآن کریم", tag: "حافظ و قاری", level: "پیشرفته",
			city: "قم", bio: "مربی و مدرس قرآن کریم با بیش از ۱۲ سال سابقه. تمرکز بر تجوید، صوت و لحن، و روان‌خوانی.",
			price30: 85000, price60: 150000, verified: true, rating: 4.9, reviews: 210, sessions: 25, followers: 2521,
			skills: []string{"تجوید", "صوت و لحن", "روان‌خوانی", "حفظ جزء ۳۰"},
			services: []domain.Service{
				{Title: "چگونه قاری قرآن شوم؟", Duration: 30, Price: 85000, Icon: "quran", Active: true},
				{Title: "تصحیح قرائت و تجوید", Duration: 30, Price: 85000, Icon: "book", Active: true},
				{Title: "آموزش مقامات و صوت", Duration: 60, Price: 150000, Icon: "mic", Active: true},
			},
			samples: []domain.Sample{{Title: "تلاوت سورهٔ الرحمن", Length: "۲:۴۵"}, {Title: "تمرین مقام بیات", Length: "۱:۱۰"}},
		},
		{
			name: "محمد ملک‌مطیعی", mobile: "09120000002", field: "مداحی اهل‌بیت", tag: "مداح و ذاکر", level: "پیشرفته",
			city: "تهران", bio: "مداح و ذاکر اهل‌بیت با سبک سنتی و نوحه‌خوانی. آموزش پایهٔ مداحی، تنظیم نفس، و دستگاه‌های آوازی.",
			price30: 90000, price60: 160000, verified: true, rating: 4.8, reviews: 168, sessions: 31, followers: 1840,
			skills: []string{"نوحه‌خوانی", "تک‌خوانی", "دستگاه آوازی", "مقتل‌خوانی"},
			services: []domain.Service{
				{Title: "مبانی مداحی برای مبتدیان", Duration: 60, Price: 160000, Icon: "mic", Active: true},
				{Title: "تنظیم نفس و صدا", Duration: 30, Price: 90000, Icon: "headphones", Active: true},
			},
			samples: []domain.Sample{{Title: "نمونهٔ نوحهٔ سنتی", Length: "۳:۲۰"}},
		},
		{
			name: "مریم رضوی", mobile: "09120000003", field: "آموزش قرآن کریم", tag: "حافظ کل", level: "پیشرفته",
			city: "مشهد", bio: "حافظ کل قرآن کریم و مدرس بانوان. تمرکز بر روخوانی و روان‌خوانی برای خواهران و کودکان.",
			price30: 95000, price60: 170000, female: true, verified: true, rating: 5.0, reviews: 409, sessions: 52, followers: 3110,
			skills: []string{"روخوانی", "روان‌خوانی", "حفظ", "ویژهٔ بانوان"},
			services: []domain.Service{
				{Title: "روخوانی از پایه", Duration: 30, Price: 95000, Icon: "book", Active: true},
				{Title: "دورهٔ حفظ جزء", Duration: 60, Price: 170000, Icon: "quran", Active: true},
			},
			samples: []domain.Sample{{Title: "تلاوت سورهٔ مریم", Length: "۴:۰۵"}},
		},
		{
			name: "علی کبیری", mobile: "09120000004", field: "آموزش قرآن کریم", tag: "قاری ممتاز", level: "متوسط",
			city: "اصفهان", bio: "قاری ممتاز کشوری، علاقه‌مند به آموزش نوجوانان و آمادگی برای مسابقات.",
			price30: 70000, price60: 120000, rating: 4.7, reviews: 96, sessions: 18, followers: 980,
			skills:   []string{"قرائت", "مسابقات", "نوجوانان"},
			services: []domain.Service{{Title: "آمادگی مسابقات قرآن", Duration: 30, Price: 70000, Icon: "award", Active: true}},
			samples:  []domain.Sample{{Title: "قرائت ترتیل", Length: "۲:۰۰"}},
		},
		{
			name: "فاطمه حسینی", mobile: "09120000005", field: "مداحی اهل‌بیت", tag: "ذاکرهٔ اهل‌بیت", level: "متوسط",
			city: "قم", bio: "ذاکرهٔ اهل‌بیت ویژهٔ مجالس بانوان. آموزش مرثیه‌خوانی و مدیحه‌سرایی با لحن دلنشین.",
			price30: 80000, price60: 140000, female: true, verified: true, rating: 4.9, reviews: 142, sessions: 27, followers: 1520,
			skills:   []string{"مرثیه", "مدیحه", "ویژهٔ بانوان"},
			services: []domain.Service{{Title: "آموزش مرثیه‌خوانی", Duration: 60, Price: 140000, Icon: "mic", Active: true}},
			samples:  []domain.Sample{{Title: "مدیحهٔ حضرت زهرا (س)", Length: "۲:۳۰"}},
		},
		{
			name: "احمد شعبانی", mobile: "09120000006", field: "آموزش قرآن کریم", tag: "مدرس تجوید", level: "پیشرفته",
			city: "شیراز", bio: "مدرس تجوید و وقف و ابتدا، با روشی ساده و کاربردی برای بزرگسالان.",
			price30: 75000, price60: 130000, rating: 4.6, reviews: 73, sessions: 14, followers: 640,
			skills:   []string{"تجوید", "وقف و ابتدا", "بزرگسالان"},
			services: []domain.Service{{Title: "دورهٔ تجوید کاربردی", Duration: 30, Price: 75000, Icon: "book", Active: true}},
			samples:  []domain.Sample{{Title: "درس تجوید: مدّ", Length: "۱:۴۵"}},
		},
	}

	for _, ts := range seeds {
		u := &domain.User{Name: ts.name, Mobile: ts.mobile, Role: domain.RoleTeacher, City: ts.city, Bio: ts.bio, Active: true}
		if err := db.Create(u).Error; err != nil {
			return err
		}
		t := &domain.Teacher{
			UserID: u.ID, Field: ts.field, Tag: ts.tag, Level: ts.level, City: ts.city, Bio: ts.bio,
			Skills: strings.Join(ts.skills, ","), Price30: ts.price30, Price60: ts.price60,
			Female: ts.female, Verified: ts.verified, Status: domain.TeacherApproved,
			Rating: ts.rating, Reviews: ts.reviews, Sessions: ts.sessions, Followers: ts.followers,
		}
		if err := db.Create(t).Error; err != nil {
			return err
		}
		for i := range ts.services {
			ts.services[i].TeacherID = t.ID
			db.Create(&ts.services[i])
		}
		for i := range ts.samples {
			ts.samples[i].TeacherID = t.ID
			db.Create(&ts.samples[i])
		}
	}

	// a couple of demo sessions for the learner
	now := time.Now()
	db.Create(&domain.Session{LearnerID: learner.ID, TeacherID: 1, ServiceID: 2, Title: "تصحیح قرائت و تجوید", ScheduledAt: now.Add(48 * time.Hour), Duration: 30, Price: 85000, Status: domain.SessionConfirmed})
	db.Create(&domain.Session{LearnerID: learner.ID, TeacherID: 1, ServiceID: 1, Title: "چگونه قاری قرآن شوم؟", ScheduledAt: now.Add(-72 * time.Hour), Duration: 30, Price: 85000, Status: domain.SessionDone, Rated: true})

	log.Println("seed: done.")
	return nil
}
