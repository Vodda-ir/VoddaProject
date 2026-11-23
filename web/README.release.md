# وُدّا Web v2 — نسخه تولیدی (تمیز)

سایت معرفی وُدّا روی ریشه `vodda.ir` — خروجی تمیزِ بازسازی REA (بدون هیچ مصنوع پیش‌نمایش).

## معماری اتصال (اتصال کامل بک‌اند/فرانت‌اند/API)
- **داده زنده**: `assets/vodda-api.js` از `https://api.vodda.ir/api/v1` (CORS تأییدشده برای vodda.ir)
  - لندینگ: کاروسل استادان واقعی (`GET /teachers`)
  - `/search.html`: جست‌وجوی زنده (`GET /teachers?q=…`) + فیلترها
  - `/teacher.html?id=N`: پروفایل واقعی (`GET /teachers/:id`) با خدمات و نظرات واقعی
  - در صورت خطا/خالی بودن: پیام صادقانه — بدون داده جعلی
- **جریان‌های کاربردی** → اپ واقعی (Next.js + بک‌اند Go):
  - ورود/OTP → `/panel/login` · رزرو → `/panel/user/book` · جلسات → `/panel/user/sessions`
  - کیف پول → `/panel/user/wallet` · پروفایل → `/panel/user/settings`
  - پنل استاد → `/panel/teacher` · ثبت استاد → `/panel/teacher/register` · پنل مدیریت → `/panel/admin`
  - پروفایل عمومی استاد → `/teachers/{id}` (رزرو واقعی)
- صفحات کاربردی قدیمی به استاب redirect تبدیل شده‌اند (بدون داده جعلی).
- **fallback امن nginx**: مسیرهای بدون فایل استاتیک → فرانت‌اند قبلی (اپ کاربردی همیشه در دسترس).

## ساخت
منبع: `Vodda-ir/vodda2` → برنچ `rea/preview` → پوشه `preview/` → `python3 _release.py`

## استقرار
```bash
bash deploy.sh web     # فقط سایت استاتیک (سریع)
bash deploy.sh         # استقرار کامل
```
