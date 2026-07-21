// Lightweight typed client for the Vodda backend API.
// In the browser, requests pass through the Next.js BFF so the JWT remains HttpOnly.
// On the server, requests go directly to the backend service.

const BASE =
  typeof window === 'undefined'
    ? process.env.SERVER_API_URL || 'http://backend:3420/api/v1'
    : '/api/backend';

export type TeacherService = {
  id: number;
  title: string;
  duration: number;
  price: number;
  icon: string;
  active?: boolean;
};

export type Teacher = {
  id: number;
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
  rating: number;
  reviews: number;
  sessions: number;
  followers: number;
  skills?: string[];
  user?: { id: number; name: string; avatar_url: string };
  services?: TeacherService[];
};

export type Review = {
  id: number;
  rating: number;
  text: string;
  learner?: { id: number; name: string; avatar_url?: string };
  created_at: string;
};

export type WorkTime = {
  id: number;
  weekday: number;
  from: string;
  to: string;
  active?: boolean;
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
  sendSupportMessage: (body: { name: string; contact: string; message: string }) =>
    request<{ data: { id: number; received: boolean } }>('/support/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: (token: string) =>
    request<{ data: import('./auth').AuthUser }>('/me', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  teacherMe: (token: string) =>
    request<{ data: { services?: unknown[]; sessions?: unknown[]; [key: string]: unknown } }>(
      '/teacher/me',
      { headers: { Authorization: `Bearer ${token}` } },
    ),
  teacherSessions: (token: string, when: string) =>
    request<{ data: unknown[] }>(`/teacher/sessions?when=${encodeURIComponent(when)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminDashboard: (token: string) =>
    request<{ data: Record<string, unknown> }>('/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminPendingTeachers: (token: string) =>
    request<ListResponse<Teacher>>('/admin/teachers?status=pending', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  mySessions: (token: string, when: string) =>
    request<{ data: unknown[] }>(`/sessions?when=${encodeURIComponent(when)}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  bookSession: (
    token: string,
    body: { teacher_id: number; service_id: number; scheduled_at: string; note?: string },
  ) =>
    request<{ data: unknown }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),
  transactions: (token: string) =>
    request<{ data: unknown[] }>('/wallet/transactions', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  becomeTeacher: (token: string, body: BecomeTeacherInput) =>
    request<{ data: unknown }>('/me/become-teacher', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { Authorization: `Bearer ${token}` },
    }),
};

export function toman(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}
