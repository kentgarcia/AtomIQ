/**
 * Guide Pill — the atomic, tap-only control of the AtomIQ Guide. No text input
 * ever exists; every navigation is one tap on a pill like the spec requires.
 */

import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components/ui/icon";
import { DURATION, fontFamilies, PRESS_EASING } from "@/theme";

export interface PillProps {
  label: string;
  icon?: string;
  onPress: () => void;
  variant?: "default" | "utility";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Pill({
  label,
  icon,
  onPress,
  variant = "default",
  disabled = false,
  style,
}: PillProps) {
  const reduce = useReducedMotion();
  const pressed = useSharedValue(0);

  const animated = useAnimatedStyle(() => {
    if (reduce) return { transform: [{ scale: 1 }] };
    const scale = withSpring(1 - pressed.value * 0.04, {
      damping: 18,
      stiffness: 220,
    });
    return { transform: [{ scale }] };
  });

  // Mirrors profile's 3D white pills — optionPill (#FFFFFF / #E5E7EB / bottom 4)
  // and utility as a muted countPill-like treatment.
  const isUtility = variant === "utility";
  const palette = isUtility
    ? {
        bg: "#F9FAFB",
        border: "#E5E7EB",
        borderBottom: "#D1D5DB",
        text: "#9CA3AF",
        icon: "#9CA3AF",
      }
    : {
        bg: "#FFFFFF",
        border: "#E5E7EB",
        borderBottom: "#E5E7EB",
        text: "#333333",
        icon: "#FF8C00",
      };

  return (
    <Animated.View style={[styles.wrap, animated, style]}>
      <Pressable
        disabled={disabled}
        onPressIn={() => {
          pressed.value = withTiming(1, {
            duration: DURATION.press,
            easing: PRESS_EASING,
          });
        }}
        onPressOut={() => {
          pressed.value = withTiming(0, {
            duration: DURATION.press,
            easing: PRESS_EASING,
          });
        }}
        onPress={onPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        style={({ pressed: isPressed }) => [
          styles.pill,
          isUtility ? styles.pillUtility : styles.pillDefault,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            borderBottomColor: palette.borderBottom,
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: isPressed ? 0.98 : 1 }],
          },
        ]}
      >
        {icon ? (
          <Icon
            name={icon}
            size={16}
            color={palette.icon}
            variant="Bold"
            style={styles.icon}
          />
        ) : null}
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "flex-start",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderBottomWidth: 4,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    minHeight: 44,
  },
  pillDefault: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  pillUtility: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    minHeight: 38,
    paddingVertical: 9,
    borderRadius: 12,
  },
  icon: {
    marginRight: 1,
  },
  label: {
    fontSize: 14,
    fontFamily: fontFamilies.semibold,
  },
});
