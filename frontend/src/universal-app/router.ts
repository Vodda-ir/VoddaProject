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
  | "dispatch"
  | "call-hub"
  | "ceremony-new"
  | "ceremony-calls"
  | "ceremony-call"
  | "ceremony-booking"
  | "presence"
  | "presence-provider"
  | "teacher-home"
  | "teacher-requests"
  | "teacher-sessions"
  | "teacher-services"
  | "teacher-work-times"
  | "teacher-wallet"
  | "teacher-withdraw"
  | "teacher-profile"
  | "teacher-reviews"
  | "teacher-dispatch"
  | "teacher-ceremony"
  | "teacher-presence"
  | "not-found";

export type AppRoute = {
  name: AppRouteName;
  pathname: string;
  params: Record<string, string>;
};

export const appRoutePaths = {
  home: "/",
  login: "/login",
  search: "/search",
  sessions: "/sessions",
  wallet: "/wallet",
  profile: "/profile",
  "profile-edit": "/profile/edit",
  dispatch: "/dispatch",
  "call-hub": "/call",
  "ceremony-new": "/ceremony/new",
  "ceremony-calls": "/ceremony/calls",
  presence: "/presence",
  "teacher-home": "/t",
  "teacher-requests": "/t/requests",
  "teacher-sessions": "/t/sessions",
  "teacher-services": "/t/services",
  "teacher-work-times": "/t/work-times",
  "teacher-wallet": "/t/wallet",
  "teacher-withdraw": "/t/withdraw",
  "teacher-profile": "/t/profile",
  "teacher-reviews": "/t/reviews",
  "teacher-dispatch": "/t/dispatch",
  "teacher-ceremony": "/t/ceremony",
  "teacher-presence": "/t/presence",
} as const;

export type StaticAppRouteName = keyof typeof appRoutePaths;
export type DynamicAppRouteName =
  | "teacher"
  | "book"
  | "ceremony-call"
  | "ceremony-booking"
  | "presence-provider";

/** مسیرهای داینامیک: الگوی matching + پیشوند ساخت URL از نام مسیر. */
const dynamicRoutes: Record<DynamicAppRouteName, { pattern: RegExp; prefix: string }> = {
  teacher: { pattern: /^\/teacher\/(?<id>[^/]+)$/, prefix: "/teacher" },
  book: { pattern: /^\/book\/(?<id>[^/]+)$/, prefix: "/book" },
  "ceremony-call": { pattern: /^\/ceremony\/calls\/(?<id>[^/]+)$/, prefix: "/ceremony/calls" },
  "ceremony-booking": { pattern: /^\/ceremony\/bookings\/(?<id>[^/]+)$/, prefix: "/ceremony/bookings" },
  "presence-provider": { pattern: /^\/presence\/(?<id>[^/]+)$/, prefix: "/presence" },
};

function isDynamicAppRouteName(name: AppRouteName): name is DynamicAppRouteName {
  return Object.prototype.hasOwnProperty.call(dynamicRoutes, name);
}

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
  const staticRoutes = Object.entries(appRoutePaths).reduce<Record<string, StaticAppRouteName>>(
    (routes, [name, routePath]) => {
      routes[routePath] = name as StaticAppRouteName;
      return routes;
    },
    {},
  );
  const staticName = staticRoutes[path];
  if (staticName) return { name: staticName, pathname: path, params: {} };
  for (const name of Object.keys(dynamicRoutes) as DynamicAppRouteName[]) {
    const matched = segmentMatch(path, dynamicRoutes[name].pattern, name);
    if (matched) return matched;
  }
  return { name: "not-found", pathname: path, params: {} };
}

export function appPath(name: StaticAppRouteName): string;
export function appPath(name: DynamicAppRouteName, params: { id: string }): string;
export function appPath(name: StaticAppRouteName | DynamicAppRouteName, params?: { id: string }) {
  if (isDynamicAppRouteName(name)) {
    const id = params?.id?.trim();
    if (!id) throw new Error(`Missing route parameter \"id\" for ${name}`);
    return `${dynamicRoutes[name].prefix}/${encodeURIComponent(id)}`;
  }
  return appRoutePaths[name];
}

export function appUrl(
  path: string,
  config: UniversalAppConfig = defaultUniversalAppConfig,
) {
  const normalizedPath = path === "/" ? "" : path.startsWith("/") ? path : `/${path}`;
  return `${config.basePath}${normalizedPath}` || "/";
}

export function appRouteUrl(
  name: StaticAppRouteName,
  config?: UniversalAppConfig,
): string;
export function appRouteUrl(
  name: DynamicAppRouteName,
  params: { id: string },
  config?: UniversalAppConfig,
): string;
export function appRouteUrl(
  name: StaticAppRouteName | DynamicAppRouteName,
  paramsOrConfig?: { id: string } | UniversalAppConfig,
  maybeConfig: UniversalAppConfig = defaultUniversalAppConfig,
) {
  if (isDynamicAppRouteName(name)) {
    return appUrl(appPath(name, paramsOrConfig as { id: string }), maybeConfig);
  }
  return appUrl(appPath(name), (paramsOrConfig as UniversalAppConfig | undefined) ?? defaultUniversalAppConfig);
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

export function navigateAppRoute(
  name: StaticAppRouteName,
  config?: UniversalAppConfig,
  options?: { replace?: boolean },
): void;
export function navigateAppRoute(
  name: DynamicAppRouteName,
  params: { id: string },
  config?: UniversalAppConfig,
  options?: { replace?: boolean },
): void;
export function navigateAppRoute(
  name: StaticAppRouteName | DynamicAppRouteName,
  paramsOrConfig?: { id: string } | UniversalAppConfig,
  configOrOptions?: UniversalAppConfig | { replace?: boolean },
  maybeOptions: { replace?: boolean } = {},
) {
  if (isDynamicAppRouteName(name)) {
    navigateApp(
      appPath(name, paramsOrConfig as { id: string }),
      (configOrOptions as UniversalAppConfig | undefined) ?? defaultUniversalAppConfig,
      maybeOptions,
    );
    return;
  }
  navigateApp(
    appPath(name),
    (paramsOrConfig as UniversalAppConfig | undefined) ?? defaultUniversalAppConfig,
    (configOrOptions as { replace?: boolean } | undefined) ?? {},
  );
}

export function useAppRoute(config: UniversalAppConfig = defaultUniversalAppConfig) {
  const pathname = useSyncExternalStore(subscribe, currentPathname, () => "/");
  return resolveAppRoute(pathname, config);
}
