/**
 * A one-shot clock that plays each time `trigger` CHANGES (and `active` is true), 0 to `total` ms,
 * linear. It does not play when the component mounts, whatever `trigger` is then (a state that is
 * already there is not news), and it rests on `total` (the finished frame) otherwise and with reduced
 * motion. A change that is not `active` (a reaction taken back, an item put down) rests it at once: it
 * never leaves a play frozen half way.
 */

import { useEffect, useRef } from "react";
import { Easing, cancelAnimation, useReducedMotion, useSharedValue, withTiming, type SharedValue } from "react-native-reanimated";

export function useTriggerClock(total: number, trigger: unknown, active: boolean = true): SharedValue<number> {
  const reduced = useReducedMotion();
  const clock = useSharedValue(total);
  const before = useRef(trigger);

  useEffect(() => {
    if (Object.is(before.current, trigger)) return;
    before.current = trigger;
    cancelAnimation(clock);
    if (!active || reduced) {
      clock.set(total);
      return;
    }
    clock.set(0);
    clock.set(withTiming(total, { duration: total, easing: Easing.linear }));
  }, [trigger, active, reduced, total, clock]);

  // Only on leaving: a restart is handled above, and cancelling there would freeze a play cut short by `active`
  useEffect(() => () => cancelAnimation(clock), [clock]);
  return clock;
}
