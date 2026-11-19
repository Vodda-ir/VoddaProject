import { asArray, asNumber, asString, type ApiEnvelope } from "../../platform/api";
import type { PlatformRuntime } from "../../platform/types";

/* ═══ E3 — APIهای مدیریت سامانه (درون‌اپی) ═══
 * مسیرهای /admin/* با توکن جلسه از BFF به بک‌اند اصلی prox می‌شوند و بک‌اند
 * فقط نقش ادمین را می‌پذیرد (fail-closed). همهٔ پاسخ‌ها با پارسینگ متحمل
 * خوانده می‌شوند تا تغییر شکل کوچکِ پاسخ، صفحهٔ مدیریت را نشکند. */

export type AdminDashboard = {
  learners: number;
  teachers: number;
  pendingTeachers: number;
  sessions: number;
  doneSessions: number;
  chargeVolume: number;
  commission: number;
};

export type AdminTeacherRow = {
  id: number;
  userId: number;
  name: string;
  field: string;
  city: string;
  /** pending | approved | rejected */
  status: string;
  verified: boolean;
  tier: string;
  rating: number;
  sessions: number;
  createdAt: string;
};

export type AdminUserRow = {
  id: number;
  name: string;
  mobile: string;
  role: string;
  city: string;
  active: boolean;
  wallet: number;
  createdAt: string;
};

export type AdminList<T> = {
  rows: T[];
  total: number;
};

function dataOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function listFrom<T>(value: unknown, parse: (row: Record<string, unknown>) => T | null): AdminList<T> {
  const record = dataOf(value);
  const rows = asArray(record.data ?? record.items ?? record.rows)
    .map((row) => (row && typeof row === "object" ? parse(row as Record<string, unknown>) : null))
    .filter((row): row is T => row !== null);
  const total = asNumber(record.total);
  return { rows, total: Number.isFinite(total) && total > 0 ? total : rows.length };
}

/* ── داشبورد ── */

export async function fetchAdminDashboard(runtime: PlatformRuntime): Promise<AdminDashboard> {
  const response = await runtime.request<ApiEnvelope>("/admin/dashboard");
  const data = dataOf(response.data);
  return {
    learners: asNumber(data.learners),
    teachers: asNumber(data.teachers),
    pendingTeachers: asNumber(data.pending_teachers),
    sessions: asNumber(data.sessions),
    doneSessions: asNumber(data.done_sessions),
    chargeVolume: asNumber(data.charge_volume),
    commission: asNumber(data.commission),
  };
}

/* ── اساتید ── */

function parseAdminTeacher(row: Record<string, unknown>): AdminTeacherRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const user = dataOf(row.user);
  const name = asString(user.name) || asString(row.name);
  return {
    id,
    userId: asNumber(row.user_id),
    name: name || `استاد ${id}`,
    field: asString(row.field),
    city: asString(row.city),
    status: asString(row.status) || "pending",
    verified: row.verified === true,
    tier: asString(row.tier),
    rating: asNumber(row.rating),
    sessions: asNumber(row.sessions),
    createdAt: asString(row.created_at),
  };
}

export async function fetchAdminTeachers(
  runtime: PlatformRuntime,
  params: { status?: string; q?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminTeacherRow>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 30));
  search.set("offset", String(params.offset ?? 0));
  const response = await runtime.request<ApiEnvelope>(`/admin/teachers?${search.toString()}`);
  return listFrom(response, parseAdminTeacher);
}

/** تأیید یا رد استاد — فقط ادمین؛ خطا پیام فارسی دارد. */
export async function reviewAdminTeacher(runtime: PlatformRuntime, id: number, approve: boolean): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/teachers/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ approve }),
  });
}

/* ── کاربران ── */

function parseAdminUser(row: Record<string, unknown>): AdminUserRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  return {
    id,
    name: asString(row.name) || `کاربر ${id}`,
    mobile: asString(row.mobile),
    role: asString(row.role) || "learner",
    city: asString(row.city),
    active: row.active !== false,
    wallet: asNumber(row.wallet),
    createdAt: asString(row.created_at),
  };
}

export async function fetchAdminUsers(
  runtime: PlatformRuntime,
  params: { role?: string; q?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminUserRow>> {
  const search = new URLSearchParams();
  if (params.role) search.set("role", params.role);
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 30));
  search.set("offset", String(params.offset ?? 0));
  const response = await runtime.request<ApiEnvelope>(`/admin/users?${search.toString()}`);
  return listFrom(response, parseAdminUser);
}

/** فعال/غیرفعال‌کردن حساب کاربر — فقط ادمین. */
export async function setAdminUserActive(runtime: PlatformRuntime, id: number, active: boolean): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/users/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ active }),
  });
}
