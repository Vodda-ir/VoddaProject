import type { CSSProperties, MouseEvent, ReactNode } from "react";
import type { UniversalAppConfig } from "../config";
import { appRouteUrl, navigateAppRoute, type AppRouteName } from "../router";
import { Icon } from "./Icon";
import { colors, radii, shadows, spacing, typography } from "./theme";

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
  { label: "داشبورد", target: "teacher-home", icon: "home", routes: ["teacher-home"] },
  { label: "درخواست‌ها", target: "teacher-requests", icon: "bell", routes: ["teacher-requests"] },
  { label: "جلسات", target: "teacher-sessions", icon: "calendar", routes: ["teacher-sessions"] },
  { label: "کیف پول", target: "teacher-wallet", icon: "wallet", routes: ["teacher-wallet", "teacher-withdraw"] },
  { label: "پروفایل", target: "teacher-profile", icon: "user", routes: ["teacher-profile", "teacher-reviews", "teacher-services", "teacher-work-times"] },
];

const rootStyle: CSSProperties = {
  minHeight: "100dvh",
  background: colors.sand50,
  color: colors.ink,
  fontFamily: typography.fontFamily,
  direction: "rtl",
};

const frameStyle: CSSProperties = {
  width: "100%",
  maxWidth: 640,
  minHeight: "100dvh",
  margin: "0 auto",
  background: colors.surfaceWarm,
  position: "relative",
  boxShadow: shadows.sm,
};

const contentStyle: CSSProperties = {
  paddingInline: spacing.lg,
  paddingTop: `max(${spacing.xl}px, env(safe-area-inset-top))`,
  paddingBottom: `calc(92px + env(safe-area-inset-bottom))`,
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
      style={{
        position: "fixed",
        zIndex: 20,
        insetInline: 0,
        bottom: 0,
        width: "100%",
        maxWidth: 640,
        marginInline: "auto",
        display: "grid",
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        gap: spacing.xs,
        padding: `${spacing.sm}px ${spacing.sm}px max(${spacing.sm}px, env(safe-area-inset-bottom))`,
        borderTop: `1px solid ${colors.sand200}`,
        background: "rgba(255,255,255,0.96)",
        boxShadow: "0 -8px 28px rgba(46, 54, 34, 0.07)",
        backdropFilter: "blur(14px)",
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
              minHeight: 54,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              borderRadius: radii.md,
              color: active ? colors.olive700 : colors.inkMuted,
              background: active ? colors.olive50 : "transparent",
              textDecoration: "none",
              fontSize: 11,
              fontWeight: active ? 700 : 500,
            }}
          >
            <Icon name={item.icon} size={21} stroke={active ? 2 : 1.7} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

function ShellHeader({ title, eyebrow }: { title?: string; eyebrow: string }) {
  if (!title) return null;
  return (
    <header style={{ marginBottom: spacing.xl }}>
      <p style={{ ...typography.caption, margin: 0, color: colors.inkMuted }}>{eyebrow}</p>
      <h1 style={{ ...typography.heading, margin: `${spacing.xs}px 0 0`, color: colors.olive900 }}>{title}</h1>
    </header>
  );
}

export function MobileAppShell({ children, config, routeName, title }: AppShellProps) {
  return (
    <div dir="rtl" data-app-shell="learner" style={rootStyle}>
      <div style={frameStyle}>
        <div style={contentStyle}>
          <ShellHeader title={title} eyebrow="وُدّا" />
          {children}
        </div>
        <BottomNavigation
          items={learnerNavigation}
          routeName={routeName}
          config={config}
          ariaLabel="ناوبری اصلی قرآن‌آموز"
        />
      </div>
    </div>
  );
}

export function TeacherAppShell({ children, config, routeName, title }: AppShellProps) {
  return (
    <div dir="rtl" data-app-shell="teacher" style={rootStyle}>
      <div style={{ ...frameStyle, background: colors.olive50 }}>
        <div style={contentStyle}>
          <ShellHeader title={title} eyebrow="فضای استاد" />
          {children}
        </div>
        <BottomNavigation
          items={teacherNavigation}
          routeName={routeName}
          config={config}
          ariaLabel="ناوبری اصلی استاد"
        />
      </div>
    </div>
  );
}
