// Lightweight typed client for the Vodda backend API.
// In the browser, requests pass through the Next.js BFF so the JWT remains HttpOnly.
// On the server, requests go directly to the backend service.

const BASE =
  typeof window === 'undefined'
    ? process.env.SERVER_API_URL || 'http://backend:3420/api/v1'
    : '/api/backend';

import { formatPrice } from '@/lib/datetime';
import type { FreeServiceCard } from '@/lib/home/discover';

export type TeacherService = {
  id: number;
  teacher_id?: number;
  official_service_id?: number;
  title: string;
  duration: number;
  price: number;
  icon?: string;
  active?: boolean;
  /** نوع جلسه: voice/text/video یا in_person (جلسهٔ حضوری)؛ خالی = خدمت معمولی. */
  mode?: 'voice' | 'text' | 'video' | 'in_person' | '';
};

export type OfficialService = {
  id: number;
  category: string;
  title: string;
  description: string;
  icon?: string;
};

export type OfficialServiceCategory = {
  category: string;
  services: OfficialService[];
};

export type Teacher = {
  id: number;
  user_id?: number;
  field: string;
  tag: string;
  level: string;
  city: string;
  bio: string;
  price30: number;
  price60: number;
  female: boolean;
  verified: boolean;
  available?: boolean;
  /** درجه استاد: "" | "international" (تیک بین‌المللی آبی) | "grade2" (کشوری سبز) | "grade3" (استانی قرمز) */
  tier?: '' | 'international' | 'grade2' | 'grade3';
  /** آخرین فعالیت (۱.الف.۴) — ISO؛ در BFF درصدموجود بودن تزریق می‌شود. */
  last_seen?: string;
  /** کارت درجه ۱ (۱.الف.۵) — BFF با overlay محلی غنی‌سازی می‌کند. */
  is_tier1?: boolean;
  /** ردیف نشان‌های درجه ۱: "international" | "free" | "instant" */
  tier1_badges?: string[];
  status?: 'pending' | 'approved' | 'rejected';
  rating: number;
  reviews: number;
  sessions: number;
  followers: number;
  skills?: string[];
  /** نشانی محل برگزاری جلسات حضوری استاد — خالی یعنی فقط «محل شما». */
  in_person_address?: string;
  user?: { id: number; name: string; avatar_url: string; active?: boolean; updated_at?: string };
  services?: TeacherService[];
};

export type Review = {
  id: number;
  session_id?: number;
  teacher_id?: number;
  learner_id?: number;
  rating: number;
  text: string;
  learner?: { id: number; name: string; avatar_url?: string; updated_at?: string };
  created_at: string;
};

export type WorkTime = {
  id: number;
  teacher_id?: number;
  weekday: number;
  from: string;
  to: string;
  active?: boolean;
};

export type AvailabilitySlot = {
  start_at: string;
  end_at: string;
  local_date: string;
  local_start: string;
  local_end: string;
  weekday: number;
};

export type SessionListItem = {
  id: number;
  learner_id: number;
  teacher_id: number;
  service_id: number;
  service: string;
  scheduled_at: string;
  local_date: string;
  local_start: string;
  local_end: string;
  weekday: number;
  duration: number;
  price: number;
  status: 'pending' | 'confirmed' | 'done' | 'canceled' | 'awaiting_payment';
  note?: string;
  reject_note?: string;
  rated: boolean;
  /** نوع جلسه: voice/text/video/in_person؛ خالی = جلسهٔ معمولی. */
  mode?: string;
  /** جلسات حضوری — محل برگزاری و نشانی. */
  in_person_place?: string;
  in_person_address?: string;
  learner?: { id: number; name: string; avatar_url?: string; updated_at?: string };
  teacher?: Teacher;
};

