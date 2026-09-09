"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp, type AppRouteName } from "../../router";
import { Button, Card, Input, colors, radii, spacing, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";

function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizedMobile(value: string) {
  return normalizeDigits(value).replace(/\D/g, "").slice(0, 11);
}

function normalizedOtp(value: string) {
  return normalizeDigits(value).replace(/\D/g, "").slice(0, 6);
}

const teacherOnlyRoutes = new Set<AppRouteName>([
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

export function defaultRouteForUser(user: AuthUser) {
  return user.role === "teacher" ? "/t" : "/";
}

export function canAccessAppRoute(user: AuthUser, routeName: AppRouteName) {
  if (teacherOnlyRoutes.has(routeName)) {
    return user.role === "teacher" || user.role === "admin";
  }

  // Learner routes are intentionally available to every authenticated account.
  // Teacher/admin accounts need this namespace for the learner-mode role switch.
  return true;
}

export function LaunchScreen() {
  return (
    <main
      dir="rtl"
      data-universal-app="vodda"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: spacing.xl,
        background: colors.sand50,
        color: colors.ink,
        fontFamily: typography.fontFamily,
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: spacing.md, textAlign: "center" }}>
        <div
          aria-hidden="true"
          style={{
            width: 92,
            height: 92,
            display: "grid",
            placeItems: "center",
            borderRadius: radii.lg,
            background: colors.olive700,
            color: colors.surface,
            fontSize: 34,
            fontWeight: 900,
          }}
        >
          و
        </div>
        <strong style={{ ...typography.heading, color: colors.olive900 }}>وُدّا</strong>
        <span style={{ ...typography.bodySmall, color: colors.inkMuted }}>
          نرم‌افزار تخصصی آموزش قرآن کریم
        </span>
      </div>
    </main>
  );
}

type SessionBootstrapProps = {
  routeName: AppRouteName;
  config: UniversalAppConfig;
  children: ReactNode;
};

type BootstrapStatus = "loading" | "ready" | "error";

function SessionRestoreError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <main
      dir="rtl"
      data-universal-app="vodda"
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: spacing.xl,
        background: colors.sand50,
        color: colors.ink,
        fontFamily: typography.fontFamily,
      }}
    >
      <Card elevated style={{ width: "min(100%, 460px)", textAlign: "center" }}>
        <div style={{ display: "grid", gap: spacing.md, justifyItems: "center" }}>
          <strong style={{ ...typography.title, color: colors.danger }}>اتصال به حساب برقرار نشد</strong>
          <p style={{ ...typography.bodySmall, margin: 0, color: colors.inkMuted }}>
            {message}
          </p>
          <Button type="button" onClick={onRetry}>
            تلاش دوباره
          </Button>
        </div>
      </Card>
    </main>
  );
}

export function SessionBootstrap({ routeName, config, children }: SessionBootstrapProps) {
  const platform = usePlatform();
  const [status, setStatus] = useState<BootstrapStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      setStatus("loading");
      setError(null);

      try {
        const [user] = await Promise.all([
          platform.restoreSession(),
          new Promise<void>((resolve) => window.setTimeout(resolve, 450)),
        ]);
        if (cancelled) return;

        if (!user) {
          if (routeName !== "login") {
            navigateApp("/login", config, { replace: true });
            return;
          }
          setStatus("ready");
          return;
        }

        if (user.needProfile && routeName !== "profile-edit") {
          navigateApp("/profile/edit", config, { replace: true });
          return;
        }

        if (routeName === "login") {
          navigateApp(defaultRouteForUser(user), config, { replace: true });
          return;
        }

        if (!canAccessAppRoute(user, routeName)) {
          navigateApp(defaultRouteForUser(user), config, { replace: true });
          return;
        }

        setStatus("ready");
      } catch (restoreError) {
        if (cancelled) return;
        setError(messageOf(restoreError, "وضعیت ورود از سرور دریافت نشد. اتصال اینترنت را بررسی کنید و دوباره تلاش کنید."));
        setStatus("error");
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [config, platform, retryKey, routeName]);

  if (status === "loading") return <LaunchScreen />;
  if (status === "error") {
    return (
      <SessionRestoreError
        message={error ?? "وضعیت ورود از سرور دریافت نشد."}
        onRetry={() => setRetryKey((value) => value + 1)}
      />
    );
  }
  return <>{children}</>;
}

type LoginScreenProps = {
  config: UniversalAppConfig;
};

