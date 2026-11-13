"use client";

import { useCallback, useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import {
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
    <div className="vodda-screen" style={{ display: "grid", gap: 18 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: colors.ink }}>پروفایل</h1>

      <Card elevated className="vodda-enter" style={{ padding: 16, borderRadius: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar name={user.name} src={user.avatar_url} size={62} ring />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 17, fontWeight: 800, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: colors.ink }}>
              {user.name.trim() || "کاربر وُدّا"}
            </strong>
            <span style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 12.5, color: colors.inkMuted }}>
              <Icon name="pin" size={13} />
              {user.city.trim() || "—"}
            </span>
          </div>
          <button type="button" aria-label="ویرایش پروفایل" onClick={() => navigateApp("/profile/edit", config)} className="vodda-tappable"
            style={{ width: 44, height: 44, display: "grid", placeItems: "center", flex: "0 0 44px", padding: 0, border: 0, borderRadius: 12, color: colors.olive700, background: colors.olive50, cursor: "pointer" }}>
            <Icon name="edit" size={19} />
          </button>
        </div>
      </Card>

      {canUseTeacherMode ? (
        <button type="button" onClick={() => navigateApp("/t", config)} className="vodda-tappable vodda-enter vodda-enter-delay-1"
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: 16, textAlign: "right", border: `1px solid ${colors.olive100}`, borderRadius: 24, color: colors.ink, background: colors.olive50, fontFamily: typography.fontFamily, cursor: "pointer" }}>
          <span style={{ width: 46, height: 46, display: "grid", placeItems: "center", flex: "0 0 46px", borderRadius: 14, color: colors.surface, background: colors.olive600 }}>
            <Icon name="award" size={22} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ ...typography.body, display: "block", fontWeight: 800 }}>ورود به حساب استاد</strong>
            <span style={{ ...typography.caption, display: "block", marginTop: 3, color: colors.inkSecondary }}>جلسات و درآمدتان را مدیریت کنید.</span>
          </span>
          <Icon name="refresh" size={20} style={{ color: colors.olive600 }} />
        </button>
      ) : null}

      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
        {[
          { icon: "user" as const, label: "ویرایش پروفایل", path: "/profile/edit" },
          { icon: "wallet" as const, label: "کیف پول و تراکنش‌ها", path: "/wallet" },
        ].map((row, index, rows) => (
          <button key={row.path} type="button" onClick={() => navigateApp(row.path, config)} className="vodda-tappable"
            style={{ width: "100%", minHeight: 58, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textAlign: "right", border: 0, borderBottom: index < rows.length - 1 ? `1px solid ${colors.sand100}` : 0, color: colors.ink, background: colors.surface, fontFamily: typography.fontFamily, cursor: "pointer" }}>
            <Icon name={row.icon} size={21} style={{ color: colors.olive600 }} />
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{row.label}</span>
            <Icon name="chevronL" size={18} style={{ color: colors.inkFaint }} />
          </button>
        ))}
      </Card>

      {/* پشتیبانی و اطلاعات (B3) — صفحات راهنما در وب وُدّا */}
      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
        {[
          { icon: "phone" as const, label: "پشتیبانی و تماس با ما", href: "/contact" },
          { icon: "quran" as const, label: "دربارهٔ وُدّا", href: "/about" },
          { icon: "doc" as const, label: "پرسش‌های پرتکرار", href: "/faq" },
          { icon: "shield" as const, label: "قوانین و حریم خصوصی", href: "/privacy" },
        ].map((row, index, rows) => (
          <a key={row.href} href={row.href} target="_blank" rel="noreferrer" className="vodda-tappable"
            style={{ width: "100%", minHeight: 58, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textAlign: "right", textDecoration: "none", borderBottom: index < rows.length - 1 ? `1px solid ${colors.sand100}` : 0, color: colors.ink, background: colors.surface }}>
            <Icon name={row.icon} size={21} style={{ color: colors.olive600 }} />
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{row.label}</span>
            <Icon name="chevronL" size={18} style={{ color: colors.inkFaint }} />
          </a>
        ))}
      </Card>

      {error ? (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, ...typography.bodySmall }}>
          <Icon name="info" size={18} />
          {error}
        </div>
      ) : null}

      <Button variant="danger" fullWidth loading={loggingOut} onClick={() => void logout()} style={{ minHeight: 48, borderRadius: 14 }}>
        <Icon name="logout" size={19} />
        خروج از حساب
      </Button>

      <p style={{ fontSize: 12, margin: "4px 0 0", textAlign: "center", color: colors.inkFaint }}>
        وُدّا · نسخهٔ ۱٫۰٫۰
      </p>
    </div>
  );
}
