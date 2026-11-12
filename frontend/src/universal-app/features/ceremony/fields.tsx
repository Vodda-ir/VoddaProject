"use client";

// کیت «فیلدهای هوشمند» خدمات حضوری قرآنی — اصل طراحی: انتخاب به‌جای تایپ.
//
// همهٔ فیلدهای متنیِ پرتکرار به انتخاب‌گر تبدیل شده‌اند: شهرهای پرتردد،
// موقعیت‌یاب دستگاه (GPS + معکوس‌یابی نشانی + پیش‌نمایش نقشه)، بازه‌های
// پیشنهادی بودجه، مبلغ‌های پیشنهادی، شمارنده‌های لمسی، ساعت‌های پیشنهادی
// نماز-محور و قالب‌های آمادهٔ یادداشت. هر فیلد همیشه ورودی دستی هم دارد تا
// در نبود GPS یا برای حالت‌های خاص، مسیر جایگزین وجود داشته باشد.

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Icon, colors, spacing, typography } from "../../ui";
import { digitsOnly, toFaDigits } from "../../ui/persian";
import { formatAmountFull, formatBudgetRange, formatToman, inputStyle } from "./elements";

/* ─────────────────────────  داده‌های پرتردد  ───────────────────────── */

export const POPULAR_CITIES: readonly string[] = [
  "تهران", "کرج", "مشهد", "قم", "اصفهان", "شیراز",
  "تبریز", "اهواز", "رشت", "یزد", "کرمان", "همدان",
];

const VENUE_TYPES: readonly string[] = ["مسجد", "حسینیه", "مصلی", "سالن و تالار", "خانه", "فضای باز"];

const TIME_PRESETS: ReadonlyArray<{ label: string; hh: number; mm: number }> = [
  { label: "صبح · ۱۰:۰۰", hh: 10, mm: 0 },
  { label: "ظهر · ۱۳:۰۰", hh: 13, mm: 0 },
  { label: "عصر · ۱۷:۰۰", hh: 17, mm: 0 },
  { label: "پس از مغرب · ۱۹:۰۰", hh: 19, mm: 0 },
  { label: "پس از عشا · ۲۱:۰۰", hh: 21, mm: 0 },
];

const NOTE_TEMPLATES: ReadonlyArray<{ chip: string; text: string }> = [
  { chip: "تلاوت یک جزء", text: "تلاوت یک جزء کامل مدنظر است" },
  { chip: "ادعای پایانی", text: "ادعای پایانی مراسم هم اجرا شود" },
  { chip: "تواشیح و همخوانی", text: "برنامهٔ تواشیح و همخوانی هم دارند" },
  { chip: "نیاز به مداحی", text: "نیاز به مداحی هم داریم" },
  { chip: "میکروفن و صوت آماده", text: "سیستم صوتی و میکروفن آماده است" },
];

/* ─────────────────────────  قالب‌های پایه  ───────────────────────── */

function FieldShell({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm }}>
        <strong style={{ fontSize: 13.5, color: colors.ink, display: "block" }}>{label}</strong>
        {hint ? <span style={{ fontSize: 11, color: colors.inkFaint, textAlign: "left" }}>{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** تراشهٔ انتخاب — پایهٔ همهٔ انتخاب‌گرهای این کیت؛ صادرشده برای استفادهٔ مستقیم. */
export function Chip({
  active,
  onClick,
  children,
  accent = "olive",
  ariaPressed,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accent?: "olive" | "gold";
  ariaPressed?: boolean;
}) {
  const pressed = ariaPressed ?? active;
  const tone: CSSProperties = active
    ? accent === "gold"
      ? { background: colors.goldBackground, borderColor: colors.goldSoft, color: colors.goldDark }
      : { background: colors.olive600, borderColor: colors.olive600, color: colors.surface }
    : { background: colors.surface, borderColor: colors.sand200, color: colors.inkSecondary };
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        minHeight: 40,
        padding: "8px 13px",
        borderRadius: 999,
        fontSize: 12.5,
        fontWeight: 700,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        whiteSpace: "nowrap",
        border: `1px solid ${tone.borderColor}`,
        ...tone,
      }}
    >
      {active && accent === "gold" ? <Icon name="check" size={13} stroke={2.6} /> : null}
      {children}
    </button>
  );
}