export function LoginScreen({ config }: LoginScreenProps) {
  const platform = usePlatform();
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState<"otp" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mobileValid = useMemo(() => /^09\d{9}$/.test(mobile), [mobile]);
  const codeValid = code.length >= 5;

  async function requestOtp(event?: FormEvent) {
    event?.preventDefault();
    if (!mobileValid) {
      setError("شماره موبایل را به‌صورت ۱۱ رقمی و با ۰۹ وارد کنید.");
      return;
    }

    setLoading("otp");
    setError(null);
    try {
      await platform.requestOtp(mobile);
      setCodeSent(true);
      setCode("");
    } catch (requestError) {
      setError(messageOf(requestError, "ارتباط با سرور برقرار نشد. دوباره تلاش کنید."));
    } finally {
      setLoading(null);
    }
  }

  async function verifyOtp(event?: FormEvent) {
    event?.preventDefault();
    if (!codeValid) {
      setError("کد تأیید را کامل وارد کنید.");
      return;
    }

    setLoading("verify");
    setError(null);
    try {
      const result = await platform.verifyOtp(mobile, code);
      navigateApp(result.needProfile ? "/profile/edit" : defaultRouteForUser(result.user), config, {
        replace: true,
      });
    } catch (verifyError) {
      setError(messageOf(verifyError, "ارتباط با سرور برقرار نشد. دوباره تلاش کنید."));
    } finally {
      setLoading(null);
    }
  }

  function resetMobile() {
    setCodeSent(false);
    setCode("");
    setError(null);
  }

  return (
    <main
      dir="rtl"
      data-universal-app="vodda"
      data-platform={platform.kind}
      style={{ minHeight: "100dvh", background: colors.sand50, color: colors.ink }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 520,
          margin: "0 auto",
          paddingInline: spacing.xl,
          paddingTop: "max(40px, env(safe-area-inset-top))",
          paddingBottom: "max(24px, env(safe-area-inset-bottom))",
          fontFamily: typography.fontFamily,
        }}
      >
        <div style={{ marginBottom: spacing.xxl, textAlign: "center" }}>
          <div
            aria-hidden="true"
            style={{
              width: 72,
              height: 72,
              display: "grid",
              placeItems: "center",
              margin: "0 auto 12px",
              borderRadius: radii.lg,
              background: colors.olive700,
              color: colors.surface,
              fontSize: 28,
              fontWeight: 900,
            }}
          >
            و
          </div>
          <h1 style={{ ...typography.heading, margin: 0, color: colors.olive900 }}>ورود به وُدّا</h1>
          <p style={{ ...typography.bodySmall, margin: "8px 0 0", color: colors.inkMuted }}>
            نرم‌افزار تخصصی آموزش قرآن کریم
          </p>
        </div>

        <Card elevated>
          <form onSubmit={codeSent ? verifyOtp : requestOtp} style={{ display: "grid", gap: spacing.lg }}>
            <Input
              label="شماره موبایل"
              name="mobile"
              inputMode="numeric"
              autoComplete="tel"
              dir="ltr"
              value={mobile}
              disabled={codeSent || loading !== null}
              placeholder="09123456789"
              onChange={(event) => setMobile(normalizedMobile(event.target.value))}
              error={!mobileValid && mobile.length === 11 ? "شماره موبایل معتبر نیست." : undefined}
            />

            {codeSent ? (
              <>
                <Input
                  label="کد تأیید"
                  name="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  dir="ltr"
                  autoFocus
                  value={code}
                  disabled={loading !== null}
                  placeholder="-----"
                  onChange={(event) => setCode(normalizedOtp(event.target.value))}
                  hint={`کد ارسال‌شده به ${mobile} را وارد کنید.`}
                />
                <Button type="submit" fullWidth loading={loading === "verify"} disabled={!codeValid}>
                  ورود
                </Button>
                <Button type="button" fullWidth variant="ghost" disabled={loading !== null} onClick={resetMobile}>
                  ویرایش شماره موبایل
                </Button>
              </>
            ) : (
              <Button type="submit" fullWidth loading={loading === "otp"} disabled={!mobileValid}>
                دریافت کد تأیید
              </Button>
            )}

            {error ? (
              <div
                role="alert"
                style={{
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.sm,
                  background: "rgba(166, 81, 81, 0.08)",
                  color: colors.danger,
                  ...typography.bodySmall,
                }}
              >
                {error}
              </div>
            ) : null}
          </form>
        </Card>
      </section>
    </main>
  );
}
