/**
 * IconButton — accessible icon-only pressable, themed.
 *
 * Variants: ghost | filled | outlined
 */

import React from "react";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/useTheme";

export interface IconButtonProps {
    icon: string;
    onPress?: () => void;
    variant?: "ghost" | "filled" | "outlined";
    size?: number;
    color?: string;
    disabled?: boolean;
    accessibilityLabel?: string;
    style?: StyleProp<ViewStyle>;
}

export function IconButton({
    icon,
    onPress,
    variant = "ghost",
    size = 24,
    color,
    disabled = false,
    accessibilityLabel,
    style,
}: IconButtonProps) {
    const { theme } = useTheme();

    const dim = size + theme.spacing.lg;
    const borderWidth = variant === "outlined" ? 1 : 0;

    const container: ViewStyle =
        variant === "filled"
            ? { backgroundColor: theme.colors.primary }
            : variant === "outlined"
              ? { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card }
              : {};

    const iconColor =
        variant === "filled" ? theme.colors.onPrimary : color ?? theme.colors.text;

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? `${icon} button`}
            hitSlop={theme.spacing.xs}
            style={({ pressed: isPressed }) => [
                {
                    width: dim,
                    height: dim,
                    borderRadius: dim / 2,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth,
                    opacity: disabled ? theme.opacity.disabled : isPressed ? theme.opacity.strong : 1,
                },
                container,
                style,
            ]}
        >
            <Icon name={icon} size={size} color={iconColor} variant="Bold" />
        </Pressable>
    );
}

export default IconButton;