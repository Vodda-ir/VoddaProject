import 'server-only';

/*
 * فروشگاه overlay محلی وُدّا — پایدار روی فایل JSON در db/ (۱.الف.۵ و ۱.الف.۶).
 *
 * چرا؟ بک‌اند اصلی (SERVER_API_URL) قابل‌توسعه از این سندباکس نیست؛ پرچم «درجه ۱» و
 * امتیاز گیمیفیکیشن باید جایی پایدار ذخیره شود. این ماژول همان نقش سه جدول زیر را دارد:
 *   - teacher_flags        → پرچم is_tier1 (تایید ادمین)
 *   - teacher_score        → وضعیت امتیاز هر استاد (points، بالاترین سطح، استریک)
 *   - teacher_score_events → دفتر رویدادهای امتیاز
 *
 * BFF پاسخ بک‌اند را با این overlay غنی‌سازی می‌کند (enrich)؛ خرابی بک‌اند یا این
 * فروشگاه هرگز پاسخ اصلی را نمی‌شکند — همهٔ مسیرها fail-safe هستند.
 */

import { promises as fs } from 'fs';
import path from 'path';

export type Tier1Flag = {
  isTier1: boolean;
  updatedAt: string;
  /** 'admin' = تایید صریح ادمین؛ مقدار auto از این جدول خوانده نمی‌شود. */
  source: 'admin';
};

export type ScoreState = {
  points: number;
  /** بالاترین سطح کسب‌شده — سطح هرگز خودکار کاهش نمی‌یابد. */
  highestLevel: number;
  streakDays: number;
  lastEventAt?: string;
  updatedAt: string;
  /** نحوهٔ نخستین محاسبه (seed از آمار واقعی استاد). */
  seededFrom?: 'teacher_stats';
};

export type ScoreEvent = {
  id: string;
  teacherId: number;
  type: string;
  points: number;
  label?: string;
  createdAt: string;
};

export type OverlayData = {
  version: 1;
  teacher_flags: Record<string, Tier1Flag>;
  teacher_score: Record<string, ScoreState>;
  teacher_score_events: ScoreEvent[];
};

function emptyOverlay(): OverlayData {
  return { version: 1, teacher_flags: {}, teacher_score: {}, teacher_score_events: [] };
}

const OVERLAY_PATH = path.join(process.cwd(), 'db', 'vodda-overlay.json');

let cache: { data: OverlayData; at: number } | null = null;
const CACHE_TTL_MS = 1_500;
/** زنجیرهٔ نوشتن — جلوگیری از هم‌پوشانی نوشتن‌های هم‌زمان در همان فرایند. */
let writeChain: Promise<void> = Promise.resolve();

async function readFileRaw(): Promise<OverlayData | null> {
  try {
    const raw = await fs.readFile(OVERLAY_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<OverlayData>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      version: 1,
      teacher_flags: parsed.teacher_flags ?? {},
      teacher_score: parsed.teacher_score ?? {},
      teacher_score_events: Array.isArray(parsed.teacher_score_events) ? parsed.teacher_score_events : [],
    };
  } catch {
    return null;
  }
}

export async function readOverlay(): Promise<OverlayData> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;
  const data = (await readFileRaw()) ?? emptyOverlay();
  cache = { data, at: now };
  return data;
}

async function mutateOverlay(mutator: (data: OverlayData) => void): Promise<OverlayData> {
  const run = writeChain.then(async () => {
    const data = (await readFileRaw()) ?? emptyOverlay();
    mutator(data);
    await fs.mkdir(path.dirname(OVERLAY_PATH), { recursive: true });
    const tmp = `${OVERLAY_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, OVERLAY_PATH);
    cache = { data, at: Date.now() };
    return data;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/* ── teacher_flags (۱.الف.۵) ── */

export async function getTier1Flag(teacherId: number): Promise<Tier1Flag | null> {
  const overlay = await readOverlay();
  return overlay.teacher_flags[String(teacherId)] ?? null;
}

export async function setTier1Flag(teacherId: number, isTier1: boolean | null): Promise<Tier1Flag | null> {
  const key = String(teacherId);
  return mutateOverlay((data) => {
    if (isTier1 === null) {
      delete data.teacher_flags[key];
      return;
    }
    data.teacher_flags[key] = { isTier1, updatedAt: new Date().toISOString(), source: 'admin' };
  }).then((data) => data.teacher_flags[key] ?? null);
}

export async function listTier1Flags(): Promise<Record<string, Tier1Flag>> {
  const overlay = await readOverlay();
  return overlay.teacher_flags;
}

/* ── teacher_score / teacher_score_events (۱.الف.۶) ── */

export async function getScoreState(teacherId: number): Promise<ScoreState | null> {
  const overlay = await readOverlay();
  return overlay.teacher_score[String(teacherId)] ?? null;
}

export async function upsertScoreState(teacherId: number, state: ScoreState): Promise<ScoreState> {
  const key = String(teacherId);
  await mutateOverlay((data) => {
    data.teacher_score[key] = state;
  });
  return state;
}

export async function addScoreEvent(event: ScoreEvent, nextState: ScoreState): Promise<void> {
  const key = String(event.teacherId);
  await mutateOverlay((data) => {
    data.teacher_score_events.push(event);
    // دفتر رویدادها بدون رشد بی‌حد — آخرین ۵۰۰ رویداد کافی است.
    if (data.teacher_score_events.length > 500) {
      data.teacher_score_events = data.teacher_score_events.slice(-500);
    }
    data.teacher_score[key] = nextState;
  });
}

export async function listScoreEvents(teacherId: number, limit = 10): Promise<ScoreEvent[]> {
  const overlay = await readOverlay();
  return overlay.teacher_score_events
    .filter((event) => event.teacherId === teacherId)
    .slice(-limit)
    .reverse();
}
