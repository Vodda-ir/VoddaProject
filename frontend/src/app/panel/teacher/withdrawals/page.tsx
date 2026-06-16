'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { getToken } from '@/lib/auth';

export default function TeacherWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/teacher/withdrawals', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(j => setWithdrawals(j.data || []))
      .finally(() => setLoading(false));
  }, [token]);

  const list = withdrawals as Array<Record<string, unknown>>;
  if (loading) return <div style={{ padding: 28 }}>در حال بارگذاری…</div>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>درخواستهای برداشت</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>تاریخچه برداشت وجه از کیف پول</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.map(w => (
          <div key={w.id as number} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{faDigits((w.amount as number) || 0)} تومان</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{(w.card as string) || (w.sheba as string) || 'شماره شبا'}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>{((w.created_at as string) || '').slice(0, 10)}</div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999,
              background: (w.status as string) === 'paid' ? 'var(--olive-100)' : (w.status as string) === 'rejected' ? 'var(--clay-bg)' : 'var(--gold-bg)',
              color: (w.status as string) === 'paid' ? 'var(--olive-700)' : (w.status as string) === 'rejected' ? 'var(--clay)' : 'var(--gold)',
            }}>{(w.status as string) === 'paid' ? 'پرداختشده' : (w.status as string) === 'rejected' ? 'ردشده' : 'در انتظار'}</span>
          </div>
        ))}
        {list.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>درخواست برداشتی نیست</div>}
      </div>
    </div>
  );
}
