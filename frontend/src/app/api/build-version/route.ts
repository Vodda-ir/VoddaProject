import { NextResponse } from 'next/server';

// نسخهٔ بیلد — کلید مکانیزم به‌روزرسانی خودکار اپ. کلاینت هر از گاهی این
// مسیر را می‌خواند و اگر SHA بیلدِ سرو‌شده با SHA تزریق‌شده در باندل خودش
// فرق کند، یک‌بار صفحه را رفرش می‌کند تا همیشه آخرین نسخه اجرا شود.
// (جایگزین امنِ useBuildRefresh قدیمی — بدون مقایسهٔ chunk های lazy.)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET(): NextResponse {
  const sha = process.env.NEXT_PUBLIC_BUILD_SHA || 'dev';
  return NextResponse.json(
    { data: { sha } },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } },
  );
}
