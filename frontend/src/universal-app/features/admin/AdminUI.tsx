"use client";

/*
 * جعبه‌ابزار مشترک صفحه‌های مدیریت درون‌اپی — هم‌ارز AdminUI/PanelUI پنل وب
 * ولی با زبان طراحی اپ (کارت‌های مربعی، رنگ زیتونی/طلایی مات، RTL-first).
 */

import type { CSSProperties, ReactNode } from "react";
import { Card, EmptyState, Icon } from "../../ui";
import { colors, gradients, shadows, typography } from "../../ui";
import { useL } from "../../ui/appearance";
import { formatNumber } from "@/lib/datetime";

/* ── قالب‌بندی اعداد ── */

export function faNumber(value: number, maximumFractionDigits = 0) {
  return formatNumber(value, "fa", { maximumFractionDigits });
}

export function faCompact(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${faNumber(value / 1_000_000_000, 1)} میلیارد`;
  if (abs >= 1_000_000) return `${faNumber(value / 1_000_000, 1)} م`;
  if (abs >= 1_000) return `${faNumber(value / 1_000, 1)} هزار`;
  return faNumber(value);
}

export function faToman(value: number) {
  return `${formatNumber(value, "fa")} تومان`;
}

export function faDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function faDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
  } catch {
    return "—";
  }
}

/* ── رنگ وضعیت‌ها ── */

export type AdminTone = "gold" | "green" | "rose" | "info" | "muted" | "clay" | "olive";

const TONE_STYLE: Record<AdminTone, { ink: string; bg: string; border: string }> = {
  gold: { ink: "#8a5b16", bg: "#fdf3dd", border: "rgba(191,149,64,.45)" },
  green: { ink: "#2e8f5c", bg: "#e7f6ee", border: "rgba(58,167,109,.4)" },
  rose: { ink: "#a65151", bg: "#faeeee", border: "rgba(166,81,81,.35)" },
  info: { ink: "#3d6070", bg: "#edf3f5", border: "rgba(94,126,140,.4)" },
  muted: { ink: "#6f6a5b", bg: "#f4f0e7", border: "rgba(228,221,204,.9)" },
  clay: { ink: "#8a4f36", bg: "#f6e7df", border: "rgba(176,116,90,.4)" },
  olive: { ink: "#4c5a36", bg: "#f2f5ea", border: "rgba(114,131,80,.45)" },
};

export function toneOf(tone: AdminTone) {
  return TONE_STYLE[tone];
}

export function AdminBadge({ tone = "muted", children }: { tone?: AdminTone; children: ReactNode }) {
  const style = TONE_STYLE[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 9px",
        borderRadius: 999,
        background: style.bg,
        border: `1px solid ${style.border}`,
        color: style.ink,
        fontSize: 10,
        fontWeight: 800,
        whiteSpace: "nowrap",
        lineHeight: 1.7,
      }}
    >
      {children}
    </span>
  );
}

/* ── چیپ فیلتر ── */

export function AdminChip({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count?: number | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="vodda-tappable"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "7px 12px",
        borderRadius: 999,
        border: active ? `1.5px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
        background: active ? colors.olive50 : colors.surface,
        color: active ? colors.olive700 : colors.inkMuted,
        fontSize: 11.5,
        fontWeight: 800,
        fontFamily: typography.fontFamily,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {typeof count === "number" && count > 0 ? (
        <span
          style={{
            minWidth: 18,
            padding: "1px 5px",
            borderRadius: 999,
            background: active ? colors.olive600 : colors.sand150,
            color: active ? "#fffaf0" : colors.inkMuted,
            fontSize: 9.5,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          {faNumber(count)}
        </span>
      ) : null}
    </button>
  );
}

/* ── کاشی آمار ── */

export type AdminTileIcon =
  | "user" | "users" | "award" | "clock" | "calendar" | "checkCircle" | "coins"
  | "trending" | "wallet" | "star" | "shield" | "book" | "message" | "bell"
  | "settings" | "download" | "doc" | "grid" | "filter" | "sparkle" | "gift"
  | "edit" | "headphones" | "trash" | "camera" | "mic" | "quran" | "refresh" | "search" | "x" | "check";

export function AdminTile({
  icon,
  label,
  value,
  hint,
  tone = "olive",
}: {
  icon: AdminTileIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: "olive" | "gold" | "info" | "clay" | "rose";
}) {
  const toneInk = tone === "gold" ? colors.goldDark : tone === "info" ? colors.info : tone === "clay" ? "#8a4f36" : tone === "rose" ? colors.danger : colors.olive700;
  return (
    <span
      className="vodda-card"
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 6,
        padding: "13px 8px",
        borderRadius: 16,
        background: colors.surface,
        border: `1px solid ${colors.sand150}`,
        boxShadow: shadows.xs,
        minWidth: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: gradients.soft,
          border: `1px solid ${colors.olive100}`,
          color: toneInk,
        }}
      >
        <Icon name={icon} size={17} />
      </span>
      <strong style={{ fontSize: 16, fontWeight: 900, color: colors.ink, lineHeight: 1.2, textAlign: "center", wordBreak: "break-word" }}>{value}</strong>
      <span style={{ fontSize: 9.5, fontWeight: 700, color: colors.inkMuted, textAlign: "center", lineHeight: 1.4 }}>{label}</span>
      {hint ? <span style={{ fontSize: 9, fontWeight: 600, color: colors.inkFaint, textAlign: "center", lineHeight: 1.5 }}>{hint}</span> : null}
    </span>
  );
}

