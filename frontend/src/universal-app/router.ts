import { useSyncExternalStore } from "react";
import type { UniversalAppConfig } from "./config";
import { defaultUniversalAppConfig } from "./config";

export type AppRouteName =
  | "home"
  | "login"
  | "search"
  | "teacher"
  | "book"
  | "sessions"
  | "wallet"
  | "profile"
  | "profile-edit"
  | "teacher-home"
  | "teacher-requests"
  | "teacher-sessions"
  | "teacher-services"
  | "teacher-work-times"
  | "teacher-wallet"
  | "teacher-withdraw"
  | "teacher-profile"
  | "teacher-reviews"
  | "not-found";

export type AppRoute = {
  name: AppRouteName;
  pathname: string;
  params: Record<string, string>;
};

const listeners = new Set<() => void>();
let listening = false;

function emitRouteChange() {
  listeners.forEach((listener) => listener());
}

function ensureBrowserListeners() {
  if (typeof window === "undefined" || listening) return;
  window.addEventListener("popstate", emitRouteChange);
  listening = true;
}

function subscribe(listener: () => void) {
  ensureBrowserListeners();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentPathname() {
  return typeof window === "undefined" ? "/" : window.location.pathname;
}

function stripBasePath(pathname: string, config: UniversalAppConfig) {
  const basePath = config.basePath;
  if (!basePath) return pathname || "/";
  if (pathname === basePath) return "/";
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || "/";
  return pathname;
}

function segmentMatch(pathname: string, pattern: RegExp, name: AppRouteName): AppRoute | null {
  const match = pathname.match(pattern);
  if (!match) return null;
  return { name, pathname, params: match.groups ?? {} };
}

export function resolveAppRoute(
  pathname: string,
  config: UniversalAppConfig = defaultUniversalAppConfig,
): AppRoute {
  const path = stripBasePath(pathname, config).replace(/\/+$/, "") || "/";
  const staticRoutes: Record<string, AppRouteName> = {
    "/": "home",
    "/login": "login",
    "/search": "search",
    "/sessions": "sessions",
    "/wallet": "wallet",
    "/profile": "profile",
    "/profile/edit": "profile-edit",
    "/t": "teacher-home",
    "/t/requests": "teacher-requests",
    "/t/sessions": "teacher-sessions",
    "/t/services": "teacher-services",
    "/t/work-times": "teacher-work-times",
    "/t/wallet": "teacher-wallet",
    "/t/withdraw": "teacher-withdraw",
    "/t/profile": "teacher-profile",
    "/t/reviews": "teacher-reviews",
  };
  const staticName = staticRoutes[path];
  if (staticName) return { name: staticName, pathname: path, params: {} };
  return (
    segmentMatch(path, /^\/teacher\/(?<id>[^/]+)$/, "teacher") ??
    segmentMatch(path, /^\/book\/(?<id>[^/]+)$/, "book") ??
    { name: "not-found", pathname: path, params: {} }
  );
}

export function appUrl(
  path: string,
  config: UniversalAppConfig = defaultUniversalAppConfig,
) {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${config.basePath}${normalizedPath}` || "/";
}

export function navigateApp(
  path: string,
  config: UniversalAppConfig = defaultUniversalAppConfig,
  options: { replace?: boolean } = {},
) {
  if (typeof window === "undefined") return;
  const url = appUrl(path, config);
  if (options.replace) window.history.replaceState({}, "", url);
  else window.history.pushState({}, "", url);
  emitRouteChange();
}

export function useAppRoute(config: UniversalAppConfig = defaultUniversalAppConfig) {
  const pathname = useSyncExternalStore(subscribe, currentPathname, () => "/");
  return resolveAppRoute(pathname, config);
}
