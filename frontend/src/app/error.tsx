'use client';

import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import Link from 'next/link';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 100, height: 100, borderRadius: 28, background: '#FDE8E8', color: 'var(--rose)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Icon name="x" size={50} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 10 }}>خطایی رخ داد</h1>
          <p style={{ fontSize: 16, color: 'var(--ink-3)', marginBottom: 28, lineHeight: 1.9 }}>
            مشکلی در بارگذاری صفحه پیش آمد. لطفاً دوباره تلاش کنید.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              onClick={reset}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 999, border: 'none', cursor: 'pointer',
                background: 'var(--olive-600)', color: '#fff', fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              <Icon name="edit" size={20} /> تلاش مجدد
            </button>
            <Link
              href="/"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', borderRadius: 999, textDecoration: 'none',
                background: 'var(--sand-100)', color: 'var(--ink-2s)', fontSize: 15, fontWeight: 700,
              }}
            >
              <Icon name="home" size={20} /> خانه
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
