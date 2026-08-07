/**
 * Backward-compatible bridge to the design-system theme.
 *
 * The canonical ThemeProvider / hooks live in `@/theme`. This file is kept
 * so existing imports keep working while screens migrate.
 */

export { ThemeProvider, ThemeContext } from "@/theme/ThemeProvider";
export { useTheme, useColorScheme } from "@/theme/useTheme";
export type { UseThemeResult } from "@/theme/useTheme";