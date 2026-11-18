"use client";

// دو کارت گرافیکی «فراخوان» — مسیرهای اصلی هاب فراخوان و خانه:
//   ۱) فراخوان استاد آنلاین (زیتونی عمیق، موتیف رادار)
//   ۲) فراخوان مراسم حضوری (طلایی غنی، موتیف هندسی اسلامی)
// کارت‌ها همه‌جا مشترک‌اند (خانه + هاب فراخوان) تا زبان بصری یکدست بماند.

import type { CSSProperties } from "react";
import type { UniversalAppConfig } from "../../config";
import { navigateApp } from "../../router";
import { Icon } from "../../ui/Icon";
import { CornerOrnament } from "../../ui/ornaments";
import { colors, gradients, shadows, spacing, typography } from "../../ui/theme";
import { useAppearance } from "../../ui/appearance";

/** ستارهٔ هشت‌پر — موتیف هندسی اسلامی به‌صورت الگوی تکرارشونده و بسیار کم‌رنگ. */
function starPoints(cx: number, cy: number, outer: number, inner: number): string {
  const vertices: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const radius = i % 2 === 0 ? outer : inner;
    vertices.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return vertices.join(" ");
}

function GeometricPattern({ light }: { light: boolean }) {
  const stroke = light ? "rgba(255,255,255,.16)" : "rgba(139,104,31,.14)";
  return (
    <svg aria-hidden="true" width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.9 }}>
      <defs>
        <pattern id="vodda-star-lattice" width="56" height="56" patternUnits="userSpaceOnUse">
          <polygon points={starPoints(28, 28, 16, 9.8)} fill="none" stroke={stroke} strokeWidth="1" />
          <polygon points={starPoints(0, 0, 16, 9.8)} fill="none" stroke={stroke} strokeWidth="1" />
          <polygon points={starPoints(56, 0, 16, 9.8)} fill="none" stroke={stroke} strokeWidth="1" />
          <polygon points={starPoints(0, 56, 16, 9.8)} fill="none" stroke={stroke} strokeWidth="1" />
          <polygon points={starPoints(56, 56, 16, 9.8)} fill="none" stroke={stroke} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#vodda-star-lattice)" />
    </svg>
  );
}

function RadarRings() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" width="200" height="200" style={{ position: "absolute", insetInlineEnd: -34, top: -34, opacity: 0.5 }}>
      {[86, 66, 46].map((radius) => (
        <circle key={radius} cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1.2" />
      ))}
      <circle cx="100" cy="100" r="5" fill="rgba(212,171,82,.55)" />
    </svg>
  );
}

type PairCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  ctaLabel: string;
  ariaLabel: string;
  onClick: () => void;
  tone: "olive" | "gold";
  icon: "bell" | "calendar";
  live?: boolean;
};

const cardBase: CSSProperties = {
  position: "relative",
  overflow: "hidden",
  display: "grid",
  alignContent: "space-between",
  gap: 12,
  minHeight: 196,
  padding: "18px 18px 16px",
  textAlign: "right",
  borderRadius: 26,
  cursor: "pointer",
  fontFamily: typography.fontFamily,
  border: 0,
  width: "100%",
};

