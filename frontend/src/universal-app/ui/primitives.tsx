import type {
  ButtonHTMLAttributes,
  CSSProperties,
  HTMLAttributes,
  ImgHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  RefObject,
} from "react";
import { useEffect, useRef, useState } from "react";
import { resolveAssetUrl } from "../platform/asset";
import { colors, gradients, radii, shadows, spacing, typography } from "./theme";

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
  className,
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, CSSProperties> = {
    primary: {
      color: colors.surface,
      background: colors.olive600,
      borderColor: colors.olive600,
      boxShadow: "none",
    },
    secondary: {
      color: colors.olive800,
      background: colors.surface,
      borderColor: colors.olive200,
      boxShadow: shadows.xs,
    },
    ghost: {
      color: colors.olive700,
      background: "transparent",
      borderColor: "transparent",
    },
    danger: {
      color: colors.danger,
      background: colors.dangerBackground,
      borderColor: "rgba(166,81,81,.16)",
    },
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      className={["vodda-button", `vodda-button--${variant}`, className].filter(Boolean).join(" ")}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      style={mergeStyle(
        {
          ...typography.label,
          fontSize: 15,
          minHeight: 52,
          width: fullWidth ? "100%" : undefined,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          padding: `14px ${spacing.xl}px`,
          border: "1px solid",
          borderRadius: radii.pill,
          fontFamily: typography.fontFamily,
          cursor: isDisabled ? "not-allowed" : "pointer",
          opacity: isDisabled ? 0.56 : 1,
          transition: "transform 150ms ease, box-shadow 150ms ease, background 150ms ease, opacity 150ms ease",
          WebkitTapHighlightColor: "transparent",
          ...variants[variant],
        },
        style,
      )}
      {...props}
    >
      {loading ? (
        <>
          <span className="vodda-spinner" aria-hidden="true" />
          <span>در حال انجام…</span>
        </>
      ) : children}
    </button>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  containerStyle?: CSSProperties;
};

