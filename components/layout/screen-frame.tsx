/**
 * ScreenFrame — safe-area-aware page frame with an optional scroll container
 * and a centered readable content width.
 *
 * Use this for screens whose structure is a simple header + body. Screens with
 * custom absolute backgrounds can keep their own root view and apply
 * `ResponsiveContainer` / `useBottomInset` directly.
 */

import type { ReactNode, Ref } from "react";
import {
    ScrollView,
    StyleSheet,
    View,
    type ScrollViewInstance,
    type StyleProp,
    type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ResponsiveContainer } from "@/components/layout/responsive-container";
import { useTabBarInset } from "@/components/layout/tab-bar-inset";

export interface ScreenFrameProps {
    children: ReactNode;
    /** Wrap the body in a vertical ScrollView. */
    scroll?: boolean;
    /** Apply the top safe-area inset to the body. */
    topInset?: boolean;
    /** Reserve the floating tab bar instead of only the system bottom inset. */
    reserveTabBar?: boolean;
    /** Extra bottom space for a fixed control (composer, CTA, answer row). */
    bottomExtra?: number;
    backgroundColor?: string;
    style?: StyleProp<ViewStyle>;
    contentContainerStyle?: StyleProp<ViewStyle>;
    /** Rendered above the scroll area (usually a PageHeader). */
    header?: ReactNode;
    scrollRef?: Ref<ScrollViewInstance>;
    keyboardShouldPersistTaps?: "always" | "never" | "handled";
}

export function ScreenFrame({
    children,
    scroll = false,
    topInset = false,
    reserveTabBar = false,
    bottomExtra = 0,
    backgroundColor,
    style,
    contentContainerStyle,
    header,
    scrollRef,
    keyboardShouldPersistTaps = "handled",
}: ScreenFrameProps) {
    const insets = useSafeAreaInsets();
    const tabBarInset = useTabBarInset();

    const paddingTop = topInset ? insets.top : 0;
    const paddingBottom =
        (reserveTabBar ? tabBarInset : insets.bottom) + bottomExtra;

    return (
        <View
            style={[
                styles.root,
                backgroundColor ? { backgroundColor } : null,
                style,
            ]}
        >
            {header}
            {scroll ? (
                <ScrollView
                    ref={scrollRef}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps={keyboardShouldPersistTaps}
                    contentContainerStyle={[
                        { paddingTop, paddingBottom },
                        contentContainerStyle,
                    ]}
                >
                    <ResponsiveContainer>{children}</ResponsiveContainer>
                </ScrollView>
            ) : (
                <View
                    style={[
                        styles.body,
                        { paddingTop, paddingBottom },
                        contentContainerStyle,
                    ]}
                >
                    <ResponsiveContainer style={styles.fill}>
                        {children}
                    </ResponsiveContainer>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    body: {
        flex: 1,
    },
    fill: {
        flex: 1,
    },
});

export default ScreenFrame;
