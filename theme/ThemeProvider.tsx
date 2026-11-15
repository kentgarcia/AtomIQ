/**
 * Global ThemeProvider.
 *
 * - Seeds from the OS color scheme and keeps following it while no user
 *   override is saved.
 * - A persisted user override wins over the OS scheme, including after a
 *   cold start.
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
import { useColorScheme as useRNColorScheme } from "react-native";

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
    // The OS scheme is the live fallback; a saved user choice overrides it.
    const systemScheme: ThemeMode =
        useRNColorScheme() === "dark" ? "dark" : "light";
    const [override, setOverride] = useState<ThemeMode | null>(null);

    useEffect(() => {
        let cancelled = false;
        void getTheme().then((saved) => {
            if (cancelled) return;
            if (saved === "light" || saved === "dark") {
                setOverride(saved);
            }
            // A null/missing saved value means "follow the system".
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const colorScheme = override ?? systemScheme;

    const setColorScheme = useCallback(async (scheme: ThemeMode) => {
        // Update the mounted tree immediately, then persist.
        setOverride(scheme);
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
