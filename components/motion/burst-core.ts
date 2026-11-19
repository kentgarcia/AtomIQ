/**
 * The burst round a hero element, as pure maths (no React), so the timeline is unit-tested
 * (`scripts/test-burst.mjs`) and `Burst.tsx` only draws it. It is the star burst of the finish
 * screen's stat reveal (`stat-reveal-core.ts`) taken out on its own, for things that do not end by
 * gathering into a tile: a crown, a badge, a flame.
 *
 * One clock, in ms, starts at the beat the burst hangs off (the hero's contact):
 *
 *     0 .. 360   small stars fly out from the middle (ease-out) and keep turning
 *   360 .. 620   they hang, each drifting a little on its own phase
 *   620 .. 900   they shrink and fade
 *     0 .. 420   a ring flashes round the hero (1x to 1.35x, fading)
 *    60 .. 480   two bigger stars twinkle on opposite corners
 *
 * Every value is a function of the clock and the star's index (`seeded`), never random per frame.
 * Offsets are px from the middle of the hero. Frame 0 shows nothing, and so does the last frame,
 * so the burst leaves nothing behind (and reduced motion simply does not draw it).
 */

import { bell, clamp01, easeOut, lerp, seeded } from "./motion-core.ts";

export const BURST = {
  count: 6,
  outMs: 360,
  hangEnd: 620,
  total: 900,
  /** How far the stars sit from the middle at their widest, px. */
  reach: 56,
  ringMs: 420,
  ringTo: 1.35,
  twinkleStart: 60,
  twinkleEnd: 480,
} as const;

export interface BurstStarFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Degrees. */
  rotate: number;
}

const NONE: BurstStarFrame = { x: 0, y: 0, scale: 0.5, opacity: 0, rotate: 0 };

/** Star `i` of `count` at time `t`: out, hang with a small drift, then shrink and fade. */
export function burstStar(i: number, t: number, reach: number = BURST.reach, count: number = BURST.count): BurstStarFrame {
  'worklet';
  const { outMs, hangEnd, total } = BURST;
  if (t <= 0 || t >= total) return NONE;
  // Spread round the circle with a little seeded wobble so they do not look stamped
  const angle = ((i + 0.35 * seeded(i, 21)) / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
  const far = reach * lerp(0.8, 1.15, seeded(i, 22));
  const out = easeOut(clamp01(t / outMs));
  const fade = clamp01((t - hangEnd) / (total - hangEnd));
  const drift = Math.sin((t / 700 + seeded(i, 23)) * Math.PI * 2) * 3 * clamp01((t - outMs) / 120);
  const r = (far + drift) * out;
  const size = lerp(0.8, 1.15, seeded(i, 24));
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
    scale: lerp(0.6, 1, out) * size * lerp(1, 0.4, fade),
    opacity: clamp01(t / 50) * (1 - fade),
    rotate: lerp(-25, 25, seeded(i, 25)) * out,
  };
}

/** The ring that flashes round the hero: `scale` grows, `opacity` fades to nothing. */
export function burstRing(t: number): { scale: number; opacity: number } {
  'worklet';
  const p = clamp01(t / BURST.ringMs);
  if (t <= 0 || p >= 1) return { scale: 1, opacity: 0 };
  return { scale: lerp(1, BURST.ringTo, easeOut(p)), opacity: 0.85 * (1 - easeOut(p)) };
}

/** The two bigger stars on opposite corners (0 top-right, 1 bottom-left): they grow, hang and go, turning slowly. */
export function burstTwinkle(i: 0 | 1, t: number): { scale: number; opacity: number; rotate: number } {
  'worklet';
  const { twinkleStart, twinkleEnd } = BURST;
  // The second one trails the first by 70 ms
  const p = clamp01((t - twinkleStart - i * 70) / (twinkleEnd - twinkleStart - 70));
  if (p <= 0 || p >= 1) return { scale: 0.5, opacity: 0, rotate: 0 };
  const b = bell(p);
  return { scale: lerp(0.5, 1.1, b), opacity: b, rotate: lerp(-20, 20, p) * (i === 0 ? 1 : -1) };
}
