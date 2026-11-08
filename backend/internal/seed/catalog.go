package seed

import (
	"log"
	"strings"

	"gorm.io/gorm"

	"vodda/backend/internal/domain"
)

// officialCatalog is the platform's approved service catalog. Every bookable
// service on the marketplace must reference one of these entries, so service
// titles stay official, consistent and verified by the Vodda team.
//
// The list covers every Quranic teaching domain offered worldwide: from
// alphabet Foundations (Noorani Qaida) through Tajweed theory, Qira'at
// narrations, Hifz programs, Maqamat voice training, Tafsir, Quranic
// sciences, kids/adults specializations to competition coaching.
var officialCatalog = []domain.OfficialService{
	// ── قرآن‌آموزی پایه ──
	{ID: 1, Category: "قرآن‌آموزی پایه", Title: "آموزش الفبا و قرآن‌آموزی از پایه", Description: "شروع یادگیری قرآن از صفر مطلق با قاعده نورانی و روش‌های استاندارد الفبای قرآنی", Icon: "book", SortOrder: 1, Active: true},
	{ID: 2, Category: "قرآن‌آموزی پایه", Title: "روخوانی و درست‌خوانی قرآن کریم", Description: "آموزش خواندن صحیح آیات با رعایت مخارج حروف و قواعد پایه", Icon: "book", SortOrder: 2, Active: true},
	{ID: 3, Category: "قرآن‌آموزی پایه", Title: "روان‌خوانی و فصالت در تلاوت", Description: "تقویت شیوایی و روانی تلاوت، رفع مکث‌ها و بریده‌بریده‌خوانی", Icon: "quran", SortOrder: 3, Active: true},
	{ID: 4, Category: "قرآن‌آموزی پایه", Title: "تلاوت و روخوانی قرآن کریم", Description: "جلسات تلاوت و روخوانی قرآن با تصحیح مستمر توسط استاد", Icon: "quran", SortOrder: 4, Active: true},
	{ID: 5, Category: "قرآن‌آموزی پایه", Title: "آموزش قرآن برای مبتدیان بزرگسال", Description: "برنامه مخصوص بزرگسالانی که در سنین بالاتر شروع به یادگیری قرآن می‌کنند", Icon: "book", SortOrder: 5, Active: true},

	// ── تجوید و علوم قرائت ──
	{ID: 6, Category: "تجوید و علوم قرائت", Title: "آموزش تجوید و احکام عملی", Description: "آموزش قواعد تجوید به‌صورت عملی و کاربردی همراه با تمرین", Icon: "book", SortOrder: 6, Active: true},
	{ID: 7, Category: "تجوید و علوم قرائت", Title: "تجوید نظری و پیشرفته", Description: "مبانی نظری تجوید، مدّها، همزه‌ها، ادغام‌ها و احکام ویژه", Icon: "doc", SortOrder: 7, Active: true},
	{ID: 8, Category: "تجوید و علوم قرائت", Title: "تصحیح تلاوت و اصلاح لهجه", Description: "شنیدن تلاوت شما و اصلاح خطاهای قرائتی و لهجه به‌صورت آنی", Icon: "mic", SortOrder: 8, Active: true},
	{ID: 9, Category: "تجوید و علوم قرائت", Title: "ترتیل قرآن کریم", Description: "آموزش تلاوت ترتیل با تمهید، وقف و ابتدای صحیح", Icon: "quran", SortOrder: 9, Active: true},
	{ID: 10, Category: "تجوید و علوم قرائت", Title: "روایت حفص از عاصم (تحفه‌الاطفال)", Description: "آموزش منظومه تحفه‌الاطفال و رعایت دقیق روایت حفص از عاصم", Icon: "book", SortOrder: 10, Active: true},
	{ID: 11, Category: "تجوید و علوم قرائت", Title: "متون تجویدی و عقود (الجزریه، طیبه، شاطبیه)", Description: "حفظ و شرح منظومه‌های تجویدی معتبر علمای قرائت", Icon: "book", SortOrder: 11, Active: true},
	{ID: 12, Category: "تجوید و علوم قرائت", Title: "اجازه و سند قرائت (اقراء)", Description: "اخذ اجازه و سند معتبر قرائتی پس از تسلط کامل بر روایت", Icon: "award", SortOrder: 12, Active: true},

	// ── حفظ قرآن ──
	{ID: 13, Category: "حفظ قرآن", Title: "حفظ قرآن کریم با برنامه‌ریزی شخصی", Description: "حفظ هدفمند قرآن بر اساس ظرفیت، زمان و هدف شما", Icon: "star", SortOrder: 13, Active: true},
	{ID: 14, Category: "حفظ قرآن", Title: "حفظ جزء به جزء با مرور منظم", Description: "حفظ جزء به جزء قرآن کریم یکی پس از دیگری همراه با برنامه مرور منظم", Icon: "star", SortOrder: 14, Active: true},
	{ID: 15, Category: "حفظ قرآن", Title: "مرور و تثبیت محفوظات (مراجعه)", Description: "مرور آیات حفظ‌شده پیشین و تثبیت کامل محفوظات", Icon: "refresh", SortOrder: 15, Active: true},
	{ID: 16, Category: "حفظ قرآن", Title: "حفظ موضوعی آیات قرآن", Description: "حفظ آیات موضوعی مانند آیات فضایل، دعاها و حکمت‌ها", Icon: "star", SortOrder: 16, Active: true},
	{ID: 17, Category: "حفظ قرآن", Title: "حفظ قرآن ویژه کودکان و نوجوانان", Description: "حفظ متناسب با سن با شیوه‌های جذاب و انگیزشی", Icon: "sparkle", SortOrder: 17, Active: true},
	{ID: 18, Category: "حفظ قرآن", Title: "آمادگی آزمون و مسابقات حفظ", Description: "آماده‌سازی تخصصی برای آزمون‌های حفظ و مسابقات قرآنی", Icon: "award", SortOrder: 18, Active: true},

	// ── صوت و لحن و هنر قرآنی ──
	{ID: 19, Category: "صوت و لحن و هنر قرآنی", Title: "آموزش صوت و لحن (مبانی و تمهید)", Description: "آشنایی با مبانی صوت، لحن، تمهید و قواعد زیباخوانی", Icon: "mic", SortOrder: 19, Active: true},
	{ID: 20, Category: "صوت و لحن و هنر قرآنی", Title: "مقامات قرآنی و زیباخوانی", Description: "آموزش مقامات بیات، رست، شور، حجاز، صبا و کاربرد آن‌ها در تلاوت", Icon: "headphones", SortOrder: 20, Active: true},
	{ID: 21, Category: "صوت و لحن و هنر قرآنی", Title: "تمرینات تنفسی و نفس‌گیری تلاوت", Description: "تکنیک‌های تنفس دیافراگمی و نفس‌گیری در آیات طولانی", Icon: "mic", SortOrder: 21, Active: true},
	{ID: 22, Category: "صوت و لحن و هنر قرآنی", Title: "تقویت صدا و آواسازی قرآنی", Description: "تقویت قدرت، زیبایی و ظرافت آوایی صدای تلاوت", Icon: "mic", SortOrder: 22, Active: true},
	{ID: 23, Category: "صوت و لحن و هنر قرآنی", Title: "آموزش اذان و اقامه", Description: "آموزش فن اذان و اقامه با لحن زیبا و مخارج صحیح", Icon: "mic", SortOrder: 23, Active: true},
	{ID: 24, Category: "صوت و لحن و هنر قرآنی", Title: "مداحی و نوحه‌خوانی اهل‌بیت (ع)", Description: "آموزش مبانی مداحی، نوحه‌خوانی و آیین‌های عزاداری", Icon: "headphones", SortOrder: 24, Active: true},
	{ID: 25, Category: "صوت و لحن و هنر قرآنی", Title: "آمادگی محافل انس و مسابقات صوت و لحن", Description: "آماده‌سازی برای حضور در محافل انس با قرآن و مسابقات آوایی", Icon: "award", SortOrder: 25, Active: true},

	// ── مفاهیم، تفسیر و علوم قرآن ──
	{ID: 26, Category: "مفاهیم، تفسیر و علوم قرآن", Title: "ترجمه و مفاهیم قرآن کریم", Description: "آموزش ترجمه و معنای آیات قرآن به زبان ساده و روان", Icon: "doc", SortOrder: 26, Active: true},
	{ID: 27, Category: "مفاهیم، تفسیر و علوم قرآن", Title: "تفسیر قرآن (سوره‌به‌سوره)", Description: "تفسیر ترتیبی سوره‌های قرآن کریم با نگاه کاربردی", Icon: "book", SortOrder: 27, Active: true},
	{ID: 28, Category: "مفاهیم، تفسیر و علوم قرآن", Title: "تفسیر موضوعی قرآن کریم", Description: "بررسی موضوعات محوری قرآن مانند عبادت، اخلاق، خانواده و اقتصاد", Icon: "doc", SortOrder: 28, Active: true},
	{ID: 29, Category: "مفاهیم، تفسیر و علوم قرآن", Title: "علوم و تاریخ قرآن کریم", Description: "آشنایی با علوم قرآنی، تاریخ نزول و جمع قرآن کریم", Icon: "book", SortOrder: 29, Active: true},
	{ID: 30, Category: "مفاهیم، تفسیر و علوم قرآن", Title: "آموزش واژگان کلیدی قرآن", Description: "یادگیری واژگان پرتکرار و کلیدی قرآن برای فهم بهتر آیات", Icon: "doc", SortOrder: 30, Active: true},
	{ID: 31, Category: "مفاهیم، تفسیر و علوم قرآن", Title: "ادعیه و زیارات قرآنی", Description: "آموزش دعاهای قرآنی و زیارات متداول با ادب و شان نزول", Icon: "quran", SortOrder: 31, Active: true},

	// ── آموزش‌های ویژه ──
	{ID: 32, Category: "آموزش‌های ویژه", Title: "قرآن‌آموزی ویژه کودکان", Description: "کلاس‌های شاد و متناسب با سن کودکان برای علاقه‌مندسازی", Icon: "sparkle", SortOrder: 32, Active: true},
	{ID: 33, Category: "آموزش‌های ویژه", Title: "قرآن‌آموزی ویژه نوجوانان", Description: "برنامه آموزشی متناسب با نیازها و ذائقه نوجوانان", Icon: "users", SortOrder: 33, Active: true},
	{ID: 34, Category: "آموزش‌های ویژه", Title: "قرآن‌آموزی ویژه بانوان", Description: "جلسات آموزشی متناسب برای خواهران با محیطی امن", Icon: "heart", SortOrder: 34, Active: true},
	{ID: 35, Category: "آموزش‌های ویژه", Title: "آموزش قرآن به زبان‌های دیگر", Description: "آموزش قرآن به زبان‌های عربی، انگلیسی و اردو برای فارسی‌زبانان و غیرفارسی‌زبانان", Icon: "grid", SortOrder: 35, Active: true},
	{ID: 36, Category: "آموزش‌های ویژه", Title: "تربیت مدرس و معلم قرآن", Description: "آماده‌سازی مدرسان روخوانی، تجوید و حفظ برای تدریس", Icon: "award", SortOrder: 36, Active: true},

	// ── آمادگی و مشاوره قرآنی ──
	{ID: 37, Category: "آمادگی و مشاوره قرآنی", Title: "آمادگی مسابقات تلاوت و قرائت", Description: "تمرین هدفمند و آماده‌سازی تخصصی برای مسابقات تلاوت", Icon: "award", SortOrder: 37, Active: true},
	{ID: 38, Category: "آمادگی و مشاوره قرآنی", Title: "آمادگی مسابقات اذان و صوت و لحن", Description: "تمرین تخصصی برای رشته‌های اذان و صوت و لحن مسابقات", Icon: "award", SortOrder: 38, Active: true},
	{ID: 39, Category: "آمادگی و مشاوره قرآنی", Title: "مشاوره و برنامه‌ریزی مسیر قرآنی", Description: "طراحی مسیر شخصی یادگیری قرآن با ارزیابی نقاط ضعف و قوت", Icon: "list", SortOrder: 39, Active: true},
	{ID: 40, Category: "آمادگی و مشاوره قرآنی", Title: "ارزیابی و رتبه‌بندی سطح قرآنی", Description: "ارزیابی دقیق سطح فعلی روخوانی، تجوید یا حفظ شما", Icon: "trending", SortOrder: 40, Active: true},
}

