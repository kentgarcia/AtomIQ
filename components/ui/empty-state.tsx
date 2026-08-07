/**
 * EmptyState — placeholder for empty lists/searches.
 */

import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/useTheme";
import type { SemanticColors } from "@/theme/themes";

import { Text } from "./text";

export interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    iconColor?: keyof SemanticColors;
    action?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export function EmptyState({
    icon,
    title,
    description,
    iconColor = "textMuted",
    action,
    style,
}: EmptyStateProps) {
    const { theme } = useTheme();

    return (
        <View
            style={[
                {
                    alignItems: "center",
                    justifyContent: "center",
                    padding: theme.spacing["2xl"],
                    gap: theme.spacing.sm,
                },
                style,
            ]}
        >
            {icon ? (
                <View
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: theme.radius.full,
                        backgroundColor: theme.colors.surfaceSoft,
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: theme.spacing.sm,
                    }}
                >
                    <Icon name={icon} size={28} color={theme.colors[iconColor]} />
                </View>
            ) : null}
            <Text variant="title" align="center">
                {title}
            </Text>
            {description ? (
                <Text variant="body" color="textSecondary" align="center">
                    {description}
                </Text>
            ) : null}
            {action ? <View style={{ marginTop: theme.spacing.md }}>{action}</View> : null}
        </View>
    );
}

export default EmptyState;