/* ── ردیف کلید/مقدار برای شیت جزئیات ── */

export function AdminKeyValue({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, padding: "9px 0", borderBottom: `1px dashed ${colors.sand150}` }}>
      <span style={{ color: colors.inkMuted, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{label}</span>
      <span style={{ color: colors.ink, fontSize: 12, fontWeight: 700, textAlign: "inline-end" as unknown as CSSProperties["textAlign"], minWidth: 0, overflowWrap: "anywhere" }}>{children}</span>
    </div>
  );
}

/* ── کلید سوییچ ── */

export function AdminToggle({
  checked,
  disabled,
  onLabel = "روشن",
  offLabel = "خاموش",
  onToggle,
}: {
  checked: boolean;
  disabled?: boolean;
  onLabel?: string;
  offLabel?: string;
  onToggle: () => void;
}) {
  const L = useL();
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={onToggle}
        className="vodda-tappable"
        style={{
          width: 44,
          height: 25,
          borderRadius: 999,
          border: 0,
          cursor: disabled ? "wait" : "pointer",
          background: checked ? colors.olive600 : colors.sand200,
          position: "relative",
          transition: "background .18s ease",
          flexShrink: 0,
          opacity: disabled ? 0.7 : 1,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            insetInlineStart: checked ? 22 : 3,
            width: 19,
            height: 19,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,.2)",
            transition: "inset-inline-start .18s ease",
          }}
        />
      </button>
      <small style={{ color: colors.inkMuted, fontSize: 10.5, fontWeight: 700 }}>{L(checked ? onLabel : offLabel)}</small>
    </span>
  );
}

/* ── صفحه‌بندی سبک «بیشتر» ── */

export function AdminLoadMore({
  total,
  shown,
  loading,
  onLoadMore,
}: {
  total: number;
  shown: number;
  loading: boolean;
  onLoadMore: () => void;
}) {
  const L = useL();
  if (shown >= total) {
    return total > 0 ? (
      <span style={{ display: "block", textAlign: "center", color: colors.inkFaint, fontSize: 10.5, fontWeight: 700, padding: "4px 0" }}>
        همهٔ {faNumber(total)} مورد نمایش داده شد
      </span>
    ) : null;
  }
  return (
    <button
      type="button"
      onClick={onLoadMore}
      disabled={loading}
      className="vodda-tappable"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        width: "100%",
        padding: "11px 12px",
        borderRadius: 14,
        border: `1px dashed ${colors.sand200}`,
        background: colors.surfaceSoft,
        color: colors.olive700,
        fontSize: 12,
        fontWeight: 800,
        fontFamily: typography.fontFamily,
        cursor: loading ? "wait" : "pointer",
        opacity: loading ? 0.7 : 1,
      }}
    >
      <Icon name="refresh" size={14} />
      {loading ? L("در حال دریافت…") : `نمایش موارد بیشتر (${faNumber(Math.max(0, total - shown))} باقی‌مانده)`}
    </button>
  );
}

/* ── حالت خالی/خطا ── */