/* ─────────────────────────  ورودی مبلغ  ───────────────────────── */

export function AmountInput({
  value,
  onChange,
  ariaLabel,
  placeholder = "مثلاً ۱۵۰۰۰۰۰",
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
  placeholder?: string;
}) {
  const numeric = Number(digitsOnly(value) || 0);
  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          inputMode="numeric"
          value={toFaDigits(value)}
          onChange={(event) => onChange(digitsOnly(event.target.value, 12))}
          placeholder={placeholder}
          style={{ ...inputStyle, minHeight: 46, fontWeight: 700, paddingInlineEnd: 56 }}
          aria-label={ariaLabel}
        />
        <span
          aria-hidden="true"
          style={{ position: "absolute", insetInlineEnd: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11.5, color: colors.inkFaint }}
        >
          تومان
        </span>
      </div>
      {numeric >= 1000 ? (
        <span style={{ display: "block", marginTop: 4, fontSize: 11, color: colors.olive700, fontVariantNumeric: "tabular-nums" }}>
          {formatAmountFull(numeric)}
        </span>
      ) : null}
    </div>
  );
}

/** مبلغ با پیشنهادهای آماده — انتخاب سریع + ورودی دستی. */
export function AmountPicker({
  label,
  hint,
  value,
  onChange,
  presets,
  ariaLabel,
  emptyHint,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  presets: readonly number[];
  ariaLabel: string;
  emptyHint?: string;
}) {
  const numeric = Number(digitsOnly(value) || 0);
  const uniquePresets = useMemo(
    () => [...new Set(presets.filter((preset) => preset > 0))].sort((a, b) => a - b),
    [presets],
  );
  return (
    <FieldShell label={label} hint={hint}>
      {uniquePresets.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
          {uniquePresets.map((preset) => (
            <Chip
              key={preset}
              accent="gold"
              active={numeric === preset}
              onClick={() => onChange(numeric === preset ? "" : String(preset))}
            >
              {formatToman(preset)}
            </Chip>
          ))}
        </div>
      ) : null}
      <AmountInput value={value} onChange={onChange} ariaLabel={ariaLabel} />
      {!value && emptyHint ? (
        <span style={{ display: "block", fontSize: 11, color: colors.inkFaint, lineHeight: 1.8 }}>{emptyHint}</span>
      ) : null}
    </FieldShell>
  );
}

/* ─────────────────────────  بازهٔ بودجهٔ مراسم  ───────────────────────── */

type BudgetTier = { key: string; label: string; sub: string; min: number; max: number };

const BUDGET_TIERS: readonly BudgetTier[] = [
  { key: "open", label: "توافقی", sub: "بدون کف و سقف بودجه", min: 0, max: 0 },
  { key: "t500", label: "تا ۵۰۰ هزار", sub: "سقف ۵۰۰ هزار تومان", min: 0, max: 500_000 },
  { key: "500-1m", label: "۵۰۰ تا ۱ میلیون", sub: "بازهٔ اقتصادی", min: 500_000, max: 1_000_000 },
  { key: "1-2m", label: "۱ تا ۲ میلیون", sub: "پرترددترین بازه", min: 1_000_000, max: 2_000_000 },
  { key: "2-3m", label: "۲ تا ۳ میلیون", sub: "اجرای ویژه", min: 2_000_000, max: 3_000_000 },
  { key: "3m+", label: "بالای ۳ میلیون", sub: "مجلس بزرگ", min: 3_000_000, max: 0 },
  { key: "custom", label: "بازهٔ دلخواه", sub: "تعیین دقیق کف و سقف", min: -1, max: -1 },
];

function activeBudgetKey(minValue: number, maxValue: number): string {
  for (const tier of BUDGET_TIERS) {
    if (tier.key === "custom") continue;
    if (tier.min === minValue && tier.max === maxValue) return tier.key;
  }
  return minValue > 0 || maxValue > 0 ? "custom" : "open";
}

