import { Nav, Footer } from '@/components/web/sections';
import { Icon } from '@/components/Icon';
import { WebBtn } from '@/components/web/ui';

export default function NotFound() {
  return (
    <div style={{ background: 'var(--sand-50)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main className="public-system-state">
        <div className="public-system-visual">
          <span><Icon name="search" size={36} /></span>
          <i />
        </div>
        <small>خطای ۴۰۴</small>
        <h1>این صفحه را پیدا نکردیم</h1>
        <p>ممکن است آدرس تغییر کرده باشد یا صفحه دیگر در دسترس نباشد.</p>
        <div className="public-system-actions">
          <WebBtn href="/" icon="home">بازگشت به خانه</WebBtn>
          <WebBtn href="/search" variant="ghost" icon="search">جستجوی استاد</WebBtn>
        </div>
      </main>
      <Footer />
    </div>
  );
}
