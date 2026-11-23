// کمکی‌های زمان‌بندی مراسم — پل بین پیکر جلالی و scheduled_at بک‌اند.
//
// مبنای timezone با بک‌اند یکسان است: Asia/Tehran (ایران از ۱۴۰۱ ساعت تابستانی
// ندارد ⇒ آفست ثابت ‎+03:30‎). کاربر «زمان دیواری تهران» را برمی‌گزیند و ما آن
// را به RFC3339 UTC تبدیل می‌کنیم؛ نمایش دوباره با formatJalaliDateTime از
// همان مقدار UTC انجام می‌شود.

import { formatAppDate, persianWeekdayIndex, toJalali } from "../../ui/jalali";

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

export type WhenValue = {
  /** تاریخ محلی به شکل YYYY-MM-DD (میلادی؛ مبنای تبدیل جلالی). */
  localDate: string;
  /** ساعت ۰ تا ۲۳ */
  hh: number;
  /** دقیقه ۰/۱۵/۳۰/۴۵ */
  mm: number;
};

/** برچسب روز هفته به زبان اپ برای یک تاریخ محلی YYYY-MM-DD. */
export function jalaliWeekdayLabel(localDate: string, lang: "fa" | "en" = "fa"): string {
  const parts = localDate.split("-");
  if (parts.length !== 3) return "";
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(date.getTime())) return "";
  const index = persianWeekdayIndex(date.getDay());
  return lang === "en" ? EN_WEEKDAYS_OF_APP[index] ?? "" : FA_WEEKDAYS[index] ?? "";
}

/** برچسب کوتاه به زبان اپ: «جمعه ۲۲ آبان» / «Sat 22 Nov» */
export function jalaliDayLabel(localDate: string, lang: "fa" | "en" = "fa"): string {
  return formatAppDate(localDate, lang, { withYear: false });
}

/** برچسب کامل با سال به زبان اپ */
export function jalaliFullLabel(localDate: string, lang: "fa" | "en" = "fa"): string {
  return formatAppDate(localDate, lang, { withYear: true });
}

export type JalaliDayOption = {
  localDate: string;
  /** نام روز هفته به زبان اپ */
  weekday: string;
  /** برچسب کوتاه تاریخ به زبان اپ */
  dayLabel: string;
  /** کلید گروه‌بندی ماه */
  monthKey: string;
};

/** نام روز هفتهٔ فارسی به کنوانسیون بک‌اند (۰=شنبه … ۶=جمعه) */
const FA_WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"] as const;
const EN_WEEKDAYS_OF_APP = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const;

/** N روز آینده از امروز (به وقت محلی دستگاه) برای ریل انتخاب تاریخ — دوزبانه. */
export function upcomingJalaliDays(count = 45, lang: "fa" | "en" = "fa"): JalaliDayOption[] {
  const options: JalaliDayOption[] = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const weekdayIndex = persianWeekdayIndex(date.getDay());
    const jalali = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    options.push({
      localDate,
      weekday: lang === "en" ? EN_WEEKDAYS_OF_APP[weekdayIndex] ?? "" : FA_WEEKDAYS[weekdayIndex] ?? "",
      dayLabel: formatAppDate(localDate, lang, { withYear: false }),
      monthKey: lang === "en" ? `${date.getFullYear()}-${date.getMonth() + 1}` : String(jalali.jy),
    });
  }
  return options;
}

/** تبدیل «زمان دیواری تهران» به RFC3339 UTC برای scheduled_at بک‌اند. */
export function tehranWallToRfc3339(when: WhenValue): string {
  const wall = `${when.localDate}T${String(when.hh).padStart(2, "0")}:${String(when.mm).padStart(2, "0")}:00+03:30`;
  const date = new Date(wall);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

/** آیا زمان انتخاب‌شده در آینده است؟ (حداقل نیم ساعت دیگر) */
export function isWhenInFuture(when: WhenValue): boolean {
  const iso = tehranWallToRfc3339(when);
  if (!iso) return false;
  return Date.parse(iso) - Date.now() > 15 * 60 * 1000;
}

/** ساعت/دقیقهٔ تهران از ISO UTC — برای پیش‌فرض‌گذاری نمایشی. */
export function tehranClockOf(iso: string): { hh: number; mm: number } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const shifted = new Date(date.getTime() + TEHRAN_OFFSET_MS);
  return { hh: shifted.getUTCHours(), mm: shifted.getUTCMinutes() };
}