/** بازهٔ حق‌الزحمهٔ فراخوان مراسم — کارت‌های پیشنهادی + بازهٔ دلخواه. */
export function PriceRangePicker({
  minValue,
  maxValue,
  onChange,
}: {
  minValue: number;
  maxValue: number;
  onChange: (next: { min: string; max: string }) => void;
}) {
  // بازهٔ دلخواه حتی با مقادیر خالی هم باید فعال بماند — پس علاوه بر تطبیق
  // مقادیر، یک وضعیت محلی هم نگه می‌داریم.
  const [customMode, setCustomMode] = useState(false);
  const activeKey = customMode ? "custom" : activeBudgetKey(minValue, maxValue);
  const select = (tier: BudgetTier) => {
    if (tier.key === "custom") {
      setCustomMode(true);
      onChange({ min: minValue > 0 ? String(minValue) : "", max: maxValue > 0 ? String(maxValue) : "" });
      return;
    }
    setCustomMode(false);
    onChange({ min: tier.min > 0 ? String(tier.min) : "", max: tier.max > 0 ? String(tier.max) : "" });
  };
  return (
    <FieldShell label="بودجهٔ پیشنهادی" hint="حق‌الزحمهٔ منصفانه برای قاریان">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.sm }}>
        {BUDGET_TIERS.map((tier) => {
          const active = activeKey === tier.key;
          return (
            <button
              key={tier.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => select(tier)}
              style={{
                display: "grid",
                gap: 3,
                textAlign: "right",
                padding: "11px 13px",
                borderRadius: 16,
                border: `1.5px solid ${active ? colors.goldSoft : colors.sand200}`,
                background: active ? colors.goldBackground : colors.surface,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
                boxShadow: active ? "0 5px 16px rgba(191,149,64,.16)" : "none",
              }}
            >
              <strong
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  color: active ? colors.goldDark : colors.ink,
                }}
              >
                {active ? (
                  <Icon name="checkCircle" size={15} style={{ color: colors.goldDark, flex: "0 0 auto" }} />
                ) : (
                  <Icon name="coins" size={15} style={{ color: colors.goldDark, flex: "0 0 auto" }} />
                )}
                {tier.label}
              </strong>
              <span style={{ fontSize: 10.5, color: colors.inkMuted, lineHeight: 1.6 }}>{tier.sub}</span>
            </button>
          );
        })}
      </div>

      {activeKey === "custom" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md, marginTop: spacing.xs }}>
          <AmountInput value={minValue > 0 ? String(minValue) : ""} onChange={(next) => onChange({ min: next, max: String(maxValue || "") })} ariaLabel="حداقل بودجه به تومان" placeholder="حداقل" />
          <AmountInput value={maxValue > 0 ? String(maxValue) : ""} onChange={(next) => onChange({ min: String(minValue || ""), max: next })} ariaLabel="حداکثر بودجه به تومان" placeholder="حداکثر" />
        </div>
      ) : null}

      <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 2 }}>
        بازهٔ اعلام‌شده به قاریان: {formatBudgetRange(minValue, maxValue)}
      </span>
    </FieldShell>
  );
}

/* ─────────────────────────  شمارندهٔ لمسی  ───────────────────────── */

