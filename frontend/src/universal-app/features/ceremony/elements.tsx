"use client";

// اجزای مشترک صفحات «خدمات حضوری قرآنی» — قالب‌ها از زبان بصری
// LearnerDispatchScreen/TeacherDispatchScreen کپی شده‌اند (تراشه، کارت وضعیت،
// پیکر جلالی و پخش‌کننده نمونهٔ صوتی).

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { formatJalaliDate, formatJalaliDateTime } from "../../ui/jalali";
import { Icon } from "../../ui/Icon";
import { colors, radii, spacing, typography } from "../../ui/theme";
import { toFaDigits } from "../../ui/persian";
import type { IconName } from "../../../components/Icon";
import {
  jalaliDayLabel,
  upcomingJalaliDays,
  type WhenValue,
} from "./schedule";
import type {
  CeremonyAudience,
  CeremonyBookingStatus,
  CeremonyCall,
  CeremonyCallStatus,
  CeremonyOfferStatus,
  SampleView,
} from "./types";

const numberFormatter = new Intl.NumberFormat("fa-IR");
const fullFormatter = new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 });

/** عدد با ارقام فارسی (پیش‌فرض یک رقم اعشار). */
export function fa(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat("fa-IR", { maximumFractionDigits }).format(value);
}

/** مبلغ کامل با جداکننده: «۱٬۲۵۰٬۰۰۰ تومان» */
export function formatAmountFull(amount: number): string {
  return `${fullFormatter.format(Math.max(0, Math.round(amount)))} تومان`;
}

/** مبلغ خوانا: «۱۱۵ هزار تومان» / «۲ میلیون تومان» */
export function formatToman(amount: number): string {
  const safe = Math.max(0, Math.round(amount));
  if (safe >= 1_000_000) return `${fa(safe / 1_000_000)} میلیون تومان`;
  if (safe >= 1_000) return `${fa(Math.round(safe / 1_000))} هزار تومان`;
  return `${fa(safe)} تومان`;
}

/** بازهٔ بودجه: «از ۱ میلیون تا ۲ میلیون تومان» */
export function formatBudgetRange(min: number, max: number): string {
  if (min > 0 && max > 0) return `${formatToman(min)} تا ${formatToman(max)}`;
  if (max > 0) return `تا ${formatToman(max)}`;
  if (min > 0) return `از ${formatToman(min)}`;
  return "توافقی";
}

/* ─────────────────────────  تراشه‌ها و وضعیت‌ها  ───────────────────────── */

export const chipStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11.5,
  color: colors.inkSecondary,
  background: colors.sand100,
  border: `1px solid ${colors.sand200}`,
  borderRadius: 999,
  padding: "3px 9px",
  whiteSpace: "nowrap",
};

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  borderRadius: 14,
  border: `1px solid ${colors.sand200}`,
  background: colors.surface,
  color: colors.ink,
  fontSize: 13.5,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

type Tone = { label: string; fg: string; bg: string };

export const callStatusMeta: Record<CeremonyCallStatus, Tone> = {
  searching: { label: "در انتظار پذیرش", fg: colors.goldDark, bg: colors.goldBackground },
  assigned: { label: "پذیرش شد", fg: colors.olive700, bg: colors.olive100 },
  in_progress: { label: "در حال اجرا", fg: colors.olive800, bg: colors.olive50 },
  completed: { label: "برگزار شد", fg: colors.inkMuted, bg: colors.sand100 },
  canceled: { label: "لغو شده", fg: colors.danger, bg: colors.dangerBackground },
  expired: { label: "منقضی شده", fg: colors.inkMuted, bg: colors.sand100 },
};

export const bookingStatusMeta: Record<CeremonyBookingStatus, Tone> = {
  deposit_pending: { label: "در انتظار ودیعه", fg: colors.goldDark, bg: colors.goldBackground },
  deposit_paid: { label: "ودیعه پرداخت شد", fg: colors.olive700, bg: colors.olive100 },
  settled: { label: "تسویه شد", fg: colors.olive800, bg: colors.successBackground },
  cancelled: { label: "لغو شد", fg: colors.danger, bg: colors.dangerBackground },
};

export const offerStatusMeta: Record<CeremonyOfferStatus, Tone> = {
  waiting: { label: "در انتظار انتخاب", fg: colors.goldDark, bg: colors.goldBackground },
  accepted: { label: "پذیرش ثبت شد", fg: colors.olive700, bg: colors.olive100 },
  declined: { label: "رد شده", fg: colors.danger, bg: colors.dangerBackground },
  released: { label: "کنار گذاشته شده", fg: colors.inkMuted, bg: colors.sand100 },
  chosen: { label: "انتخاب شد", fg: colors.olive800, bg: colors.successBackground },
};

export const audienceMeta: Record<CeremonyAudience, string> = {
  both: "همه",
  brothers: "برادران",
  sisters: "خواهران",
};

export function ToneChip({ tone }: { tone: Tone }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 26,
        padding: "3px 10px",
        borderRadius: radii.pill,
        color: tone.fg,
        background: tone.bg,
        fontSize: 11.5,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: "50%", background: tone.fg }} />
      {tone.label}
    </span>
  );
}

