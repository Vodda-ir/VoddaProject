'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatCard, Panel, faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { fullUrl, getToken } from '@/lib/auth';

type DashboardData = {
  learners?: number;
  teachers?: number;
  pending_teachers?: number;
  sessions?: number;
  done_sessions?: number;
  charge_volume?: number;
  commission?: number;
};

type PendingTeacher = {
  id: number;
  field?: string;
  city?: string;
  user?: { name?: string; avatar_url?: string };
};

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData>({});
  const [pendingTeachers, setPendingTeachers] = useState<PendingTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [dashboardResponse, teachersResponse] = await Promise.all([
        fetch('/api/backend/admin/dashboard', { cache: 'no-store' }),
        fetch('/api/backend/admin/teachers?status=pending&limit=10', { cache: 'no-store' }),
      ]);
      const [dashboardBody, teachersBody] = await Promise.all([
        dashboardResponse.json().catch(() => ({})),
        teachersResponse.json().catch(() => ({})),
      ]);
      if (!dashboardResponse.ok) throw new Error(dashboardBody.error || 'آمار مدیریت دریافت نشد.');
      if (!teachersResponse.ok) throw new Error(teachersBody.error || 'فهرست استادان در انتظار دریافت نشد.');
      setDashboard(dashboardBody.data || {});
      setPendingTeachers(teachersBody.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'داشبورد مدیریت دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function reviewTeacher(id: number, approve: boolean) {
    if (!token || busyId !== null) return;
    const action = approve ? 'تأیید' : 'رد';
    if (!window.confirm(`پروفایل این استاد ${action} شود؟`)) return;

    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/teachers/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approve }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `${action} استاد انجام نشد.`);
      setPendingTeachers((previous) => previous.filter((teacher) => teacher.id !== id));
      setDashboard((previous) => ({
        ...previous,
        pending_teachers: Math.max(0, Number(previous.pending_teachers || 0) - 1),
        teachers: approve ? Number(previous.teachers || 0) + 1 : previous.teachers,
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} استاد انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div>;

  return (
    <main style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>داشبورد مدیریت</h1>
          <p style={{ fontSize: 13, color: 'var(--ink-3)' }}>آمار واقعی ثبت‌شده در Backend و موارد نیازمند اقدام</p>
        </div>
        <button type="button" onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid var(--sand-200)', background: '#fff', padding: '9px 14px', borderRadius: 12, cursor: 'pointer', color: 'var(--ink-2s)' }}>
          <Icon name="trending" size={17} /> به‌روزرسانی
        </button>
      </div>

      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 18 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 16, marginBottom: 22 }}>
        <StatCard icon="users" label="قرآن‌آموزان" value={faDigits(Number(dashboard.learners || 0))} tone="info" />
        <StatCard icon="award" label="کل استادان" value={faDigits(Number(dashboard.teachers || 0))} tone="olive" />
        <StatCard icon="clock" label="در انتظار بررسی" value={faDigits(Number(dashboard.pending_teachers || 0))} tone="gold" />
        <StatCard icon="calendar" label="کل جلسات" value={faDigits(Number(dashboard.sessions || 0))} tone="info" />
        <StatCard icon="checkCircle" label="جلسات تکمیل‌شده" value={faDigits(Number(dashboard.done_sessions || 0))} tone="olive" />
        <StatCard icon="coins" label="کارمزد ثبت‌شده" value={`${faDigits(Number(dashboard.commission || 0))} ت`} tone="clay" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
        <Panel title="استادان در انتظار تأیید" pad={false}>
          {pendingTeachers.length === 0 ? (
            <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>موردی در انتظار تأیید نیست.</div>
          ) : pendingTeachers.map((teacher, index) => (
            <article key={teacher.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: index < pendingTeachers.length - 1 ? '1px solid var(--sand-100)' : 'none', flexWrap: 'wrap' }}>
              <Avatar size={42} imageUrl={fullUrl(teacher.user?.avatar_url)} />
              <div style={{ flex: '1 1 150px', minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{teacher.user?.name || 'استاد'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{[teacher.field, teacher.city].filter(Boolean).join(' · ') || 'اطلاعات تکمیلی ثبت نشده'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={busyId === teacher.id} onClick={() => reviewTeacher(teacher.id, false)} style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--clay)', background: 'var(--clay-bg)', padding: '7px 14px', borderRadius: 999, border: 'none', cursor: busyId === teacher.id ? 'wait' : 'pointer' }}>رد</button>
                <button type="button" disabled={busyId === teacher.id} onClick={() => reviewTeacher(teacher.id, true)} style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', background: 'var(--olive-600)', padding: '7px 14px', borderRadius: 999, border: 'none', cursor: busyId === teacher.id ? 'wait' : 'pointer' }}>{busyId === teacher.id ? 'در حال ثبت…' : 'تأیید'}</button>
              </div>
            </article>
          ))}
        </Panel>

        <Panel title="وضعیت مالی ثبت‌شده">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Metric label="حجم شارژ ثبت‌شده" value={Number(dashboard.charge_volume || 0)} />
            <Metric label="کارمزد سامانه" value={Number(dashboard.commission || 0)} />
          </div>
          <p style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--sand-100)', color: 'var(--ink-3)', fontSize: 12.5, lineHeight: 1.9 }}>
            نمودار تاریخی تا زمان وجود endpoint گزارش دوره‌ای نمایش داده نمی‌شود؛ اعداد ساختگی از داشبورد حذف شده‌اند.
          </p>
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{label}</span><strong style={{ color: 'var(--olive-700)', fontSize: 15 }}>{faDigits(value)} تومان</strong></div>;
}
