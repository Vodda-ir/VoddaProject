"use client";

/* نشان‌های مشترک چالش — تراشهٔ مرحله و حوزه (سبک یکسان در فهرست و جزئیات). */

import type { CSSProperties } from "react";
import { Icon, colors, radii, typography } from "../../ui";
import { useAppearance } from "../../ui/appearance";
import { challengeModeLabel, challengePhaseLabel } from "./api";

type BadgeTone = { ink: string; bg: string; border: string };

const PHASE_TONES: Record<string, BadgeTone> = {
  registration: { ink: colors.goldDark, bg: colors.goldBackground, border: "rgba(191,149,64,.4)" },
  active: { ink: colors.greenInk, bg: colors.greenBackground, border: colors.greenBorder },
  judging: { ink: colors.info, bg: colors.infoBackground, border: "rgba(94,126,140,.4)" },
  finished: { ink: colors.olive700, bg: colors.olive50, border: colors.olive100 },
  canceled: { ink: colors.danger, bg: colors.dangerBackground, border: "rgba(166,81,81,.3)" },
};

function badgeStyle(tone: BadgeTone): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "3px 9px",
    borderRadius: radii.pill,
    background: tone.bg,
    border: `1px solid ${tone.border}`,
    color: tone.ink,
    fontSize: 10,
    fontWeight: 800,
    whiteSpace: "nowrap",
  };
}

export function PhaseBadge({ status }: { status: string }) {
  const { L } = useAppearance();
  return <span style={badgeStyle(PHASE_TONES[status] ?? PHASE_TONES.finished)}>{challengePhaseLabel(status, L)}</span>;
}

export function ModeBadge({ mode }: { mode: string }) {
  const { L } = useAppearance();
  return (
    <span
      style={badgeStyle({
        ink: colors.olive700,
        bg: colors.olive50,
        border: colors.olive100,
      })}
    >
      <Icon name={mode === "audio" ? "headphones" : "edit"} size={11} stroke={2.1} />
      {challengeModeLabel(mode, L)}
    </span>
  );
}
