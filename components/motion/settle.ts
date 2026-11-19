/**
 * `entering={settle(delay)}` for an `Animated.View`: the quiet page entrance (timeline in
 * `settle-core.ts`): fade in and rise 12 dp over 220 ms, ease-out, no spring. `delay` is ms (or
 * `settleDelay(i)` for the i-th block). With the system's reduced motion the block is simply there.
 * Use it instead of `FadeInDown...springify()`.
 */

import { ReduceMotion, withDelay, withTiming, type EntryExitAnimationFunction } from "react-native-reanimated";

import { SETTLE } from "@/components/motion/settle-core";
import { EASE_OUT } from "@/theme/motion";

let skipping = false;

/**
 * While true, `settle` blocks that mount simply appear (no fade, no rise). Onboarding sets it while the next step
 * rides up attached to the hello page, so the page arrives whole instead of fading in on its way.
 */
export function skipSettle(on: boolean): void {
  skipping = on;
}

export function settle(delay: number = 0): EntryExitAnimationFunction {
  const wait = Math.max(0, delay);
  if (skipping) {
    return () => {
      "worklet";
      return { initialValues: { opacity: 1, transform: [{ translateY: 0 }] }, animations: { opacity: 1, transform: [{ translateY: 0 }] } };
    };
  }
  return () => {
    "worklet";
    const timing = { duration: SETTLE.ms, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    return {
      initialValues: { opacity: 0, transform: [{ translateY: SETTLE.rise }] },
      animations: {
        opacity: withDelay(wait, withTiming(1, timing), ReduceMotion.System),
        transform: [{ translateY: withDelay(wait, withTiming(0, timing), ReduceMotion.System) }],
      },
    };
  };
}
