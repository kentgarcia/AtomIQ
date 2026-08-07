/**
 * Theme hooks.
 *
 * `useTheme()` is the primary consumer hook — it exposes the full resolved
 * theme object plus color-scheme controls. `useColorScheme()` and
 * `useThemeColors()` are kept for backward compatibility.
 */

import { useThemeContext } from "./ThemeProvider";
import type { SemanticColors, Theme, ThemeMode } from "./themes";

export interface UseThemeResult {
    theme: Theme;
    colorScheme: ThemeMode;
    isDark: boolean;
    toggleTheme: () => Promise<void>;
    setColorScheme: (scheme: ThemeMode) => Promise<void>;
}

export function useTheme(): UseThemeResult {
    return useThemeContext();
}

/** Backward-compatible hook: returns "light" | "dark". */
export function useColorScheme(): ThemeMode {
    const { colorScheme } = useTheme();
    return colorScheme;
}

/** Backward-compatible semantic colors of the active scheme. */
export function useThemeColors(): SemanticColors & Record<string, string> {
    const { theme } = useTheme();
    return theme.colors as SemanticColors & Record<string, string>;
}