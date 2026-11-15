/**
 * Button — the shared chunky control (Duolingo-style): flat face, 2px border,
 * 4px darker bottom "lip", and the face sinks onto the lip when pressed.
 *
 * Variants (all colors come from theme roles, never literals):
 *   primary     orange face / `primaryDark` lip / `onPrimary` label
 *   secondary   surface face / `borderStrong` lip / orange label
 *   destructive `error` face / `dangerDark` lip / `onPrimary` label
 *   success     `success` face / `successDark` lip / `onPrimary` label
 *
 * Labels are bold 16px so white on the orange face meets the 3:1 large-text
 * bar enforced by `npm run test:contrast`.
 */

import type { ReactNode } from "react";
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { playButtonClickSfx } from "@/services/ui-sfx";
import { fontFaces, fontSizes, radius, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";
import { layout } from "@/theme/layout";

export type ButtonVariant = "primary" | "secondary" | "destructive" | "success";

export interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    disabled?: boolean;
    /** Optional icon rendered before the label. Receives the label color. */
    renderIcon?: (color: string) => ReactNode;
    /** Stretch to the parent's width (default true). */
    fullWidth?: boolean;
    accessibilityLabel?: string;
    testID?: string;
    style?: StyleProp<ViewStyle>;
}

export function Button({
    label,
    onPress,
    variant = "primary",
    disabled = false,
    renderIcon,
    fullWidth = true,
    accessibilityLabel,
    testID,
    style,
}: ButtonProps) {
    const { theme } = useTheme();
    const c = theme.colors;

    const palette = disabled
        ? { face: c.disabled, lip: c.disabled, label: c.disabledText, border: c.disabled }
        : variant === "secondary"
          ? { face: c.surface, lip: c.borderStrong, label: c.primaryLight, border: c.border }
          : variant === "destructive"
            ? { face: c.error, lip: c.dangerDark, label: c.onPrimary, border: c.error }
            : variant === "success"
              ? { face: c.success, lip: c.successDark, label: c.onPrimary, border: c.success }
              : { face: c.primary, lip: c.primaryDark, label: c.onPrimary, border: c.primary };

    const lip = disabled ? 0 : controls.lip;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled }}
            disabled={disabled}
            testID={testID}
            onPress={() => {
                void playButtonClickSfx();
                onPress();
            }}
            style={[
                styles.lip,
                fullWidth ? styles.fullWidth : styles.hug,
                { backgroundColor: palette.lip, paddingBottom: lip },
                style,
            ]}
        >
            {({ pressed }) => (
                <View
                    style={[
                        styles.face,
                        {
                            backgroundColor: palette.face,
                            borderColor: palette.border,
                            transform: [{ translateY: pressed && !disabled ? controls.pressTravel : 0 }],
                        },
                    ]}
                >
                    {renderIcon ? renderIcon(palette.label) : null}
                    <Text style={[styles.label, { color: palette.label }]} numberOfLines={1}>
                        {label}
                    </Text>
                </View>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    lip: {
        borderRadius: radius.lg,
        overflow: "hidden",
        minHeight: layout.minTouchTarget,
    },
    fullWidth: {
        alignSelf: "stretch",
    },
    hug: {
        alignSelf: "flex-start",
    },
    face: {
        minHeight: layout.minTouchTarget - controls.lip,
        borderRadius: radius.lg,
        borderWidth: controls.border,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    label: {
        ...fontFaces.heavy,
        fontSize: fontSizes.xl,
        letterSpacing: 0.4,
    },
});

export default Button;
