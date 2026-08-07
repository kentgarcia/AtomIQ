/**
 * Global ThemeProvider.
 *
 * - Seeds from the OS color scheme, then honors a persisted user override.
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
    // Seed from the OS color scheme; a persisted user preference overrides it.
    const systemScheme = useRNColorScheme() ?? "light";
    const [colorScheme, setColorSchemeState] = useState<ThemeMode>(systemScheme);

    useEffect(() => {
        let cancelled = false;
        void getTheme().then((saved) => {
            if (!cancelled && (saved === "light" || saved === "dark")) {
                setColorSchemeState(saved);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const setColorScheme = useCallback(async (scheme: ThemeMode) => {
        setColorSchemeState(scheme);
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