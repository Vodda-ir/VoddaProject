'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { getToken, clearToken, fullUrl } from '@/lib/auth';

const NAV = [
  { id: 'dash', icon: 'grid' as const, label: 'داشبورد', href: '/panel/user' },
  { id: 'sessions', icon: 'calendar' as const, label: 'جلسات من', href: '/panel/user/sessions' },
  { id: 'wallet', icon: 'wallet' as const, label: 'کیف پول', href: '/panel/user/wallet' },
  { id: 'teachers', icon: 'users' as const, label: 'اساتید', href: '/panel/user/teachers' },
  { id: 'settings', icon: 'settings' as const, label: 'تنظیمات', href: '/panel/user/settings' },
];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [user, setUser] = useState({ name: '...', role: 'learner', avatarUrl: '' });
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(j => j?.data ? setUser({ name: j.data.name || 'کاربر', role: 'learner', avatarUrl: fullUrl(j.data.avatar_url) || '' }) : null)
      .catch(() => {});
  }, [token]);

  const activeId = NAV.find(n => {
    if (n.id === 'dash') return pathname === '/panel/user';
    return pathname.startsWith(n.href);
  })?.id || 'dash';

  const allPanels = [
    { href: '/panel/admin', label: 'پنل مدیریت', icon: 'shield' as const, bg: 'rgba(255,255,255,.1)', fg: '#fff' },
    { href: '/panel/teacher', label: 'پنل مربی', icon: 'award' as const, bg: 'rgba(255,255,255,.08)', fg: 'rgba(255,255,255,.7)' },
    { href: '/panel/user', label: 'پنل کاربری', icon: 'user' as const, bg: 'rgba(255,255,255,.06)', fg: 'rgba(255,255,255,.6)' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--sand-50)' }}>
      <aside style={{ width: 244, flexShrink: 0, background: 'var(--olive-900)', color: 'rgba(255,255,255,.82)', display: 'flex', flexDirection: 'column', padding: '22px 16px', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 4px' }}>
          <img src="/vodda-logo.svg" alt="" style={{ width: 32, height: 32, filter: 'brightness(0) invert(1)' }} />
          <span style={{ fontWeight: 800, fontSize: 24, color: '#fff' }}>وُدّا</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', padding: '0 8px 22px' }}>پنل قرآنآموز</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map(it => {
            const on = it.id === activeId;
            return (
              <Link key={it.id} href={it.href} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12,
                fontSize: 14, fontWeight: on ? 700 : 500, textDecoration: 'none',
                color: on ? '#fff' : 'rgba(255,255,255,.7)',
                background: on ? 'var(--olive-600)' : 'transparent',
              }}>
                <Icon name={it.icon} size={20} stroke={on ? 2 : 1.7} />
                <span style={{ flex: 1 }}>{it.label}</span>
              </Link>
            );
          })}
        </nav>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setUserOpen(!userOpen)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: 10, borderRadius: 14, background: 'rgba(255,255,255,.06)', cursor: 'pointer', border: 'none', textAlign: 'start', fontFamily: 'var(--font)' }}>
            <Avatar size={38} imageUrl={user.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>قرآنآموز</div>
            </div>
            <Icon name="chevronUp" size={16} style={{ color: 'rgba(255,255,255,.4)', transition: 'transform .2s', transform: userOpen ? 'rotate(180deg)' : 'none' }} />
          </button>
          {userOpen && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setUserOpen(false)} />
              <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#1a1f14', borderRadius: 16, border: '1px solid rgba(255,255,255,.08)', boxShadow: '0 -8px 32px rgba(0,0,0,.35)', padding: 10, zIndex: 50 }}>
                {allPanels.map(p => (
                  <Link key={p.href} href={p.href} onClick={() => setUserOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 11, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: p.bg, color: p.fg }}><Icon name={p.icon} size={17} /></span>
                    <span style={{ flex: 1 }}>{p.label}</span>
                  </Link>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', marginTop: 4, paddingTop: 4 }}>
                  <button onClick={() => { clearToken(); window.location.href = '/panel/login'; }} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 10px', borderRadius: 11, fontSize: 13, fontWeight: 600, color: '#E88C8C', textDecoration: 'none', width: '100%', border: 'none', background: 'none', cursor: 'pointer' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: 'rgba(232,140,140,.15)', color: '#E88C8C' }}><Icon name="logout" size={17} /></span>
                    خروج از حساب
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
