/**
 * Screen — app-wide page shell with themed background, safe area and
 * optional scrolling. Screens compose this instead of hand-rolling
 * containers.
 */

import React, { type ComponentProps } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme/useTheme";

export interface ScreenProps {
    children: React.ReactNode;
    /** Background role. Defaults to `background`. */
    background?: "background" | "surface" | "card" | "surfaceSoft" | "transparent";
    scroll?: boolean;
    /** Content width constraint look & feel */
    contentContainerStyle?: StyleProp<ViewStyle>;
    style?: StyleProp<ViewStyle>;
    edges?: ReadonlyArray<"top" | "right" | "bottom" | "left">;
    refreshControl?: ComponentProps<typeof ScrollView>["refreshControl"];
    keyboardAvoiding?: boolean;
}

export function Screen({
    children,
    background = "background",
    scroll = false,
    contentContainerStyle,
    style,
    edges = ["top", "bottom"],
    refreshControl,
    keyboardAvoiding = false,
}: ScreenProps) {
    const { theme } = useTheme();

    const backgroundStyle: ViewStyle =
        background === "transparent"
            ? { backgroundColor: "transparent" }
            : { backgroundColor: theme.colors[background] };

    const styleComponent = (
        <SafeAreaView
            edges={edges}
            style={[styles.base, backgroundStyle, style]}
        >
            {scroll ? (
                <ScrollView
                    style={styles.flex}
                    contentContainerStyle={[styles.contentContainer, contentContainerStyle]}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    refreshControl={refreshControl}
                >
                    {children}
                </ScrollView>
            ) : (
                <View style={[styles.flex, contentContainerStyle]}>{children}</View>
            )}
        </SafeAreaView>
    );

    if (!keyboardAvoiding) {
        return styleComponent;
    }

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            {styleComponent}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    base: { flex: 1 },
    contentContainer: { flexGrow: 1 },
});

export default Screen;