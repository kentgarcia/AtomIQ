/**
 * IconButton — a square glyph button in the bezel design: a thin white frame with only a gray lip along its bottom edge
 * holds a colored face (with a darker lip inside it) and a white glyph. For transport-style
 * controls (play, pause, stop) and other single-icon actions.
 *
 * Needs an `accessibilityLabel`: the glyph is the only visible content. Same variants as <Button>
 * (primary yellow, success, destructive); the glyph is white on all of them, as in the design.
 * `neutral` is a gray secondary action (a back arrow beside a main button) with a dark glyph.
 * Disabled keeps the exact size and its lip (gray).
 */

import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { darken } from "@/components/lesson/visual/color-math";
import { BEZEL, Bezel } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { playSfx } from "@/services/sfx";
import { useTheme } from "@/theme";

export type IconButtonVariant = "primary" | "success" | "destructive" | "neutral";

export interface IconButtonProps {
    /** Icon name from the icon registry (components/ui/icon-registry.ts). */
    icon: string;
    onPress: () => void;
    accessibilityLabel: string;
    variant?: IconButtonVariant;
    /** Width and height of the colored face including its lip (default 56). */
    size?: number;
    disabled?: boolean;
    testID?: string;
    style?: StyleProp<ViewStyle>;
}

export function IconButton({
    icon,
    onPress,
    accessibilityLabel,
    variant = "primary",
    size = 56,
    disabled = false,
    testID,
    style,
}: IconButtonProps) {
    const { theme } = useTheme();
    const c = theme.colors;

    const palette = disabled
        ? { face: c.disabled, lip: c.borderStrong, glyph: c.disabledText }
        : variant === "neutral"
          ? { face: c.borderStrong, lip: darken(c.borderStrong, 0.22), glyph: c.text }
          : variant === "destructive"
          ? { face: c.error, lip: c.dangerDark, glyph: c.onPrimary }
          : variant === "success"
            ? { face: c.success, lip: c.successDark, glyph: c.onPrimary }
            : { face: c.buttonFace, lip: c.buttonLip, glyph: c.onPrimary };

    const lip = BEZEL.innerLip;
    const round = BEZEL.innerRadius;

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled }}
            disabled={disabled}
            testID={testID}
            onPress={() => {
                void playSfx("ui.press");
                onPress();
            }}
            style={[styles.root, style]}
        >
            {({ pressed }) => (
                <Bezel>
                    <View style={{ width: size, height: size, borderRadius: round, overflow: "hidden" }}>
                        {lip > 0 ? (
                            <View
                                pointerEvents="none"
                                style={[styles.lip, { top: lip, backgroundColor: palette.lip, borderRadius: round }]}
                            />
                        ) : null}
                        <View
                            style={[
                                styles.face,
                                {
                                    height: size - BEZEL.innerLip,
                                    backgroundColor: palette.face,
                                    borderRadius: round,
                                    transform: [{ translateY: pressed && !disabled ? lip : 0 }],
                                },
                            ]}
                        >
                            <Icon name={icon} size={Math.round(size * 0.46)} color={palette.glyph} variant="Bold" />
                        </View>
                    </View>
                </Bezel>
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    root: { alignSelf: "flex-start" },
    lip: { position: "absolute", left: 0, right: 0, bottom: 0 },
    face: { alignItems: "center", justifyContent: "center" },
});
