/**
 * Design Tokens — the single source of truth for every styling decision.
 *
 * No screen, component, hook or util may hardcode a color, size, radius,
 * shadow, duration or font value. Everything routes through these tokens.
 *
 * Raw values live here (`palette.base`, `palette.brand`, `palette.role`);
 * semantic color roles & feature accents are assembled in `./themes.ts`.
 */

import type { TextStyle } from "react-native";

/* ------------------------------------------------------------------ */
/* Colors: base (light / dark neutral surfaces)                         */
/* ------------------------------------------------------------------ */

const base = {
  light: {
    /** Page-level background (near-white neutral). */
    background: "#FFFFFF",
    /** Card / raised surface. */
    surface: "#FFFFFF",
    /** Hard-edged separator lines. */
    border: "#E5E7EB",
    /* Strong foreground text. */
    text: "#32325D",
    /* Muted foreground text. */
    textMuted: "#8898AA",
    /** Lightly tinted fill (soft panels, hover states). */
    surfaceSoft: "#F4F5F7",
  },
  dark: {
    background: "#172B4D",
    surface: "#213356",
    border: "#2D3A56",
    text: "#F6F9FC",
    textMuted: "#8898AA",
    surfaceSoft: "#1A2D4A",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Colors: brand families                                              */
/* ------------------------------------------------------------------ */

const brand = {
  indigo: {
    300: "#9E87F5",
    400: "#8B9CF0",
    500: "#5E72E4",
    600: "#4C63D2",
    700: "#3B4BB8",
  },
  orange: {
    300: "#FF9F65",
    400: "#FB923C",
    500: "#EA580C",
    600: "#C2410C",
    700: "#9A3412",
  },
  amber: {
    300: "#FFCA28",
    400: "#FFB300",
    500: "#FFA000",
    600: "#FF8F00",
  },
  neon: {
    400: "#06FFA5",
    500: "#00D9FF",
    600: "#00B8D4",
    700: "#7B2CBF",
    accent: "#FF006E",
  },
} as const;

/* ------------------------------------------------------------------ */
/* Colors: semantic roles (shared across light & dark)                 */
/* ------------------------------------------------------------------ */

const role = {
  success: "#2ECC71",
  successDark: "#10B981",
  warning: "#FFC107",
  warningDark: "#FFA000",
  info: "#1CB0F6",
  error: "#EF4444",
  danger: "#FF4B4B",
  dangerDark: "#DC2626",
  gold: "#FFC700",
  cyan: "#4FD1C5",
  red: "#E53935",
  white: "#FFFFFF",
  black: "#000000",
  onSurface: "#FFFFFF",
  purpleDark: "#7C3AED",
} as const;

/* ------------------------------------------------------------------ */
/* Spacing scale                                                       */
/* ------------------------------------------------------------------ */

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

export type Spacing = keyof typeof spacing;

/* ------------------------------------------------------------------ */
/* Border radius                                                       */
/* ------------------------------------------------------------------ */

export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  full: 9999,
} as const;

export type Radius = keyof typeof radius;

/* ------------------------------------------------------------------ */
/* Typography — SNPro family + size/weight/line-height scale           */
/* ------------------------------------------------------------------ */

export const fontFamilies = {
  thin: "SNPro-Thin",
  light: "SNPro-Light",
  book: "SNPro-Book",
  regular: "SNPro-Regular",
  medium: "SNPro-Medium",
  semibold: "SNPro-Semibold",
  bold: "SNPro-Bold",
  heavy: "SNPro-Heavy",
  black: "SNPro-Black",
  /* Semantic aliases (legacy names) */
  heading: "SNPro-Bold",
  subheading: "SNPro-Medium",
  body: "SNPro-Book",
  bodyMedium: "SNPro-Medium",
  bodyBold: "SNPro-Bold",
} as const;

export const fontWeights = {
  thin: "100",
  light: "300",
  book: "400",
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
  black: "900",
} as const;

export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 13,
  lg: 14,
  xl: 16,
  "2xl": 18,
  "3xl": 20,
  "4xl": 22,
  "5xl": 24,
  "6xl": 28,
  "7xl": 32,
  "8xl": 36,
  "9xl": 40,
  "10xl": 48,
} as const;

