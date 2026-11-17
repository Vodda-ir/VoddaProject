'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PanelButton,
  PanelEmpty,
  PanelMetric,
  PanelPageHeader,
  PanelStatus,
  panelInputStyle,
} from '@/components/panel/PanelUI';
import { api, type Withdrawal } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { digitsOnly, formatFaNumber, toFaDigits, toLatinDigits } from '@/lib/persian';
import { formatDateTime } from '@/lib/datetime';

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
    if (!window.confirm(`${formatFaNumber(numericAmount)} تومان برای برداشت رزرو شود؟`)) return;

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

  const pendingCount = withdrawals.filter((item) => item.status === 'pending').length;

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="تسویه درآمد"
        title="برداشت وجه"
        description="درخواست برداشت را ثبت کنید و وضعیت بررسی و پرداخت درخواست‌های قبلی را پیگیری کنید."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      <div className="ops-metric-grid" style={{ gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }}>
        <PanelMetric icon="wallet" label="موجودی قابل برداشت" value={loading ? '—' : `${formatFaNumber(wallet)} ت`} hint="موجودی فعلی" />
        <PanelMetric icon="clock" label="درخواست در انتظار" value={toFaDigits(pendingCount)} hint="هنوز تعیین تکلیف نشده" tone={pendingCount ? 'gold' : 'olive'} />
      </div>

      <div className="ops-two-column" style={{ alignItems: 'start' }}>
        <section className="ops-section-card">
          <div className="ops-section-head">
            <div>
              <h2>درخواست جدید</h2>
              <p>حداقل شماره کارت یا شبا لازم است. مبلغ تا زمان تعیین وضعیت رزرو می‌شود.</p>
            </div>
          </div>
          <div style={{ padding: 17 }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <label style={labelStyle}>مبلغ (تومان)<input inputMode="numeric" value={toFaDigits(amount)} onChange={(event) => setAmount(digitsOnly(event.target.value))} placeholder="مثلاً ۵۰۰۰۰۰" style={panelInputStyle} /></label>
              <label style={labelStyle}>شماره کارت<input inputMode="numeric" value={toFaDigits(card)} maxLength={16} onChange={(event) => setCard(digitsOnly(event.target.value, 16))} placeholder="۱۶ رقم، اختیاری" style={panelInputStyle} /></label>
              <label style={labelStyle}>شماره شبا<input dir="ltr" value={toFaDigits(sheba)} maxLength={26} onChange={(event) => setSheba(toLatinDigits(event.target.value).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 26))} placeholder="IR۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰۰" style={{ ...panelInputStyle, textAlign: 'left' }} /></label>
            </div>

            <div className="ops-inline-note" style={{ marginTop: 12 }}>
              ثبت درخواست به معنی انتقال بانکی نیست؛ درخواست پس از بررسی مدیر تعیین وضعیت می‌شود.
            </div>

            {error && <div className="ops-error" role="alert" style={{ marginTop: 12, marginBottom: 0 }}><span>{error}</span></div>}
            {success && <div role="status" style={{ marginTop: 12, padding: '11px 13px', borderRadius: 12, color: 'var(--olive-700)', background: 'var(--olive-100)', fontSize: 11.5 }}>{success}</div>}

            <div style={{ marginTop: 14 }}>
              <PanelButton tone="primary" disabled={saving || loading} onClick={() => void submit()}>
                {saving ? 'در حال ثبت…' : 'ثبت درخواست برداشت'}
              </PanelButton>
            </div>
          </div>
        </section>

        <section className="ops-data-surface">
          <div className="ops-data-head">
            <div>
              <strong>تاریخچه درخواست‌ها</strong>
              <span style={{ display: 'block', marginTop: 2 }}>{loading ? 'در حال دریافت…' : `${toFaDigits(withdrawals.length)} درخواست`}</span>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 42, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>در حال بارگذاری درخواست‌ها…</div>
          ) : withdrawals.length === 0 ? (
            <PanelEmpty icon="download" title="هنوز درخواست برداشتی ثبت نشده" />
          ) : (
            withdrawals.map((withdrawal) => (
              <article className="ops-row" key={withdrawal.id}>
                <div className="ops-row-main">
                  <div className="ops-row-title">
                    <strong>{formatFaNumber(withdrawal.amount)} تومان</strong>
                    <PanelStatus status={withdrawalTone(withdrawal.status)}>{withdrawalLabel(withdrawal.status)}</PanelStatus>
                  </div>
                  <div className="ops-row-sub">
                    <span dir="ltr">{toFaDigits(withdrawal.sheba || withdrawal.card || '—')}</span>
                  </div>
                  <div className="ops-row-meta">
                    <span>{formatDate(withdrawal.created_at)}</span>
                    <span>#{toFaDigits(withdrawal.id)}</span>
                  </div>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}

function withdrawalLabel(status: Withdrawal['status']) {
  if (status === 'paid') return 'پرداخت‌شده';
  if (status === 'rejected') return 'ردشده';
  return 'در انتظار';
}

function withdrawalTone(status: Withdrawal['status']): 'paid' | 'rejected' | 'pending' {
  if (status === 'paid') return 'paid';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : formatDateTime(date);
}

const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, color: 'var(--ink-3)', fontSize: 11.5, fontWeight: 700 };
