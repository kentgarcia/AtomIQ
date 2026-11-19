/**
 * The start of a level, as pure functions of one clock in ms (no React; unit-tested with
 * `npm run test:platformer`): Shrodi walks in from the left edge of the screen to the start, gets
 * ready (a crouch, a hop, a landing and a cheer), and then the mission is shown at the top and play
 * begins. Nothing here moves the world: the screen sets the hero's place and picture from the pose.
 */

import { CLIPS } from "./hero-anim-core.ts";

/** Walking in: tiles a second (an easy walk, slower than the run), and how far past the screen's left edge the hero begins. */
export const WALK_IN = { speed: 3.4, margin: 1.2 } as const;

/** The ready animation, ms from its start: crouch, hop, land, cheer, then a moment of standing. */
export const READY = { crouch: 260, hop: 380, land: 160, cheer: 620, hold: 180, hopHeight: 0.6 } as const;
export const READY_TOTAL = READY.crouch + READY.hop + READY.land + READY.cheer + READY.hold;

export interface EntrancePlan {
  /** Hero's centre x in tiles when it enters, and where it stops. */
  fromX: number;
  toX: number;
  walkMs: number;
  total: number;
}

/** The walk from just off the left edge of the view (`camLeft`, tiles) to the start. */
export const entrancePlan = (toX: number, camLeft: number): EntrancePlan => {
  const fromX = Math.min(toX, camLeft - WALK_IN.margin);
  const walkMs = Math.max(0, ((toX - fromX) / WALK_IN.speed) * 1000);
  return { fromX, toX, walkMs, total: walkMs + READY_TOTAL };
};

export interface ReadyPose {
  /** Picture in the hero's sprite sheet. */
  frame: number;
  /** Lift off the ground in tiles (negative is up, like the world's y). */
  dy: number;
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/** The ready animation `ms` after it began. */
export const readyPose = (ms: number): ReadyPose => {
  const { land, rise, apex, fall, cheer } = CLIPS;
  const t = Math.max(0, ms);
  if (t < READY.crouch) return { frame: land.start + (t < READY.crouch * 0.55 ? 0 : 1), dy: 0 };
  const hop = t - READY.crouch;
  if (hop < READY.hop) {
    const p = hop / READY.hop;
    const frame = p < 0.35 ? rise.start : p < 0.65 ? apex.start : fall.start;
    return { frame, dy: -Math.sin(Math.PI * p) * READY.hopHeight };
  }
  const down = hop - READY.hop;
  if (down < READY.land) return { frame: land.start + (down < READY.land / 2 ? 1 : 0), dy: 0 };
  const cheering = down - READY.land;
  if (cheering < READY.cheer) {
    const frame = Math.min(cheer.count - 1, Math.floor((cheering / 1000) * cheer.fps));
    return { frame: cheer.start + frame, dy: 0 };
  }
  return { frame: cheer.start + cheer.count - 1, dy: 0 };
};

export interface EntrancePose {
  /** Hero's centre x, tiles. */
  x: number;
  walking: boolean;
  /** ms into the ready animation, or null while still walking. */
  readyMs: number | null;
  done: boolean;
}

/** Where the hero is `t` ms after the entrance began: walking at an even pace, easing to a stop at the end, then ready. */
export const entrancePose = (t: number, plan: EntrancePlan): EntrancePose => {
  const time = Math.max(0, t);
  if (time < plan.walkMs) {
    const p = clamp01(time / plan.walkMs);
    return { x: plan.fromX + (plan.toX - plan.fromX) * walkProgress(p), walking: true, readyMs: null, done: false };
  }
  const readyMs = time - plan.walkMs;
  return { x: plan.toX, walking: false, readyMs, done: time >= plan.total };
};

/** Distance walked (0 to 1) after a share p of the walking time: even speed for the first 70%, then slowing to a stop. */
export const walkProgress = (p: number): number => {
  const x = clamp01(p);
  const k = 0.7;
  // speed is 1 until k, then falls linearly to 0 at 1; the area under it is k + (1 - k) / 2
  const total = k + (1 - k) / 2;
  if (x <= k) return x / total;
  const u = x - k;
  const v = 1 - u / (1 - k) / 2; // speed at u is 1 - u / (1 - k); mean of 1 and it over [0, u]
  return (k + u * v) / total;
};
