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
import areaTeacherPanel from "./fragments/teacher-panel";
import areaWalletMisc from "./fragments/wallet-misc";

const fragments: Array<Record<string, string>> = [
  areaAuthProfile,
  areaCeremony,
  areaHomeSessions,
  areaSearchTeachers,
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
  if (best === null) return text;
  const rest = text.slice(best.length);
  return (phraseMap.get(best) ?? best) + (phraseMap.get(rest) ?? rest);
}
