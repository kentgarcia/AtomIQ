/**
 * Typography System — centralized font configuration.
 * Using Intern (variable font) for the entire design.
 *
 * This file is a compatibility layer over the design tokens in
 * `@/theme/tokens.ts` — font families, weights and sizes are defined
 * once and re-exposed here with their legacy names.
 */

import { Platform, type TextStyle } from "react-native";

import {
    fontFamily,
    fontFaces as FontFaces,
    fontSizes,
    lineHeights,
    typography,
} from "@/theme/tokens";

// Legacy Typography Styles - predefined text styles for consistent use
// Weights come from the Intern variable font via the design tokens.
export const TypographyStyles: Record<string, TextStyle> = {
  // Headings
  h1: {
    ...FontFaces.heavy,
    fontSize: fontSizes["10xl"],
    lineHeight: lineHeights["9xl"],
    letterSpacing: -1,
  },
  h2: {
    ...FontFaces.bold,
    fontSize: fontSizes["8xl"],
    lineHeight: lineHeights["7xl"],
    letterSpacing: -0.5,
  },
  h3: {
    ...FontFaces.semibold,
    fontSize: fontSizes["6xl"],
    lineHeight: lineHeights["5xl"],
    letterSpacing: 0,
  },
  h4: {
    ...FontFaces.medium,
    fontSize: fontSizes["4xl"],
    lineHeight: lineHeights["4xl"],
    letterSpacing: 0,
  },

  // Body Text
  body: typography.body,
  bodyLarge: typography.bodyLarge,
  bodyMedium: typography.bodyStrong,
  bodyBold: {
    ...FontFaces.bold,
    fontSize: fontSizes.xl,
    lineHeight: lineHeights.xl,
    letterSpacing: 0,
  },

  // Special Cases
  caption: typography.caption,
  button: typography.button,
  label: typography.label,
};

// Legacy Fonts export for backward compatibility
// `Fonts.*` are family names only; pair with `FontFaces`/`fontFaces` for weight.
export const Fonts = {
  heading: fontFamily,
  subheading: fontFamily,
  body: fontFamily,
  bodyMedium: fontFamily,
  bodyBold: fontFamily,
  ...Platform.select({
    ios: {
      sans: fontFamily,
      serif: "ui-serif",
      mono: "ui-monospace",
    },
    default: {
      sans: fontFamily,
      serif: "serif",
      mono: "monospace",
    },
  }),
};