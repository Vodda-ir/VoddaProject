'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { api, type SessionListItem } from '@/lib/api';
import { fullUrl, getToken } from '@/lib/auth';

const statusMap: Record<string, [string, string, string]> = {
  pending: ['var(--gold-bg)', 'var(--gold)', 'در انتظار تأیید استاد'],
  confirmed: ['var(--olive-100)', 'var(--olive-700)', 'تأییدشده'],
  done: ['var(--sand-100)', 'var(--ink-3)', 'برگزارش‌شده'],
  canceled: ['var(--clay-bg)', 'var(--clay)', 'لغوشده'],
};

export default function UserSessionsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.mySessions(token, tab);
      setSessions(response.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'جلسات دریافت نشدند.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => { void load(); }, [load]);

  async function cancelSession(session: SessionListItem) {
    if (!token || busyId !== null) return;
    if (!window.confirm('جلسه لغو شود؟ لغو فقط پیش از زمان شروع مجاز است و مبلغ به کیف پول بازمی‌گردد.')) return;
    setBusyId(session.id);
    setError('');
    try {
      await api.cancelSession(token, session.id);
      setSessions((items) => items.map((item) => item.id === session.id ? { ...item, status: 'canceled' } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'لغو جلسه انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>جلسات من</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>زمان رسمی سامانه، وضعیت درخواست و نتیجهٔ مالی جلسه</p>
      <div role="tablist" aria-label="نوع جلسات" style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {(['upcoming', 'past'] as const).map((value) => <button type="button" key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} style={{ flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, background: tab === value ? 'var(--olive-600)' : 'var(--surface)', color: tab === value ? '#fff' : 'var(--ink-3)', boxShadow: tab === value ? 'var(--sh-olive)' : 'var(--sh-sm)' }}>{value === 'upcoming' ? 'پیش‌رو' : 'گذشته'}</button>)}
      </div>

      {error && <div role="alert" style={{ padding: 14, marginBottom: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)' }}>{error}<button type="button" onClick={load} style={{ display: 'block', marginTop: 10, border: 0, borderRadius: 10, padding: '7px 12px', background: 'var(--rose)', color: '#fff', cursor: 'pointer' }}>تلاش دوباره</button></div>}
      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sessions.map((session) => {
            const [background, color, label] = statusMap[session.status] || statusMap.pending;
            return <article key={session.id} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap' }}>
              <Avatar size={46} imageUrl={fullUrl(session.teacher?.user?.avatar_url)} />
              <div style={{ flex: '1 1 220px', minWidth: 0 }}><strong style={{ fontSize: 14 }}>{session.teacher?.user?.name || 'استاد'}</strong><div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{session.service} · {faDigits(session.duration)} دقیقه</div><time dateTime={session.scheduled_at} style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-2s)', marginTop: 5 }}>{session.local_date} · {faDigits(session.local_start)} تا {faDigits(session.local_end)}</time>{session.reject_note && <div style={{ fontSize: 12, color: 'var(--clay)', marginTop: 5 }}>دلیل لغو: {session.reject_note}</div>}{session.status === 'pending' && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '7px 10px', borderRadius: 10, background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 12 }}><Icon name="clock" size={14} /> در انتظار تأیید استاد</div>}</div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}><span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background, color }}>{label}</span><strong style={{ fontSize: 14, color: 'var(--olive-700)' }}>{faDigits(session.price)} تومان</strong>{(session.status === 'pending' || session.status === 'confirmed') && <button type="button" disabled={busyId === session.id} onClick={() => cancelSession(session)} style={{ fontSize: 12, fontWeight: 700, color: 'var(--rose)', background: 'none', border: 0, cursor: busyId === session.id ? 'wait' : 'pointer', opacity: busyId === session.id ? .55 : 1 }}>{busyId === session.id ? 'در حال لغو…' : 'لغو جلسه'}</button>}</div>
            </article>;
          })}
          {sessions.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>جلسه‌ای در این بخش وجود ندارد.</div>}
        </div>
      )}
    </main>
  );
}
