"use client";

import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Icon, Sheet, colors, shadows, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";

export function RoleModeSheet({
  open,
  mode,
  config,
  onClose,
}: {
  open: boolean;
  mode: "learner" | "teacher";
  config: UniversalAppConfig;
  onClose: () => void;
}) {
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
    </Sheet>
  );
}
