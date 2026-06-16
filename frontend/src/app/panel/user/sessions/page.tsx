'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

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
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/sessions?when=' + tab, { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setSessions(j.data || []))
      .finally(() => setLoading(false));
  }, [token, tab]);

  async function cancelSession(id: number) {
    if (!token) return;
    await fetch('/api/v1/sessions/' + id + '/cancel', { method: 'POST', headers: { Authorization: 'Bearer ' + token } });
    setSessions(prev => prev.map((s) => (s as Record<string, unknown>).id === id ? { ...(s as Record<string, unknown>), status: 'canceled' } : s));
  }

  if (loading) return <div style={{ padding: 28 }}>در حال بارگذاری…</div>;

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {(sessions as Array<Record<string, unknown>>).map((s) => {
          const status = s.status as string;
          const [bg, c, label] = statusMap[status] || statusMap.pending;
          return (
            <div key={s.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
              <Avatar size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{(s.teacher_name as string) || (s.teacherName as string) || 'استاد'}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(s.service as string) || (s.title as string) || ''} · {((s.duration as number) || 30)} دقیقه</div>
                {status === 'pending' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--gold-bg)', color: 'var(--gold)', fontSize: 12 }}>
                    <Icon name="clock" size={14} /> در انتظار تأیید استاد
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: bg, color: c }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits((s.price as number) || 0)} ت</span>
                {(status === 'pending' || status === 'confirmed') && (
                  <button onClick={() => cancelSession(s.id as number)} style={{ fontSize: 12, fontWeight: 600, color: 'var(--rose)', background: 'none', border: 'none', cursor: 'pointer' }}>لغو</button>
                )}
              </div>
            </div>
          );
        })}
        {sessions.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>جلسهای نیست</div>}
      </div>
    </div>
  );
}
