/**
 * Text — themed, variant-driven typography.
 *
 *   <Text variant="heading" color="primary">Hello</Text>
 *   <Text variant="caption" color="textSecondary">meta</Text>
 *
 * Colors come from the active theme's semantic roles — never hardcode hex.
 */

import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useTheme } from "@/theme/useTheme";
import type { SemanticColors } from "@/theme/themes";

export type TextVariant =
    | "display"
    | "hero"
    | "heading"
    | "title"
    | "subtitle"
    | "body"
    | "bodyStrong"
    | "bodyLarge"
    | "caption"
    | "label"
    | "micro"
    | "button";

export type TextColor =
    | keyof SemanticColors
    | "white"
    | "black"
    | "danger"
    | "success"
    | "warning"
    | "info"
    | "gold";

export interface TextProps extends Omit<RNTextProps, "color"> {
    variant?: TextVariant;
    color?: TextColor;
    align?: "auto" | "left" | "right" | "center" | "justify";
}

/** Resolve a color name against the active theme's roles. */
export function resolveColor(color: TextColor | undefined, theme: any): string | undefined {
    if (!color) {
        return undefined;
    }
    if (color === "white") {
        return theme.colors.onSurface;
    }
    if (color === "black") {
        return "#000000";
    }
    if (color in theme.colors) {
        return theme.colors[color as keyof SemanticColors];
    }
    return color;
}

export function Text({
    variant = "body",
    color,
    align,
    style,
    children,
    ...rest
}: TextProps) {
    const { theme } = useTheme();
    const base = theme.typography[variant];

    return (
        <RNText
            style={[
                base,
                color ? ({ color: resolveColor(color, theme) } as object) : null,
                align ? { textAlign: align } : null,
                style,
            ]}
            {...rest}
        >
            {children}
        </RNText>
    );
}

export default Text;