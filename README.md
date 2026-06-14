<div dir="rtl">

# وُدّا (Vodda)

**همراهِ یادگیری قرآن و مداحی** — بستری برای اتصال آسان و مطمئن قرآن‌آموزان به اساتید مجرب برای جلسات آنلاین آموزش قرآن و مداحی (مدل اسنپ‌مانند: جستجو، رزرو، پرداخت، برگزاری و امتیازدهی).

این مخزن شامل سه اپلیکیشن است:

| پوشه | توضیح | استک |
|------|-------|------|
| [`app/`](app/) | اپ موبایل کاربر (قرآن‌آموز + استاد) | Flutter · Clean Architecture · Riverpod · go_router |
| [`backend/`](backend/) | API مدیریت کل سیستم | Go · Gin · GORM · MySQL · Clean Architecture |
| [`frontend/`](frontend/) | وبسایت عمومی + پنل کاربر/استاد/ادمین | Next.js · TypeScript · Tailwind |

---

## پورت‌ها

| سرویس | پورت |
|-------|------|
| Backend | `3420` |
| Frontend | `3421` |
| MySQL | `3422` |

---

## شروع سریع (محلی با Docker)

```bash
cp .env.example .env.local      # در صورت نیاز مقادیر را ویرایش کنید
./docker-debug.sh up-d          # بالا آوردن backend + frontend + mysql
./docker-debug.sh logs          # مشاهده لاگ‌ها
./docker-debug.sh down          # توقف
```

پس از اجرا:

- وبسایت و پنل‌ها: <http://localhost:3421>
- API: <http://localhost:3420/api/v1> (سلامت: <http://localhost:3420/health>)
- MySQL: `localhost:3422`

> در حالت دیباگ، `AUTO_SEED=true` است و دیتای نمونه (۶ استاد، یک قرآن‌آموز، یک ادمین) ساخته می‌شود.
> ورود با OTP در حالت دیباگ با کد ثابت **۳۳۳۶۵** برای همهٔ شماره‌ها کار می‌کند.

### حساب‌های نمونه (Seed)

| نقش | موبایل | کد ورود |
|-----|--------|---------|
| مدیر (ادمین) | `09000000000` | `33365` |
| قرآن‌آموز | `09120000000` | `33365` |
| استاد (عباس ملک‌محمدی) | `09120000001` | `33365` |

---

## اجرای هر بخش به‌صورت جداگانه (بدون Docker)

<details><summary><b>backend</b></summary>

```bash
cd backend
# نیازمند یک MySQL در دسترس (مثلاً روی 3422)
DB_HOST=127.0.0.1 DB_PORT=3422 DB_USER=root DB_PASSWORD=vodda_secret DB_NAME=vodda \
  JWT_SECRET=dev AUTO_SEED=true go run ./cmd/server
```
</details>

<details><summary><b>frontend</b></summary>

```bash
cd frontend
npm install
npm run dev        # روی 3421 با پراکسی /api/v1 به بک‌اند
```
</details>

<details><summary><b>app (Flutter)</b></summary>

```bash
cd app
flutter pub get
# آدرس API را با dart-define تنظیم کنید (پیش‌فرض برای امولاتور اندروید: 10.0.2.2:3420)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3420/api/v1
```
</details>

---

## دیپلوی روی سرور

```bash
cp deploy.example.json deploy.json   # اطلاعات سرور (ip/username/password/path)
cp .env.example .env.production      # مقادیر تولید را پر کنید (JWT_SECRET، DB_PASSWORD، SMS، Zarinpal)
./docker-deploy.sh deploy            # build محلی + انتقال bundle + اجرا روی سرور
```

جزئیات بیشتر در [`docs/deployment.md`](docs/deployment.md).

---

## مستندات

- [معماری](docs/architecture.md)
- [مرجع API](docs/api.md)
- [دیپلوی](docs/deployment.md)
- [طراحی و design tokens](docs/design-system.md)
- [چک‌لیست پیشرفت](CHECKLIST.md)

## وضعیت

- ✅ بک‌اند: کامل و تست‌شده (احراز هویت OTP، اساتید، رزرو و چرخهٔ جلسه، کیف پول و کارمزد، نظرات، برداشت، پنل ادمین)
- ✅ فرانت‌اند: وبسایت لندینگ + اسکلت سه پنل (در حال اتصال کامل به API)
- ✅ اپ Flutter: تم، مسیریابی، ورود OTP، خانه/جستجو/پروفایل استاد (سایر صفحات در حال تکمیل)

</div>
