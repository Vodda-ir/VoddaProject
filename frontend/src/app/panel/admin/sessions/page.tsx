'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { getToken } from '@/lib/auth';

const statusMap: Record<string, [string, string, string]> = {
  pending: ['var(--gold-bg)', 'var(--gold)', 'در انتظار'],
  confirmed: ['var(--olive-100)', 'var(--olive-700)', 'تأییدشده'],
  done: ['var(--sand-100)', 'var(--ink-3)', 'برگزارشده'],
  canceled: ['var(--clay-bg)', 'var(--clay)', 'لغوشده'],
};

export default function AdminSessions() {
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/admin/sessions', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setSessions(j.data || []))
      .finally(() => setLoading(false));
  }, [token]);

  const list = sessions as Array<Record<string, unknown>>;

  if (loading) return <div style={{ padding: 28 }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>جلسات</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>نمایش تمام جلسات سامانه</p>
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: 'var(--sh-sm)', border: '1px solid var(--sand-150)', overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 100px 100px', padding: '12px 20px', background: 'var(--sand-50)', borderBottom: '1px solid var(--sand-100)', fontSize: 12, fontWeight: 700, color: 'var(--ink-3)' }}>
          <span>قرآنآموز</span><span>استاد</span><span>خدمت</span><span>مبلغ</span><span>وضعیت</span>
        </div>
        {list.map(s => {
          const [bg, c, label] = statusMap[s.status as string] || statusMap.pending;
          return (
            <div key={s.id as number} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 100px 100px', padding: '14px 20px', borderBottom: '1px solid var(--sand-50)', fontSize: 13.5, alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar size={30} />
                {(s.learner_name as string) || ((s.learner as Record<string, string>)?.name) || '—'}
              </div>
              <span>{(s.teacher_name as string) || ((s.teacher as Record<string, unknown>)?.user as Record<string, string>)?.name || '—'}</span>
              <span style={{ color: 'var(--ink-2s)' }}>{(s.title as string) || (s.service as string) || '—'}</span>
              <span style={{ fontWeight: 700 }}>{faDigits((s.price as number) || 0)} ت</span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: bg, color: c, width: 'fit-content' }}>{label}</span>
            </div>
          );
        })}
        {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>جلسهای یافت نشد</div>}
      </div>
    </div>
  );
}
