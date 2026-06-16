'use client';

import { useState, useEffect } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { getToken } from '@/lib/auth';
import Link from 'next/link';

export default function TeacherWalletPage() {
  const [me, setMe] = useState<Record<string, unknown>>({});
  const [txs, setTxs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const token = getToken();

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.me(token),
      api.transactions(token),
    ]).then(([meRes, txRes]) => {
      setMe(meRes.data as Record<string, unknown> || {});
      setTxs((txRes.data || []) as unknown[]);
    }).finally(() => setLoading(false));
  }, [token]);

  const wallet = (me.wallet as number) || 0;
  const txList = txs as Array<Record<string, unknown>>;

  return (
    <div style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 22 }}>کیف پول</h1>
      <div style={{ background: 'linear-gradient(135deg,var(--olive-800),var(--olive-600))', borderRadius: 24, padding: 24, color: '#fff', marginBottom: 22, boxShadow: 'var(--sh-olive)' }}>
        <div style={{ fontSize: 13, opacity: .8, marginBottom: 6 }}>موجودی قابل برداشت</div>
        <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 18 }}>{faDigits(wallet)} <span style={{ fontSize: 15, fontWeight: 600, opacity: .75 }}>تومان</span></div>
        <Link href="/panel/teacher/withdrawals" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 14, background: '#fff', color: 'var(--olive-700)', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
          <Icon name="download" size={18} /> درخواست برداشت وجه
        </Link>
      </div>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14 }}>تراکنشها</h2>
      {loading ? <div>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {txList.map(tx => {
            const credit = (tx.amount as number) > 0;
            return (
              <div key={tx.id as number} style={{ background: '#fff', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 12, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: credit ? 'var(--olive-100)' : 'var(--gold-bg)', color: credit ? 'var(--olive-700)' : '#9A7426', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={credit ? 'coins' : 'download'} size={19} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{tx.title as string}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-4)', marginTop: 2 }}>{tx.date as string}</div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 800, color: credit ? 'var(--olive-700)' : 'var(--ink)' }}>
                  {credit ? '+' : '−'}{faDigits(Math.abs((tx.amount as number) || 0))}
                </span>
              </div>
            );
          })}
          {txList.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>تراکنشی نیست</div>}
        </div>
      )}
    </div>
  );
}
