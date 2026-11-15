"use client";

// API صفحهٔ جزئیات جلسه — نقش‌آگاه (قرآن‌آموز / استاد)، شامل چت هماهنگی
// و کلیدهای تأیید، رد، پایان جلسه و شمارندهٔ جلسات دیده‌نشدهٔ استاد.

import { asArray, asRecord, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";

export type SessionViewerRole = "learner" | "teacher" | "admin";

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
  viewerRole: SessionViewerRole;
};

export type SessionMessageData = {
  id: number;
  sessionId: number;
  senderId: number;
  body: string;
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
  return {
    id,
    sessionId: integer(row.session_id),
    senderId: integer(row.sender_id),
    body: text(row.body),
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
