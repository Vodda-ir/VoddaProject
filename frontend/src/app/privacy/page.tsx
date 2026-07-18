import { Nav, Footer } from '@/components/web/sections';
import { SectionTitle } from '@/components/web/ui';

export const metadata = { title: 'حریم خصوصی · وُدّا' };

const sections = [
  { title: '۱. جمع‌آوری اطلاعات', body: 'وُدّا اطلاعات شخصی شما (نام، شماره موبایل، شهر) را برای ارائه خدمات جمع‌آوری می‌کند. اطلاعات بانکی شما ذخیره نمی‌شود.' },
  { title: '۲. استفاده از اطلاعات', body: 'اطلاعات شما صرفاً برای ارائه خدمات آموزشی، ارتباط با استاد و پرداخت‌ها استفاده می‌شود و در اختیار اشخاص ثالث قرار نمی‌گیرد.' },
  { title: '۳. ذخیره‌سازی امن', body: 'اطلاعات شما با استفاده از روش‌های امنیتی استاندارد ذخیره می‌شود. توکن احراز هویت به‌صورت رمزنگاری‌شده نگهداری می‌شود.' },
  { title: '۴. حقوق کاربر', body: 'شما حق دارید اطلاعات حساب خود را ویرایش یا حذف کنید. برای درخواست حذف حساب با پشتیبانی تماس بگیرید.' },
  { title: '۵. کوکی‌ها', body: 'وُدّا از کوکی‌ها برای نگهداری وضعیت ورود شما استفاده می‌کند. می‌توانید کوکی‌ها را از مرورگر خود پاک کنید.' },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="حریم خصوصی" title="سیاست حریم خصوصی وُدّا" sub="ما به حفاظت از اطلاعات شخصی شما متعهد هستیم." />

        <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: 'var(--sh-sm)', marginTop: 36 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ paddingBottom: i < sections.length - 1 ? 24 : 0, marginBottom: i < sections.length - 1 ? 24 : 0, borderBottom: i < sections.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
              <h2 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>{s.title}</h2>
              <p style={{ fontSize: 14.5, lineHeight: 2, color: 'var(--ink-3)' }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
