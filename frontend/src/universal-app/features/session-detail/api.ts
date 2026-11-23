"use client";

// API صفحهٔ جزئیات جلسه — نقش‌آگاه (قرآن‌آموز / استاد)، شامل چت هماهنگی
// و کلیدهای تأیید، رد، پایان جلسه و شمارندهٔ جلسات دیده‌نشدهٔ استاد.

import { asArray, asRecord, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";

export type SessionViewerRole = "learner" | "teacher" | "admin";

/** نوع میزبان جلسه — صوتی/متنی/تصویری؛ خالی یعنی جلسهٔ معمولی وُدّا. */
export type SessionHostingMode = "voice" | "text" | "video" | "";

export type SessionDetailData = {
  id: number;
  learnerId: number;
  teacherId: number;
  /** شناسهٔ کاربری استاد — فرستندهٔ پیام‌های او در چت همین است. */
  teacherUserId: number;
  learnerName: string;
  learnerAvatar: string;
  teacherName: string;
  teacherAvatar: string;
  service: string;
  scheduledAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  duration: number;
  price: number;
  status: string;
  note: string;
  rejectNote: string;
  instant: boolean;
  rated: boolean;
  /** نوع جلسهٔ آنلاین: تلفنی (تماس صوتی داخل اپ)، متنی (چت) یا تصویری. */
  mode: SessionHostingMode;
  viewerRole: SessionViewerRole;
};

export type SessionMessageKind = "text" | "audio" | "image";

export type SessionMessageData = {
  id: number;
  sessionId: number;
  senderId: number;
  body: string;
  kind: SessionMessageKind;
  mediaUrl: string;
  /** طول پیام صوتی به میلی‌ثانیه. */
  durationMs: number;
  createdAt: string;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function integer(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function parseSessionDetail(value: unknown): SessionDetailData | null {
  const row = record(value);
  if (!row) return null;
  const id = integer(row.id);
  if (id <= 0) return null;
  const learner = record(row.learner);
  const teacher = record(row.teacher);
  const teacherUser = record(teacher?.user);
  const role = text(row.viewer_role, "learner");
  const rawMode = text(row.mode);
  const mode = rawMode === "voice" || rawMode === "text" || rawMode === "video" ? rawMode : "";
  return {
    id,
    learnerId: integer(row.learner_id),
    teacherId: integer(row.teacher_id ?? teacher?.id),
    teacherUserId: integer(teacher?.user_id),
    learnerName: text(learner?.name, "قرآن‌آموز"),
    learnerAvatar: text(learner?.avatar_url),
    teacherName: text(teacherUser?.name, "استاد"),
    teacherAvatar: text(teacherUser?.avatar_url),
    service: text(row.service ?? row.title),
    scheduledAt: text(row.scheduled_at),
    localDate: text(row.local_date),
    localStart: text(row.local_start),
    localEnd: text(row.local_end),
    duration: integer(row.duration, 30),
    price: integer(row.price),
    status: text(row.status, "pending"),
    note: text(row.note),
    rejectNote: text(row.reject_note),
    instant: row.instant === true,
    rated: row.rated === true,
    mode,
    viewerRole: role === "teacher" ? "teacher" : role === "admin" ? "admin" : "learner",
  };
}

function assertValidSessionId(sessionId: number) {
  if (!Number.isInteger(sessionId) || sessionId <= 0) {
    throw new Error("شناسه جلسه نامعتبر است.");
  }
}

export async function getSessionDetail(
  runtime: PlatformRuntime,
  sessionId: number,
): Promise<SessionDetailData> {
  assertValidSessionId(sessionId);
  const response = await runtime.request<ApiEnvelope>(`/sessions/${sessionId}`);
  const detail = parseSessionDetail(response.data);
  if (!detail) throw new Error("جزئیات جلسه دریافت نشد.");
  return detail;
}

function parseSessionMessage(value: unknown): SessionMessageData | null {
  const row = record(value);
  if (!row) return null;
  const id = integer(row.id);
  if (id <= 0) return null;
  const rawKind = text(row.kind, "text");
  const kind: SessionMessageKind = rawKind === "audio" || rawKind === "image" ? rawKind : "text";
  return {
    id,
    sessionId: integer(row.session_id),
    senderId: integer(row.sender_id),
    body: text(row.body),
    kind,
    mediaUrl: text(row.media_url),
    durationMs: integer(row.duration_ms),
    createdAt: text(row.created_at),
  };
}

export async function getSessionMessages(
  runtime: PlatformRuntime,
  sessionId: number,
): Promise<SessionMessageData[]> {
  assertValidSessionId(sessionId);
  const response = await runtime.request<ApiEnvelope>(`/sessions/${sessionId}/messages`);
  return asArray(response.data)
    .map(parseSessionMessage)
    .filter((item): item is SessionMessageData => item !== null);
}

export async function sendSessionMessage(
  runtime: PlatformRuntime,
  sessionId: number,
  body: string,
): Promise<SessionMessageData | null> {
  assertValidSessionId(sessionId);
  const response = await runtime.request<ApiEnvelope>(`/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  return parseSessionMessage(response.data);
}

/** پیام صوتی (ویس) یا تصویر چت جلسه — آپلود multipart با progress واقعی. */
export async function sendSessionMediaMessage(
  runtime: PlatformRuntime,
  sessionId: number,
  input: { file: Blob; filename: string; kind: "audio" | "image"; durationMs?: number; caption?: string },
): Promise<SessionMessageData | null> {
  assertValidSessionId(sessionId);
  const form = new FormData();
  form.append("kind", input.kind);
  form.append("file", input.file, input.filename);
  if (input.kind === "audio" && input.durationMs) {
    form.append("duration_ms", String(Math.max(1, Math.round(input.durationMs))));
  }
  if (input.caption?.trim()) {
    form.append("body", input.caption.trim().slice(0, 1000));
  }
  const response = await runtime.request<ApiEnvelope>(`/sessions/${sessionId}/messages`, {
    method: "POST",
    body: form,
  });
  return parseSessionMessage(response.data);
}

/** اعلام آماده‌باش شروع جلسه — طرف مقابل اعلان «آمادهٔ جلسه» می‌گیرد. */
export async function announceSessionStart(runtime: PlatformRuntime, sessionId: number): Promise<void> {
  assertValidSessionId(sessionId);
  await runtime.request<ApiEnvelope>(`/sessions/${sessionId}/announce`, { method: "POST" });
}

/** اطلاعات اتصال به کلاس بیگ‌بلوباتن — URL امضاشده فقط سمت سرور ساخته می‌شود. */
export type BbbJoinData = {
  joinUrl: string;
  meetingId: string;
  role: "moderator" | "viewer";
};

export async function getBbbJoin(runtime: PlatformRuntime, sessionId: number): Promise<BbbJoinData> {
  assertValidSessionId(sessionId);
  const response = await runtime.request<ApiEnvelope>(`/bbb/sessions/${sessionId}/join`);
  const row = record(response.data);
  const joinUrl = text(row?.join_url);
  if (!joinUrl) throw new Error("لینک ورود به بیگ‌بلوباتن دریافت نشد.");
  const rawRole = text(row?.role, "viewer");
  return {
    joinUrl,
    meetingId: text(row?.meeting_id),
    role: rawRole === "moderator" ? "moderator" : "viewer",
  };
}

/** آیا پیام، ارسالِ خودِ نمایشگر است؟ (پیام استاد با user_id او ثبت می‌شود) */
export function isMyMessage(message: SessionMessageData, detail: SessionDetailData): boolean {
  if (detail.viewerRole === "teacher" || detail.viewerRole === "admin") {
    return message.senderId === detail.teacherUserId;
  }
  return message.senderId === detail.learnerId;
}

export async function acceptTeacherSession(
  runtime: PlatformRuntime,
  sessionId: number,
): Promise<void> {
  assertValidSessionId(sessionId);
  await runtime.request<ApiEnvelope>(`/teacher/sessions/${sessionId}/accept`, { method: "POST" });
}

export async function rejectTeacherSession(
  runtime: PlatformRuntime,
  sessionId: number,
  reason: string,
): Promise<void> {
  assertValidSessionId(sessionId);
  await runtime.request<ApiEnvelope>(`/teacher/sessions/${sessionId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason: reason.trim() }),
  });
}

export async function completeTeacherSession(
  runtime: PlatformRuntime,
  sessionId: number,
): Promise<void> {
  assertValidSessionId(sessionId);
  await runtime.request<ApiEnvelope>(`/teacher/sessions/${sessionId}/complete`, { method: "POST" });
}

export async function cancelSessionAsLearner(
  runtime: PlatformRuntime,
  sessionId: number,
): Promise<void> {
  assertValidSessionId(sessionId);
  await runtime.request<ApiEnvelope>(`/sessions/${sessionId}/cancel`, { method: "POST" });
}

/** شمارندهٔ قرمز جلسات ثبت‌شده و دیده‌نشدهٔ استاد. */
export async function getTeacherUnseenSessionCount(runtime: PlatformRuntime): Promise<number> {
  const response = await runtime.request<ApiEnvelope>("/teacher/sessions/unseen-count");
  const row = record(response.data);
  const count = integer(row?.count);
  return count > 0 ? count : 0;
}