/* ── بیگ‌بلوباتن — کلاس زنده روی زیرساخت اشتراک BBB ایران ── */
export type BbbJoinInfo = {
  join_url: string;
  meeting_id: string;
  role: 'moderator' | 'viewer';
};
export type BbbStatusInfo = {
  running: boolean;
  participants: number;
};

export type Withdrawal = {
  id: number;
  teacher_id?: number;
  user_id?: number;
  amount: number;
  card?: string;
  sheba?: string;
  status: 'pending' | 'paid' | 'rejected';
  created_at: string;
  updated_at?: string;
};

export type PaymentOrder = {
  id: number;
  user_id: number;
  gateway: string;
  res_num: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  ref_num: string;
  trace_no: string;
  card_pan: string;
  fail_reason: string;
  created_at: string;
};

export type Transaction = {
  id: number;
  type: string;
  title: string;
  amount: number;
  ref_id?: number;
  created_at: string;
};

export type BecomeTeacherInput = {
  field: string;
  tag: string;
  bio: string;
  price30: number;
  price60?: number;
  city?: string;
  level?: string;
  skills?: string[];
  female?: boolean;
};

export type LearnerAnalyticsPoint = {
  date: string;
  sessions: number;
  done: number;
  minutes: number;
  spent: number;
  charged: number;
};

export type LearnerAnalytics = {
  days: number;
  series: LearnerAnalyticsPoint[];
  totals: {
    sessions_total: number;
    pending: number;
    confirmed: number;
    done: number;
    canceled: number;
    rated: number;
    minutes_learned: number;
    teachers_count: number;
    spent_total: number;
    charged_total: number;
    next_session_at: string | null;
  };
  wallet: number;
  by_service: Array<{ name: string; count: number }> | null;
  teachers: Array<{
    id: number;
    name: string;
    avatar_url: string;
    field: string;
    rating: number;
    sessions: number;
    last_at: string | null;
    updated_at?: string;
  }> | null;
};

export type NotificationItem = {
  id: number;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
};

export type PaymentMethod = 'wallet' | 'gateway';

/** Response of POST /sessions — gateway bookings carry the Sep token the
 *  browser posts to OnlinePG (Monafaseh flow). */
export type BookingResult = {
  session: SessionListItem;
  token?: string;
  res_num?: string;
  paid_via_wallet: boolean;
};

export type ListResponse<T> = { data: T[]; total: number };

/* ─── فراخوان اساتید (dispatch) types ─── */
export type OfficialServiceItem = {
  id: number;
  category: string;
  title: string;
  description: string;
  icon: string;
  sort_order?: number;
};

export type CatalogResponse = {
  categories: Array<{ category: string; services: Array<{ id: number; title: string; description: string; icon: string }> }>;
};

export type DispatchCandidateItem = {
  offer_id: number;
  updated_at?: string;
  responded_at: string;
  service_id: number;
  duration: number;
  price: number;
  teacher_id: number;
  name: string;
  avatar_url: string;
  tag: string;
  field: string;
  city: string;
  level: string;
  tier: string;
  female: boolean;
  rating: number;
  reviews: number;
  sessions: number;
  bio: string;
};

export type DispatchCallItem = {
  id: number;
  learner_id: number;
  official_service_id: number;
  topic_title: string;
  topic_icon: string;
  note: string;
  flexible: boolean;
  scheduled_at?: string | null;
  status: 'searching' | 'matched' | 'canceled' | 'expired';
  matched_teacher_id?: number | null;
  session_id?: number | null;
  expires_at: string;
  offer_count?: number;
};

export type DispatchCallViewData = {
  call: DispatchCallItem | null;
  candidates: DispatchCandidateItem[];
};

export type DispatchOfferItem = {
  id: number;
  call_id: number;
  teacher_id: number;
  status: 'waiting' | 'chosen' | 'released' | 'declined';
  service_id: number;
  service_duration: number;
  service_price: number;
  responded_at: string;
  call?: DispatchCallItem;
};

