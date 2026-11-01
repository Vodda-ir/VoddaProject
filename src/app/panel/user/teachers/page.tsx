'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { Icon } from '@/components/Icon';
import { getToken } from '@/lib/auth';

export default function UserTeachersPage() {
  const [teachers, setTeachers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setTeachers(j.data || []))
      .finally(() => setLoading(false));
  }, [token]);

  const list = teachers as Array<Record<string, unknown>>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>اساتید</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>مشاهده و رزرو جلسه با اساتید</p>
      {loading ? <div style={{ padding: 28 }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {list.map(t => (
            <div key={t.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
              <Avatar size={46} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{((t.user as Record<string, string>)?.name || t.name || 'استاد') as string}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(t.field as string) || ''} · {(t.city as string) || ''}</div>
                <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 12, color: 'var(--ink-2s)' }}>
                  <span><Icon name="star" size={13} style={{ color: 'var(--gold)' }} /> {(t.rating as number) ? faDigits((t.rating as number).toFixed(1)) : '—'}</span>
                  <span>{faDigits((t.reviews as number) || 0)} نظر</span>
                  <span>{faDigits((t.sessions as number) || 0)} جلسه</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: (t.verified as boolean) ? 'var(--olive-100)' : 'var(--gold-bg)', color: (t.verified as boolean) ? 'var(--olive-700)' : 'var(--gold)' }}>
                  {(t.verified as boolean) ? 'تأییدشده' : 'در انتظار'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--olive-700)' }}>از {faDigits((t.price30 as number) || 0)} ت</span>
              </div>
            </div>
          ))}
          {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>استادی یافت نشد</div>}
        </div>
      )}
    </div>
  );
}
