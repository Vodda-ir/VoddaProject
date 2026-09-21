import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { UniversalAppConfig } from "../config";
import { appRouteUrl, navigateAppRoute, type AppRouteName } from "../router";
import { Icon } from "./Icon";
import { colors, gradients, radii, shadows, spacing, typography } from "./theme";

type IconName = Parameters<typeof Icon>[0]["name"];

type NavigationItem = {
  label: string;
  target: Exclude<AppRouteName, "teacher" | "book" | "not-found">;
  icon: IconName;
  routes: AppRouteName[];
};

type AppShellProps = {
  children: ReactNode;
  config: UniversalAppConfig;
  routeName: AppRouteName;
  title?: string;
};

const learnerNavigation: NavigationItem[] = [
  { label: "خانه", target: "home", icon: "home", routes: ["home"] },
  { label: "جستجو", target: "search", icon: "search", routes: ["search", "teacher", "book"] },
  { label: "جلسات", target: "sessions", icon: "calendar", routes: ["sessions"] },
  { label: "کیف پول", target: "wallet", icon: "wallet", routes: ["wallet"] },
  { label: "پروفایل", target: "profile", icon: "user", routes: ["profile", "profile-edit"] },
];

const teacherNavigation: NavigationItem[] = [
  { label: "داشبورد", target: "teacher-home", icon: "grid", routes: ["teacher-home"] },
  { label: "درخواست‌ها", target: "teacher-requests", icon: "message", routes: ["teacher-requests"] },
  { label: "جلسات", target: "teacher-sessions", icon: "calendar", routes: ["teacher-sessions"] },
  { label: "کیف پول", target: "teacher-wallet", icon: "wallet", routes: ["teacher-wallet", "teacher-withdraw"] },
  { label: "پروفایل", target: "teacher-profile", icon: "user", routes: ["teacher-profile", "teacher-reviews", "teacher-services", "teacher-work-times"] },
];

const tabRoutes = new Set<AppRouteName>([
  "home",
  "search",
  "sessions",
  "wallet",
  "profile",
  "teacher-home",
  "teacher-requests",
  "teacher-sessions",
  "teacher-wallet",
  "teacher-profile",
]);

const rootStyle: CSSProperties = {
  minHeight: "100dvh",
  background: `radial-gradient(circle at 50% -20%, ${colors.olive100} 0%, ${colors.sand50} 36%, ${colors.sand100} 100%)`,
  color: colors.ink,
  fontFamily: typography.fontFamily,
  direction: "rtl",
};

const frameStyle: CSSProperties = {
  width: "100%",
  maxWidth: 720,
  minHeight: "100dvh",
  margin: "0 auto",
  background: colors.sand50,
  position: "relative",
  boxShadow: shadows.md,
};

const contentStyle: CSSProperties = {
  paddingInline: spacing.xl,
  paddingTop: `max(${spacing.lg}px, env(safe-area-inset-top))`,
  paddingBottom: `calc(106px + env(safe-area-inset-bottom))`,
};

function navigate(
  event: MouseEvent<HTMLAnchorElement>,
  target: NavigationItem["target"],
  config: UniversalAppConfig,
) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  navigateAppRoute(target, config);
}

function BottomNavigation({
  items,
  routeName,
  config,
  ariaLabel,
}: {
  items: NavigationItem[];
  routeName: AppRouteName;
  config: UniversalAppConfig;
  ariaLabel: string;
}) {
  return (
    <nav
      aria-label={ariaLabel}
      className="vodda-bottom-nav"
      style={{
        position: "fixed",
        zIndex: 30,
        left: "50%",
        bottom: "max(10px, env(safe-area-inset-bottom))",
        width: "min(calc(100% - 24px), 620px)",
        transform: "translateX(-50%)",
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        gap: 2,
        padding: "7px 8px",
        border: "1px solid rgba(228,221,204,.82)",
        borderRadius: 26,
        background: "rgba(255,255,255,.92)",
        boxShadow: shadows.floating,
        backdropFilter: "blur(18px)",
      }}
    >
      {items.map((item) => {
        const active = item.routes.includes(routeName);
        return (
          <a
            key={item.target}
            href={appRouteUrl(item.target, config)}
            aria-current={active ? "page" : undefined}
            onClick={(event) => navigate(event, item.target, config)}
            style={{
              minWidth: 0,
              minHeight: 58,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              borderRadius: 20,
              color: active ? colors.olive700 : colors.inkMuted,
              background: "transparent",
              textDecoration: "none",
              fontSize: 10.5,
              fontWeight: active ? 800 : 600,
            }}
          >
            <span
              style={{
                width: 38,
                height: 29,
                display: "grid",
                placeItems: "center",
                borderRadius: radii.pill,
                color: active ? colors.surface : colors.inkMuted,
                background: active ? colors.olive600 : "transparent",
                boxShadow: active ? "0 5px 14px rgba(94,110,67,.23)" : undefined,
              }}
            >
              <Icon name={item.icon} size={19} stroke={active ? 2 : 1.7} />
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

function ShellHeader({ title, routeName }: { title?: string; routeName: AppRouteName }) {
  if (!title || routeName === "home" || routeName === "teacher-home") return null;
  const canGoBack = !tabRoutes.has(routeName);
  return (
    <header
      style={{
        minHeight: 52,
        display: "grid",
        gridTemplateColumns: "44px 1fr 44px",
        alignItems: "center",
        marginBottom: spacing.lg,
      }}
    >
      <div>
        {canGoBack ? (
          <button
            type="button"
            aria-label="بازگشت"
            className="vodda-tappable"
            onClick={() => window.history.back()}
            style={{
              width: 40,
              height: 40,
              display: "grid",
              placeItems: "center",
              padding: 0,
              border: `1px solid ${colors.sand200}`,
              borderRadius: "50%",
              color: colors.inkSecondary,
              background: colors.surface,
              boxShadow: shadows.xs,
              cursor: "pointer",
            }}
          >
            <Icon name="arrowL" size={19} stroke={1.9} />
          </button>
        ) : null}
      </div>
      <div style={{ minWidth: 0, textAlign: "center" }}>
        <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>
          {routeName.startsWith("teacher-") ? "فضای استاد" : "وُدّا"}
        </p>
        <h1
          style={{
            ...typography.title,
            margin: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: colors.ink,
          }}
        >
          {title}
        </h1>
      </div>
      <div />
    </header>
  );
}

function Shell({
  children,
  config,
  routeName,
  title,
  mode,
}: AppShellProps & { mode: "learner" | "teacher" }) {
  const items = mode === "teacher" ? teacherNavigation : learnerNavigation;
  return (
    <div dir="rtl" data-app-shell={mode} style={rootStyle}>
      <div
        data-vodda-frame
        style={{
          ...frameStyle,
          background: mode === "teacher"
            ? `linear-gradient(180deg, ${colors.olive50} 0px, ${colors.sand50} 220px)`
            : colors.sand50,
        }}
      >
        <div style={contentStyle}>
          <ShellHeader title={title} routeName={routeName} />
          {children}
        </div>
        <BottomNavigation
          items={items}
          routeName={routeName}
          config={config}
          ariaLabel={mode === "teacher" ? "ناوبری اصلی استاد" : "ناوبری اصلی قرآن‌آموز"}
        />
      </div>
    </div>
  );
}

export function MobileAppShell(props: AppShellProps) {
  return <Shell {...props} mode="learner" />;
}

export function TeacherAppShell(props: AppShellProps) {
  return <Shell {...props} mode="teacher" />;
}
