'use client';

import { useState, useEffect } from 'react';
import { PanelShell, StatCard, Panel, StatusTag, Placeholder, faDigits, type NavItem } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { getToken, clearToken, type AuthUser } from '@/lib/auth';

const NAV: NavItem[] = [
  { id: 'dash', icon: 'grid', label: 'داشبورد' },
  { id: 'sessions', icon: 'calendar', label: 'جلسات من', badge: faDigits(0) },
  { id: 'wallet', icon: 'wallet', label: 'کیف پول' },
  { id: 'settings', icon: 'settings', label: 'تنظیمات' },
];

export default function UserPanel() {
  const [me, setMe] = useState<AuthUser | null>(null);
  const [upcoming, setUpcoming] = useState<unknown[]>([]);
  const [past, setPast] = useState<unknown[]>([]);
  const [suggested, setSuggested] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.me(token),
      api.mySessions(token, 'upcoming'),
      api.mySessions(token, 'past'),
      api.teachers(''),
    ]).then(([meRes, upRes, pastRes, teachersRes]) => {
      setMe(meRes.data);
      setUpcoming(upRes.data || []);
      setPast(pastRes.data || []);
      setSuggested((teachersRes.data || []).slice(0, 4));
    }).catch(() => {}).finally(() => setLoading(false));
  }, [token]);

  const wallet = me?.wallet ?? 0;
  const name = me?.name || 'قرآن\u200Cآموز';

  if (loading && !me) {
    return <PanelShell brandSub="پنل قرآنآموز" nav={NAV} user={{ name: '...', role: 'قرآن\u200Cآموز' }} title="در حال بارگذاری">
      {() => <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink-3)' }}>در حال بارگذاری…</div>}
    </PanelShell>;
  }

  return (
    <PanelShell brandSub="پنل قرآن\u200Cآموز" nav={NAV} user={{ name, role: 'قرآن\u200Cآموز' }} title={`سلام ${name.split(' ')[0]} \uD83C\uDF3F`} sub="خلاصه\u200Cای از فعالیت\u200Cهای شما در وُدّا" onLogout={() => { clearToken(); window.location.href = '/panel/login'; }}>
      {(active) => active !== 'dash' ? <Placeholder label={NAV.find((n) => n.id === active)!.label} /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 22 }} className="cat-grid">
            <StatCard icon="calendar" label="جلسات پیش\u200Cرو" value={faDigits(upcoming.length)} tone="olive" />
            <StatCard icon="checkCircle" label="جلسات برگزارشده" value={faDigits(past.length)} tone="info" />
            <StatCard icon="wallet" label="موجودی کیف پول" value={`${faDigits(wallet)} ت`} tone="gold" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }} className="hero-grid">
            <Panel title="جلسات پیش\u200Cرو" action="مشاهدهٔ همه" pad={false}>
              {upcoming.length === 0 ? (
                <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>جلسه\u200Cای در پیش رو نیست</div>
              ) : (
                (upcoming as Array<Record<string, unknown>>).map((s, i) => (
                  <div key={s.id as number} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                    <Avatar size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{(s.teacher_name || s.teacherName || 'استاد') as string}</div>
                      <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{(s.service || s.title || '') as string}</div>
                    </div>
                    <StatusTag status={(s.status as string) || 'pending'} />
                    <button style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '8px 16px', borderRadius: 999 }}>
                      {s.status === 'confirmed' ? 'پیوستن' : 'جزئیات'}
                    </button>
                  </div>
                ))
              )}
            </Panel>
            <Panel title="اساتید پیشنهادی" action="بیشتر">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {suggested.length === 0 ? (
                  <div style={{ padding: 20, color: 'var(--ink-3)', textAlign: 'center' }}>در حال بارگذاری…</div>
                ) : (
                  (suggested as Array<Record<string, unknown>>).map((t) => (
                    <div key={t.id as number} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <Avatar size={40} verified />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {((t.user as Record<string, string>)?.name || t.name || 'استاد') as string}
                        </div>
                        <div style={{ fontSize: 11.5, color: 'var(--olive-600)' }}>{(t.tag as string) || ''}</div>
                      </div>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12.5, fontWeight: 800, color: 'var(--gold)' }}>
                        <Icon name="star" size={13} fill />{(t.rating as number)?.toFixed(1) || '—'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </>
      )}
    </PanelShell>
  );
}
