// تک‌منبع حلِ آدرس فایل‌های آپلودی (آواتار، نمونه‌صوتی، …).
//
// بک‌اند آدرس‌ها را به‌صورت نسبی («/uploads/avatars/x.jpg») برمی‌گرداند.
// در پلتفرم وب همان مبدأ درست است (Next.js آن را rewrite می‌کند)؛ اما در
// پلتفرم نیتیو (Capacitor) مبدأ سند «capacitor://localhost» است و آدرس نسبی
// تصویر را می‌شکند. با ست‌کردن مبدأ API هنگام ساخت runtime، همهٔ
// <img src> و <audio src> ها از اینجا عبور می‌کنند و همیشه قابل‌نمایش‌اند.

let assetOrigin = "";

function originOf(base: string): string {
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
}

/** در پلتفرم نیتیو صدا زده می‌شود تا آدرس‌های نسبی به مبدأ API بچسبند. */
export function setAssetOriginFromApiBase(apiBaseUrl: string): void {
  assetOrigin = originOf(apiBaseUrl);
}

/** آدرس نسبی آپلودها را به آدرس قابل‌نمایش تبدیل می‌کند. */
export function resolveAssetUrl(url?: string | null): string | undefined {
  const value = (url ?? "").trim();
  if (!value) return undefined;
  if (/^(https?:|blob:|data:)/i.test(value)) return value;
  if (!value.startsWith("/")) return value;
  return assetOrigin ? `${assetOrigin}${value}` : value;
}