function PairCard({ eyebrow, title, description, ctaLabel, ariaLabel, onClick, tone, icon, live }: PairCardProps) {
  const { L } = useAppearance();
  const olive = tone === "olive";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="vodda-tappable vodda-enter"
      style={{
        ...cardBase,
        color: colors.onOlive,
        background: olive
          ? "linear-gradient(150deg, #252c1c 0%, #3c472b 62%, #4c5a36 100%)"
          : gradients.goldRich,
        boxShadow: olive ? shadows.olive : "0 16px 38px rgba(139,104,31,.3)",
      }}
    >
      <GeometricPattern light={olive} />
      {/* تذهیب گوشه‌ای روی کارت‌های فراخوان — هم‌خانوادهٔ هویت قرآنی (فاز ۲) */}
      <CornerOrnament tone="light" size={124} style={{ insetInlineStart: -34, bottom: -38, transform: "rotate(180deg)", opacity: 0.75 }} />
      {olive ? <RadarRings /> : (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 170,
            height: 170,
            insetInlineEnd: -54,
            top: -62,
            borderRadius: "50%",
            background: "rgba(255,250,240,.16)",
          }}
        />
      )}
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 96,
          height: 96,
          insetInlineStart: -34,
          bottom: -40,
          borderRadius: "50%",
          border: `1.2px solid ${olive ? "rgba(212,171,82,.28)" : "rgba(255,250,240,.28)"}`,
        }}
      />

      <span style={{ position: "relative", display: "grid", gap: 12 }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span
            aria-hidden="true"
            style={{
              width: 46,
              height: 46,
              display: "grid",
              placeItems: "center",
              borderRadius: 16,
              color: olive ? "#e7d5a8" : colors.onOlive,
              background: olive ? "rgba(212,171,82,.18)" : "rgba(255,255,255,.18)",
              border: `1px solid ${olive ? "rgba(212,171,82,.34)" : "rgba(255,255,255,.28)"}`,
            }}
          >
            <Icon name={icon} size={23} stroke={1.9} />
          </span>
          {live ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 800,
                color: colors.onOlive,
                background: "rgba(255,255,255,.14)",
                border: "1px solid rgba(255,255,255,.22)",
              }}
            >
              <span
                aria-hidden="true"
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#e8c15c", animation: "vodda-live-dot 1.6s ease-out infinite" }}
              />
              {L("پاسخ زنده")}
            </span>
          ) : (
            <span
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 10.5,
                fontWeight: 800,
                color: olive ? "#e7d5a8" : "#fdf6e3",
                background: olive ? "rgba(212,171,82,.16)" : "rgba(255,255,255,.14)",
                border: `1px solid ${olive ? "rgba(212,171,82,.3)" : "rgba(255,255,255,.24)"}`,
              }}
            >
              {L("ودیعهٔ امن")}
            </span>
          )}
        </span>

        <span style={{ display: "grid", gap: 5 }}>
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.2, color: olive ? "#e7d5a8" : "#f6e9c8" }}>
            {L(eyebrow)}
          </span>
          <strong style={{ fontSize: 17.5, fontWeight: 900, lineHeight: 1.5 }}>{L(title)}</strong>
          <span style={{ fontSize: 12, lineHeight: 1.9, opacity: 0.9 }}>{L(description)}</span>
        </span>
      </span>

      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "10px 13px",
          borderRadius: 15,
          background: olive ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.16)",
          border: `1px solid ${olive ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.22)"}`,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 900, color: olive ? "#e7d5a8" : colors.onOlive }}>
          {L(ctaLabel)}
          <Icon name="chevronL" size={15} stroke={2.4} />
        </span>
        <Icon name="mic" size={16} stroke={1.8} style={{ opacity: 0.75 }} />
      </span>
    </button>
  );
}

export function DispatchPairCards({ config }: { config: UniversalAppConfig }) {
  const { L } = useAppearance();
  return (
    <div
      className="vodda-enter"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(236px, 1fr))",
        gap: spacing.md,
      }}
    >
      <PairCard
        tone="olive"
        icon="bell"
        live
        eyebrow={L("فراخوان آنلاین")}
        title={L("استاد آنلاین برای یادگیری")}
        description={L("موضوع درسی‌تان را اعلام کنید؛ اساتید آمادگی خود را ثبت می‌کنند و شما بهترین را انتخاب می‌کنید.")}
        ctaLabel={L("شروع فراخوان")}
        ariaLabel={L("فراخوان اساتید آنلاین — درخواست زنده استاد")}
        onClick={() => navigateApp("/dispatch", config)}
      />
      <PairCard
        tone="gold"
        icon="calendar"
        eyebrow={L("مراسم حضوری")}
        title={L("قاری مراسم قرآنی")}
        description={L("تلاوت، ختم و جشن قرآنی؛ فراخوان بگذارید یا از قاریان تأییدشده رزرو مستقیم دریافت کنید.")}
        ctaLabel={L("ثبت فراخوان مراسم")}
        ariaLabel={L("فراخوان مراسم حضوری قرآنی و رزرو قاری")}
        onClick={() => navigateApp("/ceremony/new", config)}
      />
    </div>
  );
}
