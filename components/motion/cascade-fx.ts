/**
 * How the onboarding's question pages arrive, as a cascade (tier B: seen a few times in one sitting). The bar and the
 * Continue button never move; inside the page one thing follows another, each a short way (16 dp up, and a little
 * drift sideways the way the learner is going), fading up, ease-out, no springs:
 *
 *     40   the title rises
 *    160   Shrodi pops in (0.5 to 1 with a small overshoot)
 *    400   his bubble pops (0.35 to 1) and 250 ms later types
 *    300+  the options rise one by one, 80 ms apart (0.96 to 1 as they come)
 *    280+  the pitch's rows: the picture pops, 90 ms later its sentence rises, 170 ms from the row before
 *
 * `direction` is a shared value set before the step changes (1 on, -1 back, 0 for the first page, which arrives attached to
 * the hello page and so waits `lead` ms for that scroll to land). The leaving page just fades and drifts off in 150 ms.
 * Reduced motion: everything is simply there (`ReduceMotion.System`).
 */

import { Easing, ReduceMotion, withDelay, withTiming, type EntryExitAnimationFunction, type SharedValue } from "react-native-reanimated";

import { EASE_OUT } from "@/theme/motion";

export const PAGE_FX = {
  /** The first page waits this long for the strip to scroll it into place. */
  lead: 260,
  rise: 16,
  drift: 22,
  ms: 340,
  title: 40,
  fox: 160,
  bubble: 400,
  options: 300,
  optionStep: 80,
  rows: 280,
  rowStep: 170,
  rowSentenceLag: 90,
  out: 150,
} as const;

/** The extra wait for the first page, ms. */
export function leadFor(direction: number): number {
  "worklet";
  return direction === 0 ? PAGE_FX.lead : 0;
}

/** Fades up and rises (and drifts in from the side it is going to), `delay` ms after the page appears. */
export function riseIn(direction: SharedValue<number>, delay: number, from: number = 1): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const d = direction.get();
    const wait = delay + leadFor(d);
    const timing = { duration: PAGE_FX.ms, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    return {
      initialValues: { opacity: 0, transform: [{ translateX: d * PAGE_FX.drift }, { translateY: PAGE_FX.rise }, { scale: from }] },
      animations: {
        opacity: withDelay(wait, withTiming(1, timing), ReduceMotion.System),
        transform: [
          { translateX: withDelay(wait, withTiming(0, timing), ReduceMotion.System) },
          { translateY: withDelay(wait, withTiming(0, timing), ReduceMotion.System) },
          { scale: withDelay(wait, withTiming(1, timing), ReduceMotion.System) },
        ],
      },
    };
  };
}

/** A small pop for a character or a picture: grows from half size past 1 and back (the only overshoot in the cascade). */
export function popIn(direction: SharedValue<number>, delay: number): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const wait = delay + leadFor(direction.get());
    const grow = { duration: 380, easing: Easing.bezier(0.34, 1.56, 0.64, 1), reduceMotion: ReduceMotion.System };
    const fade = { duration: 140, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    return {
      initialValues: { opacity: 0, transform: [{ scale: 0.5 }] },
      animations: {
        opacity: withDelay(wait, withTiming(1, fade), ReduceMotion.System),
        transform: [{ scale: withDelay(wait, withTiming(1, grow), ReduceMotion.System) }],
      },
    };
  };
}

/** Shrodi's speech bubble arriving with the page: from 0.35 and a little left (where he stands), no overshoot. */
export function bubbleInAt(direction: SharedValue<number>, delay: number): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const wait = delay + leadFor(direction.get());
    const timing = { duration: 200, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    return {
      initialValues: { opacity: 0, transform: [{ translateX: -48 }, { scale: 0.35 }] },
      animations: {
        opacity: withDelay(wait, withTiming(1, { ...timing, duration: 40 }), ReduceMotion.System),
        transform: [
          { translateX: withDelay(wait, withTiming(0, timing), ReduceMotion.System) },
          { scale: withDelay(wait, withTiming(1, timing), ReduceMotion.System) },
        ],
      },
    };
  };
}

/** The page leaving: fades and drifts off the way the learner came from, quickly, while the next page begins. */
export function pageOut(direction: SharedValue<number>): EntryExitAnimationFunction {
  return () => {
    "worklet";
    const d = direction.get();
    const timing = { duration: PAGE_FX.out, easing: EASE_OUT, reduceMotion: ReduceMotion.System };
    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
      animations: { opacity: withTiming(0, timing), transform: [{ translateX: withTiming(-d * PAGE_FX.drift, timing) }] },
    };
  };
}
