import {
  pickRecommendedTeachers,
  RECOMMEND_LIMIT,
} from "@/lib/home/discover";
import type { Teacher } from "../teachers/types";

/*
 * ۱.ب.۵ — fallback محلی «اساتید پیشنهادی» برای اپ نیتیو (وقتی endpoint محلی BFF
 * در دسترس نیست): کش ۳۰ دقیقه‌ای همان چیدمان + قاعدهٔ «تکرار ≤ ۲» با چیدمان قبلی.
 * فقط localStorage؛ هیچ وابستگی به Next — پارتی کامل با وب.
 */

const CACHE_KEY = "vodda-recommended-picks";
/** کش ۳۰ دقیقه‌ای چیدمان (مشخصات ۱.ب.۵). */
const CACHE_TTL = 30 * 60 * 1000;

type CachedPicks = { ids: number[]; at: number };

function readCache(): CachedPicks | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedPicks>;
    if (!Array.isArray(parsed.ids)) return null;
    const ids = parsed.ids.filter((id): id is number => typeof id === "number" && id > 0);
    return { ids, at: Number(parsed.at) || 0 };
  } catch {
    return null;
  }
}

function writeCache(ids: number[]): void {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ids, at: Date.now() } satisfies CachedPicks));
  } catch {
    /* حافظه در دسترس نیست — چیدمان فقط برای همین نشست */
  }
}

/** چیدمان پیشنهادی محلی — تا ۳۰ دقیقه همان چیدمان؛ پس از آن تازه با تکرار ≤ ۲. */
export function localRecommendedPicks(teachers: Teacher[]): Teacher[] {
  if (teachers.length === 0) return [];
  const cached = readCache();
  if (cached && Date.now() - cached.at < CACHE_TTL) {
    const byId = new Map(teachers.map((teacher) => [teacher.id, teacher]));
    const resolved = cached.ids.map((id) => byId.get(id)).filter((teacher): teacher is Teacher => Boolean(teacher));
    if (resolved.length >= Math.min(RECOMMEND_LIMIT, teachers.length)) return resolved;
  }
  const picked = pickRecommendedTeachers(teachers, cached?.ids ?? [], RECOMMEND_LIMIT);
  writeCache(picked.map((teacher) => teacher.id));
  /* عناصر انتخاب‌شده همان شیءهای Teacher ورودی‌اند (انتخاب بدون تبدیل) */
  return picked as Teacher[];
}
