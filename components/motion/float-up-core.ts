/**
 * The little icons that float up out of a reaction pill when it is chosen, as pure maths (no React),
 * unit-tested in `scripts/test-feedback-fx.mjs`. `FloatUp.tsx` draws them.
 *
 * One clock in ms, played once on the choosing:
 *
 *   icon i starts at `i * step`, lives `life` ms:
 *     rises `rise` px (ease-out) while it grows from 60% to full size and then shrinks a little,
 *     fades in over 60 ms and out over the last 45% of its life.
 *
 * Each one has its own sideways spot and turn, from `seeded`, never random per frame. Frame 0 and the
 * last frame show nothing.
 */

import { clamp01, easeOut, lerp, seeded } from "./motion-core.ts";

export const FLOAT = { count: 3, step: 70, life: 380, rise: 24, spread: 9 } as const;
/** When the whole float is over. */
export const FLOAT_TOTAL = (FLOAT.count - 1) * FLOAT.step + FLOAT.life;

export interface FloatFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Degrees. */
  rotate: number;
}

const GONE: FloatFrame = { x: 0, y: 0, scale: 0.6, opacity: 0, rotate: 0 };

/** Icon `i` at time `t` of the float. */
export function floatFrame(i: number, t: number): FloatFrame {
  'worklet';
  const { step, life, rise, spread, count } = FLOAT;
  const local = t - i * step;
  const p = clamp01(local / life);
  if (local <= 0 || p >= 1) return GONE;
  const x = (i - (count - 1) / 2) * spread + (seeded(i, 31) - 0.5) * 6;
  return {
    x,
    y: -rise * easeOut(p),
    scale: lerp(0.6, 1, easeOut(clamp01(p / 0.3))) * lerp(1, 0.8, p),
    opacity: clamp01(local / 60) * (1 - clamp01((p - 0.55) / 0.45)),
    rotate: lerp(-12, 12, seeded(i, 32)) * p,
  };
}
