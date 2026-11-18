"use client";

import type { CSSProperties } from "react";
import { colors } from "./theme";

/**
 * موتیف‌های تذهیبی وُدّا — اسلیمی و شمسهٔ هشت‌پر.
 * همهٔ اجزا تزئینی‌اند: aria-hidden و بدون نقش تعاملی؛ فقط هویت بصری می‌سازند.
 * پالت: زیتونی/طلایی — بدون هیچ رنگ دیگری.
 */

export function CornerOrnament({
  size = 132,
  tone = "light",
  style,
}: {
  size?: number;
  /** light = روی کارت‌های تیره (سفید/طلایی کم‌رنگ)؛ olive = روی سطوح روشن */
  tone?: "light" | "olive";
  style?: CSSProperties;
}) {
  const stroke = tone === "light" ? "rgba(255,255,255,.55)" : "rgba(76,90,54,.34)";
  const accent = tone === "light" ? "rgba(231,213,168,.75)" : "rgba(191,149,64,.55)";
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      style={{ position: "absolute", pointerEvents: "none", ...style }}
    >
      {/* قوس اصلی اسلیمی */}
      <path
        d="M4 116 C 4 62, 34 22, 88 6"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* پیچک داخلی */}
      <path
        d="M16 116 C 18 74, 42 40, 84 22 C 62 46, 52 78, 50 116"
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity=".8"
      />
      {/* گلبرگ‌های سه‌تایی */}
      <path d="M34 116 C 36 92, 48 72, 66 60 C 58 84, 52 100, 50 116" stroke={accent} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="66" cy="58" r="2.6" fill={accent} />
      <circle cx="47" cy="92" r="1.8" fill={stroke} />
      <circle cx="70" cy="88" r="1.5" fill={accent} />
      {/* شمسهٔ کوچک هشت‌پر */}
      <g transform="translate(24 96)">
        <path
          d="M0 -9 L2.6 -2.6 L9 0 L2.6 2.6 L0 9 L-2.6 2.6 L-9 0 L-2.6 -2.6 Z"
          fill={accent}
        />
      </g>
    </svg>
  );
}

export function StarOrnament({ size = 14, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill={color} style={{ display: "block" }}>
      <path d="M12 0 L14.8 9.2 L24 12 L14.8 14.8 L12 24 L9.2 14.8 L0 12 L9.2 9.2 Z" />
    </svg>
  );
}

/** جداکنندهٔ تذهیبی: خط — شمسه — خط (جای فضای خالی ساده بین بخش‌ها) */
export function OrnamentDivider({ style }: { style?: CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        ...style,
      }}
    >
      <span style={{ height: 1, width: 64, background: "linear-gradient(to left, transparent, rgba(191,149,64,.55))" }} />
      <StarOrnament size={12} />
      <span style={{ height: 1, width: 64, background: "linear-gradient(to right, transparent, rgba(191,149,64,.55))" }} />
    </div>
  );
}
