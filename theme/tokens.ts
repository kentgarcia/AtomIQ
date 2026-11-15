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
    /** Elevated surface above a card (sheets, modals, nested cards). */
    surfaceRaised: "#FFFFFF",
    /** Higher-contrast surface used for inverses and selected panels. */
    surfaceStrong: "#FFFFFF",
    /** Hard-edged separator lines. */
    border: "#E5E7EB",
    /** Stronger outline used for inputs and focused controls. */
    borderStrong: "#D1D5DB",
    /* Strong foreground text. */
    text: "#32325D",
    /* Muted foreground text. */
    textMuted: "#8898AA",
    /* Disabled / de-emphasized foreground text. */
    textFaint: "#9CA3AF",
    /** Lightly tinted fill (soft panels, hover states). */
    surfaceSoft: "#F4F5F7",
    /** Editable field fill. */
    input: "#F9FAFB",
    /** Inverse surface (snackbars, tooltips) and its foreground. */
    inverseSurface: "#1F2937",
    inverseText: "#FFFFFF",
  },
  dark: {
    background: "#172B4D",
    surface: "#213356",
    surfaceRaised: "#26365A",
    surfaceStrong: "#213356",
    border: "#2D3A56",
    borderStrong: "#334A70",
    text: "#F6F9FC",
    textMuted: "#8898AA",
    textFaint: "#667799",
    surfaceSoft: "#1A2D4A",
    input: "#1A2D4A",
    inverseSurface: "#F6F9FC",
    inverseText: "#172B4D",
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

/* Warm brand family used by the home/profile/guide header treatment. */
const warm = {
  light: {
    header: "#FFCA5F",
    headerText: "#724D06",
    chipBorder: "#FFDD8D",
    chipActive: "#FFE0B2",
    cream: "#FFF3E0",
    creamStrong: "#FFE0B2",
    gradientTop: "#FFF3E0",
    gradientBottom: "#FFFFFF",
  },
  dark: {
    header: "#3A2C12",
    headerText: "#FFD98A",
    chipBorder: "#6B5320",
    chipActive: "#4A381B",
    cream: "#4A381B",
    creamStrong: "#5A4620",
    gradientTop: "#172B4D",
    gradientBottom: "#172B4D",
  },
} as const;

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
/* Typography — Intern variable font + size/weight/line-height scale   */
/* ------------------------------------------------------------------ */

/**
 * The single bundled family: `assets/fonts/Intern-Variable.ttf` is a variable
 * font (`wght` 100–900, `opsz` 14–32), loaded once under this name by
 * `hooks/use-app-fonts.ts`. Weight is selected with the `fontWeight` style prop,
 * not by picking a different family name.
 */
export const fontFamily = "Intern" as const;

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

type FontFace = { fontFamily: typeof fontFamily; fontWeight: (typeof fontWeights)[keyof typeof fontWeights] };

/**
 * Ready-to-spread text faces. Always spread the whole face so family and weight
 * stay paired: `{ ...fontFaces.bold, fontSize: 16 }`. Setting only `fontFamily`
 * would render the regular (400) instance.
 */
export const fontFaces = {
  thin: { fontFamily, fontWeight: fontWeights.thin },
  light: { fontFamily, fontWeight: fontWeights.light },
  book: { fontFamily, fontWeight: fontWeights.book },
  regular: { fontFamily, fontWeight: fontWeights.regular },
  medium: { fontFamily, fontWeight: fontWeights.medium },
  semibold: { fontFamily, fontWeight: fontWeights.semibold },
  bold: { fontFamily, fontWeight: fontWeights.bold },
  heavy: { fontFamily, fontWeight: fontWeights.heavy },
  black: { fontFamily, fontWeight: fontWeights.black },
  /* Semantic aliases (legacy names) */
  heading: { fontFamily, fontWeight: fontWeights.bold },
  subheading: { fontFamily, fontWeight: fontWeights.medium },
  body: { fontFamily, fontWeight: fontWeights.book },
  bodyMedium: { fontFamily, fontWeight: fontWeights.medium },
  bodyBold: { fontFamily, fontWeight: fontWeights.bold },
} as const satisfies Record<string, FontFace>;

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
    ...fontFaces.black,
    fontStyle: "normal" as const,
    fontSize: fontSizes["10xl"],
    lineHeight: lineHeights["9xl"],
    letterSpacing: -1,
  },
  hero: {
    ...fontFaces.heavy,
    fontStyle: "normal" as const,
    fontSize: fontSizes["7xl"],
    lineHeight: lineHeights["7xl"],
    letterSpacing: -0.5,
  },
  heading: {
    ...fontFaces.semibold,
    fontStyle: "normal" as const,
    fontSize: fontSizes["6xl"],
    lineHeight: lineHeights["6xl"],
    letterSpacing: 0,
  },
  title: {
    ...fontFaces.heavy,
    fontStyle: "normal" as const,
    fontSize: fontSizes["5xl"],
    lineHeight: lineHeights["6xl"],
    letterSpacing: -0.3,
  },
  subtitle: {
    ...fontFaces.medium,
    fontStyle: "normal" as const,
    fontSize: fontSizes["3xl"],
    lineHeight: lineHeights["4xl"],
    letterSpacing: 0,
  },
  body: {
    ...fontFaces.book,
    fontStyle: "normal" as const,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    letterSpacing: 0,
  },
  bodyStrong: {
    ...fontFaces.medium,
    fontStyle: "normal" as const,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    letterSpacing: 0,
  },
  bodyLarge: {
    ...fontFaces.book,
    fontStyle: "normal" as const,
    fontSize: fontSizes["2xl"],
    lineHeight: lineHeights["2xl"],
    letterSpacing: 0,
  },
  caption: {
    ...fontFaces.book,
    fontStyle: "normal" as const,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    letterSpacing: 0,
  },
  label: {
    ...fontFaces.medium,
    fontStyle: "normal" as const,
    fontSize: fontSizes.lg,
    lineHeight: lineHeights.lg,
    letterSpacing: 0.25,
  },
  micro: {
    ...fontFaces.book,
    fontStyle: "normal" as const,
    fontSize: fontSizes.sm,
    lineHeight: lineHeights.md,
    letterSpacing: 0,
  },
  button: {
    ...fontFaces.semibold,
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
  warm,
} as const;

export const paletteColors = {
  base,
  brand,
  role,
  warm,
} as const;