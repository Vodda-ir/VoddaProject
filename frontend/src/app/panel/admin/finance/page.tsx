'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import {
  PanelButton,
  PanelEmpty,
  PanelPageHeader,
  PanelSection,
} from '@/components/panel/PanelUI';
import { AreaChart, BarsChart, faCompact, type Tone } from '@/components/admin/charts';
import { exportCsv, FilterTabs, StatCard } from '@/components/admin/AdminUI';
import { getToken } from '@/lib/auth';
import { formatFaNumber, toFaDigits } from '@/lib/persian';

type AnalyticsPoint = {
  date: string;
  new_users: number;
  new_teachers: number;
  sessions_created: number;
  sessions_done: number;
  charge: number;
  commission: number;
};

type Analytics = {
  days: number;
  series: AnalyticsPoint[];
  finance: {
    charge_volume: number;
    commission: number;
    earnings: number;
    wallet_liability: number;
    pending_withdrawals: number;
    pending_withdrawal_amount: number;
  };
};

type RangeKey = '7' | '14' | '30' | '90';
type ChartTab = 'charge' | 'commission' | 'flows';

const RANGE_LABELS: Array<{ value: RangeKey; label: string }> = [
  { value: '7', label: '۷ روز' },
  { value: '14', label: '۱۴ روز' },
  { value: '30', label: '۳۰ روز' },
  { value: '90', label: '۹۰ روز' },
];

const TABS: Array<{ value: ChartTab; label: string }> = [
  { value: 'charge', label: 'شارژ کیف پول' },
  { value: 'commission', label: 'کارمزد سامانه' },
  { value: 'flows', label: 'جریان جلسات' },
];

