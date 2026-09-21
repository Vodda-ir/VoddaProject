import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { PublicPageHero, PublicSurface, SectionTitle, WebBtn } from '@/components/web/ui';

export default function AboutPage() {
  const principles = [
    { icon: 'shield' as const, title: 'تأیید پیش از انتشار', desc: 'پروفایل استاد تا پیش از بررسی ادمین در جستجوی عمومی نمایش داده نمی‌شود.' },
    { icon: 'wallet' as const, title: 'شفافیت مالی', desc: 'گردش رزرو، بازگشت وجه، درآمد و برداشت در دفتر تراکنش‌ها قابل پیگیری است.' },
    { icon: 'star' as const, title: 'امتیاز معتبر', desc: 'هر جلسه فقط یک‌بار و تنها توسط قرآن‌آموز همان جلسه قابل امتیازدهی است.' },
    { icon: 'message' as const, title: 'پشتیبانی قابل پیگیری', desc: 'پیام‌های تماس داخل سامانه ثبت می‌شوند و در پنل مدیریت قابل رسیدگی‌اند.' },
  ];

  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <PublicPageHero
        kicker="دربارهٔ وُدّا"
        title="یک مسیر روشن برای پیدا کردن استاد و مدیریت یادگیری"
        description="وُدّا برای ساده‌کردن ارتباط قرآن‌آموز با استادان قرآن کریم و مداحی ساخته شده؛ با تأکید بر رزرو شفاف، اطلاعات قابل پیگیری و تجربه‌ای فارسی و یکپارچه."
        icon="quran"
      />

      <main className="public-container public-content">
        <section className="about-story-grid">
          <div>
            <SectionTitle kicker="هدف محصول" title="سادگی در تجربه، شفافیت در منطق" center={false} />
            <p className="public-lead">
              محصول فعلی بر پروفایل و تأیید استاد، خدمات و برنامهٔ کاری، رزرو جلسه، کیف پول، تسویه و امتیازدهی پس از جلسه تمرکز دارد. قابلیت‌هایی که هنوز به سرویس واقعی متصل نشده‌اند، تا زمان آماده‌شدن به‌عنوان قابلیت فعال معرفی نمی‌شوند.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginTop: 24 }}>
              <WebBtn href="/search" icon="search">پیدا کردن استاد</WebBtn>
              <WebBtn href="/app" variant="ghost" icon="grid">دیدن اپ وُدّا</WebBtn>
            </div>
          </div>

          <PublicSurface style={{ padding: 20 }}>
            <div className="about-scope-header">
              <span><Icon name="checkCircle" size={21} /></span>
              <div>
                <strong>دامنهٔ نسخهٔ فعلی</strong>
                <p>آنچه در محصول واقعاً فعال و قابل پیگیری است.</p>
              </div>
            </div>
            <div className="about-scope-list">
              {[
                ['user' as const, 'پروفایل قرآن‌آموز و استاد'],
                ['calendar' as const, 'رزرو و مدیریت وضعیت جلسه'],
                ['wallet' as const, 'کیف پول، درآمد و برداشت'],
                ['star' as const, 'نظر و امتیاز پس از جلسه'],
              ].map(([icon, label]) => (
                <span key={label}><Icon name={icon} size={17} />{label}</span>
              ))}
            </div>
          </PublicSurface>
        </section>

        <section style={{ marginTop: 72 }}>
          <SectionTitle kicker="اصول طراحی محصول" title="چیزهایی که وُدّا روی آن‌ها حساس است" sub="این اصول فقط شعار صفحهٔ معرفی نیستند؛ با رفتار فعلی محصول هم‌راستا نگه داشته می‌شوند." />
          <div className="public-principles-grid">
            {principles.map((item) => (
              <PublicSurface key={item.title} style={{ padding: 22 }}>
                <span className="public-principle-icon"><Icon name={item.icon} size={23} /></span>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </PublicSurface>
            ))}
          </div>
        </section>

        <section className="public-inline-cta">
          <div>
            <small>شروع مسیر</small>
            <strong>استاد مناسب را در بین پروفایل‌های منتشرشده پیدا کنید.</strong>
          </div>
          <WebBtn href="/search" icon="arrowL">جستجوی استاد</WebBtn>
        </section>
      </main>
      <Footer />
    </div>
  );
}
