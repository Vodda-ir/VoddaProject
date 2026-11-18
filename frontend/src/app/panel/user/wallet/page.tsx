'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { faDigits } from '@/components/PanelShell';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelSection,
} from '@/components/panel/PanelUI';
import { BarsChart } from '@/components/admin/charts';
import { SearchInput, exportCsv, FilterTabs } from '@/components/admin/AdminUI';
import { api, type LearnerAnalytics, type Transaction } from '@/lib/api';
import { payViaSamanGate } from '@/lib/saman-gate';
import { getToken } from '@/lib/auth';
import { formatFaNumber } from '@/lib/persian';

type TabKey = 'all' | 'in' | 'out';
type RangeKey = '7' | '14' | '30';

const TOPUP_PRESETS: Array<{ value: number; label: string }> = [
  { value: 50_000, label: '۵۰ هزار' },
  { value: 100_000, label: '۱۰۰ هزار' },
  { value: 250_000, label: '۲۵۰ هزار' },
  { value: 500_000, label: '۵۰۰ هزار' },
  { value: 1_000_000, label: '۱ میلیون' },
];
const TOPUP_MIN = 10_000;
const TOPUP_MAX = 100_000_000;

const TX_META: Record<string, { label: string; icon: 'coins' | 'download' | 'wallet' | 'x' | 'trending' | 'info' | 'video'; in: boolean }> = {
  charge: { label: 'شارژ کیف پول', icon: 'coins', in: true },
  session: { label: 'پرداخت جلسه', icon: 'video', in: false },
  earning: { label: 'درآمد جلسه', icon: 'trending', in: true },
  withdrawal: { label: 'برداشت', icon: 'download', in: false },
  commission: { label: 'کارمزد سامانه', icon: 'x', in: false },
  adjust: { label: 'اصلاحیه حساب', icon: 'info', in: true },
};

const RANGE_LABELS: Array<{ value: RangeKey; label: string }> = [
  { value: '7', label: '۷ روز' },
  { value: '14', label: '۱۴ روز' },
  { value: '30', label: '۳۰ روز' },
];

function txTime(iso: string): string {
  try {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(date);
    const time = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date);
    return `${day} · ${time}`;
  } catch {
    return '';
  }
}

