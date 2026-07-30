'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatCard, Panel, faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { getToken, fullUrl } from '@/lib/auth';
import Link from 'next/link';

export default function UserDashboard() {
  const [me, setMe] = useState<Record<string, unknown>>({});
  const [upcoming, setUpcoming] = useState<unknown[]>([]);
  const [past, setPast] = useState<unknown[]>([]);
  const [teachers, setTeachers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  const load = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError('');
    Promise.all([
      api.me(token),
      api.mySessions(token, 'upcoming'),
      api.mySessions(token, 'past'),
      api.teachers('', { limit: '4' }),
    ])
      .then(([meRes, upRes, pastRes, teacherRes]) => {
        setMe((meRes.data as Record<string, unknown>) || {});
        setUpcoming((upRes.data || []) as unknown[]);
        setPast((pastRes.data || []) as unknown[]);
        setTeachers((teacherRes.data || []) as unknown[]);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'اطلاعات داشبورد دریافت نشد.'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const wallet = Number(me.wallet) || 0;
  const name = (me.name as string) || 'قرآن‌آموز';

  if (loading) return <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div>;
  if (error) return <div role="alert" style={{ margin: 28, padding: 22, borderRadius: 18, background: 'var(--clay-bg)', color: 'var(--rose)' }}><div>{error}</div><button type="button" onClick={load} style={{ marginTop: 12, border: 0, borderRadius: 10, padding: '8px 14px', background: 'var(--rose)', color: '#fff', cursor: 'pointer' }}>تلاش دوباره</button></div>;

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>سلام {name.split(' ')[0]} 🌿</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>خلاصه‌ای از فعالیت‌های شما در وُدّا</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 22 }}>
        <StatCard icon="calendar" label="جلسات پیش‌رو" value={faDigits(upcoming.length)} tone="olive" />
        <StatCard icon="checkCircle" label="جلسات گذشته" value={faDigits(past.length)} tone="info" />
        <StatCard icon="wallet" label="موجودی کیف پول" value={`${faDigits(wallet)} ت`} tone="gold" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
        <Panel title="جلسات پیش‌رو" pad={false}>
          {upcoming.length === 0 ? (
            <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>جلسه‌ای در پیش رو نیست.</div>
          ) : (
            (upcoming as Array<Record<string, unknown>>).slice(0, 5).map((session, index) => (
              <article key={session.id as number} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '15px 20px', borderBottom: index < Math.min(upcoming.length, 5) - 1 ? '1px solid var(--sand-100)' : 'none', flexWrap: 'wrap' }}>
                <Avatar size={44} imageUrl={fullUrl(((session.teacher as Record<string, unknown>)?.user as Record<string, string>)?.avatar_url)} />
                <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{(session.teacher_name as string) || ((((session.teacher as Record<string, unknown>)?.user as Record<string, string>)?.name)) || 'استاد'}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{(session.service as string) || (session.title as string) || ''}</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: session.status === 'confirmed' ? 'var(--olive-100)' : 'var(--gold-bg)', color: session.status === 'confirmed' ? 'var(--olive-700)' : 'var(--gold)' }}>
                  {session.status === 'confirmed' ? 'تأییدشده' : 'در انتظار'}
                </span>
                <Link href="/panel/user/sessions" style={{ fontSize: 13, fontWeight: 700, color: 'var(--olive-700)', background: 'var(--olive-100)', padding: '8px 16px', borderRadius: 999 }}>
                  مشاهدهٔ جزئیات
                </Link>
              </article>
            ))
          )}
        </Panel>

        <Panel title="اساتید پیشنهادی" pad>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(teachers as Array<Record<string, unknown>>).map((teacher) => (
              <Link key={teacher.id as number} href={`/teachers/${teacher.id}`} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 4, borderRadius: 12 }}>
                <Avatar size={40} imageUrl={fullUrl((teacher.user as Record<string, string>)?.avatar_url)} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{((teacher.user as Record<string, string>)?.name || teacher.name || 'استاد') as string}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--olive-600)' }}>{(teacher.tag as string) || ''}</div>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontSize: 12.5, fontWeight: 800, color: 'var(--gold)' }}>
                  <Icon name="star" size={13} fill /> {Number(teacher.rating) > 0 ? Number(teacher.rating).toFixed(1) : '—'}
                </span>
              </Link>
            ))}
            {teachers.length === 0 && <div style={{ color: 'var(--ink-3)', textAlign: 'center' }}>هنوز استاد تأییدشده‌ای وجود ندارد.</div>}
          </div>
        </Panel>
      </div>
    </main>
  );
}
