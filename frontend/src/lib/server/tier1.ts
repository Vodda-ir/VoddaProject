import 'server-only';

/*
 * منطق «کارت درجه ۱» (۱.الف.۵) — سمت سرور BFF.
 *
 * درجه ۱ = حداقل ۲ شرط از:
 *   ۱) تیک بین‌المللی (tier === 'international')
 *   ۲) خدمات رایگان فعال (حداقل یک خدمت با price === 0)
 *   ۳) جلسات فوری + امتیاز ≥ آستانه (TIER1_SCORE_THRESHOLD)
 *
 * پرچم ادمین (teacher_flags) بر محاسبهٔ خودکار مقدم است:
 *   true → همیشه درجه ۱، false → هرگز، بدون پرچم → خودکار.
 */

import { ensureScoreForTeacher, TIER1_SCORE_THRESHOLD } from './gamification';
import { getTier1Flag } from './overlay';

type TeacherShape = {
  id?: number | string;
  tier?: string | null;
  available?: boolean | null;
  /** فیلدهای واقعی بک‌اند برای خدمات رایگان / جلسات فوری (در صورت حضور، مقدم‌اند). */
  free_enabled?: boolean | null;
  instant_enabled?: boolean | null;
  services?: Array<{ price?: number | null; active?: boolean | null }> | null;
};

/** ردیف نشان‌های درجه ۱ — 🟦 تیک بین‌المللی، 🆓 خدمات رایگان، ⚡ جلسات فوری. */
export function computeTier1Badges(teacher: TeacherShape): string[] {
  const badges: string[] = [];
  if (teacher.tier === 'international') badges.push('international');
  const freeService = Array.isArray(teacher.services) && teacher.services.some((service) => Number(service?.price) === 0);
  if (teacher.free_enabled === true || (teacher.free_enabled === undefined && freeService)) badges.push('free');
  const instantCapable =
    teacher.instant_enabled === true || (teacher.instant_enabled === undefined && teacher.available === true);
  if (instantCapable) badges.push('instant');
  return badges;
}

function autoConditions(badges: string[], scorePoints: number): number {
  const instantQualified = badges.includes('instant') && scorePoints >= TIER1_SCORE_THRESHOLD;
  return (
    (badges.includes('international') ? 1 : 0) +
    (badges.includes('free') ? 1 : 0) +
    (instantQualified ? 1 : 0)
  );
}

/** غنی‌سازی یک شیء استاد با is_tier1 + tier1_badges (و بذر امتیاز در صورت نیاز). */
export async function enrichTeacherObject<T extends Record<string, unknown>>(teacher: T): Promise<T> {
  const id = Number(teacher.id);
  if (!Number.isFinite(id) || id <= 0) return teacher;

  let badges: string[] = [];
  let isTier1 = false;
  try {
    const flag = await getTier1Flag(id);
    const score = await ensureScoreForTeacher({
      id,
      bio: typeof teacher.bio === 'string' ? teacher.bio : null,
      avatar_url: typeof (teacher as { avatar_url?: unknown }).avatar_url === 'string' ? (teacher as { avatar_url?: string }).avatar_url : null,
      sessions: typeof teacher.sessions === 'number' ? teacher.sessions : 0,
      services: Array.isArray(teacher.services) ? (teacher.services as Array<{ price?: number }>) : null,
    });
    badges = computeTier1Badges(teacher as TeacherShape);
    if (flag) {
      isTier1 = flag.isTier1;
    } else {
      isTier1 = autoConditions(badges, score.points) >= 2;
    }
  } catch {
    return teacher; // overlay از کار افتاد → پاسخ بک‌اند دست‌نخورده می‌ماند
  }

  return {
    ...teacher,
    is_tier1: isTier1,
    tier1_badges: isTier1 && badges.length ? badges : undefined,
  } as T;
}

/** تشخیص شیء teacher-shaped برای پیاده‌سازی عمومی enrich روی پاسخ بک‌اند. */
export function looksLikeTeacher(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'number' &&
    'tier' in record &&
    ('rating' in record || 'field' in record) &&
    !('scheduled_at' in record)
  );
}

/** مرتب‌سازی پایدار درجه ۱ نخست (is_tier1 desc؛ ترتیب rank حفظ می‌شود). */
export function sortTeacherRowsTier1First<T extends { is_tier1?: boolean }>(rows: T[]): T[] {
  return [...rows].sort(
    (left, right) => Number(right.is_tier1 === true) - Number(left.is_tier1 === true),
  );
}

/** مرتب‌سازی پاسخ کامل بک‌اند — آرایه خام یا پاکت {data: [...]} را پشتیبانی می‌کند. */
export function sortEnvelopeTier1First<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return sortTeacherRowsTier1First(payload as Array<{ is_tier1?: boolean }>) as unknown as T;
  }
  if (payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).data)) {
    const envelope = payload as unknown as { data: unknown[]; [key: string]: unknown };
    return { ...envelope, data: sortTeacherRowsTier1First(envelope.data as Array<{ is_tier1?: boolean }>) } as unknown as T;
  }
  return payload;
}

/** پیاده‌سازی عمومی enrich — آرایه/شیء هر شکل را می‌گردد و فقط استادها را غنی می‌کند. */
export async function enrichTeacherPayload<T>(payload: T): Promise<T> {
  if (Array.isArray(payload)) {
    return (await Promise.all(payload.map((item) => enrichTeacherPayload(item)))) as unknown as T;
  }
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    if (looksLikeTeacher(record)) {
      return (await enrichTeacherObject(record)) as unknown as T;
    }
    const entries = await Promise.all(
      Object.entries(record).map(async ([key, value]) => [key, await enrichTeacherPayload(value)] as const),
    );
    return Object.fromEntries(entries) as unknown as T;
  }
  return payload;
}
