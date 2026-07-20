import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');
const PANEL_PATHS = ['/panel/user', '/panel/teacher', '/panel/admin'];

type MeResponse = { data?: { role?: string } };

function loginRedirect(request: NextRequest): NextResponse {
  const url = new URL('/panel/login', request.url);
  url.searchParams.set('redirect', request.nextUrl.pathname);
  const response = NextResponse.redirect(url);
  response.cookies.set('vodda_token', '', { path: '/', maxAge: 0, httpOnly: true });
  response.cookies.set('vodda_session', '', { path: '/', maxAge: 0 });
  return response;
}

function roleCanAccess(pathname: string, role: string): boolean {
  if (pathname.startsWith('/panel/admin')) return role === 'admin';
  if (pathname.startsWith('/panel/teacher/register')) return Boolean(role);
  if (pathname.startsWith('/panel/teacher')) return role === 'teacher' || role === 'admin';
  if (pathname.startsWith('/panel/user')) return Boolean(role);
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === '/panel/login') return NextResponse.next();
  const isPanel = PANEL_PATHS.some(path => pathname.startsWith(path));
  if (!isPanel) return NextResponse.next();

  const token = request.cookies.get('vodda_token')?.value;
  if (!token) return loginRedirect(request);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const response = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) return loginRedirect(request);

    const payload = (await response.json()) as MeResponse;
    const role = payload.data?.role || '';
    if (!roleCanAccess(pathname, role)) {
      const destination = role === 'admin' ? '/panel/admin' : role === 'teacher' ? '/panel/teacher' : '/panel/user';
      return NextResponse.redirect(new URL(destination, request.url));
    }
    return NextResponse.next();
  } catch {
    return new NextResponse('Service unavailable', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'retry-after': '5' },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const config = {
  matcher: ['/panel/:path*'],
};
