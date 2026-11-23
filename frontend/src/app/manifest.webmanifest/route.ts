import { headers } from "next/headers";

/**
 * مانیفست PWA وُدّا — پویا بر اساس هاست:
 * روی هاست اصلی اپ (app.vodda.ir) مسیرها از ریشه است و در بقیهٔ هاست‌ها
 * (مثل vodda.ir) اپ زیر /app سرو می‌شود؛ start_url و scope بر همان اساس
 * تنظیم می‌شود تا «افزودن به صفحهٔ اصلی» روی موبایل همیشه اپ را درست باز کند.
 */
export const dynamic = "force-dynamic";

function hostnameFromHeader(value: string | null): string {
  return value?.split(",")[0].trim().replace(/:\d+$/, "").toLowerCase() ?? "";
}

export async function GET() {
  const requestHeaders = await headers();
  const requestHost = hostnameFromHeader(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  const appRootHost = process.env.UNIVERSAL_APP_ROOT_HOST?.trim().toLowerCase();
  const onAppRoot = requestHost !== "" && requestHost === appRootHost;
  const startUrl = onAppRoot ? "/" : "/app";

  const manifest = {
    name: "وُدّا · همراهِ یادگیری قرآن کریم",
    short_name: "وُدّا",
    description:
      "وُدّا بستری برای اتصال آسان و مطمئن قرآن‌آموزان و اساتید مجرب برای جلسات آنلاین آموزش قرآن کریم و مراسم حضوری است.",
    lang: "fa",
    dir: "rtl",
    start_url: startUrl,
    scope: onAppRoot ? "/" : "/app",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f2",
    theme_color: "#4c5a36",
    categories: ["education", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return new Response(JSON.stringify(manifest, null, 2), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
