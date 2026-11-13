"use client";

// هاب «فراخوان» — صفحه‌ای که دکمهٔ وسط ناوبری باز می‌کند: دو مسیر اصلی
// (استاد آنلاین / مراسم حضوری) با کارت‌های گرافیکی مشترک + لینک‌های ثانویه.

import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Icon } from "../../ui/Icon";
import { colors, gradients, shadows, spacing, typography } from "../../ui/theme";
import { DispatchPairCards } from "../dispatch/DispatchPairCards";

function SecondaryLink({
  icon,
  label,
  description,
  onClick,
  ariaLabel,
}: {
  icon: "list" | "users";
  label: string;
  description: string;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="vodda-card vodda-card--interactive vodda-tappable"
      style={{
        display: "flex",
        alignItems: "center",
        gap: spacing.md,
        padding: "14px 16px",
        textAlign: "right",
        borderRadius: 18,
        color: colors.ink,
        background: colors.surface,
        border: `1px solid ${colors.sand150}`,
        boxShadow: shadows.xs,
        cursor: "pointer",
        fontFamily: typography.fontFamily,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 40,
          height: 40,
          display: "grid",
          placeItems: "center",
          flex: "0 0 40px",
          borderRadius: 13,
          background: colors.olive50,
          color: colors.olive700,
        }}
      >
        <Icon name={icon} size={19} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <strong style={{ display: "block", fontSize: 13.5, fontWeight: 800 }}>{label}</strong>
        <span style={{ display: "block", marginTop: 2, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.7 }}>
          {description}
        </span>
      </span>
      <Icon name="chevronL" size={16} style={{ color: colors.inkFaint, flex: "0 0 auto" }} />
    </button>
  );
}

export function CallHubScreen({ config }: { config: UniversalAppConfig }) {
  return (
    <div className="vodda-screen" style={{ display: "grid", gap: spacing.lg }}>
      <div
        className="vodda-enter"
        style={{
          borderRadius: 22,
          padding: 22,
          color: colors.surface,
          background: gradients.deep,
          boxShadow: shadows.olive,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "grid", placeItems: "center", width: 46, height: 46, borderRadius: 15, background: "rgba(255,255,255,.14)" }}>
            <Icon name="bell" size={24} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>فراخوان‌ها</h1>
            <span style={{ fontSize: 12.5, opacity: 0.85 }}>استاد آنلاین برای یادگیری، قاری حضوری برای مراسم</span>
          </div>
        </div>
      </div>

      <DispatchPairCards config={config} />

      <div style={{ display: "grid", gap: spacing.sm }}>
        <SecondaryLink
          icon="list"
          label="فراخوان‌های من"
          description="پیگیری فراخوان‌های ثبت‌شده و پذیرش‌های رسیده"
          ariaLabel="پیگیری فراخوان‌های ثبت‌شدهٔ من"
          onClick={() => navigateApp("/ceremony/calls", config)}
        />
        <SecondaryLink
          icon="users"
          label="قاریان حضوری"
          description="فهرست قاریان تأییدشده و رزرو مستقیم مراسم"
          ariaLabel="فهرست قاریان حضوری و رزرو مستقیم"
          onClick={() => navigateApp("/presence", config)}
        />
      </div>

      <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
        در فراخوان مراسم، قاریان حق‌الزحمهٔ خود را اعلام می‌کنند؛ یکی را انتخاب می‌کنید، ودیعه را از طریق درگاه امن پرداخت می‌کنید و پس از برگزاری مراسم، تسویه نهایی انجام می‌شود.
      </p>
    </div>
  );
}
