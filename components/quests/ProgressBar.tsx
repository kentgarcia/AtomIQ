/**
 * ProgressBar — a rounded track with a fill that grows left to right and a
 * centred label. Shared by the daily quests and the achievements.
 */

import React, { useEffect, useMemo } from "react";
import { View } from "react-native";
import { Text } from "@/components/ui/text";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { createStyles, fontFaces, useTheme } from "@/theme";
import { EASE_OUT } from "@/theme/motion";

export const ProgressBar = ({
  ratio,
  label,
  done,
  tint,
}: {
  /** 0 to 1. */
  ratio: number;
  label: string;
  done: boolean;
  /** Fill colour while not done (default: the brand colour). */
  tint?: string;
}) => {
  const { theme } = useTheme();
  const c = theme.colors;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const reducedMotion = useReducedMotion();
  const fill = useSharedValue(ratio);

  useEffect(() => {
    fill.set(reducedMotion ? ratio : withTiming(ratio, { duration: 260, easing: EASE_OUT }));
  }, [fill, ratio, reducedMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    transformOrigin: "left",
    transform: [{ scaleX: fill.get() }],
  }));

  return (
    <View
      style={styles.track}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(ratio * 100) }}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: done ? c.success : (tint ?? c.primary) }, fillStyle]}
      />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const makeStyles = createStyles((theme) => {
  const c = theme.colors;
  return {
    track: {
      alignSelf: "stretch",
      height: 22,
      borderRadius: 11,
      backgroundColor: c.border,
      overflow: "hidden",
      justifyContent: "center",
    },
    fill: { position: "absolute", left: 0, top: 0, bottom: 0, right: 0, borderRadius: 11 },
    label: { textAlign: "center", fontSize: 12, color: c.text, ...fontFaces.heavy, fontVariant: ["tabular-nums"] },
  };
});