export const lineHeights = {
  xs: 14,
  sm: 16,
  md: 18,
  lg: 20,
  xl: 24,
  "2xl": 28,
  "3xl": 30,
  "4xl": 32,
  "5xl": 36,
  "6xl": 40,
  "7xl": 44,
  "8xl": 52,
  "9xl": 56,
} as const;

/** Precomposed text roles consumed by <Text> and `typography.*` helpers. */
export const typography = {
  display: {
    fontFamily: fontFamilies.black,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes["10xl"],
    lineHeight: lineHeights["9xl"],
    letterSpacing: -1,
  },
  hero: {
    fontFamily: fontFamilies.heavy,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes["7xl"],
    lineHeight: lineHeights["7xl"],
    letterSpacing: -0.5,
  },
  heading: {
    fontFamily: fontFamilies.semibold,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes["6xl"],
    lineHeight: lineHeights["6xl"],
    letterSpacing: 0,
  },
  title: {
    fontFamily: fontFamilies.heavy,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes["5xl"],
    lineHeight: lineHeights["6xl"],
    letterSpacing: -0.3,
  },
  subtitle: {
    fontFamily: fontFamilies.medium,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes["3xl"],
    lineHeight: lineHeights["4xl"],
    letterSpacing: 0,
  },
  body: {
    fontFamily: fontFamilies.book,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    letterSpacing: 0,
  },
  bodyStrong: {
    fontFamily: fontFamilies.medium,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    letterSpacing: 0,
  },
  bodyLarge: {
    fontFamily: fontFamilies.book,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes["2xl"],
    lineHeight: lineHeights["2xl"],
    letterSpacing: 0,
  },
  caption: {
    fontFamily: fontFamilies.book,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    letterSpacing: 0,
  },
  label: {
    fontFamily: fontFamilies.medium,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    letterSpacing: 0.25,
  },
  micro: {
    fontFamily: fontFamilies.book,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.md,
    letterSpacing: 0,
  },
  button: {
    fontFamily: fontFamilies.semibold,
    fontWeight: "normal" as const,
    fontStyle: "normal" as const,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    letterSpacing: 0.5,
  },
} as const satisfies Record<string, TextStyle>;

/* ------------------------------------------------------------------ */
/* Elevation / shadows                                                 */
/* ------------------------------------------------------------------ */

/* shadowColor is mode-dependent and injected by the theme — see themes.ts. */
export const shadows = {
  none: null,
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    shadowOpacity: 0.08,
    elevation: 1,
  },
  md: {
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    shadowOpacity: 0.16,
    elevation: 6,
  },
  xl: {
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 20,
    shadowOpacity: 0.2,
    elevation: 10,
  },
} as const;

/* ------------------------------------------------------------------ */
/* Opacity                                                             */
/* ------------------------------------------------------------------ */

export const opacity = {
  disabled: 0.4,
  faint: 0.2,
  subtle: 0.08,
  light: 0.3,
  medium: 0.15,
  strong: 0.5,
  overlay: 0.7,
} as const;

/* ------------------------------------------------------------------ */
/* Icon sizes                                                          */
/* ------------------------------------------------------------------ */

export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  "2xl": 32,
  "3xl": 40,
} as const;

/* ------------------------------------------------------------------ */
/* Animation durations                                                 */
/* ------------------------------------------------------------------ */

export const durations = {
  fast: 120,
  normal: 200,
  slow: 300,
  slower: 450,
  page: 600,
} as const;

/* ------------------------------------------------------------------ */
/* Z-index                                                             */
/* ------------------------------------------------------------------ */

export const zIndex = {
  base: 0,
  elevated: 1,
  sticky: 10,
  header: 100,
  overlay: 1000,
  modal: 2000,
} as const;

/* ------------------------------------------------------------------ */
/* Colors: exported raw color surface for palettes / themes            */
/* ------------------------------------------------------------------ */

export const colors = {
  base,
  role,
  brand,
} as const;

export const paletteColors = {
  base,
  brand,
  role,
} as const;