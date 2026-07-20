import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(): Promise<Response> {
  const response = NextResponse.json({ data: { logged_out: true } });
  response.headers.set('cache-control', 'no-store');
  response.cookies.set('vodda_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set('vodda_session', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return response;
}
