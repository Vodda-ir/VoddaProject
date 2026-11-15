"use client";

import { useEffect, useMemo, useState } from "react";
import { createUniversalAppConfig, type UniversalAppConfig } from "./config";
import { LoginScreen, SessionBootstrap } from "./features/auth/AuthExperience";
import { ProfileCompletionScreen } from "./features/auth/ProfileCompletionScreen";
import { LearnerBookingScreen } from "./features/booking/LearnerBookingScreen";
import { CallHubScreen } from "./features/ceremony/CallHubScreen";
import { CeremonyBookingScreen } from "./features/ceremony/CeremonyBookingScreen";
import { CeremonyCallScreen } from "./features/ceremony/CeremonyCallScreen";
import { CeremonyCallsScreen } from "./features/ceremony/CeremonyCallsScreen";
import { CeremonyNewScreen } from "./features/ceremony/CeremonyNewScreen";
import { PresenceProviderScreen } from "./features/ceremony/PresenceProviderScreen";
import { PresenceScreen } from "./features/ceremony/PresenceScreen";
import { TeacherPresenceScreen } from "./features/ceremony/TeacherPresenceScreen";
import { LearnerDispatchScreen } from "./features/dispatch/LearnerDispatchScreen";
import { LearnerHomeScreen } from "./features/home/LearnerHomeScreen";
import { LearnerProfileScreen } from "./features/profile/LearnerProfileScreen";
import { LearnerSearchScreen } from "./features/search/LearnerSearchScreen";
import { LearnerSessionsScreen } from "./features/sessions/LearnerSessionsScreen";
import { SessionDetailScreen } from "./features/session-detail/SessionDetailScreen";
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
import { AppearanceProvider, useAppearance } from "./ui/appearance";
import { MobileAppShell, TeacherAppShell, Card, UniversalVisualStyles, colors, typography } from "./ui";

export type UniversalAppProps = {
  config?: Partial<UniversalAppConfig>;
  platform?: PlatformRuntime;
};

const routeTitleKeys: Record<AppRouteName, string> = {
  home: "app_title",
  login: "login_submit",
  search: "search_title",
  teacher: "nav_profile",
  book: "booking_title",
  sessions: "sessions_mine",
  session: "sessions_mine",
  wallet: "wallet_title",
  profile: "profile_title",
  "profile-edit": "profile_edit",
  dispatch: "dispatch_title",
  "call-hub": "dispatch_title",
  "ceremony-new": "dispatch_title",
  "ceremony-calls": "dispatch_title",
  "ceremony-call": "dispatch_title",
  "ceremony-booking": "dispatch_title",
  presence: "dispatch_title",
  "presence-provider": "dispatch_title",
  "teacher-home": "nav_teacher_home",
  "teacher-requests": "session_accept",
  "teacher-sessions": "nav_sessions",
  "teacher-services": "booking_choose_service",
  "teacher-work-times": "booking_choose_time",
  "teacher-wallet": "wallet_title",
  "teacher-withdraw": "wallet_title",
  "teacher-profile": "nav_profile",
  "teacher-reviews": "action_more",
  "teacher-dispatch": "dispatch_title",
  "teacher-ceremony": "dispatch_title",
  "teacher-presence": "dispatch_title",
  "not-found": "not_found_title",
};

function useRouteTitle(routeName: AppRouteName): string {
  const { t } = useAppearance();
  const key = routeTitleKeys[routeName] as Parameters<typeof t>[0];
  return t(key);
}

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
  "teacher-dispatch",
  "teacher-ceremony",
  "teacher-presence",
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

