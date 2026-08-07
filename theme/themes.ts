/**
 * Themes — assembles every color surface from the design tokens.
 *
 * - `semantic` colors are the baseline roles components use (background,
 *   surface, card, text, border, primary, success, ...).
 * - `accents` are per-brand color scales used when a surface should take
 *   the identity of a feature (indigo tabs, orange learning, amber maze...).
 * - `palettes` are the per-feature color maps a screen may theme against.
 *
 * Screens & components consume these through `useTheme()` and must never
 * reference hex literals directly.
 */

import {
    colors,
    durations,
    fontFamilies,
    fontSizes,
    fontWeights,
    iconSizes,
    lineHeights,
    opacity,
    radius,
    shadows,
    spacing,
    typography,
    zIndex,
} from "./tokens";

export type ThemeMode = "light" | "dark";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Append an alpha channel to a `#RRGGBB` hex string -> `#RRGGBBAA`. */
export function withAlpha(hex: string, alpha: number): string {
    if (typeof hex !== "string" || !hex.startsWith("#") || hex.length < 7) {
        return hex;
    }
    const base = hex.slice(0, 7);
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, "0");
    return `${base}${a}`;
}

/** Semantic color roles exposed to every screen & component. */
export interface SemanticColors {
    background: string;
    surface: string;
    surfaceSoft: string;
    card: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    secondary: string;
    accent: string;
    border: string;
    borderSubtle: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    link: string;
    success: string;
    successDark: string;
    warning: string;
    warningDark: string;
    error: string;
    info: string;
    gold: string;
    danger: string;
    dangerDark: string;
    disabled: string;
    disabledText: string;
    overlay: string;
    shadow: string;
    ring: string;
    tint: string;
    icon: string;
    tabIconDefault: string;
    tabIconSelected: string;
    onPrimary: string;
    onSurface: string;
    cyan: string;
    coral: string;
}

/* The canonical interface for a resolved app theme. */
export type Palette = Record<string, string>;

/* ------------------------------------------------------------------ */
/* Legacy feature accent maps (screen identity per feature)            */
/* ------------------------------------------------------------------ */

export interface AccentScale {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    onPrimary: string;
}

export type AccentName = "indigo" | "orange" | "amber" | "neon";

const buildAccents = (mode: ThemeMode): Record<AccentName, AccentScale> => {
    const indigo: AccentScale = {
        primary: colors.brand.indigo[500],
        primaryDark: colors.brand.indigo[600],
        primaryLight: colors.brand.indigo[300],
        onPrimary: colors.role.onSurface,
    };
    const orange: AccentScale = {
        primary: colors.brand.orange[500],
        primaryDark: colors.brand.orange[600],
        primaryLight: colors.brand.orange[400],
        onPrimary: colors.role.onSurface,
    };
    const amber: AccentScale = {
        primary: colors.brand.amber[400],
        primaryDark: colors.brand.amber[500],
        primaryLight: colors.brand.amber[300],
        onPrimary: mode === "light" ? colors.role.black : colors.role.onSurface,
    };
    const neon: AccentScale = {
        primary: colors.brand.neon[500],
        primaryDark: colors.brand.neon[600],
        primaryLight: colors.brand.neon[400],
        onPrimary: colors.role.black,
    };
    return { indigo, orange, amber, neon };
};

/* ------------------------------------------------------------------ */
/* Semantic color roles (mode-aware)                                   */
/* ------------------------------------------------------------------ */

const semantic = (mode: ThemeMode): SemanticColors => {
    const isLight = mode === "light";
    const base = colors.base[mode];
    return {
        background: base.background,
        surface: base.surface,
        surfaceSoft: base.surfaceSoft,
        card: base.surface,
        primary: colors.brand.indigo[500],
        primaryDark: colors.brand.indigo[600],
        primaryLight: colors.brand.indigo[300],
        secondary: colors.brand.indigo[600],
        accent: colors.brand.indigo[500],
        border: base.border,
        borderSubtle: isLight ? "#EEF0F6" : "#26365A",
        text: base.text,
        textSecondary: base.textMuted,
        textMuted: base.textMuted,
        link: colors.brand.orange[500],
        success: colors.role.success,
        successDark: colors.role.successDark,
        warning: colors.role.warning,
        warningDark: colors.role.warningDark,
        error: colors.role.error,
        info: colors.role.info,
        gold: colors.role.gold,
        danger: colors.role.danger,
        dangerDark: colors.role.dangerDark,
        disabled: isLight ? "#E0E0E0" : "#334A70",
        disabledText: isLight ? "#9E9E9E" : "#667799",
        overlay: isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.65)",
        shadow: colors.role.black,
        ring: colors.brand.indigo[300],
        tint: colors.brand.indigo[500],
        icon: isLight ? colors.brand.indigo[600] : colors.brand.indigo[300],
        tabIconDefault: "#9E9E9E",
        tabIconSelected: colors.brand.indigo[500],
        onPrimary: colors.role.onSurface,
        onSurface: colors.role.onSurface,
        cyan: colors.role.cyan,
        coral: colors.brand.orange[300],
    };
};

