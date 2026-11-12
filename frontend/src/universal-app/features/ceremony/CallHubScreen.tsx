"use client";

// هاب «فراخوان» — صفحه‌ای که دکمهٔ وسط ناوبری باز می‌کند: دو مسیر اصلی
// (استاد آنلاین / مراسم حضوری) + لینک‌های ثانویه.

import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Icon } from "../../ui/Icon";
import { colors, gradients, radii, shadows, spacing, typography } from "../../ui/theme";

const hubCardStyle: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  display: "grid",
  gap: 10,
  alignContent: "start",
  padding: 18,
  textAlign: "right",
  borderRadius: 22,
  cursor: "pointer",
  fontFamily: typography.fontFamily,
  minHeight: 44,
};

function HubCard({
  icon,
  title,
  description,
  tone,
  onClick,
  ariaLabel,
}: {
  icon: "bell" | "calendar";
  title: string;
  description: string;
  tone: "olive" | "gold";
  onClick: () => void;
  ariaLabel: string;
}) {
  const olive = tone === "olive";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="vodda-tappable vodda-enter"
      style={{
        ...hubCardStyle,
        color: olive ? colors.surface : colors.ink,
        background: olive ? gradients.hero : colors.goldBackground,
        border: `1px solid ${olive ? "transparent" : colors.goldSoft}`,
        boxShadow: olive ? shadows.olive : shadows.sm,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 130,
          height: 130,
          insetInlineEnd: -46,
          top: -52,
          borderRadius: "50%",
          border: `1px solid ${olive ? "rgba(255,255,255,.14)" : "rgba(139,104,31,.18)"}`,
          background: olive ? "rgba(255,255,255,.06)" : "rgba(255,250,240,.75)",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          width: 46,
          height: 46,
          display: "grid",
          placeItems: "center",
          borderRadius: 15,
          color: olive ? colors.surface : colors.goldDark,
          background: olive ? "rgba(255,255,255,.15)" : colors.surface,
          boxShadow: olive ? "none" : shadows.xs,
        }}
      >
        <Icon name={icon} size={23} stroke={2} />
      </span>
      <strong style={{ position: "relative", fontSize: 16.5, fontWeight: 800 }}>{title}</strong>
      <span style={{ position: "relative", fontSize: 12.5, lineHeight: 1.9, opacity: olive ? 0.88 : 0.9, color: olive ? colors.surface : colors.inkSecondary }}>
        {description}
      </span>
      <span
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontSize: 12,
          fontWeight: 800,
          color: olive ? colors.goldSoft : colors.goldDark,
        }}
      >
        ادامه
        <Icon name="chevronL" size={14} stroke={2.2} />
      </span>
    </button>
  );
}

function SecondaryLink({
  icon,
  label,
  onClick,
  ariaLabel,
}: {
  icon: "list" | "users";
  label: string;
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
        borderRadius: radii.lg,
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
          width: 38,
          height: 38,
          display: "grid",
          placeItems: "center",
          flex: "0 0 38px",
          borderRadius: 12,
          background: colors.olive50,
          color: colors.olive700,
        }}
      >
        <Icon name={icon} size={19} />
      </span>
      <strong style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800 }}>{label}</strong>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: spacing.md }}>
        <HubCard
          icon="bell"
          title="استاد آنلاین"
          description="موضوعت را بگو؛ اساتید اعلام آمادگی کنند"
          tone="olive"
          ariaLabel="فراخوان اساتید آنلاین — درخواست زنده استاد"
          onClick={() => navigateApp("/dispatch", config)}
        />
        <HubCard
          icon="calendar"
          title="مراسم حضوری"
          description="مراسمت را برگزار کن؛ قاریان پذیرش کنند"
          tone="gold"
          ariaLabel="فراخوان مراسم حضوری قرآنی"
          onClick={() => navigateApp("/ceremony/new", config)}
        />
      </div>

      <div style={{ display: "grid", gap: spacing.sm }}>
        <SecondaryLink
          icon="list"
          label="فراخوان‌های من"
          ariaLabel="پیگیری فراخوان‌های ثبت‌شدهٔ من"
          onClick={() => navigateApp("/ceremony/calls", config)}
        />
        <SecondaryLink
          icon="users"
          label="قاریان حضوری"
          ariaLabel="فهرست قاریان حضوری و رزرو مستقیم"
          onClick={() => navigateApp("/presence", config)}
        />
      </div>

      <p style={{ margin: 0, fontSize: 11.5, color: colors.inkMuted, lineHeight: 1.9 }}>
        در فراخوان حضوری، قاریان حق‌الزحمهٔ خود را اعلام می‌کنند؛ شما یکی را انتخاب می‌کنید، ودیعه را پرداخت می‌کنید و پس از اجرای مراسم، تسویه تأیید می‌شود.
      </p>
    </div>
  );
}
