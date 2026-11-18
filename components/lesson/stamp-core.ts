/**
 * The stamp, as pure maths (no React), so the timeline is unit-tested (`scripts/test-stamp.mjs`)
 * and `Stamp.tsx` only draws it. Used on the finish screen for the title, the line under it and
 * each earned star: the thing is held big and slightly tilted above the page, drops onto it
 * (accelerating, like a hand), squashes a little on contact and settles.
 *
 *     0 .. 140   falls from `fromScale` to 1 and straightens, fading in over the first 60 ms
 *   140 .. 240   squashes to `squash` on impact
 *   240 .. 400   settles back to 1
 *
 * Frame 0 is invisible (it is waiting for its turn) and the last frame is the plain, finished
 * element, so reduced motion simply shows the end.
 */

import { clamp01, easeIn, easeOut, lerp } from "../motion/motion-core.ts";

export const STAMP = {
  fallEnd: 140,
  squashEnd: 240,
  settleEnd: 400,
  fromScale: 1.6,
  /** Degrees; the sign is flipped per element so a row of stamps does not lean the same way. */
  fromTilt: -7,
  squash: 0.94,
  fadeIn: 60,
} as const;

/** How long one stamp lasts. */
export const STAMP_TOTAL = STAMP.settleEnd;
/** When the stamp touches down, ms into its own clock (rings and sounds hang off this). */
export const STAMP_LANDS = STAMP.fallEnd;

/** When each stamped piece of the finish screen starts, ms after the screen appears. */
export const FINISH_STAMPS = { title: 300, message: 560, stars: 820, starStep: 200 } as const;

export interface StampFrame {
  opacity: number;
  scale: number;
  /** Degrees. */
  rotate: number;
}

/** The stamp at time `t`. `tilt` is 1 or -1: which way it leans while falling. */
export function stampFrame(t: number, tilt: 1 | -1 = 1): StampFrame {
  'worklet';
  const { fallEnd, squashEnd, settleEnd, fromScale, fromTilt, squash, fadeIn } = STAMP;
  const fall = easeIn(clamp01(t / fallEnd));
  let scale: number;
  if (t < fallEnd) scale = lerp(fromScale, 1, fall);
  else if (t < squashEnd) scale = lerp(1, squash, easeOut(clamp01((t - fallEnd) / (squashEnd - fallEnd))));
  else scale = lerp(squash, 1, easeOut(clamp01((t - squashEnd) / (settleEnd - squashEnd))));
  return { opacity: clamp01(t / fadeIn), scale, rotate: fromTilt * tilt * (1 - fall) + 0 }; // + 0 turns -0 into 0
}
