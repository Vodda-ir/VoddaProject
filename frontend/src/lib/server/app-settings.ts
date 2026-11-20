import 'server-only';

/*
 * تنظیمات درون‌اپی وُدّا — پایدار روی فایل JSON در db/ (همان الگوی overlay/stories).
 *
 * بک‌اند اصلی (SERVER_API_URL) کلیدهای خودش را از /admin/settings می‌گیرد؛
 * اما کلیدهای سامانهٔ درون‌اپی (مثل کلید استوری‌ها) باید این‌جا نگه داشته شوند
 * تا بدون تغییر بک‌اند، اپ و سایت هر دو از یک منو بخوانند.
 *
 * خرابی این فروشگاه هرگز صفحهٔ مدیریت را نمی‌شکند — همهٔ مسیرها fail-safe.
 */

import { promises as fs } from 'fs';
import path from 'path';

export type AppSettingsData = {
  version: 1;
  /** کلید استوری‌ها — وقتی false باشد ریل استوری اپ خالی و انتشار بسته می‌شود. */
  stories_enabled: boolean;
};

function emptySettings(): AppSettingsData {
  return { version: 1, stories_enabled: true };
}

const SETTINGS_PATH = path.join(process.cwd(), 'db', 'vodda-app-settings.json');

let cache: { data: AppSettingsData; at: number } | null = null;
const CACHE_TTL_MS = 1_500;
/** زنجیرهٔ نوشتن — جلوگیری از هم‌پوشانی نوشتن‌های هم‌زمان در همان فرایند. */
let writeChain: Promise<void> = Promise.resolve();

async function readFileRaw(): Promise<AppSettingsData> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppSettingsData>;
    if (!parsed || typeof parsed !== 'object') return emptySettings();
    return {
      version: 1,
      stories_enabled: parsed.stories_enabled !== false,
    };
  } catch {
    return emptySettings();
  }
}

async function mutateSettings(mutator: (data: AppSettingsData) => void): Promise<AppSettingsData> {
  const run = writeChain.then(async () => {
    const data = await readFileRaw();
    mutator(data);
    await fs.mkdir(path.dirname(SETTINGS_PATH), { recursive: true });
    const tmp = `${SETTINGS_PATH}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, SETTINGS_PATH);
    cache = { data, at: Date.now() };
    return data;
  });
  writeChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/** کلید استوری‌ها — پیش‌فرض فعال؛ خرابی فایل هرگز «غیرفعال» را جعل نمی‌کند. */
export async function getStoriesEnabled(): Promise<boolean> {
  const data = await readFileRaw();
  return data.stories_enabled;
}

export async function setStoriesEnabled(enabled: boolean): Promise<AppSettingsData> {
  return mutateSettings((data) => {
    data.stories_enabled = enabled === true;
  });
}

/** کلیدهای مجاز تغییر از مسیر ادمین اپ — فقط استوری‌ها برای الان. */
export async function readAppSettings(): Promise<AppSettingsData> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_TTL_MS) return cache.data;
  const data = await readFileRaw();
  cache = { data, at: now };
  return data;
}
