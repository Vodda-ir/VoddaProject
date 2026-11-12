/**
 * Vodda universal design tokens.
 * Kept framework-neutral so the exact same visual language is shared by
 * the Next host and the Vite/Capacitor wrapper.
 */
export const colors = {
  sand50: "#faf8f2",
  sand100: "#f4f0e7",
  sand150: "#ede8db",
  sand200: "#e4ddcc",
  line: "#e4ddcc",
  border: "#e4ddcc",
  surface: "#ffffff",
  surfaceWarm: "#fcfaf4",
  surfaceSoft: "#f8f6ef",
  surfaceElevated: "#ffffff",
  olive950: "#252c1c",
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
  goldDark: "#8b681f",
  goldSoft: "#e7d5a8",
  goldBackground: "#f7efd9",
  clay: "#b0745a",
  clayBackground: "#f6e7df",
  danger: "#a65151",
  dangerBackground: "#faeeee",
  success: "#5e6e43",
  successBackground: "#edf2e5",
  info: "#5e7e8c",
  infoBackground: "#edf3f5",
} as const;

export const gradients = {
  hero: "linear-gradient(145deg, #4c5a36 0%, #5e6e43 52%, #728350 100%)",
  deep: "linear-gradient(145deg, #2e3622 0%, #3c472b 58%, #4c5a36 100%)",
  soft: "linear-gradient(145deg, #f2f5ea 0%, #ffffff 72%)",
  gold: "linear-gradient(145deg, #f7efd9 0%, #fffaf0 100%)",
  goldRich: "linear-gradient(145deg, #d4ab52 0%, #bf9540 52%, #8b681f 100%)",
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
  fontFamily: "'IRANYekanXFaNum', 'Yekan Bakh', 'Vazirmatn', system-ui, sans-serif",
  caption: { fontSize: 11.5, lineHeight: 1.7 },
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
