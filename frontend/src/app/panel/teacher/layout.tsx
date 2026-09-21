'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { clearToken, fullUrl, getToken } from '@/lib/auth';

const NAV = [
  { id: 'dash', icon: 'grid' as const, label: 'داشبورد', href: '/panel/teacher' },
  { id: 'requests', icon: 'message' as const, label: 'درخواست‌ها', href: '/panel/teacher/requests' },
  { id: 'sessions', icon: 'calendar' as const, label: 'جلسات', href: '/panel/teacher/sessions' },
  { id: 'services', icon: 'book' as const, label: 'خدمات من', href: '/panel/teacher/services' },
  { id: 'worktimes', icon: 'clock' as const, label: 'زمان‌های کاری', href: '/panel/teacher/worktimes' },
  { id: 'wallet', icon: 'wallet' as const, label: 'کیف پول', href: '/panel/teacher/wallet' },
  { id: 'withdrawals', icon: 'download' as const, label: 'برداشت‌ها', href: '/panel/teacher/withdrawals' },
  { id: 'reviews', icon: 'star' as const, label: 'نظرها', href: '/panel/teacher/reviews' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ name: '...', role: 'teacher', avatarUrl: '', hasTeacherProfile: false });
  const [access, setAccess] = useState<'checking' | 'allowed' | 'missing' | 'unauthorized' | 'error'>('checking');
  const token = getToken();

  useEffect(() => {
    if (!token) {
      setAccess('unauthorized');
      return;
    }

    const controller = new AbortController();
    setAccess('checking');
    fetch('/api/backend/me', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
      .then(async (response) => {
        if (response.status === 401) {
          setAccess('unauthorized');
          return null;
        }
        if (!response.ok) {
          setAccess('error');
          return null;
        }
        return response.json();
      })
      .then((payload) => {
        if (!payload?.data) return;
        const hasTeacherProfile = Boolean(payload.data.teacher?.id);
        setUser({
          name: payload.data.name || 'کاربر',
          role: payload.data.role || 'learner',
          avatarUrl: fullUrl(payload.data.avatar_url) || '',
          hasTeacherProfile,
        });
        setAccess(hasTeacherProfile ? 'allowed' : 'missing');
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setAccess('error');
      });
    return () => controller.abort();
  }, [token]);

  if (access !== 'allowed') {
    return <TeacherPanelAccessState access={access} role={user.role} />;
  }

  const activeId = NAV.find((item) => item.id === 'dash' ? pathname === '/panel/teacher' : pathname.startsWith(item.href))?.id || 'dash';
  const allPanels = [
    ...(user.role === 'admin' ? [{ href: '/panel/admin', label: 'پنل مدیریت', icon: 'shield' as const, bg: 'rgba(255,255,255,.1)', fg: '#fff' }] : []),
    ...(user.hasTeacherProfile ? [{ href: '/panel/teacher', label: 'پنل استاد', icon: 'award' as const, bg: 'rgba(255,255,255,.08)', fg: 'rgba(255,255,255,.8)' }] : []),
    { href: '/panel/user', label: 'پنل کاربری', icon: 'user' as const, bg: 'rgba(255,255,255,.06)', fg: 'rgba(255,255,255,.6)' },
  ];

  async function logout() {
    clearToken();
    window.location.href = '/panel/login';
  }

  return (
    <div className="panel-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--sand-50)' }}>
      <div className="mobile-bar" style={{ display: 'none', position: 'sticky', top: 0, zIndex: 50, background: 'var(--olive-900)', color: '#fff', padding: '12px 16px', alignItems: 'center', gap: 12, width: '100%' }}>
        <button type="button" aria-label="باز کردن منو" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}><Icon name="list" size={24} /></button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>وُدّا · استاد</span>
      </div>
      {sidebarOpen && <button type="button" aria-label="بستن منو" className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 90, display: 'none', border: 0 }} onClick={() => setSidebarOpen(false)} />}

      <aside className="panel-sidebar" data-open={sidebarOpen} style={{ width: 252, flexShrink: 0, background: 'var(--olive-900)', color: 'rgba(255,255,255,.82)', display: 'flex', flexDirection: 'column', padding: '22px 16px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 4px' }}><img src="/vodda-logo.svg" alt="" style={{ width: 32, height: 32, filter: 'brightness(0) invert(1)' }} /><span style={{ fontWeight: 800, fontSize: 24, color: '#fff' }}>وُدّا</span></div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', padding: '0 8px 18px' }}>پنل استاد</div>
        <nav aria-label="ناوبری استاد" style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map((item) => {
            const selected = item.id === activeId;
            return <Link key={item.id} href={item.href} onClick={() => setSidebarOpen(false)} aria-current={selected ? 'page' : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12, fontSize: 14, fontWeight: selected ? 700 : 500, color: selected ? '#fff' : 'rgba(255,255,255,.7)', background: selected ? 'var(--olive-600)' : 'transparent' }}><Icon name={item.icon} size={20} stroke={selected ? 2 : 1.7} /><span style={{ flex: 1 }}>{item.label}</span></Link>;
          })}
        </nav>

        <div style={{ position: 'relative', marginTop: 12 }}>
          <button type="button" aria-expanded={userOpen} onClick={() => setUserOpen(!userOpen)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 10, borderRadius: 14, background: 'rgba(255,255,255,.06)', cursor: 'pointer', border: 'none', textAlign: 'start', fontFamily: 'var(--font)' }}>
            <Avatar size={38} imageUrl={user.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div><div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>استاد</div></div>
            <Icon name="chevronUp" size={16} style={{ color: 'rgba(255,255,255,.4)', transform: userOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {userOpen && <><button type="button" aria-label="بستن منوی حساب" style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, background: 'transparent' }} onClick={() => setUserOpen(false)} /><div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#1a1f14', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 -8px 32px rgba(0,0,0,.35)', padding: 10, zIndex: 50 }}>
            {allPanels.map((panel) => <Link key={panel.href} href={panel.href} onClick={() => setUserOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}><span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: panel.bg, color: panel.fg }}><Icon name={panel.icon} size={17} /></span><span style={{ flex: 1 }}>{panel.label}</span></Link>)}
            <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 4, paddingTop: 4 }}><button type="button" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 11, fontSize: 13, fontWeight: 600, color: '#E88C8C', width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}><Icon name="logout" size={17} /> خروج از حساب</button></div>
          </div></>}
        </div>
      </aside>
      <div className="panel-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>{children}</div>
      <style>{`@media (max-width:768px){.panel-shell{display:block!important}.mobile-bar{display:flex!important}.panel-content{width:100%;min-height:calc(100vh - 56px)}.panel-sidebar{position:fixed!important;top:0;right:0;z-index:100;transform:translateX(100%);transition:transform .25s}.panel-sidebar[data-open="true"]{transform:translateX(0)!important}.mobile-overlay{display:block!important}}`}</style>
    </div>
  );
}

