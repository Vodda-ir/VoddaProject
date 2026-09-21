'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Avatar } from '@/components/web/ui';
import { fullUrl, getToken } from '@/lib/auth';

type Withdrawal = {
  id: number;
  amount?: number;
  sheba?: string;
  status?: string;
  created_at?: string;
  user?: { name?: string; avatar_url?: string };
};

export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const token = getToken();

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/backend/admin/withdrawals?limit=100', { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'درخواست‌های برداشت دریافت نشدند.');
      setWithdrawals(body.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'درخواست‌های برداشت دریافت نشدند.');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  async function processWithdrawal(withdrawal: Withdrawal, action: 'paid' | 'rejected') {
    if (!token || busyId !== null) return;
    const label = action === 'paid' ? 'پرداخت‌شده' : 'ردشده';
    const warning = action === 'paid'
      ? 'فقط پس از انجام واقعی انتقال بانکی، وضعیت را پرداخت‌شده کنید. ادامه می‌دهید؟'
      : 'با رد درخواست، مبلغ رزروشده به کیف پول استاد بازمی‌گردد. ادامه می‌دهید؟';
    if (!window.confirm(warning)) return;

    setBusyId(withdrawal.id);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/withdrawals/${withdrawal.id}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `ثبت وضعیت ${label} انجام نشد.`);
      setWithdrawals((previous) => previous.map((item) => item.id === withdrawal.id ? { ...item, status: action } : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `ثبت وضعیت ${label} انجام نشد.`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>برداشت‌ها</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 22 }}>مدیریت درخواست‌های برداشت وجه استادان</p>

      <div role="note" style={{ padding: 14, borderRadius: 14, background: 'var(--gold-bg)', color: '#765918', fontSize: 13, lineHeight: 1.9, marginBottom: 16 }}>
        ثبت «پرداخت‌شده» در وُدّا جایگزین انتقال بانکی نیست؛ ابتدا انتقال واقعی را انجام دهید و سپس وضعیت را ثبت کنید.
      </div>
      {error && <div role="alert" style={{ padding: 14, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)', marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {withdrawals.map((withdrawal) => (
            <article key={withdrawal.id} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap' }}>
              <Avatar size={46} imageUrl={fullUrl(withdrawal.user?.avatar_url)} />
              <div style={{ flex: '1 1 230px', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{withdrawal.user?.name || '—'}</div>
                <div dir="ltr" style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3, textAlign: 'right' }}>{withdrawal.sheba ? faDigits(withdrawal.sheba) : 'شماره شبا ثبت نشده'}</div>
                {withdrawal.created_at && <time dateTime={withdrawal.created_at} style={{ display: 'block', fontSize: 12, color: 'var(--ink-4)', marginTop: 3 }}>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(withdrawal.created_at))}</time>}
              </div>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--olive-700)' }}>{faDigits(Number(withdrawal.amount) || 0)} تومان</span>
              {withdrawal.status === 'pending' ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" disabled={busyId === withdrawal.id} onClick={() => processWithdrawal(withdrawal, 'rejected')} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: busyId === withdrawal.id ? 'wait' : 'pointer', background: 'var(--clay-bg)', color: 'var(--clay)', fontSize: 13, fontWeight: 700 }}>رد</button>
                  <button type="button" disabled={busyId === withdrawal.id} onClick={() => processWithdrawal(withdrawal, 'paid')} style={{ padding: '8px 16px', borderRadius: 999, border: 'none', cursor: busyId === withdrawal.id ? 'wait' : 'pointer', background: 'var(--olive-600)', color: '#fff', fontSize: 13, fontWeight: 700 }}>{busyId === withdrawal.id ? 'در حال ثبت…' : 'ثبت پرداخت'}</button>
                </div>
              ) : (
                <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 999, background: withdrawal.status === 'paid' ? 'var(--olive-100)' : 'var(--clay-bg)', color: withdrawal.status === 'paid' ? 'var(--olive-700)' : 'var(--clay)' }}>
                  {withdrawal.status === 'paid' ? 'پرداخت‌شده' : 'ردشده'}
                </span>
              )}
            </article>
          ))}
          {withdrawals.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>درخواست برداشتی یافت نشد.</div>}
        </div>
      )}
    </main>
  );
}
