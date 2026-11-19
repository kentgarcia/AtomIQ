/**
 * PressableIconButton — icon-only control with a guaranteed 48 dp hit target.
 *
 * The visual size may stay small (for example 40 dp) while `hitSlop` expands
 * the touch area, so headers keep their visual rhythm without failing the
 * Android touch-target requirement.
 */

import type { ReactNode } from "react";
import {
    Pressable,
    StyleSheet,
    type StyleProp,
    type ViewStyle,
} from "react-native";

import { playSfx } from "@/services/sfx";
import { useTheme, withAlpha } from "@/theme";
import { layout } from "@/theme/layout";

export interface PressableIconButtonProps {
    accessibilityLabel: string;
    onPress: () => void;
    children: ReactNode;
    /** Visual width/height. Defaults to the 48 dp minimum. */
    visualSize?: number;
    style?: StyleProp<ViewStyle>;
    disabled?: boolean;
    testID?: string;
}

export function PressableIconButton({
    accessibilityLabel,
    onPress,
    children,
    visualSize = layout.minTouchTarget,
    style,
    disabled = false,
    testID,
}: PressableIconButtonProps) {
    const { theme } = useTheme();
    const size = Math.max(1, visualSize);
    const hitSlop = Math.max(0, (layout.minTouchTarget - size) / 2);

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ disabled }}
            disabled={disabled}
            testID={testID}
            hitSlop={hitSlop}
            android_ripple={{ color: withAlpha(theme.colors.text, 0.08), borderless: true }}
            onPress={() => {
                if (disabled) {
                    return;
                }
                void playSfx("ui.press");
                onPress();
            }}
            style={({ pressed }) => [
                styles.base,
                { width: size, height: size },
                style,
                pressed && !disabled && styles.pressed,
            ]}
        >
            {children}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        alignItems: "center",
        justifyContent: "center",
    },
    pressed: {
        opacity: 0.72,
    },
});

export default PressableIconButton;
