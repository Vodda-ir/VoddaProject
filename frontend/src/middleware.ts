import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PANEL_PATHS = ['/panel/user', '/panel/teacher', '/panel/admin'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Don't redirect the login page itself
  if (pathname === '/panel/login') return NextResponse.next();

  // Check if accessing a panel route
  const isPanel = PANEL_PATHS.some(p => pathname.startsWith(p));
  if (!isPanel) return NextResponse.next();

  // Check for token in cookie (set after login)
  const token = request.cookies.get('vodda_token')?.value;
  if (!token) {
    const url = new URL('/panel/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/panel/:path*'],
};
