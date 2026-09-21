"use client";

import { useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import { Icon, colors, radii, shadows, spacing, typography } from "../../ui";

type RoleModeSwitchProps = {
  config: UniversalAppConfig;
  mode: "learner" | "teacher";
};

function canSwitchMode(user: AuthUser | null) {
  return user?.role === "teacher" || user?.role === "admin";
}

export function RoleModeSwitch({ config, mode }: RoleModeSwitchProps) {
  const platform = usePlatform();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    platform.restoreSession()
      .then((session) => {
        if (!cancelled) setUser(session);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [platform]);

  if (!canSwitchMode(user)) return null;

  const targetMode = mode === "teacher" ? "learner" : "teacher";
  const targetPath = targetMode === "teacher" ? "/t" : "/";
  const label = targetMode === "teacher" ? "فضای استاد" : "فضای قرآن‌آموز";

  return (
    <button
      type="button"
      className="vodda-tappable"
      onClick={() => navigateApp(targetPath, config)}
      aria-label={`ورود به ${label}`}
      style={{
        minHeight: 36,
        display: "inline-flex",
        alignItems: "center",
        gap: spacing.sm,
        padding: "7px 11px",
        border: `1px solid ${colors.olive200}`,
        borderRadius: radii.pill,
        color: colors.olive700,
        background: colors.surface,
        boxShadow: shadows.xs,
        fontFamily: typography.fontFamily,
        fontSize: 11.5,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      <Icon name={targetMode === "teacher" ? "grid" : "user"} size={15} stroke={1.9} />
      {label}
    </button>
  );
}
