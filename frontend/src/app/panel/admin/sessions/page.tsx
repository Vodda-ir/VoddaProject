'use client';

import { useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { fullUrl, getToken } from '@/lib/auth';
import type { SessionListItem } from '@/lib/api';

const statusMap: Record<string, [string, string, string]> = {
  pending: ['var(--gold-bg)', 'var(--gold)', 'در انتظار'],
  confirmed: ['var(--olive-100)', 'var(--olive-700)', 'تأییدشده'],
  done: ['var(--sand-100)', 'var(--ink-3)', 'برگزارش‌شده'],
  canceled: ['var(--clay-bg)', 'var(--clay)', 'لغوشده'],
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError('');
    fetch('/api/backend/admin/sessions?limit=100', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'فهرست جلسات دریافت نشد.');
        if (active) setSessions(body.data || []);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'فهرست جلسات دریافت نشد.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>جلسات</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>گزارش وضعیت و زمان رسمی جلسات ثبت‌شده</p>
      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)' }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 190px 110px 110px', padding: '12px 20px', background: 'var(--sand-50)', borderBottom: '1px solid var(--sand-100)', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}><span>قرآن‌آموز</span><span>استاد</span><span>خدمت</span><span>زمان رسمی</span><span>مبلغ</span><span>وضعیت</span></div>
          {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : sessions.map((session) => {
            const [background, color, label] = statusMap[session.status] || statusMap.pending;
            return <article key={session.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 190px 110px 110px', padding: '14px 20px', borderBottom: '1px solid var(--sand-50)', fontSize: 13.5, alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar size={30} imageUrl={fullUrl(session.learner?.avatar_url)} /><span>{session.learner?.name || '—'}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Avatar size={30} imageUrl={fullUrl(session.teacher?.user?.avatar_url)} /><span>{session.teacher?.user?.name || '—'}</span></div>
              <span style={{ color: 'var(--ink-2s)' }}>{session.service || '—'}</span>
              <time dateTime={session.scheduled_at} style={{ fontSize: 12, color: 'var(--ink-3)' }}>{session.local_date} · {faDigits(session.local_start)} تا {faDigits(session.local_end)}</time>
              <span style={{ fontWeight: 700 }}>{faDigits(session.price)} ت</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background, color, width: 'fit-content' }}>{label}</span>
            </article>;
          })}
          {!loading && sessions.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>جلسه‌ای یافت نشد.</div>}
        </div>
      </div>
    </main>
  );
}
