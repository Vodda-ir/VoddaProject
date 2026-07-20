'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { clearToken, fullUrl, getToken } from '@/lib/auth';

const NAV = [
  { id: 'dash', icon: 'grid' as const, label: 'داشبورد', href: '/panel/admin' },
  { id: 'users', icon: 'users' as const, label: 'کاربران', href: '/panel/admin/users' },
  { id: 'teachers', icon: 'award' as const, label: 'اساتید', href: '/panel/admin/teachers' },
  { id: 'sessions', icon: 'calendar' as const, label: 'جلسات', href: '/panel/admin/sessions' },
  { id: 'services', icon: 'book' as const, label: 'خدمات', href: '/panel/admin/services' },
  { id: 'withdraws', icon: 'download' as const, label: 'برداشت‌ها', href: '/panel/admin/withdrawals' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState({ name: '...', role: 'admin', avatarUrl: '' });
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => payload?.data ? setUser({
        name: payload.data.name || 'مدیر',
        role: payload.data.role || 'admin',
        avatarUrl: fullUrl(payload.data.avatar_url) || '',
      }) : null)
      .catch(() => {});
  }, [token]);

  const activeId = NAV.find((item) => {
    if (item.id === 'dash') return pathname === '/panel/admin';
    return pathname.startsWith(item.href);
  })?.id || 'dash';

  const allPanels = [
    { href: '/panel/admin', label: 'پنل مدیریت', icon: 'shield' as const, bg: 'rgba(255,255,255,.1)', fg: '#fff' },
    { href: '/panel/teacher', label: 'پنل استاد', icon: 'award' as const, bg: 'rgba(255,255,255,.08)', fg: 'rgba(255,255,255,.7)' },
    { href: '/panel/user', label: 'پنل کاربری', icon: 'user' as const, bg: 'rgba(255,255,255,.06)', fg: 'rgba(255,255,255,.6)' },
  ];

  function logout() {
    clearToken();
    window.location.href = '/panel/login';
  }

  return (
    <div className="panel-shell" style={{ display: 'flex', minHeight: '100vh', background: 'var(--sand-50)' }}>
      <div className="mobile-bar" style={{ display: 'none', position: 'sticky', top: 0, zIndex: 50, background: 'var(--olive-900)', color: '#fff', padding: '12px 16px', alignItems: 'center', gap: 12, width: '100%' }}>
        <button type="button" aria-label="باز کردن منو" onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
          <Icon name="list" size={24} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 18 }}>وُدّا</span>
      </div>
      {sidebarOpen && <div className="mobile-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 90, display: 'none' }} onClick={() => setSidebarOpen(false)} />}

      <aside className="panel-sidebar" data-open={sidebarOpen} style={{
        width: 244, flexShrink: 0, background: 'var(--olive-900)', color: 'rgba(255,255,255,.82)',
        display: 'flex', flexDirection: 'column', padding: '22px 16px', position: 'sticky', top: 0, height: '100vh',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 4px' }}>
          <img src="/vodda-logo.svg" alt="" style={{ width: 32, height: 32, filter: 'brightness(0) invert(1)' }} />
          <span style={{ fontWeight: 800, fontSize: 24, color: '#fff' }}>وُدّا</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', padding: '0 8px 22px' }}>پنل مدیریت</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map((item) => {
            const selected = item.id === activeId;
            return (
              <Link key={item.id} href={item.href} onClick={() => setSidebarOpen(false)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12,
                fontSize: 14, fontWeight: selected ? 700 : 500, textDecoration: 'none',
                color: selected ? '#fff' : 'rgba(255,255,255,.7)',
                background: selected ? 'var(--olive-600)' : 'transparent',
              }}>
                <Icon name={item.icon} size={20} stroke={selected ? 2 : 1.7} />
                <span style={{ flex: 1 }}>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setUserOpen(!userOpen)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 10, borderRadius: 14, background: 'rgba(255,255,255,.06)', cursor: 'pointer', border: 'none', textAlign: 'start', fontFamily: 'var(--font)' }}>
            <Avatar size={38} imageUrl={user.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>مدیر</div>
            </div>
            <Icon name="chevronUp" size={16} style={{ color: 'rgba(255,255,255,.4)', transition: 'transform .2s', transform: userOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {userOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setUserOpen(false)} />
              <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#1a1f14', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 -8px 32px rgba(0,0,0,.35)', padding: 10, zIndex: 50 }}>
                {allPanels.map((panel) => (
                  <Link key={panel.href} href={panel.href} onClick={() => setUserOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: panel.bg, color: panel.fg }}><Icon name={panel.icon} size={17} /></span>
                    <span style={{ flex: 1 }}>{panel.label}</span>
                  </Link>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 4, paddingTop: 4 }}>
                  <button type="button" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px', borderRadius: 11, fontSize: 13, fontWeight: 600, color: '#E88C8C', width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(232,140,140,.15)', color: '#E88C8C' }}><Icon name="logout" size={17} /></span>
                    خروج از حساب
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
      <div className="panel-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
      <style>{`
        @media (max-width: 768px) {
          .panel-shell { display: block !important; }
          .mobile-bar { display: flex !important; }
          .panel-content { width: 100%; min-height: calc(100vh - 56px); }
          .panel-sidebar {
            position: fixed !important;
            top: 0; right: 0; z-index: 100;
            transform: translateX(100%);
            transition: transform .25s;
          }
          .panel-sidebar[data-open="true"] { transform: translateX(0) !important; }
          .mobile-overlay { display: block !important; }
        }
      `}</style>
    </div>
  );
}
