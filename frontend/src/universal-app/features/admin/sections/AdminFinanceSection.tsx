"use client";

/* گزارش مالی — هم‌ارز صفحهٔ ادمین/گزارش مالی پنل وب:
 * بازهٔ ۷/۱۴/۳۰/۹۰ روز، شاخص‌های شارژ/کارمزد/جریان جلسات و کاشی‌های دفتر مالی. */

import { useCallback, useEffect, useState } from "react";
import { usePlatform } from "../../../platform/context";
import { Icon, colors, typography } from "../../../ui";
import { useAppearance } from "../../../ui/appearance";
import { messageOf } from "../../../ui/errorMessage";
import { fetchAdminAnalytics, type AdminAnalytics } from "../api";
import {
  AdminChip,
  AdminEmpty,
  AdminError,
  AdminPanel,
  AdminSectionHead,
  AdminTile,
  DayArea,
  DayBars,
  faCompact,
  faNumber,
  faToman,
} from "../AdminUI";

type RangeKey = "7" | "14" | "30" | "90";
type ChartTab = "charge" | "commission" | "flows";

const RANGES: Array<[RangeKey, string]> = [
  ["7", "۷ روز"],
  ["14", "۱۴ روز"],
  ["30", "۳۰ روز"],
  ["90", "۹۰ روز"],
];

const TABS: Array<[ChartTab, string]> = [
  ["charge", "شارژ کیف پول"],
  ["commission", "کارمزد سامانه"],
  ["flows", "جریان جلسات"],
];

export function AdminFinanceSection() {
  const runtime = usePlatform();
  const { L } = useAppearance();

  const [range, setRange] = useState<RangeKey>("30");
  const [chartTab, setChartTab] = useState<ChartTab>("charge");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setAnalytics(await fetchAdminAnalytics(runtime, Number(range)));
    } catch (cause) {
      setError(messageOf(cause, L("داده‌های مالی دریافت نشد.")));
    } finally {
      setLoading(false);
    }
  }, [runtime, range, L]);

  useEffect(() => {
    void load();
  }, [load]);

  const series = analytics?.series ?? [];
  const finance = analytics?.finance;

  const sum = (key: "charge" | "commission" | "sessionsCreated" | "sessionsDone", from = 0) =>
    series.slice(from).reduce((acc, point) => acc + Number(point[key] || 0), 0);

  const chargeTotal = sum("charge");
  const commissionTotal = sum("commission");
  const half = Math.floor(series.length / 2);
  const commissionDelta = (() => {
    const current = sum("commission", half);
    const previous = sum("commission", 0) - current;
    if (previous <= 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  })();

  const chartMain = series.map((point) => ({
    label: point.date,
    value:
      chartTab === "charge" ? point.charge
        : chartTab === "commission" ? point.commission
          : point.sessionsCreated,
  }));
  const chartSecondary =
    chartTab === "flows" ? series.map((point) => ({ label: point.date, value: point.sessionsDone })) : undefined;

  const chartTotal = chartMain.reduce((sum, point) => sum + point.value, 0);
  const chartMax = Math.max(0, ...chartMain.map((point) => point.value));

  return (
    <div style={{ display: "grid", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {RANGES.map(([value, label]) => (
          <AdminChip key={value} active={range === value} label={L(label)} onClick={() => setRange(value)} />
        ))}
        <button
          type="button"
          onClick={() => void load()}
          className="vodda-tappable"
          aria-label={L("به‌روزرسانی")}
          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 999, border: `1px solid ${colors.sand200}`, background: colors.surface, color: colors.olive700, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: typography.fontFamily }}
        >
          <Icon name="refresh" size={13} />
          {L("به‌روزرسانی")}
        </button>
      </div>

      {error ? <AdminError message={error} onRetry={() => void load()} /> : null}

      {loading ? (
        <AdminPanel>
          <span className="vodda-skeleton" style={{ height: 130, borderRadius: 14, display: "block" }} />
        </AdminPanel>
      ) : analytics ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, minWidth: 0 }}>
            <AdminTile icon="wallet" label={`شارژ ${RANGES.find((item) => item[0] === range)?.[1] ?? ""}`} value={faToman(chargeTotal)} tone="info" hint={L("مجموع تاریخ: ") + faCompact(finance?.chargeVolume ?? 0)} />
            <AdminTile icon="coins" label={`کارمزد ${RANGES.find((item) => item[0] === range)?.[1] ?? ""}`} value={faToman(commissionTotal)} tone="gold" hint={commissionDelta !== null ? `${faNumber(commissionDelta)}٪ نسبت به نیمهٔ قبل` : L("مجموع تاریخ: ") + faCompact(finance?.commission ?? 0)} />
            <AdminTile icon="trending" label={L("درآمد تسویه‌شده استادان")} value={faCompact(finance?.earnings ?? 0)} />
            <AdminTile icon="users" label={L("تعهد کیف پول کاربران")} value={faCompact(finance?.walletLiability ?? 0)} tone="clay" />
            <AdminTile icon="download" label={L("برداشت‌های در صف")} value={faNumber(finance?.pendingWithdrawals ?? 0)} tone="rose" hint={faToman(finance?.pendingWithdrawalAmount ?? 0)} />
            <AdminTile icon="calendar" label={`جلسات ${RANGES.find((item) => item[0] === range)?.[1] ?? ""}`} value={faNumber(sum("sessionsCreated"))} hint={`${faNumber(sum("sessionsDone"))} جلسه برگزارشده`} />
          </div>

          <AdminPanel>
            <AdminSectionHead title={L("روند مالی")} description={L("نمودار شاخص انتخابی در بازهٔ اخیر.")} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {TABS.map(([value, label]) => (
                <AdminChip key={value} active={chartTab === value} label={L(label)} onClick={() => setChartTab(value)} />
              ))}
            </div>
            {chartTab === "flows" ? (
              <DayBars data={chartMain} secondary={chartSecondary} height={160} />
            ) : (
              <DayArea data={chartMain} height={160} tone={chartTab === "commission" ? "gold" : "olive"} />
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ color: colors.inkMuted, fontSize: 10 }}>{L("جمع بازه")}</span>
                <strong style={{ color: colors.olive700, fontSize: 13 }}>{faNumber(chartTotal)}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ color: colors.inkMuted, fontSize: 10 }}>{L("میانگین روزانه")}</span>
                <strong style={{ color: colors.olive700, fontSize: 13 }}>{faCompact(chartMain.length ? Math.round(chartTotal / chartMain.length) : 0)}</strong>
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                <span style={{ color: colors.inkMuted, fontSize: 10 }}>{L("بیشترین روز")}</span>
                <strong style={{ color: colors.olive700, fontSize: 13 }}>{faCompact(chartMax)}</strong>
              </div>
            </div>
          </AdminPanel>
        </>
      ) : null}

      {!loading && series.length === 0 ? (
        <AdminEmpty icon="coins" title={L("داده مالی برای این بازه نیست")} description={L("با شارژ کیف پول و برگزاری جلسات، گزارش‌ها اینجا ساخته می‌شوند.")} />
      ) : null}

      <span style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 12, background: colors.surfaceSoft, color: colors.inkMuted, fontSize: 10.5, fontWeight: 700, border: `1px solid ${colors.sand150}` }}>
        <Icon name="info" size={14} />
        {L("کارمزد سامانه از جلسات برگزارشده محاسبه می‌شود؛ ارقام این گزارش با دفتر مالی (تراکنش‌ها) سنجیده شده و شامل تراکنش‌های دستی تعدیل نیز هست.")}
      </span>
    </div>
  );
}
