import { asArray, asNumber, asString, type ApiEnvelope } from "../../platform/api";
import { resolveAssetUrl } from "../../platform/asset";
import type { PlatformRuntime } from "../../platform/types";

/* ═══ E3+ — سطح کامل APIهای مدیریت سامانه (درون‌اپی) ═══
 * مسیرهای /admin/* با توکن جلسه از BFF به بک‌اند اصلی prox می‌شوند و بک‌اند
 * فقط نقش ادمین را می‌پذیرد (fail-closed). همهٔ پاسخ‌ها با پارسینگ متحمل
 * خوانده می‌شوند تا تغییر شکل کوچکِ پاسخ، صفحهٔ مدیریت را نشکند.
 * هم‌ارزی کامل با پنل وب: تحلیل، اساتید، کاربران، جلسات، نظرات، خدمات،
 * برداشت‌ها، پشتیبانی، مالی، بلاگ، گزارش عملیات و تنظیمات + کلید استوری‌ها. */

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
  mobile: string;
  field: string;
  tag: string;
  city: string;
  /** pending | approved | rejected */
  status: string;
  verified: boolean;
  tier: string;
  isTier1?: boolean;
  rating: number;
  sessions: number;
  reviews: number;
  price30: number;
  price60: number;
  active: boolean;
  createdAt: string;
};

export type AdminUserRow = {
  id: number;
  name: string;
  mobile: string;
  role: string;
  city: string;
  bio: string;
  active: boolean;
  wallet: number;
  createdAt: string;
  teacherId: number | null;
};

export type AdminList<T> = {
  rows: T[];
  total: number;
};

/* ── تحلیل غنی (هم‌ارز /admin/analytics پنل وب) ── */

export type AdminAnalyticsPoint = {
  date: string;
  newUsers: number;
  newTeachers: number;
  sessionsCreated: number;
  sessionsDone: number;
  charge: number;
  commission: number;
};

