"use client";

import { useEffect, useState } from "react";
import type { UniversalAppConfig } from "../../config";
import { usePlatform } from "../../platform/context";
import type { AuthUser } from "../../platform/types";
import { navigateApp } from "../../router";
import { Button } from "../../ui";

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

    async function loadSession() {
      try {
        const session = await platform.restoreSession();
        if (!cancelled) setUser(session);
      } catch {
        if (!cancelled) setUser(null);
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [platform]);

  if (!canSwitchMode(user)) return null;

  const targetMode = mode === "teacher" ? "learner" : "teacher";
  const targetPath = targetMode === "teacher" ? "/t" : "/";
  const label = targetMode === "teacher" ? "ورود به فضای استاد" : "ورود به فضای قرآن‌آموز";

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => navigateApp(targetPath, config)}
      aria-label={label}
    >
      {label}
    </Button>
  );
}
