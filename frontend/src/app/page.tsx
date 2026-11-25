import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UniversalAppHost } from "./app/[[...path]]/universal-app-host";

/**
 * همسان‌سازی کامل وب با اپ — ریشهٔ وب اکنون دقیقاً همان رابط اپ یونیورسال است.
 *
 * قرارداد میزبانی (docs/universal-app-web-deployment.md):
 * - روی ساب‌دامین ریشهٔ اپ (UNIVERSAL_APP_ROOT_HOST = app.vodda.ir) اپ در `/`
 *   رندر می‌شود (معمولاً nginx پیش از رسیدن به این صفحه، `/` را به `/app`
 *   بازنویسی می‌کند؛ این شاخه فقط پوشش دفاعی است).
 * - روی دامنهٔ اصلی (vodda.ir) بازدیدکنندهٔ ریشه به `/app` هدایت می‌شود تا
 *   همان رابط اپ، همان تم، همان فونت و همان جریان ورود را ببیند؛
 *   لندینگ تبلیغاتی قدیمی بازنشسته شد و مسیرهای پنل قدیمی در next.config
 *   به معادل‌های اپ نگاشت می‌شوند.
 */

function hostnameFromHeader(value: string | null): string {
  const hostname = value?.split(",")[0].trim().replace(/:\d+$/, "").toLowerCase();
  return hostname ?? "";
}

type SearchParams = Record<string, string | string[] | undefined>;

function searchParamsToQuery(searchParams: SearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((item) => params.append(key, item));
    else params.append(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const requestHeaders = await headers();
  const requestHost = hostnameFromHeader(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  const appRootHost = process.env.UNIVERSAL_APP_ROOT_HOST?.trim().toLowerCase();
  const configuredBasePath = process.env.NEXT_PUBLIC_UNIVERSAL_APP_BASE_PATH;
  const basePath = requestHost && requestHost === appRootHost
    ? ""
    : configuredBasePath ?? "/app";

  if (basePath === "") {
    return <UniversalAppHost basePath="" />;
  }

  const resolvedSearchParams = await searchParams;
  redirect(`/app${searchParamsToQuery(resolvedSearchParams)}`);
}