const borderFor = (mode: ThemeMode) => colors.base[mode].border;

/* ------------------------------------------------------------------ */
/* Feature palettes (legacy surfaces, now token-sourced)               */
/* ------------------------------------------------------------------ */

/* Indigo identity — tabs, library, encyclopedia entry, AI chat. */
const tab = (mode: ThemeMode) => ({
    bg: colors.base[mode].background,
    card: colors.base[mode].surface,
    text: colors.base[mode].text,
    textMuted: colors.base[mode].textMuted,
    primary: colors.brand.indigo[500],
    border: borderFor(mode),
});

const library = (mode: ThemeMode) => ({
    ...tab(mode),
    primaryDark: colors.brand.indigo[600],
    success: colors.role.success,
});

const entry = (mode: ThemeMode) => {
    const isLight = mode === "light";
    return {
        bg: colors.base[mode].background,
        card: colors.base[mode].surface,
        text: colors.base[mode].text,
        textMuted: colors.base[mode].textMuted,
        primary: colors.brand.indigo[500],
        primaryDark: colors.brand.indigo[600],
        success: colors.role.success,
        warning: isLight ? "#FFC800" : colors.role.warning,
        info: colors.role.info,
        purple: colors.brand.indigo[300],
        purpleDark: colors.role.purpleDark,
        danger: colors.role.danger,
        dangerDark: colors.role.dangerDark,
        border: borderFor(mode),
    };
};

/* Orange identity — learning, quiz, article, explorer, myth, settings. */
const orangeBase = (mode: ThemeMode) => ({
    bg: colors.base[mode].background,
    card: colors.base[mode].surface,
    text: colors.base[mode].text,
    textMuted: colors.base[mode].textMuted,
    primary: colors.brand.orange[500],
    primaryDark: colors.brand.orange[600],
    primaryLight: colors.brand.orange[400],
    success: colors.role.success,
    error: colors.role.error,
    gold: colors.role.gold,
    border: borderFor(mode),
});

const lesson = (mode: ThemeMode) => orangeBase(mode);

const quiz = (mode: ThemeMode) => ({
    ...orangeBase(mode),
    primaryLight:
        mode === "light" ? "#FF8534" : colors.brand.orange[400],
});

const article = (mode: ThemeMode) => ({
    bg: colors.base[mode].background,
    card: colors.base[mode].surface,
    text: colors.base[mode].text,
    textMuted: mode === "light" ? "#9CA3AF" : colors.base[mode].textMuted,
    primary: colors.brand.orange[500],
    primaryDark: colors.brand.orange[600],
    border: borderFor(mode),
});

const explorer = (mode: ThemeMode) => ({
    ...orangeBase(mode),
    primaryLight: colors.brand.orange[400],
});

/* Single, mode-independent myth surface (orange identity). */
const myth: Palette = {
    bg: "#F7F7F7",
    card: "#FFFFFF",
    text: "#1F2937",
    textMuted: "#9CA3AF",
    primary: colors.brand.orange[500],
    primaryDark: colors.brand.orange[600],
    primaryLight: colors.brand.orange[400],
    success: colors.role.success,
    error: "#E74C3C",
    gold: colors.role.gold,
    border: "#E5E7EB",
};

/* Amber identity — the Atom Maze. */
const maze = (mode: ThemeMode) => {
    const isLight = mode === "light";
    return {
        bg: isLight ? "#FFFFFF" : "#0F172A",
        card: isLight ? "#FFFFFF" : "#1E293B",
        text: "#1F2937",
        textMuted: isLight ? "#6B7280" : "#94A3B8",
        primary: colors.brand.amber[400],
        primaryDark: colors.brand.amber[500],
        primaryLight: colors.brand.amber[300],
        success: colors.role.success,
        error: isLight ? "#E74C3C" : colors.role.error,
        gold: colors.brand.amber[300],
        border: isLight ? "#E5E7EB" : "#334155",
    };
};

