/**
 * AtomIQ design system — public API.
 *
 * Import everything the design system exposes from a single barrel:
 *   import { useTheme, createStyles, themes, spacing } from "@/theme";
 */

export { ThemeProvider, ThemeContext } from "./ThemeProvider";
export type { ThemeContextValue } from "./ThemeProvider";

export { useTheme, useColorScheme, useThemeColors } from "./useTheme";
export type { UseThemeResult } from "./useTheme";

export { createStyles } from "./createStyles";

export {
    themes,
    Colors,
    withAlpha,
    TabLight,
    TabDark,
    SettingsLight,
    SettingsDark,
    LibraryLight,
    LibraryDark,
    EntryLight,
    EntryDark,
    LessonLight,
    LessonDark,
    QuizLight,
    QuizDark,
    ArticleLight,
    ArticleDark,
    ExplorerLight,
    ExplorerDark,
    MazeLight,
    MazeDark,
    MazeTheme,
    MazeGamePalette,
    MapLight,
    MapDark,
    OnboardingLight,
    OnboardingDark,
    LabPalette,
    AchievementPalette,
    MythTheme,
} from "./themes";
export type {
    Theme,
    ThemeMode,
    SemanticColors,
    Palette,
    AccentName,
    AccentScale,
} from "./themes";

export {
    colors,
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
} from "./tokens";
export type { Spacing, Radius } from "./tokens";