/**
 * A one-shot clock that waits `delay` ms, then plays from 0 to `total` ms, linear (the curves live
 * in the cores, see `.claude/skills/duolingo-motion-style` §3.2). It rests on `total`, the finished
 * frame, whenever it is not playing and with reduced motion, so a moment that does not play is
 * simply shown as it ends. `restart` replays it: change it to start the show again.
 */

import { useEffect } from "react";
import { Easing, cancelAnimation, useReducedMotion, useSharedValue, withDelay, withTiming, type SharedValue } from "react-native-reanimated";

export function useDelayedClock(total: number, delay: number, play: boolean = true, restart: unknown = 0): SharedValue<number> {
  const reduced = useReducedMotion();
  const clock = useSharedValue(play && !reduced ? 0 : total);

  useEffect(() => {
    cancelAnimation(clock);
    if (!play || reduced) {
      clock.set(total);
      return;
    }
    clock.set(0);
    clock.set(withDelay(Math.max(0, delay), withTiming(total, { duration: total, easing: Easing.linear })));
    return () => cancelAnimation(clock);
  }, [play, reduced, total, delay, restart, clock]);

  return clock;
}
