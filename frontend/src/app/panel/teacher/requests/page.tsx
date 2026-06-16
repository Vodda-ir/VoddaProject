'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

export default function TeacherRequests() {
  const [requests, setRequests] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  function fetchData() {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/teacher/sessions?when=pending', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setRequests(j.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [token]);

  async function accept(id: number) {
    if (!token) return;
    await fetch(`/api/v1/teacher/sessions/${id}/accept`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  }

  async function reject(id: number) {
    if (!token) return;
    await fetch(`/api/v1/teacher/sessions/${id}/reject`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: '' }),
    });
    fetchData();
  }

  const list = requests as Array<Record<string, unknown>>;

  if (loading) return <div style={{ padding: 28 }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>درخواستهای دریافتی</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>{faDigits(list.length)} درخواست در انتظار پاسخ شما</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(r => (
          <div key={r.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
            <Avatar size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{(r.learner_name as string) || (r.learnerName as string) || 'قرآنآموز'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(r.service as string) || (r.title as string) || ''}</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--ink-2s)' }}>
                <span><Icon name="clock" size={14} style={{ color: 'var(--olive-500)' }} /> {(r.duration as number) || 30} دقیقه</span>
                <span style={{ fontWeight: 700, color: 'var(--olive-700)' }}>{faDigits((r.price as number) || 0)} ت</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => accept(r.id as number)} style={{ padding: '10px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 13, fontWeight: 700 }}>تأیید</button>
              <button onClick={() => reject(r.id as number)} style={{ padding: '10px 20px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--clay-bg)', color: 'var(--clay)', fontSize: 13, fontWeight: 700 }}>رد</button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>درخواستی در انتظار پاسخ نیست</div>}
      </div>
    </div>
  );
}