// legacyServiceRules maps free-text service titles that existed before the
// official catalog to their closest official entry. The first rule whose any
// keyword appears in the normalized title wins; the final fallback maps to
// the generic recitation service so nothing ends up unmapped.
var legacyServiceRules = []struct {
	title    string
	keywords []string
}{
	{"حفظ قرآن کریم با برنامه‌ریزی شخصی", []string{"حفظ"}},
	{"آمادگی آزمون و مسابقات حفظ", []string{"مسابقه حفظ", "آزمون حفظ"}},
	{"آموزش صوت و لحن (مبانی و تمهید)", []string{"صوت و لحن", "لحن", "تمهید", "آواسازی", "صوت"}},
	{"مقامات قرآنی و زیباخوانی", []string{"مقام", "زیبا", "آوازی", "دستگاه"}},
	{"آموزش اذان و اقامه", []string{"اذان", "اقامه"}},
	{"مداحی و نوحه‌خوانی اهل‌بیت (ع)", []string{"مداحی", "نوحه", "عزاداری", "مناسبتی"}},
	{"آموزش تجوید و احکام عملی", []string{"تجوید", "احکام", "مدّ", "مُدّ", "اصول تلاوت", "قواعد"}},
	{"ترتیل قرآن کریم", []string{"ترتیل"}},
	{"روان‌خوانی و فصالت در تلاوت", []string{"روان", "فصالت", "روانخوانی"}},
	{"تصحیح تلاوت و اصلاح لهجه", []string{"تصحیح", "اصلاح", "لهجه"}},
	{"تفسیر قرآن (سوره‌به‌سوره)", []string{"تفسیر"}},
	{"ترجمه و مفاهیم قرآن کریم", []string{"ترجمه", "مفاهیم", "معارف"}},
	{"علوم و تاریخ قرآن کریم", []string{"علوم قرآن", "علوم و", "تاریخ قرآن", "ناسخ"}},
	{"ادعیه و زیارات قرآنی", []string{"دعا", "ادعیه", "زیارت", "جوشن", "کمیل"}},
	{"قرآن‌آموزی ویژه کودکان", []string{"کودک", "طفل", "پیش‌دبستانی", "دبستان"}},
	{"قرآن‌آموزی ویژه نوجوانان", []string{"نوجوان"}},
	{"قرآن‌آموزی ویژه بانوان", []string{"بانوان", "خواهران", "ویژه بانوان"}},
	{"آموزش قرآن به زبان‌های دیگر", []string{"عربی", "انگلیسی", "اردو", "زبان"}},
	{"آموزش الفبا و قرآن‌آموزی از پایه", []string{"الفبا", "نورانی", "قاعده", "از پایه", "پایه"}},
	{"تلاوت و روخوانی قرآن کریم", []string{"تلاوت", "روخوانی", "قرائت", "قرآن"}},
}

