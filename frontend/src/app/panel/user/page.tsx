'use client';

import { useState, useEffect } from 'react';
import { StatCard, Panel, faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Link from 'next/link';

export default function UserDashboard() {
  const [me, setMe] = useState<Record<string, unknown>>({});
  const [upcoming, setUpcoming] = useState<unknown[]>([]);
  const [past, setPast] = useState<unknown[]>([]);
  const [teachers, setTeachers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.me(token),
      api.mySessions(token, 'upcoming'),
      api.mySessions(token, 'past'),
      api.teachers(''),
    ]).then(([meRes, upRes, pastRes, tRes]) => {
      setMe(meRes.data as Record<string, unknown> || {});
      setUpcoming((upRes.data || []) as unknown[]);
      setPast((pastRes.data || []) as unknown[]);
      setTeachers((tRes.data || []).slice(0, 4) as unknown[]);
    }).finally(() => setLoading(false));
  }, [token]);

  const wallet = (me.wallet as number) || 0;
  const name = (me.name as string) || 'قرآنآموز';

  if (loading) return <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>سلام {name.split(' ')[0]} 🌿</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>خلاصهای از فعالیتهای شما در وُدّا</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 22 }}>
        <StatCard icon="calendar" label="جلسات پیشرو" value={faDigits(upcoming.length)} tone="olive" />
        <StatCard icon="checkCircle" label="جلسات برگزارشده" value={faDigits(past.length)} tone="info" />
        <StatCard icon="wallet" label="موجودی کیف پول" value={`${faDigits(wallet)} ت`} tone="gold" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
        <Panel title="جلسات پیشرو" pad={false}>
          {upcoming.length === 0 ? (
            <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>جلسهای در پیش رو نیست</div>
          ) : (
            (upcoming as Array<Record<string, unknown>>).map((s, i) => (
              <div key={s.id as number} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                <Avatar size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{(s.teacher_name as string) || (s.teacherName as string) || 'استاد'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{(s.service as string) || (s.title as string) || ''}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: (s.status as string) === 'confirmed' ? 'var(--olive-100)' : 'var(--gold-bg)', color: (s.status as string) === 'confirmed' ? 'var(--olive-700)' : 'var(--gold)' }}>
                  {(s.status as string) === 'confirmed' ? 'تأییدشده' : 'در انتظار'}
                </span>
                <Link href={`/panel/user/sessions`} style={{ fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '8px 16px', borderRadius: 999, textDecoration: 'none' }}>
                  {(s.status as string) === 'confirmed' ? 'پیوستن' : 'جزئیات'}
                </Link>
              </div>
            ))
          )}
        </Panel>
        <Panel title="اساتید پیشنهادی" pad={true}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(teachers as Array<Record<string, unknown>>).map(t => (
              <div key={t.id as number} style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <Avatar size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{((t.user as Record<string, string>)?.name || t.name || 'استاد') as string}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--olive-600)' }}>{(t.tag as string) || ''}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12.5, fontWeight: 800, color: 'var(--gold)' }}>
                  <Icon name="star" size={13} fill /> {(t.rating as number)?.toFixed(1) || '—'}
                </span>
              </div>
            ))}
            {teachers.length === 0 && <div style={{ color: 'var(--ink-3)', textAlign: 'center' }}>در حال بارگذاری…</div>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
