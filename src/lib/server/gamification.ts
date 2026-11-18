import 'server-only';

/*
 * موتور گیمیفیکیشن وُدّا (۱.الف.۶) — همان سیاست سند «سیاست امتیاز و سطح استاد»
 * (docs/gamification-policy.md). تغییر اعداد فقط همراه همان سند مجاز است.
 *
 *  ۴ سطح: مبتدی ۰–۴۹ / فعال ۵۰–۱۹۹ / حرفه‌ای ۲۰۰–۴۹۹ / برگزیده ۵۰۰+
 *  قواعد: کف امتیاز ۰ — سطح هرگز خودکار کاهش نمی‌یابد — تیک بین‌المللی فقط با تایید ادمین.
 */

import {
  addScoreEvent,
  getScoreState,
  upsertScoreState,
  listScoreEvents,
  type ScoreEvent,
  type ScoreState,
} from './overlay';

export type ScoreLevel = { key: string; min: number; label: string; icon: string };

export const SCORE_LEVELS: ScoreLevel[] = [
  { key: 'beginner', min: 0, label: 'مبتدی', icon: '🌱' },
  { key: 'active', min: 50, label: 'فعال', icon: '📘' },
  { key: 'pro', min: 200, label: 'حرفه‌ای', icon: '🏅' },
  { key: 'elite', min: 500, label: 'برگزیده', icon: '🏆' },
];

/** آستانهٔ امتیاز برای شرط «جلسات فوری + امتیاز ≥ آستانه» در درجه ۱ (۱.الف.۵). */
export const TIER1_SCORE_THRESHOLD = 200;

export type ScoreEventType = {
  points: number;
  label: string;
  /** فقط ادمین/سامانه می‌تواند این رویدادها را ثبت کند. */
  adminOnly?: boolean;
};

/** جدول امتیاز رویدادها — قرینهٔ جدول سند سیاست. */
export const SCORE_EVENTS: Record<string, ScoreEventType> = {
  profile_completed: { points: 20, label: 'تکمیل پروفایل' },
  first_service: { points: 15, label: 'ثبت اولین خدمت' },
  session_completed: { points: 5, label: 'برگزاری جلسه' },
  review_five_star: { points: 8, label: 'نظر پنج‌ستاره' },
  instant_accepted: { points: 6, label: 'پذیرش جلسهٔ فوری' },
  free_service: { points: 10, label: 'خدمت رایگان فعال' },
  review_text: { points: 2, label: 'نظر متنی' },
  streak_7: { points: 10, label: 'استریک ۷روزه', adminOnly: true },
  streak_30: { points: 50, label: 'استریک ۳۰روزه', adminOnly: true },
  ticket_fast_reply: { points: 3, label: 'پاسخ تیکت زیر ۲ ساعت', adminOnly: true },
  teacher_cancel: { points: -15, label: 'لغو جلسه توسط استاد', adminOnly: true },
  complaint: { points: -25, label: 'شکایت تأییدشده', adminOnly: true },
  inactivity_30: { points: -20, label: 'غیرفعالی ۳۰روزه', adminOnly: true },
};

export function levelFor(points: number): { index: number; level: ScoreLevel } {
  let index = 0;
  for (let i = 0; i < SCORE_LEVELS.length; i += 1) {
    if (points >= SCORE_LEVELS[i].min) index = i;
  }
  return { index, level: SCORE_LEVELS[index] };
}

function clampPoints(value: number): number {
  return Math.max(0, Math.round(value));
}

/** ثبت رویداد امتیاز — کف ۰، بدون کاهش سطحِ کسب‌شده. */
export async function applyScoreEvent(
  teacherId: number,
  type: string,
  meta?: Record<string, unknown>,
): Promise<{ state: ScoreState; event: ScoreEvent } | null> {
  const definition = SCORE_EVENTS[type];
  if (!definition) return null;

  const current = (await getScoreState(teacherId)) ?? defaultState();
  const points = clampPoints(current.points + definition.points);
  const levelInfo = levelFor(points);
  const nowIso = new Date().toISOString();

  const state: ScoreState = {
    points,
    // سطح هرگز خودکار کاهش نمی‌یابد.
    highestLevel: Math.max(current.highestLevel, levelInfo.index),
    streakDays: current.streakDays,
    lastEventAt: nowIso,
    updatedAt: nowIso,
    seededFrom: current.seededFrom,
  };

  const event: ScoreEvent = {
    id: `${teacherId}-${type}-${nowIso}`,
    teacherId,
    type,
    points: definition.points,
    label: definition.label,
    createdAt: nowIso,
  };

  void meta;
  await addScoreEvent(event, state);
  return { state, event };
}

