/**
 * PageHeader — consistent themed app header: back button, title,
 * subtitle and an optional right-side slot.
 *
 *   <PageHeader
 *     title="Knowledge Vault"
 *     subtitle="120 Nuclear Science Terms"
 *     onBack={() => router.back()}
 *   />
 *
 * Colors come from the feature palette passed via `palette` (or the tab
 * palette by default) — never hardcode hex here.
 */

import React from "react";
import {
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components/ui/icon";
import { PressableIconButton } from "@/components/layout";
import { fontFamilies } from "@/theme";
import { useTheme } from "@/theme/useTheme";
import { useResponsiveLayout } from "@/theme/layout";
import type { Palette } from "@/theme/themes";

export interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    onBack?: () => void;
    /** Optional right-side slot (actions, badges, etc.). */
    right?: React.ReactNode;
    /** Custom content rendered below the title inside the header body. */
    children?: React.ReactNode;
    /** Feature palette for colors (bg, text, textMuted, card, border). */
    palette?: Palette;
    /** Override top padding (defaults to safe-area top + 20). */
    topInset?: number;
    /** Centered title layout with symmetric side spacers. */
    centered?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function PageHeader({
    title,
    subtitle,
    onBack,
    right,
    children,
    palette,
    topInset,
    centered = false,
    style,
}: PageHeaderProps) {
    const { theme } = useTheme();
    const p = palette ?? theme.palettes.tab;
    const insets = useSafeAreaInsets();
    const { contentMaxWidth, gutter } = useResponsiveLayout();
    const paddingTop = topInset ?? insets.top + 20;

    return (
        <View
            style={[
                styles.row,
                {
                    backgroundColor: p.bg,
                    paddingTop,
                    paddingHorizontal: gutter,
                    width: "100%",
                    maxWidth: contentMaxWidth,
                    alignSelf: "center",
                },
                style,
            ]}
        >
            {onBack ? (
                <PressableIconButton
                    accessibilityLabel="Go back"
                    onPress={onBack}
                    visualSize={40}
                    style={[styles.back, { backgroundColor: p.card, borderColor: p.border }]}
                >
                    <Icon name="ArrowLeft2" size={24} color={p.text} variant="Bold" />
                </PressableIconButton>
            ) : null}

            <View style={styles.content}>
                {title ? (
                    <Text
                        style={[styles.title, centered && styles.titleCentered, { color: p.text }]}
                    >
                        {title}
                    </Text>
                ) : null}
                {subtitle ? (
                    <Text
                        style={[styles.subtitle, centered && styles.subtitleCentered, { color: p.textMuted }]}
                    >
                        {subtitle}
                    </Text>
                ) : null}
                {children}
            </View>

            {right ? right : onBack ? <View style={styles.spacer} /> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    back: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 2,
        borderBottomWidth: 4,
    },
    content: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 24,
        lineHeight: 30,
        fontFamily: fontFamilies.heavy,
    },
    titleCentered: {
        textAlign: "center",
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    subtitleCentered: {
        textAlign: "center",
    },
    spacer: {
        width: 40,
    },
});

export default PageHeader;
