/**
 * Button — the shared chunky control. Two constructions, both with a lip that only shows along
 * the bottom edge and a face that sinks onto it when pressed:
 *
 *   bezeled   (primary, success, destructive; default and large sizes) a thin white bezel, with no
 *             border and only a gray lip along its bottom edge, holds the colored face, which has
 *             a darker lip inside it
 *   flat      (secondary, and every compact button) just the face and its lip, since a bezel
 *             inside a card or around an outlined button would be one frame too many
 *
 * Variants (all colors come from theme roles, never literals):
 *   primary     `buttonFace` yellow / `buttonLip` / `onPrimary` label
 *   secondary   surface face / `borderStrong` lip / orange label
 *   lesson      (flat, all caps) lighter yellow face / `lessonCardLip` lip / darker yellow label: for a button on the yellow lesson card or node bubble
 *   modal       `lessonHeader` face / `lessonCardLip` lip / white label: the main button of a modal (bezeled, same yellow as its header)
 *   guide       `guide` blue face / `guideLip` / `onPrimary` label: the Guide's and the Quests card's blue (bezeled)
 *   destructive `error` face / `dangerDark` lip / `onPrimary` label
 *   success     `success` face / `successDark` lip / `onPrimary` label
 *
 * Labels on a colored face are white with a hard shadow (no blur) in the lip color. The bezel is
 * fixed per variant and size, and a disabled button keeps its lip (a gray one) and the exact height
 * of an enabled one, so nothing shifts when it becomes available.
 */

