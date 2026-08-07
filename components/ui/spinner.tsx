/**
 * Spinner / LoadingState — themed loading indicators.
 */

import React from "react";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";
import type { SemanticColors } from "@/theme/themes";

import { Text } from "./text";

export interface SpinnerProps {
    size?: "small" | "large";
    color?: keyof SemanticColors;
    style?: StyleProp<ViewStyle>;
}

export function Spinner({ size = "small", color = "primary", style }: SpinnerProps) {
    const { theme } = useTheme();
    return <ActivityIndicator size={size} color={theme.colors[color]} style={style} />;
}

export interface LoadingStateProps extends SpinnerProps {
    label?: string;
    fill?: boolean;
}

/** Centered, full-bleed loading state for screens. */
export function LoadingState({
    size = "large",
    color = "primary",
    label,
    fill = true,
    style,
}: LoadingStateProps) {
    const { theme } = useTheme();

    return (
        <View
            style={[
                fill && { flex: 1, backgroundColor: theme.colors.background },
                {
                    alignItems: "center",
                    justifyContent: "center",
                    gap: theme.spacing.md,
                },
                style,
            ]}
        >
            <ActivityIndicator size={size} color={theme.colors[color]} />
            {label ? (
                <Text variant="caption" color="textSecondary">
                    {label}
                </Text>
            ) : null}
        </View>
    );
}

export default Spinner;