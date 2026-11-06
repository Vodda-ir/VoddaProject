// Lightweight typed client for the Vodda backend API.
// In the browser, requests pass through the Next.js BFF so the JWT remains HttpOnly.
// On the server, requests go directly to the backend service.

const BASE =
  typeof window === 'undefined'
    ? process.env.SERVER_API_URL || 'http://backend:3420/api/v1'
    : '/api/backend';

export type TeacherService = {
  id: number;
  teacher_id?: number;
  title: string;
  duration: number;
  price: number;
  icon?: string;
  active?: boolean;
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
  status?: 'pending' | 'approved' | 'rejected';
  rating: number;
  reviews: number;
  sessions: number;
  followers: number;
  skills?: string[];
  user?: { id: number; name: string; avatar_url: string; active?: boolean };
  services?: TeacherService[];
};

export type Review = {
  id: number;
  session_id?: number;
  teacher_id?: number;
  learner_id?: number;
  rating: number;
  text: string;
  learner?: { id: number; name: string; avatar_url?: string };
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
  status: 'pending' | 'confirmed' | 'done' | 'canceled';
  note?: string;
  reject_note?: string;
  rated: boolean;
  learner?: { id: number; name: string; avatar_url?: string };
  teacher?: Teacher;
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

export type ListResponse<T> = { data: T[]; total: number };

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
    body: { teacher_id: number; service_id: number; scheduled_at: string; note?: string },
  ) =>
    request<{ data: SessionListItem }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
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
  teacherReviews: (token: string) =>
    request<{ data: Review[] }>('/teacher/reviews', { headers: auth(token) }),
  teacherServices: (token: string) =>
    request<{ data: Teacher }>('/teacher/me', { headers: auth(token) }),
  createTeacherService: (token: string, body: { title: string; duration: number; price: number; icon?: string }) =>
    request<{ data: TeacherService }>('/teacher/services', {
      method: 'POST',
      headers: auth(token),
      body: JSON.stringify(body),
    }),
  updateTeacherService: (token: string, id: number, body: { title?: string; duration?: number; price?: number; icon?: string }) =>
    request<{ data: { updated: boolean; pending_review: boolean } }>(`/teacher/services/${id}`, {
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

  adminDashboard: (token: string) =>
    request<{ data: Record<string, unknown> }>('/admin/dashboard', { headers: auth(token) }),
  adminPendingTeachers: (token: string) =>
    request<ListResponse<Teacher>>('/admin/teachers?status=pending', { headers: auth(token) }),
};

export function toman(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}
