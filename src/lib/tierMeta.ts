/*
 * متادیتای درجه استاد — تنها منبع رنگ/برچسب تیک در کل مونوریپو (اپ + وب).
 *
 * قواعد ۱.الف.۲:
 *  - بین‌المللی (کلید legacy: international) → تیک آبی اینستاگرامی  #1DA1F2 / #0095F6
 *  - کشوری      (کلید legacy: grade2)         → تیک سبز             #22C55E / #3AA76D
 *  - استانی     (کلید legacy: grade3)         → تیک قرمز            #EF4444 / #E1306C
 *
 * این فایل عمداً بدون هیچ وابستگی است تا هم در Next (وب) و هم در بیلد Vite/Capacitor
 * (اپ نیتیو) با import نسبی به کار برود — پارتی کامل.
 */

export type TierKey = "international" | "grade2" | "grade3";

export type TierMeta = {
  /** رنگ اصلی مهر/تیک. */
  main: string;
  /** رنگ عمیق‌تر برای متن و پس‌زمینه‌های ملایم. */
  deep: string;
  /** برچسب کامل برای tooltip و چیپ. */
  label: string;
  /** برچسب کوتاه برای ردیف نشان‌ها. */
  short: string;
  /** tooltip مهر گوشهٔ آواتار. */
  sealLabel: string;
};

export const TIER_META: Record<TierKey, TierMeta> = {
  international: {
    main: "#1DA1F2",
    deep: "#0095F6",
    label: "استاد بین‌المللی",
    short: "بین‌المللی",
    sealLabel: "تیک بین‌المللی",
  },
  grade2: {
    main: "#22C55E",
    deep: "#3AA76D",
    label: "استاد برگزیدهٔ کشوری",
    short: "کشوری",
    sealLabel: "تیک برگزیدهٔ کشوری",
  },
  grade3: {
    main: "#EF4444",
    deep: "#E1306C",
    label: "استاد برگزیدهٔ استانی",
    short: "استانی",
    sealLabel: "تیک برگزیدهٔ استانی",
  },
};

/** درجه‌های مجاز payload بک‌اند؛ رشتهٔ خالی یا نامشخص → بدون تیک. */
export function tierKeyOf(tier?: string | null): TierKey | null {
  if (tier === "international" || tier === "grade2" || tier === "grade3") return tier;
  return null;
}

/** رنگ نئونِ حاشیهٔ کارت استاد (۱.الف.۳) — بدون درجه → خاکستری ملایم. */
export const TIER_NEON_GRAY = "#8c8675";

export function tierNeonColor(tier?: string | null): string {
  const key = tierKeyOf(tier);
  return key ? TIER_META[key].main : TIER_NEON_GRAY;
}

/** «#RRGGBB» → «R G B» برای استفاده در rgb(var(--neon-rgb) / a) — بدون وابستگی. */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : clean.padEnd(6, "0").slice(0, 6);
  const value = Number.parseInt(full, 16);
  if (!Number.isFinite(value)) return "140 134 117";
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `${r} ${g} ${b}`;
}
