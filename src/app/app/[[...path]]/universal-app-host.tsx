"use client";

import { useMemo } from "react";
import { UniversalApp, createWebPlatformRuntime } from "../../../universal-app";

const bffBaseUrl = process.env.NEXT_PUBLIC_UNIVERSAL_APP_BFF_BASE_URL ?? "/api/backend";
const authBaseUrl = process.env.NEXT_PUBLIC_UNIVERSAL_APP_AUTH_BASE_URL ?? "/api/auth";

export function UniversalAppHost({ basePath }: { basePath: string }) {
  const platform = useMemo(
    () => createWebPlatformRuntime({ apiBaseUrl: bffBaseUrl, authBaseUrl }),
    [],
  );

  return <UniversalApp config={{ basePath }} platform={platform} />;
}