function TeacherPanelAccessState({
  access,
  role,
}: {
  access: 'checking' | 'missing' | 'unauthorized' | 'error';
  role: string;
}) {
  const isChecking = access === 'checking';
  const isUnauthorized = access === 'unauthorized';
  const isMissing = access === 'missing';

  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'var(--sand-50)',
    }}>
      <section style={{
        width: 'min(520px, 100%)',
        padding: 26,
        border: '1px solid var(--sand-150)',
        borderRadius: 22,
        background: '#fff',
        boxShadow: 'var(--sh-md)',
        textAlign: 'center',
      }}>
        <span style={{
          width: 56,
          height: 56,
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 14px',
          borderRadius: 17,
          color: isMissing ? 'var(--gold)' : 'var(--olive-700)',
          background: isMissing ? 'var(--gold-bg)' : 'var(--olive-100)',
        }}>
          <Icon name={isChecking ? 'refresh' : isUnauthorized ? 'shield' : isMissing ? 'award' : 'info'} size={26} />
        </span>

        <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>
          {isChecking
            ? 'در حال بررسی دسترسی پنل استاد…'
            : isUnauthorized
              ? 'برای ورود به پنل استاد ابتدا وارد حساب شوید'
              : isMissing
                ? 'برای این حساب پروفایل استاد فعال نیست'
                : 'بررسی دسترسی پنل استاد انجام نشد'}
        </h1>

        <p style={{ margin: '9px 0 20px', color: 'var(--ink-3)', fontSize: 12.5, lineHeight: 1.9 }}>
          {isChecking
            ? 'اطلاعات حساب و پروفایل استاد بررسی می‌شود.'
            : isUnauthorized
              ? 'پس از ورود، دسترسی استاد بر اساس پروفایل واقعی حساب بررسی می‌شود.'
              : isMissing
                ? role === 'admin'
                  ? 'حساب مدیر فقط زمانی می‌تواند وارد پنل استاد شود که برای همان حساب Teacher profile وجود داشته باشد.'
                  : 'برای استفاده از امکانات استاد باید ابتدا درخواست استادی و پروفایل مربوط ثبت شود.'
                : 'ارتباط با اطلاعات حساب برقرار نشد. صفحه را دوباره بارگذاری کنید.'}
        </p>

        {!isChecking && (
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: 9 }}>
            {isUnauthorized ? (
              <Link href="/panel/login" style={accessPrimaryButton}>ورود به حساب</Link>
            ) : isMissing && role === 'admin' ? (
              <>
                <Link href="/panel/admin" style={accessPrimaryButton}>بازگشت به پنل مدیریت</Link>
                <Link href="/panel/user" style={accessSecondaryButton}>پنل کاربری</Link>
              </>
            ) : isMissing ? (
              <>
                <Link href="/panel/teacher/register" style={accessPrimaryButton}>ثبت درخواست استادی</Link>
                <Link href="/panel/user" style={accessSecondaryButton}>پنل کاربری</Link>
              </>
            ) : (
              <button type="button" onClick={() => window.location.reload()} style={accessPrimaryButton}>تلاش دوباره</button>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

const accessPrimaryButton: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 42,
  padding: '9px 15px',
  border: 0,
  borderRadius: 12,
  color: '#fff',
  background: 'var(--olive-600)',
  fontSize: 12,
  fontWeight: 700,
  cursor: 'pointer',
};

const accessSecondaryButton: React.CSSProperties = {
  ...accessPrimaryButton,
  border: '1px solid var(--sand-200)',
  color: 'var(--ink-2s)',
  background: '#fff',
};
