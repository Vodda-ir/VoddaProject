'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { fullUrl, getToken } from '@/lib/auth';

const statusMap: Record<string, [string, string, string]> = {
  pending: ['var(--gold-bg)', 'var(--gold)', 'در انتظار تأیید استاد'],
  confirmed: ['var(--olive-100)', 'var(--olive-700)', 'تأییدشده'],
  done: ['var(--sand-100)', 'var(--ink-3)', 'برگزارشده'],
  canceled: ['var(--clay-bg)', 'var(--clay)', 'لغوشده'],
};

export default function UserSessionsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/sessions?when=${tab}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'جلسات دریافت نشدند.');
      setSessions(body.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'جلسات دریافت نشدند.');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [tab, token]);

  useEffect(() => { void load(); }, [load]);

  async function cancelSession(id: number) {
    if (!token || busyId !== null) return;
    if (!window.confirm('جلسه لغو شود؟ در صورت مجاز بودن لغو، مبلغ به کیف پول بازمی‌گردد.')) return;

    setBusyId(id);
    setError('');
    try {
      const response = await fetch(`/api/backend/sessions/${id}/cancel`, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'لغو جلسه انجام نشد.');
      setSessions((previous) => previous.map((item) => (item as Record<string, unknown>).id === id ? { ...(item as Record<string, unknown>), status: 'canceled' } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'لغو جلسه انجام نشد.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>جلسات من</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>وضعیت درخواست‌ها، لغو و نتیجهٔ مالی جلسات را پیگیری کنید.</p>

      <div role="tablist" aria-label="نوع جلسات" style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {(['upcoming', 'past'] as const).map((value) => (
          <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} style={{
            flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            background: tab === value ? 'var(--olive-600)' : 'var(--surface)',
            color: tab === value ? '#fff' : 'var(--ink-3)',
            boxShadow: tab === value ? 'var(--sh-olive)' : 'var(--sh-sm)',
          }}>{value === 'upcoming' ? 'پیش‌رو' : 'گذشته'}</button>
        ))}
      </div>

      {error && <div role="alert" style={{ padding: 14, marginBottom: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)' }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(sessions as Array<Record<string, unknown>>).map((session) => {
            const status = session.status as string;
            const [background, color, label] = statusMap[status] || statusMap.pending;
            const teacher = session.teacher as Record<string, unknown> | undefined;
            const teacherUser = teacher?.user as Record<string, string> | undefined;
            const scheduledAt = session.scheduled_at as string | undefined;
            return (
              <article key={session.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap' }}>
                <Avatar size={46} imageUrl={fullUrl(teacherUser?.avatar_url)} />
                <div style={{ flex: '1 1 190px', minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{(session.teacher_name as string) || teacherUser?.name || 'استاد'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(session.service as string) || (session.title as string) || ''} · {faDigits(Number(session.duration) || 30)} دقیقه</div>
                  {scheduledAt && <time dateTime={scheduledAt} style={{ display: 'block', fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(scheduledAt))}</time>}
                  {status === 'pending' && <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 12 }}><Icon name="clock" size={14} /> در انتظار تأیید استاد</div>}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background, color }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits(Number(session.price) || 0)} ت</span>
                  {(status === 'pending' || status === 'confirmed') && (
                    <button type="button" disabled={busyId === session.id} onClick={() => cancelSession(session.id as number)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--rose)', background: 'none', border: 'none', cursor: busyId === session.id ? 'wait' : 'pointer', opacity: busyId === session.id ? .55 : 1 }}>
                      {busyId === session.id ? 'در حال لغو…' : 'لغو جلسه'}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {sessions.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>جلسه‌ای در این بخش وجود ندارد.</div>}
        </div>
      )}
    </main>
  );
}