export type TeacherInboxData = {
  calls: Array<{ call: DispatchCallItem; offer_id?: number; accepted?: boolean }>;
  offers: DispatchOfferItem[];
};

/** Response of the dispatch «choose» action — wallet bookings settle instantly;
 *  gateway bookings carry the Sep token for the browser form post. */
export type DispatchChooseResult = {
  session?: SessionListItem;
  paid_via_wallet?: boolean;
  token?: string;
  res_num?: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `request failed: ${res.status}`);
  }
  return res.json();
}

const auth = (token: string): HeadersInit => ({ Authorization: `Bearer ${token}` });

export const api = {
  /* ۱.ب.۵ — چیدمان اساتید پیشنهادی (endpoint محلی BFF؛ تکرار ≤ ۲ بین دو درخواست). */
  recommendedTeachers: (limit = 7) =>
    request<ListResponse<Teacher>>(`/teachers/recommended?limit=${limit}`),
  /* ۱.ب.۴ — خدمات رایگان مرتب بر پایهٔ rank استاد (endpoint محلی BFF). */
  freeServices: (limit = 6) =>
    request<{ data: FreeServiceCard[]; total: number; sort_by: string; is_free: boolean }>(
      `/services?is_free=true&limit=${limit}&sort_by=teacher_rank`,
    ),
  teachers: (q = '', params?: Record<string, string>) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (params) for (const [key, value] of Object.entries(params)) if (value) sp.set(key, value);
    const qs = sp.toString();
    return request<ListResponse<Teacher>>(`/teachers${qs ? `?${qs}` : ''}`);
  },
  teacher: (id: number) =>
    request<{ data: { teacher: Teacher; reviews: Review[] } }>(`/teachers/${id}`),
  teacherWorkTimes: (id: number) =>
    request<{ data: WorkTime[] }>(`/teachers/${id}/work-times`),
  teacherAvailability: (teacherId: number, serviceId: number, days = 14) =>
    request<{ data: AvailabilitySlot[] }>(
      `/teachers/${teacherId}/availability?service_id=${serviceId}&days=${days}`,
    ),
  sendSupportMessage: (body: { name: string; contact: string; message: string }) =>
    request<{ data: { id: number; received: boolean } }>('/support/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: (token: string) =>
    request<{ data: import('./auth').AuthUser }>('/me', { headers: auth(token) }),
  mySessions: (token: string, when: string) =>
    request<{ data: SessionListItem[] }>(`/sessions?when=${encodeURIComponent(when)}`, {
      headers: auth(token),
    }),
  bookSession: (
    token: string,
    body: {
      teacher_id: number;
      service_id: number;
      scheduled_at: string;
      note?: string;
      payment_method?: PaymentMethod;
      /** جلسات حضوری — محل برگزاری: teacher (دفتر استاد) یا learner (محل شما). */
      in_person_place?: 'teacher' | 'learner';
      in_person_address?: string;
    },
  ) =>
    request<{ data: BookingResult }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: auth(token),
    }),
  paySession: (token: string, id: number) =>
    request<{ data: { res_num: string; token: string; amount: number } }>(`/sessions/${id}/pay`, {
      method: 'POST',
      headers: auth(token),
    }),
  cancelSession: (token: string, id: number) =>
    request<{ data: SessionListItem }>(`/sessions/${id}/cancel`, {
      method: 'POST',
      headers: auth(token),
    }),
  rateSession: (token: string, body: { session_id: number; rating: number; text?: string }) =>
    request<{ data: Review }>('/reviews', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: auth(token),
    }),
  transactions: (token: string) =>
    request<{ data: Transaction[] }>('/wallet/transactions', { headers: auth(token) }),
  walletTopup: (token: string, amount: number) =>
    request<{ data: { res_num: string; token: string; amount: number } }>('/wallet/topup', {
      method: 'POST',
      body: JSON.stringify({ amount }),
      headers: auth(token),
    }),
  walletTopups: (token: string, limit = 20) =>
    request<{ data: PaymentOrder[] }>(`/wallet/topups?limit=${limit}`, { headers: auth(token) }),
  meAnalytics: (token: string, days = 30) =>
    request<{ data: LearnerAnalytics }>(`/me/analytics?days=${days}`, { headers: auth(token) }),
  notifications: (token: string, limit = 20) =>
    request<{ data: NotificationItem[] }>(`/notifications?limit=${limit}`, { headers: auth(token) }),
  readNotification: (token: string, id: number) =>
    request<{ data: { read: boolean } }>(`/notifications/${id}/read`, {
      method: 'POST',
      headers: auth(token),
    }),
  becomeTeacher: (token: string, body: BecomeTeacherInput) =>
    request<{ data: Teacher }>('/me/become-teacher', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: auth(token),
    }),

  teacherMe: (token: string) =>
    request<{ data: Teacher }>('/teacher/me', { headers: auth(token) }),
  updateTeacherMe: (token: string, body: Partial<BecomeTeacherInput> & { available?: boolean }) =>
    request<{ data: Teacher }>('/teacher/me', {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: auth(token),
    }),
  teacherSessions: (token: string, when: string) =>
    request<{ data: SessionListItem[] }>(`/teacher/sessions?when=${encodeURIComponent(when)}`, {
      headers: auth(token),
    }),
  teacherAcceptSession: (token: string, id: number) =>
    request<{ data: SessionListItem }>(`/teacher/sessions/${id}/accept`, {
      method: 'POST',
      headers: auth(token),
    }),
  teacherRejectSession: (token: string, id: number, reason = '') =>
    request<{ data: SessionListItem }>(`/teacher/sessions/${id}/reject`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ reason }),
    }),
  teacherCompleteSession: (token: string, id: number) =>
    request<{ data: SessionListItem }>(`/teacher/sessions/${id}/complete`, {
      method: 'POST',
      headers: auth(token),
    }),
  /* ── بیگ‌بلوباتن — کلاس زنده روی زیرساخت اشتراک BBB ایران؛ URL امضاشده
     فقط از سمت سرور ساخته می‌شود و Secret هرگز به کلاینت نمی‌رسد ── */
  bbbJoin: (token: string, id: number) =>
    request<{ data: BbbJoinInfo }>(`/bbb/sessions/${id}/join`, { headers: auth(token) }),
  bbbStatus: (token: string, id: number) =>
    request<{ data: BbbStatusInfo }>(`/bbb/sessions/${id}/status`, { headers: auth(token) }),
  bbbEnd: (token: string, id: number) =>
    request<{ data: { ended: boolean } }>(`/bbb/sessions/${id}/end`, {
      method: 'POST',
      headers: auth(token),
    }),
  teacherReviews: (token: string) =>
    request<{ data: Review[] }>('/teacher/reviews', { headers: auth(token) }),
  teacherServices: (token: string) =>
    request<{ data: Teacher }>('/teacher/me', { headers: auth(token) }),
  officialServices: () =>
    request<{ data: { categories: OfficialServiceCategory[]; total: number } }>('/catalog/services', {
      cache: 'no-store',
    }),
  catalog: () => request<{ data: CatalogResponse }>('/catalog/services', { cache: 'no-store' }),
  createTeacherService: (token: string, body: { official_service_id: number; duration: number; price: number }) =>
    request<{ data: TeacherService }>('/teacher/services', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(body),
    }),
  updateTeacherService: (token: string, id: number, body: { official_service_id?: number; duration?: number; price?: number }) =>
    request<{ data: { updated: boolean } }>(`/teacher/services/${id}`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify(body),
    }),
  deactivateTeacherService: (token: string, id: number) =>
    request<{ data: { active: boolean } }>(`/teacher/services/${id}`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify({ active: false }),
    }),
  deleteTeacherService: (token: string, id: number) =>
    request<{ data: { deleted: boolean } }>(`/teacher/services/${id}`, {
      method: 'DELETE',
      headers: auth(token),
    }),
  teacherWorkTimesMine: (token: string) =>
    request<{ data: WorkTime[] }>('/teacher/work-times', { headers: auth(token) }),
  createTeacherWorkTime: (token: string, body: { weekday: number; from: string; to: string }) =>
    request<{ data: WorkTime }>('/teacher/work-times', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(body),
    }),
  updateTeacherWorkTime: (token: string, id: number, body: { weekday: number; from: string; to: string }) =>
    request<{ data: WorkTime }>(`/teacher/work-times/${id}`, {
      method: 'PUT',
      headers: auth(token),
      body: JSON.stringify(body),
    }),
  deleteTeacherWorkTime: (token: string, id: number) =>
    request<{ data: { deleted: boolean } }>(`/teacher/work-times/${id}`, {
      method: 'DELETE',
      headers: auth(token),
    }),
  teacherWithdrawals: (token: string) =>
    request<{ data: Withdrawal[] }>('/teacher/withdrawals', { headers: auth(token) }),
  requestTeacherWithdrawal: (token: string, body: { amount: number; card?: string; sheba?: string }) =>
    request<{ data: Withdrawal }>('/teacher/withdrawals', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(body),
    }),

  /* ─── فراخوان اساتید (dispatch) ─── */
  dispatchCurrent: (token: string) =>
    request<{ data: DispatchCallViewData }>('/dispatch/calls/current', { headers: auth(token) }),
  dispatchCreate: (
    token: string,
    body: { official_service_id: number; note?: string; scheduled_at?: string; flexible?: boolean },
  ) =>
    request<{ data: DispatchCallViewData }>('/dispatch/calls', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(body),
    }),
  dispatchChoose: (token: string, callId: number, offerId: number, paymentMethod: 'wallet' | 'gateway') =>
    request<{ data: DispatchChooseResult }>(`/dispatch/calls/${callId}/choose`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ offer_id: offerId, payment_method: paymentMethod }),
    }),
  dispatchDecline: (token: string, callId: number, offerId: number) =>
    request<{ data: DispatchCallViewData }>(`/dispatch/calls/${callId}/decline`, {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify({ offer_id: offerId }),
    }),
  dispatchCancel: (token: string, callId: number) =>
    request<{ data: { canceled: boolean } }>(`/dispatch/calls/${callId}/cancel`, {
      method: 'POST',
      headers: auth(token),
    }),
  dispatchInbox: (token: string) =>
    request<{ data: TeacherInboxData }>('/teacher/dispatch/inbox', { headers: auth(token) }),
  dispatchAccept: (token: string, callId: number) =>
    request<{ data: DispatchOfferItem }>(`/teacher/dispatch/calls/${callId}/accept`, {
      method: 'POST',
      headers: auth(token),
    }),
  dispatchRejectCall: (token: string, callId: number) =>
    request<{ data: { rejected: boolean } }>(`/teacher/dispatch/calls/${callId}/reject`, {
      method: 'POST',
      headers: auth(token),
    }),
  dispatchWithdraw: (token: string, offerId: number) =>
    request<{ data: { withdrawn: boolean } }>(`/teacher/dispatch/offers/${offerId}/withdraw`, {
      method: 'POST',
      headers: auth(token),
    }),

  adminDashboard: (token: string) =>
    request<{ data: Record<string, unknown> }>('/admin/dashboard', { headers: auth(token) }),
  adminPendingTeachers: (token: string) =>
    request<ListResponse<Teacher>>('/admin/teachers?status=pending', { headers: auth(token) }),
};

// باگ persian-dates — همهٔ مبالغ از util مرکزی می‌آیند (عدد + واحد هم‌زبان).
export function toman(n: number): string {
  return formatPrice(n, 'fa');
}
