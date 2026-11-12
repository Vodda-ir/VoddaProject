import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/server/same-origin';
import { sessionCookieDomain } from '@/lib/server/session-cookies';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');
const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

type VerifyPayload = {
  data?: {
    token?: string;
    user?: unknown;
    role?: string;
    need_profile?: boolean;
    [key: string]: unknown;
  };
  error?: string;
};

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'درخواست بین‌دامنه‌ای مجاز نیست' }, { status: 403 });
  }
  try {
    const body = await request.text();
    const upstream = await fetch(`${API_BASE}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const payload = (await upstream.json().catch(() => ({}))) as VerifyPayload;
    if (!upstream.ok) {
      return NextResponse.json(payload, { status: upstream.status });
    }

    const token = payload.data?.token;
    if (!token) {
      return NextResponse.json({ error: 'پاسخ احراز هویت معتبر نیست' }, { status: 502 });
    }

    const publicData = { ...(payload.data || {}) };
    delete publicData.token;
    const response = NextResponse.json({ data: publicData }, { status: upstream.status });
    response.headers.set('cache-control', 'no-store');
    response.cookies.set('vodda_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: sessionCookieDomain(),
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    response.cookies.set('vodda_session', '1', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: sessionCookieDomain(),
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'بررسی کد تأیید در حال حاضر ممکن نیست' }, { status: 502 });
  }
}
