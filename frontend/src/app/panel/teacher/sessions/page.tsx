'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { getToken } from '@/lib/auth';

const statusColors: Record<string, [string, string, string]> = {
  pending: ['var(--gold-bg)', 'var(--gold)', 'در انتظار'],
  confirmed: ['var(--olive-100)', 'var(--olive-700)', 'تأییدشده'],
  done: ['var(--sand-100)', 'var(--ink-3)', 'برگزارشده'],
  canceled: ['var(--clay-bg)', 'var(--clay)', 'لغوشده'],
};

export default function TeacherSessionsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [sessions, setSessions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`/api/v1/teacher/sessions?when=${tab}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setSessions(j.data || []))
      .finally(() => setLoading(false));
  }, [token, tab]);

  const list = sessions as Array<Record<string, unknown>>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>جلسات من</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {(['upcoming', 'past'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '11px 0', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700,
            background: tab === t ? 'var(--olive-600)' : 'var(--surface)',
            color: tab === t ? '#fff' : 'var(--ink-3)',
            boxShadow: tab === t ? 'var(--sh-olive)' : 'var(--sh-sm)',
          }}>{t === 'upcoming' ? 'پیشرو' : 'برگزارشده'}</button>
        ))}
      </div>
      {loading ? <div style={{ padding: 28 }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(s => {
            const [bg, c, label] = statusColors[s.status as string] || statusColors.pending;
            return (
              <div key={s.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
                <Avatar size={46} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{(s.learner_name as string) || (s.learnerName as string) || 'قرآنآموز'}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(s.service as string) || (s.title as string) || ''} · {(s.duration as number) || 30} دقیقه</div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: bg, color: c }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits((s.price as number) || 0)} ت</span>
              </div>
            );
          })}
          {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>جلسهای نیست</div>}
        </div>
      )}
    </div>
  );
}