/** آیکون موضوع — آیکون‌های ناشناخته به «کتاب» برمی‌گردند. */
export function TopicIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  const known = new Set<IconName>([
    "book", "mic", "quran", "star", "headphones", "award", "sparkle",
    "doc", "heart", "users", "grid", "list", "trending", "refresh",
    "calendar", "bell",
  ]);
  return <Icon name={known.has(icon as IconName) ? (icon as IconName) : "book"} size={size} />;
}

/* ─────────────────────────  زمان مراسم  ───────────────────────── */

export function ceremonyWhenLabel(call: Pick<CeremonyCall, "scheduled_at">): string {
  if (!call.scheduled_at) return "زمان اعلام نشده";
  return `📅 ${formatJalaliDateTime(call.scheduled_at, { withWeekday: true })}`;
}

/* ─────────────────────────  پیکر جلالی تاریخ/ساعت  ───────────────────────── */

const MINUTE_STEPS = [0, 15, 30, 45];

/**
 * پیکر تاریخ شمسی + ساعت — همان زبان بصری ریل تاریخ‌های LearnerBookingScreen
 * (چیپ‌های افقی روز + انتخاب ساعت). خروجیِ نهایی با tehranWallToRfc3339 به
 * UTC تبدیل می‌شود.
 */
export function JalaliWhenPicker({
  value,
  onChange,
  label = "تاریخ و ساعت مراسم",
}: {
  value: WhenValue;
  onChange: (next: WhenValue) => void;
  label?: string;
}) {
  const days = useMemo(() => upcomingJalaliDays(45), []);
  return (
    <div style={{ display: "grid", gap: spacing.md }}>
      <strong style={{ fontSize: 13.5, color: colors.ink, display: "block" }}>{label}</strong>
      <div className="vodda-scroll-rail" style={{ display: "flex", gap: spacing.sm, overflowX: "auto", paddingBottom: spacing.xs }}>
        {days.map((day) => {
          const selected = value.localDate === day.localDate;
          return (
            <button
              key={day.localDate}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ ...value, localDate: day.localDate })}
              style={{
                flex: "0 0 auto",
                width: 102,
                minHeight: 76,
                padding: "10px 8px",
                color: selected ? colors.surface : colors.inkSecondary,
                background: selected ? colors.olive600 : colors.sand50,
                border: `1px solid ${selected ? colors.olive600 : colors.sand200}`,
                borderRadius: 15,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                ...typography.bodySmall,
              }}
            >
              <strong style={{ display: "block", fontSize: 12, fontWeight: 700 }}>{day.weekday}</strong>
              <span style={{ display: "block", marginTop: 4, opacity: 0.82, fontSize: 10.5 }}>
                {jalaliDayLabel(day.localDate)}
              </span>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
        <select
          value={value.hh}
          onChange={(event) => onChange({ ...value, hh: Number(event.target.value) })}
          aria-label="ساعت مراسم"
          style={{ ...inputStyle, minHeight: 46, flex: 1, appearance: "auto" }}
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <option key={hour} value={hour}>{toFaDigits(String(hour).padStart(2, "0"))}</option>
          ))}
        </select>
        <span aria-hidden="true" style={{ color: colors.inkMuted, fontWeight: 800 }}>:</span>
        <select
          value={value.mm}
          onChange={(event) => onChange({ ...value, mm: Number(event.target.value) })}
          aria-label="دقیقهٔ مراسم"
          style={{ ...inputStyle, minHeight: 46, flex: 1, appearance: "auto" }}
        >
          {MINUTE_STEPS.map((minute) => (
            <option key={minute} value={minute}>{toFaDigits(String(minute).padStart(2, "0"))}</option>
          ))}
        </select>
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.8 }}>
        زمان مراسم به وقت رسمی ایران (تهران) است؛ تاریخ انتخابی: {formatJalaliDate(value.localDate)}
      </p>
    </div>
  );
}

/* ─────────────────────────  نمونهٔ صوتی  ───────────────────────── */

export function SampleAudioList({ samples, compact = false }: { samples: SampleView[]; compact?: boolean }) {
  if (samples.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: spacing.sm }}>
      {samples.map((sample) => (
        <div
          key={sample.id}
          style={{
            display: "grid",
            gap: 6,
            padding: compact ? "8px 10px" : "10px 12px",
            background: colors.sand50,
            border: `1px solid ${colors.sand200}`,
            borderRadius: 14,
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: colors.inkSecondary }}>
            <Icon name="headphones" size={14} style={{ color: colors.olive600, flex: "0 0 auto" }} />
            {sample.title || "نمونهٔ تلاوت"}
            {sample.length ? <span style={{ color: colors.inkFaint, fontWeight: 500 }}>· {toFaDigits(sample.length)}</span> : null}
          </span>
          {sample.url ? (
            <audio controls preload="none" src={sample.url} style={{ width: "100%", direction: "ltr", height: 36 }}>
              <track kind="captions" />
              مرورگر شما از پخش صوت پشتیبانی نمی‌کند.
            </audio>
          ) : null}
        </div>
      ))}
    </div>
  );
}