export type AdminAnalytics = {
  days: number;
  series: AdminAnalyticsPoint[];
  users: { total: number; learners: number; teachers: number; admins: number; active: number; newWeek: number };
  sessions: { total: number; pending: number; confirmed: number; done: number; canceled: number; rated: number; minutes: number };
  finance: { chargeVolume: number; commission: number; earnings: number; walletLiability: number; pendingWithdrawals: number; pendingWithdrawalAmount: number };
  rating: { avg: number; count: number };
  statusBreakdown: Array<{ status: string; count: number }>;
  fields: Array<{ name: string; count: number }>;
  topTeachers: Array<{ id: number; name: string; field: string; city: string; tier: string; rating: number; reviews: number; doneSessions: number; earned: number }>;
  recentUsers: Array<{ id: number; name: string; role: string; createdAt: string }>;
  recentSessions: Array<{ id: number; title: string; status: string; price: number; scheduledAt: string; learnerName: string; teacherName: string }>;
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

function recordList(value: unknown): Record<string, unknown>[] {
  return asArray(value).filter((row): row is Record<string, unknown> => row !== null && typeof row === "object");
}

function parseAnalytics(value: unknown): AdminAnalytics {
  const data = dataOf(value);
  const users = dataOf(data.users);
  const sessions = dataOf(data.sessions);
  const finance = dataOf(data.finance);
  const rating = dataOf(data.rating);
  return {
    days: asNumber(data.days) || 30,
    series: recordList(data.series).map((point) => ({
      date: asString(point.date),
      newUsers: asNumber(point.new_users),
      newTeachers: asNumber(point.new_teachers),
      sessionsCreated: asNumber(point.sessions_created),
      sessionsDone: asNumber(point.sessions_done),
      charge: asNumber(point.charge),
      commission: asNumber(point.commission),
    })),
    users: {
      total: asNumber(users.total),
      learners: asNumber(users.learners),
      teachers: asNumber(users.teachers),
      admins: asNumber(users.admins),
      active: asNumber(users.active),
      newWeek: asNumber(users.new_week),
    },
    sessions: {
      total: asNumber(sessions.total),
      pending: asNumber(sessions.pending),
      confirmed: asNumber(sessions.confirmed),
      done: asNumber(sessions.done),
      canceled: asNumber(sessions.canceled),
      rated: asNumber(sessions.rated),
      minutes: asNumber(sessions.minutes),
    },
    finance: {
      chargeVolume: asNumber(finance.charge_volume),
      commission: asNumber(finance.commission),
      earnings: asNumber(finance.earnings),
      walletLiability: asNumber(finance.wallet_liability),
      pendingWithdrawals: asNumber(finance.pending_withdrawals),
      pendingWithdrawalAmount: asNumber(finance.pending_withdrawal_amount),
    },
    rating: { avg: asNumber(rating.avg), count: asNumber(rating.count) },
    statusBreakdown: recordList(data.status_breakdown).map((row) => ({
      status: asString(row.status),
      count: asNumber(row.count),
    })),
    fields: recordList(data.fields).map((row) => ({ name: asString(row.name), count: asNumber(row.count) })),
    topTeachers: recordList(data.top_teachers).map((row) => ({
      id: asNumber(row.id),
      name: asString(row.name) || "استاد",
      field: asString(row.field),
      city: asString(row.city),
      tier: asString(row.tier),
      rating: asNumber(row.rating),
      reviews: asNumber(row.reviews),
      doneSessions: asNumber(row.done_sessions),
      earned: asNumber(row.earned),
    })),
    recentUsers: recordList(data.recent_users).map((row) => ({
      id: asNumber(row.id),
      name: asString(row.name) || "کاربر تازه",
      role: asString(row.role),
      createdAt: asString(row.created_at),
    })),
    recentSessions: recordList(data.recent_sessions).map((row) => ({
      id: asNumber(row.id),
      title: asString(row.title) || "جلسه آموزشی",
      status: asString(row.status),
      price: asNumber(row.price),
      scheduledAt: asString(row.scheduled_at),
      learnerName: asString(row.learner_name),
      teacherName: asString(row.teacher_name),
    })),
  };
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

/** تحلیل غنی — همان خوراک داشبورد و گزارش مالی پنل وب. */
export async function fetchAdminAnalytics(runtime: PlatformRuntime, days: number): Promise<AdminAnalytics> {
  const response = await runtime.request<ApiEnvelope>(`/admin/analytics?days=${days}`);
  return parseAnalytics(response.data);
}

/* ── اساتید ── */

function parseAdminTeacher(row: Record<string, unknown>): AdminTeacherRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const user = dataOf(row.user);
  const name = asString(user.name) || asString(row.name);
  return {
    id,
    userId: asNumber(row.user_id) || asNumber(user.id),
    name: name || `استاد ${id}`,
    mobile: asString(user.mobile),
    field: asString(row.field),
    tag: asString(row.tag),
    city: asString(row.city),
    status: asString(row.status) || "pending",
    verified: row.verified === true,
    tier: asString(row.tier),
    isTier1: row.is_tier1 === true,
    rating: asNumber(row.rating),
    sessions: asNumber(row.sessions),
    reviews: asNumber(row.reviews),
    price30: asNumber(row.price30),
    price60: asNumber(row.price60),
    active: user.active !== false,
    createdAt: asString(row.created_at),
  };
}

export async function fetchAdminTeachers(
  runtime: PlatformRuntime,
  params: { status?: string; q?: string; city?: string; field?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminTeacherRow>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  if (params.city) search.set("city", params.city);
  if (params.field) search.set("field", params.field);
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

/** نشان تأیید + درجهٔ رنگی استاد — مهر عمومی پروفایل. */
export async function updateAdminTeacherSettings(
  runtime: PlatformRuntime,
  id: number,
  payload: { verified?: boolean; tier?: string },
): Promise<{ verified: boolean; tier: string }> {
  const response = await runtime.request<ApiEnvelope>(`/admin/teachers/${id}/settings`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  const data = dataOf(response.data);
  return { verified: data.verified === true, tier: asString(data.tier) };
}

/** ۱.الف.۵ — پرچم کارت درجه ۱ روی overlay محلی BFF (تایید ادمین). */
export async function setAdminTeacherTier1(runtime: PlatformRuntime, teacherId: number, isTier1: boolean | null): Promise<void> {
  await runtime.request<ApiEnvelope>("/teacher-flags", {
    method: "POST",
    body: JSON.stringify({ teacherId, isTier1 }),
  });
}

/* ── کاربران ── */

function parseAdminUser(row: Record<string, unknown>): AdminUserRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const teacher = dataOf(row.teacher);
  return {
    id,
    name: asString(row.name) || `کاربر ${id}`,
    mobile: asString(row.mobile),
    role: asString(row.role) || "learner",
    city: asString(row.city),
    bio: asString(row.bio),
    active: row.active !== false,
    wallet: asNumber(row.wallet),
    createdAt: asString(row.created_at),
    teacherId: asNumber(teacher.id) > 0 ? asNumber(teacher.id) : null,
  };
}

export async function fetchAdminUsers(
  runtime: PlatformRuntime,
  params: { role?: string; q?: string; active?: string; sort?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminUserRow>> {
  const search = new URLSearchParams();
  if (params.role) search.set("role", params.role);
  if (params.q) search.set("q", params.q);
  if (params.active) search.set("active", params.active);
  if (params.sort) search.set("sort_by", params.sort);
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

/** تغییر نقش کاربر — learner | teacher | admin. */
export async function setAdminUserRole(runtime: PlatformRuntime, id: number, role: string): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}

/** تعدیل دستی کیف پول کاربر — مثبت شارژ، منفی کسر. */
export async function adjustAdminUserWallet(runtime: PlatformRuntime, id: number, amount: number, reason: string): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/users/${id}/wallet-adjust`, {
    method: "POST",
    body: JSON.stringify({ amount, reason: reason.trim() }),
  });
}

/** ارسال اعلان درون‌اپی به یک کاربر. */
export async function notifyAdminUser(runtime: PlatformRuntime, id: number, title: string, body: string): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/users/${id}/notify`, {
    method: "POST",
    body: JSON.stringify({ title: title.trim(), body: body.trim() }),
  });
}

export type AdminUserDetail = {
  user: AdminUserRow;
  transactions: Array<{ id: number; type: string; title: string; amount: number; createdAt: string }>;
  sessions: Array<{ id: number; service: string; scheduledAt: string; duration: number; price: number; status: string }>;
};

export async function fetchAdminUserDetail(runtime: PlatformRuntime, id: number): Promise<AdminUserDetail> {
  const response = await runtime.request<ApiEnvelope>(`/admin/users/${id}`);
  const data = dataOf(response.data);
  const user = parseAdminUser(dataOf(data.user)) ?? null;
  if (!user) throw new Error("جزئیات کاربر معتبر نیست.");
  return {
    user,
    transactions: recordList(data.transactions).map((row) => ({
      id: asNumber(row.id),
      type: asString(row.type),
      title: asString(row.title),
      amount: asNumber(row.amount),
      createdAt: asString(row.created_at),
    })),
    sessions: recordList(data.sessions).map((row) => ({
      id: asNumber(row.id),
      service: asString(row.service ?? row.title),
      scheduledAt: asString(row.scheduled_at),
      duration: asNumber(row.duration),
      price: asNumber(row.price),
      status: asString(row.status),
    })),
  };
}

/* ── جلسات ── */

export type AdminSessionRow = {
  id: number;
  service: string;
  status: string;
  price: number;
  duration: number;
  scheduledAt: string;
  localDate: string;
  localStart: string;
  localEnd: string;
  note: string;
  rated: boolean;
  learnerName: string;
  teacherName: string;
};

function parseAdminSession(row: Record<string, unknown>): AdminSessionRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const learner = dataOf(row.learner);
  const teacher = dataOf(dataOf(row.teacher).user);
  return {
    id,
    service: asString(row.service ?? row.title) || "جلسه بدون عنوان",
    status: asString(row.status) || "pending",
    price: asNumber(row.price),
    duration: asNumber(row.duration),
    scheduledAt: asString(row.scheduled_at),
    localDate: asString(row.local_date),
    localStart: asString(row.local_start),
    localEnd: asString(row.local_end),
    note: asString(row.note),
    rated: row.rated === true,
    learnerName: asString(learner.name) || "قرآن‌آموز",
    teacherName: asString(teacher.name) || "استاد",
  };
}

export async function fetchAdminSessions(
  runtime: PlatformRuntime,
  params: { status?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminSessionRow>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  search.set("limit", String(params.limit ?? 30));
  search.set("offset", String(params.offset ?? 0));
  const response = await runtime.request<ApiEnvelope>(`/admin/sessions?${search.toString()}`);
  return listFrom(response, parseAdminSession);
}

/* ── نظرات ── */

export type AdminReviewRow = {
  id: number;
  sessionId: number;
  teacherId: number;
  rating: number;
  text: string;
  createdAt: string;
  learnerName: string;
  teacherName: string;
  teacherField: string;
};

function parseAdminReview(row: Record<string, unknown>): AdminReviewRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  return {
    id,
    sessionId: asNumber(row.session_id),
    teacherId: asNumber(row.teacher_id),
    rating: asNumber(row.rating),
    text: asString(row.text),
    createdAt: asString(row.created_at),
    learnerName: asString(row.learner_name) || "کاربر",
    teacherName: asString(row.teacher_name) || "—",
    teacherField: asString(row.teacher_field),
  };
}

export async function fetchAdminReviews(runtime: PlatformRuntime, limit = 30, offset = 0): Promise<AdminList<AdminReviewRow>> {
  const response = await runtime.request<ApiEnvelope>(`/admin/reviews?limit=${limit}&offset=${offset}`);
  return listFrom(response, parseAdminReview);
}

/** حذف نظر — امتیاز استاد بازمحاسبه و جلسه برای نظر تازه باز می‌شود. */
export async function deleteAdminReview(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/reviews/${id}`, { method: "DELETE" });
}

/* ── خدمات در انتظار بررسی ── */

export type AdminPendingService = {
  id: number;
  title: string;
  duration: number;
  price: number;
  teacherName: string;
  teacherTag: string;
  teacherCity: string;
};

export async function fetchAdminPendingServices(runtime: PlatformRuntime): Promise<AdminPendingService[]> {
  const response = await runtime.request<ApiEnvelope>("/admin/services");
  return asArray(response.data)
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const id = asNumber(record.id);
      if (id <= 0) return null;
      const teacher = dataOf(record.teacher);
      const user = dataOf(teacher.user);
      return {
        id,
        title: asString(record.title) || "خدمت بدون عنوان",
        duration: asNumber(record.duration),
        price: asNumber(record.price),
        teacherName: asString(user.name) || "استاد",
        teacherTag: asString(teacher.tag),
        teacherCity: asString(teacher.city),
      };
    })
    .filter((row): row is AdminPendingService => row !== null);
}

/** تأیید و انتشار یا رد و حذف خدمت — بررسی ← انتشار. */
export async function moderateAdminService(runtime: PlatformRuntime, id: number, approve: boolean): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/services/${id}/${approve ? "approve" : "reject"}`, { method: "PUT" });
}

/* ── برداشت‌ها ── */

export type AdminWithdrawalRow = {
  id: number;
  amount: number;
  card: string;
  sheba: string;
  status: string;
  createdAt: string;
  userName: string;
};

function parseAdminWithdrawal(row: Record<string, unknown>): AdminWithdrawalRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const user = dataOf(row.user);
  return {
    id,
    amount: asNumber(row.amount),
    card: asString(row.card),
    sheba: asString(row.sheba),
    status: asString(row.status) || "pending",
    createdAt: asString(row.created_at),
    userName: asString(user.name) || "استاد",
  };
}

