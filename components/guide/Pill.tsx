/**
 * Guide Pill — the atomic, tap-only control of the AtomIQ Guide. No text input
 * ever exists; every navigation is one tap on a pill like the spec requires.
 */

import React, { useMemo } from "react";
import {
  Pressable,
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
import { createStyles, DURATION, fontFaces, PRESS_EASING, useTheme } from "@/theme";

export interface PillProps {
  label: string;
  icon?: string;
  onPress: () => void;
  variant?: "default" | "utility";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
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
      shadowColor: c.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      minHeight: 44,
    },
    pillDefault: {
      backgroundColor: c.card,
      borderColor: c.border,
    },
    pillUtility: {
      backgroundColor: c.surfaceSoft,
      borderColor: c.border,
      minHeight: 38,
      paddingVertical: 9,
      borderRadius: 12,
    },
    icon: {
      marginRight: 1,
    },
    label: {
      fontSize: 14,
      ...fontFaces.semibold,
    },
  };
});

export function Pill({
  label,
  icon,
  onPress,
  variant = "default",
  disabled = false,
  style,
}: PillProps) {
  const { theme } = useTheme();
  const reduce = useReducedMotion();
  const pressed = useSharedValue(0);
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const animated = useAnimatedStyle(() => {
    if (reduce) return { transform: [{ scale: 1 }] };
    const scale = withSpring(1 - pressed.value * 0.04, {
      damping: 18,
      stiffness: 220,
    });
    return { transform: [{ scale }] };
  });

  const isUtility = variant === "utility";
  const palette = isUtility
    ? {
        bg: theme.colors.surfaceSoft,
        border: theme.colors.border,
        borderBottom: theme.colors.borderStrong,
        text: theme.colors.textMuted,
        icon: theme.colors.textFaint,
      }
    : {
        bg: theme.colors.card,
        border: theme.colors.border,
        borderBottom: theme.colors.borderStrong,
        text: theme.colors.text,
        icon: theme.colors.link,
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