// normalizeServiceTitle strips ZWNJ, diacritics and extra whitespace so
// keyword matching works across different Persian orthographies.
func normalizeServiceTitle(title string) string {
	replacer := strings.NewReplacer(
		"‌", "", // ZWNJ
		"ً", "", "ٌ", "", "ٍ", "", "َ", "", "ُ", "", "ِ", "", "ّ", "", "ْ", "",
		"آ", "ا", "أ", "ا", "إ", "ا", "ة", "ه", "ى", "ی", "ك", "ک",
	)
	return strings.TrimSpace(replacer.Replace(title))
}

// RunCatalog upserts the official service catalog and then maps any legacy
// free-text services to their closest official entry. It is idempotent and
// safe to run on every startup.
func RunCatalog(db *gorm.DB) error {
	if err := db.Transaction(func(tx *gorm.DB) error {
		for i := range officialCatalog {
			row := officialCatalog[i]
			var existing domain.OfficialService
			err := tx.First(&existing, row.ID).Error
			if err == gorm.ErrRecordNotFound {
				if err := tx.Create(&row).Error; err != nil {
					return err
				}
				continue
			}
			if err != nil {
				return err
			}
			if err := tx.Model(&existing).Updates(map[string]any{
				"category":    row.Category,
				"title":       row.Title,
				"description": row.Description,
				"icon":        row.Icon,
				"sort_order":  row.SortOrder,
				"active":      true,
			}).Error; err != nil {
				return err
			}
		}
		return mapLegacyServices(tx)
	}); err != nil {
		return err
	}
	log.Printf("seed: official service catalog ensured (%d entries)", len(officialCatalog))
	return nil
}

