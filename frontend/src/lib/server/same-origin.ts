import 'server-only';

import type { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function urlHost(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

// Hosts this BFF accepts mutations from. TLS usually terminates at the CDN, so
// the forwarded scheme can legitimately differ from the browser's origin scheme
// (e.g. an http:// page behind an https-terminating proxy) — compare hosts only.
function acceptedHosts(request: NextRequest): Set<string> {
  const hosts = new Set<string>();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const host = request.headers.get('host');
  for (const value of [forwardedHost, host]) {
    const normalized = value?.toLowerCase();
    if (normalized) hosts.add(normalized);
  }
  for (const entry of (process.env.BFF_ALLOWED_HOSTS || '').split(',')) {
    const normalized = entry.trim().toLowerCase();
    if (normalized) hosts.add(normalized);
  }
  return hosts;
}

// SameSite=Lax cookies are the primary browser protection: cross-site POSTs never
// carry the session. This check adds a second boundary for state-changing BFF
// requests and rejects explicit cross-site calls while tolerating protocol (and
// proxy) differences for the very same host.
export function isSameOriginMutation(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return true;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return true;

  // Mobile shells (Capacitor) ship an app-specific origin scheme; they never
  // carry web cookies, so allowing them only relaxes the second boundary.
  if (/^capacitor:\/\//i.test(origin)) return true;

  const originHost = urlHost(origin);
  if (!originHost) return false;

  return acceptedHosts(request).has(originHost);
}
