/**
 * StackCard — full-bleed slanted card used by the Games picker and the
 * in-page difficulty stacks. Keeps the -4° slant through its entrance
 * animation (the enter animation lives on the outer wrapper, the rotate
 * on the inner view).
 */

import { Icon } from "@/components/ui/icon";
import { fontFamilies } from "@/theme";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
    ZoomIn,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";

const springPressIn = () =>
    withSpring(0.92, { damping: 12, stiffness: 400, mass: 0.3 });
const springPressOut = () =>
    withSpring(1, { damping: 16, stiffness: 260, mass: 0.5 });

export interface StackCardProps {
    title: string;
    color: string;
    icon: string;
    delay: number;
    height: number;
    onPress: () => void;
}

export function StackCard({
    title,
    color,
    icon,
    delay,
    height,
    onPress,
}: StackCardProps) {
    const pressScale = useSharedValue(1);
    const pressStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pressScale.value }],
    }));

    return (
        <Animated.View
            entering={ZoomIn.duration(280)
                .delay(delay)
                .springify()
                .damping(20)
                .stiffness(260)}
        >
            <Animated.View
                style={[
                    styles.card,
                    {
                        height,
                        backgroundColor: color,
                        transform: [{ rotate: "-4deg" }],
                    },
                ]}
            >
                <Pressable
                    style={styles.cardPressArea}
                    onPressIn={() => {
                        pressScale.value = springPressIn();
                    }}
                    onPressOut={() => {
                        pressScale.value = springPressOut();
                    }}
                    onPress={onPress}
                >
                    <Animated.View style={[styles.iconWrapper, pressStyle]}>
                        <Icon name={icon} size={46} color="#050505" variant="Bold" />
                    </Animated.View>
                    <Text style={styles.cardTitle}>{title}</Text>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

export default StackCard;

const styles = StyleSheet.create({
    card: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 28,
    },
    cardPressArea: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
    },
    iconWrapper: {
        width: 60,
        height: 60,
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: {
        fontSize: 26,
        fontFamily: fontFamilies.heavy,
        fontWeight: "900",
        color: "#050505",
        letterSpacing: -0.5,
    },
});