/* Maze widget palette (player/monster colors are game-neutral). */
const mazeGame = (mode: ThemeMode) => {
    const isLight = mode === "light";
    return {
        bg: isLight ? "#FFFFFF" : "#0F172A",
        card: isLight ? "#F9FAFB" : "#1E293B",
        text: "#111827",
        textMuted: isLight ? "#6B7280" : "#94A3B8",
        primary: colors.brand.amber[400],
        primaryDark: colors.brand.amber[500],
        success: "#10B981",
        error: colors.role.error,
        warning: "#F59E0B",
        playerColor: colors.role.info,
        monsterColor: colors.role.error,
        border: isLight ? "#E5E7EB" : "#334155",
        shadow: isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.3)",
    };
};

/* Map — grass terrain, custom by design. */
const map = (mode: ThemeMode) => ({
    bg: mode === "light" ? "#8BC34A" : "#558B2F",
    primary: colors.brand.orange[500],
    locked: mode === "light" ? "#E5E7EB" : "#2D3A56",
    text: "#1F2937",
    textMuted: colors.base[mode].textMuted,
    card: colors.base[mode].surface,
});

/* Achievement certificates — light card surfaces. */
const achievement: Palette = {
    bg: "#F4F5F7",
    card: "#FFFFFF",
    border: "#E5E5E5",
    text: "#2D3436",
    textMuted: "#636E72",
    primary: colors.brand.orange[500],
    primaryLight: colors.brand.orange[400],
    accent: colors.role.info,
    warning: colors.role.gold,
    secondary: colors.role.danger,
    green: colors.role.success,
};

const onboarding = (mode: ThemeMode) => {
    const isLight = mode === "light";
    return {
        bg: colors.role.white,
        card: colors.role.white,
        border: "#E5E5E5",
        surfaceSoft: isLight ? "#F9FAFB" : "#1A2D4A",
        surfaceStrong: isLight ? "#FFFFFF" : "#213356",
        ringSubtle: isLight ? "#E5E5E5" : "#334A70",
        iconSurface: isLight ? "#F0F9FF" : "#243A5B",
        iconBorder: isLight ? "#E0F2FE" : "#334A70",
        buttonBorder: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.14)",
        text: "#3C3C3C",
        textMuted: "#777777",
        primary: colors.brand.orange[500],
        primaryDark: colors.brand.orange[600],
        secondary: colors.role.danger,
        secondaryDark: "#D32F2F",
        accent: colors.brand.orange[400],
        accentDark: colors.brand.orange[500],
        warning: colors.role.warning,
        warningDark: colors.role.warningDark,
    };
};

/* Lab — fixed dark neon surface (by design, mode independent). */
const lab: Palette = {
    bg: "#0A0E27",
    card: "#1A1F3A",
    text: "#FFFFFF",
    textMuted: "#8B92B2",
    primary: colors.brand.neon[500],
    secondary: colors.brand.neon[700],
    accent: colors.brand.neon.accent,
    success: colors.brand.neon[400],
    danger: colors.brand.neon.accent,
    border: "#2A2F4A",
    glow: colors.brand.neon[500],
};

/* Tab bar chrome (matches the tabs screens). */
const tabBar = (mode: ThemeMode) => ({
    bg: colors.base[mode].background,
    border: borderFor(mode),
    active: colors.brand.orange[500],
    inactive: colors.base[mode].textMuted,
});

/* Legacy compat (from constants/theme.ts). */
const legacy = (mode: ThemeMode) => ({
    text: colors.base[mode].text,
    background: colors.base[mode].background,
    tint: colors.brand.indigo[500],
    icon: mode === "light" ? colors.brand.indigo[600] : colors.brand.indigo[300],
    tabIconDefault: "#9E9E9E",
    tabIconSelected: colors.brand.indigo[500],
    card: colors.base[mode].surface,
    primary: colors.brand.indigo[500],
    primaryDark: colors.brand.indigo[600],
    secondary: colors.brand.indigo[600],
    accent: colors.brand.indigo[300],
    textSecondary: colors.base[mode].textMuted,
});

/* ------------------------------------------------------------------ */
/* Theme assembly                                                      */
/* ------------------------------------------------------------------ */

