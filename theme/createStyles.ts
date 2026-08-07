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

import { StyleSheet } from "react-native";

import type { Theme } from "./themes";

export type StyleFn<TStyles> = (theme: Theme) => TStyles;
export type NamedStyles<T> = StyleSheet.NamedStyles<T>;

export function createStyles<TStyles extends Record<string, unknown>>(
    factory: StyleFn<TStyles>,
): (theme: Theme) => StyleSheet.NamedStyles<TStyles> {
    return (theme: Theme) => {
        const styles = factory(theme);
        return StyleSheet.create(styles as StyleSheet.NamedStyles<TStyles>);
    };
}

/** Resolve `theme.spacing` quickly inside factories. */
export { spacing as spacingToken } from "./tokens";