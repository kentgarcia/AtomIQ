/**
 * Shakes whatever it wraps (cards/shake-core.ts) each time `active` turns true. A state that is
 * already active when it first appears does not shake. Reduced motion never shakes.
 */

import { useEffect, useRef, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { SHAKE, shakeOffset } from "./cards/shake-core";

/** A shared value that plays the shake clock whenever `active` turns true (not on first appearance). */
export function useShakeClock(active: boolean) {
  const reduced = useReducedMotion();
  const clock = useSharedValue<number>(SHAKE.total);
  const was = useRef(active);
  useEffect(() => {
    const before = was.current;
    was.current = active;
    if (reduced || before || !active) return;
    cancelAnimation(clock);
    clock.set(0);
    clock.set(withTiming(SHAKE.total, { duration: SHAKE.total, easing: Easing.linear }));
    return () => cancelAnimation(clock);
  }, [active, reduced, clock]);
  return clock;
}

export function Shake({ active, style, children }: { active: boolean; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const clock = useShakeClock(active);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateX: shakeOffset(clock.get()) }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
