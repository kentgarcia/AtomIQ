/**
 * Continuity helpers for the lesson flow (docs/CONTINUITY_SPEC.md, C1).
 *
 * - `LessonStepFrame` wraps the current step: the old step fades out quickly,
 *   the new one enters from the side of travel. Reduced motion keeps only a
 *   short cross-fade.
 * - `LessonProgressFill` animates the progress fill from its old fraction to
 *   the new one instead of jumping. The fill is a leaf inside a fixed-size
 *   track, so animating its width reflows nothing (scaleX would squash the
 *   rounded end).
 */
import React, { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  FadeIn,
  FadeInLeft,
  FadeInRight,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { DURATION, EASE_DRAWER } from "@/theme/motion";

export type StepDirection = "forward" | "back";

export function LessonStepFrame({
  direction,
  children,
}: {
  direction: StepDirection;
  children: React.ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const entering = reducedMotion
    ? FadeIn.duration(150)
    : (direction === "back" ? FadeInLeft : FadeInRight)
        .duration(DURATION.step)
        .easing(EASE_DRAWER);
  // The outgoing step is already unmounted when the direction changes, so it
  // leaves with a direction-neutral fade.
  const exiting = FadeOut.duration(reducedMotion ? 100 : 150);

  return (
    <Animated.View entering={entering} exiting={exiting} style={{ flex: 1 }}>
      {children}
    </Animated.View>
  );
}

export function LessonProgressFill({
  progress,
  style,
}: {
  /** 0..1 */
  progress: number;
  style: StyleProp<ViewStyle>;
}) {
  const reducedMotion = useReducedMotion();
  const value = useSharedValue(progress);

  useEffect(() => {
    value.value = withTiming(progress, {
      duration: reducedMotion ? 0 : DURATION.sheet,
      easing: EASE_DRAWER,
    });
  }, [progress, reducedMotion, value]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${value.value * 100}%`,
  }));

  return <Animated.View style={[style, animatedStyle]} />;
}
