'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { api, type SessionListItem } from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';

export default function TeacherRequests() {
  const [requests, setRequests] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.teacherSessions(token, 'pending');
      setRequests(response.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'درخواست‌های جلسه دریافت نشدند.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function respond(session: SessionListItem, approve: boolean) {
    if (!token || busyId !== null) return;
    const action = approve ? 'تأیید' : 'رد';
    if (!window.confirm(`درخواست جلسهٔ ${session.learner?.name || 'قرآن‌آموز'} ${action} شود؟`)) return;
    setBusyId(session.id);
    setError('');
    try {
      if (approve) await api.teacherAcceptSession(token, session.id);
      else await api.teacherRejectSession(token, session.id);
      setRequests((items) => items.filter((item) => item.id !== session.id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `${action} درخواست انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 22 }}>
        <div><h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>درخواست‌های دریافتی</h1><p style={{ fontSize: 13, color: 'var(--ink-3)' }}>{faDigits(requests.length)} درخواست در انتظار پاسخ</p></div>
        <button type="button" onClick={load} style={{ border: '1px solid var(--sand-200)', background: '#fff', borderRadius: 12, padding: '9px 14px', cursor: 'pointer' }}>به‌روزرسانی</button>
      </div>

      {error && <div role="alert" style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)' }}>{error}</div>}
      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {requests.map((session) => (
            <article key={session.id} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap' }}>
              <Avatar size={46} imageUrl={fullUrl(session.learner?.avatar_url)} />
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{session.learner?.name || 'قرآن‌آموز'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{session.service} · {faDigits(session.duration)} دقیقه</div>
                <div style={{ display: 'flex', gap: 14, marginTop: 7, fontSize: 12, color: 'var(--ink-2s)', flexWrap: 'wrap' }}>
                  <span>{session.local_date} · {faDigits(session.local_start)} تا {faDigits(session.local_end)}</span>
                  <span style={{ fontWeight: 700, color: 'var(--olive-700)' }}>{faDigits(session.price)} تومان</span>
                </div>
                {session.note && <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.8 }}>یادداشت: {session.note}</p>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" disabled={busyId === session.id} onClick={() => respond(session, false)} style={responseButton(false, busyId === session.id)}>رد</button>
                <button type="button" disabled={busyId === session.id} onClick={() => respond(session, true)} style={responseButton(true, busyId === session.id)}>{busyId === session.id ? 'در حال ثبت…' : 'تأیید'}</button>
              </div>
            </article>
          ))}
          {requests.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>درخواستی در انتظار پاسخ نیست.</div>}
        </div>
      )}
    </main>
  );
}

const responseButton = (approve: boolean, busy: boolean): React.CSSProperties => ({ padding: '10px 20px', borderRadius: 999, border: 'none', cursor: busy ? 'wait' : 'pointer', background: approve ? 'var(--olive-600)' : 'var(--clay-bg)', color: approve ? '#fff' : 'var(--clay)', fontSize: 13, fontWeight: 700, opacity: busy ? .55 : 1 });
