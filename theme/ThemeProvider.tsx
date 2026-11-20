/**
 * Global ThemeProvider.
 *
 * - Light is the default. The OS color scheme is not followed, so a device in
 *   dark mode still starts the app light until the learner picks dark.
 * - The saved choice is read before anything is drawn (the native splash is
 *   still up), so a saved dark theme never flashes light on a cold start.
 * - Context value is stable and memoized.
 * - Use `useTheme()` from `../useTheme` to consume `theme`, `colorScheme`,
 *   `isDark`, `toggleTheme` and `setColorScheme`.
 */

import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { getTheme, setTheme as saveTheme } from "@/services/storage";

import { themes, type Theme, type ThemeMode } from "./themes";

export interface ThemeContextValue {
    theme: Theme;
    colorScheme: ThemeMode;
    isDark: boolean;
    toggleTheme: () => Promise<void>;
    setColorScheme: (scheme: ThemeMode) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
    undefined,
);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [saved, setSaved] = useState<ThemeMode>("light");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        void getTheme()
            .then((value) => {
                if (cancelled) return;
                if (value === "light" || value === "dark") setSaved(value);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoaded(true);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const colorScheme = saved;

    const setColorScheme = useCallback(async (scheme: ThemeMode) => {
        // Update the mounted tree immediately, then persist.
        setSaved(scheme);
        await saveTheme(scheme);
    }, []);

    const toggleTheme = useCallback(async () => {
        await setColorScheme(colorScheme === "light" ? "dark" : "light");
    }, [colorScheme, setColorScheme]);

    const theme = themes[colorScheme];

    const value = useMemo<ThemeContextValue>(
        () => ({
            theme,
            colorScheme,
            isDark: colorScheme === "dark",
            toggleTheme,
            setColorScheme,
        }),
        [theme, colorScheme, toggleTheme, setColorScheme],
    );

    // Draw nothing until the saved choice is known (the splash covers this).
    if (!loaded) return null;

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useThemeContext(): ThemeContextValue {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a <ThemeProvider>");
    }
    return context;
}
