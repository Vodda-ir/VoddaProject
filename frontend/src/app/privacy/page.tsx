import { Nav, Footer } from '@/components/web/sections';
import { SectionTitle } from '@/components/web/ui';

export const metadata = { title: 'حریم خصوصی · وُدّا' };

const sections = [
  { title: '۱. اطلاعات حساب', body: 'برای ارائهٔ خدمت، اطلاعاتی مانند شمارهٔ موبایل، نام، شهر، توضیحات پروفایل و تصویر انتخابی کاربر پردازش می‌شود. استادان علاوه بر این موارد، اطلاعات حرفه‌ای، خدمات و برنامهٔ کاری خود را ثبت می‌کنند.' },
  { title: '۲. اطلاعات رزرو و مالی', body: 'شناسهٔ جلسه، زمان، خدمت، مبلغ، وضعیت رزرو، تراکنش‌های کیف پول و درخواست‌های برداشت برای اجرای جریان مالی و رسیدگی به اختلاف‌ها نگهداری می‌شوند. وُدّا در نسخهٔ فعلی اطلاعات کارت بانکی یا رمز بانکی دریافت نمی‌کند.' },
  { title: '۳. سرویس‌های موردنیاز', body: 'برای ارسال کد ورود، میزبانی، پایگاه‌داده و در آینده پرداخت آنلاین ممکن است دادهٔ لازم به ارائه‌دهندگان فنی مربوط ارسال شود. هر سرویس بیرونی باید فقط به دادهٔ ضروری دسترسی داشته باشد و پیش از فعال‌سازی عمومی بررسی شود.' },
  { title: '۴. نشست و امنیت', body: 'در وب، توکن ورود داخل cookie با ویژگی HttpOnly نگهداری می‌شود و JavaScript مرورگر به مقدار آن دسترسی ندارد. در اپ، توکن در secure storage سیستم‌عامل ذخیره می‌شود. هیچ روش امنیتی مصونیت مطلق ایجاد نمی‌کند و رخدادهای مشکوک باید بررسی شوند.' },
  { title: '۵. نگهداری و درخواست کاربر', body: 'کاربر می‌تواند اطلاعات قابل‌ویرایش پروفایل را از پنل تغییر دهد و برای درخواست حذف یا بررسی اطلاعات با پشتیبانی تماس بگیرد. حذف داده‌های مالی و عملیاتی ممکن است به دلیل نیازهای حسابرسی، رسیدگی به اختلاف یا الزامات قانونی محدود باشد.' },
  { title: '۶. کوکی‌ها و لاگ‌ها', body: 'cookie نشست برای حفظ ورود استفاده می‌شود. همچنین لاگ‌های فنی مانند زمان درخواست، شناسهٔ درخواست، وضعیت پاسخ و عملیات مدیریتی برای امنیت و عیب‌یابی ثبت می‌شوند؛ محتوای حساس نباید در لاگ عمومی نوشته شود.' },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="حریم خصوصی" title="نحوهٔ پردازش اطلاعات در وُدّا" sub="این صفحه بر اساس معماری و قابلیت‌های فعال نسخهٔ فعلی نوشته شده است." />

        <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: 'var(--sh-sm)', marginTop: 36 }}>
          {sections.map((section, index) => (
            <section key={section.title} style={{ paddingBottom: index < sections.length - 1 ? 24 : 0, marginBottom: index < sections.length - 1 ? 24 : 0, borderBottom: index < sections.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>{section.title}</h2>
              <p style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--ink-3)' }}>{section.body}</p>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
