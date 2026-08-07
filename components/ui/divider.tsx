/**
 * Divider — thin separator line using the theme border color.
 */

import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/useTheme";

export interface DividerProps {
    color?: string;
    thickness?: number;
    vertical?: boolean;
    spacing?: number;
    style?: StyleProp<ViewStyle>;
}

export function Divider({
    color,
    thickness = StyleSheet.hairlineWidth,
    vertical = false,
    spacing = 0,
    style,
}: DividerProps) {
    const { theme } = useTheme();

    const base: ViewStyle = vertical
        ? { width: thickness, alignSelf: "stretch", marginHorizontal: spacing }
        : { height: thickness, alignSelf: "stretch", marginVertical: spacing };

    return (
        <View
            style={[
                base,
                { backgroundColor: color ?? theme.colors.border, opacity: 0.8 },
                style,
            ]}
        />
    );
}

export default Divider;