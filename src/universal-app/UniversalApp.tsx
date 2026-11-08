"use client";

import { useMemo } from "react";
import { createUniversalAppConfig, type UniversalAppConfig } from "./config";
import { LoginScreen, SessionBootstrap } from "./features/auth/AuthExperience";
import { ProfileCompletionScreen } from "./features/auth/ProfileCompletionScreen";
import { LearnerBookingScreen } from "./features/booking/LearnerBookingScreen";
import { LearnerDispatchScreen } from "./features/dispatch/LearnerDispatchScreen";
import { LearnerHomeScreen } from "./features/home/LearnerHomeScreen";
import { LearnerProfileScreen } from "./features/profile/LearnerProfileScreen";
import { LearnerSearchScreen } from "./features/search/LearnerSearchScreen";
import { LearnerSessionsScreen } from "./features/sessions/LearnerSessionsScreen";
import { TeacherDashboardScreen } from "./features/teacher/TeacherDashboardScreen";
import { TeacherDispatchScreen } from "./features/teacher/TeacherDispatchScreen";
import { TeacherProfileScreen } from "./features/teacher/TeacherProfileScreen";
import { TeacherReviewsScreen } from "./features/teacher/TeacherReviewsScreen";
import { TeacherServicesScreen } from "./features/teacher/TeacherServicesScreen";
import { TeacherSessionsScreen } from "./features/teacher/TeacherSessionsScreen";
import { TeacherWalletScreen } from "./features/teacher/TeacherWalletScreen";
import { TeacherWithdrawScreen } from "./features/teacher/TeacherWithdrawScreen";
import { TeacherWorkTimesScreen } from "./features/teacher/TeacherWorkTimesScreen";
import { LearnerTeacherProfileScreen } from "./features/teachers/LearnerTeacherProfileScreen";
import { LearnerWalletScreen } from "./features/wallet/LearnerWalletScreen";
import { PlatformProvider } from "./platform/context";
import type { PlatformRuntime } from "./platform/types";
import { createWebPlatformRuntime } from "./platform/web";
import { navigateApp, useAppRoute, type AppRouteName } from "./router";
import { MobileAppShell, TeacherAppShell, Card, UniversalVisualStyles, colors, typography } from "./ui";

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
  dispatch: "فراخوان استاد",
  sessions: "جلسات من",
  wallet: "کیف پول",
  profile: "پروفایل",
  "profile-edit": "ویرایش پروفایل",
  "teacher-home": "داشبورد استاد",
  "teacher-dispatch": "فراخوان‌های زنده",
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
  "teacher-dispatch",
  "teacher-requests",
  "teacher-sessions",
  "teacher-services",
  "teacher-work-times",
  "teacher-wallet",
  "teacher-withdraw",
  "teacher-profile",
  "teacher-reviews",
]);

function RoutePlaceholder({
  routeName,
  pathname,
  config,
}: {
  routeName: AppRouteName;
  pathname: string;
  config: UniversalAppConfig;
}) {
  if (routeName === "not-found") {
    return (
      <Card>
        <p style={{ ...typography.body, marginTop: 0, color: colors.inkSecondary }}>
          این مسیر در اپ وُدّا تعریف نشده است.
        </p>
        <button type="button" onClick={() => navigateApp("/", config)}>بازگشت به اپ</button>
      </Card>
    );
  }

  return (
    <Card>
      <p style={{ ...typography.body, margin: 0, color: colors.inkSecondary }}>
        این مسیر در نسخه فعلی وُدّا محتوای قابل نمایش ندارد.
      </p>
      <p dir="ltr" style={{ ...typography.caption, margin: "8px 0 0", color: colors.inkMuted, textAlign: "right" }}>
        {pathname}
      </p>
    </Card>
  );
}

function UniversalAppContent({ config, runtime }: { config: UniversalAppConfig; runtime: PlatformRuntime }) {
  const route = useAppRoute(config);

  if (route.name === "login") {
    return (
      <SessionBootstrap routeName={route.name} config={config}>
        <LoginScreen config={config} />
      </SessionBootstrap>
    );
  }

  if (route.name === "profile-edit") {
    return (
      <SessionBootstrap routeName={route.name} config={config}>
        <ProfileCompletionScreen config={config} />
      </SessionBootstrap>
    );
  }

  const teacherMode = teacherRoutes.has(route.name);
  const routeContent = route.name === "home" ? (
    <LearnerHomeScreen config={config} />
  ) : route.name === "search" ? (
    <LearnerSearchScreen config={config} />
  ) : route.name === "teacher" ? (
    <LearnerTeacherProfileScreen teacherId={route.params.id ?? ""} config={config} />
  ) : route.name === "book" ? (
    <LearnerBookingScreen teacherId={route.params.id ?? ""} config={config} />
  ) : route.name === "dispatch" ? (
    <LearnerDispatchScreen config={config} />
  ) : route.name === "sessions" ? (
    <LearnerSessionsScreen />
  ) : route.name === "wallet" ? (
    <LearnerWalletScreen />
  ) : route.name === "profile" ? (
    <LearnerProfileScreen config={config} />
  ) : route.name === "teacher-home" ? (
    <TeacherDashboardScreen config={config} />
  ) : route.name === "teacher-dispatch" ? (
    <TeacherDispatchScreen config={config} />
  ) : route.name === "teacher-requests" ? (
    <TeacherSessionsScreen mode="requests" />
  ) : route.name === "teacher-sessions" ? (
    <TeacherSessionsScreen mode="sessions" />
  ) : route.name === "teacher-services" ? (
    <TeacherServicesScreen />
  ) : route.name === "teacher-work-times" ? (
    <TeacherWorkTimesScreen />
  ) : route.name === "teacher-wallet" ? (
    <TeacherWalletScreen config={config} />
  ) : route.name === "teacher-withdraw" ? (
    <TeacherWithdrawScreen config={config} />
  ) : route.name === "teacher-profile" ? (
    <TeacherProfileScreen config={config} />
  ) : route.name === "teacher-reviews" ? (
    <TeacherReviewsScreen />
  ) : (
    <RoutePlaceholder routeName={route.name} pathname={route.pathname} config={config} />
  );
  const content = routeContent;
  const shell = teacherMode ? (
    <TeacherAppShell config={config} routeName={route.name} title={routeTitles[route.name]}>
      {content}
    </TeacherAppShell>
  ) : (
    <MobileAppShell config={config} routeName={route.name} title={routeTitles[route.name]}>
      {content}
    </MobileAppShell>
  );

  return (
    <SessionBootstrap routeName={route.name} config={config}>
      <main data-universal-app="vodda" data-platform={runtime.kind} style={{ minHeight: "100dvh" }}>
        {shell}
      </main>
    </SessionBootstrap>
  );
}

export function UniversalApp({ config: configOverrides, platform }: UniversalAppProps) {
  const config = useMemo(
    () => createUniversalAppConfig(configOverrides),
    [configOverrides?.basePath],
  );
  const runtime = useMemo(() => platform ?? createWebPlatformRuntime(), [platform]);

  return (
    <PlatformProvider runtime={runtime}>
      <UniversalVisualStyles />
      <UniversalAppContent config={config} runtime={runtime} />
    </PlatformProvider>
  );
}
