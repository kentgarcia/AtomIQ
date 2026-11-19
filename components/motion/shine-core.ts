/**
 * The band of light that waits on a main button (the finish screen's stat tiles have the same one), as
 * pure maths (no React), unit-tested in `scripts/test-feedback-fx.mjs`. `ShineSweep.tsx` draws it.
 *
 * One looping clock, `period` ms long, starts `firstDelay` ms after the button is shown:
 *
 *     0 .. 700    a slanted band crosses the face left to right (ease-in-out), one sweep
 *   700 .. 4600   rest
 *
 * The band is `bandWidth` of the face wide, leans `lean` degrees, and starts and ends fully outside the
 * face, so frame 0 and the rest show nothing. A quiet idle loop, only ever on the one button that is
 * waiting to be pressed.
 */

export const SHINE = {
  sweepMs: 700,
  periodMs: 4600,
  /** A look at the button before the first sweep. */
  firstDelay: 2000,
  /** The band's width as a fraction of the face's width. */
  bandWidth: 0.34,
  /** How far the bottom of the band leans behind its top, degrees. */
  lean: 18,
} as const;

/** The band at `t` ms into its period: its left edge as a fraction of the face's width, and whether it is on. */
export function shineFrame(t: number): { left: number; opacity: number } {
  'worklet';
  const { sweepMs, bandWidth } = SHINE;
  const p = t / sweepMs;
  if (!(p > 0 && p < 1)) return { left: -bandWidth * 1.5, opacity: 0 };
  // Quadratic ease-in-out
  const e = p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
  return { left: -bandWidth * 1.5 + e * (1 + bandWidth * 3), opacity: 1 };
}
