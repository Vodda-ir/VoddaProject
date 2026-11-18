import type { CSSProperties, ReactNode } from "react";
import { useAppearance } from "./appearance";
import { Icon } from "./Icon";
import { colors, gradients, radii, shadows, spacing, typography } from "./theme";

type IconName = Parameters<typeof Icon>[0]["name"];

export function SectionHeader({
  title,
  description,
  action,
  onAction,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  onAction?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.md }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ ...typography.sectionTitle, margin: 0, color: colors.ink }}>{title}</h2>
        {description ? (
          <p style={{ ...typography.caption, margin: `${spacing.xs}px 0 0`, color: colors.inkMuted }}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? (
        <button
          type="button"
          onClick={onAction}
          className="vodda-tappable"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            flex: "0 0 auto",
            padding: "7px 0",
            border: 0,
            color: colors.olive600,
            background: "transparent",
            font: "inherit",
            fontFamily: typography.fontFamily,
            fontSize: 12.5,
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {action}
          <Icon name="chevronL" size={15} stroke={2} />
        </button>
      ) : null}
    </div>
  );
}

export function IconBadge({
  icon,
  tone = "olive",
  size = 46,
}: {
  icon: IconName;
  tone?: "olive" | "clay" | "gold" | "info";
  size?: number;
}) {
  const tones = {
    olive: [colors.olive100, colors.olive700],
    clay: [colors.clayBackground, colors.clay],
    gold: [colors.goldBackground, colors.goldDark],
    info: [colors.infoBackground, colors.info],
  } as const;
  const [background, color] = tones[tone];
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
        flex: `0 0 ${size}px`,
        borderRadius: Math.round(size * 0.34),
        color,
        background,
      }}
    >
      <Icon name={icon} size={Math.round(size * 0.52)} stroke={1.9} />
    </span>
  );
}

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const { L } = useAppearance();
  const map: Record<string, { text: string; fg: string; bg: string }> = {
    confirmed: { text: "تأیید شده", fg: colors.olive700, bg: colors.olive100 },
    pending: { text: "در انتظار تأیید", fg: colors.goldDark, bg: colors.goldBackground },
    done: { text: "برگزار شده", fg: colors.inkMuted, bg: colors.sand100 },
    completed: { text: "برگزار شده", fg: colors.inkMuted, bg: colors.sand100 },
    canceled: { text: "لغو شده", fg: colors.danger, bg: colors.clayBackground },
    rejected: { text: "رد شده", fg: colors.danger, bg: colors.dangerBackground },
    approved: { text: "تأییدشده", fg: colors.olive700, bg: colors.olive100 },
    paid: { text: "پرداخت‌شده", fg: colors.olive700, bg: colors.olive100 },
    awaiting_payment: { text: "در انتظار پرداخت", fg: colors.goldDark, bg: colors.goldBackground },
  };
  const tone = map[status] ?? { text: label ?? status, fg: colors.inkSecondary, bg: colors.sand100 };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        minHeight: 28,
        padding: "4px 10px",
        borderRadius: radii.pill,
        color: tone.fg,
        background: tone.bg,
        ...typography.caption,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: tone.fg }} />
      {label ? L(label) : L(tone.text)}
    </span>
  );
}

export function MetricTile({
  label,
  value,
  icon,
  tone = "olive",
  style,
}: {
  label: ReactNode;
  value: ReactNode;
  icon?: IconName;
  tone?: "olive" | "gold" | "clay" | "info";
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        padding: spacing.lg,
        border: `1px solid ${colors.sand150}`,
        borderRadius: radii.lg,
        background: colors.surface,
        boxShadow: shadows.xs,
        ...style,
      }}
    >
      {icon ? <IconBadge icon={icon} tone={tone} size={38} /> : null}
      <strong style={{ ...typography.title, display: "block", marginTop: icon ? spacing.md : 0, color: colors.ink }}>
        {value}
      </strong>
      <span style={{ ...typography.caption, display: "block", marginTop: 2, color: colors.inkMuted }}>{label}</span>
    </div>
  );
}

