"use client";

import type { CSSProperties } from "react";
import { colors } from "./theme";

/**
 * تصویرسازی‌های خطی اختصاصی وُدّا (فاز ۲) — سبک: خط پیوستهٔ مینیمال با
 * پالت برند (زیتونی/طلایی/کرم) و هالهٔ نور ملایم پشت صحنه.
 * همه تزئینی‌اند: aria-hidden؛ پیام توسط تیتر و توضیح StateView منتقل می‌شود.
 */

function Scene({ children, size = 176, style }: { children: React.ReactNode; size?: number; style?: CSSProperties }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 200 140"
      width={size}
      height={Math.round((size * 140) / 200)}
      fill="none"
      style={{ display: "block", margin: "0 auto", ...style }}
    >
      {/* هالهٔ نور طلایی پشت صحنه */}
      <ellipse cx="100" cy="74" rx="72" ry="52" fill="url(#illusGlow)" />
      <defs>
        <radialGradient id="illusGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={colors.goldBackground} stopOpacity=".9" />
          <stop offset="100%" stopColor={colors.goldBackground} stopOpacity="0" />
        </radialGradient>
      </defs>
      {children}
    </svg>
  );
}

/* ستون‌های تصویرسازی متغیر CSS هستند تا در حالت تاریک خودکار بازرنگ شوند؛
   مقدارهای روشن به‌عنوان fallback نوشته شده‌اند. */
const ink = "var(--v-ill-ink, #5e6e43)";
const inkSoft = "var(--v-ill-inkSoft, rgba(94,110,67,.45))";
const gold = "var(--v-ill-gold, #bf9540)";
const goldSoft = "var(--v-ill-goldSoft, #e7d5a8)";
/* کاغذ/متن کتاب و لوح — در تاریک به کاغذِ تیرهٔ گرم تبدیل می‌شود */
const paper = "var(--v-ill-paper, #ffffff)";

/** قرآنِ باز زیر گنبد و ستاره — برای حالت خالی جلسات */
export function IllustrationSessions({ size = 190 }: { size?: number }) {
  return (
    <Scene size={size}>
      {/* محراب/گنبد پشت کتاب */}
      <path
        d="M62 74 C 62 50, 76 38, 100 34 C 124 38, 138 50, 138 74"
        fill="none"
        stroke={inkSoft}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M56 74 L 144 74" stroke={inkSoft} strokeWidth="1.4" strokeLinecap="round" opacity=".7" />
      {/* ستارهٔ هشت‌پر بالای گنبد */}
      <path d="M100 16 L102.6 22.4 L109 25 L102.6 27.6 L100 34 L97.4 27.6 L91 25 L97.4 22.4 Z" fill={gold} opacity=".9" />
      <circle cx="66" cy="36" r="2" fill={goldSoft} />
      <circle cx="136" cy="44" r="1.6" fill={goldSoft} />
      {/* کتاب باز */}
      <path
        d="M40 92 C 58 80, 86 80, 100 92 C 114 80, 142 80, 160 92 L 160 118 C 142 106, 114 106, 100 118 C 86 106, 58 106, 40 118 Z"
        fill={paper}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M100 92 L100 118" stroke={ink} strokeWidth="2" strokeLinecap="round" />
      {/* خطوط صفحه‌ها */}
      <path d="M52 94 C 64 88, 78 87, 90 92 M52 102 C 64 96, 78 95, 90 100" stroke={inkSoft} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M110 92 C 122 87, 136 88, 148 94 M110 100 C 122 95, 136 96, 148 102" stroke={inkSoft} strokeWidth="1.4" strokeLinecap="round" />
      {/* تذهیب طلایی بالای کتاب */}
      <path d="M88 84 L100 76 L112 84" stroke={gold} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </Scene>
  );
}

