import type { PlatformRuntime } from "../../platform/types";
import { searchTeachers } from "./api";
import type { Teacher } from "./types";

// کش ماژول‌سطح فهرست کامل استادان — برای شهرها و پیشنهادهای جایگزین جستجو
const CACHE_TTL = 5 * 60 * 1000;

let allTeachersCache: { data: Teacher[]; at: number } | null = null;

export async function getAllTeachersCached(runtime: PlatformRuntime): Promise<Teacher[]> {
  if (allTeachersCache && Date.now() - allTeachersCache.at < CACHE_TTL) {
    return allTeachersCache.data;
  }
  const items = await searchTeachers(runtime, { limit: 100 });
  allTeachersCache = { data: items, at: Date.now() };
  return items;
}

export async function getTeacherCities(runtime: PlatformRuntime): Promise<string[]> {
  const items = await getAllTeachersCached(runtime);
  return [...new Set(items.map((teacher) => teacher.city.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "fa"),
  );
}
