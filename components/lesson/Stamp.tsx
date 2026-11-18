/**
 * Plays the stamp (timeline in `stamp-core.ts`) on whatever it wraps, `at` ms after it mounts.
 * Until then the child holds its place, invisible, so nothing shifts when it lands. With reduced
 * motion the child is simply there.
 */

import { useEffect, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from "react-native-reanimated";

import { STAMP_TOTAL, stampFrame } from "./stamp-core";

export function Stamp({ at, tilt = 1, style, children }: { at: number; tilt?: 1 | -1; style?: StyleProp<ViewStyle>; children: ReactNode }) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(reduced ? STAMP_TOTAL : 0);

  useEffect(() => {
    cancelAnimation(clock);
    if (reduced) {
      clock.set(STAMP_TOTAL);
      return;
    }
    clock.set(0);
    clock.set(withDelay(at, withTiming(STAMP_TOTAL, { duration: STAMP_TOTAL, easing: Easing.linear })));
    return () => cancelAnimation(clock);
  }, [at, reduced, clock]);

  const anim = useAnimatedStyle(() => {
    const f = stampFrame(clock.get(), tilt);
    return { opacity: f.opacity, transform: [{ rotate: `${f.rotate}deg` }, { scale: f.scale }] };
  });
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}
