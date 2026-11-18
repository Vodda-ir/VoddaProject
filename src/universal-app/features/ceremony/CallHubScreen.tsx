"use client";

// هاب «فراخوان» — صفحه‌ای که دکمهٔ وسط ناوبری باز می‌کند: دو مسیر اصلی
// (استاد آنلاین / مراسم حضوری) با کارت‌های گرافیکی مشترک + لینک‌های ثانویه.

import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Icon } from "../../ui/Icon";
import { colors, shadows, spacing, typography } from "../../ui/theme";
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
      {/* معرفی کوتاه — عنوان صفحه در هدر وُدّا تکرار نمی‌شود (B4) */}
      <p className="vodda-enter" style={{ margin: 0, ...typography.body, color: colors.inkSecondary, lineHeight: 2 }}>
        دو مسیر دارید: یک <strong style={{ color: colors.olive700 }}>استاد آنلاین</strong> برای یادگیری، یا یک{" "}
        <strong style={{ color: colors.goldDark }}>قاری حضوری</strong> برای مراسم. فراخوان ثبت کنید و از پاسخ‌ها انتخاب کنید.
      </p>

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

      <p style={{ margin: 0, fontSize: 12, color: colors.inkMuted, lineHeight: 1.9 }}>
        در فراخوان مراسم، قاریان حق‌الزحمهٔ خود را اعلام می‌کنند؛ یکی را انتخاب می‌کنید، ودیعه را از طریق درگاه امن پرداخت می‌کنید و پس از برگزاری مراسم، تسویهٔ نهایی انجام می‌شود.
      </p>
    </div>
  );
}
