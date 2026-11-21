// motion.ts: the motion engine for living illustrations (react-native-reanimated 3/4).
//
// Everything that moves reads a clock: a looping clock for idle life, a one-shot
// clock for a scene that tells an action. Values come from keyframe tracks and a
// few shaping helpers (motion-core.ts), all worklets, so they run on the UI thread.
import { useEffect } from 'react';
import { Easing, cancelAnimation, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';

import { useIdleStill } from './use-reduced-motion';
import { easeIn, easeInOut, easeOut } from './motion-core';

export * from './motion-core';

// Curves for `withTiming`: the same pure curves the tracks use.
/** Things that travel (gaze, sway, a head turning, a lid closing). */
export const EASE_IN_OUT = easeInOut;
/** Things that open or arrive (a mouth, a lid reopening, a prop appearing). */
export const EASE_OUT = easeOut;
/** Only for things leaving or falling away. */
export const EASE_IN = easeIn;

/**
 * A looping clock from 0 to `period` ms. Frozen at 0 when `live` is false
 * (reduced motion, off screen, hidden) or when the animation level is not max: frame 0 must be a good drawing.
 */
export function useLoopClock(period: number, live: boolean): SharedValue<number> {
  const clock = useSharedValue(0);
  // A loop runs on its own, so it runs only at the "max" animation level (not at "reduced" or "off", nor with the system's reduced motion)
  const still = useIdleStill();
  const run = live && !still;
  useEffect(() => {
    cancelAnimation(clock);
    // withRepeat restarts from the CURRENT value: always reset first.
    clock.value = 0;
    if (!run) return;
    clock.value = withRepeat(withTiming(period, { duration: period, easing: Easing.linear }), -1);
    return () => cancelAnimation(clock);
  }, [run, period, clock]);
  return clock;
}

/**
 * A clock that plays ONCE from 0 to `duration` ms when `play` turns true, and
 * holds at the end (a scene that tells an action, a chart drawing itself on).
 * With reduced motion it jumps straight to the end: the final frame is the one
 * that carries meaning, so it must read on its own.
 */
export function useOneShotClock(duration: number, play: boolean, reduced: boolean): SharedValue<number> {
  const clock = useSharedValue(reduced ? duration : 0);
  useEffect(() => {
    cancelAnimation(clock);
    if (!play) {
      clock.value = 0;
      return;
    }
    if (reduced) {
      clock.value = duration;
      return;
    }
    clock.value = 0;
    clock.value = withTiming(duration, { duration, easing: Easing.linear });
    return () => cancelAnimation(clock);
  }, [play, reduced, duration, clock]);
  return clock;
}