function UniversalAppShellContent({
  config,
  runtime,
  route,
  sessionRole,
  onSessionRoleResolved,
}: {
  config: UniversalAppConfig;
  runtime: PlatformRuntime;
  route: ReturnType<typeof useAppRoute>;
  sessionRole: "learner" | "teacher";
  onSessionRoleResolved: (role: "learner" | "teacher") => void;
}) {
  const title = useRouteTitle(route.name);
  const teacherMode = teacherRoutes.has(route.name) || (route.name === "session" && sessionRole === "teacher");
  const routeContent = route.name === "home" ? (
    <LearnerHomeScreen config={config} />
  ) : route.name === "search" ? (
    <LearnerSearchScreen config={config} />
  ) : route.name === "teacher" ? (
    <LearnerTeacherProfileScreen teacherId={route.params.id ?? ""} config={config} />
  ) : route.name === "book" ? (
    <LearnerBookingScreen teacherId={route.params.id ?? ""} config={config} />
  ) : route.name === "sessions" ? (
    <LearnerSessionsScreen config={config} />
  ) : route.name === "session" ? (
    <SessionDetailScreen sessionId={route.params.id ?? ""} config={config} onRoleResolved={onSessionRoleResolved} />
  ) : route.name === "wallet" ? (
    <LearnerWalletScreen />
  ) : route.name === "profile" ? (
    <LearnerProfileScreen config={config} />
  ) : route.name === "dispatch" ? (
    <LearnerDispatchScreen config={config} />
  ) : route.name === "call-hub" ? (
    <CallHubScreen config={config} />
  ) : route.name === "ceremony-new" ? (
    <CeremonyNewScreen config={config} />
  ) : route.name === "ceremony-calls" ? (
    <CeremonyCallsScreen config={config} />
  ) : route.name === "ceremony-call" ? (
    <CeremonyCallScreen callId={route.params.id ?? ""} config={config} />
  ) : route.name === "ceremony-booking" ? (
    <CeremonyBookingScreen bookingId={route.params.id ?? ""} config={config} />
  ) : route.name === "presence" ? (
    <PresenceScreen config={config} />
  ) : route.name === "presence-provider" ? (
    <PresenceProviderScreen providerId={route.params.id ?? ""} config={config} />
  ) : route.name === "teacher-home" ? (
    <TeacherDashboardScreen config={config} />
  ) : route.name === "teacher-requests" ? (
    <TeacherSessionsScreen mode="requests" config={config} />
  ) : route.name === "teacher-sessions" ? (
    <TeacherSessionsScreen mode="sessions" config={config} />
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
  ) : route.name === "teacher-dispatch" ? (
    <TeacherDispatchScreen config={config} />
  ) : route.name === "teacher-ceremony" ? (
    <TeacherDispatchScreen config={config} initialTab="ceremony" />
  ) : route.name === "teacher-presence" ? (
    <TeacherPresenceScreen config={config} />
  ) : (
    <RoutePlaceholder routeName={route.name} pathname={route.pathname} config={config} />
  );
  const content = routeContent;
  const shell = teacherMode ? (
    <TeacherAppShell config={config} routeName={route.name} title={title}>
      {content}
    </TeacherAppShell>
  ) : (
    <MobileAppShell config={config} routeName={route.name} title={title}>
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

function UniversalAppContent({ config, runtime }: { config: UniversalAppConfig; runtime: PlatformRuntime }) {
  const route = useAppRoute(config);
  // نقش نمایشگر جلسه — برای انتخاب پوستهٔ درست (استاد/قرآن‌آموز) در مسیر /session/:id
  const [sessionRole, setSessionRole] = useState<"learner" | "teacher">("learner");
  useEffect(() => {
    if (route.name !== "session") setSessionRole("learner");
  }, [route.name]);

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

  return (
    <UniversalAppShellContent
      config={config}
      runtime={runtime}
      route={route}
      sessionRole={sessionRole}
      onSessionRoleResolved={setSessionRole}
    />
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
      <AppearanceProvider>
        <UniversalVisualStyles />
        <UniversalAppContent config={config} runtime={runtime} />
      </AppearanceProvider>
    </PlatformProvider>
  );
}
