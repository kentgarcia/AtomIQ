/**
 * Badge — small status pill.
 *
 * Variants: primary | secondary | success | warning | error | info | neutral
 */

import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";
import { withAlpha } from "@/theme";
import type { SemanticColors } from "@/theme/themes";

import { Text } from "./text";

export type BadgeVariant = "primary" | "secondary" | "success" | "warning" | "error" | "info" | "neutral";

export interface BadgeProps {
    label: string;
    variant?: BadgeVariant;
    style?: StyleProp<ViewStyle>;
}

const COLOR_KEY: Record<BadgeVariant, keyof SemanticColors> = {
    primary: "primary",
    secondary: "secondary",
    success: "success",
    warning: "warning",
    error: "error",
    info: "info",
    neutral: "textMuted",
};

export function Badge({ label, variant = "primary", style }: BadgeProps) {
    const { theme } = useTheme();
    const color = theme.colors[COLOR_KEY[variant]];

    return (
        <View
            style={[
                {
                    alignSelf: "flex-start",
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: withAlpha(color, 0.14),
                    paddingHorizontal: theme.spacing.sm,
                    paddingVertical: theme.spacing.xxs,
                    borderRadius: theme.radius.full,
                },
                style,
            ]}
        >
            <Text variant="label" color={COLOR_KEY[variant]} style={{ fontSize: theme.fontSizes.sm }}>
                {label}
            </Text>
        </View>
    );
}

export default Badge;