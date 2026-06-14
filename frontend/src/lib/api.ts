// Lightweight typed client for the Vodda backend API.
// In the browser, requests go to same-origin /api/v1 (proxied by next.config.js).
// On the server, requests go directly to the backend service.

const BASE =
  typeof window === 'undefined'
    ? process.env.SERVER_API_URL || 'http://backend:3420/api/v1'
    : process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

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
  rating: number;
  reviews: number;
  sessions: number;
  followers: number;
  user?: { id: number; name: string; avatar_url: string };
  services?: { id: number; title: string; duration: number; price: number; icon: string }[];
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
  teachers: (q = '') =>
    request<ListResponse<Teacher>>(`/teachers${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  teacher: (id: number) =>
    request<{ data: { teacher: Teacher; reviews: unknown[] } }>(`/teachers/${id}`),
};

export function toman(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}