export default function UserWalletPage() {
  const [analytics, setAnalytics] = useState<LearnerAnalytics | null>(null);
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');
  const [range, setRange] = useState<RangeKey>('14');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupBusy, setTopupBusy] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [toast, setToast] = useState<{ kind: 'success' | 'failed' | 'verify'; ref: string } | null>(null);
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [analyticsResponse, txResponse] = await Promise.all([
        api.meAnalytics(token, 30),
        api.transactions(token),
      ]);
      setAnalytics(analyticsResponse.data);
      setTxs(txResponse.data || []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'اطلاعات کیف پول دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  // Payment gateway round-trip result (Saman Sep redirects back with ?payment=).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success' || payment === 'failed' || payment === 'verify') {
      setToast({ kind: payment, ref: params.get('ref') || '' });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const wallet = Number(analytics?.wallet ?? 0);
  const totals = analytics?.totals;

  const filtered = useMemo(() => {
    const needle = query.trim();
    return txs.filter((tx) => {
      const credit = Number(tx.amount) >= 0;
      if (tab === 'in' && !credit) return false;
      if (tab === 'out' && credit) return false;
      if (!needle) return true;
      return (tx.title || TX_META[tx.type]?.label || '').includes(needle) || String(tx.amount).includes(needle);
    });
  }, [txs, tab, query]);

  const counts = useMemo(() => ({
    all: txs.length,
    in: txs.filter((tx) => Number(tx.amount) >= 0).length,
    out: txs.filter((tx) => Number(tx.amount) < 0).length,
  }), [txs]);

  const series = analytics?.series ?? [];
  const visible = useMemo(() => series.slice(-Number(range)), [series, range]);
  const chartData = visible.map((point) => ({ label: point.date, value: Number(point.charged || 0) }));
  const chartSecondary = visible.map((point) => ({ label: point.date, value: Number(point.spent || 0) }));
  const hasFlow = chartData.some((point) => point.value > 0) || chartSecondary.some((point) => point.value > 0);

  const parsedTopup = useMemo(() => {
    const digits = topupAmount.replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
  }, [topupAmount]);

  const startTopup = useCallback(async () => {
    if (!token || topupBusy) return;
    if (parsedTopup < TOPUP_MIN || parsedTopup > TOPUP_MAX) {
      setTopupError(`مبلغ باید بین ${formatFaNumber(TOPUP_MIN)} و ${formatFaNumber(TOPUP_MAX)} تومان باشد.`);
      return;
    }
    setTopupBusy(true);
    setTopupError('');
    try {
      const response = await api.walletTopup(token, parsedTopup);
      // پست فرم توکن به OnlinePG از مرورگر کاربر — دقیقاً مثل منافسه، در همان تب
      payViaSamanGate(response.data.token);
    } catch (cause) {
      setTopupError(cause instanceof Error ? cause.message : 'اتصال به درگاه پرداخت برقرار نشد.');
      setTopupBusy(false);
    }
  }, [token, topupBusy, parsedTopup]);

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="مالی من"
        title="کیف پول"
        description="موجودی، گردش مالی جلسات و تاریخچه کامل تراکنش‌های حساب شما."
        actions={<PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>}
      />

      {error && (
        <div className="ops-error" role="alert">
          <span>{error}</span>
          <PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton>
        </div>
      )}

      <section
        role="region"
        aria-label="موجودی کیف پول"
        className="wal-hero"
        style={{
          position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', marginBottom: 18,
          padding: '24px 26px', borderRadius: 22, color: '#fff',
          background: 'radial-gradient(120% 170% at 88% -18%, rgba(191,149,64,.4) 0%, rgba(191,149,64,0) 52%), linear-gradient(135deg, var(--olive-800) 0%, var(--olive-600) 74%, var(--olive-500) 100%)',
          boxShadow: '0 14px 34px rgba(46,54,34,.22)',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1, minWidth: 0 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.78)', background: 'rgba(255,255,255,.12)', padding: '4px 11px', borderRadius: 999 }}>
            <Icon name="wallet" size={13} /> موجودی قابل استفاده
          </span>
          <div style={{ marginTop: 10, fontSize: 'clamp(26px, 7vw, 34px)', fontWeight: 800, lineHeight: 1.2 }}>
            {loading ? '—' : `${formatFaNumber(wallet)}`}
            <span style={{ fontSize: 14, fontWeight: 600, marginRight: 7, opacity: .75 }}>تومان</span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, fontSize: 11.5, color: 'rgba(255,255,255,.78)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,.10)' }}><Icon name="coins" size={13} /> شارژ: {formatFaNumber(Number(totals?.charged_total ?? 0))} تومان</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,255,255,.10)' }}><Icon name="video" size={13} /> هزینه جلسات: {formatFaNumber(Number(totals?.spent_total ?? 0))} تومان</span>
          </div>
        </div>
        <div className="wal-hero-decor" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }} aria-hidden="true">
          <span style={{ width: 92, height: 58, borderRadius: 12, background: 'repeating-linear-gradient(45deg, rgba(255,255,255,.16) 0 7px, rgba(255,255,255,.05) 7px 14px)', border: '1px solid rgba(255,255,255,.25)' }} />
        </div>
      </section>

      <div role="note" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, borderRadius: 16, background: 'var(--gold-bg)', color: '#765918', fontSize: 13, lineHeight: 1.9, marginBottom: 18 }}>
        <Icon name="shield" size={19} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>پرداخت‌ها از طریق درگاه امن سامان‌سپ انجام می‌شود؛ اطلاعات کارت شما هرگز نزد وُدّا ذخیره نمی‌شود.</span>
      </div>

      {toast && (
        <div
          role="status"
          style={{
            display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between',
            padding: 14, borderRadius: 16, marginBottom: 18,
            background: toast.kind === 'success'
              ? 'var(--olive-100)'
              : toast.kind === 'verify'
                ? '#fdf6e7'
                : '#fdecec',
            color: toast.kind === 'success'
              ? 'var(--olive-800)'
              : toast.kind === 'verify'
                ? '#7a5b16'
                : '#8c2f39',
            border: `1px solid ${toast.kind === 'success'
              ? 'var(--olive-300)'
              : toast.kind === 'verify'
                ? '#ecd9a8'
                : '#f6c6cb'}`,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13, fontWeight: 700 }}>
            <Icon name={toast.kind === 'failed' ? 'x' : 'check'} size={17} />
            {toast.kind === 'success'
              ? 'پرداخت با موفقیت انجام شد و کیف پول شما شارژ شد.'
              : toast.kind === 'verify'
                ? 'پرداخت شما در حال بررسی بانک است؛ پس از تأیید نهایی، کیف پول شما شارژ می‌شود. رسید شما نزد پشتیبانی حفظ شده است.'
                : 'پرداخت ناموفق بود یا لغو شد؛ مبلغی از حساب شما کسر نشده است.'}
            {toast.ref && <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>· کد پیگیری: {faDigits(toast.ref)}</span>}
          </span>
          <button type="button" aria-label="بستن پیام" onClick={() => setToast(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 4 }}>
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <PanelSection
        title="شارژ کیف پول"
        description="مبلغ دلخواه را وارد کنید و از درگاه امن سامان‌سپ پرداخت کنید."
      >
        <div style={{ padding: '6px 18px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="adm-range" role="group" aria-label="مبالغ پیشنهادی">
            {TOPUP_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                data-active={parsedTopup === preset.value ? 'true' : undefined}
                onClick={() => { setTopupAmount(String(preset.value)); setTopupError(''); }}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'stretch', flexWrap: 'wrap' }}>
            <label style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
              <span className="sr-only">مبلغ شارژ (تومان)</span>
              <input
                inputMode="numeric"
                value={topupAmount ? faDigits(formatFaNumber(parsedTopup)) : ''}
                onChange={(event) => {
                  const digits = event.target.value.replace(/[^\d]/g, '');
                  setTopupAmount(digits ? String(Number(digits)) : '');
                  setTopupError('');
                }}
                placeholder="مثلاً ۱۵۰٬۰۰۰"
                aria-label="مبلغ شارژ (تومان)"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 13,
                  border: '1px solid var(--line, #e4e0d5)', background: '#fff',
                  fontSize: 15, fontWeight: 700, color: 'var(--ink, #3c4433)',
                  outline: 'none', textAlign: 'left',
                }}
              />
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 600, color: 'var(--ink-4, #9a968a)' }}>تومان</span>
            </label>
            <PanelButton icon="coins" onClick={() => void startTopup()} disabled={topupBusy}>
              {topupBusy ? 'در حال اتصال به درگاه…' : 'پرداخت با سامان‌سپ'}
            </PanelButton>
          </div>
          {topupError && (
            <div role="alert" style={{ fontSize: 12.5, color: '#8c2f39', background: '#fdecec', borderRadius: 12, padding: '9px 13px', fontWeight: 600 }}>
              {topupError}
            </div>
          )}
        </div>
      </PanelSection>

      <PanelSection
        title="گردش مالی"
        description="مقایسه روزانه شارژ کیف پول و هزینه جلسات."
        action={
          <div className="adm-range" role="group" aria-label="بازه زمانی">
            {RANGE_LABELS.map((item) => (
              <button key={item.value} type="button" data-active={range === item.value ? 'true' : undefined} onClick={() => setRange(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="adm-legend-inline" style={{ padding: '13px 18px 0' }}>
          <span><i style={{ background: 'var(--olive-600)' }} /> شارژ</span>
          <span><i style={{ background: 'var(--gold)' }} /> هزینه جلسات</span>
        </div>
        <div style={{ padding: '4px 12px 16px' }}>
          {loading ? (
            <div className="adm-skeleton" style={{ height: 180, borderRadius: 14 }} />
          ) : hasFlow ? (
            <BarsChart data={chartData} secondary={chartSecondary} height={186} />
          ) : (
            <PanelEmpty icon="coins" title="گردشی در این بازه ثبت نشده" description="پس از اولین شارژ یا رزرو، نمودار اینجا فعال می‌شود." />
          )}
        </div>
      </PanelSection>

      <section className="ops-section-card" style={{ marginTop: 14 }}>
        <div className="adm-toolbar">
          <FilterTabs
            ariaLabel="نوع تراکنش"
            items={[
              { value: 'all', label: 'همه' },
              { value: 'in', label: 'ورودی' },
              { value: 'out', label: 'خروجی' },
            ]}
            value={tab}
            onChange={setTab}
            counts={counts}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <SearchInput value={query} onChange={setQuery} placeholder="جستجو در تراکنش‌ها…" />
            <PanelButton
              icon="download"
              onClick={() => {
                if (!filtered.length) return;
                exportCsv(
                  'vodda-wallet-transactions',
                  ['شناسه', 'عنوان', 'نوع', 'مبلغ (تومان)', 'تاریخ'],
                  filtered.map((tx) => [tx.id, tx.title || TX_META[tx.type]?.label || '', TX_META[tx.type]?.label ?? tx.type, tx.amount, tx.created_at]),
                );
              }}
            >
              خروجی CSV
            </PanelButton>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 18, display: 'grid', gap: 10 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="adm-skeleton" style={{ height: 56, borderRadius: 14 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <PanelEmpty
            icon="wallet"
            title={query ? 'تراکنشی با این مشخصات پیدا نشد' : 'هنوز تراکنشی ثبت نشده است'}
            description={query ? 'عبارت دیگری را جستجو کنید.' : 'با اولین شارژ یا رزرو جلسه، گردش حساب شما اینجا نمایش داده می‌شود.'}
          />
        ) : (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 9, maxHeight: 560, overflowY: 'auto' }}>
            {filtered.map((tx) => {
              const amount = Number(tx.amount) || 0;
              const credit = amount >= 0;
              const meta = TX_META[tx.type] || TX_META.adjust;
              return (
                <article className="usr-tx-row" key={tx.id}>
                  <span className="adm-stat-icon" style={{ width: 40, height: 40, borderRadius: 12, '--tone-ink': credit ? 'var(--olive-700)' : '#8d6d1f', '--tone-bg': credit ? 'var(--olive-100)' : 'var(--gold-bg)' } as React.CSSProperties}>
                    <Icon name={meta.icon} size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{tx.title || meta.label}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--ink-4)', marginTop: 2 }}>
                      {meta.label} · {txTime(tx.created_at)}
                    </div>
                  </div>
                  <span className="usr-tx-amount" data-credit={credit} style={{ fontSize: 14, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {credit ? '+' : '−'}{faDigits(formatFaNumber(Math.abs(amount)))}
                  </span>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
