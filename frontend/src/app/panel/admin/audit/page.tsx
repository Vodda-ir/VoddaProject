'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

type AuditEntry = {
  id: number;
  actor_id: number;
  action: string;
  target_type: string;
  target_id: number;
  request_id: string;
  metadata?: string;
  created_at: string;
};

export default function AdminAuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    let active = true;
    setLoading(true);
    setError('');
    fetch('/api/backend/admin/audit-logs?limit=100', { cache: 'no-store' })
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'گزارش عملیات دریافت نشد.');
        if (active) setEntries(body.data || []);
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'گزارش عملیات دریافت نشد.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>گزارش عملیات مدیر</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>ثبت تغییرات حساس برای پیگیری رخداد و پاسخ‌گویی</p>

      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}

      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 18, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
        <div style={{ minWidth: 900 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1.6fr 120px 90px 1fr', gap: 10, padding: '12px 18px', background: 'var(--sand-50)', color: 'var(--ink-3)', fontSize: 12, fontWeight: 700 }}>
            <span>زمان</span><span>عملیات</span><span>هدف</span><span>مدیر</span><span>شناسهٔ درخواست</span>
          </div>
          {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : entries.map((entry) => (
            <article key={entry.id} style={{ display: 'grid', gridTemplateColumns: '160px 1.6fr 120px 90px 1fr', gap: 10, alignItems: 'center', padding: '14px 18px', borderTop: '1px solid var(--sand-100)', fontSize: 12.5 }}>
              <time dateTime={entry.created_at} style={{ color: 'var(--ink-3)' }}>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(entry.created_at))}</time>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 700 }}><Icon name="shield" size={16} style={{ color: 'var(--olive-600)' }} />{entry.action}</span>
              <span>{entry.target_type || '—'} {entry.target_id ? `#${entry.target_id}` : ''}</span>
              <span>#{entry.actor_id}</span>
              <code dir="ltr" style={{ textAlign: 'right', color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.request_id || '—'}</code>
            </article>
          ))}
          {!loading && entries.length === 0 && <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-3)' }}>هنوز عملیات مدیریتی ثبت نشده است.</div>}
        </div>
      </div>
    </main>
  );
}
