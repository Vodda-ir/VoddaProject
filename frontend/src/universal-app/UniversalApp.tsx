"use client";

import { useMemo } from "react";
import { createUniversalAppConfig, type UniversalAppConfig } from "./config";
import { PlatformProvider } from "./platform/context";
import type { PlatformRuntime } from "./platform/types";
import { createWebPlatformRuntime } from "./platform/web";
import { navigateApp, useAppRoute, type AppRouteName } from "./router";
import { MobileAppShell, TeacherAppShell, Card, colors, typography } from "./ui";

export type UniversalAppProps = {
  config?: Partial<UniversalAppConfig>;
  platform?: PlatformRuntime;
};

const routeTitles: Record<AppRouteName, string> = {
  home: "وُدّا",
  login: "ورود",
  search: "جستجوی استاد",
  teacher: "پروفایل استاد",
  book: "رزرو جلسه",
  sessions: "جلسات من",
  wallet: "کیف پول",
  profile: "پروفایل",
  "profile-edit": "ویرایش پروفایل",
  "teacher-home": "داشبورد استاد",
  "teacher-requests": "درخواست‌های جلسه",
  "teacher-sessions": "جلسات استاد",
  "teacher-services": "خدمات استاد",
  "teacher-work-times": "برنامه کاری",
  "teacher-wallet": "کیف پول استاد",
  "teacher-withdraw": "برداشت",
  "teacher-profile": "پروفایل استاد",
  "teacher-reviews": "نظرها",
  "not-found": "صفحه پیدا نشد",
};

const teacherRoutes = new Set<AppRouteName>([
  "teacher-home",
  "teacher-requests",
  "teacher-sessions",
  "teacher-services",
  "teacher-work-times",
  "teacher-wallet",
  "teacher-withdraw",
  "teacher-profile",
  "teacher-reviews",
]);

function RoutePlaceholder({ routeName, pathname }: { routeName: AppRouteName; pathname: string }) {
  if (routeName === "not-found") {
    return (
      <Card>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          این مسیر در اپ وُدّا تعریف نشده است.
        </p>
        <button type="button" onClick={() => navigateApp("/")}>بازگشت به اپ</button>
      </Card>
    );
  }

  return (
    <Card>
      <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary }}>
        محتوای این مسیر در فازهای parity بعدی جایگزین می‌شود.
      </p>
      <p dir="ltr" style={{ ...typography.caption, margin: "8px 0 0", color: colors.inkMuted, textAlign: "right" }}>
        {pathname}
      </p>
    </Card>
  );
}

export function UniversalApp({ config: configOverrides, platform }: UniversalAppProps) {
  const config = useMemo(
    () => createUniversalAppConfig(configOverrides),
    [configOverrides?.basePath],
  );
  const runtime = useMemo(() => platform ?? createWebPlatformRuntime(), [platform]);
  const route = useAppRoute(config);
  const content = <RoutePlaceholder routeName={route.name} pathname={route.pathname} />;

  if (route.name === "login") {
    return (
      <PlatformProvider runtime={runtime}>
        <main
          dir="rtl"
          data-universal-app="vodda"
          data-platform={runtime.kind}
          style={{ minHeight: "100dvh", background: colors.sand50, color: colors.ink }}
        >
          <section
            style={{
              width: "100%",
              maxWidth: 520,
              margin: "0 auto",
              paddingInline: 20,
              paddingTop: "max(32px, env(safe-area-inset-top))",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            <h1 style={{ ...typography.heading, color: colors.olive900 }}>{routeTitles[route.name]}</h1>
            {content}
          </section>
        </main>
      </PlatformProvider>
    );
  }

  const shell = teacherRoutes.has(route.name) ? (
    <TeacherAppShell config={config} routeName={route.name} title={routeTitles[route.name]}>
      {content}
    </TeacherAppShell>
  ) : (
    <MobileAppShell config={config} routeName={route.name} title={routeTitles[route.name]}>
      {content}
    </MobileAppShell>
  );

  return (
    <PlatformProvider runtime={runtime}>
      <main data-universal-app="vodda" data-platform={runtime.kind} style={{ minHeight: "100dvh" }}>
        {shell}
      </main>
    </PlatformProvider>
  );
}