// mapLegacyServices assigns an OfficialServiceID to every service that was
// created with a free-text title before the catalog existed. Titles are
// replaced with the official title so the marketplace stays consistent.
func mapLegacyServices(tx *gorm.DB) error {
	var services []domain.Service
	if err := tx.Where("official_service_id IS NULL").Find(&services).Error; err != nil {
		return err
	}
	if len(services) == 0 {
		return nil
	}

	fallback := officialCatalog[3] // تلاوت و روخوانی قرآن کریم
	mapped := 0
	for _, s := range services {
		entry := matchLegacyService(s.Title)
		if entry == nil {
			entry = &fallback
		}
		if err := tx.Model(&domain.Service{}).Where("id = ?", s.ID).Updates(map[string]any{
			"official_service_id": entry.ID,
			"title":               entry.Title,
			"icon":                entry.Icon,
		}).Error; err != nil {
			return err
		}
		mapped++
	}
	log.Printf("seed: mapped %d legacy service(s) to the official catalog", mapped)
	return nil
}

func matchLegacyService(title string) *domain.OfficialService {
	normalized := normalizeServiceTitle(title)
	for _, rule := range legacyServiceRules {
		for _, keyword := range rule.keywords {
			if strings.Contains(normalized, normalizeServiceTitle(keyword)) {
				for i := range officialCatalog {
					if officialCatalog[i].Title == rule.title {
						return &officialCatalog[i]
					}
				}
			}
		}
	}
	return nil
}
