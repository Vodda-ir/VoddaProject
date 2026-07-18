import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: 28, background: 'var(--olive-100)', color: 'var(--olive-500)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Icon name="search" size={50} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>صفحه یافت نشد</h1>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', marginBottom: 28, lineHeight: 1.9 }}>
            صفحه‌ای که دنبال آن بودید وجود ندارد یا منتقل شده است.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '14px 28px', borderRadius: 999, textDecoration: 'none',
              background: 'var(--olive-600)', color: '#fff', fontSize: 15, fontWeight: 700,
            }}
          >
            <Icon name="home" size={20} /> بازگشت به خانه
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
