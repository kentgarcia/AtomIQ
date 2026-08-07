/**
 * Card — themed surface container.
 *
 * Variants: elevated | outlined | filled
 */

import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";

export type CardVariant = "elevated" | "outlined" | "filled";

export interface CardProps {
    variant?: CardVariant;
    padding?: number;
    style?: StyleProp<ViewStyle>;
    children: React.ReactNode;
}

export function Card({
    variant = "elevated",
    padding,
    style,
    children,
}: CardProps) {
    const { theme } = useTheme();

    const surfaces: Record<CardVariant, ViewStyle> = {
        elevated: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            ...theme.shadows.md,
            shadowColor: theme.colors.shadow,
            shadowOffset: { width: 0, height: 2 },
        },
        outlined: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.radius.lg,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: theme.colors.border,
        },
        filled: {
            backgroundColor: theme.colors.surfaceSoft,
            borderRadius: theme.radius.lg,
        },
    };

    return (
        <View
            style={[surfaces[variant], { padding: padding ?? theme.spacing.lg }, style]}
        >
            {children}
        </View>
    );
}

export default Card;