'use client';

import { useState, useEffect } from 'react';
import { StatCard, Panel, MiniBars, faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { api } from '@/lib/api';
import { getToken, fullUrl } from '@/lib/auth';

export default function AdminDashboard() {
  const [dash, setDash] = useState<Record<string, unknown>>({});
  const [pendingTeachers, setPendingTeachers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.adminDashboard(token).catch(() => ({ data: {} })),
      api.adminPendingTeachers(token).catch(() => ({ data: [], total: 0 })),
    ]).then(([dashRes, pendingRes]) => {
      setDash(dashRes.data || {});
      setPendingTeachers((pendingRes.data || []) as unknown[]);
    }).finally(() => setLoading(false));
  }, [token]);

  const userCount = (dash.users as number) || (dash.user_count as number) || 0;
  const teacherCount = (dash.teachers as number) || (dash.teacher_count as number) || 0;
  const sessionCount = (dash.sessions as number) || (dash.session_count as number) || 0;
  const commission = (dash.commission as number) || 0;

  async function approveTeacher(id: number) {
    if (!token) return;
    await fetch(`/api/v1/admin/teachers/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approve: true }),
    });
    setPendingTeachers(prev => prev.filter((t: unknown) => (t as Record<string, unknown>).id !== id));
  }

  if (loading) return <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>داشبورد مدیریت</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>نمای کلی عملکرد ودّا</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <StatCard icon="users" label="کل کاربران" value={faDigits(userCount)} tone="info" />
        <StatCard icon="award" label="اساتید فعال" value={faDigits(teacherCount)} tone="olive" />
        <StatCard icon="checkCircle" label="جلسات این ماه" value={faDigits(sessionCount)} tone="gold" />
        <StatCard icon="coins" label="درآمد کارمزد (ماه)" value={`${faDigits(commission)} ت`} tone="clay" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 18 }}>
        <Panel title="اساتید در انتظار تأیید" pad={false}>
          {pendingTeachers.length === 0 ? (
            <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>موردی در انتظار تأیید نیست</div>
          ) : (
            (pendingTeachers as Array<Record<string, unknown>>).map((t, i) => (
              <div key={t.id as number} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < pendingTeachers.length - 1 ? '1px solid var(--sand-100)' : 'none' }}>
                <Avatar size={42} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{((t.user as Record<string, string>)?.name || t.name || 'استاد') as string}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{(t.field as string) || ''} · {(t.city as string) || ''}</div>
                </div>
                <button onClick={() => approveTeacher(t.id as number)} style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '7px 14px', borderRadius: 999, border: 'none', cursor: 'pointer' }}>تأیید</button>
              </div>
            ))
          )}
        </Panel>
        <Panel title="خلاصه">
          <MiniBars data={[3.1, 3.9, 4.6, 5.4, 6.8, 8.4]} labels={['آذر', 'دی', 'بهمن', 'اسفند', 'فرورد', 'اردیب']} color="var(--olive-400)" />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--sand-100)', fontSize: 13 }}>
            <span style={{ color: 'var(--ink-3)' }}>مجموع کارمزد</span>
            <span style={{ fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits(commission)} ت</span>
          </div>
        </Panel>
      </div>
    </div>
  );
}
