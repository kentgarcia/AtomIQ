/**
 * The "wrong" shake, as pure maths (no React), unit-tested in `scripts/test-option-pop.mjs`: a short
 * side-to-side shake that dies away, three swings in 420 ms. It starts and ends at rest, so nothing
 * is left displaced.
 */

export const SHAKE = { total: 420, amplitude: 7, swings: 3 } as const;

/** Horizontal offset in dp at time `t` ms (0 outside the shake). */
export function shakeOffset(t: number): number {
  'worklet';
  if (t <= 0 || t >= SHAKE.total) return 0;
  const p = t / SHAKE.total;
  return SHAKE.amplitude * Math.sin(p * SHAKE.swings * Math.PI * 2) * (1 - p);
}
