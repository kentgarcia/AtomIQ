/**
 * The claim animation of a quest, as pure maths (no React), so the timeline is unit-tested
 * (`scripts/test-claim-fx.mjs`) and `ClaimFx.tsx` only draws it.
 *
 * One clock, in ms, plays once when "Claim" is pressed:
 *
 *   0 ........ 850    the quest bar slowly fills with the brand yellow; sparkles stream off its front
 *   800 ... 1300      the bar ends in a burst of sparkles
 *   1050 .. 1450      XP coins pop out of the bar and scatter
 *   1450 .. 2520      the coins are pulled to the bottom right one after another, speeding up like a
 *                     magnet; each one that lands makes a ring at the target
 *   2140              the claim is saved (XP is awarded as the first coin lands)
 *
 * Every position is a function of the clock and the index of the particle (`seeded`), never random
 * per frame. Offsets are in px relative to the middle of the quest bar; the target is given the
 * same way.
 */

import { bell, clamp01, easeIn, easeInOut, easeOut, lerp, loop, seeded } from "../motion/motion-core.ts";

export const CLAIM_FX = {
  fillEnd: 850,
  burstStart: 800,
  burstEnd: 1300,
  scatterStart: 1050,
  scatterEnd: 1450,
  magnetStart: 1450,
  magnetStagger: 60,
  magnetDuration: 650,
  xpCount: 8,
  burstCount: 12,
  streamCount: 6,
  /** Life of one sparkle on the fill's front. */
  streamLife: 380,
} as const;

/** When the first coin lands. */
export const FIRST_LANDING = CLAIM_FX.magnetStart + CLAIM_FX.magnetDuration;
/** When the claim is saved: the moment the first coin lands. */
export const CLAIM_AT = FIRST_LANDING;
/** When the last coin has landed and its ring (320 ms) has faded. */
export const CLAIM_TOTAL =
  CLAIM_FX.magnetStart + (CLAIM_FX.xpCount - 1) * CLAIM_FX.magnetStagger + CLAIM_FX.magnetDuration + 340;

/** How long a flight of `count` coins lasts: the last coin's landing ring has faded. */
export function flightTotal(count: number): number {
  return CLAIM_FX.magnetStart + (Math.max(1, count) - 1) * CLAIM_FX.magnetStagger + CLAIM_FX.magnetDuration + 340;
}

/**
 * A flight that does not follow a quest bar's fill (the chest's diamonds) starts its clock this
 * far in, so the coins pop out straight away instead of after the fill's 1 s.
 */
export const SKIP_FILL = CLAIM_FX.scatterStart - 60;

export interface Point {
  x: number;
  y: number;
}

export interface Frame extends Point {
  scale: number;
  opacity: number;
}

const HIDDEN: Frame = { x: 0, y: 0, scale: 1, opacity: 0 };

/** How full the claim fill is, 0 to 1: it eases in and out so it fills slowly, then settles. */
export function fillAmount(t: number): number {
  'worklet';
  return easeInOut(clamp01(t / CLAIM_FX.fillEnd));
}

/**
 * A sparkle streaming off the front of the fill. `width` and `height` are the bar's size.
 * Returns offsets from the bar's middle. Sparkles live `streamLife` ms, staggered, and stop when
 * the fill is done.
 */
export function streamFrame(i: number, t: number, width: number, height: number): Frame {
  'worklet';
  if (t <= 0 || t >= CLAIM_FX.fillEnd + CLAIM_FX.streamLife * 0.5) return HIDDEN;
  const phase = i / CLAIM_FX.streamCount;
  const cycle = Math.floor(t / CLAIM_FX.streamLife + phase);
  const p = loop(t, CLAIM_FX.streamLife, phase);
  const front = fillAmount(Math.min(t, CLAIM_FX.fillEnd));
  // Each life starts at a new height along the front and drifts up and out
  const y0 = (seeded(i + cycle * 7, 1) - 0.5) * (height - 8);
  const drift = lerp(10, 22, seeded(i + cycle * 7, 2));
  return {
    x: (front - 0.5) * width + p * 10,
    y: y0 - p * drift,
    scale: lerp(1, 0.4, p),
    opacity: bell(p),
  };
}

