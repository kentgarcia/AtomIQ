/**
 * Color system for the app.
 *
 * This is a thin compatibility layer over the design system in `@/theme`.
 * Every value shipped here originates from `theme/tokens.ts`, and screens
 * are gradually migrating to `useTheme()` for direct access.
 *
 * Import TypographyStyles from '@/constants/typography' for typography.
 */

export * from "@/theme";
export { Fonts } from "./typography";