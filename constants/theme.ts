/**
 * Color system for the app
 * Import TypographyStyles from '@/constants/typography' for typography
 */

const primary = '#6721E3'; // Purple
const primaryDark = '#3C007C'; // Darker purple
const white = '#FFFFFF';

export const Colors = {
  light: {
    text: '#1A1A1A', // Near black for readability
    background: white,
    tint: primary,
    icon: primaryDark,
    tabIconDefault: '#9E9E9E',
    tabIconSelected: primary,
    card: white,
    primary: primary,
    primaryDark: primaryDark,
    secondary: primaryDark, // Use darker purple for secondary
    accent: '#8B5CF6', // Lighter purple variant for accents
    textSecondary: '#666666', // Gray for secondary text
  },
  dark: {
    text: white,
    background: '#0D0D0D',
    tint: primary,
    icon: '#B388FF',
    tabIconDefault: '#9E9E9E',
    tabIconSelected: primary,
    card: '#1A1A1A',
    primary: primary,
    primaryDark: primaryDark,
    secondary: primaryDark,
    accent: '#8B5CF6',
    textSecondary: '#B0B0B0',
  },
};

// Re-export Fonts for backward compatibility
export { Fonts } from './typography';