export async function fetchAdminWithdrawals(
  runtime: PlatformRuntime,
  params: { status?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminWithdrawalRow>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  search.set("limit", String(params.limit ?? 30));
  search.set("offset", String(params.offset ?? 0));
  const response = await runtime.request<ApiEnvelope>(`/admin/withdrawals?${search.toString()}`);
  return listFrom(response, parseAdminWithdrawal);
}

/** ثبت پرداخت یا رد و بازگشت وجه — پس از انتقال واقعی بانکی. */
export async function processAdminWithdrawal(runtime: PlatformRuntime, id: number, paid: boolean): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/withdrawals/${id}/process`, {
    method: "POST",
    body: JSON.stringify({ paid }),
  });
}

/* ── پشتیبانی (تابلوی ادمین) ── */

export type AdminTicketRow = {
  id: number;
  subject: string;
  status: string;
  unreadStaff: number;
  assignedTo: number | null;
  assigneeName: string;
  lastMessageAt: string;
  createdAt: string;
  userName: string;
  userMobile: string;
  userRole: string;
};

function parseTicket(row: Record<string, unknown>): AdminTicketRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const user = dataOf(row.user);
  const assignee = dataOf(row.assignee);
  return {
    id,
    subject: asString(row.subject) || "بدون موضوع",
    status: asString(row.status) || "open",
    unreadStaff: asNumber(row.unread_staff),
    assignedTo: typeof row.assigned_to === "number" ? row.assigned_to : null,
    assigneeName: asString(assignee.name),
    lastMessageAt: asString(row.last_message_at),
    createdAt: asString(row.created_at),
    userName: asString(user.name) || "کاربر",
    userMobile: asString(user.mobile),
    userRole: asString(user.role),
  };
}

export async function fetchStaffTickets(
  runtime: PlatformRuntime,
  params: { status?: string; q?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminTicketRow>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 30));
  search.set("offset", String(params.offset ?? 0));
  const response = await runtime.request<ApiEnvelope>(`/support-staff/tickets?${search.toString()}`);
  return listFrom(response, parseTicket);
}

export type AdminTicketMessage = {
  id: number;
  senderId: number;
  senderName: string;
  senderSide: "user" | "staff";
  kind: "text" | "audio" | "image";
  body: string;
  attachmentUrl?: string;
  attachmentMime?: string;
  durationMs: number;
  createdAt: string;
};

function parseStaffMessage(row: Record<string, unknown>): AdminTicketMessage | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const kindRaw = asString(row.kind, "text");
  const kind: AdminTicketMessage["kind"] = kindRaw === "audio" ? "audio" : kindRaw === "image" ? "image" : "text";
  const attachment = resolveAssetUrl(asString(row.attachment_url)) || "";
  return {
    id,
    senderId: asNumber(row.sender_id),
    senderName: asString(row.sender_name, "کاربر"),
    senderSide: asString(row.sender_side, "user") === "staff" ? "staff" : "user",
    kind,
    body: asString(row.body),
    attachmentUrl: attachment || undefined,
    attachmentMime: asString(row.attachment_mime) || undefined,
    durationMs: asNumber(row.duration_ms),
    createdAt: asString(row.created_at),
  };
}

export async function fetchStaffThread(
  runtime: PlatformRuntime,
  ticketId: number,
  afterId = 0,
): Promise<{ ticket: AdminTicketRow; messages: AdminTicketMessage[] }> {
  const response = await runtime.request<ApiEnvelope>(`/support-staff/tickets/${ticketId}?after_id=${afterId}&limit=300`);
  const data = dataOf(response.data);
  const ticket = parseTicket(dataOf(data.ticket));
  if (!ticket) throw new Error("تیکت یافت نشد.");
  return {
    ticket,
    messages: asArray(data.messages)
      .map((row) => (row && typeof row === "object" ? parseStaffMessage(row as Record<string, unknown>) : null))
      .filter((row): row is AdminTicketMessage => row !== null),
  };
}

export async function sendStaffMessage(
  runtime: PlatformRuntime,
  ticketId: number,
  payload: { kind: "text" | "audio" | "image"; body?: string; attachmentUrl?: string; mime?: string; durationMs?: number },
): Promise<AdminTicketMessage | null> {
  const response = await runtime.request<ApiEnvelope>(`/support-staff/tickets/${ticketId}/messages`, {
    method: "POST",
    body: JSON.stringify({
      kind: payload.kind,
      body: payload.body ?? "",
      attachment_url: payload.attachmentUrl ?? "",
      mime: payload.mime ?? "",
      duration_ms: payload.durationMs ?? 0,
    }),
  });
  const data = dataOf(response.data);
  const message = dataOf(data.message);
  return message ? parseStaffMessage(message) : null;
}

export async function uploadStaffAttachment(runtime: PlatformRuntime, file: File, kind: "audio" | "image"): Promise<{ url: string; mime: string }> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  const response = await runtime.request<ApiEnvelope>("/support-staff/upload", { method: "POST", body: form });
  const data = dataOf(response.data);
  return {
    url: resolveAssetUrl(asString(data.url)) || "",
    mime: asString(data.mime),
  };
}

/** واگذاری تیکت — بدون شناسه = به خودِ مدیر. */
export async function assignStaffTicket(runtime: PlatformRuntime, ticketId: number, agentUserId?: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/support-staff/tickets/${ticketId}/assign`, {
    method: "POST",
    body: JSON.stringify(agentUserId ? { agent_user_id: agentUserId } : {}),
  });
}

