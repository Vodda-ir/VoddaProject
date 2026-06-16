'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { getToken, fullUrl } from '@/lib/auth';

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState<unknown[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const token = getToken();

  function fetchTeachers() {
    if (!token) return;
    setLoading(true);
    fetch(`/api/v1/admin/teachers?status=${filter}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setTeachers(j.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchTeachers(); }, [token, filter]);

  async function review(id: number, approve: boolean) {
    if (!token) return;
    await fetch(`/api/v1/admin/teachers/${id}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ approve }),
    });
    fetchTeachers();
  }

  const list = teachers as Array<Record<string, unknown>>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>اساتید</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 18 }}>بررسی و تأیید پروفایل اساتید</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['pending', 'approved', 'rejected'] as const).map(v => (
          <button key={v} onClick={() => setFilter(v)} style={{
            padding: '8px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            background: filter === v ? 'var(--olive-600)' : 'var(--surface)',
            color: filter === v ? '#fff' : 'var(--ink-3)',
            boxShadow: filter === v ? 'var(--sh-olive)' : 'var(--sh-sm)',
          }}>
            {v === 'pending' ? 'در انتظار تأیید' : v === 'approved' ? 'تأییدشده' : 'ردشده'}
          </button>
        ))}
      </div>
      {loading ? <div style={{ padding: 28 }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(t => (
            <div key={t.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
              <Avatar size={46} imageUrl={(t.user as Record<string, string>)?.avatar_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{((t.user as Record<string, string>)?.name || (t.name as string) || 'استاد')}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(t.field as string) || ''} · {(t.city as string) || ''}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--ink-2s)' }}>
                  <span><Icon name="star" size={13} style={{ color: 'var(--gold)' }} /> {faDigits((t.rating as number) || 0)}</span>
                  <span>{(t.sessions as number) || 0} جلسه</span>
                  <span>{(t.reviews as number) || 0} نظر</span>
                </div>
              </div>
              {filter === 'pending' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => review(t.id as number, true)} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 13, fontWeight: 700 }}>تأیید</button>
                  <button onClick={() => review(t.id as number, false)} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--clay-bg)', color: 'var(--clay)', fontSize: 13, fontWeight: 700 }}>رد</button>
                </div>
              )}
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
                background: (t.status as string) === 'approved' ? 'var(--olive-100)' : (t.status as string) === 'rejected' ? 'var(--clay-bg)' : 'var(--gold-bg)',
                color: (t.status as string) === 'approved' ? 'var(--olive-700)' : (t.status as string) === 'rejected' ? 'var(--clay)' : 'var(--gold)',
              }}>{(t.status as string) === 'approved' ? 'تأییدشده' : (t.status as string) === 'rejected' ? 'ردشده' : 'در انتظار'}</span>
            </div>
          ))}
          {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>موردی یافت نشد</div>}
        </div>
      )}
    </div>
  );
}
