'use client';

import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';
import { Avatar } from './web/ui';

export type NavItem = { id: string; label: string; icon: Parameters<typeof Icon>[0]['name']; badge?: string };

const fa = (n: number | string) => String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);

/** Dashboard shell matching docs/design/web-panels.jsx — dark sidebar + topbar. */
export function PanelShell({
  brandSub,
  nav,
  user,
  title,
  sub,
  children,
}: {
  brandSub: string;
  nav: NavItem[];
  user: { name: string; role: string };
  title: string;
  sub?: string;
  children: (active: string) => ReactNode;
}) {
  const [active, setActive] = useState(nav[0]?.id);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--sand-50)' }}>
      {/* sidebar */}
      <aside style={{ width: 244, flexShrink: 0, background: 'var(--olive-900)', color: 'rgba(255,255,255,.82)', display: 'flex', flexDirection: 'column', padding: '22px 16px', position: 'sticky', top: 0, height: '100vh' }} className="panel-aside">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px 4px' }}>
          <span style={{ fontWeight: 800, fontSize: 24, color: '#fff' }}>وُدّا</span>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--gold)', marginBottom: 10 }} />
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.45)', padding: '0 8px 22px' }}>{brandSub}</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {nav.map((it) => {
            const on = it.id === active;
            return (
              <button
                key={it.id}
                onClick={() => setActive(it.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 12,
                  fontSize: 14, fontWeight: on ? 700 : 500, textAlign: 'start',
                  color: on ? '#fff' : 'rgba(255,255,255,.7)', background: on ? 'var(--olive-600)' : 'transparent',
                }}
              >
                <Icon name={it.icon} size={20} stroke={on ? 2 : 1.7} />
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.badge && (
                  <span style={{ minWidth: 20, height: 20, padding: '0 6px', borderRadius: 10, background: on ? '#fff' : 'var(--clay)', color: on ? 'var(--olive-700)' : '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{it.badge}</span>
                )}
              </button>
            );
          })}
        </nav>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 10, borderRadius: 14, background: 'rgba(255,255,255,.06)' }}>
          <Avatar size={38} emoji="👤" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>{user.role}</div>
          </div>
          <Icon name="logout" size={18} style={{ color: 'rgba(255,255,255,.5)' }} />
        </a>
      </aside>

      {/* main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 28px', borderBottom: '1px solid var(--sand-150)', background: 'rgba(250,248,242,.7)', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
          <div>
            <h1 style={{ fontSize: 21, fontWeight: 800 }}>{title}</h1>
            {sub && <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>{sub}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 11, padding: '9px 14px', boxShadow: 'var(--sh-sm)', width: 240 }} className="hide-sm">
              <Icon name="search" size={18} style={{ color: 'var(--ink-3)' }} />
              <input placeholder="جستجو…" style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontSize: 13.5, fontFamily: 'var(--font)' }} />
            </div>
            <button style={{ position: 'relative', width: 42, height: 42, borderRadius: 12, background: '#fff', boxShadow: 'var(--sh-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-2s)' }}>
              <Icon name="bell" size={20} />
              <span style={{ position: 'absolute', top: 10, insetInlineEnd: 11, width: 8, height: 8, borderRadius: '50%', background: 'var(--clay)', border: '2px solid #fff' }} />
            </button>
          </div>
        </div>
        <div style={{ flex: 1, padding: 28 }}>{children(active)}</div>
      </div>
    </div>
  );
}

type Tone = 'olive' | 'gold' | 'clay' | 'info';

export function StatCard({ icon, label, value, delta, tone = 'olive' }: { icon: Parameters<typeof Icon>[0]['name']; label: string; value: string; delta?: string; tone?: Tone }) {
  const tones: Record<Tone, [string, string]> = {
    olive: ['var(--olive-100)', 'var(--olive-700)'],
    gold: ['var(--gold-bg)', '#9A7426'],
    clay: ['var(--clay-bg)', 'var(--clay)'],
    info: ['#E4ECEF', '#4E6F7C'],
  };
  const [bg, c] = tones[tone];
  return (
    <div style={{ background: '#fff', borderRadius: 18, padding: 20, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: bg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={22} /></div>
        {delta && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: 'var(--olive-600)', background: 'var(--olive-50)', padding: '4px 9px', borderRadius: 999 }}><Icon name="trending" size={13} />{delta}</span>}
      </div>
      <div style={{ fontSize: 25, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 3 }}>{label}</div>
    </div>
  );
}

export function MiniBars({ data, labels, color = 'var(--olive-500)' }: { data: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 10, height: 140, padding: '0 4px' }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
          <div style={{ width: '100%', maxWidth: 34, height: `${(v / max) * 100}%`, background: i === data.length - 1 ? 'var(--olive-700)' : color, borderRadius: '7px 7px 3px 3px' }} />
          <span style={{ fontSize: 11, color: 'var(--ink-4)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

export function Panel({ title, action, children, pad = true }: { title: string; action?: string; children: ReactNode; pad?: boolean }) {
  return (
    <div style={{ background: '#fff', borderRadius: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--sand-100)' }}>
        <h3 style={{ fontSize: 15.5, fontWeight: 800 }}>{title}</h3>
        {action && <a href="#" style={{ fontSize: 13, fontWeight: 700, color: 'var(--olive-600)' }}>{action}</a>}
      </div>
      <div style={{ padding: pad ? 20 : 0 }}>{children}</div>
    </div>
  );
}

export function StatusTag({ status }: { status: string }) {
  const map: Record<string, [string, string, string]> = {
    confirmed: ['تأیید شده', 'var(--olive-700)', 'var(--olive-100)'],
    pending: ['در انتظار', '#9A7426', 'var(--gold-bg)'],
    done: ['برگزار شده', 'var(--ink-3)', 'var(--sand-100)'],
    new: ['جدید', 'var(--clay)', 'var(--clay-bg)'],
    paid: ['پرداخت شد', 'var(--olive-700)', 'var(--olive-100)'],
    active: ['فعال', 'var(--olive-700)', 'var(--olive-100)'],
    review: ['در انتظار تأیید', '#9A7426', 'var(--gold-bg)'],
  };
  const [t, c, bg] = map[status] || map.pending;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: c, background: bg, padding: '4px 11px', borderRadius: 999 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />{t}
    </span>
  );
}

export function Placeholder({ label }: { label: string }) {
  return (
    <div style={{ border: '1px dashed var(--sand-200)', borderRadius: 18, padding: 64, textAlign: 'center', color: 'var(--ink-3)', background: 'rgba(255,255,255,.5)' }}>
      بخش «{label}» — به API بک‌اند متصل می‌شود.
    </div>
  );
}

export const faDigits = fa;

const cellStyle: CSSProperties = { padding: '13px 16px', fontSize: 13.5 };
export { cellStyle };
