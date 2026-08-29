import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { colors, radii, shadows, spacing, typography } from "./theme";

function mergeStyle(base: CSSProperties, style?: CSSProperties): CSSProperties {
  return style ? { ...base, ...style } : base;
}

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  fullWidth = false,
  loading = false,
  disabled,
  children,
  style,
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      color: colors.surface,
      background: colors.olive700,
      borderColor: colors.olive700,
      boxShadow: shadows.sm,
    },
    secondary: {
      color: colors.olive800,
      background: colors.olive50,
      borderColor: colors.olive200,
    },
    ghost: {
      color: colors.inkSecondary,
      background: "transparent",
      borderColor: "transparent",
    },
    danger: {
      color: colors.danger,
      background: colors.surface,
      borderColor: "rgba(166, 81, 81, 0.28)",
    },
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={mergeStyle(
        {
          ...typography.body,
          minHeight: 44,
          width: fullWidth ? "100%" : undefined,
          padding: `9px ${spacing.lg}px`,
          border: "1px solid",
          borderRadius: radii.sm,
          fontFamily: typography.fontFamily,
          fontWeight: 700,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.58 : 1,
          transition: "opacity 160ms ease, transform 160ms ease",
          ...variants[variant],
        },
        style,
      )}
      {...props}
    >
      {loading ? "در حال انجام…" : children}
    </button>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerStyle?: CSSProperties;
};

export function Input({ label, hint, error, containerStyle, style, id, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label
      htmlFor={inputId}
      style={mergeStyle(
        {
          display: "grid",
          gap: spacing.sm,
          color: colors.ink,
          fontFamily: typography.fontFamily,
          ...typography.bodySmall,
        },
        containerStyle,
      )}
    >
      {label ? <span style={{ fontWeight: 700 }}>{label}</span> : null}
      <input
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        style={mergeStyle(
          {
            minHeight: 46,
            width: "100%",
            padding: `9px ${spacing.md}px`,
            color: colors.ink,
            background: colors.surface,
            border: `1px solid ${error ? "rgba(166, 81, 81, 0.55)" : colors.sand200}`,
            borderRadius: radii.sm,
            outline: "none",
            fontFamily: typography.fontFamily,
            ...typography.body,
          },
          style,
        )}
        {...props}
      />
      {error ? (
        <span role="alert" style={{ color: colors.danger, ...typography.caption }}>
          {error}
        </span>
      ) : hint ? (
        <span style={{ color: colors.inkMuted, ...typography.caption }}>{hint}</span>
      ) : null}
    </label>
  );
}

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  elevated?: boolean;
};

export function Card({ elevated = false, children, style, ...props }: CardProps) {
  return (
    <div
      style={mergeStyle(
        {
          padding: spacing.lg,
          color: colors.ink,
          background: colors.surface,
          border: `1px solid ${colors.sand200}`,
          borderRadius: radii.md,
          boxShadow: elevated ? shadows.md : shadows.sm,
          fontFamily: typography.fontFamily,
        },
        style,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export type AvatarProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "children"> & {
  name?: string;
  size?: number;
};

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "و";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`;
}

export function Avatar({ name, size = 48, src, alt, style, ...props }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name ?? "تصویر کاربر"}
        width={size}
        height={size}
        style={mergeStyle(
          {
            display: "block",
            width: size,
            height: size,
            objectFit: "cover",
            borderRadius: "50%",
            background: colors.olive50,
          },
          style,
        )}
        {...props}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={alt ?? name ?? "کاربر"}
      style={mergeStyle(
        {
          display: "inline-grid",
          placeItems: "center",
          flex: `0 0 ${size}px`,
          width: size,
          height: size,
          color: colors.olive800,
          background: colors.olive100,
          borderRadius: "50%",
          fontFamily: typography.fontFamily,
          fontSize: Math.max(12, Math.round(size * 0.3)),
          fontWeight: 800,
        },
        style,
      )}
    >
      {initials(name)}
    </span>
  );
}

export type StateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  style?: CSSProperties;
};

function StateView({ title, description, action, style }: StateProps) {
  return (
    <div
      style={mergeStyle(
        {
          display: "grid",
          justifyItems: "center",
          gap: spacing.sm,
          padding: `${spacing.xxxl}px ${spacing.xl}px`,
          color: colors.ink,
          textAlign: "center",
          fontFamily: typography.fontFamily,
        },
        style,
      )}
    >
      <strong style={typography.title}>{title}</strong>
      {description ? <span style={{ color: colors.inkMuted, ...typography.body }}>{description}</span> : null}
      {action ? <div style={{ marginTop: spacing.sm }}>{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateView {...props} />;
}

export function ErrorState(props: StateProps) {
  return <StateView {...props} style={{ color: colors.danger, ...props.style }} />;
}

export function LoadingState({ label = "در حال بارگذاری…", style }: { label?: ReactNode; style?: CSSProperties }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={mergeStyle(
        {
          display: "grid",
          placeItems: "center",
          minHeight: 120,
          padding: spacing.xl,
          color: colors.inkMuted,
          textAlign: "center",
          fontFamily: typography.fontFamily,
          ...typography.body,
        },
        style,
      )}
    >
      {label}
    </div>
  );
}

export type OverlayProps = {
  open: boolean;
  title?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  closeLabel?: string;
};

export function Dialog({ open, title, children, onClose, closeLabel = "بستن" }: OverlayProps) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: spacing.lg,
        background: "rgba(42, 40, 32, 0.42)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        style={{
          width: "min(100%, 440px)",
          maxHeight: "min(82dvh, 720px)",
          overflowY: "auto",
          padding: spacing.xl,
          color: colors.ink,
          background: colors.surface,
          borderRadius: radii.lg,
          boxShadow: shadows.lg,
          fontFamily: typography.fontFamily,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          {title ? <strong style={typography.title}>{title}</strong> : <span />}
          <Button variant="ghost" onClick={onClose} aria-label={closeLabel} style={{ minHeight: 36, padding: "5px 10px" }}>
            ×
          </Button>
        </div>
        <div style={{ marginTop: title ? spacing.md : 0 }}>{children}</div>
      </div>
    </div>
  );
}

export function Sheet({ open, title, children, onClose, closeLabel = "بستن" }: OverlayProps) {
  if (!open) return null;
  return (
    <div
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        background: "rgba(42, 40, 32, 0.42)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        style={{
          width: "100%",
          maxHeight: "88dvh",
          overflowY: "auto",
          padding: `${spacing.md}px ${spacing.xl}px calc(${spacing.xl}px + env(safe-area-inset-bottom))`,
          color: colors.ink,
          background: colors.surface,
          borderRadius: `${radii.lg}px ${radii.lg}px 0 0`,
          boxShadow: shadows.lg,
          fontFamily: typography.fontFamily,
        }}
      >
        <div style={{ width: 40, height: 4, margin: "0 auto 12px", borderRadius: radii.pill, background: colors.sand200 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          {title ? <strong style={typography.title}>{title}</strong> : <span />}
          <Button variant="ghost" onClick={onClose} aria-label={closeLabel} style={{ minHeight: 36, padding: "5px 10px" }}>
            ×
          </Button>
        </div>
        <div style={{ marginTop: title ? spacing.md : 0 }}>{children}</div>
      </div>
    </div>
  );
}
