/*
 * ۱.ب.۱ — منبع واحد «شهر فعلی کاربر» بین اپ (universal-app) و وب (panel).
 *
 * اولویت تشخیص (مشخصات ۱.ب.۱):
 *   ① انتخاب ذخیره‌شدهٔ کاربر (localStorage) — همیشه فوری.
 *   ② GPS — فقط اگر مجوز از قبل داده شده، یا یک‌بار درخواست مجاز (پرچم asked).
 *   ③ شهر پروفایل کاربر (user.city از /me).
 *   ④ «انتخاب شهر» — placeholder قابل کلیک.
 *
 * فقط localStorage؛ هیچ وابستگی به React/Next — در هر دو کلاینت یکسان.
 */

export type UserCitySource = "saved" | "gps";

export type StoredCity = {
  name: string;
  source: UserCitySource;
  /** epoch millis — برای انقضای شهر GPS (۱۲ ساعت؛ شهر انتخابی هرگز منقضی نمی‌شود). */
  at: number;
};

export const CITY_STORAGE_KEY = "vodda-city";
export const CITY_ASK_FLAG_KEY = "vodda-city-asked";
/** شهر GPS پس از ۱۲ ساعت دوباره بی‌صدا بررسی می‌شود (سفر کاربر). */
export const GPS_CITY_TTL = 12 * 60 * 60 * 1000;

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** شهر ذخیره‌شده (اگر معتبر) — بدون هیچ I/O شبکه. */
export function readStoredCity(): StoredCity | null {
  const storage = safeStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(CITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCity>;
    const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
    if (!name) return null;
    return {
      name,
      source: parsed.source === "gps" ? "gps" : "saved",
      at: Number(parsed.at) || 0,
    };
  } catch {
    return null;
  }
}

/** آیا شهر ذخیره‌شده هنوز قابل استفاده است؟ (انتخاب دستی همیشه؛ GPS با TTL) */
export function storedCityUsable(stored: StoredCity | null): boolean {
  if (!stored) return false;
  if (stored.source === "saved") return true;
  return Date.now() - stored.at < GPS_CITY_TTL;
}

export function writeStoredCity(name: string, source: UserCitySource): void {
  const storage = safeStorage();
  if (!storage || !name.trim()) return;
  const record: StoredCity = { name: name.trim(), source, at: Date.now() };
  try {
    storage.setItem(CITY_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* حافظهٔ در دسترس نیست — chip فقط برای همین نشست پابرجا می‌ماند */
  }
}

/** رویداد بین‌کامپوننتی برای هم‌زمان‌شدن chip و فهرست‌ها در همان صفحه (وب). */
export const CITY_CHANGE_EVENT = "vodda-city-changed";

export function notifyCityChanged(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(CITY_CHANGE_EVENT, { detail: name }));
  } catch {
    /* بدون رویداد هم هر کامپوننت پس از mount مقدار می‌خواند */
  }
}

/** پرچم «یک‌بار درخواست مجوز» — مشخصات ۱.ب.۱: درخواست مکرر ممنوع. */
export function markCityPermissionAsked(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    storage.setItem(CITY_ASK_FLAG_KEY, "1");
  } catch {
    /* بی‌اهمیت */
  }
}

export function cityPermissionAsked(): boolean {
  const storage = safeStorage();
  if (!storage) return true; // بدون حافظه، اجازهٔ درخواست دوباره نمی‌دهیم (قاعدهٔ نه‌مکرر)
  try {
    return storage.getItem(CITY_ASK_FLAG_KEY) === "1";
  } catch {
    return true;
  }
}
