// باگ persian-dates — ابزار مرکزی تاریخ/زمان/عدد برای اپ و پنل.
// fa → تقویم هجری شمسی (persian) با ارقام فارسی و timezone رسمی ایران؛
// en → تقویم میلادی (gregory) برای حالت دوزبانه.
// هیچ صفحه‌ای دیگر تاریخ را بدون تقویم صریح فرمت نمی‌کند — صفر تاریخ میلادی در حالت فارسی.

export type Lang = "fa" | "en";
export type DateStyle = "short" | "medium" | "long" | "dayMonth" | "weekdayDayMonth";

export type DateInput = Date | string | number;

const IRAN_TZ = "Asia/Tehran";
// ca-persian → تقویم شمسی؛ nu-arabext → ارقام ۰۱۲۳۴۵۶۷۸۹ (در هر محیطی قطعی است).
const FA_LOCALE = "fa-IR-u-ca-persian-nu-arabext";
// خروجی en مطابق نمونهٔ پذیرش: «Nov 17, 2026»
const EN_LOCALE = "en-US";

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: IRAN_TZ,
};

// fa: «۲۶ آبان» / «۲۶ آبان ۱۴۰۴» / «شنبه ۲۶ آبان ۱۴۰۴» / «شنبه ۲۶ آبان» / «شنبه ۲۶ آبان، ۱۴:۳۰»
// en: «Nov 17» / «Nov 17, 2026» / «Sat, Nov 17, 2026» / «Sat, Nov 17» / «Saturday, Nov 17»
const DATE_OPTIONS: Record<Lang, Record<DateStyle, Intl.DateTimeFormatOptions>> = {
  fa: {
    short: { day: "numeric", month: "short", timeZone: IRAN_TZ },
    medium: { day: "numeric", month: "long", year: "numeric", timeZone: IRAN_TZ },
    // weekday + year در برخی ICUها ترتیب فارسی را می‌شکند؛ به همین دلیل «long» دستی ترکیب می‌شود.
    long: { day: "numeric", month: "long", year: "numeric", timeZone: IRAN_TZ },
    dayMonth: { weekday: "short", day: "numeric", month: "short", timeZone: IRAN_TZ },
    weekdayDayMonth: { weekday: "long", day: "numeric", month: "long", timeZone: IRAN_TZ },
  },
  en: {
    short: { day: "numeric", month: "short", timeZone: IRAN_TZ },
    medium: { year: "numeric", month: "short", day: "numeric", timeZone: IRAN_TZ },
    long: { year: "numeric", month: "short", day: "numeric", timeZone: IRAN_TZ },
    dayMonth: { weekday: "short", day: "numeric", month: "short", timeZone: IRAN_TZ },
    weekdayDayMonth: { weekday: "long", day: "numeric", month: "long", timeZone: IRAN_TZ },
  },
};

const PART_JOIN: Record<Lang, string> = { fa: "، ", en: ", " };
// ترکیب روزهفته + تاریخ کامل: در فارسی با فاصله، در انگلیسی با ویرگول.
const WEEKDAY_JOIN: Record<Lang, string> = { fa: " ", en: ", " };

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function cachedFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }
  return formatter;
}

function toDate(input: DateInput): Date | null {
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** تاریخ خوانا؛ fa همیشه شمسی با ارقام فارسی، en میلادی. ورودی نامعتبر → رشتهٔ خالی. */
export function formatDate(input: DateInput, lang: Lang = "fa", style: DateStyle = "medium"): string {
  const date = toDate(input);
  if (!date) return "";
  const locale = lang === "fa" ? FA_LOCALE : EN_LOCALE;
  const options = DATE_OPTIONS[lang][style];
  if (style !== "long") {
    return cachedFormatter(locale, options).format(date);
  }
  // «long»: روزهفته + تاریخ کامل — دستی ترکیب می‌شود تا ترتیب فارسی در همه ICUها تضمین شود.
  const weekday = cachedFormatter(locale, { weekday: "long", timeZone: IRAN_TZ }).format(date);
  const datePart = cachedFormatter(locale, options).format(date);
  return `${weekday}${WEEKDAY_JOIN[lang]}${datePart}`;
}

/** فقط ساعت (۲۴ساعته) — «۱۴:۳۰». ورودی نامعتبر → رشتهٔ خالی. */
export function formatTime(input: DateInput, lang: Lang = "fa"): string {
  const date = toDate(input);
  if (!date) return "";
  return cachedFormatter(lang === "fa" ? FA_LOCALE : EN_LOCALE, TIME_OPTIONS).format(date);
}

/** تاریخ + ساعت — «۲۶ آبان ۱۴۰۴، ۱۴:۳۰». ورودی نامعتبر → رشتهٔ خالی. */
export function formatDateTime(input: DateInput, lang: Lang = "fa", style: DateStyle = "medium"): string {
  const date = toDate(input);
  if (!date) return "";
  const datePart = formatDate(date, lang, style);
  const timePart = formatTime(date, lang);
  if (!timePart) return datePart;
  return `${datePart}${PART_JOIN[lang]}${timePart}`;
}

/** تاریخ «YYYY-MM-DD» بدون ساعت (ستون local_date سرور) — با T00:00:00Z قطعی می‌شود تا
 *  در timezone تهران همان روز بماند و شمسی درست برگردد. ورودی نامعتبر → رشتهٔ خالی. */
export function formatLocalDate(localDate: string, lang: Lang = "fa", style: DateStyle = "medium"): string {
  const trimmed = localDate?.trim() ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return "";
  return formatDate(new Date(`${trimmed}T00:00:00Z`), lang, style);
}

/** عدد خوانا — fa با ارقام فارسی (۲٫۵)، en با ارقام لاتین (2.5). فرمترها کش می‌شوند. */
const numberFormatterCache = new Map<string, Intl.NumberFormat>();

function cachedNumberFormatter(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options ?? null)}`;
  let formatter = numberFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options);
    numberFormatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatNumber(
  value: number,
  lang: Lang = "fa",
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return "";
  return cachedNumberFormatter(lang === "fa" ? "fa-IR" : "en-US", options).format(value);
}

/** مبلغ + واحد هم‌زبان — باگ persian-dates: عدد و پسوند واحد باید یک‌زبان باشند.
 *  fa: «۱۰۵٬۰۰۰ تومان» / en: «105,000 Toman». */
export function formatPrice(
  value: number,
  lang: Lang = "fa",
  options?: Intl.NumberFormatOptions,
): string {
  const amount = formatNumber(value, lang, options);
  const unit = lang === "fa" ? "تومان" : "Toman";
  if (!amount) return "";
  return `${amount} ${unit}`;
}

/* ── محاسبهٔ timezone تهران (نه نمایش) — باگ persian-dates: حتی این‌ها هم از util مرکزی استفاده می‌کنند ── */

/** ساعت جاری در تهران (۰–۲۳) برای منطق‌هایی مثل سلام ساعت‌محور. */
export function tehranHour(date: DateInput = new Date()): number {
  const d = toDate(date);
  if (!d) return 0;
  const hour = cachedFormatter("en-US", { timeZone: IRAN_TZ, hour: "numeric", hour12: false }).format(d);
  return Number(hour);
}

/** کلید «MM/DD/YYYY» روز در تهران برای مقایسهٔ هم‌روزی. */
export function tehranDayKey(date: DateInput = new Date()): string {
  const d = toDate(date);
  if (!d) return "";
  return cachedFormatter("en-US", {
    timeZone: IRAN_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
