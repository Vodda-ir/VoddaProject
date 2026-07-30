'use client';

import { useCallback, useEffect, useState } from 'react';
import { StatCard, Panel, faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api, type SessionListItem, type Teacher } from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';

export default function TeacherDashboard() {
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [wallet, setWallet] = useState(0);
  const [pending, setPending] = useState<SessionListItem[]>([]);
  const [upcoming, setUpcoming] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [meResponse, teacherResponse, pendingResponse, upcomingResponse] = await Promise.all([
        api.me(token),
        api.teacherMe(token),
        api.teacherSessions(token, 'pending'),
        api.teacherSessions(token, 'upcoming'),
      ]);
      setWallet(Number(meResponse.data.wallet) || 0);
      setTeacher(teacherResponse.data);
      setPending(pendingResponse.data || []);
      setUpcoming(upcomingResponse.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اطلاعات داشبورد استاد دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function respond(session: SessionListItem, approve: boolean) {
    if (!token || busyId !== null) return;
    const action = approve ? 'تأیید' : 'رد';
    if (!window.confirm(`درخواست این جلسه ${action} شود؟`)) return;
    setBusyId(session.id);
    setError('');
    try {
      if (approve) await api.teacherAcceptSession(token, session.id);
      else await api.teacherRejectSession(token, session.id);
      setPending((items) => items.filter((item) => item.id !== session.id));
      setUpcoming((items) => approve
        ? items.map((item) => item.id === session.id ? { ...item, status: 'confirmed' } : item)
        : items.filter((item) => item.id !== session.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} جلسه انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div style={{ padding: 28, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div>;

  return (
    <main style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>داشبورد استاد</h1><p style={{ fontSize: 13, color: 'var(--ink-3)' }}>درخواست‌ها، جلسات و موجودی ثبت‌شدهٔ واقعی</p></div>
        <button type="button" onClick={load} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid var(--sand-200)', background: '#fff', padding: '9px 14px', borderRadius: 12, cursor: 'pointer' }}><Icon name="trending" size={17} /> به‌روزرسانی</button>
      </div>

      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 18 }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 16, marginBottom: 22 }}>
        <StatCard icon="coins" label="موجودی قابل برداشت" value={`${faDigits(wallet)} ت`} tone="olive" />
        <StatCard icon="message" label="درخواست در انتظار" value={faDigits(pending.length)} tone="clay" />
        <StatCard icon="calendar" label="جلسات پیش‌رو" value={faDigits(upcoming.length)} tone="info" />
        <StatCard icon="star" label="میانگین امتیاز" value={teacher && teacher.reviews > 0 ? faDigits(teacher.rating.toFixed(1)) : '—'} tone="gold" />
        <StatCard icon="users" label="نظر ثبت‌شده" value={faDigits(teacher?.reviews || 0)} tone="info" />
        <StatCard icon="checkCircle" label="جلسات تکمیل‌شده" value={faDigits(teacher?.sessions || 0)} tone="olive" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 18 }}>
        <Panel title="درخواست‌های در انتظار پاسخ" pad={false}>
          {pending.length === 0 ? <div style={{ padding: 28, color: 'var(--ink-3)', textAlign: 'center' }}>درخواستی در انتظار نیست.</div> : pending.slice(0, 6).map((session, index) => (
            <article key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: index < Math.min(pending.length, 6) - 1 ? '1px solid var(--sand-100)' : 'none', flexWrap: 'wrap' }}>
              <Avatar size={42} imageUrl={fullUrl(session.learner?.avatar_url)} />
              <div style={{ flex: '1 1 170px', minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{session.learner?.name || 'قرآن‌آموز'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{session.service} · {session.local_date} · {session.local_start}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" aria-label="رد درخواست" disabled={busyId === session.id} onClick={() => respond(session, false)} style={actionButton(false, busyId === session.id)}><Icon name="x" size={17} /></button>
                <button type="button" aria-label="تأیید درخواست" disabled={busyId === session.id} onClick={() => respond(session, true)} style={actionButton(true, busyId === session.id)}><Icon name="check" size={18} /></button>
              </div>
            </article>
          ))}
        </Panel>

        <Panel title="وضعیت حساب و پروفایل">
          <Metric label="موجودی فعلی" value={`${faDigits(wallet)} تومان`} />
          <Metric label="وضعیت پروفایل" value={teacher?.status === 'approved' ? 'تأییدشده' : teacher?.status === 'rejected' ? 'ردشده' : 'در انتظار بررسی'} />
          <Metric label="امکان رزرو" value={teacher?.available ? 'فعال' : 'غیرفعال'} />
          <p style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--sand-100)', color: 'var(--ink-3)', fontSize: 12.5, lineHeight: 1.9 }}>نمودار درآمد تا زمان وجود گزارش دوره‌ای واقعی نمایش داده نمی‌شود؛ این بخش فقط داده‌های ثبت‌شده را نشان می‌دهد.</p>
        </Panel>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, paddingBlock: 8 }}><span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{label}</span><strong style={{ fontSize: 13.5 }}>{value}</strong></div>;
}

const actionButton = (approve: boolean, busy: boolean): React.CSSProperties => ({ width: 38, height: 38, borderRadius: 11, border: 0, display: 'grid', placeItems: 'center', cursor: busy ? 'wait' : 'pointer', background: approve ? 'var(--olive-600)' : 'var(--clay-bg)', color: approve ? '#fff' : 'var(--clay)', opacity: busy ? .55 : 1 });
