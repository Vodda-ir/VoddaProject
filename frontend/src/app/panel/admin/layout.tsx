'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/web/ui';
import { PanelButton } from '@/components/panel/PanelUI';
import { clearToken, avatarUrl as withVersion, getToken } from '@/lib/auth';
import { onAvatarUpdated } from '@/lib/avatarImage';
import { toFaDigits } from '@/lib/persian';

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
      { id: 'reviews', icon: 'star' as const, label: 'نظرات', href: '/panel/admin/reviews' },
      { id: 'blog', icon: 'doc' as const, label: 'وبلاگ', href: '/panel/admin/blog' },
    ],
  },
  {
    label: 'عملیات',
    items: [
      { id: 'services', icon: 'book' as const, label: 'بررسی خدمات', href: '/panel/admin/services' },
      { id: 'withdraws', icon: 'download' as const, label: 'برداشت‌ها', href: '/panel/admin/withdrawals' },
      { id: 'support', icon: 'message' as const, label: 'پشتیبانی', href: '/panel/admin/support' },
      { id: 'finance', icon: 'coins' as const, label: 'گزارش مالی', href: '/panel/admin/finance' },
    ],
  },
  {
    label: 'سیستم',
    items: [
      { id: 'audit', icon: 'shield' as const, label: 'گزارش عملیات', href: '/panel/admin/audit' },
      { id: 'settings', icon: 'settings' as const, label: 'تنظیمات سامانه', href: '/panel/admin/settings' },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((group) => group.items);

type AdminSummary = {
  pending_teachers: number;
  pending_services: number;
  pending_withdrawals: number;
  new_support: number;
  open_tickets: number;
};

const SUMMARY_ITEMS: Array<{ key: keyof AdminSummary; label: string; href: string; icon: React.ComponentProps<typeof Icon>['name']; tone: string; ink: string; bg: string }> = [
  { key: 'pending_teachers', label: 'استاد در انتظار بررسی', href: '/panel/admin/teachers', icon: 'award', tone: 'gold', ink: '#8d6d1f', bg: 'var(--gold-bg)' },
  { key: 'pending_services', label: 'خدمت در صف تأیید', href: '/panel/admin/services', icon: 'book', tone: 'info', ink: '#4f6f7c', bg: '#e8f0f2' },
  { key: 'pending_withdrawals', label: 'درخواست برداشت در صف', href: '/panel/admin/withdrawals', icon: 'download', tone: 'clay', ink: 'var(--clay)', bg: 'var(--clay-bg)' },
  { key: 'new_support', label: 'پیام پشتیبانی جدید', href: '/panel/admin/support', icon: 'message', tone: 'green', ink: 'var(--olive-700)', bg: 'var(--olive-100)' },
  { key: 'open_tickets', label: 'گفتگوی بی‌پاسخ پشتیبانی', href: '/panel/admin/support', icon: 'headphones', tone: 'gold', ink: '#8d6d1f', bg: 'var(--gold-bg)' },
];

function AdminAlertsBell() {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<AdminSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      if (!getToken()) return;
      fetch('/api/backend/admin/summary', { cache: 'no-store' })
        .then((response) => (response.ok ? response.json() : null))
        .then((body) => {
          if (!cancelled && body?.data) setSummary(body.data as AdminSummary);
        })
        .catch(() => {});
    };
    load();
    const timer = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  const total = summary
    ? SUMMARY_ITEMS.reduce((sum, item) => sum + Number(summary[item.key] || 0), 0)
    : 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        className="ops-button"
        aria-label={`اعلان‌های مدیریتی${total ? ` (${total} مورد)` : ''}`}
        aria-expanded={open}
        data-has-alert={total ? 'true' : undefined}
        onClick={() => setOpen((value) => !value)}
        style={{ position: 'relative' }}
      >
        <Icon name="bell" size={16} />
        {total > 0 && (
          <span
            style={{
              position: 'absolute', top: -6, insetInlineEnd: -6,
              minWidth: 18, height: 18, padding: '0 5px',
              display: 'grid', placeItems: 'center',
              borderRadius: 999, background: 'var(--rose, #c2554f)', color: '#fff',
              fontSize: 10, fontWeight: 800, lineHeight: 1,
            }}
          >
            {toFaDigits(total)}
          </span>
        )}
      </button>

      {open && (
        <>
          <button type="button" aria-label="بستن اعلان‌ها" style={{ position: 'fixed', inset: 0, zIndex: 60, border: 0, background: 'transparent' }} onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label="کارهای نیازمند اقدام"
            style={{
              position: 'absolute', zIndex: 70, top: 'calc(100% + 9px)', insetInlineEnd: 0,
              width: 'min(340px, 88vw)', padding: 10,
              border: '1px solid var(--sand-150)', borderRadius: 16,
              background: '#fff', boxShadow: '0 18px 44px rgba(31,38,22,.16)',
            }}
          >
            <strong style={{ display: 'block', padding: '3px 6px 9px', fontSize: 12 }}>کارهای نیازمند اقدام</strong>
            {!summary ? (
              <div style={{ padding: '8px 6px 12px', color: 'var(--ink-3)', fontSize: 11 }}>در حال دریافت…</div>
            ) : total === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 6px 12px', color: 'var(--olive-700)', fontSize: 11.5 }}>
                <Icon name="checkCircle" size={16} />
                همه چیز بررسی شده؛ صفی خالی است.
              </div>
            ) : (
              SUMMARY_ITEMS.map((item) => {
                const count = Number(summary[item.key] || 0);
                if (!count) return null;
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 7px', borderRadius: 11, fontSize: 11.5, color: 'var(--ink)' }}
                  >
                    <span className="adm-stat-icon" style={{ width: 32, height: 32, borderRadius: 10, '--tone-ink': item.ink, '--tone-bg': item.bg } as React.CSSProperties}>
                      <Icon name={item.icon} size={15} />
                    </span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    <span className="adm-badge" data-tone={item.tone}>{toFaDigits(count)}</span>
                  </Link>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userOpen, setUserOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [access, setAccess] = useState<'checking' | 'allowed' | 'unauthorized' | 'forbidden' | 'error'>('checking');
  const [user, setUser] = useState({ name: '...', role: 'admin', avatarUrl: '', hasTeacherProfile: false, isSupportAgent: false });
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
        const isAgent = payload.data.is_support_agent === true;
        setUser({
          name: payload.data.name || 'مدیر',
          role,
          avatarUrl: withVersion(payload.data.avatar_url, payload.data.updated_at) || '',
          hasTeacherProfile: Boolean(payload.data.teacher?.id),
          isSupportAgent: isAgent,
        });
        setAccess(role === 'admin' || isAgent ? 'allowed' : 'forbidden');
      })
      .catch((cause) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        setAccess('error');
      });
    return () => controller.abort();
  }, [token]);

  // باگ avatar-upload — پس از آپلود تصویر در تنظیمات، منوی پنل مدیریت بلافاصله به‌روز می‌شود.
  useEffect(() => {
    const offAvatarUpdated = onAvatarUpdated((detail) => {
      setUser((current) => ({ ...current, avatarUrl: withVersion(detail.url, detail.version) || current.avatarUrl }));
    });
    return offAvatarUpdated;
  }, []);
  // کارشناس پشتیبانی به داشبورد مدیریتی دسترسی ندارد؛ به صندوق پشتیبانی هدایت می‌شود.
  useEffect(() => {
    if (access === 'allowed' && user.role !== 'admin' && pathname === '/panel/admin') {
      router.replace('/panel/admin/support');
    }
  }, [access, user.role, pathname, router]);

  if (access !== 'allowed') {
    return <AdminAccessState access={access} />;
  }

  const isAdminUser = user.role === 'admin';
  const navGroups: AdminNavigationGroup[] = isAdminUser
    ? NAV_GROUPS
    : [{ label: 'پشتیبانی', items: [{ id: 'support', icon: 'headphones', label: 'صندوق پشتیبانی', href: '/panel/admin/support' }] }];

  const active = navGroups
    .flatMap((group) => group.items)
    .find((item) => (item.id === 'dash' ? pathname === '/panel/admin' : pathname.startsWith(item.href)));
  const allPanels = [
    ...(isAdminUser ? [{ href: '/panel/admin', label: 'پنل مدیریت', icon: 'shield' as const }] : []),
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
          {navGroups.map((group) => (
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
                <small style={{ display: 'block', marginTop: 1, color: 'rgba(255,255,255,.42)', fontSize: 9 }}>{user.role === 'admin' ? 'مدیر سامانه' : 'کارشناس پشتیبانی'}</small>
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
            {user.role === 'admin' && <AdminAlertsBell />}
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
