"use client";

/*
 * ۱.ب.۱ — chip شهر + bottom sheet انتخاب شهر (اپ universal-app).
 *
 * ساختار sheet دقیقاً مطابق مشخصات:
 *   ① «استفاده از موقعیت من» (بالا، 📍)
 *   ② جستجوی شهر
 *   ③ ۱۲ شهر پرتردد
 *   ④ «همهٔ شهرها» با جستجو
 *
 * از Sheet موجود در ui/primitives و util مشترک cities/userCity استفاده می‌کند —
 * آواتار جدیدی ساخته نمی‌شود و تاریخ/عدد هم از util مرحله ۰ می‌آید.
 */
import { useMemo, useState, type CSSProperties } from "react";
import { POPULAR_CITIES, allCityNames, searchCityNames } from "@/lib/cities";
import { formatNumber } from "@/lib/datetime";
import { Icon } from "../../ui/Icon";
import { Button, Sheet } from "../../ui/primitives";
import { useL } from "../../ui/appearance";
import { colors, radii, spacing, typography } from "../../ui/theme";

function faCount(value: number) {
  try {
    return formatNumber(value, "fa", { maximumFractionDigits: 0 });
  } catch {
    return String(value);
  }
}

/* ───────────────── chip شهر (هدر صفحهٔ نخست) ───────────────── */

export function CityChipButton({
  city,
  onClick,
  style,
}: {
  city: string;
  onClick: () => void;
  style?: CSSProperties;
}) {
  const L = useL();
  const label = city.trim() || L("انتخاب شهر");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${L("شهر فعلی")}: ${label} — ${L("تغییر شهر")}`}
      className="vodda-tappable vodda-enter"
      title={city.trim() ? `${L("شهر فعلی")}: ${label}` : L("برای انتخاب شهر بزنید")}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        maxWidth: "100%",
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${city.trim() ? colors.olive200 : colors.goldSoft}`,
        background: city.trim() ? colors.surface : colors.goldBackground,
        color: city.trim() ? colors.olive700 : colors.goldDark,
        boxShadow: "0 1px 6px rgba(46,54,34,.06)",
        cursor: "pointer",
        fontFamily: typography.fontFamily,
        fontSize: 12.5,
        fontWeight: 800,
        whiteSpace: "nowrap",
        overflow: "hidden",
        ...style,
      }}
    >
      <Icon name="pin" size={14} stroke={1.9} style={{ flex: "0 0 auto" }} />
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {city.trim() ? null : (
        <Icon name="chevronL" size={13} style={{ flex: "0 0 auto", color: colors.inkFaint }} />
      )}
    </button>
  );
}

/* ───────────────── bottom sheet انتخاب شهر ───────────────── */

export type CityPickerSheetProps = {
  open: boolean;
  onClose: () => void;
  /** شهر فعلی — برای نشانگر «فعلی» در فهرست. */
  selectedCity: string;
  /** شهرهای استادها از API (کاتالوگ واقعی سکو) — با دیتاست استاتیک یکی می‌شود. */
  platformCities?: string[];
  onSelect: (city: string) => void;
  /** «استفاده از موقعیت من» — منطق GPS در LearnerHomeScreen است (runtime-aware). */
  onUseLocation: () => void;
  detecting: boolean;
  detectNote: string | null;
};

