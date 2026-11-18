import { NextResponse } from "next/server";

// 🚀 health check برای دیپلوی سریع — curl https://vodda.ir/health
// عمداً سبک نگه داشته شده: بدون وابستگی خارجی؛ فقط زنده‌بودن پروسس وب.
// پارتی کامل با frontend/src/app/health/route.ts در ریپو اصلی.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const startedAt = Date.now();

export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "vodda-frontend",
      uptime: Math.round((Date.now() - startedAt) / 1000),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
