import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { SectionTitle } from '@/components/web/ui';

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh' }}>
      <Nav />
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 20px 80px' }}>
        <SectionTitle kicker="درباره وُدّا" title="وُدّا همراهِ یادگیری قرآن و مداحی" sub="بستری برای اتصال آسان و مطمئن قرآن‌آموزان و اساتید مجرب برای جلسات آنلاین آموزش قرآن و مداحی." />

        <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: 'var(--sh-sm)', marginTop: 36 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 14 }}>داستان ما</h2>
          <p style={{ fontSize: 15, lineHeight: 2.1, color: 'var(--ink-3)' }}>
            وُدّا با هدف دسترسی همگانی به آموزش قرآن کریم و مداحی، فضایی فراهم کرده است که در آن قرآن‌آموزان می‌توانند به‌راحتی اساتید مجرب و تأییدشده را پیدا کرده و جلسات آموزشی صوتی برگزار کنند. ما باور داریم که یادگیری قرآن نباید محدود به زمان و مکان باشد و تلاش می‌کنیم تجربه‌ای ساده، مطمئن و لذت‌بخش را برای شما فراهم کنیم.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 24 }}>
          {[
            { icon: 'users' as const, title: '۵۰۰۰+ کاربر', desc: 'قرآن‌آموز فعال در سراسر کشور' },
            { icon: 'award' as const, title: '۲۰۰+ استاد', desc: 'اساتید مجرب و تأییدشده' },
            { icon: 'calendar' as const, title: '۱۰،۰۰۰+ جلسه', desc: 'جلسات آموزشی برگزارشده' },
            { icon: 'star' as const, title: '۴.۸ امتیاز', desc: 'رضایت کاربران از وُدّا' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 20, padding: 24, textAlign: 'center', boxShadow: 'var(--sh-sm)' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--olive-100)', color: 'var(--olive-600)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon name={s.icon} size={26} />
              </div>
              <div style={{ fontSize: 17, fontWeight: 800 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
