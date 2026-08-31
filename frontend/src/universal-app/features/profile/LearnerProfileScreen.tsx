"use client";

import { useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  Avatar,
  Button,
  Card,
  ErrorState,
  LoadingState,
  colors,
  radii,
  spacing,
  typography,
} from "../../ui";
import { messageOf } from "../../ui/errorMessage";
import { formatWalletAmount } from "../wallet/WalletTransactionCard";

export type LearnerProfileScreenProps = {
  config: UniversalAppConfig;
};

const profileErrorMessage = "دریافت اطلاعات حساب انجام نشد. دوباره تلاش کنید.";

export function LearnerProfileScreen({ config }: LearnerProfileScreenProps) {
  const platform = usePlatform();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const restored = await platform.restoreSession();
      if (!restored) {
        navigateApp("/login", config, { replace: true });
        return;
      }
      setUser(restored);
    } catch (loadError) {
      setError(messageOf(loadError, profileErrorMessage));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const restored = await platform.restoreSession();
        if (cancelled) return;
        if (!restored) {
          navigateApp("/login", config, { replace: true });
          return;
        }
        setUser(restored);
      } catch (loadError) {
        if (!cancelled) setError(messageOf(loadError, profileErrorMessage));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [config, platform]);

  async function logout() {
    setLoggingOut(true);
    setError(null);
    try {
      await platform.logout();
      navigateApp("/login", config, { replace: true });
    } catch (logoutError) {
      setError(messageOf(logoutError, profileErrorMessage));
      setLoggingOut(false);
    }
  }

  if (loading) return <LoadingState label="در حال دریافت اطلاعات پروفایل…" />;
  if (error && !user) {
    return (
      <ErrorState
        title="دریافت پروفایل ناموفق بود"
        description={error}
        action={<Button onClick={() => void loadProfile()}>تلاش دوباره</Button>}
      />
    );
  }
  if (!user) return null;

  return (
    <div style={{ display: "grid", gap: spacing.lg }}>
      <Card elevated style={{ display: "grid", gap: spacing.lg }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.lg }}>
          <Avatar
            name={user.name}
            src={user.avatar_url}
            size={72}
            style={{ border: `3px solid ${colors.olive100}` }}
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1
              style={{
                ...typography.title,
                margin: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: colors.ink,
              }}
            >
              {user.name.trim() || "کاربر وُدّا"}
            </h1>
            <p dir="ltr" style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: colors.inkMuted, textAlign: "right" }}>
              {user.mobile}
            </p>
            <p style={{ ...typography.bodySmall, margin: `${spacing.xs}px 0 0`, color: colors.inkSecondary }}>
              {user.city.trim() || "شهر ثبت نشده"}
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={() => navigateApp("/profile/edit", config)}
            style={{ flex: "0 0 auto", paddingInline: spacing.md }}
          >
            ویرایش
          </Button>
        </div>

        {user.bio.trim() ? (
          <div
            style={{
              padding: spacing.md,
              borderRadius: radii.sm,
              background: colors.sand50,
              color: colors.inkSecondary,
              ...typography.bodySmall,
              lineHeight: 1.9,
            }}
          >
            {user.bio}
          </div>
        ) : null}
      </Card>

      <Card style={{ display: "grid", gap: spacing.md }}>
        <button
          type="button"
          onClick={() => navigateApp("/wallet", config)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing.md,
            padding: spacing.md,
            textAlign: "right",
            color: colors.ink,
            background: colors.olive50,
            border: `1px solid ${colors.olive100}`,
            borderRadius: radii.sm,
            cursor: "pointer",
            fontFamily: typography.fontFamily,
          }}
        >
          <span>
            <strong style={{ ...typography.body, display: "block" }}>کیف پول و تراکنش‌ها</strong>
            <span style={{ ...typography.caption, color: colors.inkMuted }}>مشاهده موجودی و گردش حساب</span>
          </span>
          <strong dir="ltr" style={{ ...typography.bodySmall, color: colors.olive800 }}>
            {formatWalletAmount(user.wallet)} تومان
          </strong>
        </button>
      </Card>

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

      <Button variant="danger" fullWidth loading={loggingOut} onClick={() => void logout()}>
        خروج از حساب
      </Button>

      <p style={{ ...typography.caption, margin: 0, textAlign: "center", color: colors.inkMuted }}>
        وُدّا · حساب کاربری
      </p>
    </div>
  );
}
