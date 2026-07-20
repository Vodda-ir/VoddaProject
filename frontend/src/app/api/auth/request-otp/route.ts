import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginMutation } from '@/lib/server/same-origin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');

export async function POST(request: NextRequest): Promise<Response> {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'درخواست بین‌دامنه‌ای مجاز نیست' }, { status: 403 });
  }
  try {
    const body = await request.text();
    const upstream = await fetch(`${API_BASE}/auth/request-otp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const payload = await upstream.text();
    return new Response(payload, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
        'cache-control': 'no-store',
        ...(upstream.headers.get('retry-after')
          ? { 'retry-after': upstream.headers.get('retry-after')! }
          : {}),
      },
    });
  } catch {
    return NextResponse.json({ error: 'ارسال کد تأیید در حال حاضر ممکن نیست' }, { status: 502 });
  }
}
