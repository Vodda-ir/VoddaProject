/**
 * phrases.ts — نقشهٔ ترجمهٔ رشته‌به‌رشته (فارسی → انگلیسی).
 *
 * هر صفحه/حوزه یک فرگمنت دارد (i18n/fragments/<area>.ts) که Record<string,string>
 * برمی‌گرداند: کلید = متن فارسیِ دقیقِ داخل کد، مقدار = معادل انگلیسی.
 * L() در ui/appearance.tsx از این نقشه استفاده می‌کند؛ کلیدِ غایب به خودِ
 * متن فارسی برمی‌گردد تا هیچ‌وقت متن خالی دیده نشود.
 */
import areaAuthProfile from "./fragments/auth-profile";
import areaCeremony from "./fragments/ceremony";
import areaHomeSessions from "./fragments/home-sessions";
import areaSearchTeachers from "./fragments/search-teachers";
import areaSessionsBooking from "./fragments/sessions-booking";
import areaTeacherPanel from "./fragments/teacher-panel";
import areaWalletMisc from "./fragments/wallet-misc";
import { hasPersianScript, localizeCityName, transliterateFa } from "./transliterate";

const fragments: Array<Record<string, string>> = [
  areaAuthProfile,
  areaCeremony,
  areaHomeSessions,
  areaSearchTeachers,
  areaSessionsBooking,
  areaTeacherPanel,
  areaWalletMisc,
];

export const phraseMap: Map<string, string> = new Map(
  fragments.flatMap((fragment) => Object.entries(fragment)),
);

/**
 * translateLoose — ترجمهٔ متن‌های پویای سمت بک‌اند که پیشوند ثابت و پسوند
 * متغیر دارند (مثل «درآمد ناخالص جلسه: تلاوت و روخوانی»). اول تطابق کامل،
 * بعد بلندترین کلیدِ پیشوندیِ «…: » و در انتها بازگشت به متن اصلی.
 */
function translateSegment(text: string): string {
  return phraseMap.get(text) ?? (hasPersianScript(text) ? localizeCityName(text, "en") : text);
}

/**
 * گذر «...» — متن‌هایی که عنوان خدمت/فراخوان در گیومه داخلشان است (اعلان‌ها):
 * هر قطعه جداگانه مپ می‌شود و عنوان داخل گیومه هم از phraseMap می‌گیرد.
 */
function translateQuoted(text: string): string | null {
  if (!text.includes("«")) return null;
  const parts = text.split(/(«[^»]*»)/);
  if (parts.length < 2) return null;
  return parts
    .map((part) => {
      if (part.startsWith("«") && part.endsWith("»")) {
        const inner = part.slice(1, -1);
        return "“" + (phraseMap.get(inner) ?? (hasPersianScript(inner) ? transliterateFa(inner) : inner)) + "”";
      }
      return part ? translateSegment(part) : "";
    })
    .join("");
}

export function translateLoose(text: string, lang: "fa" | "en"): string {
  if (lang !== "en" || !text) return text;
  const exact = phraseMap.get(text);
  if (exact) return exact;
  let best: string | null = null;
  for (const key of phraseMap.keys()) {
    if (key.endsWith(": ") && text.startsWith(key) && (best === null || key.length > best.length)) {
      best = key;
    }
  }
  if (best !== null) {
    const rest = text.slice(best.length);
    return (
      (phraseMap.get(best) ?? best) +
      (phraseMap.get(rest) ?? (hasPersianScript(rest) ? localizeCityName(rest, "en") : rest))
    );
  }
  const quoted = translateQuoted(text);
  if (quoted !== null) return quoted;
  // بدون کلید — بازنویسی لاتین تا هیچ نویسهٔ فارسی دیده نشود
  return hasPersianScript(text) ? localizeCityName(text, "en") : text;
}
