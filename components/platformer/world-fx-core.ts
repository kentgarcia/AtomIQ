/**
 * The small moments of the level, as pure maths (no React), unit-tested (`npm run test:platformer`),
 * each a function of one clock in ms from the moment it happens (see `duolingo-motion-style`:
 * anticipation, a squash, a hang, a settle): a block bumped from below, a coin or a heart popping out,
 * a brick breaking into pieces, a coin picked up, a checkpoint or the goal flag raised, the sign's
 * bubble opening and the sign itself rocking. Offsets are in TILES (up is negative), scales are 1 at
 * rest, opacity 0..1, rotation in degrees. Every one rests at its start and at its end.
 */

import { bell, clamp01, flow, seeded, seg, track } from "../motion/motion-core.ts";

export const WORLD_FX = {
  bump: 240,
  coin: 760,
  heart: 1000,
  brick: 850,
  coinGet: 320,
  flagPop: 620,
  sign: 560,
  bubbleIn: 220,
  bubbleOut: 130,
} as const;

/**
 * The clock held still between steps, `fps` a second. Things that only drift for the eye (a coin's bob, a
 * saw's turn, the water's flow) read the world's time through this, so their style comes out the same
 * between steps and the UI thread has nothing to send to the native view: a level full of them costs a
 * fraction of what a change on every frame does.
 */
export const DECOR_FPS = 20;
export const SPIN_FPS = 30;
export function stepped(t: number, fps: number): number {
  'worklet';
  return Math.floor(t * fps) / fps;
}

/** A block hit from below: it jumps up, squashes flat on the way back and settles. */
export function blockBump(t: number): { dy: number; sx: number; sy: number } {
  'worklet';
  if (t <= 0 || t >= WORLD_FX.bump) return { dy: 0, sx: 1, sy: 1 };
  return {
    dy: track(t, [[0, 0], [85, -0.3, 'out'], [175, 0], [WORLD_FX.bump, 0]]),
    sx: flow(t, [[0, 1], [85, 0.94], [175, 1.08], [WORLD_FX.bump, 1]]),
    sy: flow(t, [[0, 1], [85, 1.12], [175, 0.9], [WORLD_FX.bump, 1]]),
  };
}

/** A coin springing out of a block: up and spinning, hangs, drops a little, fades. `dy` is from the block's top. */
export function coinPop(t: number): { dy: number; sx: number; opacity: number } {
  'worklet';
  if (t <= 0 || t >= WORLD_FX.coin) return { dy: 0, sx: 1, opacity: 0 };
  const spin = Math.abs(Math.cos(t / 62));
  return {
    dy: track(t, [[0, -0.2], [340, -2.1, 'out'], [WORLD_FX.coin, -1.45]]),
    sx: 0.18 + 0.82 * spin,
    opacity: 1 - seg(t, 480, WORLD_FX.coin, 'inOut'),
  };
}

/** A heart rising out of a block: pops up growing, wobbles, then floats off, fading. */
export function heartPop(t: number): { dy: number; scale: number; rotate: number; opacity: number } {
  'worklet';
  if (t <= 0 || t >= WORLD_FX.heart) return { dy: 0, scale: 1, rotate: 0, opacity: 0 };
  return {
    dy: track(t, [[0, -0.2], [420, -1.7, 'out'], [WORLD_FX.heart, -2.3]]),
    scale: flow(t, [[0, 0.3], [260, 1.25], [420, 0.95], [560, 1.04], [WORLD_FX.heart, 1]]),
    rotate: 10 * Math.sin(t / 90) * (1 - seg(t, 300, 800)),
    opacity: seg(t, 0, 90) * (1 - seg(t, 720, WORLD_FX.heart, 'inOut')),
  };
}

/** Where piece `i` (0..3, top left, top right, bottom left, bottom right) of a broken brick is, in tiles from its own spot. */
export function brickPiece(i: number, t: number): { x: number; y: number; rotate: number; opacity: number } {
  'worklet';
  if (t <= 0 || t >= WORLD_FX.brick) return { x: 0, y: 0, rotate: 0, opacity: 0 };
  const s = t / 1000;
  const right = i % 2 === 1;
  const top = i < 2;
  const vx = (right ? 1 : -1) * (1.1 + 0.9 * seeded(i, 3));
  const vy = -(top ? 7.4 : 5.2) - 1.2 * seeded(i, 7);
  const g = 24;
  return {
    x: vx * s,
    y: vy * s + 0.5 * g * s * s,
    rotate: (right ? 1 : -1) * (300 + 260 * seeded(i, 11)) * s,
    opacity: 1 - seg(t, 520, WORLD_FX.brick, 'inOut'),
  };
}

/** A coin that has just been picked up: it jumps up and swells while it fades. */
export function coinGet(t: number): { dy: number; scale: number; opacity: number } {
  'worklet';
  if (t <= 0 || t >= WORLD_FX.coinGet) return { dy: 0, scale: 1, opacity: 0 };
  const p = clamp01(t / WORLD_FX.coinGet);
  return { dy: -0.55 * seg(t, 0, WORLD_FX.coinGet, 'out'), scale: 1 + 0.55 * seg(t, 0, WORLD_FX.coinGet, 'out'), opacity: 1 - p * p };
}

/** A flag that has just been raised (a checkpoint reached, the goal opened): it pops up big, squashes, rocks and settles. */
export function flagPop(t: number): { scale: number; sy: number; rotate: number } {
  'worklet';
  if (t <= 0 || t >= WORLD_FX.flagPop) return { scale: 1, sy: 1, rotate: 0 };
  return {
    scale: flow(t, [[0, 0.6], [120, 1.3], [250, 0.92], [380, 1.05], [WORLD_FX.flagPop, 1]]),
    sy: flow(t, [[0, 0.7], [120, 1.12], [250, 0.94], [WORLD_FX.flagPop, 1]]),
    rotate: 14 * Math.sin(t / 70) * (1 - seg(t, 60, WORLD_FX.flagPop)),
  };
}

/** The sign rocking when the hero steps up to read it. */
export function signRock(t: number): number {
  'worklet';
  if (t <= 0 || t >= WORLD_FX.sign) return 0;
  return 9 * Math.sin(t / 55) * (1 - seg(t, 0, WORLD_FX.sign));
}

/**
 * The sign's bubble: `open` is 1 while the hero stands at the sign and 0 away from it; `t` is how long
 * since that last changed. It pops out of the sign (scale 0.35 to 1 in 200 ms, ease-out, no overshoot),
 * and leaves a little quicker, shrinking back toward it.
 */
export function bubbleFrame(open: boolean, t: number): { scale: number; opacity: number; lift: number } {
  'worklet';
  if (open) {
    const p = seg(t, 0, WORLD_FX.bubbleIn);
    return { scale: 0.35 + 0.65 * p, opacity: seg(t, 0, WORLD_FX.bubbleIn * 0.6), lift: 8 * (1 - p) };
  }
  const p = seg(t, 0, WORLD_FX.bubbleOut, 'inOut');
  return { scale: 1 - 0.35 * p, opacity: 1 - p, lift: 6 * p };
}

/** The "!" over a sign not yet read bobs gently (seconds of the world's clock). */
export function signHint(seconds: number, i: number): number {
  'worklet';
  return -0.12 * bell(((seconds * 0.9 + i * 0.37) % 1 + 1) % 1);
}
