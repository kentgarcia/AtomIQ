/**
 * Typography System — centralized font configuration.
 * Using SNPro (Sonos Sans Pro) for the entire design.
 *
 * This file is a compatibility layer over the design tokens in
 * `@/theme/tokens.ts` — font families, weights and sizes are defined
 * once and re-exposed here with their legacy names.
 */

import { Platform, type TextStyle } from "react-native";

import {
    fontFamilies as FontFamilies,
    fontSizes,
    lineHeights,
    typography,
} from "@/theme/tokens";

// Legacy Typography Styles - predefined text styles for consistent use
// Using SNPro weight font files, sourced from the design tokens.
export const TypographyStyles: Record<string, TextStyle> = {
  // Headings - Use SNPro with specific weight font files
  h1: {
    fontFamily: FontFamilies.heavy,
    fontSize: fontSizes["10xl"],
    lineHeight: lineHeights["9xl"],
    letterSpacing: -1,
  },
  h2: {
    fontFamily: FontFamilies.bold,
    fontSize: fontSizes["8xl"],
    lineHeight: lineHeights["7xl"],
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: FontFamilies.semibold,
    fontSize: fontSizes["6xl"],
    lineHeight: lineHeights["5xl"],
    letterSpacing: 0,
  },
  h4: {
    fontFamily: FontFamilies.medium,
    fontSize: fontSizes["4xl"],
    lineHeight: lineHeights["4xl"],
    letterSpacing: 0,
  },

  // Body Text - Use SNPro
  body: typography.body,
  bodyLarge: typography.bodyLarge,
  bodyMedium: typography.bodyStrong,
  bodyBold: {
    fontFamily: FontFamilies.bold,
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
export const Fonts = {
  heading: FontFamilies.heading,
  subheading: FontFamilies.subheading,
  body: FontFamilies.body,
  bodyMedium: FontFamilies.bodyMedium,
  bodyBold: FontFamilies.bodyBold,
  ...Platform.select({
    ios: {
      sans: FontFamilies.body,
      serif: "ui-serif",
      mono: "ui-monospace",
    },
    default: {
      sans: FontFamilies.body,
      serif: "serif",
      mono: "monospace",
    },
  }),
};