import { createContext, useContext, type ReactNode } from "react";
import { ShineSweep } from "@/components/motion/ShineSweep";
import {
    Pressable,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { Text } from "@/components/ui/text";

import { playSfx, type SfxCue } from "@/services/sfx";
import { stretchStyle } from "@/theme/text-stretch";
import { fontFaces, fontSizes, radius, useTheme } from "@/theme";
import { controls } from "@/theme/tokens";
import { layout } from "@/theme/layout";

/** The white frame around a bezeled button. */
export const BEZEL = { padding: 3, lip: 3, innerLip: 6, innerRadius: radius.lg } as const;
const BEZEL_OUTER_RADIUS = BEZEL.innerRadius + BEZEL.padding;

/** Face and lip colors of the white bezel (theme roles, so dark mode follows). */
export function useBezelColors() {
    const c = useTheme().theme.colors;
    return { face: c.card, lip: c.borderStrong };
}

/**
 * The bezel around any colored face: `children` is the face with its inner lip. Renders only the
 * frame; the caller owns press handling.
 */
export function Bezel({ children }: { children: ReactNode }) {
    const b = useBezelColors();
    return (
        <View style={{ paddingBottom: BEZEL.lip }}>
            <View
                pointerEvents="none"
                style={[styles.lipLayer, { top: BEZEL.lip, backgroundColor: b.lip, borderRadius: BEZEL_OUTER_RADIUS }]}
            />
            <View
                style={{
                    backgroundColor: b.face,
                    borderRadius: BEZEL_OUTER_RADIUS,
                    padding: BEZEL.padding,
                }}
            >
                {children}
            </View>
        </View>
    );
}

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

/** `modal` is the main button of a ModalCard: the exact face and lip of the modal's header band. */
export type ButtonVariant = "primary" | "secondary" | "destructive" | "success" | "lesson" | "modal" | "guide";
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
    /** Draw the label taller (theme/text-stretch.ts), for screens that use the stretched text. */
    stretch?: boolean;
    /**
     * A band of light sweeps across the face now and then: only for the one button that is waiting to be
     * pressed (the duolingo-motion-style skill, tier A idle). Quiet, stops off screen and with reduced motion.
     */
    shine?: boolean;
    /** The sound of the press: `ui.press` unless this button has a sound of its own (a cue id) or none (`null`). */
    pressSfx?: SfxCue | null;
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
    stretch = false,
    shine = false,
    pressSfx = "ui.press",
    accessibilityLabel,
    testID,
    style,
}: ButtonProps) {
    const { theme } = useTheme();
    const c = theme.colors;

    const palette = disabled
        ? { face: c.disabled, lip: c.borderStrong, label: c.disabledText, border: c.disabled, shadow: undefined }
        : variant === "secondary"
          ? { face: c.surface, lip: c.borderStrong, label: c.primaryLight, border: c.border, shadow: undefined }
          : variant === "lesson"
            ? { face: c.lessonButtonFace, lip: c.lessonCardLip, label: c.lessonButtonLabel, border: c.lessonButtonFace, shadow: undefined }
          : variant === "modal"
            ? { face: c.lessonHeader, lip: c.lessonCardLip, label: c.lessonHeaderText, border: c.lessonHeader, shadow: c.lessonCardLip }
          : variant === "guide"
            ? { face: c.guide, lip: c.guideLip, label: c.onPrimary, border: c.guide, shadow: c.guideLip }
          : variant === "destructive"
            ? { face: c.error, lip: c.dangerDark, label: c.onPrimary, border: c.error, shadow: c.dangerDark }
            : variant === "success"
              ? { face: c.success, lip: c.successDark, label: c.onPrimary, border: c.success, shadow: c.successDark }
              : { face: c.buttonFace, lip: c.buttonLip, label: c.onPrimary, border: c.buttonFace, shadow: c.buttonLip };

    const compact = size === "compact";
    const inherited = useContext(ButtonDesignContext);
    const standard = (designProp ?? inherited) === "standard";
    const large = size === "large" || (standard && !compact);
    const uppercase = (standard && !compact) || variant === "lesson";
    const bezeled = variant !== "secondary" && variant !== "lesson" && !compact;
    // A bezeled button is a rounded square whatever the design; a flat one keeps the pill / classic shape
    const round = bezeled ? BEZEL.innerRadius : standard ? radius.full : compact ? radius.md : radius.lg;
    // The lip is always there (gray when disabled): a flat disabled face looked unfinished
    const lip = bezeled ? BEZEL.innerLip : controls.lip;

    // Inner height (face + lip). The bezel adds its own frame around it.
    const innerMin = bezeled
        ? large
            ? 52
            : 44
        : compact
          ? 36
          : large
            ? 60
            : layout.minTouchTarget;
    const faceMin = bezeled ? innerMin - BEZEL.innerLip : innerMin - controls.lip;

    const renderFace = (pressed: boolean) => (
        <View style={[styles.inner, { minHeight: innerMin, borderRadius: round, paddingBottom: bezeled ? BEZEL.innerLip : controls.lip }]}>
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
                    large && !compact && styles.faceLarge,
                    {
                        minHeight: faceMin,
                        backgroundColor: palette.face,
                        borderRadius: round,
                        borderWidth: bezeled ? 0 : controls.border,
                        borderColor: palette.border,
                        transform: [{ translateY: pressed && !disabled ? lip : 0 }],
                    },
                    shine ? { overflow: "hidden" } : null,
                ]}
            >
                {shine ? <ShineSweep radius={round} enabled={!disabled && !pressed} /> : null}
                {renderIcon ? renderIcon(palette.label) : null}
                <Text
                    style={[
                        styles.label,
                        compact && styles.labelCompact,
                        uppercase && styles.labelUpper,
                        stretch && stretchStyle,
                        { color: palette.label },
                        // Hard shadow, no blur, in the lip color
                        palette.shadow
                            ? {
                                  textShadowColor: palette.shadow,
                                  textShadowOffset: { width: 0, height: compact ? 1 : 2 },
                                  textShadowRadius: 0,
                              }
                            : null,
                    ]}
                    numberOfLines={wrap ? 2 : 1}
                >
                    {label}
                </Text>
            </View>
        </View>
    );

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
                if (pressSfx) void playSfx(pressSfx);
                onPress();
            }}
            style={[fullWidth ? styles.fullWidth : styles.hug, style]}
        >
            {({ pressed }) => (bezeled ? <Bezel>{renderFace(pressed)}</Bezel> : renderFace(pressed))}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    inner: {
        overflow: "hidden",
    },
    lipLayer: {
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
    },
    faceLarge: {
        paddingVertical: 14,
    },
    faceCompact: {
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
        paddingHorizontal: 20,
        paddingVertical: 10,
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
