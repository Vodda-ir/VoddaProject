import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const API_BASE = (process.env.SERVER_API_URL || 'http://backend:3420/api/v1').replace(/\/$/, '');

// Saman Sep redirects the payer's browser back to this endpoint (RedirectURL
// configured at token time). The POST comes from sep.shaparak.ir, so the
// same-origin guard does NOT apply — the backend validates the payload
// against the stored order instead. The handler relays the form to the Go
// backend and forwards its 302 landing redirect to the wallet page.
export async function POST(request: NextRequest): Promise<Response> {
  let form: URLSearchParams;
  try {
    const raw = await request.text();
    form = new URLSearchParams(raw);
  } catch {
    form = new URLSearchParams();
  }
  return relay(request, form);
}

// Some gateway configurations land with a GET instead of a POST; relay the
// query parameters the same way.
export async function GET(request: NextRequest): Promise<Response> {
  return relay(request, new URLSearchParams(request.nextUrl.searchParams));
}

async function relay(request: NextRequest, form: URLSearchParams): Promise<Response> {
  const traceId = request.headers.get('x-request-id') || crypto.randomUUID();
  try {
    const upstream = await fetch(`${API_BASE}/payments/saman/callback`, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        'x-request-id': traceId,
      },
      body: form.toString(),
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
    });

    const location = upstream.headers.get('location');
    if (upstream.status >= 300 && upstream.status < 400 && location) {
      return NextResponse.redirect(location, { status: 302 });
    }
    // Unexpected answer: send the payer somewhere sensible rather than a raw error.
    return NextResponse.redirect(
      new URL('/panel/user/wallet?payment=failed', request.url),
      { status: 302 },
    );
  } catch {
    return NextResponse.redirect(
      new URL('/panel/user/wallet?payment=failed', request.url),
      { status: 302 },
    );
  }
}
