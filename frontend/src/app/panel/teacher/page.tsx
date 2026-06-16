'use client';

import { useState, useEffect } from 'react';
import { StatCard, Panel, MiniBars, faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function TeacherDashboard() {
  const [me, setMe] = useState<Record<string, unknown>>({});
  const [pending, setPending] = useState<unknown[]>([]);
  const [upcoming, setUpcoming] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.me(token),
      api.teacherSessions(token, 'pending'),
      api.teacherSessions(token, 'upcoming'),
    ]).then(([meRes, pendingRes, upcomingRes]) => {
      setMe(meRes.data as Record<string, unknown> || {});
      setPending((pendingRes.data || []) as unknown[]);
      setUpcoming((upcomingRes.data || []) as unknown[]);
    }).finally(() => setLoading(false));
  }, [token]);

  const wallet = (me.wallet as number) || 0;
  const rating = (me.teacherRating as number) || (me.teacher_rating as number) || 4.8;

  async function acceptSession(id: number) {
    if (!token) return;
    await fetch(`/api/v1/teacher/sessions/${id}/accept`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
    setPending(prev => prev.filter((s: unknown) => (s as Record<string, unknown>).id !== id));
  }

  async function rejectSession(id: number) {
    if (!token) return;
    await fetch(`/api/v1/teacher/sessions/${id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: '' }),
    });
    setPending(prev => prev.filter((s: unknown) => (s as Record<string, unknown>).id !== id));
  }

  if (loading) return <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>داشبورد استاد</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>مدیریت جلسات، درخواستها و درآمد</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <StatCard icon="coins" label="موجودی قابل برداشت" value={`${faDigits(wallet)} ت`} tone="olive" />
        <StatCard icon="message" label="درخواست جدید" value={faDigits(pending.length)} tone="clay" />
        <StatCard icon="checkCircle" label="جلسات پیشرو" value={faDigits(upcoming.length)} tone="info" />
        <StatCard icon="star" label="میانگین امتیاز" value={faDigits(rating)} tone="gold" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 18, marginBottom: 18 }}>
        <Panel title="درخواستهای در انتظار پاسخ" pad={false}>
          {pending.length === 0 ? (
            <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>درخواستی در انتظار نیست</div>
          ) : (
            (pending as Array<Record<string, unknown>>).map((r, i) => (
              <div key={r.id as number} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < pending.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                <Avatar size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{(r.learner_name as string) || (r.learnerName as string) || 'قرآنآموز'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{(r.service as string) || (r.title as string) || ''}</div>
                </div>
                <button onClick={() => acceptSession(r.id as number)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--olive-600)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} stroke={2.6} /></button>
                <button onClick={() => rejectSession(r.id as number)} style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--clay-bg)', color: 'var(--clay)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="x" size={17} stroke={2.4} /></button>
              </div>
            ))
          )}
        </Panel>
        <Panel title="درآمد">
          <MiniBars data={[1.8, 2.4, 2.1, 3.0, 2.7, 3.65]} labels={['آذر', 'دی', 'بهمن', 'اسفند', 'فرورد', 'اردیب']} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-3)' }}>موجودی</span>
            <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits(wallet)} ت</span>
          </div>
        </Panel>
      </div>

      <Panel title="جلسات پیشرو" pad={false}>
        {upcoming.length === 0 ? (
          <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>جلسهای در پیش رو نیست</div>
        ) : (
          (upcoming as Array<Record<string, unknown>>).map((s, i) => (
            <div key={s.id as number} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < upcoming.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
              <Avatar size={42} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{(s.learner_name as string) || (s.learnerName as string) || 'قرآنآموز'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{(s.service as string) || (s.title as string) || ''}</div>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: 'var(--olive-100)', color: 'var(--olive-700)' }}>
                {(s.status as string) === 'confirmed' ? 'تأییدشده' : 'در انتظار'}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits((s.price as number) || 0)} ت</span>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
