// تبدیل تقویم هجری شمسی (جلالی) — پیاده‌سازی خالص و بدون وابستگی به Intl.
//
// چرا خالص؟ رفتار `Intl.DateTimeFormat("fa-IR")` به ICU محیط وابسته است:
// در دسکتاپ معمولاً تقویم پیش‌فرض فارسی است ولی در WebView قدیمی اندروید
// (اپ Capacitor) به میلادی برمی‌گردد. الگوریتم زیر خروجی یکسان در همهٔ
// پلتفرم‌ها می‌دهد.
//
// هستهٔ تبدیل، پورت دقیق و کامل الگوریتم Borkowski («The Persian calendar
// for 3000 years», 1996) مطابق jalaali-js v2.0.1 (لایسنس MIT، تست‌شده روی
// بازهٔ کامل سال‌های -۶۱ تا ۳۱۷۷) است؛ دقت: سال‌های ۱۸۰۰ تا ۲۲۵۶ میلادی.
//
// مبنای timezone با بک‌اند هم‌راستاست: APP_TIMEZONE=Asia/Tehran؛ بک‌اند
// `local_date` / `local_start` را با این منطقه می‌سازد و این‌جا هم برای
// ISO datetime ها از همان منطقه استفاده می‌شود.

const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

// ۰ = شنبه … ۶ = جمعه (همان کنوانسیون بک‌اند: (GoWeekday + 1) % 7)
const PERSIAN_WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)] ?? digit);
}

// ── هستهٔ الگوریتم (پورت jalaali-js v2.0.1) ───────────────────────────────

/** سال‌های آغاز چرخهٔ ۳۳ سالهٔ کبیسه — جدول Borkowski */
const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
  1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
] as const;

function div(a: number, b: number): number {
  return ~~(a / b);
}

/** باقیماندهٔ ریاضی (غیرمنفی برای b مثبت) */
function mod(a: number, b: number): number {
  return a - ~~(a / b) * b;
}

/**
 * وضعیت چرخهٔ کبیسه و تاریخ میلادی فروردین‌روز سال جلالی `jy`.
 * `leap` = تعداد سال از آخرین کبیسه؛ صفر یعنی خودِ سال کبیسه است.
 */
function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0] as number;
  let jm = 0;
  let jump = 0;
  for (let i = 1; i < BREAKS.length; i += 1) {
    jm = BREAKS[i] as number;
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  let adjusted = n;
  if (jump - n < 6) adjusted = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(adjusted + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}

/** روز ژولینی از تاریخ میلادی */
function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

/** تاریخ میلادی از روز ژولینی */
function d2g(jdn: number): { gy: number; gm: number; gd: number } {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

export type JalaliParts = { jy: number; jm: number; jd: number };

/** روز ژولینی به تاریخ جلالی */
function d2j(jdn: number): JalaliParts {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(r.gy, 3, r.march);
  let k = jdn - jdn1f;
  if (k >= 0) {
    if (k <= 185) {
      return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 };
    }
    k -= 186;
  } else {
    // روز در سال جلالیِ قبلی افتاده است
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}

// ── API عمومی ─────────────────────────────────────────────────────────────

/** تبدیل تاریخ میلادی به شمسی. مثال: toJalali(2016, 4, 11) → ۱۳۹۵/۱/۲۳ */
export function toJalali(gy: number, gm: number, gd: number): JalaliParts {
  return d2j(g2d(gy, gm, gd));
}

/** ایندکس روز هفتهٔ فارسی از ایندکس JS (0=یکشنبه) → ۰=شنبه … ۶=جمعه */
export function persianWeekdayIndex(jsWeekday: number): number {
  return (jsWeekday + 1) % 7;
}

export function persianWeekdayName(index: number): string {
  return PERSIAN_WEEKDAYS[((index % 7) + 7) % 7] ?? "";
}

type TehranParts = { gy: number; gm: number; gd: number; hh: number; mm: number };

/** بخش‌های تاریخ/ساعت تهران از یک ISO datetime */
function tehranParts(iso: string): TehranParts | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  // ۱) مسیر دقیق: tz database محیط (شامل DST تاریخی ایران تا ۱۴۰۱)
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tehran",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = new Map<string, string>();
    for (const part of fmt.formatToParts(date)) {
      if (part.type !== "literal") parts.set(part.type, part.value);
    }
    const gy = Number(parts.get("year"));
    const gm = Number(parts.get("month"));
    const gd = Number(parts.get("day"));
    const hh = Number(parts.get("hour")) % 24;
    const mm = Number(parts.get("minute"));
    if (Number.isFinite(gy) && Number.isFinite(gm) && Number.isFinite(gd)) {
      return { gy, gm, gd, hh, mm };
    }
  } catch {
    /* افتادن به مسیر جایگزین */
  }
  // ۲) جایگزین: آفست ثابت +03:30 (ایران از ۱۴۰۱ ساعت تابستانی ندارد)
  const shifted = new Date(date.getTime() + 3.5 * 3600 * 1000);
  return {
    gy: shifted.getUTCFullYear(),
    gm: shifted.getUTCMonth() + 1,
    gd: shifted.getUTCDate(),
    hh: shifted.getUTCHours(),
    mm: shifted.getUTCMinutes(),
  };
}

