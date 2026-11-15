/**
 * Themes — assembles every color surface from the design tokens.
 *
 * - `semantic` colors are the baseline roles components use (background,
 *   surface, card, text, border, primary, success, ...).
 * - `accents` are per-brand color scales used when a surface should take
 *   the identity of a feature (orange learning, neon lab...). Orange is the
 *   only brand accent; surfaces are the neutral light/dark scale.
 * - `palettes` are the per-feature color maps a screen may theme against.
 *
 * Screens & components consume these through `useTheme()` and must never
 * reference hex literals directly.
 */

import {
    colors,
    durations,
    fontFaces,
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
    surfaceRaised: string;
    surfaceStrong: string;
    surfaceSoft: string;
    card: string;
    input: string;
    primary: string;
    primaryDark: string;
    primaryLight: string;
    /** Opaque soft/selected fill behind orange text (selected cards, chips). */
    primarySurface: string;
    /** Outline for selected cards, chips and focused inputs. */
    primaryBorder: string;
    secondary: string;
    accent: string;
    border: string;
    borderStrong: string;
    borderSubtle: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textFaint: string;
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
    inverseSurface: string;
    inverseText: string;
    switchTrack: string;
    successSurface: string;
    warningSurface: string;
    errorSurface: string;
    infoSurface: string;
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

export type AccentName = "orange" | "amber" | "neon";

const buildAccents = (mode: ThemeMode): Record<AccentName, AccentScale> => {
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
    return { orange, amber, neon };
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
        surfaceRaised: base.surfaceRaised,
        surfaceStrong: base.surfaceStrong,
        surfaceSoft: base.surfaceSoft,
        card: base.surface,
        input: base.input,
        /* Orange is the only brand accent. `primaryLight` is the orange used
           for text/icons on a neutral surface (AA on white / on dark). */
        primary: colors.brand.orange[500],
        primaryDark: colors.brand.orange[600],
        primaryLight: isLight ? colors.brand.orange[600] : colors.brand.orange[400],
        primarySurface: isLight ? colors.brand.orange.surfaceLight : colors.brand.orange.surfaceDark,
        primaryBorder: isLight ? colors.brand.orange[500] : colors.brand.orange[400],
        secondary: base.textMuted,
        accent: colors.brand.orange[500],
        border: base.border,
        borderStrong: base.borderStrong,
        borderSubtle: isLight ? "#F0F0F0" : "#2A383F",
        text: base.text,
        textSecondary: isLight ? "#5C5C5C" : "#C5D2DA",
        textMuted: base.textMuted,
        textFaint: base.textFaint,
        link: isLight ? colors.brand.orange[600] : colors.brand.orange[400],
        success: colors.role.success,
        successDark: colors.role.successDark,
        warning: colors.role.warning,
        warningDark: colors.role.warningDark,
        error: colors.role.error,
        info: colors.role.info,
        gold: colors.role.gold,
        danger: colors.role.danger,
        dangerDark: colors.role.dangerDark,
        disabled: isLight ? "#E5E5E5" : "#2A383F",
        disabledText: isLight ? "#AFAFAF" : "#667985",
        overlay: isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.65)",
        shadow: colors.role.black,
        ring: colors.brand.orange[400],
        tint: colors.brand.orange[500],
        icon: isLight ? "#5C5C5C" : "#C5D2DA",
        tabIconDefault: base.textMuted,
        tabIconSelected: colors.brand.orange[500],
        onPrimary: colors.role.onSurface,
        onSurface: colors.role.onSurface,
        inverseSurface: base.inverseSurface,
        inverseText: base.inverseText,
        switchTrack: isLight ? "#E5E5E5" : "#3C4D57",
        successSurface: isLight ? "rgba(88, 204, 2, 0.12)" : "rgba(88, 204, 2, 0.18)",
        warningSurface: isLight ? "rgba(255, 193, 7, 0.14)" : "rgba(255, 193, 7, 0.2)",
        errorSurface: isLight ? "rgba(239, 68, 68, 0.1)" : "rgba(239, 68, 68, 0.18)",
        infoSurface: isLight ? "rgba(28, 176, 246, 0.1)" : "rgba(28, 176, 246, 0.18)",
        cyan: colors.role.cyan,
        coral: colors.brand.orange[300],
    };
};