export function CountField({
  label,
  hint,
  value,
  onChange,
  presets,
  min,
  max,
  step = 1,
  unit = "نفر",
  ariaLabel,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  presets: readonly number[];
  min: number;
  max: number;
  step?: number;
  unit?: string;
  ariaLabel: string;
}) {
  const numeric = Number(digitsOnly(value) || 0);
  const set = (next: number) => onChange(String(Math.min(max, Math.max(min, Math.round(next)))));
  const stepButtonStyle: CSSProperties = {
    width: 46,
    height: 46,
    display: "grid",
    placeItems: "center",
    flex: "0 0 46px",
    borderRadius: 14,
    border: `1px solid ${colors.sand200}`,
    background: colors.surface,
    color: colors.olive700,
    cursor: "pointer",
    fontFamily: typography.fontFamily,
  };
  return (
    <FieldShell label={label} hint={hint}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
        {presets.map((preset) => (
          <Chip key={preset} active={numeric === preset} onClick={() => set(preset)}>
            {toFaDigits(preset)}
            {unit ? ` ${unit}` : ""}
          </Chip>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <button
          type="button"
          aria-label={`کاهش ${ariaLabel}`}
          onClick={() => set((numeric > 0 ? numeric : min) - step)}
          disabled={numeric <= min}
          style={{ ...stepButtonStyle, opacity: numeric <= min ? 0.45 : 1 }}
        >
          <Icon name="x" size={18} stroke={2.4} />
        </button>
        <strong
          aria-live="polite"
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: 23,
            fontWeight: 900,
            color: colors.olive700,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {numeric > 0 ? toFaDigits(numeric) : "—"}
          {numeric > 0 && unit ? <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkMuted }}> {unit}</span> : null}
        </strong>
        <button
          type="button"
          aria-label={`افزایش ${ariaLabel}`}
          onClick={() => set((numeric > 0 ? numeric : min - step) + step)}
          disabled={numeric >= max}
          style={{ ...stepButtonStyle, opacity: numeric >= max ? 0.45 : 1 }}
        >
          <Icon name="plus" size={18} stroke={2.4} />
        </button>
      </div>
    </FieldShell>
  );
}

/* ─────────────────────────  شهر و مکان  ───────────────────────── */

export function CityPicker({
  value,
  onChange,
  label = "شهر برگزاری",
  hint = "اجباری",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  hint?: string;
}) {
  const trimmed = value.trim();
  return (
    <FieldShell label={label} hint={hint}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
        {POPULAR_CITIES.map((cityOption) => (
          <Chip key={cityOption} active={trimmed === cityOption} onClick={() => onChange(trimmed === cityOption ? "" : cityOption)}>
            {cityOption}
          </Chip>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 60))}
        placeholder="یا نام شهر را بنویسید…"
        style={{ ...inputStyle, minHeight: 46 }}
        aria-label={label}
      />
    </FieldShell>
  );
}

/* ─────────────  موقعیت‌یاب دستگاه (GPS + معکوس‌یابی + نقشه)  ───────────── */

type DetectedPlace = { city: string; address: string; lat: number; lon: number };

function osmEmbedSrc(lat: number, lon: number): string {
  const dLat = 0.0032;
  const dLon = 0.0042;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${(lon - dLon).toFixed(5)}%2C${(lat - dLat).toFixed(5)}%2C${(lon + dLon).toFixed(5)}%2C${(lat + dLat).toFixed(5)}&layer=mapnik&marker=${lat.toFixed(5)}%2C${lon.toFixed(5)}`;
}

function osmLink(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat.toFixed(5)}&mlon=${lon.toFixed(5)}#map=17/${lat.toFixed(5)}/${lon.toFixed(5)}`;
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      resolve,
      reject,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60_000 },
    );
  });
}

async function reverseGeocodeNominatim(lat: number, lon: number): Promise<{ city: string; address: string } | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=17&addressdetails=1&accept-language=fa`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;
  const data = (await response.json()) as Record<string, unknown>;
  const address = (data.address && typeof data.address === "object" ? data.address : {}) as Record<string, unknown>;
  const pick = (key: string): string => (typeof address[key] === "string" ? (address[key] as string).trim() : "");
  const city = pick("city") || pick("town") || pick("village") || pick("municipality") || pick("county") || pick("state");
  const parts = [pick("amenity"), pick("road"), pick("neighbourhood"), pick("quarter"), pick("suburb")]
    .filter((part) => part.length > 0);
  const unique = [...new Set(parts)];
  if (!city && unique.length === 0) return null;
  return { city, address: unique.join("، ") };
}

async function reverseGeocodeFallback(lat: number, lon: number): Promise<{ city: string; address: string } | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fa`;
  const response = await fetch(url);
  if (!response.ok) return null;
  const data = (await response.json()) as Record<string, unknown>;
  const str = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
  const city = str(data.city) || str(data.locality) || str(data.principalSubdivision);
  if (!city) return null;
  const locality = str(data.locality);
  return { city, address: locality && locality !== city ? locality : "" };
}

