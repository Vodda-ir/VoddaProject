"use client";

import { useCallback, useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import {
  ActionTile,
  Avatar,
  Button,
  Card,
  ErrorState,
  Icon,
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

  const loadProfile = useCallback(
    async (isCancelled: () => boolean = () => false) => {
      setLoading(true);
      setError(null);
      try {
        const restored = await platform.restoreSession();
        if (isCancelled()) return;
        if (!restored) {
          navigateApp("/login", config, { replace: true });
          return;
        }
        setUser(restored);
      } catch (loadError) {
        if (!isCancelled()) setError(messageOf(loadError, profileErrorMessage));
      } finally {
        if (!isCancelled()) setLoading(false);
      }
    },
    [config, platform],
  );

  useEffect(() => {
    let cancelled = false;
    void loadProfile(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadProfile]);

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

  const canUseTeacherMode = user.role === "teacher" || user.role === "admin";

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.xl }}>
      <Card elevated className="vodda-enter" style={{ padding: spacing.xl }}>
        <div style={{ display: "flex", alignItems: "center", gap: spacing.lg }}>
          <Avatar name={user.name} src={user.avatar_url} size={68} ring />
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
            <p style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 4, margin: "4px 0 0", color: colors.inkMuted }}>
              <Icon name="pin" size={13} />
              {user.city.trim() || "شهر ثبت نشده"}
            </p>
            <p dir="ltr" style={{ ...typography.caption, margin: "2px 0 0", color: colors.inkFaint, textAlign: "right" }}>
              {user.mobile}
            </p>
          </div>
          <button
            type="button"
            aria-label="ویرایش پروفایل"
            onClick={() => navigateApp("/profile/edit", config)}
            className="vodda-tappable"
            style={{
              width: 42,
              height: 42,
              display: "grid",
              placeItems: "center",
              flex: "0 0 42px",
              padding: 0,
              border: 0,
              borderRadius: 14,
              color: colors.olive700,
              background: colors.olive50,
              cursor: "pointer",
            }}
          >
            <Icon name="edit" size={19} />
          </button>
        </div>

        {user.bio.trim() ? (
          <div
            style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              borderRadius: radii.md,
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

      {canUseTeacherMode ? (
        <ActionTile
          icon="award"
          title="ورود به فضای استاد"
          description="جلسات، خدمات و درآمدتان را مدیریت کنید."
          onClick={() => navigateApp("/t", config)}
          tone="olive"
        />
      ) : null}

      <div style={{ display: "grid", gap: spacing.sm }}>
        <ActionTile
          icon="wallet"
          title="کیف پول و تراکنش‌ها"
          description="موجودی و گردش مالی حساب"
          onClick={() => navigateApp("/wallet", config)}
          trailing={
            <strong dir="ltr" style={{ ...typography.bodySmall, color: colors.olive800, whiteSpace: "nowrap" }}>
              {formatWalletAmount(user.wallet)} تومان
            </strong>
          }
        />
        <ActionTile
          icon="edit"
          title="ویرایش اطلاعات حساب"
          description="نام، شهر، درباره من و تصویر پروفایل"
          onClick={() => navigateApp("/profile/edit", config)}
          tone="info"
        />
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            display: "flex",
            alignItems: "center",
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radii.md,
            background: colors.dangerBackground,
            color: colors.danger,
            ...typography.bodySmall,
          }}
        >
          <Icon name="shield" size={18} />
          {error}
        </div>
      ) : null}

      <Button variant="danger" fullWidth loading={loggingOut} onClick={() => void logout()}>
        <Icon name="logout" size={18} />
        خروج از حساب
      </Button>

      <p style={{ ...typography.caption, margin: 0, textAlign: "center", color: colors.inkFaint }}>
        وُدّا · حساب کاربری
      </p>
    </div>
  );
}
