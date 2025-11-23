/**
 * Typography System - Centralized font configuration
 * Using Google Sans Flex - a modern, versatile variable font
 * Change fonts here to update the entire app
 */

import { Platform, TextStyle } from 'react-native';

// Font Family Configuration - Change these to update fonts app-wide
// Poppins for headings and bold fonts
// Google Sans Flex for body text (variable font)
export const FontFamilies = {
  heading: 'Poppins',      // Main headings (H1, H2) - uses fontWeight: '700'
  subheading: 'Poppins',   // Subheadings (H3, H4) - uses fontWeight: '500'
  body: 'GoogleSansFlex',      // Body text - uses fontWeight: '400'
  bodyMedium: 'GoogleSansFlex', // Medium weight body - uses fontWeight: '500'
  bodyBold: 'Poppins',     // Bold body text - uses fontWeight: '700'
};

// Typography Styles - Predefined text styles for consistent use
// Using expo-google-fonts Poppins font names
export const TypographyStyles: Record<string, TextStyle> = {
  // Headings - Use Poppins with specific weight font files from expo-google-fonts
  h1: {
    fontFamily: 'Poppins_800ExtraBold', // 800 weight
    fontSize: 48,
    lineHeight: 56,
    letterSpacing: -1,
  },
  h2: {
    fontFamily: 'Poppins_700Bold', // 700 weight
    fontSize: 36,
    lineHeight: 44,
    letterSpacing: -0.5,
  },
  h3: {
    fontFamily: 'Poppins_600SemiBold', // 600 weight
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: 0,
  },
  h4: {
    fontFamily: 'Poppins_500Medium', // 500 weight
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: 0,
  },
  
  // Body Text - Use Google Sans Flex (variable font)
  body: {
    fontFamily: FontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: '400',
  },
  bodyLarge: {
    fontFamily: FontFamilies.body,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: 0,
    fontWeight: '400',
  },
  bodyMedium: {
    fontFamily: FontFamilies.bodyMedium,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
    fontWeight: '500',
  },
  bodyBold: {
    fontFamily: 'Poppins_700Bold', // 700 weight
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  
  // Special Cases
  caption: {
    fontFamily: FontFamilies.body,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
    fontWeight: '400',
  },
  button: {
    fontFamily: 'Poppins_600SemiBold', // 600 weight for buttons
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  label: {
    fontFamily: 'Poppins_500Medium', // 500 weight
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.25,
  },
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
      serif: 'ui-serif',
      mono: 'ui-monospace',
    },
    default: {
      sans: FontFamilies.body,
      serif: 'serif',
      mono: 'monospace',
    },
  }),
};
