/**
 * SectionHeader — consistent section title + optional leading icon,
 * subtitle and right-side slot.
 *
 *   <SectionHeader title="Journeys" subtitle="3 interactive paths" />
 *   <SectionHeader icon="Medal" title="Achievements" right={count} />
 *
 * Colors come from the feature palette passed via `palette` (or the tab
 * palette by default) — never hardcode hex here.
 */

import React from "react";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { fontFamilies } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import type { Palette } from "@/theme/themes";

export interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    /** Optional leading icon name (rendered left of the title). */
    icon?: string;
    /** Optional icon color (defaults to the palette text color). */
    iconColor?: string;
    /** Optional title color override (e.g. white text on gradients). */
    titleColor?: string;
    /** Optional right-side slot (counts, actions, etc.). */
    right?: React.ReactNode;
    /** Feature palette for colors (defaults to tab palette). */
    palette?: Palette;
    style?: StyleProp<ViewStyle>;
}

export function SectionHeader({
    title,
    subtitle,
    icon,
    iconColor,
    titleColor,
    right,
    palette,
    style,
}: SectionHeaderProps) {
    const { theme } = useTheme();
    const p = palette ?? theme.palettes.tab;

    return (
        <View style={[styles.row, style]}>
            {icon ? (
                <Icon name={icon} size={24} color={iconColor ?? p.text} variant="Bold" />
            ) : null}
            <View style={styles.content}>
                <Text style={[styles.title, { color: titleColor ?? p.text }]}>{title}</Text>
                {subtitle ? (
                    <Text style={[styles.subtitle, { color: p.textMuted }]}>{subtitle}</Text>
                ) : null}
            </View>
            {right}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginTop: 24,
        marginBottom: 16,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontFamily: fontFamilies.heavy,
    },
    subtitle: {
        fontSize: 13,
        marginTop: 2,
    },
});

export default SectionHeader;