import type { CSSProperties } from "react";

/**
 * Universal App design tokens.
 *
 * These values mirror the existing Vodda web tokens in app/globals.css but live
 * in framework-agnostic TypeScript so both the Next host and the future Vite /
 * Capacitor host can consume the same source without relying on Next global CSS.
 */
export const colors = {
  sand50: "#faf8f2",
  sand100: "#f4f0e7",
  sand150: "#ede8db",
  sand200: "#e4ddcc",
  line: "#e4ddcc",
  surface: "#ffffff",
  surfaceWarm: "#fcfaf4",
  olive900: "#2e3622",
  olive800: "#3c472b",
  olive700: "#4c5a36",
  olive600: "#5e6e43",
  olive500: "#728350",
  olive400: "#93a172",
  olive300: "#b6c09b",
  olive200: "#d6dcc4",
  olive100: "#e8ecdb",
  olive50: "#f2f5ea",
  ink: "#2a2820",
  inkSecondary: "#565247",
  inkMuted: "#8c8675",
  inkFaint: "#aba593",
  gold: "#bf9540",
  goldSoft: "#e7d5a8",
  goldBackground: "#f7efd9",
  clay: "#b0745a",
  clayBackground: "#f6e7df",
  danger: "#a65151",
  info: "#5e7e8c",
} as const;

export const radii = {
  xs: 10,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 30,
  pill: 999,
} as const;

export const shadows = {
  sm: "0 1px 3px rgba(46, 54, 34, 0.05), 0 1px 2px rgba(46, 54, 34, 0.04)",
  md: "0 6px 22px rgba(46, 54, 34, 0.07), 0 2px 6px rgba(46, 54, 34, 0.04)",
  lg: "0 14px 40px rgba(46, 54, 34, 0.1), 0 4px 12px rgba(46, 54, 34, 0.05)",
  olive: "0 10px 28px rgba(76, 90, 54, 0.28)",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const typography = {
  fontFamily: "'Yekan Bakh', 'Vazirmatn', system-ui, sans-serif",
  caption: { fontSize: 12, lineHeight: 1.7 },
  bodySmall: { fontSize: 13, lineHeight: 1.8 },
  body: { fontSize: 14, lineHeight: 1.9 },
  title: { fontSize: 18, lineHeight: 1.6, fontWeight: 700 },
  heading: { fontSize: 24, lineHeight: 1.45, fontWeight: 800 },
} satisfies Record<string, CSSProperties>;

export const appTheme = {
  colors,
  radii,
  shadows,
  spacing,
  typography,
} as const;

export type AppTheme = typeof appTheme;