export async function setStaffTicketStatus(runtime: PlatformRuntime, ticketId: number, status: string): Promise<void> {
  await runtime.request<ApiEnvelope>(`/support-staff/tickets/${ticketId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export type AdminSupportAgent = {
  id: number;
  userId: number;
  name: string;
  mobile: string;
  role: string;
};

export async function fetchSupportAgents(runtime: PlatformRuntime): Promise<AdminSupportAgent[]> {
  const response = await runtime.request<ApiEnvelope>("/admin/support/agents");
  return asArray(response.data)
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const id = asNumber(record.id);
      if (id <= 0) return null;
      const user = dataOf(record.user);
      return {
        id,
        userId: asNumber(user.id) || asNumber(record.user_id),
        name: asString(user.name) || asString(record.name) || "کارشناس",
        mobile: asString(user.mobile) || asString(record.mobile),
        role: asString(user.role) || asString(record.role),
      };
    })
    .filter((row): row is AdminSupportAgent => row !== null);
}

export async function addSupportAgent(runtime: PlatformRuntime, payload: { mobile: string; name?: string }): Promise<void> {
  await runtime.request<ApiEnvelope>("/admin/support/agents", {
    method: "POST",
    body: JSON.stringify({ mobile: payload.mobile.trim(), name: payload.name?.trim() || undefined }),
  });
}

export async function removeSupportAgent(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/support/agents/${id}`, { method: "DELETE" });
}