const borderFor = (mode: ThemeMode) => colors.base[mode].border;

/* ------------------------------------------------------------------ */
/* Feature palettes (legacy surfaces, now token-sourced)               */
/* ------------------------------------------------------------------ */

/* Tabs, library, encyclopedia entry, AI chat — neutral surfaces, orange accent. */
const tab = (mode: ThemeMode) => ({
    bg: colors.base[mode].background,
    card: colors.base[mode].surface,
    text: colors.base[mode].text,
    textMuted: colors.base[mode].textMuted,
    primary: colors.brand.orange[500],
    border: borderFor(mode),
});

const library = (mode: ThemeMode) => ({
    ...tab(mode),
    primaryDark: colors.brand.orange[600],
    success: colors.role.success,
});

const entry = (mode: ThemeMode) => {
    const isLight = mode === "light";
    return {
        bg: colors.base[mode].background,
        card: colors.base[mode].surface,
        text: colors.base[mode].text,
        textMuted: colors.base[mode].textMuted,
        primary: colors.brand.orange[500],
        primaryDark: colors.brand.orange[600],
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

/* Orange identity — MythBuster. Fully mode-aware. */
const myth = (mode: ThemeMode) => {
    return {
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
        border: colors.base[mode].border,
    };
};

/* Atom Maze — neutral surfaces, orange accent (artwork keeps its own hues). */
const maze = (mode: ThemeMode) => {
    return {
        bg: colors.base[mode].background,
        card: colors.base[mode].surface,
        text: colors.base[mode].text,
        textMuted: colors.base[mode].textMuted,
        primary: colors.brand.orange[500],
        primaryDark: colors.brand.orange[600],
        primaryLight: colors.brand.orange[400],
        success: colors.role.success,
        error: colors.role.error,
        gold: colors.brand.amber[300],
        border: colors.base[mode].border,
    };
};

/* Maze widget palette (player/monster colors are game-neutral). */
const mazeGame = (mode: ThemeMode) => {
    const isLight = mode === "light";
    return {
        bg: colors.base[mode].background,
        card: colors.base[mode].surfaceSoft,
        text: colors.base[mode].text,
        textMuted: colors.base[mode].textMuted,
        primary: colors.brand.orange[500],
        primaryDark: colors.brand.orange[600],
        success: colors.role.success,
        error: colors.role.error,
        warning: colors.role.warning,
        playerColor: colors.role.info,
        monsterColor: colors.role.error,
        border: colors.base[mode].border,
        shadow: isLight ? "rgba(0, 0, 0, 0.1)" : "rgba(0, 0, 0, 0.3)",
    };
};

/* Map — grass terrain, custom by design. */
const map = (mode: ThemeMode) => ({
    bg: mode === "light" ? "#8BC34A" : "#558B2F",
    primary: colors.brand.orange[500],
    locked: colors.base[mode].border,
    text: colors.base[mode].text,
    textMuted: colors.base[mode].textMuted,
    card: colors.base[mode].surface,
});

/* Achievement certificates — mode-aware certificate surfaces. */
const achievement = (mode: ThemeMode) => ({
    bg: colors.base[mode].background,
    card: colors.base[mode].surface,
    border: colors.base[mode].border,
    text: colors.base[mode].text,
    textMuted: colors.base[mode].textMuted,
    primary: colors.brand.orange[500],
    primaryLight: colors.brand.orange[400],
    accent: colors.role.info,
    warning: colors.role.gold,
    secondary: colors.role.danger,
    green: colors.role.success,
});

const onboarding = (mode: ThemeMode) => {
    const isLight = mode === "light";
    const base = colors.base[mode];
    return {
        bg: base.background,
        card: base.surface,
        border: base.border,
        surfaceSoft: base.surfaceSoft,
        surfaceStrong: base.surfaceStrong,
        ringSubtle: base.border,
        iconSurface: base.surfaceSoft,
        iconBorder: base.border,
        buttonBorder: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.14)",
        text: base.text,
        textMuted: base.textMuted,
        primary: colors.brand.orange[500],
        primaryDark: colors.brand.orange[600],
        secondary: colors.role.danger,
        secondaryDark: colors.role.dangerDark,
        accent: colors.brand.orange[400],
        accentDark: colors.brand.orange[500],
        warning: colors.role.warning,
        warningDark: colors.role.warningDark,
    };
};

/* Lab — neon learning identity, now mode-aware. */
const lab = (mode: ThemeMode) => {
    const isLight = mode === "light";
    return {
        bg: colors.base[mode].background,
        card: colors.base[mode].surface,
        text: colors.base[mode].text,
        textMuted: colors.base[mode].textMuted,
        primary: isLight ? colors.brand.neon[600] : colors.brand.neon[500],
        secondary: colors.brand.neon[700],
        accent: isLight ? "#D81B60" : colors.brand.neon.accent,
        success: isLight ? "#059669" : colors.brand.neon[400],
        danger: isLight ? colors.role.dangerDark : colors.brand.neon.accent,
        border: colors.base[mode].border,
        glow: isLight ? colors.brand.neon[600] : colors.brand.neon[500],
    };
};

/* Tab bar chrome (matches the tabs screens). */
const tabBar = (mode: ThemeMode) => ({
    bg: colors.base[mode].background,
    border: borderFor(mode),
    active: colors.brand.orange[500],
    inactive: colors.base[mode].textMuted,
});

/* Shared neutral UI roles used by screen style factories. Never duplicate
   these six values in a component-level light/dark object. */
const ui = (mode: ThemeMode) => {
    const isLight = mode === "light";
    const base = colors.base[mode];
    return {
        background: base.background,
        card: base.surface,
        raised: base.surfaceRaised,
        strong: base.surfaceStrong,
        soft: base.surfaceSoft,
        softBorder: isLight ? "#F0F0F0" : "#2A383F",
        border: base.border,
        borderStrong: base.borderStrong,
        text: base.text,
        textSecondary: isLight ? "#5C5C5C" : "#C5D2DA",
        muted: base.textMuted,
        faint: base.textFaint,
        shadow: mode === "light" ? colors.role.black : "rgba(0, 0, 0, 0.8)",
        overlay: isLight ? "rgba(0, 0, 0, 0.5)" : "rgba(0, 0, 0, 0.65)",
        onAccent: colors.role.onSurface,
    };
};

/* Legacy compat (from constants/theme.ts). */
const legacy = (mode: ThemeMode) => ({
    text: colors.base[mode].text,
    background: colors.base[mode].background,
    tint: colors.brand.orange[500],
    icon: mode === "light" ? "#5C5C5C" : "#C5D2DA",
    tabIconDefault: colors.base[mode].textMuted,
    tabIconSelected: colors.brand.orange[500],
    card: colors.base[mode].surface,
    primary: colors.brand.orange[500],
    primaryDark: colors.brand.orange[600],
    secondary: colors.base[mode].textMuted,
    accent: colors.brand.orange[400],
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
        ui: Palette;
    };
    myth: Palette;
    lab: Palette;
    /* Static design tokens (mode-independent accessors). */
    spacing: typeof spacing;
    radius: typeof radius;
    typography: typeof typography;
    fontFaces: typeof fontFaces;
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
    ...ui(mode),
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
        achievements: { ...achievement(mode), shadow: colors.role.black },
        tabBar: withShadow(mode, tabBar(mode)),
        legacy: withShadow(mode, legacy(mode)),
        ui: withShadow(mode, ui(mode)),
    },
    myth: { ...myth(mode), shadow: colors.role.black },
    lab: { ...lab(mode), shadow: colors.role.black },
    spacing,
    radius,
    typography,
    fontFaces,
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
export const LabPalette = lab("light");
export const AchievementPalette = achievement("light");
export const MythTheme = myth("light");
export const TabBarColors = { light: tabBar("light"), dark: tabBar("dark") };

export const Colors = { light: legacy("light"), dark: legacy("dark") };

export { colors };