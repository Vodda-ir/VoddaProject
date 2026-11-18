// Auth API + session helpers for the Vodda web panels.
// The JWT is stored only in an HttpOnly cookie by Next.js route handlers.

/** Convert a relative avatar path to a full URL. With the Next.js proxy for /uploads, relative paths work as-is. */
export function fullUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return path;
}

/** باگ avatar-upload — نشانی نمایش تصویر با کش‌باستینگ ?v=<version> (مثلاً updated_at). */
export function avatarUrl(path: string | null | undefined, version?: string | number | null): string {
  const base = fullUrl(path);
  if (!base) return '';
  const versionValue = version != null && version !== '' ? String(version) : null;
  if (!versionValue) return base;
  const separator = base.includes('?') ? '&' : '?';
  return `${base}${separator}v=${encodeURIComponent(versionValue)}`;
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
  teacher?: {
    id: number;
    status?: 'pending' | 'approved' | 'rejected';
    verified?: boolean;
    available?: boolean;
  } | null;
};

async function authFetch(path: string, body: unknown) {
  const res = await fetch(`/api/auth${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'خطا در احراز هویت');
  }
  return res.json();
}

export const authApi = {
  requestOTP: (mobile: string) => authFetch('/request-otp', { mobile }),
  verifyOTP: (mobile: string, code: string) => authFetch('/verify-otp', { mobile, code }),
  me: async (_sessionMarker?: string): Promise<AuthUser> => {
    const res = await fetch('/api/backend/me', { cache: 'no-store' });
    if (!res.ok) throw new Error('unauthorized');
    const j = await res.json();
    return j.data as AuthUser;
  },
};

/**
 * Existing UI passes this value into API functions. It is deliberately only a
 * non-secret session marker; the BFF reads the real HttpOnly cookie server-side.
 */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('; ').some(item => item === 'vodda_session=1') ? 'session' : null;
}

// Kept for source compatibility. The verify route already creates the marker.
export function setToken(_unused?: string) {
  // Intentionally empty: JWTs must never be written by browser JavaScript.
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  document.cookie = 'vodda_session=; path=/; max-age=0; SameSite=Lax';
  void fetch('/api/auth/logout', {
    method: 'POST',
    cache: 'no-store',
    keepalive: true,
  });
}
