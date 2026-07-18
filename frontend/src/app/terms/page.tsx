import { Nav, Footer } from '@/components/web/sections';
import { SectionTitle } from '@/components/web/ui';

export const metadata = { title: 'قوانین و مقررات · وُدّا' };

const sections = [
  { title: '۱. تعاریف', body: '«وُدّا» پلتفرمی آنلاین برای اتصال قرآن‌آموزان به اساتید مجرب قرآن و مداحی است. «استاد» به فردی اطلاق می‌شود که خدمات آموزشی ارائه می‌دهد و «کاربر» به فردی که جلسات را رزرو می‌کند.' },
  { title: '۲. ثبت‌نام و حساب کاربری', body: 'کاربران باید اطلاعات صحیح و واقعی در ثبت‌نام ارائه دهند. هر کاربر تنها می‌تواند یک حساب کاربری داشته باشد. حساب کاربری غیرقابل انتقال است.' },
  { title: '۳. رزرو و لغو جلسات', body: 'کاربر می‌تواند جلسات را تا ۲ ساعت قبل از زمان مقرر لغو کند. لغو در زمان کمتر از ۲ ساعت ممکن است باعث کسر هزینه شود. استاد نیز می‌تواند درخواست را رد کند.' },
  { title: '۴. پرداخت و کارمزد', body: 'وُدّا از هر جلسه برگزارشده درصدی کارمزد دریافت می‌کند. مبالغ پرداختی در کیف پول کاربر نگهداری شده و پس از برگزاری جلسه به استاد پرداخت می‌شود.' },
  { title: '۵. قوانین رفتاری', body: 'استفاده از زبان محترمانه و رفتار مناسب در تمام جلسات الزامی است. تخلف باعث مسدود شدن حساب می‌شود.' },
  { title: '۶. مالکیت معنوی', body: 'تمامی محتوای ارائه‌شده توسط اساتید تحت حمایت قوانین مالکیت معنوی است. ضبط یا انتشار بدون اجازه ممنوع است.' },
];

export default function TermsPage() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="قوانین و مقررات" title="شرایط استفاده از خدمات وُدّا" sub="استفاده از خدمات وُدّا به معنای پذیرش این قوانین است." />

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
