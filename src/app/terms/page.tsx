import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { PublicPageHero } from '@/components/web/ui';

export const metadata = { title: 'قوانین و مقررات · وُدّا' };

const sections = [
  { title: '۱. ماهیت خدمت', body: 'وُدّا بستری برای معرفی استاد، ثبت درخواست جلسه، مدیریت وضعیت رزرو و ثبت گردش مالی مرتبط است. تماس صوتی داخل سامانه و درگاه پرداخت عمومی تا زمان اعلام رسمی جزو قابلیت‌های فعال محسوب نمی‌شوند.' },
  { title: '۲. حساب کاربری', body: 'کاربر مسئول صحت اطلاعات حساب و حفاظت از دسترسی شمارهٔ موبایل خود است. واگذاری حساب یا استفاده از حساب دیگران مجاز نیست و حساب غیرفعال امکان استفاده از مسیرهای محافظت‌شده را ندارد.' },
  { title: '۳. انتشار استاد و خدمت', body: 'پروفایل استاد و هر خدمت جدید پس از بررسی مدیر منتشر می‌شود. تأیید پروفایل به معنی تضمین نتیجهٔ آموزشی نیست و کاربر باید توضیحات، قیمت و زمان‌های قابل رزرو را پیش از ثبت درخواست بررسی کند.' },
  { title: '۴. رزرو، رد و لغو', body: 'هزینهٔ خدمت هنگام ثبت رزرو از کیف پول قرآن‌آموز کسر می‌شود. رد درخواست توسط استاد یا لغو مجاز پیش از زمان شروع جلسه باعث بازگشت کامل مبلغ به کیف پول می‌شود. وضعیت نهایی و تراکنش مربوط در سامانه ثبت خواهد شد.' },
  { title: '۵. تکمیل و تسویه', body: 'پس از پایان زمان جلسه و ثبت تکمیل توسط استاد، سهم استاد و کارمزد سامانه مطابق تنظیمات فعال محاسبه و در دفتر تراکنش‌ها ثبت می‌شود. اختلاف مالی باید با شناسهٔ جلسه و سابقهٔ تراکنش از طریق پشتیبانی پیگیری شود.' },
  { title: '۶. رفتار و محتوا', body: 'رعایت احترام، قوانین کشور و حقوق اشخاص در ارتباطات و جلسات الزامی است. انتشار اطلاعات شخصی، محتوای غیرمجاز یا سوءاستفاده از سامانه می‌تواند موجب محدود یا غیرفعال شدن حساب شود.' },
  { title: '۷. تغییرات نسخه', body: 'قابلیت‌ها و سیاست‌های عملیاتی ممکن است با انتشار نسخه‌های جدید تغییر کنند. متن این صفحه باید هم‌زمان با تغییر منطق Backend و فعال‌شدن سرویس‌های بیرونی به‌روزرسانی شود.' },
];

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <PublicPageHero
        kicker="قوانین و مقررات"
        title="شرایط استفاده از خدمات وُدّا"
        description="این متن رفتار واقعی نسخهٔ فعلی سامانه را توضیح می‌دهد."
        icon="doc"
      />

      <main className="public-container public-content">
        <div className="legal-layout">
          <aside className="legal-side">
            <span className="public-principle-icon"><Icon name="doc" size={22} /></span>
            <strong>شرایط استفاده</strong>
            <p>قوانین باید با منطق واقعی Backend، جریان مالی و قابلیت‌های فعال محصول هم‌زمان به‌روز شوند.</p>
            <div className="legal-side-meta">
              <span><Icon name="checkCircle" size={16} />هم‌راستا با رفتار محصول</span>
              <span><Icon name="info" size={16} />قابل بازبینی پیش از استفاده</span>
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