export type AdminContactMessage = {
  id: number;
  name: string;
  contact: string;
  message: string;
  status: string;
  createdAt: string;
};

/** پیام‌های فرم تماس قدیمی — رسیدگی/حل. */
export async function fetchContactMessages(runtime: PlatformRuntime, status = ""): Promise<AdminContactMessage[]> {
  const search = new URLSearchParams({ limit: "50", offset: "0" });
  if (status) search.set("status", status);
  const response = await runtime.request<ApiEnvelope>(`/admin/support/messages?${search.toString()}`);
  return asArray(response.data)
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const id = asNumber(record.id);
      if (id <= 0) return null;
      return {
        id,
        name: asString(record.name) || "کاربر",
        contact: asString(record.contact),
        message: asString(record.message),
        status: asString(record.status) || "new",
        createdAt: asString(record.created_at),
      };
    })
    .filter((row): row is AdminContactMessage => row !== null);
}

export async function resolveContactMessage(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/support/messages/${id}/resolve`, { method: "PATCH" });
}

/* ── بلاگ ── */

export type AdminPostRow = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverUrl: string;
  category: string;
  status: "draft" | "published";
  readMinutes: number;
  views: number;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
};

function parseAdminPost(row: Record<string, unknown>): AdminPostRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  const status = asString(row.status) === "published" ? "published" : "draft";
  return {
    id,
    slug: asString(row.slug),
    title: asString(row.title) || "بدون عنوان",
    excerpt: asString(row.excerpt),
    content: asString(row.content),
    coverUrl: asString(row.cover_url),
    category: asString(row.category),
    status,
    readMinutes: asNumber(row.read_minutes),
    views: asNumber(row.views),
    publishedAt: asString(row.published_at),
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export async function fetchAdminPosts(
  runtime: PlatformRuntime,
  params: { status?: string; q?: string; limit?: number; offset?: number } = {},
): Promise<AdminList<AdminPostRow>> {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.q) search.set("q", params.q);
  search.set("limit", String(params.limit ?? 20));
  search.set("offset", String(params.offset ?? 0));
  const response = await runtime.request<ApiEnvelope>(`/admin/posts?${search.toString()}`);
  return listFrom(response, parseAdminPost);
}

export type AdminPostStats = { total: number; published: number; drafts: number; views: number; categories: string[] };

export async function fetchAdminPostStats(runtime: PlatformRuntime): Promise<AdminPostStats | null> {
  try {
    const response = await runtime.request<ApiEnvelope>("/admin/post-stats");
    const data = dataOf(response.data);
    if (!data) return null;
    return {
      total: asNumber(data.total),
      published: asNumber(data.published),
      drafts: asNumber(data.drafts),
      views: asNumber(data.views),
      categories: asArray(data.categories).map((item) => asString(item)).filter(Boolean),
    };
  } catch {
    return null; // آمار جنبی است — فهرست جدا خطا می‌گیرد
  }
}

export async function fetchAdminPost(runtime: PlatformRuntime, id: number): Promise<AdminPostRow | null> {
  const response = await runtime.request<ApiEnvelope>(`/admin/posts/${id}`);
  const post = parseAdminPost(dataOf(response.data));
  return post;
}

export async function saveAdminPost(
  runtime: PlatformRuntime,
  payload: { id: number | null; title: string; slug?: string; excerpt: string; content: string; coverUrl: string; category: string; status: "draft" | "published" },
): Promise<void> {
  const body = {
    title: payload.title.trim(),
    slug: payload.slug?.trim() || undefined,
    excerpt: payload.excerpt.trim(),
    content: payload.content,
    cover_url: payload.coverUrl.trim(),
    category: payload.category.trim(),
    status: payload.status,
  };
  await runtime.request<ApiEnvelope>(payload.id ? `/admin/posts/${payload.id}` : "/admin/posts", {
    method: payload.id ? "PUT" : "POST",
    body: JSON.stringify(body),
  });
}

export async function uploadAdminPostCover(runtime: PlatformRuntime, file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const response = await runtime.request<ApiEnvelope>("/admin/blog-upload", { method: "POST", body: form });
  const data = dataOf(response.data);
  return resolveAssetUrl(asString(data.url)) || "";
}

export async function deleteAdminPost(runtime: PlatformRuntime, id: number): Promise<void> {
  await runtime.request<ApiEnvelope>(`/admin/posts/${id}`, { method: "DELETE" });
}

/* ── گزارش عملیات ── */

export type AdminAuditRow = {
  id: number;
  actorId: number;
  action: string;
  targetType: string;
  targetId: number;
  requestId: string;
  metadata: string;
  createdAt: string;
};

function parseAuditRow(row: Record<string, unknown>): AdminAuditRow | null {
  const id = asNumber(row.id);
  if (id <= 0) return null;
  return {
    id,
    actorId: asNumber(row.actor_id),
    action: asString(row.action),
    targetType: asString(row.target_type),
    targetId: asNumber(row.target_id),
    requestId: asString(row.request_id),
    metadata: asString(row.metadata),
    createdAt: asString(row.created_at),
  };
}

export async function fetchAdminAuditLogs(runtime: PlatformRuntime, limit = 50, offset = 0): Promise<AdminList<AdminAuditRow>> {
  const response = await runtime.request<ApiEnvelope>(`/admin/audit-logs?limit=${limit}&offset=${offset}`);
  return listFrom(response, parseAuditRow);
}

/* ── تنظیمات سامانه (بک‌اند اصلی) ── */

export type AdminSettingsMap = Record<string, string>;

export async function fetchAdminSettings(runtime: PlatformRuntime): Promise<AdminSettingsMap> {
  const response = await runtime.request<ApiEnvelope>("/admin/settings");
  const data = dataOf(response.data);
  return dataOf(data.settings) as AdminSettingsMap;
}

export async function saveAdminSettings(runtime: PlatformRuntime, changes: AdminSettingsMap): Promise<AdminSettingsMap> {
  const response = await runtime.request<ApiEnvelope>("/admin/settings", {
    method: "PUT",
    body: JSON.stringify({ settings: changes }),
  });
  const data = dataOf(response.data);
  return dataOf(data.settings) as AdminSettingsMap;
}

/* ── کلید استوری‌ها (فروشگاه محلی BFF) ── */

export type AppSettings = { storiesEnabled: boolean };

export async function fetchAppSettings(runtime: PlatformRuntime): Promise<AppSettings> {
  const response = await runtime.request<ApiEnvelope>("/app-settings");
  const data = dataOf(response.data);
  return { storiesEnabled: data.stories_enabled !== false };
}

export async function saveAppSettings(runtime: PlatformRuntime, settings: AppSettings): Promise<AppSettings> {
  const response = await runtime.request<ApiEnvelope>("/app-settings", {
    method: "PUT",
    body: JSON.stringify({ settings: { stories_enabled: settings.storiesEnabled } }),
  });
  const data = dataOf(response.data);
  return { storiesEnabled: data.stories_enabled !== false };
}
