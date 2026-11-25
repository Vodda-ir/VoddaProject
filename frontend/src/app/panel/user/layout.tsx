'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { api, type NotificationItem } from '@/lib/api';
import { clearToken, avatarUrl as withVersion, getToken } from '@/lib/auth';
import { onAvatarUpdated } from '@/lib/avatarImage';
import { toFaDigits } from '@/lib/persian';

type NavigationItem = {
  id: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  href: string;
};

type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

const NAV_GROUPS: NavigationGroup[] = [
  {
    label: 'نمای کلی',
    items: [
      { id: 'dash', icon: 'grid' as const, label: 'داشبورد', href: '/panel/user' },
    ],
  },
  {
    label: 'یادگیری',
    items: [
      { id: 'sessions', icon: 'calendar' as const, label: 'جلسات من', href: '/panel/user/sessions' },
      { id: 'book', icon: 'plus' as const, label: 'رزرو جلسه', href: '/panel/user/book' },
      { id: 'teachers', icon: 'users' as const, label: 'اساتید', href: '/panel/user/teachers' },
      { id: 'challenges', icon: 'sparkle' as const, label: 'چالش‌ها', href: '/panel/user/challenges' },
    ],
  },
  {
    label: 'مالی و حساب',
    items: [
      { id: 'wallet', icon: 'wallet' as const, label: 'کیف پول', href: '/panel/user/wallet' },
      { id: 'settings', icon: 'settings' as const, label: 'تنظیمات', href: '/panel/user/settings' },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

/** User-scoped notifications bell with unread counter and mark-as-read. */
function LearnerBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // باگ refresh-loop: پاسخ دیرهنگامِ درخواست قبلی نباید لیست را بازنویسی کند.
  const loadGeneration = useRef(0);

  const load = useCallback(() => {
    const token = getToken();
    if (!token) return;
    const generation = ++loadGeneration.current;
    setLoading(true);
    api.notifications(token, 15)
      .then((response) => {
        if (loadGeneration.current !== generation) return;
        setItems(response.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (loadGeneration.current === generation) setLoading(false);
      });
  }, []);

  useEffect(() => { load(); }, [load]);

  const unread = items.filter((item) => !item.read).length;

  async function markRead(item: NotificationItem) {
    if (item.read) return;
    setItems((list) => list.map((entry) => entry.id === item.id ? { ...entry, read: true } : entry));
    try {
      const token = getToken();
      if (token) await api.readNotification(token, item.id);
    } catch {
      // optimistic update stays; the list refreshes on next open
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="ops-button"
        aria-label={`اعلان‌ها${unread ? ` (${unread} خوانده‌نشده)` : ''}`}
        aria-expanded={open}
        data-has-alert={unread ? 'true' : undefined}
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" size={16} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute', top: -6, insetInlineEnd: -6,
              minWidth: 18, height: 18, padding: '0 5px',
              display: 'grid', placeItems: 'center',
              borderRadius: 999, background: 'var(--rose, #c2554f)', color: '#fff',
              fontSize: 10, fontWeight: 800, lineHeight: 1,
            }}
          >
            {toFaDigits(unread)}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="بستن اعلان‌ها" style={{ position: 'fixed', inset: 0, zIndex: 60, border: 0, background: 'transparent' }} onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="اعلان‌های من"
            style={{
              position: 'absolute', zIndex: 70, top: 'calc(100% + 9px)', insetInlineEnd: 0,
              width: 'min(340px, 88vw)', padding: 10,
              border: '1px solid var(--sand-150)', borderRadius: 16,
              background: '#fff', boxShadow: '0 18px 44px rgba(31,38,22,.16)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '3px 6px 9px' }}>
              <strong style={{ fontSize: 12 }}>اعلان‌ها</strong>
              {unread > 0 && <span className="adm-badge" data-tone="rose">{toFaDigits(unread)} خوانده‌نشده</span>}
            </div>
            {loading && items.length === 0 ? (
              <div style={{ padding: '8px 6px 12px', color: 'var(--ink-3)', fontSize: 11 }}>در حال دریافت…</div>
            ) : items.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px 12px', color: 'var(--ink-3)', fontSize: 11.5 }}>
                <Icon name="bell" size={16} />
                فعلاً اعلانی ندارید.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 2, maxHeight: 320, overflowY: 'auto' }}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => void markRead(item)}
                    title={item.read ? undefined : 'علامت‌گذاری به‌عنوان خوانده‌شده'}
                    style={{
                      display: 'block', width: '100%', textAlign: 'start', cursor: 'pointer',
                      padding: '9px 8px', border: 0, borderRadius: 11, fontFamily: 'inherit',
                      background: item.read ? 'transparent' : 'var(--olive-50)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: item.read ? 600 : 800, color: 'var(--ink)' }}>
                      {!item.read && <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--olive-500)', flexShrink: 0 }} />}
                      {item.title}
                    </span>
                    {item.body && <span style={{ display: 'block', marginTop: 3, fontSize: 10.5, color: 'var(--ink-3)', lineHeight: 1.8 }}>{item.body}</span>}
                    <span style={{ display: 'block', marginTop: 3, fontSize: 9.5, color: 'var(--ink-4)' }}>{faNotificationTime(item.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function faNotificationTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  } catch {
    return '';
  }
}

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [access, setAccess] = useState<'checking' | 'allowed' | 'unauthorized' | 'error'>('checking');
  const [user, setUser] = useState({ name: '...', role: 'learner', avatarUrl: '', hasTeacherProfile: false, isAdmin: false });
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
        setUser({
          name: payload.data.name || 'قرآن‌آموز',
          role: payload.data.role || 'learner',
          avatarUrl: withVersion(payload.data.avatar_url, payload.data.updated_at) || '',
          hasTeacherProfile: Boolean(payload.data.teacher?.id),
          isAdmin: payload.data.role === 'admin',
        });
        setAccess('allowed');
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setAccess('error');
      });
    return () => controller.abort();
  }, [token]);

  // باگ avatar-upload — پس از آپلود تصویر در تنظیمات، منوی بالا بلافاصله به‌روز می‌شود.
  useEffect(() => {
    const offAvatarUpdated = onAvatarUpdated((detail) => {
      setUser((current) => ({ ...current, avatarUrl: withVersion(detail.url, detail.version) || current.avatarUrl }));
    });
    return offAvatarUpdated;
  }, []);

  if (access !== 'allowed') {
    return <UserAccessState access={access} />;
  }

  const active = NAV.find((item) => item.id === 'dash' ? pathname === '/panel/user' : pathname.startsWith(item.href));
  const allPanels = [
    ...(user.isAdmin ? [{ href: '/panel/admin', label: 'پنل مدیریت', icon: 'shield' as const }] : []),
    ...(user.hasTeacherProfile ? [{ href: '/panel/teacher', label: 'پنل استاد', icon: 'award' as const }] : []),
    { href: '/panel/user', label: 'پنل کاربری', icon: 'user' as const },
  ];

  function logout() {
    clearToken();
    window.location.href = '/panel/login';
  }

  return (
    <div className="panel-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <div className="mobile-bar" style={{ display: 'none', position: 'sticky', top: 0, zIndex: 70, background: 'var(--olive-950, #202719)', color: '#fff', padding: '11px 15px', alignItems: 'center', gap: 11, width: '100%' }}>
        <button type="button" aria-label="باز کردن منو" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 0, color: '#fff', padding: 4 }}>
          <Icon name="list" size={23} />
        </button>
        <span style={{ fontWeight: 800, fontSize: 16 }}>وُدّا · پنل کاربری</span>
      </div>

      {sidebarOpen && (
        <button type="button" aria-label="بستن منو" className="mobile-overlay" style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'none', border: 0, background: 'rgba(0,0,0,.48)' }} onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className="panel-sidebar"
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
          background: '#242c1b',
        }}
      >
        <Link href="/panel/user" onClick={() => setSidebarOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 9px 17px', color: '#fff' }}>
          <img src="/vodda-logo.svg" alt="" style={{ width: 34, height: 34, filter: 'brightness(0) invert(1)' }} />
          <span>
            <strong style={{ display: 'block', fontSize: 19, lineHeight: 1.3 }}>وُدّا</strong>
            <small style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,.43)', fontSize: 9.5 }}>فضای یادگیری من</small>
          </span>
        </Link>

        <nav aria-label="ناوبری پنل کاربری" style={{ display: 'grid', gap: 15, flex: 1 }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div style={{ padding: '0 10px 6px', color: 'rgba(255,255,255,.33)', fontSize: 9, fontWeight: 700 }}>{group.label}</div>
              <div style={{ display: 'grid', gap: 3 }}>
                {group.items.map((item) => {
                  const selected = item.id === 'dash' ? pathname === '/panel/user' : pathname.startsWith(item.href);
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

        <Link href="/panel/user/book" onClick={() => setSidebarOpen(false)} className="ops-button" data-tone="primary" style={{ justifyContent: 'center', marginBottom: 12 }}>
          <Icon name="plus" size={15} /> رزرو جلسه جدید
        </Link>

        <div style={{ paddingTop: 13, borderTop: '1px solid rgba(255,255,255,.06)' }}>
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
                <small style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,.42)', fontSize: 9 }}>قرآن‌آموز</small>
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
            <strong>{active?.label || 'پنل کاربری'}</strong>
            <small>فضای شخصی یادگیری شما در وُدّا</small>
          </div>
          <div className="panel-top-links">
            <LearnerBell />
            {user.hasTeacherProfile && <Link href="/panel/teacher" className="ops-button"><Icon name="award" size={15} /> پنل استاد</Link>}
            {user.isAdmin && <Link href="/panel/admin" className="ops-button"><Icon name="shield" size={15} /> پنل مدیریت</Link>}
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

function UserAccessState({
  access,
}: {
  access: 'checking' | 'unauthorized' | 'error';
}) {
  const checking = access === 'checking';
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--sand-50)' }}>
      <section style={{ width: 'min(480px, 100%)', padding: 26, border: '1px solid var(--sand-150)', borderRadius: 22, background: '#fff', textAlign: 'center' }}>
        <span style={{ width: 54, height: 54, display: 'grid', placeItems: 'center', margin: '0 auto 13px', borderRadius: 16, color: 'var(--olive-700)', background: 'var(--olive-100)' }}>
          <Icon name={checking ? 'refresh' : 'user'} size={25} />
        </span>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>
          {checking ? 'در حال بررسی حساب…' : access === 'unauthorized' ? 'ابتدا وارد حساب شوید' : 'بررسی حساب انجام نشد'}
        </h1>
        <p style={{ margin: '8px 0 18px', color: 'var(--ink-3)', fontSize: 12, lineHeight: 1.9 }}>
          {checking ? 'اطلاعات حساب شما از سرور دریافت می‌شود.' : 'برای مشاهده پنل کاربری باید وارد حساب خود شوید.'}
        </p>
        {!checking && (
          access === 'unauthorized'
            ? <Link href="/panel/login" className="ops-button" data-tone="primary">ورود به حساب</Link>
            : <button type="button" className="ops-button" data-tone="primary" onClick={() => window.location.reload()}>تلاش دوباره</button>
        )}
      </section>
    </main>
  );
}