export interface Theme {
    mode: ThemeMode;
    colors: SemanticColors;
    accents: Record<AccentName, AccentScale>;
    /** Feature identity palettes (old screen-picking surfaces). */
    palettes: {
        tab: Palette;
        library: Palette;
        entry: Palette;
        lesson: Palette;
        quiz: Palette;
        article: Palette;
        explorer: Palette;
        settings: Palette;
        maze: Palette;
        mazeGame: Palette;
        map: Palette;
        onboarding: Palette;
        achievements: Palette;
        tabBar: Palette;
        legacy: Palette;
    };
    myth: Palette;
    lab: Palette;
    /* Static design tokens (mode-independent accessors). */
    spacing: typeof spacing;
    radius: typeof radius;
    typography: typeof typography;
    fontFamilies: typeof fontFamilies;
    fontWeights: typeof fontWeights;
    fontSizes: typeof fontSizes;
    lineHeights: typeof lineHeights;
    shadows: typeof shadows;
    opacity: typeof opacity;
    iconSizes: typeof iconSizes;
    durations: typeof durations;
    zIndex: typeof zIndex;
}

/** Add mode-aware helper colors to every palette for themed shadows/white. */
const withShadow = (mode: ThemeMode, palette: Palette): Palette => ({
    ...palette,
    shadow: mode === "light" ? colors.role.black : "rgba(0, 0, 0, 0.8)",
    white: colors.role.onSurface,
});

const buildTheme = (mode: ThemeMode): Theme => ({
    mode,
    colors: semantic(mode),
    accents: buildAccents(mode),
    palettes: {
        tab: withShadow(mode, tab(mode)),
        library: withShadow(mode, library(mode)),
        entry: withShadow(mode, entry(mode)),
        lesson: withShadow(mode, lesson(mode)),
        quiz: withShadow(mode, quiz(mode)),
        article: withShadow(mode, article(mode)),
        explorer: withShadow(mode, explorer(mode)),
        settings: withShadow(mode, orangeBase(mode)),
        maze: withShadow(mode, maze(mode)),
        mazeGame: withShadow(mode, mazeGame(mode)),
        map: withShadow(mode, map(mode)),
        onboarding: withShadow(mode, onboarding(mode)),
        achievements: { ...achievement, shadow: colors.role.black },
        tabBar: withShadow(mode, tabBar(mode)),
        legacy: withShadow(mode, legacy(mode)),
    },
    myth: { ...myth, shadow: colors.role.black },
    lab: { ...lab, shadow: colors.role.black },
    spacing,
    radius,
    typography,
    fontFamilies,
    fontWeights,
    fontSizes,
    lineHeights,
    shadows,
    opacity,
    iconSizes,
    durations,
    zIndex,
});

/** The two canonical app themes. */
export const themes: Record<ThemeMode, Theme> = {
    light: buildTheme("light"),
    dark: buildTheme("dark"),
};

/* ------------------------------------------------------------------ */
/* Legacy named exports (back-compat for any untouched consumer)        */
/* ------------------------------------------------------------------ */

export const TabLight = themes.light.palettes.tab;
export const TabDark = themes.dark.palettes.tab;
export const SettingsLight = themes.light.palettes.settings;
export const SettingsDark = themes.dark.palettes.settings;
export const LibraryLight = library("light");
export const LibraryDark = library("dark");
export const EntryLight = entry("light");
export const EntryDark = entry("dark");
export const LessonLight = lesson("light");
export const LessonDark = lesson("dark");
export const QuizLight = quiz("light");
export const QuizDark = quiz("dark");
export const ArticleLight = article("light");
export const ArticleDark = article("dark");
export const ExplorerLight = explorer("light");
export const ExplorerDark = explorer("dark");
export const MazeLight = maze("light");
export const MazeDark = maze("dark");
export const MazeTheme = { light: MazeLight, dark: MazeDark };
export const MazeGamePalette = { light: mazeGame("light"), dark: mazeGame("dark") };
export const MapLight = map("light");
export const MapDark = map("dark");
export const OnboardingLight = onboarding("light");
export const OnboardingDark = onboarding("dark");
export const LabPalette = lab;
export const AchievementPalette = achievement;
export const MythTheme = myth;
export const TabBarColors = { light: tabBar("light"), dark: tabBar("dark") };

export const Colors = { light: legacy("light"), dark: legacy("dark") };

export { colors };