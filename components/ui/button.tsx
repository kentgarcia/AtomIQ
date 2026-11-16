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

import { createContext, useContext, type ReactNode } from "react";
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

/**
 * `classic` is the original rounded-rectangle button. `standard` is the new house design: fully
 * rounded (pill), tall (60px) and an uppercase label. Compact buttons stay small and keep their label
 * as written (they carry content such as units and answer choices), but take the pill shape.
 * Choose per button with `design`, or for a whole area with <ButtonDesignProvider>; the lesson
 * screens use `standard` for now.
 */
export type ButtonDesign = "classic" | "standard";

const ButtonDesignContext = createContext<ButtonDesign>("classic");

export function ButtonDesignProvider({ design, children }: { design: ButtonDesign; children: ReactNode }) {
    return <ButtonDesignContext.Provider value={design}>{children}</ButtonDesignContext.Provider>;
}

export type ButtonVariant = "primary" | "secondary" | "destructive" | "success";
/** `compact` is a smaller inline button (36px tall, 14px label) for use inside cards. `large` is a taller call-to-action (60px). */
export type ButtonSize = "default" | "compact" | "large";

export interface ButtonProps {
    label: string;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    /** Overrides the design from the nearest <ButtonDesignProvider>. */
    design?: ButtonDesign;
    disabled?: boolean;
    /** Optional icon rendered before the label. Receives the label color. */
    renderIcon?: (color: string) => ReactNode;
    /** Stretch to the parent's width (default true). */
    fullWidth?: boolean;
    /** Let a long label wrap onto a second line instead of being cut off (for narrow buttons). */
    wrap?: boolean;
    accessibilityLabel?: string;
    testID?: string;
    style?: StyleProp<ViewStyle>;
}

export function Button({
    label,
    onPress,
    variant = "primary",
    size = "default",
    design: designProp,
    disabled = false,
    renderIcon,
    fullWidth = true,
    wrap = false,
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
    const compact = size === "compact";
    const inherited = useContext(ButtonDesignContext);
    const standard = (designProp ?? inherited) === "standard";
    const large = size === "large" || (standard && !compact);
    const uppercase = standard && !compact;
    const round = standard ? radius.full : compact ? radius.md : radius.lg;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? label}
            accessibilityState={{ disabled }}
            disabled={disabled}
            // Compact buttons are under the 48px target; pad the tap area to match
            hitSlop={compact ? 6 : undefined}
            testID={testID}
            onPress={() => {
                void playButtonClickSfx();
                onPress();
            }}
            style={[
                styles.lip,
                compact && styles.lipCompact,
                large && styles.lipLarge,
                fullWidth ? styles.fullWidth : styles.hug,
                { paddingBottom: lip, borderRadius: round },
                style,
            ]}
        >
            {({ pressed }) => (
                <>
                {/* The lip is its own layer, exactly where the face lands when pressed, so nothing darker shows above it. */}
                {lip > 0 ? (
                    <View
                        pointerEvents="none"
                        style={[styles.lipLayer, { top: lip, backgroundColor: palette.lip, borderRadius: round }]}
                    />
                ) : null}
                <View
                    style={[
                        styles.face,
                        compact && styles.faceCompact,
                        large && styles.faceLarge,
                        {
                            backgroundColor: palette.face,
                            borderRadius: round,
                            borderColor: palette.border,
                            transform: [{ translateY: pressed && !disabled ? controls.pressTravel : 0 }],
                        },
                    ]}
                >
                    {renderIcon ? renderIcon(palette.label) : null}
                    <Text
                        style={[styles.label, compact && styles.labelCompact, uppercase && styles.labelUpper, { color: palette.label }]}
                        numberOfLines={wrap ? 2 : 1}
                    >
                        {label}
                    </Text>
                </View>
                </>
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
    lipCompact: {
        minHeight: 36,
        borderRadius: radius.md,
    },
    lipLayer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
    },
    lipLarge: {
        minHeight: 60,
    },
    faceLarge: {
        minHeight: 60 - controls.lip,
        paddingVertical: 16,
    },
    faceCompact: {
        minHeight: 36 - controls.lip,
        borderRadius: radius.md,
        paddingHorizontal: 14,
        paddingVertical: 4,
        gap: 6,
    },
    labelCompact: {
        textAlign: "center",
        fontSize: fontSizes.lg,
        letterSpacing: 0.2,
    },
    labelUpper: {
        textTransform: "uppercase",
        letterSpacing: 0.8,
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