export function AdminEmpty({ icon = "doc", title, description }: { icon?: "doc" | "users" | "calendar" | "star" | "wallet" | "book" | "message" | "shield" | "award" | "coins" | "checkCircle" | "headphones" | "sparkle"; title: string; description?: string }) {
  return (
    <EmptyState
      icon={<Icon name={icon} size={30} />}
      title={title}
      description={description}
    />
  );
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const L = useL();
  return (
    <span
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        padding: "10px 13px",
        borderRadius: 13,
        background: colors.dangerBackground,
        border: `1px solid rgba(166,81,81,.3)`,
        color: colors.danger,
        fontSize: 12,
        fontWeight: 700,
      }}
    >
      <span style={{ minWidth: 0 }}>{message}</span>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="vodda-tappable"
          style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, border: 0, background: "transparent", color: colors.danger, fontSize: 11.5, fontWeight: 800, cursor: "pointer", fontFamily: typography.fontFamily }}
        >
          <Icon name="refresh" size={13} />
          {L("تلاش دوباره")}
        </button>
      ) : null}
    </span>
  );
}

/* ── نمودارها (SVG سبک — بدون وابستگی بیرونی) ── */

export function TrendBars({ values, height = 34, tone = "olive" }: { values: number[]; height?: number; tone?: "olive" | "gold" }) {
  if (!values.length) return null;
  const max = Math.max(1, ...values);
  const fill = tone === "gold" ? colors.gold : colors.olive500;
  return (
    <svg viewBox={`0 0 ${values.length * 3} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} aria-hidden="true">
      {values.map((value, index) => {
        const h = Math.max(1, (value / max) * (height - 2));
        return <rect key={index} x={index * 3} y={height - h} width={2} height={h} rx={0.8} fill={fill} opacity={0.82} />;
      })}
    </svg>
  );
}

export type DayPoint = { label: string; value: number };

/** نمودار میلهٔ گروهی — هم‌ارز BarsChart پنل وب. */
export function DayBars({ data, secondary, height = 150 }: { data: DayPoint[]; secondary?: DayPoint[]; height?: number }) {
  const L = useL();
  if (!data.length) return null;
  const max = Math.max(1, ...data.map((point) => point.value), ...(secondary ?? []).map((point) => point.value));
  const slot = 100 / data.length;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} role="img" aria-label={L("نمودار روزانه")}>
        {data.map((point, index) => {
          const h = Math.max(point.value > 0 ? 1.5 : 0, (point.value / max) * (height - 14));
          const x = index * slot;
          const barWidth = secondary ? slot * 0.34 : slot * 0.55;
          return (
            <g key={index}>
              <rect x={secondary ? x + slot * 0.06 : x + slot * 0.22} y={height - 12 - h} width={barWidth} height={h} rx={0.8} fill={colors.olive500} opacity={0.9} />
              {secondary ? (
                <rect x={x + slot * 0.46} y={height - 12 - Math.max(secondary[index].value > 0 ? 1.5 : 0, (secondary[index].value / max) * (height - 14))} width={barWidth} height={Math.max(secondary[index].value > 0 ? 1.5 : 0, (secondary[index].value / max) * (height - 14))} rx={0.8} fill={colors.gold} opacity={0.9} />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", color: colors.inkFaint, fontSize: 8.5, fontWeight: 700 }}>
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/** نمودار سطحی — هم‌ارز AreaChart پنل وب. */
export function DayArea({ data, height = 150, tone = "olive" }: { data: DayPoint[]; height?: number; tone?: "olive" | "gold" }) {
  const L = useL();
  if (!data.length) return null;
  const max = Math.max(1, ...data.map((point) => point.value));
  const stroke = tone === "gold" ? colors.goldDark : colors.olive600;
  const fillTop = tone === "gold" ? "rgba(191,149,64,.30)" : "rgba(114,131,80,.30)";
  const points = data.map((point, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = height - 12 - (point.value / max) * (height - 20);
    return `${x},${y}`;
  });
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} role="img" aria-label={L("نمودار روند")}>
        <polygon points={`0,${height - 12} ${points.join(" ")} 100,${height - 12}`} fill={fillTop} />
        <polyline points={points.join(" ")} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", color: colors.inkFaint, fontSize: 8.5, fontWeight: 700 }}>
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

/* ── سربرگ بخش ── */

export function AdminSectionHead({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
        <strong style={{ fontSize: 14.5, fontWeight: 900, color: colors.ink }}>{title}</strong>
        {description ? <span style={{ fontSize: 10.5, fontWeight: 600, color: colors.inkMuted, lineHeight: 1.7 }}>{description}</span> : null}
      </div>
      {action}
    </div>
  );
}

/* ── کارت بخش ── */

export function AdminPanel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <Card style={{ display: "grid", gap: 10, padding: 14, minWidth: 0, ...style }}>{children}</Card>
  );
}
