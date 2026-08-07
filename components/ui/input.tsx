/**
 * Input — themed text field.
 *
 * States: default | error | success
 * Supports a label, leading icon, hint text and optional right slot.
 */

import React, { useState } from "react";
import {
    StyleSheet,
    TextInput,
    View,
    type StyleProp,
    type TextInputProps,
    type TextStyle,
    type ViewStyle,
} from "react-native";

import { Icon } from "@/components/ui/icon";
import { useTheme } from "@/theme/useTheme";
import { withAlpha } from "@/theme";

import { Text } from "./text";

export type InputState = "default" | "error" | "success";

export interface InputProps extends Omit<TextInputProps, "style"> {
    label?: string;
    hint?: string;
    state?: InputState;
    leftIcon?: string;
    rightSlot?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    inputStyle?: StyleProp<TextStyle>;
}

export function Input({
    label,
    hint,
    state = "default",
    leftIcon,
    rightSlot,
    style,
    inputStyle,
    placeholderTextColor,
    ...rest
}: InputProps) {
    const { theme } = useTheme();
    const [focused, setFocused] = useState(false);

    const stateColor =
        state === "error"
            ? theme.colors.error
            : state === "success"
              ? theme.colors.success
              : theme.colors.primary;

    const borderColor = focused
        ? stateColor
        : state === "error"
          ? theme.colors.error
          : state === "success"
            ? theme.colors.success
            : theme.colors.border;

    return (
        <View style={[style]}>
            {label ? (
                <Text variant="label" color="textSecondary" style={{ marginBottom: theme.spacing.xs }}>
                    {label}
                </Text>
            ) : null}
            <View
                style={[
                    styles.field,
                    {
                        backgroundColor: theme.colors.card,
                        borderColor,
                        borderRadius: theme.radius.md,
                        borderWidth: focused ? 1.5 : 1,
                    },
                ]}
            >
                {leftIcon ? (
                    <Icon name={leftIcon} size={theme.iconSizes.md} color={theme.colors.textMuted} />
                ) : null}
<TextInput
                    {...rest}
                    onFocus={(e) => {
                        setFocused(true);
                        rest.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        rest.onBlur?.(e);
                    }}
                    placeholderTextColor={
                        placeholderTextColor ?? withAlpha(theme.colors.textMuted, 0.7)
                    }
                    style={[
                        styles.input,
                        {
                            color: theme.colors.text,
                            fontFamily: theme.fontFamilies.body,
                            fontSize: theme.fontSizes.xl,
                        },
                        inputStyle,
                    ]}
                />
                {rightSlot}
            </View>
            {hint ? (
                <Text
                    variant="caption"
                    color={state === "error" ? "error" : "textSecondary"}
                    style={{ marginTop: theme.spacing.xs }}
                >
                    {hint}
                </Text>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    field: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 8,
    },
});

export default Input;