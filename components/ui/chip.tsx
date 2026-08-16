/**
 * Chip — selectable pill for filters/tags.
 */

import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/useTheme";
import { withAlpha } from "@/theme";
import type { AccentName } from "@/theme/themes";

import { Text } from "./text";

export interface ChipProps {
    label: string;
    selected?: boolean;
    onPress?: () => void;
    icon?: string;
    accent?: AccentName;
    style?: StyleProp<ViewStyle>;
}

export function Chip({
    label,
    selected = false,
    onPress,
    icon,
    accent,
    style,
}: ChipProps) {
    const { theme } = useTheme();
    const primary = accent ? theme.accents[accent].primary : theme.colors.primary;

    const containerStyle: ViewStyle = selected
        ? { backgroundColor: withAlpha(primary, 0.16), borderColor: primary }
        : { backgroundColor: theme.colors.card, borderColor: theme.colors.border };

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed: isPressed }) => [
                {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: theme.spacing.xs,
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: theme.spacing.sm,
                    borderRadius: theme.radius.full,
                    borderWidth: 1,
                    opacity: isPressed ? theme.opacity.strong : 1,
                },
                containerStyle,
                style,
            ]}
        >
            {icon ? (
                <Icon name={icon} size={theme.iconSizes.sm} color={selected ? primary : theme.colors.textMuted} />
            ) : null}
            <Text
                variant="label"
                color={selected ? "primary" : "textSecondary"}
                style={selected ? { color: primary } : undefined}
            >
                {label}
            </Text>
        </Pressable>
    );
}

export default Chip;