function defaultState(): ScoreState {
  return {
    points: 0,
    highestLevel: 0,
    streakDays: 0,
    updatedAt: new Date().toISOString(),
  };
}

type TeacherStatsInput = {
  id: number;
  bio?: string | null;
  avatar_url?: string | null;
  sessions?: number | null;
  reviews?: number | null;
  services?: Array<{ price?: number | null }> | null;
};

/** بذر امتیاز از شمارنده‌های واقعیِ قابل‌اثبات (فقط بار نخست) — جلسات، پروفایل، خدمات. */
export function deriveBaselinePoints(teacher: TeacherStatsInput): number {
  const sessions = Math.max(0, Math.min(500, Math.round(Number(teacher.sessions) || 0)));
  const profileComplete = Boolean(teacher.bio?.trim()) && Boolean(teacher.avatar_url);
  const hasService = Array.isArray(teacher.services) && teacher.services.length > 0;
  return sessions * 5 + (profileComplete ? 20 : 0) + (hasService ? 15 : 0);
}

/**
 * اطمینان از وجود وضعیت امتیاز — اگر هنوز بذر نخورده، از آمار واقعی استاد بذر می‌زند.
 * ورودی می‌تواند payload خام بک‌اند (teacher-shaped) باشد.
 */
export async function ensureScoreForTeacher(teacher: TeacherStatsInput): Promise<ScoreState> {
  const existing = await getScoreState(teacher.id);
  if (existing) return existing;

  const points = clampPoints(deriveBaselinePoints(teacher));
  const levelInfo = levelFor(points);
  const nowIso = new Date().toISOString();
  const state: ScoreState = {
    points,
    highestLevel: levelInfo.index,
    streakDays: 0,
    updatedAt: nowIso,
    seededFrom: 'teacher_stats',
  };
  await upsertScoreState(teacher.id, state);
  return state;
}

export type ScoreSnapshot = {
  points: number;
  level: string;
  levelLabel: string;
  levelIcon: string;
  highestLevel: number;
  streakDays: number;
  /** «هم‌سطح فعلی → سطح بعدی» برای progress bar؛ سطح برگزیده → null. */
  progress: { current: number; next: number; pct: number; nextLabel: string | null };
  events: Array<{ type: string; label: string; points: number; createdAt: string }>;
};

/** خروجی استاندارد برای داشبورد استاد (اپ و وب). */
export async function scoreSnapshot(teacherId: number, eventLimit = 8): Promise<ScoreSnapshot> {
  const state = (await getScoreState(teacherId)) ?? defaultState();
  const { index, level } = levelFor(state.points);
  const displayIndex = Math.max(index, state.highestLevel);
  const currentLevel = SCORE_LEVELS[displayIndex];
  const nextLevel = SCORE_LEVELS[displayIndex + 1] ?? null;

  const span = nextLevel ? nextLevel.min - currentLevel.min : 0;
  const pct = nextLevel && span > 0 ? Math.min(100, Math.max(4, Math.round(((state.points - currentLevel.min) / span) * 100))) : 100;

  const events = await listScoreEvents(teacherId, eventLimit);

  return {
    points: state.points,
    level: currentLevel.key,
    levelLabel: currentLevel.label,
    levelIcon: currentLevel.icon,
    highestLevel: state.highestLevel,
    streakDays: state.streakDays,
    progress: {
      current: state.points,
      next: nextLevel ? nextLevel.min : state.points,
      pct,
      nextLabel: nextLevel ? nextLevel.label : null,
    },
    events: events.map((event) => ({ type: event.type, label: event.label ?? event.type, points: event.points, createdAt: event.createdAt })),
  };
}
