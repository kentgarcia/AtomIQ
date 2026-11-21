/**
 * A line or a button that arrives after the hero (timeline in `reveal-core.ts`): it fades in while
 * rising 10 px, `at` ms after it mounts, and holds its room the whole time so nothing shifts.
 * `blockUntilShown` keeps it from taking a touch before it can be seen (the button of a dialog);
 * it never waits for more than its own `at`. With reduced motion it is simply there.
 */

import { useEffect, useState, type ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

import { useDelayedClock } from "@/components/motion/use-delayed-clock";
import { REVEAL, revealFrame } from "@/components/motion/reveal-core";

export function Reveal({ at, style, blockUntilShown = false, children }: { at: number; style?: StyleProp<ViewStyle>; blockUntilShown?: boolean; children: ReactNode }) {
  const reduced = useReducedMotion();
  const clock = useDelayedClock(REVEAL.ms, at);
  const [timedOut, setTimedOut] = useState(false);
  // Shown once its time has come (at once with reduced motion or no wait)
  const live = reduced || at <= 0 || timedOut;

  useEffect(() => {
    if (reduced || at <= 0) return;
    const id = setTimeout(() => setTimedOut(true), at);
    return () => clearTimeout(id);
  }, [reduced, at]);

  const anim = useAnimatedStyle(() => {
    const f = revealFrame(clock.get());
    return { opacity: f.opacity, transform: [{ translateY: f.y }] };
  });
  return (
    <Animated.View style={[style, anim]} pointerEvents={blockUntilShown && !live ? "none" : "auto"}>
      {children}
    </Animated.View>
  );
}