export function Input({ label, hint, error, containerStyle, style, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label
      htmlFor={inputId}
      style={mergeStyle(
        {
          display: "grid",
          gap: 7,
          color: colors.ink,
          fontFamily: typography.fontFamily,
          ...typography.bodySmall,
        },
        containerStyle,
      )}
    >
      {label ? <span style={{ fontWeight: 800, color: colors.inkSecondary }}>{label}</span> : null}
      <input
        id={inputId}
        className={["vodda-input", className].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error) || undefined}
        style={mergeStyle(
          {
            minHeight: 50,
            width: "100%",
            boxSizing: "border-box",
            padding: `11px ${spacing.lg}px`,
            color: colors.ink,
            background: colors.surface,
            border: `1px solid ${error ? "rgba(166, 81, 81, 0.55)" : colors.sand200}`,
            borderRadius: radii.md,
            outline: "none",
            boxShadow: "none",
            fontFamily: typography.fontFamily,
            ...typography.body,
            transition: "border-color 150ms ease, box-shadow 150ms ease, background 150ms ease",
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

export function Card({ elevated = false, children, style, className, ...props }: CardProps) {
  return (
    <div
      className={["vodda-card", elevated ? "vodda-card--elevated" : "", className].filter(Boolean).join(" ")}
      style={mergeStyle(
        {
          padding: spacing.xl,
          color: colors.ink,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: radii.lg,
          boxShadow: elevated ? shadows.md : "none",
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
  ring?: boolean;
};

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return "و";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts.at(-1)?.[0] ?? "" : ""}`;
}

function avatarFrame(size: number, ring: boolean, style?: CSSProperties): CSSProperties {
  return mergeStyle(
    {
      display: "inline-grid",
      placeItems: "center",
      flex: `0 0 ${size}px`,
      width: size,
      height: size,
      boxSizing: "border-box",
      borderRadius: "50%",
      border: ring ? `3px solid ${colors.surface}` : undefined,
      outline: ring ? `2px solid ${colors.olive200}` : undefined,
      boxShadow: ring ? shadows.sm : undefined,
    },
    style,
  );
}

export function Avatar({ name, size = 48, ring = true, src, alt, style, ...props }: AvatarProps) {
  // آدرس‌های نسبی آپلودها (مثل /uploads/avatars/…) پیش از رندر حل می‌شوند تا
  // هم در وب هم‌مبدأ و هم در WebView نیتیو درست نمایش داده شوند.
  const resolvedSrc = resolveAssetUrl(src);
  if (resolvedSrc) {
    return (
      <img
        src={resolvedSrc}
        alt={alt ?? name ?? "تصویر کاربر"}
        width={size}
        height={size}
        style={{
          ...avatarFrame(size, ring, style),
          objectFit: "cover",
          background: colors.olive50,
        }}
        {...props}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={alt ?? name ?? "کاربر"}
      style={{
        ...avatarFrame(size, ring, style),
        color: colors.olive800,
        background: gradients.soft,
        fontFamily: typography.fontFamily,
        fontSize: Math.max(12, Math.round(size * 0.29)),
        fontWeight: 900,
      }}
    >
      {initials(name)}
    </span>
  );
}

export type StateProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  style?: CSSProperties;
};

function StateView({ title, description, action, icon, style }: StateProps) {
  return (
    <div
      style={mergeStyle(
        {
          display: "grid",
          justifyItems: "center",
          gap: spacing.sm,
          padding: `${spacing.huge}px ${spacing.xl}px`,
          color: colors.ink,
          textAlign: "center",
          fontFamily: typography.fontFamily,
        },
        style,
      )}
    >
      <div
        aria-hidden={!icon}
        style={{
          width: 72,
          height: 72,
          display: "grid",
          placeItems: "center",
          marginBottom: spacing.xs,
          borderRadius: "50%",
          color: colors.olive500,
          background: colors.olive50,
          boxShadow: `inset 0 0 0 1px ${colors.olive100}`,
          fontSize: 26,
          fontWeight: 900,
        }}
      >
        {icon ?? "و"}
      </div>
      <strong style={typography.title}>{title}</strong>
      {description ? <span style={{ maxWidth: 380, color: colors.inkMuted, ...typography.body }}>{description}</span> : null}
      {action ? <div style={{ marginTop: spacing.md }}>{action}</div> : null}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  return <StateView {...props} />;
}

export function ErrorState(props: StateProps) {
  return (
    <StateView
      {...props}
      style={{
        ...props.style,
      }}
      icon={
        <span style={{ color: colors.danger, fontSize: 24, fontWeight: 900 }}>!</span>
      }
    />
  );
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
          alignContent: "center",
          gap: spacing.md,
          minHeight: 170,
          padding: spacing.xl,
          color: colors.inkMuted,
          textAlign: "center",
          fontFamily: typography.fontFamily,
          ...typography.body,
        },
        style,
      )}
    >
      <span className="vodda-loader-orbit" aria-hidden="true" />
      <span>{label}</span>
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

/**
 * رفتار استاندارد مودال (A5): قفل اسکرول پس‌زمینه، بستن با Escape،
 * محبوس‌کردن فوکوس درون پنجره و بازگرداندن فوکوس به محل پیشین.
 */
function useOverlayBehavior(open: boolean, onClose: () => void, containerRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusablesIn = (root: HTMLElement) =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );

    window.setTimeout(() => containerRef.current?.focus({ preventScroll: true }), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;
      const items = focusablesIn(container);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0] as HTMLElement;
      const last = items.at(-1) as HTMLElement;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, containerRef]);
}

export function Dialog({ open, title, children, onClose, closeLabel = "بستن" }: OverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useOverlayBehavior(open, onClose, containerRef);
  if (!open) return null;
  return (
    <div
      role="presentation"
      className="vodda-overlay"
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
        background: "rgba(32, 35, 27, 0.56)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className="vodda-dialog"
        style={{
          width: "min(100%, 460px)",
          maxHeight: "min(82dvh, 720px)",
          overflowY: "auto",
          padding: spacing.xl,
          color: colors.ink,
          background: colors.surface,
          border: `1px solid ${colors.sand150}`,
          borderRadius: radii.xl,
          boxShadow: shadows.lg,
          fontFamily: typography.fontFamily,
          outline: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          {title ? <strong style={typography.title}>{title}</strong> : <span />}
          <Button variant="ghost" onClick={onClose} aria-label={closeLabel} style={{ width: 44, minHeight: 44, padding: 0 }}>
            ×
          </Button>
        </div>
        <div style={{ marginTop: title ? spacing.md : 0 }}>{children}</div>
      </div>
    </div>
  );
}

export function Sheet({ open, title, children, onClose, closeLabel = "بستن" }: OverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef<number | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  useOverlayBehavior(open, onClose, containerRef);
  if (!open) return null;
  return (
    <div
      role="presentation"
      className="vodda-overlay"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        background: "rgba(32, 35, 27, 0.5)",
        backdropFilter: "blur(7px)",
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className="vodda-sheet"
        style={{
          width: "min(100%, 640px)",
          maxHeight: "88dvh",
          marginInline: "auto",
          overflowY: "auto",
          padding: `${spacing.md}px ${spacing.xl}px calc(${spacing.xxl}px + env(safe-area-inset-bottom))`,
          color: colors.ink,
          background: colors.surface,
          borderRadius: `${radii.xl}px ${radii.xl}px 0 0`,
          boxShadow: shadows.lg,
          fontFamily: typography.fontFamily,
          outline: "none",
          transform: dragOffset > 0 ? `translateY(${dragOffset}px)` : undefined,
          transition: dragOffset > 0 ? "none" : undefined,
        }}
      >
        <div
          role="button"
          aria-label={closeLabel}
          className="vodda-hit"
          onClick={() => onClose()}
          onPointerDown={(event) => {
            dragStartY.current = event.clientY;
          }}
          onPointerMove={(event) => {
            if (dragStartY.current === null) return;
            const delta = event.clientY - dragStartY.current;
            if (delta > 0) setDragOffset(delta);
          }}
          onPointerUp={() => {
            if (dragOffset > 72) onClose();
            dragStartY.current = null;
            setDragOffset(0);
          }}
          onPointerCancel={() => {
            dragStartY.current = null;
            setDragOffset(0);
          }}
          style={{
            width: 64,
            height: 24,
            margin: "0 auto 10px",
            display: "grid",
            placeItems: "center",
            borderRadius: radii.pill,
            cursor: "grab",
            touchAction: "none" as const,
          }}
        >
          <span style={{ width: 42, height: 5, borderRadius: radii.pill, background: colors.sand200 }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: spacing.md }}>
          {title ? <strong style={typography.title}>{title}</strong> : <span />}
          <Button variant="ghost" onClick={onClose} aria-label={closeLabel} style={{ width: 44, minHeight: 44, padding: 0 }}>
            ×
          </Button>
        </div>
        <div style={{ marginTop: title ? spacing.md : 0 }}>{children}</div>
      </div>
    </div>
  );
}
