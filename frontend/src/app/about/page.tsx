import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';

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
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="دربارهٔ وُدّا" title="همراه یادگیری قرآن و مداحی" sub="بستری برای یافتن استاد، ثبت درخواست جلسه و پیگیری شفاف وضعیت رزرو و امور مالی." />

        <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: 'var(--sh-sm)', marginTop: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>هدف محصول</h2>
          <p style={{ fontSize: 15, lineHeight: 2.1, color: 'var(--ink-3)' }}>
            وُدّا برای ساده‌کردن ارتباط قرآن‌آموز با استادان قرآن کریم و مداحی ساخته شده است. محصول فعلی بر پروفایل و تأیید استاد، برنامهٔ کاری، رزرو جلسه، کیف پول، تسویه و امتیازدهی پس از جلسه تمرکز دارد. پرداخت اینترنتی مستقیم و زیرساخت تماس صوتی تا زمان اتصال و آزمون سرویس‌های واقعی به‌عنوان قابلیت فعال معرفی نمی‌شوند.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 24 }}>
          {principles.map((item) => (
            <div key={item.title} style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: 'var(--sh-sm)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon name={item.icon} size={26} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.9, marginTop: 6 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
