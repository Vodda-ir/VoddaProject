import 'server-only';

import type { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// SameSite cookies are the primary browser protection. This check adds a second
// boundary for state-changing BFF requests and rejects explicit cross-site calls.
export function isSameOriginMutation(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return true;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return true;

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}
