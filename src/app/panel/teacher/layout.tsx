'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { PanelButton } from '@/components/panel/PanelUI';
import { clearToken, fullUrl, getToken } from '@/lib/auth';

type TeacherNavigationItem = {
  id: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  href: string;
};

type TeacherNavigationGroup = {
  label: string;
  items: TeacherNavigationItem[];
};

const NAV_GROUPS: TeacherNavigationGroup[] = [
  {
    label: 'امروز',
    items: [
      { id: 'dash', icon: 'grid' as const, label: 'داشبورد', href: '/panel/teacher' },
      { id: 'requests', icon: 'message' as const, label: 'درخواست‌ها', href: '/panel/teacher/requests' },
      { id: 'sessions', icon: 'calendar' as const, label: 'جلسات', href: '/panel/teacher/sessions' },
    ],
  },
  {
    label: 'ارائه خدمات',
    items: [
      { id: 'services', icon: 'book' as const, label: 'خدمات من', href: '/panel/teacher/services' },
      { id: 'worktimes', icon: 'clock' as const, label: 'زمان‌های کاری', href: '/panel/teacher/worktimes' },
      { id: 'profile', icon: 'user' as const, label: 'پروفایل مدرسی', href: '/panel/teacher/profile' },
      { id: 'reviews', icon: 'star' as const, label: 'نظرها', href: '/panel/teacher/reviews' },
    ],
  },
  {
    label: 'مالی',
    items: [
      { id: 'wallet', icon: 'wallet' as const, label: 'کیف پول', href: '/panel/teacher/wallet' },
      { id: 'withdrawals', icon: 'download' as const, label: 'برداشت‌ها', href: '/panel/teacher/withdrawals' },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

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

  const registrationAllowed =
    pathname === '/panel/teacher/register' &&
    access === 'missing' &&
    user.role !== 'admin';

  if (access !== 'allowed' && !registrationAllowed) {
    return <TeacherPanelAccessState access={access} role={user.role} />;
  }

  if (registrationAllowed) {
    return <>{children}</>;
  }

  const active = NAV.find((item) => item.id === 'dash' ? pathname === '/panel/teacher' : pathname.startsWith(item.href));
  const allPanels = [
    ...(user.role === 'admin' ? [{ href: '/panel/admin', label: 'پنل مدیریت', icon: 'shield' as const }] : []),
    { href: '/panel/teacher', label: 'پنل استاد', icon: 'award' as const },
    { href: '/panel/user', label: 'پنل کاربری', icon: 'user' as const },
  ];

  function logout() {
    clearToken();
    window.location.href = '/panel/login';
  }

  return (
    <div className="panel-shell teacher-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--sand-50)' }}>
      <div className="mobile-bar" style={{ display: 'none', position: 'sticky', top: 0, zIndex: 70, width: '100%', alignItems: 'center', gap: 11, padding: '11px 15px', color: '#fff', background: '#202719' }}>
        <button type="button" aria-label="باز کردن منو" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} style={{ padding: 4, border: 0, color: '#fff', background: 'none' }}>
          <Icon name="list" size={23} />
        </button>
        <span style={{ fontSize: 16, fontWeight: 800 }}>وُدّا · استاد</span>
      </div>

      {sidebarOpen && (
        <button type="button" aria-label="بستن منو" className="mobile-overlay" style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'none', border: 0, background: 'rgba(0,0,0,.48)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className="panel-sidebar teacher-sidebar"
        data-open={sidebarOpen}
        style={{
          width: 250,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
          padding: '20px 14px 14px',
          overflowY: 'auto',
          color: 'rgba(255,255,255,.82)',
          background: '#202719',
        }}
      >
        <Link href="/panel/teacher" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 9px 17px', color: '#fff' }}>
          <img src="/vodda-logo.svg" alt="" style={{ width: 34, height: 34, filter: 'brightness(0) invert(1)' }} />
          <span>
            <strong style={{ display: 'block', fontSize: 19, lineHeight: 1.3 }}>وُدّا</strong>
            <small style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,.43)', fontSize: 9.5 }}>فضای استاد</small>
          </span>
        </Link>

        <nav aria-label="ناوبری استاد" style={{ display: 'grid', gap: 15, flex: 1 }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div style={{ padding: '0 10px 6px', color: 'rgba(255,255,255,.33)', fontSize: 9, fontWeight: 700 }}>{group.label}</div>
              <div style={{ display: 'grid', gap: 3 }}>
                {group.items.map((item) => {
                  const selected = item.id === 'dash' ? pathname === '/panel/teacher' : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      aria-current={selected ? 'page' : undefined}
                      style={{
                        minHeight: 42,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '8px 10px',
                        borderRadius: 11,
                        color: selected ? '#fff' : 'rgba(255,255,255,.64)',
                        background: selected ? 'rgba(126,142,86,.34)' : 'transparent',
                        fontSize: 12.5,
                        fontWeight: selected ? 700 : 500,
                      }}
                    >
                      <span style={{ width: 29, height: 29, display: 'grid', placeItems: 'center', borderRadius: 9, background: selected ? 'rgba(255,255,255,.1)' : 'transparent' }}>
                        <Icon name={item.icon} size={17} stroke={selected ? 2 : 1.7} />
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {selected && <span style={{ width: 4, height: 18, borderRadius: 999, background: '#c5d49b' }} />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div style={{ marginTop: 16, paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <Link href="/search" target="_blank" style={{ minHeight: 38, display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', color: 'rgba(255,255,255,.55)', fontSize: 11.5 }}>
            <Icon name="search" size={16} /> مشاهده جستجوی عمومی
          </Link>

          <div style={{ position: 'relative', marginTop: 5 }}>
            <button
              type="button"
              aria-expanded={userOpen}
              onClick={() => setUserOpen((value) => !value)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 9, border: 0, borderRadius: 12, color: '#fff', background: 'rgba(255,255,255,.055)', fontFamily: 'inherit', textAlign: 'start', cursor: 'pointer' }}
            >
              <Avatar size={35} imageUrl={user.avatarUrl} />
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong style={{ display: 'block', overflow: 'hidden', fontSize: 11.5, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</strong>
                <small style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,.42)', fontSize: 9 }}>حساب استاد</small>
              </span>
              <Icon name="chevronUp" size={14} style={{ opacity: .45, transform: userOpen ? 'rotate(180deg)' : undefined }} />
            </button>

            {userOpen && (
              <>
                <button type="button" aria-label="بستن منوی حساب" style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, background: 'transparent' }} onClick={() => setUserOpen(false)} />
                <div style={{ position: 'absolute', zIndex: 50, bottom: 'calc(100% + 7px)', insetInline: 0, padding: 7, border: '1px solid rgba(255,255,255,.08)', borderRadius: 13, background: '#171c12', boxShadow: '0 -10px 30px rgba(0,0,0,.28)' }}>
                  {allPanels.map((panel) => (
                    <Link key={panel.href} href={panel.href} onClick={() => setUserOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', borderRadius: 9, color: 'rgba(255,255,255,.73)', fontSize: 11 }}>
                      <Icon name={panel.icon} size={15} />{panel.label}
                    </Link>
                  ))}
                  <button type="button" onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, padding: '8px 9px', border: 0, borderTop: '1px solid rgba(255,255,255,.06)', color: '#e99a9a', background: 'transparent', fontFamily: 'inherit', fontSize: 11, cursor: 'pointer' }}>
                    <Icon name="logout" size={15} />خروج از حساب
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="panel-content" style={{ minWidth: 0, flex: 1 }}>
        <div className="panel-top-context">
          <div>
            <strong>{active?.label || 'پنل استاد'}</strong>
            <small>مدیریت آموزش و درآمد</small>
          </div>
          <div className="panel-top-links">
            {user.role === 'admin' && <Link href="/panel/admin" className="ops-button"><Icon name="shield" size={15} /> پنل مدیریت</Link>}
            <Link href="/panel/user" className="ops-button"><Icon name="user" size={15} /> پنل کاربری</Link>
          </div>
        </div>
        {children}
      </div>

      <style>{`
        @media (max-width:768px){
          .panel-shell{display:block!important}
          .mobile-bar{display:flex!important}
          .panel-content{width:100%;min-height:calc(100vh - 56px)}
          .panel-sidebar{position:fixed!important;top:0;right:0;z-index:100;transform:translateX(100%);transition:transform .25s}
          .panel-sidebar[data-open="true"]{transform:translateX(0)!important}
          .mobile-overlay{display:block!important}
        }
      `}</style>
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
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--sand-50)' }}>
      <section style={{ width: 'min(520px, 100%)', padding: 26, border: '1px solid var(--sand-150)', borderRadius: 22, background: '#fff', boxShadow: 'var(--sh-md)', textAlign: 'center' }}>
        <span style={{ width: 56, height: 56, display: 'grid', placeItems: 'center', margin: '0 auto 14px', borderRadius: 17, color: isMissing ? 'var(--gold)' : 'var(--olive-700)', background: isMissing ? 'var(--gold-bg)' : 'var(--olive-100)' }}>
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
              <Link href="/panel/login" className="ops-button" data-tone="primary">ورود به حساب</Link>
            ) : isMissing && role === 'admin' ? (
              <>
                <Link href="/panel/admin" className="ops-button" data-tone="primary">بازگشت به پنل مدیریت</Link>
                <Link href="/panel/user" className="ops-button">پنل کاربری</Link>
              </>
            ) : isMissing ? (
              <>
                <Link href="/panel/teacher/register" className="ops-button" data-tone="primary">ثبت درخواست استادی</Link>
                <Link href="/panel/user" className="ops-button">پنل کاربری</Link>
              </>
            ) : (
              <PanelButton tone="primary" onClick={() => window.location.reload()}>تلاش دوباره</PanelButton>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
