/*
 * حضور آنلاین — منطق واحد چراغ آنلاین استاد در اپ و وب (۱.الف.۴).
 *
 *  - آنلاین = نشانهٔ available فعال و آخرین فعالیتِ دید‌شده در ~۲ دقیقهٔ گذشته.
 *  - آفلاین = قرمز چشمک‌زن (keyframes vodda-presence-red در استایل‌شیت اپ و وب).
 *  - tooltip: «آنلاین» یا «آخرین فعالیت ۱۰ دقیقه پیش» (ارقام فارسی).
 *
 * بدون هیچ وابستگی — پارتی کامل برای Next و Vite/Capacitor.
 */

/** آستانهٔ آنلاین‌ماندن از آخرین فعالیت (~۲ دقیقه). */
export const PRESENCE_STALE_MS = 120_000;

type SeenInput = string | number | null | undefined;

function seenTimestamp(lastSeen: SeenInput): number | null {
  if (lastSeen === null || lastSeen === undefined || lastSeen === "") return null;
  if (typeof lastSeen === "number") return Number.isFinite(lastSeen) ? lastSeen : null;
  const parsed = Date.parse(lastSeen);
  return Number.isNaN(parsed) ? null : parsed;
}

/** آخرین فعالیت در ۲ دقیقهٔ اخیر؟ ورودی نامعتبر/نامشخص → false (نمی‌توان آنلاین دانست). */
export function isRecentlySeen(lastSeen: SeenInput, now: number = Date.now()): boolean {
  const at = seenTimestamp(lastSeen);
  if (at === null) return false;
  return now - at <= PRESENCE_STALE_MS;
}

/**
 * وضعیت مؤثر آنلاین برای نمایش:
 *  - available صریحاً false → همیشه آفلاین.
 *  - lastSeen مشخص → available && فعالیتِ تازه.
 *  - lastSeen نامشخص → رفتار قبلی (فقط available).
 */
export function resolveOnline(available?: boolean | null, lastSeen?: SeenInput, now: number = Date.now()): boolean {
  if (available === false) return false;
  const at = seenTimestamp(lastSeen);
  if (at === null) return Boolean(available);
  return Boolean(available) && isRecentlySeen(at, now);
}

function faDigits(value: string): string {
  return value.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** متن tooltip چراغ — «آنلاین» / «آخرین فعالیت ۱۰ دقیقه پیش» / «آخرین فعالیت امروز ساعت ۱۴:۳۰». */
export function presenceTooltip(online: boolean, lastSeen?: SeenInput, now: number = Date.now()): string {
  if (online) return "آنلاین";
  const at = seenTimestamp(lastSeen);
  if (at === null) return "آخرین فعالیت ثبت نشده";
  const minutes = Math.max(1, Math.round((now - at) / 60_000));
  if (minutes < 60) return `آخرین فعالیت ${faDigits(String(minutes))} دقیقه پیش`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `آخرین فعالیت ${faDigits(String(hours))} ساعت پیش`;
  const date = new Date(at);
  const stamp = new Intl.DateTimeFormat("fa-IR-u-ca-persian-nu-arabext", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
  return `آخرین فعالیت ${stamp}`;
}
