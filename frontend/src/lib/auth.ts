// Auth API + token management for the Vodda web panels.

const API_BASE =
  typeof window === 'undefined'
    ? process.env.SERVER_API_URL || 'http://backend:3420/api/v1'
    : process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

/** Convert a relative avatar path to a full URL. With the Next.js proxy for /uploads, relative paths work as-is. */
export function fullUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Already absolute from origin (e.g. /uploads/...)
  return path;
}

export type AuthUser = {
  id: number;
  name: string;
  mobile: string;
  role: string;
  city: string;
  bio: string;
  wallet: number;
  avatar_url?: string;
};

async function authFetch(path: string, body: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'خطا در احراز هویت');
  }
  return res.json();
}

export const authApi = {
  requestOTP: (mobile: string) => authFetch('/auth/request-otp', { mobile }),
  verifyOTP: (mobile: string, code: string) =>
    authFetch('/auth/verify-otp', { mobile, code }),
  me: async (token: string): Promise<AuthUser> => {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('unauthorized');
    const j = await res.json();
    return j.data as AuthUser;
  },
};

const TOKEN_KEY = 'vodda_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `vodda_token=${token}; path=/; max-age=2592000; SameSite=Lax`;
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'vodda_token=; path=/; max-age=0';
}
