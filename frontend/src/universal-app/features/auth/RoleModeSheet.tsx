"use client";

import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { avatarSrc, uploadsOriginOf } from "@/lib/avatarImage";
import { Avatar, Icon, Sheet, colors, gradients, radii, shadows, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";

export function RoleModeSheet({
  open,
  mode,
  config,
  onClose,
  user,
}: {
  open: boolean;
  mode: "learner" | "teacher";
  config: UniversalAppConfig;
  onClose: () => void;
  user?: AuthUser | null;
}) {
  const isAdmin = user?.role === "admin";
  // باگ avatar-upload — آواتار خود کاربر با کش‌باستینگ و بازنویسی مسیر /uploads در اپ نیتیو
  const runtime = usePlatform();

  function roleLabel(role?: string) {
    if (role === "admin") return "مدیر سامانه";
    if (role === "teacher") return "استاد";
    return "قرآن‌آموز";
  }

  const { L } = useAppearance();
  const options = [
    {
      mode: "learner" as const,
      icon: "user" as const,
      title: L("حساب قرآن آموز"),
      description: L("یافتن استاد و رزرو جلسه"),
      path: "/",
    },
    {
      mode: "teacher" as const,
      icon: "award" as const,
      title: L("حساب استاد"),
      description: L("مدیریت جلسات و درآمد"),
      path: "/t",
    },
  ];

  return (
    <Sheet open={open} title={L("تغییر حساب")} onClose={onClose}>
      {user ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            marginBottom: 14,
            borderRadius: radii.md,
            background: gradients.soft,
            border: `1px solid ${colors.sand150}`,
            boxShadow: shadows.xs,
          }}
        >
          <Avatar name={user.name} src={avatarSrc(user.avatar_url, user.updated_at, uploadsOriginOf(runtime.apiBaseUrl))} size={44} ring />
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong
              style={{
                display: "block",
                fontSize: 14.5,
                fontWeight: 800,
                color: colors.ink,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name.trim() || L("کاربر وُدّا")}
            </strong>
            <span style={{ ...typography.caption, display: "flex", alignItems: "center", gap: 4, marginTop: 2, color: colors.inkMuted }}>
              <Icon name="checkCircle" size={13} style={{ color: colors.olive600 }} />
              {L("حساب فعلی:")} {L(roleLabel(user.role))}
            </span>
          </span>
        </div>
      ) : null}

      <div style={{ display: "grid", gap: 12 }}>
        {options.map((option) => {
          const active = option.mode === mode;
          return (
            <button
              key={option.mode}
              type="button"
              className="vodda-card vodda-tappable"
              onClick={() => {
                onClose();
                if (!active) navigateApp(option.path, config);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: 16,
                textAlign: "right",
                border: active ? `1.5px solid ${colors.olive600}` : `1px solid ${colors.sand200}`,
                borderRadius: 18,
                color: colors.ink,
                background: active ? colors.olive50 : colors.surface,
                boxShadow: shadows.xs,
                fontFamily: typography.fontFamily,
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 48,
                  height: 48,
                  display: "grid",
                  placeItems: "center",
                  flex: "0 0 48px",
                  borderRadius: 14,
                  color: active ? colors.onOlive : colors.olive700,
                  background: active ? colors.olive600 : colors.olive100,
                }}
              >
                <Icon name={option.icon} size={24} />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <strong
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    display: "block",
                    color: active ? colors.olive700 : colors.ink,
                  }}
                >
                  {option.title}
                </strong>
                <span style={{ ...typography.bodySmall, display: "block", marginTop: 3, color: colors.inkMuted }}>
                  {option.description}
                </span>
              </span>
              {active ? <Icon name="checkCircle" size={22} style={{ color: colors.olive600 }} /> : null}
            </button>
          );
        })}
      </div>

      {isAdmin ? (
        <button
          type="button"
          className="vodda-card vodda-tappable"
          onClick={() => {
            onClose();
            window.location.assign("/panel/admin");
          }}
          style={{
            width: "100%",
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: 16,
            textAlign: "right",
            border: `1px solid ${colors.goldSoft}`,
            borderRadius: 18,
            color: colors.ink,
            background: gradients.gold,
            boxShadow: shadows.xs,
            fontFamily: typography.fontFamily,
            cursor: "pointer",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 48,
              height: 48,
              display: "grid",
              placeItems: "center",
              flex: "0 0 48px",
              borderRadius: 14,
              color: colors.goldDark,
              background: colors.goldBackground,
            }}
          >
            <Icon name="shield" size={24} />
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: 15, fontWeight: 800, display: "block", color: colors.goldDark }}>
              {L("پنل مدیریت")}
            </strong>
            <span style={{ ...typography.bodySmall, display: "block", marginTop: 3, color: colors.inkMuted }}>
              {L("مدیریت کاربران، اساتید و مالی")}
            </span>
          </span>
          <Icon name="arrowUpRight" size={20} style={{ color: colors.goldDark }} />
        </button>
      ) : null}
    </Sheet>
  );
}
