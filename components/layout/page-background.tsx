/**
 * PageBackground — the shared pale-orange page wash used by the continuity
 * screens (Home, Discovery Hub, Guide, Games, Profile).
 *
 * Render it as the first child of a screen's root view. It fills the screen,
 * ignores touches, and fades from a pale orange at the top to the plain page
 * colour at the bottom, with a slightly stronger tint up top.
 */

import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";

import { useTheme, withAlpha } from "@/theme";

export function PageBackground() {
    const { theme } = useTheme();
    const c = theme.colors;
    const isDark = theme.mode === "dark";

    return (
        <>
            <LinearGradient
                pointerEvents="none"
                colors={[c.primarySurface, c.background]}
                locations={[0, 1]}
                style={StyleSheet.absoluteFill}
            />
            <LinearGradient
                pointerEvents="none"
                colors={[
                    withAlpha(c.primary, isDark ? 0.1 : 0.07),
                    withAlpha(c.primary, 0),
                ]}
                locations={[0, 1]}
                style={StyleSheet.absoluteFill}
            />
        </>
    );
}
