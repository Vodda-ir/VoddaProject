'use client';

import { useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';

export default function UserWalletPage() {
  const [me, setMe] = useState<Record<string, unknown>>({});
  const [txs, setTxs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  function fetchData() {
    if (!token) return;
    setLoading(true);
    setError('');
    Promise.all([api.me(token), api.transactions(token)])
      .then(([meRes, txRes]) => {
        setMe((meRes.data as Record<string, unknown>) || {});
        setTxs((txRes.data || []) as unknown[]);
      })
      .catch((cause) => {
        setError(cause instanceof Error ? cause.message : 'اطلاعات کیف پول دریافت نشد.');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => { fetchData(); }, [token]);

  const wallet = (me.wallet as number) || 0;
  const txList = txs as Array<Record<string, unknown>>;

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 22 }}>کیف پول</h1>

      <section style={{ background: 'linear-gradient(135deg,var(--olive-800),var(--olive-600))', borderRadius: 24, padding: 24, color: '#fff', marginBottom: 16, boxShadow: 'var(--sh-olive)' }}>
        <div style={{ fontSize: 13, opacity: .8, marginBottom: 6 }}>موجودی کیف پول</div>
        <div style={{ fontSize: 32, fontWeight: 800 }}>{faDigits(wallet)} <span style={{ fontSize: 15, fontWeight: 600, opacity: .75 }}>تومان</span></div>
      </section>

      <div role="note" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16, background: 'var(--gold-bg)', color: '#765918', fontSize: 13, lineHeight: 1.9, marginBottom: 24 }}>
        <Icon name="shield" size={19} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>درگاه پرداخت عمومی هنوز فعال نشده است. شارژ مستقیم فقط ابزار توسعه است و در پنل production نمایش داده نمی‌شود.</span>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>تراکنش‌ها</h2>
      {loading ? (
        <div style={{ color: 'var(--ink-3)', paddingBlock: 20 }}>در حال بارگذاری…</div>
      ) : error ? (
        <div role="alert" style={{ padding: 20, borderRadius: 16, background: 'var(--clay-bg)', color: 'var(--rose)' }}>
          <div>{error}</div>
          <button type="button" onClick={fetchData} style={{ marginTop: 12, border: 0, borderRadius: 10, padding: '8px 14px', background: 'var(--rose)', color: '#fff', cursor: 'pointer' }}>تلاش دوباره</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {txList.map((tx) => {
            const amount = Number(tx.amount) || 0;
            const credit = amount > 0;
            const date = (tx.created_at as string) || (tx.date as string) || '';
            return (
              <article key={tx.id as number} style={{ background: '#fff', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: credit ? 'var(--olive-100)' : 'var(--gold-bg)', color: credit ? 'var(--olive-700)' : '#9A7426', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={credit ? 'coins' : 'download'} size={19} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{(tx.title as string) || 'تراکنش کیف پول'}</div>
                  {date && <time dateTime={date} style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2 }}>{date.slice(0, 16).replace('T', ' ')}</time>}
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: credit ? 'var(--olive-700)' : 'var(--ink)' }}>
                  {credit ? '+' : '−'}{faDigits(Math.abs(amount))}
                </span>
              </article>
            );
          })}
          {txList.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>هنوز تراکنشی ثبت نشده است.</div>}
        </div>
      )}
    </main>
  );
}
