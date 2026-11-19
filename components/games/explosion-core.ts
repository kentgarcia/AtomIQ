/**
 * The explosion that ends a lost Myth Buster round, as pure maths (no React), so the timeline is
 * unit-tested (`scripts/test-explosion.mjs`) and `Explosion.tsx` only draws it. It is the language
 * of the other earned moments (one linear clock in ms, curves in here, flat colour, a hang before the
 * leave) turned to a bad one: a hit, a blast that overshoots then settles, rings, debris, a stamped BOOM.
 *
 *      0 ..  90   a flash of light (up fast, gone by 260)
 *      0 .. 170   the spiky blast pops past full size, settles by 290; the inner blast trails it by 40 ms
 *      0 .. 150   the white core pops, gone by 480
 *     60 .. 620   two shock rings run out (the second 110 ms behind the first)
 *      0 .. 1000  debris flies out on arcs, spinning, and fades
 *    140 .. 400   BOOM! drops in tilted (stamp) and holds
 *    650 .. 1100  the blast swells and fades, the dim lifts, BOOM! goes
 *      0 .. 460   the screen shakes, dying away
 *
 * Every value is a function of the clock and the piece's index (`seeded`), never random per frame.
 * Frame 0 and the last frame show nothing, so the moment leaves nothing behind.
 */

import { clamp01, easeIn, easeOut, lerp, seeded, track } from "../motion/motion-core.ts";

export const EXPLOSION = {
  total: 1100,
  debrisCount: 14,
  ringCount: 2,
  /** How far the debris flies at most, px. */
  reach: 190,
  /** Radius of the blast at full size, px. */
  blastRadius: 120,
} as const;

export interface ExplosionFrame {
  flash: number;
  dim: number;
  blastScale: number;
  blastOpacity: number;
  /** Degrees. */
  blastRotate: number;
  innerScale: number;
  coreScale: number;
  coreOpacity: number;
  labelScale: number;
  labelOpacity: number;
  /** Degrees. */
  labelRotate: number;
}

const OFF: ExplosionFrame = {
  flash: 0,
  dim: 0,
  blastScale: 0,
  blastOpacity: 0,
  blastRotate: 0,
  innerScale: 0,
  coreScale: 0,
  coreOpacity: 0,
  labelScale: 1,
  labelOpacity: 0,
  labelRotate: 0,
};

/** The blast, core, flash, dim and label at time `t`. */
export function explosionFrame(t: number): ExplosionFrame {
  'worklet';
  const { total } = EXPLOSION;
  if (t <= 0 || t >= total) return OFF;
  const leave = clamp01((t - 650) / 450);
  const swell = lerp(1, 1.5, easeOut(leave));
  // Pops past full size, settles
  const pop = track(t, [
    [0, 0.15],
    [170, 1.22, 'out'],
    [290, 1, 'out'],
  ]);
  const innerPop = track(t, [
    [40, 0.1],
    [210, 1.12, 'out'],
    [320, 0.92, 'out'],
  ]);
  // BOOM! drops in big and tilted, lands, holds, then goes with the rest
  const fall = easeIn(clamp01((t - 140) / 130));
  const land = t < 270 ? lerp(1.9, 1, fall) : lerp(0.9, 1, easeOut(clamp01((t - 270) / 130)));
  return {
    flash: t < 90 ? lerp(0, 0.85, clamp01(t / 90)) : 0.85 * (1 - easeOut(clamp01((t - 90) / 170))),
    dim: 0.5 * easeOut(clamp01(t / 140)) * (1 - easeOut(leave)),
    blastScale: pop * swell,
    blastOpacity: 1 - easeOut(clamp01((t - 700) / 400)),
    blastRotate: lerp(-10, 14, easeOut(clamp01(t / 700))),
    innerScale: innerPop * swell,
    coreScale: track(t, [
      [0, 0.1],
      [150, 1, 'out'],
      [480, 1.25, 'out'],
    ]),
    coreOpacity: 1 - clamp01((t - 300) / 180),
    labelScale: t < 140 ? 1.9 : land,
    labelOpacity: clamp01((t - 140) / 60) * (1 - clamp01((t - 950) / 150)),
    labelRotate: lerp(-14, -6, easeOut(clamp01((t - 140) / 260))),
  };
}

/** Shock ring `i`: it runs out from the blast, thin, and fades. */
export function explosionRing(i: number, t: number): { scale: number; opacity: number } {
  'worklet';
  const p = clamp01((t - 60 - i * 110) / 560);
  if (p <= 0 || p >= 1) return { scale: 0.4, opacity: 0 };
  return { scale: lerp(0.4, 2.7, easeOut(p)), opacity: 0.9 * (1 - easeOut(p)) };
}

export interface DebrisFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Degrees. */
  rotate: number;
}

const NO_DEBRIS: DebrisFrame = { x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 };

/** Debris piece `i`: flung out on an arc (it flies fast, then gravity takes it), spinning, shrinking as it fades. */
export function explosionDebris(i: number, t: number): DebrisFrame {
  'worklet';
  const { debrisCount, reach } = EXPLOSION;
  const life = 780 + seeded(i, 31) * 220;
  if (t <= 0 || t >= life) return NO_DEBRIS;
  const angle = ((i + 0.4 * seeded(i, 32)) / debrisCount) * Math.PI * 2;
  const far = reach * lerp(0.55, 1, seeded(i, 33));
  const out = easeOut(clamp01(t / 520));
  const p = clamp01(t / life);
  const fall = 70 * p * p;
  const size = lerp(0.7, 1.3, seeded(i, 34));
  return {
    x: Math.cos(angle) * far * out,
    y: Math.sin(angle) * far * out + fall,
    scale: size * lerp(1, 0.3, easeIn(p)),
    opacity: clamp01(t / 40) * (1 - easeIn(clamp01((p - 0.55) / 0.45))),
    rotate: lerp(-200, 200, seeded(i, 35)) * out,
  };
}

/** How far the whole screen is thrown at time `t`, px: hard at first, dying away. */
export function explosionShake(t: number): { x: number; y: number } {
  'worklet';
  if (t <= 0 || t >= 460) return { x: 0, y: 0 };
  const decay = (1 - t / 460) * (1 - t / 460);
  return { x: Math.sin(t * 0.11) * 11 * decay, y: Math.cos(t * 0.083 + 1) * 8 * decay };
}

/**
 * The outline of a spiky blast in a box centred on (0, 0): `points` spikes alternating between
 * `outer` and `inner` radius, with a little seeded variety in each spike's length. Draw it with a
 * round join so the tips are soft (flat colour, the style of the rest of the app).
 */
export function starburstPath(points: number, outer: number, inner: number, salt = 0): string {
  const parts: string[] = [];
  for (let k = 0; k < points * 2; k++) {
    const spike = k % 2 === 0;
    const r = spike ? outer * lerp(0.86, 1, seeded(k, 40 + salt)) : inner;
    const a = (k / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    parts.push(`${k === 0 ? "M" : "L"}${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `${parts.join(" ")} Z`;
}

