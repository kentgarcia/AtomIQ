/**
 * The first screen's drawing, as pure data (no React), so `scripts/test-onboarding.mjs` can check it
 * and `HelloStep.tsx` only draws it: the cloud edge between the coloured hero and the white sheet
 * (a few big circular humps in two layers, a pale one behind and a page-coloured one in front), and
 * the soft blobs behind Shrodi.
 */

import { bell, lerp, loop } from "../motion/motion-core.ts";

export const CLOUD = {
  /** How many scallops fit across the width (a bump's chord is `width / bumps`), so the cloud is a few big, low humps. */
  bumps: 3.5,
  /** A hump's rise over its chord: low and round, not tall. */
  rise: 0.34,
  /** How far the front layer sits below the back one, as a fraction of a hump's rise. */
  gap: 0.75,
  /** The first cusp's x, as a fraction of a chord left of the screen's edge, so the edge is never a cusp. */
  lead: 0.35,
} as const;

export interface CloudShape {
  /** Height of the box the two layers fill, dp. The front layer's cusps touch its bottom. */
  height: number;
  /** One hump's chord, rise and the radius of its arc, dp. */
  chord: number;
  rise: number;
  radius: number;
  /** Closed paths in the box's own coordinates: the pale layer behind, and the page-coloured layer in front of it. */
  back: string;
  front: string;
  /** The x of every cusp (where two humps meet). */
  cusps: number[];
}

const r2 = (n: number): number => Math.round(n * 100) / 100;

/** One layer: humps of circular arcs between sharp cusps at `cuspY`, closed down to `bottom`. */
function layer(xs: number[], cuspY: number, radius: number, bottom: number): string {
  let d = `M${r2(xs[0])} ${r2(bottom)}L${r2(xs[0])} ${r2(cuspY)}`;
  for (let i = 1; i < xs.length; i++) d += `A${r2(radius)} ${r2(radius)} 0 0 1 ${r2(xs[i])} ${r2(cuspY)}`;
  return `${d}L${r2(xs[xs.length - 1])} ${r2(bottom)}Z`;
}

/**
 * The cloud edge for a box `width` wide: big scallops (circular arcs of one radius, meeting in sharp
 * cusps) in two layers, the back one showing above the front by `gap`. Both layers share the same
 * outline, only shifted down, so it reads as one soft cloud with a pale rim. The hump count and
 * proportions are fractions of the width and the chord, so it looks the same on a phone and a tablet.
 */
export function cloudShape(width: number): CloudShape {
  const w = Math.max(1, width);
  const chord = w / CLOUD.bumps;
  const rise = chord * CLOUD.rise;
  const gap = rise * CLOUD.gap;
  // The circle through two cusps `chord` apart that rises `rise` between them
  const radius = (chord * chord) / 4 / (2 * rise) + rise / 2;
  const x0 = -chord * CLOUD.lead;
  const count = Math.ceil((w - x0) / chord);
  const cusps = Array.from({ length: count + 1 }, (_, i) => x0 + i * chord);
  const height = rise + gap;
  return {
    height,
    chord,
    rise,
    radius,
    back: layer(cusps, rise, radius, height),
    front: layer(cusps, rise + gap, radius, height),
    cusps,
  };
}

/** A soft organic blob as a closed path in a 100 x 100 box (the hero draws it scaled). Data, not code. */
export const HERO_BLOBS = {
  /** The big wave behind Shrodi, rising on the left and running off the right. */
  wave: "M-5 62C12 50 30 44 48 52S82 66 105 48V105H-5Z",
  /** The small round cloud of colour at the top right. */
  top: "M70 -5C84 -2 98 8 100 22S92 44 76 42S54 34 56 18S58 -8 70 -5Z",
} as const;

/**
 * The first screen's sky: the quietest life that still reads as a sky. Two pale clouds drift slowly
 * across the hero (about 10 dp a second, behind Shrodi) and the three sparkles twinkle on their own
 * slow beats. One loop clock of `SKY.period` ms drives all of it; every period divides it, so the
 * loop closes without a jump. Frame 0 is a good drawing (everything placed), which is what reduced
 * motion and an off-screen page show.
 */
export const SKY = {
  period: 240000,
  clouds: [
    { period: 48000, phase: 0.15, y: 0.14, width: 120, opacity: 0.2 },
    { period: 80000, phase: 0.6, y: 0.36, width: 160, opacity: 0.14 },
  ],
  twinkles: [
    { period: 4000, phase: 0 },
    { period: 5000, phase: 0.4 },
    { period: 6000, phase: 0.75 },
  ],
  twinkleScale: [0.7, 1],
  twinkleOpacity: [0.45, 1],
} as const;

/** The left edge of cloud `i` at time `t` on a hero `heroWidth` wide: it enters off the left and leaves off the right. */
export function skyCloudX(t: number, i: number, heroWidth: number): number {
  'worklet';
  const c = SKY.clouds[i];
  return lerp(-c.width, heroWidth, loop(t, c.period, c.phase));
}

/** Sparkle `i` at time `t`: swells and fades up and back on its own beat. */
export function twinkleFrame(t: number, i: number): { scale: number; opacity: number } {
  'worklet';
  const k = SKY.twinkles[i];
  const b = bell(loop(t, k.period, k.phase));
  return { scale: lerp(SKY.twinkleScale[0], SKY.twinkleScale[1], b), opacity: lerp(SKY.twinkleOpacity[0], SKY.twinkleOpacity[1], b) };
}