function geoErrorText(error: unknown): string {
  const code = typeof (error as GeolocationPositionError)?.code === "number" ? (error as GeolocationPositionError).code : 0;
  if (code === 1) return "دسترسی به موقعیت دستگاه داده نشد؛ مجوز موقعیت را در تنظیمات فعال کنید یا نشانی را دستی وارد کنید.";
  if (code === 3) return "یافتن موقعیت بیش از حد طول کشید؛ لطفاً دوباره تلاش کنید.";
  return "موقعیت دستگاه در دسترس نیست؛ نشانی را دستی وارد کنید.";
}

function stripVenuePrefix(value: string): string {
  let rest = value.trim();
  for (const venueType of VENUE_TYPES) {
    rest = rest.replace(new RegExp(`^${venueType}\\s*[-–—،,]?\\s*`), "");
  }
  return rest.trim();
}

/**
 * انتخاب‌گر مکان مراسم: تراشه‌های نوع مکان + ورودی نشانی + دکمهٔ
 * «استفاده از موقعیت من» که شهر و نشانی را از GPS و معکوس‌یابی پر می‌کند
 * و پیش‌نمایش نقشهٔ همان نقطه را نشان می‌دهد.
 */
export function VenuePicker({
  city,
  venue,
  onCityChange,
  onVenueChange,
  label = "نشانی دقیق یا مشخصات مکان",
  hint = "اختیاری و محرمانه — فقط برای قاریِ انتخاب‌شده نشان داده می‌شود",
  cityLabel,
}: {
  city: string;
  venue: string;
  onCityChange: (next: string) => void;
  onVenueChange: (next: string) => void;
  label?: string;
  hint?: string;
  cityLabel?: string;
}) {
  const [geoState, setGeoState] = useState<"idle" | "locating" | "done" | "error">("idle");
  const [geoError, setGeoError] = useState("");
  const [detected, setDetected] = useState<DetectedPlace | null>(null);
  const [showMap, setShowMap] = useState(true);

  const locate = async () => {
    if (geoState === "locating") return;
    setGeoState("locating");
    setGeoError("");
    try {
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      let resolved: { city: string; address: string } | null = null;
      try {
        resolved = await reverseGeocodeNominatim(lat, lon);
      } catch {
        resolved = null;
      }
      if (!resolved) {
        try {
          resolved = await reverseGeocodeFallback(lat, lon);
        } catch {
          resolved = null;
        }
      }
      if (resolved) {
        setDetected({ city: resolved.city, address: resolved.address, lat, lon });
        setShowMap(true);
        setGeoState("done");
        if (resolved.city) onCityChange(resolved.city.slice(0, 60));
        if (resolved.address && !venue.trim()) onVenueChange(resolved.address.slice(0, 200));
      } else {
        setDetected({ city: "", address: "", lat, lon });
        setShowMap(true);
        setGeoState("done");
        setGeoError("موقعیت یافت شد اما نشانی خودکار در دسترس نبود؛ شهر و نشانی را دستی وارد کنید.");
      }
    } catch (caught) {
      setGeoState("error");
      setGeoError(geoErrorText(caught));
    }
  };

  const detectedAddress = detected?.address ?? "";
  const applyDetected = () => {
    if (!detected) return;
    if (detected.address) onVenueChange(detected.address.slice(0, 200));
    if (detected.city) onCityChange(detected.city.slice(0, 60));
  };

  const actionCard: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 13px",
    borderRadius: 14,
    border: `1px solid ${geoState === "error" ? "rgba(166,81,81,.35)" : colors.goldSoft}`,
    background: geoState === "error" ? colors.dangerBackground : colors.goldBackground,
    color: geoState === "error" ? colors.danger : colors.goldDark,
  };

  return (
    <div style={{ display: "grid", gap: spacing.lg }}>
      <CityPicker value={city} onChange={onCityChange} label={cityLabel ?? "شهر برگزاری"} hint="اجباری" />

      <FieldShell label={label} hint={hint}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
          {VENUE_TYPES.map((venueType) => {
            const active = venue.trim().startsWith(venueType);
            return (
              <Chip
                key={venueType}
                active={active}
                onClick={() => onVenueChange(active ? stripVenuePrefix(venue) : `${venueType} ${stripVenuePrefix(venue)}`.trim())}
              >
                {venueType}
              </Chip>
            );
          })}
        </div>
        <input
          type="text"
          value={venue}
          onChange={(event) => onVenueChange(event.target.value.slice(0, 200))}
          placeholder="مثلاً: مسجد جامع، سالن شماره ۲…"
          style={{ ...inputStyle, minHeight: 46 }}
          aria-label={label}
        />
      </FieldShell>

      <div style={{ display: "grid", gap: spacing.sm }}>
        {geoState === "done" && detected ? (
          <div style={{ ...actionCard, border: `1px solid rgba(94,110,67,.35)`, background: colors.successBackground, color: colors.olive800 }}>
            <Icon name="checkCircle" size={19} style={{ flex: "0 0 auto" }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 12.5, fontWeight: 800 }}>
                {detected.city ? `شهر «${detected.city}» از موقعیت دستگاه ثبت شد` : "موقعیت دستگاه ثبت شد"}
              </strong>
              <span style={{ display: "block", fontSize: 11, opacity: 0.85, lineHeight: 1.7 }}>
                {detected.address ? `نشانی شناسایی‌شده: ${detected.address}` : `مختصات: ${toFaDigits(detected.lat.toFixed(4))} ، ${toFaDigits(detected.lon.toFixed(4))}`}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void locate()}
              aria-label="تازه‌سازی موقعیت"
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 6, fontFamily: typography.fontFamily }}
            >
              <Icon name="refresh" size={17} />
            </button>
          </div>
        ) : null}

        {detectedAddress && venue.trim() && venue.trim() !== detectedAddress ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 13, background: colors.sand100, border: `1px solid ${colors.sand200}` }}>
            <Icon name="pin" size={15} style={{ color: colors.olive600, flex: "0 0 auto" }} />
            <span style={{ minWidth: 0, flex: 1, fontSize: 11.5, color: colors.inkSecondary, lineHeight: 1.7 }}>
              نشانی شناسایی‌شده: {detectedAddress}
            </span>
            <button
              type="button"
              onClick={applyDetected}
              style={{
                flex: "0 0 auto",
                minHeight: 34,
                padding: "0 12px",
                borderRadius: 999,
                border: `1px solid ${colors.olive200}`,
                background: colors.surface,
                color: colors.olive700,
                fontSize: 11.5,
                fontWeight: 800,
                cursor: "pointer",
                fontFamily: typography.fontFamily,
              }}
            >
              درج در نشانی
            </button>
          </div>
        ) : null}

        {geoState !== "done" ? (
          <button
            type="button"
            onClick={() => void locate()}
            disabled={geoState === "locating"}
            aria-label="استفاده از موقعیت دستگاه برای پرکردن نشانی"
            style={{ ...actionCard, cursor: geoState === "locating" ? "wait" : "pointer", fontFamily: typography.fontFamily, textAlign: "right" }}
          >
            {geoState === "locating" ? (
              <span aria-hidden="true" className="vodda-spinner" style={{ flex: "0 0 auto" }} />
            ) : (
              <Icon name="pin" size={19} style={{ flex: "0 0 auto" }} />
            )}
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 12.5, fontWeight: 800 }}>
                {geoState === "locating" ? "در حال یافتن موقعیت…" : "استفاده از موقعیت من"}
              </strong>
              <span style={{ display: "block", fontSize: 11, opacity: 0.85, lineHeight: 1.7 }}>
                {geoState === "error" ? geoError : "شهر و نشانی به‌صورت خودکار از GPS پر می‌شود"}
              </span>
            </span>
          </button>
        ) : null}

        {detected && showMap ? (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${colors.sand200}`, position: "relative" }}>
            <iframe
              title="پیش‌نمایش نقشهٔ موقعیت مراسم"
              src={osmEmbedSrc(detected.lat, detected.lon)}
              loading="lazy"
              style={{ width: "100%", height: 150, border: 0, display: "block", background: colors.sand100 }}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: colors.surface, borderTop: `1px solid ${colors.sand150}` }}>
              <a
                href={osmLink(detected.lat, detected.lon)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 800, color: colors.olive700, textDecoration: "none" }}
              >
                <Icon name="arrowUpRight" size={13} />
                مشاهده روی نقشه
              </a>
              <span aria-hidden="true" style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setShowMap(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.inkFaint, padding: 4, fontFamily: typography.fontFamily, fontSize: 11 }}
              >
                بستن نقشه
              </button>
            </div>
          </div>
        ) : null}

        <span style={{ display: "block", fontSize: 10.5, color: colors.inkFaint, lineHeight: 1.8 }}>
          موقعیت دستگاه شما فقط برای پرکردن متن نشانی استفاده می‌شود و تنها به قاریِ انتخاب‌شده نمایش داده می‌شود.
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────  ساعت‌های پیشنهادی  ───────────────────────── */

export function TimePresetChips({
  hh,
  mm,
  onPick,
}: {
  hh: number;
  mm: number;
  onPick: (next: { hh: number; mm: number }) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
      {TIME_PRESETS.map((preset) => (
        <Chip
          key={preset.label}
          active={hh === preset.hh && mm === preset.mm}
          onClick={() => onPick({ hh: preset.hh, mm: preset.mm })}
        >
          {preset.label}
        </Chip>
      ))}
    </div>
  );
}

/* ─────────────────────────  قالب‌های یادداشت  ───────────────────────── */

export function NoteTemplateChips({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const toggle = (text: string) => {
    const current = value.trim();
    if (current.includes(text)) {
      const next = current
        .replace(`؛ ${text}`, "")
        .replace(`؛ ${text}؛`, "")
        .replace(`${text}؛ `, "")
        .replace(text, "")
        .replace(/؛\s*؛/g, "؛")
        .replace(/^[؛\s]+|[؛\s]+$/g, "")
        .trim();
      onChange(next);
      return;
    }
    onChange(current ? `${current}؛ ${text}` : text);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
      {NOTE_TEMPLATES.map((template) => (
        <Chip key={template.chip} active={value.includes(template.text)} onClick={() => toggle(template.text)}>
          {template.chip}
        </Chip>
      ))}
    </div>
  );
}

/* ─────────────────────────  مدت اجرا  ───────────────────────── */

export function DurationPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const presets: readonly number[] = [30, 45, 60, 90, 120, 180];
  const numeric = Number(digitsOnly(value) || 0);
  return (
    <FieldShell label="مدت اجرا" hint="دقیقه">
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
        {presets.map((preset) => (
          <Chip key={preset} active={numeric === preset} onClick={() => onChange(String(preset))}>
            {toFaDigits(preset)} دقیقه
          </Chip>
        ))}
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={toFaDigits(value)}
        onChange={(event) => onChange(digitsOnly(event.target.value, 4))}
        placeholder="یا دقیقهٔ دلخواه…"
        style={{ ...inputStyle, minHeight: 46 }}
        aria-label="مدت اجرا به دقیقه"
      />
    </FieldShell>
  );
}

/* ─────────────────────────  شهرهای پذیرش (چند انتخابی)  ───────────────────────── */

export function CitiesChipsField({
  value,
  onChange,
  label = "شهرهای پذیرش مراسم",
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
}) {
  const selected = useMemo(
    () => value.split(/[،,]/).map((part) => part.trim()).filter(Boolean),
    [value],
  );
  const toggle = (cityOption: string) => {
    if (selected.includes(cityOption)) {
      onChange(selected.filter((city) => city !== cityOption).join("، "));
    } else {
      onChange([...selected, cityOption].join("، "));
    }
  };
  return (
    <FieldShell label={label} hint="با تراشه انتخاب کنید">
      <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
        <Chip accent="gold" active={selected.length === 0} onClick={() => onChange("")}>
          همهٔ شهرها
        </Chip>
        {POPULAR_CITIES.map((cityOption) => (
          <Chip key={cityOption} active={selected.includes(cityOption)} onClick={() => toggle(cityOption)}>
            {cityOption}
          </Chip>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 200))}
        placeholder="شهرهای دیگر را با ویرگول اضافه کنید…"
        style={{ ...inputStyle, minHeight: 46 }}
        aria-label={label}
      />
    </FieldShell>
  );
}
