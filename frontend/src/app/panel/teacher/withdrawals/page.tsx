'use client';

import { useCallback, useEffect, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { api, type Withdrawal } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { digitsOnly, toFaDigits, toLatinDigits } from '@/lib/persian';

const statusLabel: Record<Withdrawal['status'], string> = { pending: 'در انتظار', paid: 'پرداخت‌شده', rejected: 'ردشده' };

export default function TeacherWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [wallet, setWallet] = useState(0);
  const [amount, setAmount] = useState('');
  const [card, setCard] = useState('');
  const [sheba, setSheba] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [meResponse, withdrawalResponse] = await Promise.all([api.me(token), api.teacherWithdrawals(token)]);
      setWallet(Number(meResponse.data.wallet) || 0);
      setWithdrawals(withdrawalResponse.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'درخواست‌های برداشت دریافت نشدند.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function submit() {
    if (!token || saving) return;
    const numericAmount = Number.parseInt(digitsOnly(amount), 10);
    const normalizedCard = digitsOnly(card, 16);
    const normalizedSheba = toLatinDigits(sheba).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!Number.isInteger(numericAmount) || numericAmount <= 0) return setError('مبلغ معتبر وارد کنید.');
    if (numericAmount > wallet) return setError('مبلغ درخواست از موجودی کیف پول بیشتر است.');
    if (!normalizedCard && !normalizedSheba) return setError('حداقل شماره کارت یا شبا را وارد کنید.');
    if (normalizedCard && normalizedCard.length !== 16) return setError('شماره کارت باید ۱۶ رقم باشد.');
    if (normalizedSheba && !/^IR\d{24}$/.test(normalizedSheba)) return setError('شماره شبا باید با IR شروع شود و ۲۴ رقم داشته باشد.');
    if (!window.confirm(`${faDigits(numericAmount)} تومان برای برداشت رزرو شود؟`)) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.requestTeacherWithdrawal(token, {
        amount: numericAmount,
        card: normalizedCard || undefined,
        sheba: normalizedSheba || undefined,
      });
      setWithdrawals((items) => [response.data, ...items]);
      setWallet((value) => Math.max(0, value - numericAmount));
      setAmount('');
      setCard('');
      setSheba('');
      setSuccess('درخواست برداشت ثبت شد و مبلغ تا تعیین وضعیت رزرو شده است.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ثبت درخواست برداشت انجام نشد.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ padding: 28 }}>
      <h1 style={{ fontSize: 21, fontWeight: 800, marginBottom: 4 }}>برداشت وجه</h1>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>موجودی قابل برداشت: <strong style={{ color: 'var(--olive-700)' }}>{faDigits(wallet)} تومان</strong></p>

      <section style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, marginBottom: 15 }}>درخواست جدید</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
          <label style={labelStyle}>مبلغ (تومان)<input inputMode="numeric" value={toFaDigits(amount)} onChange={(event) => setAmount(digitsOnly(event.target.value))} placeholder="مثلاً ۵۰۰۰۰۰" style={inputStyle} /></label>
          <label style={labelStyle}>شماره کارت<input inputMode="numeric" value={toFaDigits(card)} maxLength={16} onChange={(event) => setCard(digitsOnly(event.target.value, 16))} placeholder="۱۶ رقم، اختیاری" style={inputStyle} /></label>
          <label style={labelStyle}>شماره شبا<input dir="ltr" value={toFaDigits(sheba)} maxLength={26} onChange={(event) => setSheba(toLatinDigits(event.target.value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 26))} placeholder="IR۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰" style={{ ...inputStyle, textAlign: 'left' }} /></label>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.8, marginBottom: 14 }}>حداقل یکی از شماره کارت یا شبا الزامی است. ثبت درخواست به معنی انتقال بانکی نیست و مبلغ تا بررسی مدیر از موجودی کسر می‌شود.</p>
        {error && <div role="alert" style={{ padding: 11, borderRadius: 11, color: 'var(--rose)', background: 'var(--clay-bg)', marginBottom: 12 }}>{error}</div>}
        {success && <div role="status" style={{ padding: 11, borderRadius: 11, color: 'var(--olive-700)', background: 'var(--olive-100)', marginBottom: 12 }}>{success}</div>}
        <button type="button" disabled={saving || loading} onClick={submit} style={{ border: 0, borderRadius: 999, padding: '10px 20px', background: 'var(--olive-600)', color: '#fff', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving || loading ? .6 : 1 }}>{saving ? 'در حال ثبت…' : 'ثبت درخواست برداشت'}</button>
      </section>

      <h2 style={{ fontSize: 16, marginBottom: 14 }}>تاریخچهٔ درخواست‌ها</h2>
      {loading ? <div style={{ padding: 28, color: 'var(--ink-3)' }}>در حال بارگذاری…</div> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {withdrawals.map((withdrawal) => <article key={withdrawal.id} style={{ background: '#fff', borderRadius: 16, padding: 16, display: 'flex', alignItems: 'center', gap: 14, border: '1px solid var(--sand-150)', boxShadow: 'var(--sh-sm)', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 230px' }}><strong>{faDigits(withdrawal.amount)} تومان</strong><div dir="ltr" style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'right', marginTop: 4 }}>{toFaDigits(withdrawal.sheba || withdrawal.card || '—')}</div><time dateTime={withdrawal.created_at} style={{ display: 'block', fontSize: 12, color: 'var(--ink-4)', marginTop: 3 }}>{formatDate(withdrawal.created_at)}</time></div>
            <span style={statusStyle(withdrawal.status)}>{statusLabel[withdrawal.status]}</span>
          </article>)}
          {withdrawals.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-3)' }}>هنوز درخواست برداشتی ثبت نشده است.</div>}
        </div>
      )}
    </main>
  );
}

function formatDate(value: string) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(date); }
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--ink-3)' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 13px', borderRadius: 12, border: '1px solid var(--sand-200)', color: 'var(--ink)', background: '#fff' };
const statusStyle = (status: Withdrawal['status']): React.CSSProperties => ({ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, background: status === 'paid' ? 'var(--olive-100)' : status === 'rejected' ? 'var(--clay-bg)' : 'var(--gold-bg)', color: status === 'paid' ? 'var(--olive-700)' : status === 'rejected' ? 'var(--clay)' : 'var(--gold)' });
