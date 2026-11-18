# Required production seed

آخرین بازبینی: 2026-09-21

## هدف

این seed دادهٔ bootstrap واقعی وُدّا است و برخلاف demo seed به `AUTO_SEED` وابسته نیست. بعد از migration دیتابیس در همهٔ محیط‌ها، از جمله production، `seed.RunRequired` اجرا می‌شود. خطای این seed startup را متوقف می‌کند تا production بدون حساب‌های الزامی یا migration ناقص مدرس‌ها بالا نیاید.

## ادمین‌های الزامی

دو حساب زیر بر اساس شماره موبایل idempotent هستند و در هر اجرا نام، role و active بودن آن‌ها authoritative نگه داشته می‌شود:

- سید محمد امین عمرانی — `09136336002`
- محمد حبیب زاده — `09105912852`

شماره دوم در دیتابیس قدیمی یک پروفایل مدرس نیز دارد. در مدل جدید یک User می‌تواند Teacher profile داشته باشد، بنابراین role ادمین حفظ می‌شود و Teacher profile جداگانه به همان User متصل می‌شود.

## منبع مدرس‌ها

منبع استخراج فایل legacy `vodda_db.sql` است. خود dump داخل repository commit نشده است.

از جدول `providers` فقط رکوردهایی انتخاب شدند که:

- `state = 3`
- `deleted_at IS NULL`

پس از خواندن تمام INSERTهای dump، این فیلتر ۴۵ مدرس با موبایل یکتا تولید کرد.

### mapping

- `fname + lname` → User.Name
- mobile ده‌رقمی legacy → موبایل یازده‌رقمی با صفر ابتدایی
- `city_id` + جدول `city` → City
- `skill` → Teacher.Tag و Skills
- `degree` → Teacher.Level
- `cv` → Teacher.Bio
- `sex = 0` → Female
- profileهای مهاجرتی → `verified=true`, `available=true`, `status=approved`
- همهٔ مدرس‌های منتخب بر اساس دادهٔ source در حوزه قرآن هستند و `Field = "آموزش قرآن کریم"`
- `Price30/Price60` فقط وقتی از assignment یک service فعال و حذف‌نشده با مدت دقیق ۳۰/۶۰ دقیقه قابل استخراج بود، از قیمت همان source پر شد؛ در غیر این صورت صفر باقی مانده است.

## داده‌هایی که عمداً migrate نشدند

طبق scope «فقط مدرس‌ها»، این داده‌های legacy seed نشده‌اند:

- users عادی
- services و provider_services به‌عنوان رکورد قابل رزرو
- work times / provider_free_time
- orders و sessions
- scores / reviews
- wallet / settlements / financial documents
- tags و featured lists
- آواتارها، چون dump فقط path را داشت و media fileها در ورودی migration موجود نبودند.

همچنین این فیلدهای حساس از providerها وارد مدل جدید نشده‌اند:

- national code
- card number
- landline
- latitude/longitude
- notification token
- password / verify code

## idempotency

- Adminها بر اساس mobile upsert می‌شوند و role/name/active آن‌ها repair می‌شود.
- Teacher User بر اساس mobile پیدا یا ایجاد می‌شود؛ admin هیچ‌وقت به teacher downgrade نمی‌شود.
- Teacher profile فقط اگر برای User وجود نداشته باشد ساخته می‌شود.
- پس از ایجاد Teacher profile، تغییرات بعدی مدیر/مدرس توسط startup seed overwrite نمی‌شود.
- seed file روی startup تعداد دقیق ۴۵ رکورد، فرمت موبایل و duplicate نبودن موبایل‌ها را validate می‌کند.
- مقادیر متنی پیش از insert با محدودیت‌های schema به‌صورت rune-safe truncate می‌شوند.

## Demo seed

`seed.Run` همچنان demo seed اختیاری development است و فقط وقتی `AUTO_SEED=true` باشد اجرا می‌شود. production طبق validation همچنان اجازهٔ `AUTO_SEED=true` ندارد؛ این محدودیت با required production seed تداخلی ندارد.
