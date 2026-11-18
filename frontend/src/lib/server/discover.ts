import 'server-only';

/*
 * ۱.ب.۴ + ۱.ب.۵ — endpoints محلی BFF (بک‌اند اصلی این مسیرها را ندارد).
 *
 *   GET /api/backend/services?is_free=true&limit=6&sort_by=teacher_rank
 *       → کارت‌های خدمات رایگان مرتب بر پایهٔ rank استاد.
 *   GET /api/backend/teachers/recommended?limit=7
 *       → چیدمان اساتید پیشنهادی (۱.ب.۵) با کش ۳۰ دقیقه‌ای دادهٔ سنگین
 *         و تکرار ≤ ۲ نسبت به پاسخ قبلی (تازه‌سازی → چیدمان متفاوت).
 *
 * امتیاز نامزدها از موتور گیمیفیکیشن (deriveBaselinePoints) می‌آید — همان
 * آستانهٔ ۵۰ (سطح «فعال»). درجه ۱ از overlay همان پروژه غنی‌سازی می‌شود.
 */

import { enrichTeacherPayload } from './tier1';
import { ensureScoreForTeacher } from './gamification';
import { freeServiceCards, pickRecommendedTeachers, type DiscoverTeacherLike } from '@/lib/home/discover';

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');
const DATA_CACHE_TTL = 30 * 60 * 1000; // کش ۳۰ دقیقه‌ای دادهٔ سنگین (مشخصات ۱.ب.۵)

type CachedData = {
  teachers: DiscoverTeacherLike[];
  at: number;
};

let cache: CachedData | null = null;
let inflight: Promise<CachedData> | null = null;

/** آخرین چیدمان پاسخ‌داده‌شده — برای قاعدهٔ «تکرار ≤ ۲». */
let lastPicks: number[] = [];

async function fetchRawTeachers(): Promise<DiscoverTeacherLike[]> {
  const response = await fetch(`${API_BASE}/teachers?limit=100`, {
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`teachers request failed: ${response.status}`);
  const payload = (await response.json()) as { data?: unknown };
  const rows = Array.isArray(payload?.data) ? payload.data : [];
  /* غنی‌سازی درجه ۱ (۱.الف.۵) + بذر امتیاز گیمیفیکیشن برای نامزدهای ≥ ۵۰ */
  const enriched = (await enrichTeacherPayload(rows)) as DiscoverTeacherLike[];
  for (const teacher of enriched) {
    if (typeof teacher.id !== 'number' || teacher.id <= 0) continue;
    try {
      const state = await ensureScoreForTeacher({
        id: teacher.id,
        bio: typeof teacher.bio === 'string' ? teacher.bio : null,
        avatar_url: typeof teacher.avatar_url === 'string' ? teacher.avatar_url : null,
        sessions: typeof teacher.sessions === 'number' ? teacher.sessions : 0,
        services: Array.isArray(teacher.services) ? (teacher.services as Array<{ price?: number }>) : null,
      });
      (teacher as { discovery_points?: number }).discovery_points = state.points;
    } catch {
      /* امتیاز در دسترس نیست — discoveryScore قرینهٔ محلی را حساب می‌کند */
    }
  }
  return enriched;
}

/** دادهٔ استادان با کش ۳۰ دقیقه‌ای — خطا هرگز پاسخ endpoint را نمی‌سازد مگر بار اول. */
async function discoverTeachers(): Promise<CachedData> {
  if (cache && Date.now() - cache.at < DATA_CACHE_TTL) return cache;
  if (!inflight) {
    inflight = fetchRawTeachers()
      .then((teachers) => {
        cache = { teachers, at: Date.now() };
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export type RecommendedPayload = {
  data: DiscoverTeacherLike[];
  total: number;
};

/** ۱.ب.۵ — هر درخواست چیدمان تازه با تکرار ≤ ۲ نسبت به پاسخ قبلی. */
export async function getRecommendedTeachers(limit = 7): Promise<RecommendedPayload> {
  const { teachers } = await discoverTeachers();
  const picked = pickRecommendedTeachers(teachers, lastPicks, limit);
  lastPicks = picked.map((teacher) => teacher.id);
  return { data: picked, total: picked.length };
}

export type FreeServicesPayload = {
  data: ReturnType<typeof freeServiceCards>;
  total: number;
};

/** ۱.ب.۴ — کارت‌های خدمات رایگان (sort_by=teacher_rank). */
export async function getFreeServices(limit = 6): Promise<FreeServicesPayload> {
  const { teachers } = await discoverTeachers();
  const cards = freeServiceCards(teachers, new Map(), Math.max(0, limit));
  return { data: cards, total: cards.length };
}

/** فهرست کامل خدمات رایگان برای صفحهٔ /free-services (بدون حد). */
export async function getAllFreeServices(): Promise<FreeServicesPayload> {
  return getFreeServices(0);
}