export function WalletHero({
  label,
  amount,
  suffix,
  children,
}: {
  label?: ReactNode;
  amount: ReactNode;
  suffix?: ReactNode;
  children?: ReactNode;
}) {
  const { L } = useAppearance();
  const labelNode = label ?? L("موجودی کیف پول");
  const suffixNode = suffix ?? L("تومان");
  return (
    <div
      style={{
        padding: 22,
        borderRadius: 30,
        color: colors.onOlive,
        background: gradients.oliveCard,
        boxShadow: "0 10px 28px rgba(94,110,67,.28)",
      }}
    >
      <span style={{ fontSize: 13, lineHeight: 1.7, color: "rgba(255,255,255,.70)" }}>{labelNode}</span>
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 6, marginTop: 7 }}>
        <strong style={{ fontSize: 30, lineHeight: 1.35, fontWeight: 800, color: colors.onOlive }}>{amount}</strong>
        <span style={{ fontSize: 14.5, lineHeight: 1.6, color: "rgba(255,255,255,.65)", fontWeight: 600 }}>{suffixNode}</span>
      </div>
      {children ? <div style={{ marginTop: 18 }}>{children}</div> : null}
    </div>
  );
}

export function ActionTile({
  icon,
  title,
  description,
  onClick,
  tone = "olive",
  trailing,
}: {
  icon: IconName;
  title: ReactNode;
  description?: ReactNode;
  onClick?: () => void;
  tone?: "olive" | "gold" | "clay" | "info";
  trailing?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="vodda-card vodda-card--interactive vodda-tappable"
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: spacing.lg,
        textAlign: "right",
        border: `1px solid ${colors.sand150}`,
        borderRadius: radii.lg,
        color: colors.ink,
        background: colors.surface,
        boxShadow: shadows.xs,
        fontFamily: typography.fontFamily,
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <IconBadge icon={icon} tone={tone} size={44} />
      <span style={{ minWidth: 0, flex: 1 }}>
        <strong style={{ ...typography.body, display: "block", color: colors.ink }}>{title}</strong>
        {description ? (
          <span style={{ ...typography.caption, display: "block", marginTop: 2, color: colors.inkMuted }}>{description}</span>
        ) : null}
      </span>
      {trailing ?? <Icon name="chevronL" size={18} stroke={1.8} style={{ color: colors.inkFaint }} />}
    </button>
  );
}

export function HeroPanel({
  eyebrow,
  title,
  description,
  icon = "sparkle",
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconName;
  children?: ReactNode;
}) {
  return (
    <section
      className="vodda-enter"
      style={{
        position: "relative",
        overflow: "hidden",
        padding: `${spacing.xxl}px ${spacing.xxl}px ${spacing.xl}px`,
        borderRadius: radii.xl,
        color: colors.onOlive,
        background: gradients.hero,
        boxShadow: shadows.olive,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 170,
          height: 170,
          insetInlineEnd: -72,
          top: -82,
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(255,255,255,.045)",
        }}
      />
      <div style={{ position: "relative" }}>
        {eyebrow ? (
          <div style={{ display: "flex", alignItems: "center", gap: 7, color: "rgba(255,255,255,.74)", ...typography.bodySmall }}>
            <Icon name={icon} size={18} stroke={1.9} style={{ color: colors.goldSoft }} />
            <span>{eyebrow}</span>
          </div>
        ) : null}
        <h2 style={{ ...typography.heading, margin: eyebrow ? `${spacing.sm}px 0 0` : 0, color: colors.onOlive, whiteSpace: "pre-line" }}>
          {title}
        </h2>
        {description ? (
          <p style={{ ...typography.bodySmall, margin: `${spacing.sm}px 0 0`, color: "rgba(255,255,255,.72)" }}>{description}</p>
        ) : null}
        {children ? <div style={{ marginTop: spacing.lg }}>{children}</div> : null}
      </div>
    </section>
  );
}
