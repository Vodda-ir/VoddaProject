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
import { digitsOnly, localizedDigits } from "../../ui/persian";
import { useAppearance } from "../../ui/appearance";
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
  const { L } = useAppearance();
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: spacing.sm }}>
        <strong style={{ fontSize: 13.5, color: colors.ink, display: "block" }}>{L(label)}</strong>
        {hint ? <span style={{ fontSize: 11, color: colors.inkFaint, textAlign: "left" }}>{L(hint)}</span> : null}
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
      : { background: colors.olive600, borderColor: colors.olive600, color: colors.onOlive }
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

/** فیلد کشویی مرتب — پایهٔ انتخاب‌های تکی؛ جایگزین ردیف‌های طولانی تراشه. */
export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  ariaLabel,
}: {
  label?: string;
  hint?: string;
  value: string;
  onChange: (next: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  ariaLabel: string;
}) {
  const { L } = useAppearance();
  const body = (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={L(ariaLabel)}
        style={{
          ...inputStyle,
          minHeight: 48,
          appearance: "none",
          WebkitAppearance: "none",
          fontWeight: 700,
          cursor: "pointer",
          paddingInlineEnd: 38,
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <Icon
        name="chevronL"
        size={16}
        stroke={2.2}
        aria-hidden="true"
        style={{
          position: "absolute",
          insetInlineEnd: 14,
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          color: colors.inkMuted,
          pointerEvents: "none",
        }}
      />
    </div>
  );
  if (!label) return body;
  return <FieldShell label={label} hint={hint}>{body}</FieldShell>;
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
  const { L, lang } = useAppearance();
  return (
    <div>
      <div style={{ position: "relative" }}>
        <input
          type="text"
          inputMode="numeric"
          value={localizedDigits(value, lang)}
          onChange={(event) => onChange(digitsOnly(event.target.value, 12))}
          placeholder={L(placeholder)}
          style={{ ...inputStyle, minHeight: 46, fontWeight: 700, paddingInlineEnd: 56 }}
          aria-label={L(ariaLabel)}
        />
        <span
          aria-hidden="true"
          style={{ position: "absolute", insetInlineEnd: 13, top: "50%", transform: "translateY(-50%)", fontSize: 11.5, color: colors.inkFaint }}
        >
          {L("تومان")}
        </span>
      </div>
      {numeric >= 1000 ? (
        <span style={{ display: "block", marginTop: 4, fontSize: 11, color: colors.olive700, fontVariantNumeric: "tabular-nums" }}>
          {formatAmountFull(numeric, lang)}
        </span>
      ) : null}
    </div>
  );
}

/** مبلغ با پیشنهادهای آماده — فهرست کشویی انتخاب سریع + ورودی دستی. */
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
  const [customMode, setCustomMode] = useState(false);
  const { L, lang } = useAppearance();
  const uniquePresets = useMemo(
    () => [...new Set(presets.filter((preset) => preset > 0))].sort((a, b) => a - b),
    [presets],
  );
  const showManual = customMode || (numeric > 0 && !uniquePresets.includes(numeric));
  const selectValue = numeric > 0
    ? uniquePresets.includes(numeric) && !customMode
      ? String(numeric)
      : "__custom__"
    : "";
  return (
    <FieldShell label={label} hint={hint}>
      {uniquePresets.length > 0 ? (
        <SelectField
          ariaLabel={ariaLabel}
          value={selectValue}
          onChange={(next) => {
            if (next === "__custom__") {
              setCustomMode(true);
              return;
            }
            setCustomMode(false);
            onChange(next);
          }}
          options={[
            { value: "", label: L("مبلغ توافقی — بدون مبلغ ثابت") },
            ...uniquePresets.map((preset) => ({ value: String(preset), label: formatToman(preset, lang) })),
            { value: "__custom__", label: L("مبلغ دلخواه…") },
          ]}
        />
      ) : null}
      {showManual || uniquePresets.length === 0 ? (
        <AmountInput value={value} onChange={onChange} ariaLabel={ariaLabel} />
      ) : null}
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

/** بازهٔ حق‌الزحمهٔ فراخوان مراسم — فهرست کشویی پیشنهادی + بازهٔ دلخواه. */
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
  const { L, lang } = useAppearance();
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
    <FieldShell label={L("بودجهٔ پیشنهادی")} hint={L("حق‌الزحمهٔ منصفانه برای قاریان")}>
      <SelectField
        ariaLabel={L("بازهٔ بودجهٔ پیشنهادی")}
        value={activeKey}
        onChange={(next) => select(BUDGET_TIERS.find((tier) => tier.key === next) ?? BUDGET_TIERS[0])}
        options={BUDGET_TIERS.map((tier) => ({
          value: tier.key,
          label: tier.key === "custom" ? L("بازهٔ دلخواه — تعیین دقیق کف و سقف") : `${L(tier.label)} — ${L(tier.sub)}`,
        }))}
      />

      {activeKey === "custom" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: spacing.md, marginTop: spacing.xs }}>
          <AmountInput value={minValue > 0 ? String(minValue) : ""} onChange={(next) => onChange({ min: next, max: String(maxValue || "") })} ariaLabel={L("حداقل بودجه به تومان")} placeholder={L("حداقل")} />
          <AmountInput value={maxValue > 0 ? String(maxValue) : ""} onChange={(next) => onChange({ min: String(minValue || ""), max: next })} ariaLabel={L("حداکثر بودجه به تومان")} placeholder={L("حداکثر")} />
        </div>
      ) : null}

      <span style={{ display: "block", fontSize: 11.5, color: colors.inkMuted, marginTop: 2 }}>
        {L("بازهٔ اعلام‌شده به قاریان: {range}").replace("{range}", formatBudgetRange(minValue, maxValue, lang))}
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
  const { L, lang } = useAppearance();
  const presetOptions = presets.filter((preset) => preset >= min && preset <= max);
  const isPreset = presetOptions.includes(numeric);
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
      <SelectField
        ariaLabel={ariaLabel}
        value={numeric > 0 ? String(numeric) : ""}
        onChange={(next) => {
          if (next) set(Number(next));
        }}
        options={[
          ...(numeric > 0 ? [] : [{ value: "", label: L("انتخاب کنید…") }]),
          ...presetOptions.map((preset) => ({ value: String(preset), label: `${localizedDigits(preset, lang)} ${L(unit)}` })),
          ...(numeric > 0 && !isPreset ? [{ value: String(numeric), label: `${localizedDigits(numeric, lang)} ${L(unit)} (${L("دلخواه")})` }] : []),
        ]}
      />
      <div style={{ display: "flex", alignItems: "center", gap: spacing.md }}>
        <button
          type="button"
          aria-label={L("کاهش {x}").replace("{x}", L(ariaLabel))}
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
          {numeric > 0 ? localizedDigits(numeric, lang) : "—"}
          {numeric > 0 && unit ? <span style={{ fontSize: 12, fontWeight: 700, color: colors.inkMuted }}> {L(unit)}</span> : null}
        </strong>
        <button
          type="button"
          aria-label={L("افزایش {x}").replace("{x}", L(ariaLabel))}
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
  const { L } = useAppearance();
  const known = POPULAR_CITIES.includes(trimmed);
  const selectValue = trimmed === "" ? "" : known ? trimmed : "__other__";
  return (
    <FieldShell label={label} hint={hint}>
      <SelectField
        ariaLabel={label}
        value={selectValue}
        onChange={(next) => onChange(next === "__other__" ? "" : next)}
        options={[
          { value: "", label: L("انتخاب شهر…") },
          ...POPULAR_CITIES.map((cityOption) => ({ value: cityOption, label: L(cityOption) })),
          { value: "__other__", label: L("شهر دیگر…") },
        ]}
      />
      {selectValue === "__other__" ? (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value.slice(0, 60))}
          placeholder={L("نام شهر را بنویسید…")}
          style={{ ...inputStyle, minHeight: 46 }}
          aria-label={L("نام شهر")}
        />
      ) : null}
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
  const { L, lang } = useAppearance();

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
        setGeoError(L("موقعیت یافت شد اما نشانی خودکار در دسترس نبود؛ شهر و نشانی را دستی وارد کنید."));
      }
    } catch (caught) {
      setGeoState("error");
      setGeoError(L(geoErrorText(caught)));
    }
  };

  const detectedAddress = detected?.address ?? "";
  const venueTypePrefix = VENUE_TYPES.find((venueType) => {
    const trimmedVenue = venue.trim();
    return trimmedVenue.startsWith(venueType) || trimmedVenue.startsWith(L(venueType));
  }) ?? "";
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
      <CityPicker value={city} onChange={onCityChange} label={cityLabel ?? L("شهر برگزاری")} hint={L("اجباری")} />

      <FieldShell label={label} hint={hint}>
        <SelectField
          label={L("نوع مکان")}
          hint={L("برای پرکردن سریع")}
          ariaLabel={L("نوع مکان مراسم")}
          value={venueTypePrefix}
          onChange={(next) =>
            onVenueChange(next ? `${L(next)} ${stripVenuePrefix(venue)}`.trim() : stripVenuePrefix(venue))
          }
          options={[
            { value: "", label: L("بدون نوع مشخص…") },
            ...VENUE_TYPES.map((venueType) => ({ value: venueType, label: L(venueType) })),
          ]}
        />
        <input
          type="text"
          value={venue}
          onChange={(event) => onVenueChange(event.target.value.slice(0, 200))}
          placeholder={L("نشانی دقیق؛ مثلاً: مسجد جامع، سالن شماره ۲…")}
          style={{ ...inputStyle, minHeight: 46 }}
          aria-label={L(label)}
        />
      </FieldShell>

      <div style={{ display: "grid", gap: spacing.sm }}>
        {geoState === "done" && detected ? (
          <div style={{ ...actionCard, border: `1px solid rgba(94,110,67,.35)`, background: colors.successBackground, color: colors.olive700 }}>
            <Icon name="checkCircle" size={19} style={{ flex: "0 0 auto" }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 12.5, fontWeight: 800 }}>
                {detected.city
                  ? L("شهر «{city}» از موقعیت دستگاه ثبت شد").replace("{city}", detected.city)
                  : L("موقعیت دستگاه ثبت شد")}
              </strong>
              <span style={{ display: "block", fontSize: 11, opacity: 0.85, lineHeight: 1.7 }}>
                {detected.address
                  ? L("نشانی شناسایی‌شده: {address}").replace("{address}", detected.address)
                  : L("مختصات: {lat} ، {lon}")
                      .replace("{lat}", localizedDigits(detected.lat.toFixed(4), lang))
                      .replace("{lon}", localizedDigits(detected.lon.toFixed(4), lang))}
              </span>
            </div>
            <button
              type="button"
              onClick={() => void locate()}
              aria-label={L("تازه‌سازی موقعیت")}
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
              {L("نشانی شناسایی‌شده: {address}").replace("{address}", detectedAddress)}
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
              {L("درج در نشانی")}
            </button>
          </div>
        ) : null}

        {geoState !== "done" ? (
          <button
            type="button"
            onClick={() => void locate()}
            disabled={geoState === "locating"}
            aria-label={L("استفاده از موقعیت دستگاه برای پرکردن نشانی")}
            style={{ ...actionCard, cursor: geoState === "locating" ? "wait" : "pointer", fontFamily: typography.fontFamily, textAlign: "right" }}
          >
            {geoState === "locating" ? (
              <span aria-hidden="true" className="vodda-spinner" style={{ flex: "0 0 auto" }} />
            ) : (
              <Icon name="pin" size={19} style={{ flex: "0 0 auto" }} />
            )}
            <span style={{ minWidth: 0, flex: 1 }}>
              <strong style={{ display: "block", fontSize: 12.5, fontWeight: 800 }}>
                {geoState === "locating" ? L("در حال یافتن موقعیت…") : L("استفاده از موقعیت من")}
              </strong>
              <span style={{ display: "block", fontSize: 11, opacity: 0.85, lineHeight: 1.7 }}>
                {geoState === "error" ? geoError : L("شهر و نشانی به‌صورت خودکار از GPS پر می‌شود")}
              </span>
            </span>
          </button>
        ) : null}

        {detected && showMap ? (
          <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${colors.sand200}`, position: "relative" }}>
            <iframe
              title={L("پیش‌نمایش نقشهٔ موقعیت مراسم")}
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
                {L("مشاهده روی نقشه")}
              </a>
              <span aria-hidden="true" style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => setShowMap(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: colors.inkFaint, padding: 4, fontFamily: typography.fontFamily, fontSize: 11 }}
              >
                {L("بستن نقشه")}
              </button>
            </div>
          </div>
        ) : null}

        <span style={{ display: "block", fontSize: 10.5, color: colors.inkFaint, lineHeight: 1.8 }}>
          {L("موقعیت دستگاه شما فقط برای پرکردن متن نشانی استفاده می‌شود و تنها به قاریِ انتخاب‌شده نمایش داده می‌شود.")}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────  ساعت‌های پیشنهادی  ───────────────────────── */

/** انتخاب‌گر ساعت پیشنهادی نماز‌محور — فهرست کشویی به‌جای ردیف تراشه‌ها. */
export function TimePresetSelect({
  hh,
  mm,
  onPick,
}: {
  hh: number;
  mm: number;
  onPick: (next: { hh: number; mm: number }) => void;
}) {
  const value = TIME_PRESETS.some((preset) => preset.hh === hh && preset.mm === mm)
    ? `${hh}:${mm}`
    : "__manual__";
  const { L } = useAppearance();
  return (
    <SelectField
      label={L("ساعت پیشنهادی")}
      hint={L("یا از پیکر بالا انتخاب کنید")}
      ariaLabel={L("ساعت‌های پیشنهادی مراسم")}
      value={value}
      onChange={(next) => {
        const preset = TIME_PRESETS.find((item) => `${item.hh}:${item.mm}` === next);
        if (preset) onPick({ hh: preset.hh, mm: preset.mm });
      }}
      options={[
        ...TIME_PRESETS.map((preset) => ({ value: `${preset.hh}:${preset.mm}`, label: L(preset.label) })),
        { value: "__manual__", label: L("ساعت دلخواه") },
      ]}
    />
  );
}

/* ─────────────────────────  قالب‌های یادداشت  ───────────────────────── */

export function NoteTemplateChips({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const { L, lang } = useAppearance();
  // جداکنندهٔ یادداشت‌ها در حالت انگلیسی نقطه‌ویرگول لاتین است.
  const sep = lang === "en" ? ";" : "؛";
  const toggle = (text: string) => {
    const current = value.trim();
    if (current.includes(text)) {
      const next = current
        .replace(`${sep} ${text}`, "")
        .replace(`${sep} ${text}${sep}`, "")
        .replace(`${text}${sep} `, "")
        .replace(text, "")
        .replace(new RegExp(`${sep}\\s*${sep}`, "g"), sep)
        .replace(new RegExp(`^[${sep}\\s]+|[${sep}\\s]+$`, "g"), "")
        .trim();
      onChange(next);
      return;
    }
    onChange(current ? `${current}${sep} ${text}` : text);
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing.sm }}>
      {NOTE_TEMPLATES.map((template) => {
        const text = L(template.text);
        return (
          <Chip key={template.chip} active={value.includes(text)} onClick={() => toggle(text)}>
            {L(template.chip)}
          </Chip>
        );
      })}
    </div>
  );
}

/* ─────────────────────────  مدت اجرا  ───────────────────────── */

export function DurationPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const presets: readonly number[] = [30, 45, 60, 90, 120, 180];
  const numeric = Number(digitsOnly(value) || 0);
  const isPreset = presets.includes(numeric);
  const { L, lang } = useAppearance();
  return (
    <FieldShell label={L("مدت اجرا")} hint={L("دقیقه")}>
      <SelectField
        ariaLabel={L("مدت اجرا به دقیقه")}
        value={numeric > 0 && isPreset ? String(numeric) : numeric > 0 ? "__custom__" : ""}
        onChange={(next) => {
          if (next && next !== "__custom__") onChange(next);
        }}
        options={[
          { value: "", label: L("انتخاب مدت اجرا…") },
          ...presets.map((preset) => ({ value: String(preset), label: `${localizedDigits(preset, lang)} ${L("دقیقه")}` })),
          { value: "__custom__", label: L("دقیقهٔ دلخواه…") },
        ]}
      />
      {numeric > 0 && !isPreset ? (
        <input
          type="text"
          inputMode="numeric"
          value={localizedDigits(value, lang)}
          onChange={(event) => onChange(digitsOnly(event.target.value, 4))}
          placeholder={L("دقیقهٔ دلخواه…")}
          style={{ ...inputStyle, minHeight: 46 }}
          aria-label={L("مدت اجرا به دقیقه")}
        />
      ) : null}
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
  const available = POPULAR_CITIES.filter((cityOption) => !selected.includes(cityOption));
  const add = (cityOption: string) => onChange([...selected, cityOption].join(L("، ")));
  const remove = (cityOption: string) => onChange(selected.filter((city) => city !== cityOption).join(L("، ")));
  const customSelected = selected.filter((city) => !POPULAR_CITIES.includes(city));
  const { L } = useAppearance();
  return (
    <FieldShell label={label} hint={L("از فهرست انتخاب یا بنویسید")}>
      {selected.length === 0 ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: colors.olive700, background: colors.olive50, border: `1px solid ${colors.olive200}`, borderRadius: 999, padding: "6px 12px" }}>
          <Icon name="checkCircle" size={14} />
          {L("همهٔ شهرها — بدون محدودیت")}
        </span>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {selected.map((city, index) => (
            <span
              key={`${city}-${index}`}
              style={{ display: "inline-flex", alignItems: "center", gap: 5, minHeight: 34, padding: "5px 8px 5px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, color: colors.olive700, background: colors.olive50, border: `1px solid ${colors.olive200}` }}
            >
              {L(city)}
              <button
                type="button"
                aria-label={L("حذف {city}").replace("{city}", L(city))}
                onClick={() => remove(city)}
                className="vodda-hit"
                style={{ width: 24, height: 24, display: "grid", placeItems: "center", padding: 0, border: 0, borderRadius: "50%", color: colors.olive600, background: "transparent", cursor: "pointer", fontFamily: typography.fontFamily }}
              >
                <Icon name="x" size={12} stroke={2.4} />
              </button>
            </span>
          ))}
        </div>
      )}
      {available.length > 0 ? (
        <SelectField
          ariaLabel={L("افزودن شهر پذیرش")}
          value=""
          onChange={(next) => {
            if (next) add(next);
          }}
          options={[
            { value: "", label: selected.length === 0 ? L("محدود به شهرهای…") : L("افزودن شهر…") },
            ...available.map((cityOption) => ({ value: cityOption, label: L(cityOption) })),
          ]}
        />
      ) : null}
      <input
        type="text"
        value={customSelected.join(L("، "))}
        onChange={(event) => {
          const typed = event.target.value.split(/[،,]/).map((part) => part.trim()).filter(Boolean);
          onChange([...selected.filter((city) => POPULAR_CITIES.includes(city)), ...typed].join(L("، ")));
        }}
        placeholder={L("شهر دیگر را اینجا بنویسید (با ویرگول جدا کنید)…")}
        style={{ ...inputStyle, minHeight: 46 }}
        aria-label={L("شهرهای دیگر")}
      />
    </FieldShell>
  );
}
