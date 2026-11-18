/**
 * The reveal of one finish-screen stat, as pure maths (no React), so the timeline is unit-tested
 * (`scripts/test-stat-reveal.mjs`) and `StatTile.tsx` only draws it.
 *
 * One clock, in ms, plays once per tile (tiles start one after another):
 *
 *     0 ..  240   the icon and the value appear alone, big, with no tile behind them
 *    60 ..  420   small stars burst out around them and hang, drifting a little
 *   120 ..  840   the value counts up to its final number
 *   760 .. 1020   the stars are pulled back in and the icon and value settle to tile size
 *   900 .. 1200   the tile (label band and face) fades in around them
 *   960 .. 1300   a light ring flashes round the tile and stars twinkle on two corners
 *  1000 .. 1250   the icon gives one small pulse as the number lands
 *
 * Every value is a function of the clock and the index of the star (`seeded`), never random per
 * frame. Offsets are in px from the middle of the tile's face (the rounded box that holds the
 * icon and value). Frame 0 shows nothing, so a tile waiting for its turn is simply not there.
 */

import { bell, clamp01, easeIn, easeInOut, easeOut, lerp, seeded } from "../motion/motion-core.ts";

export const STAT_FX = {
  heroInEnd: 240,
  starsStart: 60,
  starsOutEnd: 420,
  countStart: 120,
  countEnd: 840,
  gatherStart: 760,
  gatherEnd: 1020,
  shellStart: 900,
  shellEnd: 1200,
  flashStart: 960,
  flashEnd: 1300,
  pulseStart: 1000,
  pulseEnd: 1250,
  starCount: 6,
  /** The icon and value are this much bigger than the finished tile while they stand alone. */
  heroScale: 1.5,
  /** How far the stars sit from the middle of the face at their widest, px. */
  starRadius: 46,
} as const;

/** When the whole reveal of one tile is over. */
export const STAT_TOTAL = STAT_FX.flashEnd + 20;

/**
 * When the first stat appears, and the gap between stats. The stats play together with the stamps of the
 * finish screen (the title lands at 300 ms, the stars by about 1.6 s), the first one starting just after
 * the title, and the next one begins while the last is still settling.
 */
export const STATS_START = 500;
export const STAT_STEP = 650;
/** After every stat is in: the pause before the first band of light, and the gap between tiles. */
export const SHINE_GAP = 250;
export const SHINE_STAGGER = 180;

/** When stat number `n` (0-based) starts, ms after the screen appears. */
export function statStart(n: number): number {
  return STATS_START + n * STAT_STEP;
}

/** When the band of light of stat `n` of `count` first sweeps, ms after the screen appears. */
export function shineStart(n: number, count: number): number {
  return statStart(Math.max(0, count - 1)) + STAT_TOTAL + SHINE_GAP + n * SHINE_STAGGER;
}

export interface StatFrame {
  /** The icon and value standing on their own (always on once started). */
  heroOpacity: number;
  /** 1 = tile size. Starts a little under `heroScale` and settles to 1. */
  heroScale: number;
  /** The tile around them. */
  shellOpacity: number;
  shellScale: number;
  /** The light ring that flashes round the tile. */
  ringOpacity: number;
  ringScale: number;
  /** The icon's own pulse as the number lands, 1 = rest. */
  iconScale: number;
}

const OFF: StatFrame = { heroOpacity: 0, heroScale: 1, shellOpacity: 0, shellScale: 1, ringOpacity: 0, ringScale: 1, iconScale: 1 };

/** The state of the tile at time `t` of its reveal. */
export function statFrame(t: number): StatFrame {
  'worklet';
  if (t <= 0) return OFF;
  const { heroInEnd, gatherStart, gatherEnd, shellStart, shellEnd, flashStart, flashEnd, pulseStart, pulseEnd, heroScale } = STAT_FX;
  const appear = easeOut(clamp01(t / heroInEnd));
  const shrink = easeInOut(clamp01((t - gatherStart) / (gatherEnd - gatherStart)));
  const shell = easeOut(clamp01((t - shellStart) / (shellEnd - shellStart)));
  const flash = clamp01((t - flashStart) / (flashEnd - flashStart));
  const pulse = clamp01((t - pulseStart) / (pulseEnd - pulseStart));
  return {
    heroOpacity: appear,
    // Never from scale 0: it grows from 85% of its big size, holds, then settles to the tile size
    heroScale: lerp(lerp(heroScale * 0.85, heroScale, appear), 1, shrink),
    shellOpacity: shell,
    shellScale: lerp(0.94, 1, shell),
    ringOpacity: flash > 0 && flash < 1 ? 0.85 * (1 - easeOut(flash)) : 0,
    ringScale: lerp(1, 1.1, easeOut(flash)),
    iconScale: 1 + 0.16 * bell(pulse),
  };
}

export interface StarFrame {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  /** Degrees. */
  rotate: number;
}

const NO_STAR: StarFrame = { x: 0, y: 0, scale: 0.5, opacity: 0, rotate: 0 };

/**
 * One of the small stars round the icon and value: bursts out, hangs and drifts, then is pulled
 * back to the middle and fades as it arrives.
 */
export function starFrame(i: number, t: number): StarFrame {
  'worklet';
  const { starsStart, starsOutEnd, gatherStart, gatherEnd, starCount, starRadius } = STAT_FX;
  if (t <= starsStart || t >= gatherEnd) return NO_STAR;
  // Spread round the circle with a little seeded wobble so they do not look stamped
  const angle = ((i + 0.35 * seeded(i, 11)) / starCount) * Math.PI * 2 - Math.PI / 2;
  const reach = starRadius * lerp(0.8, 1.15, seeded(i, 12));
  const out = easeOut(clamp01((t - starsStart) / (starsOutEnd - starsStart)));
  const back = easeIn(clamp01((t - gatherStart) / (gatherEnd - gatherStart)));
  // While they hang they breathe a little in and out (small, each on its own phase)
  const drift = Math.sin((t / 700 + seeded(i, 13)) * Math.PI * 2) * 3 * (1 - back);
  const r = (reach + drift) * out * (1 - back);
  const size = lerp(0.8, 1.15, seeded(i, 14));
  return {
    x: Math.cos(angle) * r,
    y: Math.sin(angle) * r,
    scale: lerp(0.6, 1, out) * size * lerp(1, 0.4, back),
    opacity: clamp01((t - starsStart) / 80) * (1 - clamp01((back - 0.6) / 0.4)),
    rotate: lerp(-25, 15, seeded(i, 15)) * out,
  };
}

/** The two twinkling stars on the tile's top-right and bottom-left corners as the ring flashes. */
export function cornerStarFrame(i: number, t: number): { scale: number; opacity: number; rotate: number } {
  'worklet';
  const { flashStart, flashEnd } = STAT_FX;
  // The second star trails the first by 70 ms, and both are over when the flash ends
  const p = clamp01((t - flashStart - i * 70) / (flashEnd - flashStart - 70));
  const b = bell(p);
  return { scale: lerp(0.5, 1.1, b), opacity: b, rotate: lerp(-20, 20, p) * (i === 0 ? 1 : -1) };
}

/**
 * The counted number at time `t`: 0 until the count starts, then easing out to `target` (slow
 * at the end so the last digits are readable), whole numbers only.
 */
export function countValue(t: number, target: number): number {
  'worklet';
  const { countStart, countEnd } = STAT_FX;
  const p = easeOut(clamp01((t - countStart) / (countEnd - countStart)));
  return Math.round(target * p);
}
