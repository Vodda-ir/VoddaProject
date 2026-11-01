import { headers } from "next/headers";
import { UniversalAppHost } from "./universal-app-host";

function hostnameFromHeader(value: string | null): string {
  const hostname = value?.split(",")[0].trim().replace(/:\d+$/, "").toLowerCase();
  return hostname ?? "";
}

export default async function UniversalAppPage() {
  const requestHeaders = await headers();
  const requestHost = hostnameFromHeader(
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
  );
  const appRootHost = process.env.UNIVERSAL_APP_ROOT_HOST?.trim().toLowerCase();
  const configuredBasePath = process.env.NEXT_PUBLIC_UNIVERSAL_APP_BASE_PATH;
  const basePath = requestHost && requestHost === appRootHost
    ? ""
    : configuredBasePath ?? "/app";

  return <UniversalAppHost basePath={basePath} />;
}
