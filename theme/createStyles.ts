/**
 * Dynamic styling factory.
 *
 * Usage:
 *   const makeStyles = createStyles((theme) => ({
 *     container: { backgroundColor: theme.colors.background },
 *   }));
 *   // inside a component:
 *   const { theme } = useTheme();
 *   const styles = useMemo(() => makeStyles(theme), [theme]);
 *
 * Every style returned by this helper is theme-dependent — no static
 * StyleSheet.create survives in screens.
 */

import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from "react-native";

import type { Theme } from "./themes";

export type StyleFn<TStyles> = (theme: Theme) => TStyles;
export type NamedStyles<T> = {
    [P in keyof T]: ViewStyle | TextStyle | ImageStyle;
};

export function createStyles<TStyles extends NamedStyles<TStyles>>(
    factory: StyleFn<TStyles>,
): (theme: Theme) => TStyles {
    // One stylesheet per theme object, shared by every component using this
    // factory (a list of 100 rows used to build 100 identical stylesheets).
    const cache = new WeakMap<Theme, TStyles>();
    return (theme: Theme) => {
        let styles = cache.get(theme);
        if (!styles) {
            styles = StyleSheet.create(factory(theme));
            cache.set(theme, styles);
        }
        return styles;
    };
}

/** Resolve `theme.spacing` quickly inside factories. */
export { spacing as spacingToken } from "./tokens";