export function CityPickerSheet({
  open,
  onClose,
  selectedCity,
  platformCities = [],
  onSelect,
  onUseLocation,
  detecting,
  detectNote,
}: CityPickerSheetProps) {
  const L = useL();
  const [query, setQuery] = useState("");

  /* همهٔ شهرها = دیتاست استاتیک + شهرهای واقعی استادها (بدون تکرار، ترتیب فارسی) */
  const everyCity = useMemo(
    () =>
      [...new Set([...allCityNames(), ...platformCities.map((city) => city.trim())].filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, "fa"),
      ),
    [platformCities],
  );

  const popular = useMemo(() => searchCityNames(query, POPULAR_CITIES), [query]);
  const rest = useMemo(() => searchCityNames(query, everyCity), [query, everyCity]);

  const pick = (city: string) => {
    onSelect(city);
    onClose();
  };

  return (
    <Sheet open={open} title={L("انتخاب شهر")} onClose={onClose}>
      <div style={{ display: "grid", gap: spacing.lg }}>
        {/* ① استفاده از موقعیت من */}
        <Button variant="primary" onClick={onUseLocation} disabled={detecting} style={{ minHeight: 48, fontWeight: 800 }}>
          <Icon name="pin" size={17} stroke={2} />
          {detecting ? L("در حال دریافت موقعیت…") : L("استفاده از موقعیت من")}
        </Button>

        {detectNote ? (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: radii.md,
              background: colors.goldBackground,
              border: `1px solid ${colors.goldSoft}`,
              color: colors.goldDark,
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1.7,
            }}
          >
            <Icon name="info" size={15} style={{ flex: "0 0 auto" }} />
            <span>{L(detectNote)}</span>
          </div>
        ) : null}

        {/* ② جستجوی شهر — هر دو بخش (پرتردد + همه) فیلتر می‌شود */}
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: colors.inkSecondary }}>{L("جستجوی شهر")}</span>
          <div style={{ position: "relative" }}>
            <Icon
              name="search"
              size={17}
              style={{ position: "absolute", insetInlineStart: 14, top: "50%", transform: "translateY(-50%)", color: colors.inkFaint }}
            />
            <input
              className="vodda-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={L("مثلاً مشهد…")}
              aria-label={L("جستجوی شهر")}
              style={{
                width: "100%",
                minHeight: 48,
                padding: "12px 44px 12px 14px",
                border: `1px solid ${colors.sand200}`,
                borderRadius: radii.md,
                outline: "none",
                color: colors.ink,
                background: colors.surface,
                fontFamily: typography.fontFamily,
                fontSize: 14,
                fontWeight: 600,
              }}
            />
          </div>
        </label>

        {/* ③ ۱۲ شهر پرتردد */}
        {popular.length > 0 ? (
          <section aria-label={L("شهرهای پرتردد")} style={{ display: "grid", gap: spacing.sm }}>
            <strong style={{ fontSize: 13, fontWeight: 800, color: colors.inkSecondary }}>{L("شهرهای پرتردد")}</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {popular.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => pick(city)}
                  className="vodda-tappable"
                  aria-pressed={city === selectedCity}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "8px 13px",
                    borderRadius: 999,
                    border: `1px solid ${city === selectedCity ? colors.olive600 : colors.sand200}`,
                    background: city === selectedCity ? colors.olive50 : colors.surface,
                    color: city === selectedCity ? colors.olive700 : colors.ink,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                    fontSize: 12.5,
                    fontWeight: 800,
                  }}
                >
                  {city === selectedCity ? <Icon name="checkCircle" size={14} stroke={2} /> : null}
                  {city}
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* ④ همهٔ شهرها با جستجو */}
        <section aria-label={L("همهٔ شهرها")} style={{ display: "grid", gap: spacing.sm }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.sm }}>
            <strong style={{ fontSize: 13, fontWeight: 800, color: colors.inkSecondary }}>{L("همهٔ شهرها")}</strong>
            <span style={{ fontSize: 11.5, color: colors.inkFaint, fontWeight: 700 }}>{faCount(rest.length)} {L("شهر")}</span>
          </div>
          {rest.length === 0 ? (
            <span style={{ fontSize: 12.5, color: colors.inkMuted, paddingBlock: spacing.md }}>
              {L("شهری با این نام پیدا نشد.")}
            </span>
          ) : (
            <div
              style={{
                display: "grid",
                gap: 4,
                maxHeight: 240,
                overflowY: "auto",
                padding: 4,
                border: `1px solid ${colors.sand150}`,
                borderRadius: radii.md,
                overscrollBehavior: "contain",
              }}
            >
              {rest.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => pick(city)}
                  className="vodda-tappable"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: "10px 12px",
                    border: 0,
                    borderRadius: radii.sm,
                    background: city === selectedCity ? colors.olive50 : "transparent",
                    color: city === selectedCity ? colors.olive700 : colors.ink,
                    cursor: "pointer",
                    fontFamily: typography.fontFamily,
                    fontSize: 13.5,
                    fontWeight: city === selectedCity ? 800 : 600,
                    textAlign: "right",
                  }}
                >
                  <span>{city}</span>
                  {city === selectedCity ? <Icon name="checkCircle" size={15} stroke={2} /> : null}
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </Sheet>
  );
}
