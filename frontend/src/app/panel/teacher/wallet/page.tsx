'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import { api, type Transaction } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Link from 'next/link';

export default function TeacherWalletPage() {
  const [wallet, setWallet] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [meResponse, transactionResponse] = await Promise.all([api.me(token), api.transactions(token)]);
      setWallet(Number(meResponse.data.wallet) || 0);
      setTransactions(transactionResponse.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اطلاعات کیف پول دریافت نشد.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 22 }}>کیف پول استاد</h1>
      <section style={{ background: 'linear-gradient(135deg,var(--olive-800),var(--olive-600))', borderRadius: 24, padding: 24, color: '#fff', marginBottom: 22, boxShadow: 'var(--sh-olive)' }}>
        <div style={{ fontSize: 13, opacity: .8, marginBottom: 6 }}>موجودی قابل برداشت</div>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 18 }}>{faDigits(wallet)} <span style={{ fontSize: 15, fontWeight: 600, opacity: .75 }}>تومان</span></div>
        <Link href="/panel/teacher/withdrawals" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 14, background: '#fff', color: 'var(--olive-700)', fontSize: 14, fontWeight: 700 }}><Icon name="download" size={18} /> ثبت درخواست برداشت</Link>
      </section>

      {error && <div role="alert" style={{ padding: 14, marginBottom: 16, borderRadius: 14, background: 'var(--clay-bg)', color: 'var(--rose)' }}>{error}<button type="button" onClick={load} style={{ display: 'block', marginTop: 10, border: 0, borderRadius: 10, padding: '7px 12px', background: 'var(--rose)', color: '#fff', cursor: 'pointer' }}>تلاش دوباره</button></div>}
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>تراکنش‌ها</h2>
      {loading ? <div style={{ color: 'var(--ink-3)', padding: 20 }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {transactions.map((transaction) => {
            const credit = transaction.amount > 0;
            return <article key={transaction.id} style={{ background: '#fff', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: credit ? 'var(--olive-100)' : 'var(--gold-bg)', color: credit ? 'var(--olive-700)' : '#9A7426', display: 'grid', placeItems: 'center' }}><Icon name={credit ? 'coins' : 'download'} size={19} /></div>
              <div style={{ flex: '1 1 200px', minWidth: 0 }}><div style={{ fontSize: 13.5, fontWeight: 700 }}>{transaction.title || 'تراکنش کیف پول'}</div><time dateTime={transaction.created_at} style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 3 }}>{formatDate(transaction.created_at)}</time></div>
              <strong style={{ fontSize: 14, color: credit ? 'var(--olive-700)' : 'var(--ink)' }}>{credit ? '+' : '−'}{faDigits(Math.abs(transaction.amount))} تومان</strong>
            </article>;
          })}
          {transactions.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>هنوز تراکنشی ثبت نشده است.</div>}
        </div>
      )}
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