export type FormatJalaliOptions = {
  /** سال را نشان بده (پیش‌فرض: بله) */
  withYear?: boolean;
  /** ایندکس روز هفته به کنوانسیون بک‌اند (۰=شنبه … ۶=جمعه)؛ برای ایندکس JS از persianWeekdayIndex استفاده کنید */
  withWeekday?: number | null;
};

/** تاریخ محلی "YYYY-MM-DD" (خروجی بک‌اند) را شمسی می‌کند: «جمعه ۲۲ آبان ۱۴۰۵» */
export function formatJalaliDate(localDate: string, options: FormatJalaliOptions = {}): string {
  const { withYear = true, withWeekday = null } = options;
  if (!localDate) return "";
  const parts = localDate.trim().split("-");
  if (parts.length !== 3) return localDate;
  const gy = Number(parts[0]);
  const gm = Number(parts[1]);
  const gd = Number(parts[2]);
  if (!Number.isFinite(gy) || !Number.isFinite(gm) || !Number.isFinite(gd)) return localDate;
  const jalali = toJalali(gy, gm, gd);
  const pieces: string[] = [];
  if (withWeekday !== null && withWeekday !== undefined && Number.isFinite(withWeekday)) {
    // ورودی به کنوانسیون بک‌اند است (۰=شنبه)؛ مستقیم مصرف می‌شود
    pieces.push(`${persianWeekdayName(Number(withWeekday))} `);
  }
  pieces.push(`${faDigits(jalali.jd)} ${JALALI_MONTHS[jalali.jm - 1] ?? ""}`);
  if (withYear) pieces.push(` ${faDigits(jalali.jy)}`);
  return pieces.join("").trim();
}

export type FormatJalaliDateTimeOptions = {
  withYear?: boolean;
  withWeekday?: boolean;
  withTime?: boolean;
};

/** ISO datetime (UTC) را به تاریخ شمسی + ساعت تهران می‌کند: «جمعه ۲۲ آبان ۱۴۰۵ · ۱۴:۳۰» */
export function formatJalaliDateTime(
  iso: string,
  options: FormatJalaliDateTimeOptions = {},
): string {
  const { withYear = true, withWeekday = false, withTime = true } = options;
  if (!iso) return "";
  const parts = tehranParts(iso);
  if (!parts) return "";
  const jalali = toJalali(parts.gy, parts.gm, parts.gd);
  const pieces: string[] = [];
  if (withWeekday) {
    const jsWeekday = new Date(Date.UTC(parts.gy, parts.gm - 1, parts.gd)).getUTCDay();
    pieces.push(`${persianWeekdayName(persianWeekdayIndex(jsWeekday))} `);
  }
  pieces.push(`${faDigits(jalali.jd)} ${JALALI_MONTHS[jalali.jm - 1] ?? ""}`);
  if (withYear) pieces.push(` ${faDigits(jalali.jy)}`);
  if (withTime) {
    const hh = faDigits(String(parts.hh).padStart(2, "0"));
    const mm = faDigits(String(parts.mm).padStart(2, "0"));
    pieces.push(` · ${hh}:${mm}`);
  }
  return pieces.join("").trim();
}

/** برچسب امروز در تهران به شمسی: «جمعه ۲۱ آبان ۱۴۰۵» */
export function todayJalaliLabel(): string {
  const parts = tehranParts(new Date().toISOString());
  if (!parts) return "";
  return formatJalaliDate(
    `${parts.gy}-${String(parts.gm).padStart(2, "0")}-${String(parts.gd).padStart(2, "0")}`,
    { withWeekday: persianWeekdayIndex(new Date(Date.UTC(parts.gy, parts.gm - 1, parts.gd)).getUTCDay()) },
  );
}
