"use client";

import { useMemo } from "react";
import { UniversalApp, createWebPlatformRuntime } from "../../../universal-app";

const appBasePath = process.env.NEXT_PUBLIC_UNIVERSAL_APP_BASE_PATH ?? "/app";
const bffBaseUrl = process.env.NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL ?? "/api/backend";
const authBaseUrl = process.env.NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL ?? "/api/auth";

export default function UniversalAppPage() {
  const platform = useMemo(
    () => createWebPlatformRuntime({ apiBaseUrl: bffBaseUrl, authBaseUrl }),
    [],
  );

  return <UniversalApp config={{ basePath: appBasePath }} platform={platform} />;
}
