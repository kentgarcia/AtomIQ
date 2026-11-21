/**
 * The phone's power-on moment as a pure timeline, no React, tested in `scripts/test-phone-boot.mjs`.
 * `PhoneBoot.tsx` draws it. It plays only on the very first open of the phone, and it is the phone's loading:
 * the icon grid (the heavy part, a 230 to 280 ms frame on a slow phone) is mounted behind it while nothing moves.
 *
 * One linear clock in ms, in two runs with a stall between them:
 *
 *      0 ..  250   a dark screen (the power button was pressed)
 *    250 ..  700   the logo pops in: 60% up past full size and back to 100%
 *    550 ..  850   the name rises in under it
 *    700 ..  900   the progress track fades in
 *    800 .. 1300   the bar fills to 60%  ................ the clock STOPS at `holdAt` (1300)
 *                  the screen mounts the icon grid here, with the logo and bar held still; the clock runs on once the grid is laid out
 *   1300 .. 1600   the bar fills to 100%
 *   1750 .. 2100   the screen wakes: the logo swells a little and the dark lifts to show the home screen
 *                  (the first app starts installing at `revealAt`, as the dark begins to lift)
 *
 * Nothing in it is a layout animation: opacity and transforms only (the bar is a fill slid under a clip, never an animated width).
 */

import { clamp01, easeIn, easeOut, lerp, seg } from "../motion/motion-core.ts";

export const BOOT = {
  logoAt: 250,
  logoEnd: 700,
  wordAt: 550,
  wordEnd: 850,
  trackAt: 700,
  trackEnd: 900,
  fillAt: 800,
  /** The clock stops here until the grid is on screen. The bar is at `stallFill`. */
  holdAt: 1300,
  stallFill: 0.6,
  fillEnd: 1600,
  /** The dark begins to lift, and the install moments start. */
  liftAt: 1750,
  revealAt: 1750,
  total: 2100,
  /** How big the logo swells while the screen wakes. */
  logoScaleOut: 1.14,
} as const;

/** How far the name rises while it arrives, dp. */
export const WORD_RISE = 8;

export interface BootFrame {
  /** The whole dark screen's opacity: 1 until the lift, then 0. */
  screen: number;
  /** The logo's scale (0 before it pops in) and opacity. */
  logo: number;
  logoOpacity: number;
  /** The name's opacity and its offset below its place, dp (rises to 0). */
  word: number;
  wordY: number;
  /** The progress track's opacity. */
  track: number;
  /** How full the bar is, 0 to 1. */
  fill: number;
}

const BEFORE: BootFrame = { screen: 1, logo: 0, logoOpacity: 0, word: 0, wordY: WORD_RISE, track: 0, fill: 0 };
const AFTER: BootFrame = { screen: 0, logo: BOOT.logoScaleOut, logoOpacity: 0, word: 0, wordY: 0, track: 0, fill: 1 };

/** Every value of the power-on at clock time `t` (ms). */
export function bootFrame(t: number): BootFrame {
  'worklet';
  if (t <= 0) return BEFORE;
  if (t >= BOOT.total) return AFTER;

  const pop = clamp01((t - BOOT.logoAt) / (BOOT.logoEnd - BOOT.logoAt));
  // 0.6 up to 1.08 in the first 55% of the pop, then back to 1 (the same pop as an app's install)
  const split = 0.55;
  const popScale = t < BOOT.logoAt ? 0 : pop < split ? lerp(0.6, 1.08, easeOut(pop / split)) : lerp(1.08, 1, easeOut((pop - split) / (1 - split)));

  const lift = clamp01((t - BOOT.liftAt) / (BOOT.total - BOOT.liftAt));
  const fill =
    t < BOOT.holdAt
      ? BOOT.stallFill * seg(t, BOOT.fillAt, BOOT.holdAt, 'inOut')
      : lerp(BOOT.stallFill, 1, seg(t, BOOT.holdAt, BOOT.fillEnd));

  return {
    screen: 1 - easeOut(lift),
    logo: popScale * lerp(1, BOOT.logoScaleOut, easeIn(lift)),
    logoOpacity: seg(t, BOOT.logoAt, BOOT.logoAt + 150) * (1 - easeOut(lift)),
    word: seg(t, BOOT.wordAt, BOOT.wordEnd) * (1 - easeOut(lift)),
    wordY: lerp(WORD_RISE, 0, seg(t, BOOT.wordAt, BOOT.wordEnd)),
    track: seg(t, BOOT.trackAt, BOOT.trackEnd) * (1 - easeOut(lift)),
    fill,
  };
}
