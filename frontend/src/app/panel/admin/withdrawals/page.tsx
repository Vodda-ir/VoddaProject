'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { getToken } from '@/lib/auth';

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  function fetchData() {
    if (!token) return;
    setLoading(true);
    fetch('/api/v1/admin/withdrawals', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setWithdrawals(j.data || []))
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [token]);

  async function processWithdrawal(id: number, action: string) {
    if (!token) return;
    await fetch(`/api/v1/admin/withdrawals/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    fetchData();
  }

  const list = withdrawals as Array<Record<string, unknown>>;

  if (loading) return <div style={{ padding: 28 }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>برداشتها</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>مدیریت درخواستهای برداشت وجه اساتید</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(w => (
          <div key={w.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
            <Avatar size={46} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{(w.user_name as string) || ((w.user as Record<string, string>)?.name) || '—'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(w.card as string) || (w.sheba as string) || 'شماره کارت'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{((w.created_at as string) || '').slice(0, 10)}</div>
            </div>
            <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits((w.amount as number) || 0)} ت</span>
            {(w.status as string) === 'pending' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => processWithdrawal(w.id as number, 'paid')} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 13, fontWeight: 700 }}>پرداخت</button>
                <button onClick={() => processWithdrawal(w.id as number, 'rejected')} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: 'pointer', background: 'var(--clay-bg)', color: 'var(--clay)', fontSize: 13, fontWeight: 700 }}>رد</button>
              </div>
            ) : (
              <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: w.status === 'paid' ? 'var(--olive-100)' : 'var(--clay-bg)', color: w.status === 'paid' ? 'var(--olive-700)' : 'var(--clay)' }}>
                {(w.status as string) === 'paid' ? 'پرداختشده' : 'ردشده'}
              </span>
            )}
          </div>
        ))}
        {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>درخواست برداشتی یافت نشد</div>}
      </div>
    </div>
  );
}
