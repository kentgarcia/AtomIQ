/**
 * The page entrance that replaces `FadeInDown.springify()` (tier A, `.claude/skills/duolingo-motion-style`):
 * opacity and a 12 dp rise over 220 ms, ease-out, no spring and no overshoot, each block 60 ms after
 * the one before it. A page is seen constantly, so it must be quiet and done before the eye gets there;
 * past the 8th block everything arrives together so a long list never makes the learner wait
 * (`settleDelay` caps at `maxStaggered`; a screen that starts its page later adds its own base to it).
 * Framework-free; `settle.ts` draws it, `scripts/test-settle.mjs` checks it.
 */

export const SETTLE = { ms: 220, rise: 12, step: 60, maxStaggered: 8 } as const;

/** Delay of the `i`-th block (0-based), ms. */
export function settleDelay(i: number): number {
  return Math.min(Math.max(0, Math.floor(i)), SETTLE.maxStaggered) * SETTLE.step;
}
