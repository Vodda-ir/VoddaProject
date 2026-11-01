'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { PanelButton } from '@/components/panel/PanelUI';
import { clearToken, fullUrl, getToken } from '@/lib/auth';

type AdminNavigationItem = {
  id: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  href: string;
};

type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

const NAV_GROUPS: AdminNavigationGroup[] = [
  {
    label: 'نمای کلی',
    items: [
      { id: 'dash', icon: 'grid' as const, label: 'داشبورد', href: '/panel/admin' },
    ],
  },
  {
    label: 'مدیریت',
    items: [
      { id: 'users', icon: 'users' as const, label: 'کاربران', href: '/panel/admin/users' },
      { id: 'teachers', icon: 'award' as const, label: 'اساتید', href: '/panel/admin/teachers' },
      { id: 'sessions', icon: 'calendar' as const, label: 'جلسات', href: '/panel/admin/sessions' },
    ],
  },
  {
    label: 'عملیات',
    items: [
      { id: 'services', icon: 'book' as const, label: 'بررسی خدمات', href: '/panel/admin/services' },
      { id: 'withdraws', icon: 'download' as const, label: 'برداشت‌ها', href: '/panel/admin/withdrawals' },
      { id: 'support', icon: 'message' as const, label: 'پشتیبانی', href: '/panel/admin/support' },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { id: 'audit', icon: 'shield' as const, label: 'گزارش عملیات', href: '/panel/admin/audit' },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [access, setAccess] = useState<'checking' | 'allowed' | 'unauthorized' | 'forbidden' | 'error'>('checking');
  const [user, setUser] = useState({ name: '...', role: 'admin', avatarUrl: '', hasTeacherProfile: false });
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
        const role = payload.data.role || 'learner';
        setUser({
          name: payload.data.name || 'مدیر',
          role,
          avatarUrl: fullUrl(payload.data.avatar_url) || '',
          hasTeacherProfile: Boolean(payload.data.teacher?.id),
        });
        setAccess(role === 'admin' ? 'allowed' : 'forbidden');
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setAccess('error');
      });
    return () => controller.abort();
  }, [token]);

  if (access !== 'allowed') {
    return <AdminAccessState access={access} />;
  }

  const active = NAV.find((item) => item.id === 'dash' ? pathname === '/panel/admin' : pathname.startsWith(item.href));
  const allPanels = [
    { href: '/panel/admin', label: 'پنل مدیریت', icon: 'shield' as const },
    ...(user.hasTeacherProfile ? [{ href: '/panel/teacher', label: 'پنل استاد', icon: 'award' as const }] : []),
    { href: '/panel/user', label: 'پنل کاربری', icon: 'user' as const },
  ];

  function logout() {
    clearToken();
    window.location.href = '/panel/login';
  }

  return (
    <div className="panel-shell admin-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="mobile-bar" style={{ display: 'none', position: 'sticky', top: 0, zIndex: 70, background: 'var(--olive-950, #202719)', color: '#fff', padding: '11px 15px', alignItems: 'center', gap: 11, width: '100%' }}>
        <button type="button" aria-label="باز کردن منو" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 0, color: '#fff', padding: 4 }}>
          <Icon name="list" size={23} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>وُدّا · مدیریت</span>
      </div>

      {sidebarOpen && (
        <button type="button" aria-label="بستن منو" className="mobile-overlay" style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'none', border: 0, background: 'rgba(0,0,0,.48)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className="panel-sidebar admin-sidebar"
        data-open={sidebarOpen}
        style={{
          width: 260,
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
        <Link href="/panel/admin" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 9px 17px', color: '#fff' }}>
          <img src="/vodda-logo.svg" alt="" style={{ width: 34, height: 34, filter: 'brightness(0) invert(1)' }} />
          <span>
            <strong style={{ display: 'block', fontSize: 19, lineHeight: 1.3 }}>وُدّا</strong>
            <small style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,.43)', fontSize: 9.5 }}>مرکز مدیریت</small>
          </span>
        </Link>

        <nav aria-label="ناوبری مدیریت" style={{ display: 'grid', gap: 15, flex: 1 }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div style={{ padding: '0 10px 6px', color: 'rgba(255,255,255,.33)', fontSize: 9, fontWeight: 700 }}>{group.label}</div>
              <div style={{ display: 'grid', gap: 3 }}>
                {group.items.map((item) => {
                  const selected = item.id === 'dash' ? pathname === '/panel/admin' : pathname.startsWith(item.href);
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
          <Link href="/" target="_blank" style={{ minHeight: 38, display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px', color: 'rgba(255,255,255,.55)', fontSize: 11.5 }}>
            <Icon name="home" size={16} /> مشاهده سایت
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
                <small style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,.42)', fontSize: 9 }}>مدیر سامانه</small>
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
            <strong>{active?.label || 'مدیریت'}</strong>
            <small>پنل عملیاتی وُدّا</small>
          </div>
          <div className="panel-top-links">
            {user.hasTeacherProfile && <Link href="/panel/teacher" className="ops-button"><Icon name="award" size={15} /> پنل استاد</Link>}
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

function AdminAccessState({
  access,
}: {
  access: 'checking' | 'unauthorized' | 'forbidden' | 'error';
}) {
  const checking = access === 'checking';
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--sand-50)' }}>
      <section style={{ width: 'min(480px, 100%)', padding: 26, border: '1px solid var(--sand-150)', borderRadius: 22, background: '#fff', textAlign: 'center' }}>
        <span style={{ width: 54, height: 54, display: 'grid', placeItems: 'center', margin: '0 auto 13px', borderRadius: 16, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
          <Icon name={checking ? 'refresh' : 'shield'} size={25} />
        </span>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          {checking ? 'در حال بررسی دسترسی…' : access === 'unauthorized' ? 'ابتدا وارد حساب شوید' : access === 'forbidden' ? 'این حساب دسترسی مدیریت ندارد' : 'بررسی دسترسی انجام نشد'}
        </h1>
        <p style={{ margin: '8px 0 18px', color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.9 }}>
          {checking ? 'نقش فعلی حساب از سرور بررسی می‌شود.' : 'دسترسی پنل مدیریت فقط بر اساس نقش فعلی ثبت‌شده در backend داده می‌شود.'}
        </p>
        {!checking && (
          access === 'unauthorized'
            ? <Link href="/panel/login" className="ops-button" data-tone="primary">ورود به حساب</Link>
            : access === 'forbidden'
              ? <Link href="/panel/user" className="ops-button" data-tone="primary">رفتن به پنل کاربری</Link>
              : <PanelButton tone="primary" onClick={() => window.location.reload()}>تلاش دوباره</PanelButton>
        )}
      </section>
    </main>
  );
}
