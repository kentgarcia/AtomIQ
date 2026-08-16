/**
 * Button — variant-driven pressable with themed colors.
 *
 * Variants: primary | secondary | outline | ghost | danger | success
 * Sizes:    sm | md | lg
 *
 *   <Button variant="primary" onPress={go} title="Continue" />
 *   <Button variant="outline" icon="Sun1" title="Toggle" />
 */

import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/useTheme";
import { withAlpha } from "@/theme";
import type { AccentName } from "@/theme/themes";

import { Text } from "./text";

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
    title: string;
    onPress?: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Feature accent override — e.g. "orange" flips a primary button to branding orange. */
    accent?: AccentName;
    icon?: string;
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
    accessibilityLabel?: string;
}

const SIZE_HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 46, lg: 54 };
const SIZE_PADDING: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };
const SIZE_FONT: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 17 };

export function Button({
    title,
    onPress,
    variant = "primary",
    size = "md",
    accent,
    icon,
    loading = false,
    disabled = false,
    fullWidth = false,
    style,
    accessibilityLabel,
}: ButtonProps) {
    const { theme } = useTheme();

    const { base, palette, textColors } = useMemo(() => {
        const accentScale = accent ? theme.accents[accent] : undefined;
        const primary = accentScale?.primary ?? theme.colors.primary;
        const onPrimary = accentScale?.onPrimary ?? theme.colors.onPrimary;

        const baseStyle: ViewStyle = {
            alignSelf: fullWidth ? "stretch" : "flex-start",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: theme.spacing.sm,
            height: SIZE_HEIGHT[size],
            paddingHorizontal: SIZE_PADDING[size],
            borderRadius: theme.radius.md,
        };

        const paletteStyles: Record<ButtonVariant, ViewStyle> = {
            primary: { backgroundColor: primary },
            secondary: { backgroundColor: withAlpha(primary, 0.14) },
            outline: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: primary },
            ghost: { backgroundColor: "transparent" },
            danger: { backgroundColor: theme.colors.error },
            success: { backgroundColor: theme.colors.success },
        };

        const textColor: Record<ButtonVariant, string> = {
            primary: onPrimary,
            secondary: primary,
            outline: primary,
            ghost: primary,
            danger: theme.colors.onSurface,
            success: "#06381F",
        };

        return {
            base: StyleSheet.create({ base: baseStyle, disabledBase: { backgroundColor: theme.colors.disabled } }),
            palette: paletteStyles,
            textColors: textColor,
        };
    }, [theme, size, accent, fullWidth]);

    if (disabled || loading) {
        return (
            <Pressable
                disabled
                accessibilityRole="button"
                accessibilityLabel={accessibilityLabel ?? title}
                style={[base.base, base.disabledBase, style]}
            >
                {loading ? (
                    <ActivityIndicator color={theme.colors.disabledText} size={SIZE_FONT[size]} />
                ) : (
                    <Text
                        variant="button"
                        style={[{ fontSize: SIZE_FONT[size] }, { color: theme.colors.disabledText }]}
                    >
                        {title}
                    </Text>
                )}
            </Pressable>
        );
    }

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            style={({ pressed: isPressed }: { pressed: boolean }) => [
                base.base,
                palette[variant],
                isPressed && { opacity: theme.opacity.strong },
                style,
            ]}
        >
            {icon ? <Icon name={icon} size={20} color={textColors[variant]} /> : null}
            <Text
                variant="button"
                style={{ fontSize: SIZE_FONT[size], color: textColors[variant] }}
            >
                {title}
            </Text>
        </Pressable>
    );
}

export default Button;