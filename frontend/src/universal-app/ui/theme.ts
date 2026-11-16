/**
 * Vodda universal design tokens.
 * Kept framework-neutral so the exact same visual language is shared by
 * the Next host and the Vite/Capacitor wrapper.
 *
 * Dark mode: every color/gradient is a CSS variable (--v-*) so a single
 * `[data-vodda-theme="dark"]` override block (in UniversalVisualStyles)
 * re-themes the whole app instantly — inline styles resolve variables at
 * paint time, so no component re-render is needed. Light values double as
 * fallbacks in case the variable sheet has not loaded yet.
 */
export const colors = {
  sand50: "var(--v-sand50, #faf8f2)",
  sand100: "var(--v-sand100, #f4f0e7)",
  sand150: "var(--v-sand150, #ede8db)",
  sand200: "var(--v-sand200, #e4ddcc)",
  line: "var(--v-line, #e4ddcc)",
  border: "var(--v-border, #e4ddcc)",
  surface: "var(--v-surface, #ffffff)",
  surfaceWarm: "var(--v-surfaceWarm, #fcfaf4)",
  surfaceSoft: "var(--v-surfaceSoft, #f8f6ef)",
  surfaceElevated: "var(--v-surfaceElevated, #ffffff)",
  olive950: "var(--v-olive950, #252c1c)",
  olive900: "var(--v-olive900, #2e3622)",
  olive800: "var(--v-olive800, #3c472b)",
  olive700: "var(--v-olive700, #4c5a36)",
  olive600: "var(--v-olive600, #5e6e43)",
  olive500: "var(--v-olive500, #728350)",
  olive400: "var(--v-olive400, #93a172)",
  olive300: "var(--v-olive300, #b6c09b)",
  olive200: "var(--v-olive200, #d6dcc4)",
  olive100: "var(--v-olive100, #e8ecdb)",
  olive50: "var(--v-olive50, #f2f5ea)",
  ink: "var(--v-ink, #2a2820)",
  inkSecondary: "var(--v-inkSecondary, #565247)",
  /* توکن‌های متن ثانویه برای عبور از حد WCAG AA (۴٫۵:۱) روی سطح سفید/کرم تیره شده‌اند */
  inkMuted: "var(--v-inkMuted, #6f6a5b)",
  inkFaint: "var(--v-inkFaint, #7a7463)",
  gold: "var(--v-gold, #bf9540)",
  goldDark: "var(--v-goldDark, #8b681f)",
  goldSoft: "var(--v-goldSoft, #e7d5a8)",
  goldBackground: "var(--v-goldBackground, #f7efd9)",
  clay: "var(--v-clay, #b0745a)",
  clayBackground: "var(--v-clayBackground, #f6e7df)",
  danger: "var(--v-danger, #a65151)",
  dangerBackground: "var(--v-dangerBackground, #faeeee)",
  success: "var(--v-success, #5e6e43)",
  successBackground: "var(--v-successBackground, #edf2e5)",
  info: "var(--v-info, #5e7e8c)",
  infoBackground: "var(--v-infoBackground, #edf3f5)",
} as const;

export const gradients = {
  hero: "var(--v-grad-hero, linear-gradient(145deg, #4c5a36 0%, #5e6e43 52%, #728350 100%))",
  deep: "var(--v-grad-deep, linear-gradient(145deg, #2e3622 0%, #3c472b 58%, #4c5a36 100%))",
  /* کارت‌های روحانی تیره (کیف پول و…) — شروع روشن‌تر از deep تا گوشه سیاه‌نما نشود */
  oliveCard:
    "var(--v-grad-oliveCard, linear-gradient(150deg, #4c5a36 0%, #5e6e43 55%, #6e7f4d 100%))",
  soft: "var(--v-grad-soft, linear-gradient(145deg, #f2f5ea 0%, #ffffff 72%))",
  gold: "var(--v-grad-gold, linear-gradient(145deg, #f7efd9 0%, #fffaf0 100%))",
  goldRich:
    "var(--v-grad-goldRich, linear-gradient(145deg, #d4ab52 0%, #bf9540 52%, #8b681f 100%))",
} as const;

export const radii = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 30,
  xxl: 36,
  pill: 999,
} as const;

export const shadows = {
  xs: "0 2px 8px rgba(46, 54, 34, 0.045)",
  sm: "0 4px 14px rgba(46, 54, 34, 0.055)",
  md: "0 10px 28px rgba(46, 54, 34, 0.08)",
  lg: "0 18px 46px rgba(46, 54, 34, 0.12)",
  olive: "0 14px 34px rgba(76, 90, 54, 0.28)",
  floating: "0 12px 36px rgba(42, 40, 32, 0.14)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 48,
} as const;

export const typography = {
  // فونت از متغیر CSS خوانده می‌شود تا در حالت انگلیسی بتوان فونت بدون
  // رقوم‌فارسی (FaNum) را جایگزین کرد — appearance.tsx مقدار را ست می‌کند.
  fontFamily: "var(--vodda-font, 'IRANYekanXFaNum', 'Yekan Bakh', 'Vazirmatn', system-ui, sans-serif)",
  caption: { fontSize: 12.5, lineHeight: 1.7 },
  bodySmall: { fontSize: 13, lineHeight: 1.8 },
  body: { fontSize: 14, lineHeight: 1.9 },
  label: { fontSize: 13, lineHeight: 1.6, fontWeight: 700 },
  title: { fontSize: 17, lineHeight: 1.6, fontWeight: 800 },
  sectionTitle: { fontSize: 18, lineHeight: 1.55, fontWeight: 800 },
  heading: { fontSize: 23, lineHeight: 1.5, fontWeight: 900 },
  display: { fontSize: 28, lineHeight: 1.42, fontWeight: 900 },
  number: { fontSize: 30, lineHeight: 1.35, fontWeight: 900 },
};

export const appTheme = {
  colors,
  gradients,
  radii,
  shadows,
  spacing,
  typography,
} as const;

export type AppTheme = typeof appTheme;
