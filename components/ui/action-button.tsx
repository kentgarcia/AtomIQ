/**
 * ActionButton — the stacked "chunky" card-style button used on the home
 * screen. A darker back layer peeks out below a brighter front layer so the
 * button looks raised; while pressed, the front layer animates down to fully
 * cover the back layer, producing a tactile pushed-down effect.
 */

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

import { Icon } from "./icon";

const CARD_HEIGHT = 96;
const THICKNESS = 6;
const BODY_HEIGHT = CARD_HEIGHT - THICKNESS;
const BODY_RADIUS = 20;

export interface ActionButtonProps {
    icon: string;
    label: string;
    iconColor: string;
    onPress: () => void;
}

export function ActionButton({
    icon,
    label,
    iconColor,
    onPress,
}: ActionButtonProps) {
    const bodyHeight = useSharedValue(BODY_HEIGHT);

    const bodyStyle = useAnimatedStyle(() => ({
        height: bodyHeight.value,
    }));

    return (
        <Pressable
            style={styles.card}
            onPress={onPress}
            onPressIn={() => {
                bodyHeight.value = withTiming(CARD_HEIGHT, { duration: 45 });
            }}
            onPressOut={() => {
                bodyHeight.value = withTiming(BODY_HEIGHT, { duration: 60 });
            }}
        >
            <View style={styles.shadowLayer} />
            <Animated.View style={[styles.body, bodyStyle]}>
                <View style={styles.iconCircle}>
                    <Icon name={icon} size={22} color={iconColor} variant="Bold" />
                </View>
                <Text style={styles.label} numberOfLines={1}>
                    {label}
                </Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flex: 1,
        height: CARD_HEIGHT,
    },
    shadowLayer: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BODY_RADIUS,
        backgroundColor: "#CC6605",
    },
    body: {
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        borderRadius: BODY_RADIUS,
        backgroundColor: "#FF8716",
        alignItems: "center",
        justifyContent: "center",
        padding: 10,
    },
    iconCircle: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: "rgba(255,255,255,0.92)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    label: {
        color: "#FFFFFF",
        fontSize: 13,
        fontWeight: "700",
        textAlign: "center",
    },
});