/** A sparkle of the end-of-fill burst: flies out of the bar's right end and fades. */
export function burstFrame(i: number, t: number, width: number): Frame {
  'worklet';
  const { burstStart, burstEnd, burstCount } = CLAIM_FX;
  if (t <= burstStart || t >= burstEnd) return HIDDEN;
  const p = (t - burstStart) / (burstEnd - burstStart);
  const angle = ((i + seeded(i, 3) * 0.8) / burstCount) * Math.PI * 2;
  const dist = lerp(26, 62, seeded(i, 4)) * easeOut(p);
  return {
    x: width / 2 - 18 + Math.cos(angle) * dist,
    y: Math.sin(angle) * dist,
    scale: lerp(1.1, 0.3, p),
    opacity: 1 - p * p,
  };
}

export interface CoinSpec {
  /** Where it scatters to, from the middle of the bar. */
  scatter: Point;
  /** Which way the magnet's path bows, in px sideways at the middle of the trip. */
  bow: number;
  /** The start of this coin's trip to the target. */
  launch: number;
}

export function coinSpec(i: number, count: number = CLAIM_FX.xpCount): CoinSpec {
  const angle = ((i + 0.5 * seeded(i, 5)) / Math.max(1, count)) * Math.PI * 2 + seeded(i, 6) * 0.5;
  const radius = lerp(42, 88, seeded(i, 7));
  return {
    scatter: { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius * 0.7 },
    bow: (seeded(i, 8) < 0.5 ? -1 : 1) * lerp(30, 70, seeded(i, 9)),
    launch: CLAIM_FX.magnetStart + i * CLAIM_FX.magnetStagger,
  };
}

/** One XP coin: pops out of the bar, scatters, waits a beat, then is pulled to `target` and lands. */
export function coinFrame(spec: CoinSpec, t: number, target: Point): Frame {
  'worklet';
  const { scatterStart, scatterEnd, magnetDuration } = CLAIM_FX;
  if (t <= scatterStart) return HIDDEN;

  const ps = easeOut(clamp01((t - scatterStart) / (scatterEnd - scatterStart)));
  const sx = spec.scatter.x * ps;
  const sy = spec.scatter.y * ps;
  const popScale = lerp(0.45, 1, ps);

  if (t < spec.launch) return { x: sx, y: sy, scale: popScale, opacity: 1 };

  const raw = clamp01((t - spec.launch) / magnetDuration);
  if (raw >= 1) return HIDDEN;
  // A magnet: slow to leave, faster and faster as it closes in
  const pm = easeIn(raw);
  // A quadratic curve from where it scattered to the target, bowed sideways so coins do not queue
  const p0x = spec.scatter.x;
  const p0y = spec.scatter.y;
  const dx = target.x - p0x;
  const dy = target.y - p0y;
  const len = Math.max(1, Math.hypot(dx, dy));
  const cx = (p0x + target.x) / 2 + (-dy / len) * spec.bow;
  const cy = (p0y + target.y) / 2 + (dx / len) * spec.bow;
  const u = 1 - pm;
  return {
    x: u * u * p0x + 2 * u * pm * cx + pm * pm * target.x,
    y: u * u * p0y + 2 * u * pm * cy + pm * pm * target.y,
    scale: lerp(1, 0.55, pm),
    opacity: pm > 0.94 ? (1 - pm) / 0.06 : 1,
  };
}

/** The ring that flashes at the target each time a coin lands: `scale` grows, `opacity` fades. */
export function landingRing(t: number, count: number = CLAIM_FX.xpCount): { scale: number; opacity: number } {
  'worklet';
  // One ring per landing; the strongest of the rings alive right now
  let best = 0;
  let scale = 1;
  for (let i = 0; i < count; i++) {
    const landed = CLAIM_FX.magnetStart + i * CLAIM_FX.magnetStagger + CLAIM_FX.magnetDuration;
    const p = (t - landed) / 320;
    if (p > 0 && p < 1) {
      const o = (1 - p) * 0.9;
      if (o > best) {
        best = o;
        scale = lerp(0.7, 1.7, easeOut(p));
      }
    }
  }
  return { scale, opacity: best };
}
