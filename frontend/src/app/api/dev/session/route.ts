import { NextRequest, NextResponse } from 'next/server';

/**
 * ورود توسعه‌ای پیش‌نمایش — فقط در `next dev` کار می‌کند.
 *
 * هدف: دیدن اپ با دادهٔ واقعی در پیش‌نمایش محلی، بدون لاگین OTP.
 * توکن از متغیر محیطی DEV_SESSION_TOKEN خوانده می‌شود (در .env.local که
 * گیت‌شده نیست) و هرگز در کد یا مخزن قرار نمی‌گیرد.
 *
 * در build پروداکشن این مسیر همیشه ۴۰۴ می‌دهد — هیچ سطحی روی پروداکشن ندارد.
 * استقرار: GET /api/dev/session → ست کوکی‌های vodda_token/vodda_session →
 * ریدایرکت به /app (یا ?to= مسیر امن داخلی).
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

function safeInternalTarget(raw: string | null): string {
  if (!raw) return '/app';
  // فقط مسیر نسبی داخلی — جلوگیری از open redirect.
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('://')) return '/app';
  return raw;
}

export async function GET(request: NextRequest): Promise<Response> {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const token = (process.env.DEV_SESSION_TOKEN ?? '').trim();
  if (!token) {
    return NextResponse.json(
      { error: 'DEV_SESSION_TOKEN در .env.local تنظیم نشده است' },
      { status: 503 },
    );
  }

  const target = safeInternalTarget(request.nextUrl.searchParams.get('to'));
  // ریدایرکت نسبی — مستقل از Host/پروتکل گیت‌وی (پیش‌نمایش https روی http داخلی).
  const response = new NextResponse(null, { status: 307, headers: { location: target } });
  response.cookies.set('vodda_token', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  response.cookies.set('vodda_session', '1', {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
