"use client";

import { useMemo } from "react";
import { createUniversalAppConfig, type UniversalAppConfig } from "./config";
import { PlatformProvider } from "./platform/context";
import type { PlatformRuntime } from "./platform/types";
import { createWebPlatformRuntime } from "./platform/web";
import { appUrl, navigateApp, useAppRoute } from "./router";

export type UniversalAppProps = {
  config?: Partial<UniversalAppConfig>;
  platform?: PlatformRuntime;
};

const routeTitles: Record<string, string> = {
  home: "وُدّا",
  login: "ورود",
  search: "جستجوی استاد",
  teacher: "پروفایل استاد",
  book: "رزرو جلسه",
  sessions: "جلسات من",
  wallet: "کیف پول",
  profile: "پروفایل",
  "profile-edit": "ویرایش پروفایل",
  "teacher-home": "پنل استاد",
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

export function UniversalApp({ config: configOverrides, platform }: UniversalAppProps) {
  const config = useMemo(
    () => createUniversalAppConfig(configOverrides),
    [configOverrides?.basePath],
  );
  const runtime = useMemo(() => platform ?? createWebPlatformRuntime(), [platform]);
  const route = useAppRoute(config);

  return (
    <PlatformProvider runtime={runtime}>
      <main dir="rtl" data-universal-app="vodda" data-platform={runtime.kind} style={{ minHeight: "100dvh" }}>
        <section style={{ maxWidth: 560, margin: "0 auto", padding: "32px 20px" }}>
          <p style={{ margin: 0, opacity: 0.65 }}>Universal App</p>
          <h1 style={{ margin: "8px 0 12px" }}>{routeTitles[route.name] ?? "وُدّا"}</h1>
          <p style={{ marginTop: 0, opacity: 0.75 }}>{route.pathname}</p>
          {route.name === "not-found" ? (
            <button type="button" onClick={() => navigateApp("/", config)}>
              بازگشت به اپ
            </button>
          ) : null}
          <nav aria-label="مسیرهای پایه اپ" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            {[['/', 'خانه'], ['/search', 'جستجو'], ['/sessions', 'جلسات'], ['/profile', 'پروفایل']].map(
              ([path, label]) => (
                <a
                  key={path}
                  href={appUrl(path, config)}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    navigateApp(path, config);
                  }}
                >
                  {label}
                </a>
              ),
            )}
          </nav>
        </section>
      </main>
    </PlatformProvider>
  );
}
