export { UniversalApp } from "./UniversalApp";
export type { UniversalAppProps } from "./UniversalApp";
export { mountUniversalApp } from "./entry";
export { appUrl, navigateApp, resolveAppRoute, useAppRoute } from "./router";
export { createUniversalAppConfig, defaultUniversalAppConfig } from "./config";
export { PlatformProvider, usePlatform } from "./platform/context";
export { createNativePlatformRuntime } from "./platform/native";
export { createWebPlatformRuntime } from "./platform/web";
export type { AppRoute, AppRouteName } from "./router";
export type { UniversalAppConfig } from "./config";
export type {
  AuthUser,
  PlatformKind,
  PlatformRequestInit,
  PlatformRuntime,
  SecureTokenStorage,
  VerifyOtpResult,
} from "./platform/types";
