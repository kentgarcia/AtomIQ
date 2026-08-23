/**
 * StackCard — full-bleed slanted card used by the Games picker and the
 * in-page difficulty stacks. Keeps the -4° slant through its entrance
 * animation (the enter animation lives on the outer wrapper, the rotate
 * on the inner view). Autumn style: white card, soft shadow, tinted icon
 * circle in the game's accent color.
 */

import { Icon } from "@/components/ui/icon";
import { fontFamilies, useTheme } from "@/theme";
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

const isHex = (value: string) => /^#[0-9a-fA-F]{6}$/.test(value);

/* Soft tint of the accent color for the icon circle */
const tint = (hex: string) =>
  isHex(hex) ? `${hex}26` : "rgba(0,0,0,0.06)";

/* Darkened accent so the icon reads on the tinted circle */
const shade = (hex: string, amount: number) => {
  if (!isHex(hex)) return hex;
  const mix = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v + 255 * amount)))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(parseInt(hex.slice(1, 3), 16))}${mix(
    parseInt(hex.slice(3, 5), 16),
  )}${mix(parseInt(hex.slice(5, 7), 16))}`;
};

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
  const { isDark } = useTheme();
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
                    isDark && styles.cardDark,
                    {
                        height,
                        transform: [{ rotate: "-4deg" }],
                    },
                ]}
            >
                <Pressable
                    style={[styles.cardPressArea, isDark && styles.cardPressAreaDark]}
                    onPressIn={() => {
                        pressScale.value = springPressIn();
                    }}
                    onPressOut={() => {
                        pressScale.value = springPressOut();
                    }}
                    onPress={onPress}
                >
                    <Animated.View style={[styles.iconWrapper, pressStyle, { backgroundColor: tint(color) }]}>
                        <Icon name={icon} size={42} color={shade(color, -0.32)} variant="Bold" />
                    </Animated.View>
                    <Text style={[styles.cardTitle, isDark && styles.cardTitleDark]}>{title}</Text>
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
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        elevation: 4,
        shadowColor: "#000000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.07,
        shadowRadius: 8,
    },
    cardPressArea: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
    },
    iconWrapper: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
    },
    cardTitle: {
        fontSize: 26,
        fontFamily: fontFamilies.heavy,
        color: "#333333",
        letterSpacing: -0.5,
    },
    /* Dark mode */
    cardDark: {
        backgroundColor: "#213356",
    },
    cardPressAreaDark: {
        backgroundColor: "#213356",
    },
    cardTitleDark: {
        color: "#F6F9FC",
    },
});