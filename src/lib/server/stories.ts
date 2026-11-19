import 'server-only';

/*
 * فروشگاه استوری وُدّا — پایدار روی فایل JSON در db/ (E1).
 *
 * مدل اینستاگرامی: فقط ادمین سامانه اجازهٔ انتشار دارد (گارد در BFF — role=admin
 * با تأیید امضای توکن نزد بک‌اند اصلی). استوری‌ها تصویری‌اند، مدت نمایش دلخواه
 * و تاریخ انقضا دارند؛ پس از انقضا از ریل عمومی حذف می‌شوند.
 *
 * فایل db/vodda-stories.json گیت‌نخورده است (در .gitignore) تا دادهٔ runtime
 * مدیر در دیپلوی‌ها بازنویسی نشود — همان الگوی پایداری overlay.
 * خرابی این فروشگاه هرگز صفحهٔ خانه را نمی‌شکند — همهٔ مسیرها fail-safe.
 */

import { promises as fs } from 'fs';
import path from 'path';

export type StoredStory = {
  id: string;
  /** data:image/... — تصویر فشرده‌شدهٔ سمت کلاینت (بدون فایل‌سیستم اضافه) */
  media_url: string;
  caption: string;
  /** پیوند اختیاری CTA — فقط http/https */
  link?: string;
  created_at: string;
  expires_at: string;
  views: number;
};

export type StoriesData = {
  version: 1;
  stories: StoredStory[];
};

export type CreateStoryInput = {
  mediaUrl: string;
  caption: string;
  link?: string;
  /** ساعت اعتبار — ۲۴ تا ۷۲۰ (۳۰ روز) */
  ttlHours: number;
};

function emptyStories(): StoriesData {
  return { version: 1, stories: [] };
}

const STORIES_PATH = path.join(process.cwd(), 'db', 'vodda-stories.json');

/** سقف دادهٔ هر استوری — data URL فشردهٔ JPEG (~۱.۵MB base64) */
const MAX_MEDIA_CHARS = 2_100_000;
/** سقف تعداد استوری ذخیره‌شده — قدیمی‌ها هنگام ایجاد حذف می‌شوند */
const MAX_STORIES = 60;

let cache: { data: StoriesData; at: number } | null = null;
const CACHE_TTL_MS = 1_000;
/** زنجیرهٔ نوشتن — جلوگیری از هم‌پوشانی نوشتن‌های هم‌زمان در همان فرایند. */
let writeChain: Promise<void> = Promise.resolve();

function isDataImage(value: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

function safeLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const link = value.trim();
  if (!link) return undefined;
  return /^https?:\/\/[^\s]{2,300}$/i.test(link) ? link : undefined;
}

function cleanCaption(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, 300);
}

function sanitizeStory(raw: Partial<StoredStory>): StoredStory | null {
  if (!raw || typeof raw !== 'object') return null;
  const media = typeof raw.media_url === 'string' && isDataImage(raw.media_url) ? raw.media_url : '';
  if (!media) return null;
  const created = typeof raw.created_at === 'string' && !Number.isNaN(Date.parse(raw.created_at))
    ? raw.created_at
    : new Date().toISOString();
  const expires = typeof raw.expires_at === 'string' && !Number.isNaN(Date.parse(raw.expires_at))
    ? raw.expires_at
    : created;
  return {
    id: typeof raw.id === 'string' && /^[a-z0-9_]{6,40}$/.test(raw.id) ? raw.id : `st_${Date.now().toString(36)}`,
    media_url: media,
    caption: cleanCaption(raw.caption),
    link: safeLink(raw.link),
    created_at: created,
    expires_at: expires,
    views: typeof raw.views === 'number' && Number.isFinite(raw.views) && raw.views >= 0 ? Math.floor(raw.views) : 0,
  };
}

async function readFileRaw(): Promise<StoriesData> {
  try {
    const raw = await fs.readFile(STORIES_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoriesData>;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.stories)) return emptyStories();
    return {
      version: 1,
      stories: parsed.stories
        .map((item) => sanitizeStory(item as Partial<StoredStory>))
        .filter((item): item is StoredStory => item !== null),
    };
  } catch {
    return emptyStories();
  }
}

async function mutateStories(mutator: (data: StoriesData) => void): Promise<StoriesData> {
  const run = writeChain.then(async () => {
    const data = await readFileRaw();
    mutator(data);
    await fs.mkdir(path.dirname(STORIES_PATH), { recursive: true });
    const tmp = `${STORIES_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data), 'utf8');
    await fs.rename(tmp, STORIES_PATH);
    cache = { data, at: Date.now() };
    return data;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/* ── خواندن‌ها ── */

/** استوری‌های زندهٔ عمومی — جدیدترین نخست. */
export async function listActiveStories(): Promise<StoredStory[]> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) {
    return cache.data.stories.filter((story) => Date.parse(story.expires_at) > now).slice(0, 40);
  }
  const data = await readFileRaw();
  cache = { data, at: Date.now() };
  return data.stories
    .filter((story) => Date.parse(story.expires_at) > Date.now())
    .sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at))
    .slice(0, 40);
}

/** فهرست کامل برای مدیر — شامل منقضی‌ها (مدیریت/حذف). */
export async function listAllStories(): Promise<StoredStory[]> {
  const data = await readFileRaw();
  return [...data.stories].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
}

/* ── نوشتن‌ها ── */

export async function createStory(input: CreateStoryInput): Promise<StoredStory> {
  const media = typeof input.mediaUrl === 'string' ? input.mediaUrl.trim() : '';
  if (!isDataImage(media)) {
    throw new Error('رسانهٔ استوری نامعتبر است — فقط تصویر PNG/JPEG/WebP.');
  }
  if (media.length > MAX_MEDIA_CHARS) {
    throw new Error('حجم تصویر بیش از حد مجاز است.');
  }
  const caption = cleanCaption(input.caption);
  if (!caption) {
    throw new Error('متن استوری لازم است.');
  }
  const ttl = Math.round(input.ttlHours);
  if (!Number.isFinite(ttl) || ttl < 1 || ttl > 720) {
    throw new Error('مدت اعتبار باید بین ۱ تا ۷۲۰ ساعت باشد.');
  }
  const link = safeLink(input.link);
  if (typeof input.link === 'string' && input.link.trim() && !link) {
    throw new Error('پیوند نامعتبر است — فقط http/https.');
  }

  const now = new Date();
  const story: StoredStory = {
    id: `st_${now.getTime().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    media_url: media,
    caption,
    link,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttl * 60 * 60 * 1000).toISOString(),
    views: 0,
  };

  await mutateStories((data) => {
    data.stories.push(story);
    if (data.stories.length > MAX_STORIES) {
      // قدیمی‌ترین‌ها حذف می‌شوند تا فایل بی‌حد رشد نکند.
      data.stories.sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at));
      data.stories = data.stories.slice(0, MAX_STORIES);
    }
  });
  return story;
}

export async function deleteStory(id: string): Promise<boolean> {
  if (!/^[a-z0-9_]{6,40}$/.test(id)) return false;
  let removed = false;
  await mutateStories((data) => {
    const before = data.stories.length;
    data.stories = data.stories.filter((story) => story.id !== id);
    removed = data.stories.length < before;
  });
  return removed;
}

export async function incrementStoryViews(id: string): Promise<number | null> {
  if (!/^[a-z0-9_]{6,40}$/.test(id)) return null;
  let views: number | null = null;
  await mutateStories((data) => {
    const story = data.stories.find((item) => item.id === id);
    if (story) {
      story.views += 1;
      views = story.views;
    }
  });
  return views;
}
