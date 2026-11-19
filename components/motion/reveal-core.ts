/**
 * Three small timelines the celebrations share, as pure maths (no React), unit-tested in
 * `scripts/test-burst.mjs`: a plain reveal (a line that arrives after the hero), a count between
 * two numbers, and the pulse a number gives as it lands. They are tier A/B pieces: nothing here
 * bounces, nothing starts from scale 0.
 *
 *   reveal   0 .. 220   fades in while rising 10 px, ease-out (the same feel as the feedback sheet)
 *   count    from..to   whole numbers only, easing out so the last digits are readable
 *   pulse    0 .. 220   1 to 1.12 to 1 (`bell`)
 *
 * Frame 0 of a reveal is not there yet; the last frame is the plain element.
 */

import { bell, clamp01, easeOut, lerp } from "./motion-core.ts";

export const REVEAL = { ms: 220, rise: 10 } as const;
export const PULSE = { ms: 220, amount: 0.12 } as const;

export interface RevealFrame {
  opacity: number;
  /** px, positive = lower than its place. */
  y: number;
}

/** A line arriving: `t` is ms since it was due. */
export function revealFrame(t: number): RevealFrame {
  'worklet';
  const p = easeOut(clamp01(t / REVEAL.ms));
  return { opacity: p, y: lerp(REVEAL.rise, 0, p) };
}

/** The counted number at time `t` (ms since the count began): `from` until it starts, `to` once it is over. */
export function countBetween(t: number, from: number, to: number, duration: number): number {
  'worklet';
  const p = easeOut(clamp01(t / Math.max(1, duration)));
  return Math.round(lerp(from, to, p));
}

/** The scale of a number that has just landed: 1 at rest, up by `PULSE.amount` in the middle of `PULSE.ms`. */
export function pulseScale(t: number): number {
  'worklet';
  return 1 + PULSE.amount * bell(clamp01(t / PULSE.ms));
}
