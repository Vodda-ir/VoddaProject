import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';

export const metadata = { title: 'وبلاگ · وُدّا' };

const posts = [
  { title: 'روش‌های مؤثر در حفظ قرآن کریم', excerpt: 'در این مقاله به بررسی روش‌های نوین و مؤثر در حفظ قرآن می‌پردازیم…', date: '۱۴۰۳/۰۴/۱۵', tag: 'حفظ' },
  { title: 'تجوید قرآن؛ قواعد پایه', excerpt: 'آشنایی با قواعد پایه‌ای تجوید برای شروع یادگیری تلاوت صحیح…', date: '۱۴۰۳/۰۴/۱۰', tag: 'تجوید' },
  { title: 'تاریخچه مداحی در ایران', excerpt: 'نگاهی به سیر تطور مداحی و نقش آن در فرهنگ ایرانی-اسلامی…', date: '۱۴۰۳/۰۳/۲۸', tag: 'مداحی' },
];

export default function BlogPage() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="وبلاگ" title="مقالات و مطالب آموزشی" sub="جدیدترین مطالب درباره آموزش قرآن، تجوید و مداحی را اینجا بخوانید." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 36 }}>
          {posts.map((p, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: 'var(--sh-sm)', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 80, height: 80, borderRadius: 16, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name="book" size={36} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--olive-600)', background: 'var(--olive-50)', padding: '3px 10px', borderRadius: 999 }}>{p.tag}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{p.date}</span>
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{p.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.9, color: 'var(--ink-3)' }}>{p.excerpt}</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 13, fontWeight: 700, color: 'var(--olive-600)', cursor: 'pointer' }}>
                  ادامه مطلب <Icon name="arrowL" size={16} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
