import { asArray, asNumber, asString, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";

/* ═══ E1 — استوری‌های مدیر‌محور ═══
 * مسیر BFF محلی /stories — در اپ نیتیو (تماس مستقیم با بک‌اند) وجود ندارد؛
 * فراخوانی‌ها fail-safe هستند تا صفحهٔ خانه هرگز نشکند. */

export type Story = {
  id: string;
  mediaUrl: string;
  caption: string;
  link?: string;
  createdAt: string;
  expiresAt: string;
  views: number;
};

export type CreateStoryPayload = {
  mediaUrl: string;
  caption: string;
  link?: string;
  ttlHours: number;
};

function parseStory(value: unknown): Story | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const id = asString(row.id);
  const mediaUrl = asString(row.media_url ?? row.mediaUrl);
  if (!id.startsWith("st_") || !mediaUrl.startsWith("data:image/")) return null;
  const createdAt = asString(row.created_at ?? row.createdAt);
  const expiresAt = asString(row.expires_at ?? row.expiresAt);
  if (!createdAt || !expiresAt) return null;
  const link = asString(row.link);
  return {
    id,
    mediaUrl,
    caption: asString(row.caption),
    link: /^https?:\/\//i.test(link) ? link : undefined,
    createdAt,
    expiresAt,
    views: Math.max(0, Math.round(asNumber(row.views))),
  };
}

/** استوری‌های زندهٔ عمومی — خطا = [] (ریل پنهان می‌شود). */
export async function fetchStories(runtime: PlatformRuntime): Promise<Story[]> {
  try {
    const response = await runtime.request<ApiEnvelope>("/stories");
    return asArray(response.data)
      .map(parseStory)
      .filter((story): story is Story => story !== null);
  } catch {
    return [];
  }
}

/** فهرست کامل برای مدیر — شامل منقضی‌ها؛ خطا بالادست مدیریت می‌شود. */
export async function fetchAllStoriesAdmin(runtime: PlatformRuntime): Promise<Story[]> {
  const response = await runtime.request<ApiEnvelope>("/stories/all");
  return asArray(response.data)
    .map(parseStory)
    .filter((story): story is Story => story !== null);
}

/** انتشار استوری — فقط ادمین؛ خطای سرور پیام فارسی دارد. */
export async function publishStory(runtime: PlatformRuntime, payload: CreateStoryPayload): Promise<Story> {
  const response = await runtime.request<ApiEnvelope>("/stories", {
    method: "POST",
    body: JSON.stringify({
      media_url: payload.mediaUrl,
      caption: payload.caption,
      link: payload.link ?? "",
      ttl_hours: payload.ttlHours,
    }),
  });
  const story = parseStory(response.data);
  if (!story) throw new Error("پاسخ انتشار استوری معتبر نیست.");
  return story;
}

/** حذف استوری — فقط ادمین. */
export async function removeStory(runtime: PlatformRuntime, id: string): Promise<boolean> {
  try {
    const response = await runtime.request<ApiEnvelope>(`/stories/${id}`, {
      method: "DELETE",
    });
    const data = response.data as { removed?: unknown } | null;
    return data?.removed === true;
  } catch {
    return false;
  }
}

/** شمارش بازدید — best-effort؛ نتیجه نادیده گرفته می‌شود. */
export async function markStoryView(runtime: PlatformRuntime, id: string): Promise<void> {
  try {
    await runtime.request<ApiEnvelope>(`/stories/${id}/view`, { method: "POST" });
  } catch {
    /* بازدید حیاتی نیست */
  }
}
