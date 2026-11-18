import { NextRequest, NextResponse } from 'next/server';

// ورود با گوگل — نقطهٔ شروعِ سمت فرانت. مرورگر را به مسیر OAuth بک‌اند
// (api.vodda.ir) می‌فرستد؛ بعد از تکمیل ورود، بک‌اند کوکی‌های سشن را روی
// دامنهٔ والد می‌نشاند و کاربر به مسیر «next» برمی‌گردد.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): NextResponse {
  const base = (process.env.PUBLIC_API_BASE_URL || 'https://api.vodda.ir').replace(/\/$/, '');
  const next = request.nextUrl.searchParams.get('next') || '/app/';
  return NextResponse.redirect(`${base}/api/v1/auth/google?next=${encodeURIComponent(next)}`);
}
