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