export default function AdminFinance() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [range, setRange] = useState<RangeKey>('30');
  const [chartTab, setChartTab] = useState<ChartTab>('charge');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const token = getToken();

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/backend/admin/analytics?days=${range}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'داده‌های مالی دریافت نشد.');
      setAnalytics(body.data as Analytics);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'داده‌های مالی دریافت نشد.');
    } finally {
      setLoading(false);
    }
  }, [token, range]);

  useEffect(() => { void load(); }, [load]);

  const series = analytics?.series ?? [];
  const finance = analytics?.finance;

  const sum = (key: keyof AnalyticsPoint, from = 0) =>
    series.slice(from).reduce((acc, point) => acc + Number(point[key] || 0), 0);

  const chargeTotal = sum('charge');
  const commissionTotal = sum('commission');
  const half = Math.floor(series.length / 2);
  const commissionDelta = (() => {
    const current = sum('commission', half);
    const previous = sum('commission', 0) - current;
    if (previous <= 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  })();

  const chartMain = series.map((point) => ({
    label: point.date,
    value:
      chartTab === 'charge' ? Number(point.charge || 0)
        : chartTab === 'commission' ? Number(point.commission || 0)
          : Number(point.sessions_created || 0),
  }));
  const chartSecondary =
    chartTab === 'flows'
      ? series.map((point) => ({ label: point.date, value: Number(point.sessions_done || 0) }))
      : undefined;

  const tone: Tone = chartTab === 'commission' ? 'gold' : 'olive';

  return (
    <main className="ops-page">
      <PanelPageHeader
        eyebrow="تصمیم‌های مالی با داده واقعی"
        title="گزارش مالی"
        description="روند شارژ کیف پول، کارمزد سامانه، درآمد استادان و تعهد کیف پول — همه از دفتر مالی سامانه."
        actions={
          <>
            <PanelButton
              icon="download"
              onClick={() =>
                exportCsv(
                  `vodda-finance-${range}d`,
                  ['تاریخ', 'شارژ (تومان)', 'کارمزد (تومان)', 'جلسات ایجادشده', 'جلسات برگزارشده'],
                  series.map((point) => [point.date, point.charge, point.commission, point.sessions_created, point.sessions_done]),
                )
              }
            >
              خروجی CSV
            </PanelButton>
            <PanelButton icon="refresh" onClick={() => void load()}>به‌روزرسانی</PanelButton>
          </>
        }
      />

      {error && <div className="ops-error" role="alert"><span>{error}</span><PanelButton onClick={() => void load()}>تلاش دوباره</PanelButton></div>}

      <div className="adm-stat-grid">
        <StatCard
          icon="wallet"
          tone="info"
          label={`شارژ ${range} روز`}
          value={loading ? '—' : `${formatFaNumber(chargeTotal)} ت`}
          hint={`مجموع تاریخ: ${faCompact(Number(finance?.charge_volume ?? 0))} تومان`}
          trend={series.map((point) => Number(point.charge || 0))}
        />
        <StatCard
          icon="coins"
          tone="gold"
          label={`کارمزد ${range} روز`}
          value={loading ? '—' : `${formatFaNumber(commissionTotal)} ت`}
          delta={commissionDelta}
          hint={`مجموع تاریخ: ${faCompact(Number(finance?.commission ?? 0))} تومان`}
          trend={series.map((point) => Number(point.commission || 0))}
        />
        <StatCard
          icon="trending"
          tone="olive"
          label="درآمد تسویه‌شده استادان"
          value={loading ? '—' : faCompact(Number(finance?.earnings ?? 0))}
          hint="مجموع پرداخت‌های ثبت‌شده به استادان"
        />
        <StatCard
          icon="users"
          tone="clay"
          label="تعهد کیف پول کاربران"
          value={loading ? '—' : faCompact(Number(finance?.wallet_liability ?? 0))}
          hint="موجودی قابل برداشت همه حساب‌ها"
        />
        <StatCard
          icon="download"
          tone="rose"
          label="برداشت‌های در صف"
          value={loading ? '—' : toFaDigits(finance?.pending_withdrawals ?? 0)}
          hint={`${formatFaNumber(Number(finance?.pending_withdrawal_amount || 0))} تومان در انتظار پرداخت`}
        />
        <StatCard
          icon="calendar"
          tone="olive"
          label={`جلسات ${range} روز`}
          value={loading ? '—' : toFaDigits(sum('sessions_created'))}
          hint={`${toFaDigits(sum('sessions_done'))} جلسه برگزارشده`}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <PanelSection
          title="روند مالی"
          description="نمودار شاخص انتخابی در بازه اخیر."
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
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, padding: '13px 18px 0' }}>
            <FilterTabs ariaLabel="شاخص مالی" items={TABS} value={chartTab} onChange={setChartTab} />
            <div className="adm-legend-inline">
              <span>
                <i style={{ background: chartTab === 'commission' ? 'var(--gold)' : 'var(--olive-600)' }} />
                {chartTab === 'charge' ? 'شارژ' : chartTab === 'commission' ? 'کارمزد' : 'ایجاد جلسه'}
              </span>
              {chartSecondary && (
                <span><i style={{ background: 'var(--gold)' }} />برگزارشده</span>
              )}
            </div>
          </div>
          <div style={{ padding: '4px 12px 10px' }}>
            {loading ? (
              <div className="adm-skeleton" style={{ height: 220, borderRadius: 14 }} />
            ) : chartTab === 'flows' ? (
              <BarsChart data={chartMain} secondary={chartSecondary} height={230} />
            ) : (
              <AreaChart data={chartMain} height={230} tone={tone} />
            )}
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', padding: '0 18px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>جمع بازه</span>
              <strong style={{ color: 'var(--olive-700)', fontSize: 13 }}>{formatFaNumber(chartMain.reduce((sum2, point) => sum2 + point.value, 0))}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>میانگین روزانه</span>
              <strong style={{ color: 'var(--olive-700)', fontSize: 13 }}>{faCompact(chartMain.length ? Math.round(chartMain.reduce((sum2, point) => sum2 + point.value, 0) / chartMain.length) : 0)}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
              <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>بیشترین روز</span>
              <strong style={{ color: 'var(--olive-700)', fontSize: 13 }}>{faCompact(Math.max(0, ...chartMain.map((point) => point.value)))}</strong>
            </div>
          </div>
        </PanelSection>
      </div>

      {!loading && series.length === 0 && (
        <div style={{ marginTop: 14 }}>
          <PanelEmpty icon="coins" title="داده مالی برای این بازه نیست" description="با شارژ کیف پول و برگزاری جلسات، گزارش‌ها اینجا ساخته می‌شوند." />
        </div>
      )}

      <div className="ops-inline-note" style={{ marginTop: 14 }}>
        <Icon name="info" size={16} />
        <span>کارمزد سامانه از جلسات برگزارشده محاسبه می‌شود؛ ارقام این گزارش با دفتر مالی (تراکنش‌ها) سنجیده شده و شامل تراکنش‌های دستی تعدیل نیز هست.</span>
      </div>
    </main>
  );
}
