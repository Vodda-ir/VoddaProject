"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { UniversalAppConfig } from "../../config";
import { PlatformHttpError } from "../../platform/http";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp, type AppRouteName } from "../../router";
import { Button, Card, Input, colors, radii, spacing, typography } from "../../ui";

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

function errorMessage(error: unknown) {
  if (error instanceof PlatformHttpError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "ارتباط با سرور برقرار نشد. دوباره تلاش کنید.";
}

export function defaultRouteForUser(user: AuthUser) {
  return user.role === "teacher" ? "/t" : "/";
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

export function SessionBootstrap({ routeName, config, children }: SessionBootstrapProps) {
  const platform = usePlatform();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      try {
        const [user] = await Promise.all([
          platform.restoreSession(),
          new Promise<void>((resolve) => window.setTimeout(resolve, 450)),
        ]);
        if (cancelled) return;

        if (!user && routeName !== "login") {
          navigateApp("/login", config, { replace: true });
          return;
        }
        if (user && routeName === "login") {
          navigateApp(defaultRouteForUser(user), config, { replace: true });
          return;
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, [config, platform, routeName]);

  if (!ready) return <LaunchScreen />;
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
      setError(errorMessage(requestError));
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
      setError(errorMessage(verifyError));
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
