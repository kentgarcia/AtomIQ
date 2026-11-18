/**
 * Toggle — a pill switch with a white thumb that slides over. On it takes the brand colour, off
 * it takes the neutral `switchTrack`. Under 300 ms; with reduced motion it just jumps.
 */

import React, { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { useTheme } from "@/theme";
import { DURATION, EASE_OUT } from "@/theme/motion";

const W = 52;
const H = 30;
const PAD = 3;
const THUMB = H - PAD * 2;

export function Toggle({
  value,
  onValueChange,
  accessibilityLabel,
}: {
  value: boolean;
  onValueChange: (next: boolean) => void;
  accessibilityLabel: string;
}) {
  const c = useTheme().theme.colors;
  const reducedMotion = useReducedMotion();
  const x = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    x.value = reducedMotion ? (value ? 1 : 0) : withTiming(value ? 1 : 0, { duration: DURATION.small, easing: EASE_OUT });
  }, [value, reducedMotion, x]);

  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value * (W - THUMB - PAD * 2) }] }));

  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      style={[styles.track, { backgroundColor: value ? c.primary : c.switchTrack }]}
    >
      <Animated.View style={[styles.thumb, { backgroundColor: c.onPrimary }, thumb]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, padding: PAD, justifyContent: "center" },
  thumb: { width: THUMB, height: THUMB, borderRadius: THUMB / 2 },
});
