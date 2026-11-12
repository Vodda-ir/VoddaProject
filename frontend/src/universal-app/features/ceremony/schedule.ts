// کمکی‌های زمان‌بندی مراسم — پل بین پیکر جلالی و scheduled_at بک‌اند.
//
// مبنای timezone با بک‌اند یکسان است: Asia/Tehran (ایران از ۱۴۰۱ ساعت تابستانی
// ندارد ⇒ آفست ثابت ‎+03:30‎). کاربر «زمان دیواری تهران» را برمی‌گزیند و ما آن
// را به RFC3339 UTC تبدیل می‌کنیم؛ نمایش دوباره با formatJalaliDateTime از
// همان مقدار UTC انجام می‌شود.

import { formatJalaliDate, persianWeekdayIndex, persianWeekdayName, toJalali } from "../../ui/jalali";

const TEHRAN_OFFSET_MS = 3.5 * 60 * 60 * 1000;

export type WhenValue = {
  /** تاریخ محلی به شکل YYYY-MM-DD (میلادی؛ مبنای تبدیل جلالی). */
  localDate: string;
  /** ساعت ۰ تا ۲۳ */
  hh: number;
  /** دقیقه ۰/۱۵/۳۰/۴۵ */
  mm: number;
};

/** برچسب روز هفتهٔ فارسی برای یک تاریخ محلی YYYY-MM-DD. */
export function jalaliWeekdayLabel(localDate: string): string {
  const parts = localDate.split("-");
  if (parts.length !== 3) return "";
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(date.getTime())) return "";
  return persianWeekdayName(persianWeekdayIndex(date.getDay()));
}

/** برچسب کوتاه جلالی: «جمعه ۲۲ آبان» */
export function jalaliDayLabel(localDate: string): string {
  return formatJalaliDate(localDate, { withYear: false });
}

/** برچسب کامل جلالی با سال: «۲۲ آبان ۱۴۰۵» */
export function jalaliFullLabel(localDate: string): string {
  return formatJalaliDate(localDate, { withYear: true });
}

export type JalaliDayOption = {
  localDate: string;
  weekday: string;
  dayLabel: string;
  monthKey: string;
};

/** N روز آینده از امروز (به وقت محلی دستگاه) برای ریل انتخاب تاریخ. */
export function upcomingJalaliDays(count = 45): JalaliDayOption[] {
  const options: JalaliDayOption[] = [];
  const start = new Date();
  start.setHours(12, 0, 0, 0);
  for (let index = 0; index < count; index += 1) {
    const date = new Date(start.getTime() + index * 24 * 60 * 60 * 1000);
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const jalali = toJalali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    options.push({
      localDate,
      weekday: jalaliWeekdayLabel(localDate),
      dayLabel: formatJalaliDate(localDate, { withYear: false }),
      monthKey: String(jalali.jy),
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