/** کیف پول با سکهٔ طلایی — برای حالت خالی تراکنش‌ها */
export function IllustrationWallet({ size = 190 }: { size?: number }) {
  return (
    <Scene size={size}>
      {/* بدنهٔ کیف */}
      <rect x="48" y="62" width="104" height="56" rx="14" fill={paper} stroke={ink} strokeWidth="2" />
      <path d="M48 80 L 140 80" stroke={inkSoft} strokeWidth="1.4" />
      {/* درزِ بست */}
      <path d="M136 84 L 152 84 C 158 84, 162 88, 162 94 C 162 100, 158 104, 152 104 L 136 104" fill={paper} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="146" cy="94" r="4.6" fill={gold} />
      {/* سکه‌های طلایی */}
      <circle cx="88" cy="52" r="13" fill={goldSoft} stroke={gold} strokeWidth="2" />
      <path d="M88 45 L89.6 49.4 L94 51 L89.6 52.6 L88 57 L86.4 52.6 L82 51 L86.4 49.4 Z" fill={gold} />
      <circle cx="118" cy="44" r="8" fill={goldSoft} stroke={gold} strokeWidth="1.6" />
      {/* خطوط حرکت */}
      <path d="M60 46 C 64 42, 70 40, 76 40" stroke={inkSoft} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M56 54 C 58 51, 61 49, 64 48" stroke={inkSoft} strokeWidth="1.2" strokeLinecap="round" />
    </Scene>
  );
}

/** بلندگوی فراخوان با موج و شمسه — برای حالت خالی فراخوان‌ها */
export function IllustrationDispatch({ size = 190 }: { size?: number }) {
  return (
    <Scene size={size}>
      {/* بدنهٔ بلندگو */}
      <path
        d="M62 74 L 96 74 L 130 50 L 130 102 L 96 78 L 62 78 C 57 78, 54 76, 54 76 C 54 76, 57 74, 62 74 Z"
        fill={paper}
        stroke={ink}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="70" y="92" width="12" height="20" rx="5" fill={goldSoft} stroke={ink} strokeWidth="1.8" />
      {/* امواج صدا */}
      <path d="M142 58 C 150 64, 150 88, 142 94" stroke={gold} strokeWidth="2" strokeLinecap="round" />
      <path d="M152 48 C 164 58, 164 94, 152 104" stroke={gold} strokeWidth="1.8" strokeLinecap="round" opacity=".7" />
      <path d="M162 40 C 178 54, 178 98, 162 112" stroke={gold} strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
      {/* شمسهٔ هشت‌پر */}
      <path
        d="M78 30 L80.8 37.2 L88 40 L80.8 42.8 L78 50 L75.2 42.8 L68 40 L75.2 37.2 Z"
        fill={gold}
        opacity=".9"
      />
      <circle cx="110" cy="34" r="2.2" fill={goldSoft} />
      <circle cx="52" cy="58" r="1.8" fill={goldSoft} />
    </Scene>
  );
}

/** قلم نی و دوات — برای پروفایل ناقص و فرم‌های خالی */
export function IllustrationQalam({ size = 190 }: { size?: number }) {
  return (
    <Scene size={size}>
      {/* دوات */}
      <path d="M128 96 C 128 88, 136 84, 144 84 C 152 84, 160 88, 160 96 L 156 118 L 132 118 Z" fill={paper} stroke={ink} strokeWidth="2" strokeLinejoin="round" />
      {/* قلم نی */}
      <path d="M44 108 L 108 66 L 118 58 C 122 55, 126 59, 123 63 L 115 73 L 52 116 C 48 118, 42 114, 44 108 Z" fill={goldSoft} stroke={gold} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M108 66 L 115 73" stroke={gold} strokeWidth="1.4" />
      {/* جوهر */}
      <circle cx="144" cy="102" r="6" fill={gold} opacity=".8" />
      {/* خط تحریر */}
      <path d="M52 128 C 70 122, 88 122, 104 128" stroke={inkSoft} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M114 128 C 118 126, 122 126, 126 128" stroke={gold} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="70" cy="44" r="2" fill={goldSoft} />
      <circle cx="96" cy="34" r="1.6" fill={goldSoft} />
    </Scene>
  );
}
