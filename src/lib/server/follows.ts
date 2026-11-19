import 'server-only';

/*
 * فروشگاه دنبال‌کردن اساتید (E2) — پایدار روی فایل JSON در db/.
 *
 * مدل: هر کاربرِ واردشده (فراگیر/استاد/ادمین) می‌تواند هر استاد را دنبال کند؛
 * استوری‌های استاد فقط برای دنبال‌کننده‌های او (و خودش) باز می‌شود.
 * کلید = شناسهٔ کاربر دنبال‌کننده، مقدار = شناسه‌های پروفایل استاد.
 *
 * فایل db/vodda-follows.json گیت‌نخورده است (runtime data — همان الگوی استوری‌ها).
 * خرابی این فروشگاه هرگز صفحهٔ خانه/پروفایل را نمی‌شکند — همهٔ مسیرها fail-safe.
 */

import { promises as fs } from 'fs';
import path from 'path';

export type FollowsData = {
  version: 1;
  /** کلید = uid دنبال‌کننده؛ مقدار = شناسه‌های پروفایل استاد */
  follows: Record<string, string[]>;
};

function emptyFollows(): FollowsData {
  return { version: 1, follows: {} };
}

const FOLLOWS_PATH = path.join(process.cwd(), 'db', 'vodda-follows.json');
/** سقف استادهای دنبال‌شده برای هر کاربر */
const MAX_PER_USER = 500;
/** سقف کلیدها — قدیمی‌ترین‌ها هنگام نوشتن حذف می‌شوند */
const MAX_KEYS = 20_000;

let cache: { data: FollowsData; at: number } | null = null;
const CACHE_TTL_MS = 1_000;
let writeChain: Promise<void> = Promise.resolve();

function isTeacherId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{1,12}$/.test(value);
}

export function normalizeTeacherId(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const raw = String(value);
  return isTeacherId(raw) ? raw : null;
}

async function readFileRaw(): Promise<FollowsData> {
  try {
    const raw = await fs.readFile(FOLLOWS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<FollowsData>;
    if (!parsed || typeof parsed !== 'object' || !parsed.follows || typeof parsed.follows !== 'object') {
      return emptyFollows();
    }
    const follows: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed.follows)) {
      if (!isTeacherId(key) || !Array.isArray(value)) continue;
      const unique = [...new Set(value.filter((item) => isTeacherId(item)))].slice(0, MAX_PER_USER);
      if (unique.length) follows[key] = unique;
    }
    return { version: 1, follows };
  } catch {
    return emptyFollows();
  }
}

async function mutateFollows(mutator: (data: FollowsData) => void): Promise<FollowsData> {
  const run = writeChain.then(async () => {
    const data = await readFileRaw();
    mutator(data);
    await fs.mkdir(path.dirname(FOLLOWS_PATH), { recursive: true });
    const tmp = `${FOLLOWS_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
    await fs.rename(tmp, FOLLOWS_PATH);
    cache = { data, at: Date.now() };
    return data;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readCached(): Promise<FollowsData> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;
  const data = await readFileRaw();
  cache = { data, at: now };
  return data;
}

/* ── خواندن‌ها ── */

/** استادهایی که این کاربر دنبال می‌کند — خطا = [] (fail-safe). */
export async function getFollowsOf(uid: string): Promise<string[]> {
  if (!isTeacherId(uid)) return [];
  try {
    const data = await readCached();
    return [...(data.follows[uid] ?? [])];
  } catch {
    return [];
  }
}

/** آیا این کاربر این استاد را دنبال می‌کند؟ */
export async function isFollowing(uid: string, teacherId: string): Promise<boolean> {
  const follows = await getFollowsOf(uid);
  return follows.includes(teacherId);
}

/** شمار دنبال‌کننده‌های یک استاد — خطا = ۰. */
export async function followerCountOf(teacherId: string): Promise<number> {
  if (!isTeacherId(teacherId)) return 0;
  try {
    const data = await readCached();
    let count = 0;
    for (const list of Object.values(data.follows)) {
      if (list.includes(teacherId)) count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

/* ── نوشتن‌ها ── */

/** دنبال‌کردن استاد — true = اضافه شد، false = از قبل بود. */
export async function followTeacher(uid: string, teacherId: string): Promise<boolean> {
  if (!isTeacherId(uid) || !isTeacherId(teacherId)) return false;
  let added = false;
  await mutateFollows((data) => {
    const list = data.follows[uid] ?? [];
    if (list.includes(teacherId)) return;
    const next = [...list, teacherId].slice(-MAX_PER_USER);
    data.follows[uid] = next;
    added = true;
    // سقف کلیدها — قدیمی‌ترین کلیدها (بر اساس ترتیب درج) حذف می‌شوند
    const keys = Object.keys(data.follows);
    if (keys.length > MAX_KEYS) {
      for (const key of keys.slice(0, keys.length - MAX_KEYS)) {
        delete data.follows[key];
      }
    }
  });
  return added;
}

/** لغو دنبال‌کردن — true = حذف شد، false = از قبل نبود. */
export async function unfollowTeacher(uid: string, teacherId: string): Promise<boolean> {
  if (!isTeacherId(uid) || !isTeacherId(teacherId)) return false;
  let removed = false;
  await mutateFollows((data) => {
    const list = data.follows[uid];
    if (!list || !list.includes(teacherId)) return;
    data.follows[uid] = list.filter((item) => item !== teacherId);
    if (data.follows[uid].length === 0) delete data.follows[uid];
    removed = true;
  });
  return removed;
}
