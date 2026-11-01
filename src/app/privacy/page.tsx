import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { PublicPageHero } from '@/components/web/ui';

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
      <PublicPageHero
        kicker="حریم خصوصی"
        title="نحوهٔ پردازش اطلاعات در وُدّا"
        description="این صفحه بر اساس معماری و قابلیت‌های فعال نسخهٔ فعلی نوشته شده است."
        icon="shield"
      />

      <main className="public-container public-content">
        <div className="legal-layout">
          <aside className="legal-side">
            <span className="public-principle-icon"><Icon name="shield" size={22} /></span>
            <strong>حریم خصوصی</strong>
            <p>این متن باید هم‌زمان با تغییر سرویس‌های فعال و نحوهٔ پردازش واقعی داده به‌روز بماند.</p>
            <div className="legal-side-meta">
              <span><Icon name="checkCircle" size={16} />مبتنی بر نسخهٔ فعلی</span>
              <span><Icon name="shield" size={16} />شفاف و قابل بازبینی</span>
            </div>
          </aside>

          <article className="legal-document">
            {sections.map((section, index) => (
              <section key={section.title} className="legal-section">
                <span className="legal-index">{String(index + 1).replace(/[0-9]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)])}</span>
                <div>
                  <h2>{section.title.replace(/^[۰-۹]+\.\s*/, '')}</h2>
                  <p>{section.body}</p>
                </div>
              </section>
            ))}
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}
