"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp, type AppRouteName } from "../../router";
import { Button, Card, Icon, colors, digitsOnly, shadows, spacing, toFaDigits, typography } from "../../ui";
import { messageOf } from "../../ui/errorMessage";

function normalizedMobile(value: string) {
  return digitsOnly(value, 11);
}

function normalizedOtp(value: string) {
  return digitsOnly(value, 5);
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
      <div style={{ display: "grid", justifyItems: "center", gap: 12, textAlign: "center" }}>
        <img
          src="/vodda-logo.svg"
          alt="وُدّا"
          width={150}
          height={173}
          style={{ width: 150, height: "auto", display: "block" }}
        />
        <strong
          className="vodda-display"
          style={{ fontSize: 17, color: colors.ink, lineHeight: 1.9 }}
        >
          پلتفرم آموزش و خدمات آنلاین قرآن کریم
        </strong>
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
  const otpRef = useRef<HTMLInputElement>(null);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState<"otp" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const mobileValid = useMemo(() => /^09\d{9}$/.test(mobile), [mobile]);
  const codeValid = code.length === 5;

  useEffect(() => {
    if (!codeSent) return;
    const timer = window.setTimeout(() => otpRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [codeSent]);

  // شمارش معکوس ۹۰ ثانیه‌ای ارسال مجدد کد (B2)
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setResendCooldown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  async function requestOtp(event?: FormEvent) {
    event?.preventDefault();
    if (!mobileValid) {
      setError("شماره موبایل ۱۱ رقمی وارد کنید.");
      return;
    }

    setLoading("otp");
    setError(null);
    try {
      await platform.requestOtp(mobile);
      setCodeSent(true);
      setCode("");
      setResendCooldown(90);
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
    setResendCooldown(0);
  }

  return (
    <main
      dir="rtl"
      data-universal-app="vodda"
      data-platform={platform.kind}
      style={{
        minHeight: "100dvh",
        display: "grid",
        justifyItems: "center",
        alignItems: "start",
        background: colors.sand50,
        color: colors.ink,
        fontFamily: typography.fontFamily,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 440,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          padding: "max(28px, env(safe-area-inset-top)) 28px max(20px, env(safe-area-inset-bottom))",
        }}
      >
        <div className="vodda-enter" style={{ display: "grid", justifyItems: "center", marginTop: "8dvh" }}>
          <img
            src="/vodda-logo.svg"
            alt="وُدّا"
            width={96}
            height={111}
            style={{ width: 96, height: "auto", display: "block" }}
          />
          <p
            className="vodda-display"
            style={{ margin: "10px 0 0", color: colors.ink, fontSize: 16.5, textAlign: "center", lineHeight: 1.9 }}
          >
            پلتفرم آموزش و خدمات آنلاین قرآن کریم
          </p>
        </div>

        <form
          onSubmit={codeSent ? verifyOtp : requestOtp}
          className="vodda-enter vodda-enter-delay-1"
          style={{ display: "grid", gap: 16, marginTop: 28 }}
        >
          <label style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: codeSent ? colors.inkFaint : colors.inkSecondary }}>
              شماره موبایل
            </span>
            <div style={{ position: "relative" }}>
              <Icon
                name="phone"
                size={20}
                style={{
                  position: "absolute",
                  insetInlineStart: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: codeSent ? colors.inkFaint : colors.olive600,
                }}
              />
              <input
                name="mobile"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                value={toFaDigits(mobile)}
                disabled={codeSent || loading !== null}
                placeholder="۰۹××× ××× ×××"
                onChange={(event) => {
                  setMobile(normalizedMobile(event.target.value));
                  setError(null);
                }}
                style={{
                  width: "100%",
                  minHeight: 58,
                  padding: "12px 46px 12px 16px",
                  textAlign: "center",
                  border: "1px solid " + colors.sand200,
                  borderRadius: 18,
                  outline: "none",
                  color: codeSent ? colors.inkMuted : colors.ink,
                  background: codeSent ? colors.sand100 : colors.surface,
                  boxShadow: codeSent ? "none" : shadows.xs,
                  fontFamily: typography.fontFamily,
                  fontSize: 18,
                  fontWeight: 700,
                  letterSpacing: 2,
                }}
              />
            </div>
          </label>

          {!codeSent ? (
            <Button type="submit" fullWidth loading={loading === "otp"} disabled={!mobileValid} style={{ minHeight: 52 }}>
              دریافت کد تأیید
            </Button>
          ) : (
            <div style={{ display: "grid", gap: 20 }}>
              <p style={{ ...typography.bodySmall, margin: "0 0 -2px", color: colors.inkMuted, textAlign: "center" }}>
                کد پیامک‌شده به <span dir="ltr">{toFaDigits(mobile)}</span> را وارد کنید
              </p>

              <div
                dir="ltr"
                role="group"
                aria-label="کد تأیید پنج رقمی"
                onClick={() => otpRef.current?.focus()}
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 52px))",
                  justifyContent: "center",
                  gap: 8,
                  cursor: "text",
                }}
              >
                {Array.from({ length: 5 }, (_, index) => {
                  const digit = code[index] ?? "";
                  const focused = index === Math.min(code.length, 4) && loading === null;
                  return (
                    <span
                      key={index}
                      aria-hidden="true"
                      style={{
                        height: 56,
                        display: "grid",
                        placeItems: "center",
                        border: focused ? "1.8px solid " + colors.olive500 : "1px solid " + (digit ? colors.olive300 : colors.sand200),
                        borderRadius: 14,
                        color: colors.ink,
                        background: digit ? colors.olive50 : colors.surface,
                        boxShadow: shadows.xs,
                        fontSize: 22,
                        fontWeight: 800,
                      }}
                    >
                      {toFaDigits(digit)}
                    </span>
                  );
                })}
                <input
                  ref={otpRef}
                  value={toFaDigits(code)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  disabled={loading !== null}
                  maxLength={5}
                  onChange={(event) => {
                    setCode(normalizedOtp(event.target.value));
                    setError(null);
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    border: 0,
                    cursor: "text",
                  }}
                  aria-label="کد تأیید"
                />
              </div>

              <Button type="submit" fullWidth loading={loading === "verify"} disabled={!codeValid} style={{ minHeight: 52 }}>
                ورود
              </Button>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12 }}>
                <button
                  type="button"
                  disabled={loading !== null || resendCooldown > 0}
                  onClick={() => void requestOtp()}
                  style={{
                    padding: "12px 2px",
                    border: 0,
                    color: resendCooldown > 0 ? colors.inkFaint : colors.olive600,
                    background: "transparent",
                    fontFamily: typography.fontFamily,
                    fontWeight: 600,
                    cursor: loading !== null || resendCooldown > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {resendCooldown > 0
                    ? `ارسال مجدد کد تا ${toFaDigits(
                        `${String(Math.floor(resendCooldown / 60)).padStart(2, "0")}:${String(resendCooldown % 60).padStart(2, "0")}`,
                      )}`
                    : "ارسال مجدد کد"}
                </button>
                <span aria-hidden="true" style={{ width: 3, height: 3, borderRadius: "50%", background: colors.sand200 }} />
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={resetMobile}
                  style={{
                    padding: "12px 2px",
                    border: 0,
                    color: colors.inkMuted,
                    background: "transparent",
                    fontFamily: typography.fontFamily,
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                  }}
                >
                  تغییر شماره
                </button>
              </div>
            </div>
          )}

          {error ? (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 16px",
                borderRadius: 14,
                background: colors.clayBackground,
                color: colors.danger,
                ...typography.bodySmall,
              }}
            >
              <Icon name="shield" size={18} />
              <span>{error}</span>
            </div>
          ) : null}
        </form>

        {/* نوار اعتماد پایین صفحهٔ ورود (C7) */}
        <div
          className="vodda-enter vodda-enter-delay-2"
          style={{
            marginTop: "auto",
            paddingTop: 26,
            paddingBottom: 10,
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            borderTop: `1px solid ${colors.sand150}`,
          }}
        >
          {[
            { icon: "shield" as const, label: "پرداخت امن" },
            { icon: "award" as const, label: "اساتید تأییدشده" },
            { icon: "headphones" as const, label: "پشتیبانی پاسخ‌گو" },
          ].map((item) => (
            <div key={item.label} style={{ display: "grid", justifyItems: "center", gap: 5, textAlign: "center" }}>
              <span
                aria-hidden="true"
                style={{
                  width: 34,
                  height: 34,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 12,
                  background: colors.olive50,
                  color: colors.olive600,
                }}
              >
                <Icon name={item.icon} size={17} />
              </span>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.inkMuted }}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
