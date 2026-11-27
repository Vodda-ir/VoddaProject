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
import { useAppearance } from "../../ui/appearance";
import { localizeCityName } from "../../i18n/transliterate";
import { messageOf } from "../../ui/errorMessage";
import { formatAppDateTime } from "../../ui/jalali";
import { localizedDigits } from "../../ui/persian";
import { RoleModeSheet } from "../auth/RoleModeSheet";
import { fetchMyPoints, pointReasonLabel, type PointSnapshotData } from "../challenge/api";
import { avatarSrc, onAvatarUpdated, uploadsOriginOf } from "@/lib/avatarImage";

export type LearnerProfileScreenProps = {
  config: UniversalAppConfig;
};

const profileErrorMessage = "دریافت اطلاعات حساب انجام نشد. دوباره تلاش کنید.";

export function LearnerProfileScreen({ config }: LearnerProfileScreenProps) {
  const platform = usePlatform();
  const { t, L, lang, setLang, theme, toggleTheme, N } = useAppearance();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [points, setPoints] = useState<PointSnapshotData | null>(null);

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
    // باگ avatar-upload — پس از آپلود تصویر، پروفایل بلافاصله همگام می‌شود.
    const offAvatarUpdated = onAvatarUpdated((detail) => {
      setUser((current) => (current ? { ...current, avatar_url: detail.url ?? current.avatar_url } : current));
    });
    return () => {
      cancelled = true;
      offAvatarUpdated();
    };
  }, [loadProfile]);

  /* امتیاز اینستاقرآن — پس از ورود موفق بارگذاری می‌شود؛ خطا بی‌صدا کارت را پنهان می‌کند. */
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchMyPoints(platform)
      .then((snapshot) => {
        if (!cancelled) setPoints(snapshot);
      })
      .catch(() => {
        if (!cancelled) setPoints(null);
      });
    return () => {
      cancelled = true;
    };
  }, [platform, user]);

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

  if (loading) return <LoadingState label={L("در حال دریافت اطلاعات پروفایل…")} />;
  if (error && !user) {
    return (
      <ErrorState
        title={L("دریافت پروفایل ناموفق بود")}
        description={L(error)}
        action={<Button onClick={() => void loadProfile()}>{L("تلاش دوباره")}</Button>}
      />
    );
  }
  if (!user) return null;

  const canUseTeacherMode = user.role === "teacher" || user.role === "admin";

  return (
    <div className="vodda-screen" style={{ display: "grid", gap: 18 }}>
      <h1 className="vodda-display" style={{ fontSize: 26, margin: "2px 0 0", color: colors.ink, lineHeight: 1.7 }}>{t("profile_title")}</h1>

      <Card
        elevated
        className="vodda-enter"
        style={{ padding: 16, borderRadius: 24, cursor: "pointer" }}
        onClick={() => setRoleSheetOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={L("تغییر حساب")}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setRoleSheetOpen(true);
          }
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar
            name={user.name}
            src={avatarSrc(user.avatar_url, user.updated_at, uploadsOriginOf(platform.apiBaseUrl))}
            size={62}
            ring
          />
          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 17, fontWeight: 800, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: colors.ink }}>
              {(N(user.name) || t("profile_default_name"))}
            </strong>
            <span style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 12.5, color: colors.inkMuted }}>
              <Icon name="pin" size={13} />
              {(localizeCityName(user.city, lang) || "—")}
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3, fontSize: 11.5, color: colors.olive700, fontWeight: 600 }}>
              <Icon name="refresh" size={12} />
              {L("برای تغییر حساب بزنید")}
            </span>
          </div>
          <button type="button" aria-label={L("ویرایش پروفایل")} onClick={(event) => { event.stopPropagation(); navigateApp("/profile/edit", config); }} className="vodda-tappable"
            style={{ width: 44, height: 44, display: "grid", placeItems: "center", flex: "0 0 44px", padding: 0, border: 0, borderRadius: 12, color: colors.olive700, background: colors.olive50, cursor: "pointer" }}>
            <Icon name="edit" size={19} />
          </button>
        </div>
      </Card>

      {canUseTeacherMode ? (
        <button type="button" onClick={() => navigateApp("/t", config)} className="vodda-tappable vodda-enter vodda-enter-delay-1"
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: 16, textAlign: "right", border: `1px solid ${colors.olive100}`, borderRadius: 24, color: colors.ink, background: colors.olive50, fontFamily: typography.fontFamily, cursor: "pointer" }}>
          <span style={{ width: 46, height: 46, display: "grid", placeItems: "center", flex: "0 0 46px", borderRadius: 14, color: colors.onOlive, background: colors.olive600 }}>
            <Icon name="award" size={22} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ ...typography.body, display: "block", fontWeight: 800 }}>{t("profile_teacher_mode")}</strong>
            <span style={{ ...typography.caption, display: "block", marginTop: 3, color: colors.inkSecondary }}>{t("profile_teacher_mode_hint")}</span>
          </span>
          <Icon name="refresh" size={20} style={{ color: colors.olive600 }} />
        </button>
      ) : null}

      {/* امتیاز اینستاقرآن — موجودی، دفتر رویدادها و میان‌بر چالش‌ها */}
      {points ? (
        <Card elevated className="vodda-enter vodda-enter-delay-1" style={{ padding: 16, borderRadius: 24, display: "grid", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                flex: "0 0 42px",
                display: "grid",
                placeItems: "center",
                borderRadius: 14,
                background: colors.goldBackground,
                border: "1px solid rgba(191,149,64,.35)",
                color: colors.goldDark,
              }}
            >
              <Icon name="coins" size={20} />
            </span>
            <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800, color: colors.ink }}>{L("امتیاز اینستاقرآن شما")}</span>
            <strong style={{ flexShrink: 0, fontSize: 21, fontWeight: 900, color: colors.goldDark, lineHeight: 1.2 }}>
              {localizedDigits(points.balance, lang)}
            </strong>
          </div>

          <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.inkMuted, lineHeight: 1.8 }}>
            {L("امتیازِ شما از رقابت‌های قرآنی وُدّا — شرکت، رتبه و پاداش")}
          </span>

          {points.ledger.length > 0 ? (
            <div style={{ display: "grid", gap: 8, paddingTop: 10, borderTop: `1px dashed ${colors.sand200}` }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: colors.inkSecondary }}>{L("آخرین تغییرهای امتیاز")}</span>
              {points.ledger.slice(0, 5).map((entry) => (
                <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: 700, color: colors.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {pointReasonLabel(entry.reason, L)}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 600, color: colors.inkMuted }}>
                    {formatAppDateTime(entry.createdAt, lang)}
                  </span>
                  <span
                    dir="ltr"
                    style={{ flexShrink: 0, minWidth: 40, textAlign: "right", fontSize: 12, fontWeight: 900, color: entry.amount >= 0 ? colors.success : colors.danger }}
                  >
                    {entry.amount >= 0 ? "+" : "−"}
                    {localizedDigits(Math.abs(entry.amount), lang)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: colors.inkMuted }}>{L("هنوز امتیازی ثبت نشده است")}</span>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 7,
              padding: "10px 12px",
              borderRadius: 13,
              background: colors.goldBackground,
              border: "1px solid rgba(191,149,64,.3)",
              color: colors.goldDark,
              fontSize: 11,
              fontWeight: 700,
              lineHeight: 1.8,
            }}
          >
            <Icon name="info" size={14} style={{ flexShrink: 0, marginTop: 3 }} />
            <span>
              {L("چگونه امتیاز بگیرم؟")} {L("شرکت در هر چالش ۱۰ امتیاز و رتبهٔ اول تا پنجم تا ۱۰۰ امتیاز پاداش دارد.")}
            </span>
          </div>

          <Button variant="secondary" fullWidth onClick={() => navigateApp("/challenges", config)}>
            <Icon name="sparkle" size={17} />
            {L("مشاهدهٔ چالش‌ها")}
          </Button>
        </Card>
      ) : null}

      {/* تنظیمات ظاهر — زبان و حالت نمایش */}
      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${colors.sand100}` }}>
          <Icon name="grid" size={21} style={{ color: colors.olive600 }} />
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700 }}>{t("profile_settings")}</span>
        </div>
        <div style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: `1px solid ${colors.sand100}` }}>
          <Icon name="doc" size={20} style={{ color: colors.olive600 }} />
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{t("profile_language")}</span>
          <div role="group" aria-label={t("profile_language")} style={{ display: "flex", gap: 4, padding: 3, borderRadius: 999, border: `1px solid ${colors.sand200}`, background: colors.surfaceSoft }}>
            {(["fa", "en"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                aria-pressed={lang === option}
                style={{
                  padding: "5px 14px",
                  borderRadius: 999,
                  border: 0,
                  cursor: "pointer",
                  fontFamily: typography.fontFamily,
                  fontSize: 12,
                  fontWeight: lang === option ? 800 : 600,
                  color: lang === option ? colors.onOlive : colors.inkMuted,
                  background: lang === option ? colors.olive600 : "transparent",
                }}
              >
                {option === "fa" ? t("lang_fa") : t("lang_en")}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          role="switch"
          aria-checked={theme === "dark"}
          className="vodda-tappable"
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", border: 0, color: colors.ink, background: colors.surface, fontFamily: typography.fontFamily, cursor: "pointer" }}
        >
          <Icon name={theme === "dark" ? "moon" : "sun"} size={20} style={{ color: colors.olive600 }} />
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600, textAlign: "right" }}>{t("profile_theme")}</span>
          <span
            style={{
              minWidth: 64,
              display: "flex",
              alignItems: "center",
              gap: 5,
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 800,
              /* در حالت تاریک متن پیل باید روشن بماند — surface تیره می‌شود */
              color: colors.olive700,
              background: theme === "dark" ? colors.olive800 : colors.olive50,
            }}
          >
            {theme === "dark" ? t("theme_dark") : t("theme_light")}
          </span>
        </button>
      </Card>

      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
        {(() => {
          const isAdmin = user.role === "admin";
          const rows: Array<{ icon: "user" | "wallet" | "shield"; label: string; path: string; external?: boolean }> = [
            { icon: "user" as const, label: t("profile_edit"), path: "/profile/edit" },
            { icon: "wallet" as const, label: t("profile_wallet_row"), path: "/wallet" },
            ...(isAdmin ? [{ icon: "shield" as const, label: L("مدیریت سامانه"), path: "/a" }] : []),
          ];
          return rows.map((row, index) => (
            <button
              key={row.path}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (row.external) window.location.assign(row.path);
                else navigateApp(row.path, config);
              }}
              className="vodda-tappable"
              style={{ width: "100%", minHeight: 58, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textAlign: "right", border: 0, borderBottom: index < rows.length - 1 ? `1px solid ${colors.sand100}` : 0, color: row.external ? colors.goldDark : colors.ink, background: colors.surface, fontFamily: typography.fontFamily, cursor: "pointer" }}>
              <Icon name={row.icon} size={21} style={{ color: row.external ? colors.goldDark : colors.olive600 }} />
              <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{row.label}</span>
              <Icon name="chevronL" size={18} style={{ color: colors.inkFaint }} />
            </button>
          ));
        })()}
      </Card>

      {/* پشتیبانی و اطلاعات (B3) — صفحات راهنما در وب وُدّا */}
      <Card className="vodda-enter vodda-enter-delay-2" style={{ padding: 0, overflow: "hidden", borderRadius: 24 }}>
        {[
          { icon: "phone" as const, labelKey: "support_contact" as const, href: "/contact" },
          { icon: "quran" as const, labelKey: "about_vodda" as const, href: "/about" },
          { icon: "doc" as const, labelKey: "faq" as const, href: "/faq" },
          { icon: "shield" as const, labelKey: "privacy" as const, href: "/privacy" },
        ].map((row, index, rows) => (
          <a key={row.href} href={row.href} target="_blank" rel="noreferrer" className="vodda-tappable"
            style={{ width: "100%", minHeight: 58, display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", textAlign: "right", textDecoration: "none", borderBottom: index < rows.length - 1 ? `1px solid ${colors.sand100}` : 0, color: colors.ink, background: colors.surface }}>
            <Icon name={row.icon} size={21} style={{ color: colors.olive600 }} />
            <span style={{ flex: 1, fontSize: 14.5, fontWeight: 600 }}>{t(row.labelKey)}</span>
            <Icon name="chevronL" size={18} style={{ color: colors.inkFaint }} />
          </a>
        ))}
      </Card>

      <RoleModeSheet
        open={roleSheetOpen}
        mode="learner"
        config={config}
        user={user}
        onClose={() => setRoleSheetOpen(false)}
      />

      {error ? (
        <div role="alert" style={{ display: "flex", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, background: colors.dangerBackground, color: colors.danger, ...typography.bodySmall }}>
          <Icon name="info" size={18} />
          {L(error)}
        </div>
      ) : null}

      <Button variant="danger" fullWidth loading={loggingOut} onClick={() => void logout()} style={{ minHeight: 48, borderRadius: 14 }}>
        <Icon name="logout" size={19} />
        {t("profile_logout")}
      </Button>

      <p style={{ fontSize: 12, margin: "4px 0 0", textAlign: "center", color: colors.inkFaint }}>
        {L("وُدّا · نسخهٔ ۱٫۰٫۰")}
      </p>
    </div>
  );
}
