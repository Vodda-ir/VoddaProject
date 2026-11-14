'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelMetric,
  PanelPageHeader,
} from '@/components/panel/PanelUI';
import { api, type Transaction } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

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

  const ledger = useMemo(() => {
    let credit = 0;
    let debit = 0;
    for (const transaction of transactions) {
      if (transaction.amount >= 0) credit += transaction.amount;
      else debit += Math.abs(transaction.amount);
    }
    return { credit, debit };
  }, [transactions]);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="مالی"
        title="کیف پول"
        description="موجودی قابل برداشت و دفتر تراکنش‌های ثبت‌شده را مشاهده کنید."
        actions={
          <>
            <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
            <Link href="/panel/teacher/withdrawals" className="ops-button" data-tone="primary"><Icon name="download" size={16} />درخواست برداشت</Link>
          </>
        }
      />

      <div className="ops-metric-grid">
        <PanelMetric icon="wallet" label="موجودی قابل برداشت" value={loading ? '—' : `${formatFaNumber(wallet)} ت`} hint="موجودی فعلی" />
        <PanelMetric icon="trending" label="جمع ورودی این فهرست" value={loading ? '—' : `${formatFaNumber(ledger.credit)} ت`} hint="بر اساس تراکنش‌های دریافت‌شده" tone="info" />
        <PanelMetric icon="download" label="جمع خروجی این فهرست" value={loading ? '—' : `${formatFaNumber(ledger.debit)} ت`} hint="برداشت/کسورات ثبت‌شده" tone="clay" />
      </div>

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <section className="ops-data-surface">
        <div className="ops-data-head">
          <div>
            <strong>دفتر تراکنش‌ها</strong>
            <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(transactions.length)} تراکنش آخر`}</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری تراکنش‌ها…</div>
        ) : transactions.length === 0 ? (
          <PanelEmpty icon="wallet" title="هنوز تراکنشی ثبت نشده" />
        ) : (
          transactions.map((transaction) => {
            const credit = transaction.amount >= 0;
            return (
              <article className="ops-row" key={transaction.id}>
                <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', flex: '0 0 42px', borderRadius: 12, color: credit ? 'var(--olive-700)' : 'var(--clay)', background: credit ? 'var(--olive-100)' : 'var(--clay-bg)' }}>
                  <Icon name={credit ? 'coins' : 'download'} size={19} />
                </span>
                <div className="ops-row-main">
                  <div className="ops-row-title"><strong>{transaction.title || 'تراکنش کیف پول'}</strong></div>
                  <div className="ops-row-meta">
                    <span>{formatDate(transaction.created_at)}</span>
                    {transaction.ref_id && <span>مرجع #{toFaDigits(transaction.ref_id)}</span>}
                  </div>
                </div>
                <strong style={{ color: credit ? 'var(--olive-700)' : 'var(--clay)', fontSize: 13.5 }}>
                  {credit ? '+' : '−'}{formatFaNumber(Math.abs(transaction.amount))} تومان
                </strong>
              </article>
            );
          })
        )}
      </section>
    </main>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
