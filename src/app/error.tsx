'use client';

import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import Link from 'next/link';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="public-system-state">
        <div className="public-system-visual error">
          <span><Icon name="info" size={36} /></span>
          <i />
        </div>
        <small>خطای موقت</small>
        <h1>بارگذاری این صفحه کامل نشد</h1>
        <p>یک مشکل موقت رخ داده است. می‌توانید دوباره تلاش کنید یا به صفحه اصلی برگردید.</p>
        <div className="public-system-actions">
          <button type="button" onClick={reset}><Icon name="refresh" size={18} />تلاش دوباره</button>
          <Link href="/"><Icon name="home" size={18} />خانه</Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
