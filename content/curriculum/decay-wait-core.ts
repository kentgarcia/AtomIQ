/**
 * Decay wait: a grid of unstable nuclei and a Wait button (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md §8.1).
 *
 * Framework-free and deterministic for a given seed, so Node tests can check it. Two modes:
 *  - `single` is genuinely random. Each press, every remaining nucleus has the same chance to
 *    change, so how many go, and which ones, differs from run to run.
 *  - `half-life` is guided random. Each press, the number that change is drawn around half of
 *    the remaining nuclei but clamped, and which ones change is random. The group follows the
 *    pattern while each nucleus stays unpredictable.
 */

import type { DecayWaitData } from "./types.ts";

/** Chance that one nucleus changes in one press, in `single` mode. */
export const SINGLE_CHANCE = 0.2;
/** Most the number that change may stray from half of what remains, in `half-life` mode. */
export const HALF_LIFE_SPREAD = 3;

export interface DecayWaitState {
  mode: DecayWaitData["mode"];
  count: number;
  /** Generator state (uint32). Part of the state so a run is a pure function of the seed. */
  rng: number;
  /** One flag per nucleus: true while it has not changed. */
  alive: boolean[];
  presses: number;
  /** Indices that changed on the latest press. */
  lastChanged: number[];
}

/** mulberry32: returns a number in [0, 1) and the next generator state. */
function draw(state: number): [number, number] {
  const next = (state + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

export function createDecayWait(config: { mode: DecayWaitData["mode"]; count: number; seed: number }): DecayWaitState {
  return {
    mode: config.mode,
    count: config.count,
    rng: config.seed >>> 0,
    alive: Array.from({ length: config.count }, () => true),
    presses: 0,
    lastChanged: [],
  };
}

export const remaining = (s: DecayWaitState): number => s.alive.filter(Boolean).length;

/** How far the number that change may stray from half of `alive`. */
export const spreadFor = (alive: number): number => Math.min(HALF_LIFE_SPREAD, Math.max(1, Math.floor(alive / 4)));

/** The range the number of changes can fall in for one `half-life` press (the clamp the tests check). */
export function halfLifeBounds(alive: number): { min: number; max: number } {
  if (alive <= 1) return { min: 0, max: alive };
  const centre = Math.round(alive / 2);
  const spread = spreadFor(alive);
  return { min: Math.max(1, centre - spread), max: Math.min(alive - 1, centre + spread) };
}

/** One press of Wait. Returns a new state; the old one is untouched. */
export function press(state: DecayWaitState): DecayWaitState {
  let rng = state.rng;
  const next = () => {
    const [v, r] = draw(rng);
    rng = r;
    return v;
  };
  const aliveIdx = state.alive.flatMap((a, i) => (a ? [i] : []));
  const left = aliveIdx.length;

  let changes: number;
  if (left === 0) changes = 0;
  else if (left === 1) changes = state.mode === "single" || next() < 0.5 ? 1 : 0;
  else if (state.mode === "single") {
    // Each nucleus flips its own coin. Clamped so a press always shows both a change and a nucleus that stayed.
    let k = 0;
    for (let i = 0; i < left; i++) if (next() < SINGLE_CHANCE) k++;
    changes = Math.min(left - 1, Math.max(1, k));
  } else {
    const spread = spreadFor(left);
    const jitter = Math.floor(next() * (2 * spread + 1)) - spread;
    const { min, max } = halfLifeBounds(left);
    changes = Math.min(max, Math.max(min, Math.round(left / 2 + jitter)));
  }

  // Which ones: a partial shuffle, so every nucleus is equally likely to be picked.
  const pool = [...aliveIdx];
  const picked: number[] = [];
  for (let i = 0; i < changes; i++) {
    const j = i + Math.floor(next() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    picked.push(pool[i]);
  }
  const alive = [...state.alive];
  for (const i of picked) alive[i] = false;
  return { ...state, rng, alive, presses: state.presses + 1, lastChanged: picked.sort((a, b) => a - b) };
}

export const goalMet = (state: DecayWaitState, goal: DecayWaitData["goal"]): boolean => state.presses >= goal.presses;

/** The count as text (also the screen-reader line). Half-life mode always says "about". */
export function countText(state: DecayWaitState): string {
  const left = remaining(state);
  if (state.mode === "half-life") return `About ${left} of ${state.count} nuclei have not changed yet`;
  return `${left} of ${state.count} nuclei have not changed yet`;
}

/** What just happened, for the live region. */
export function pressText(state: DecayWaitState): string {
  if (state.presses === 0) return "Nothing has changed yet.";
  const n = state.lastChanged.length;
  return state.mode === "half-life"
    ? `After ${state.presses === 1 ? "one half-life" : `${state.presses} half-lives`}, about half of the nuclei that were left have changed.`
    : `${n} ${n === 1 ? "nucleus" : "nuclei"} changed. ${countText(state)}.`;
}

/** Problems with a card's data, as plain messages (used by the curriculum rules). */
export function checkDecayWaitData(d: Partial<DecayWaitData> | null | undefined): string[] {
  const errors: string[] = [];
  if (!d || typeof d !== "object") return ["data must be an object"];
  if (d.mode !== "single" && d.mode !== "half-life") errors.push("mode must be single or half-life");
  if (typeof d.task !== "string" || !d.task.trim()) errors.push("task is required");
  const count = d.count;
  if (typeof count !== "number" || !Number.isInteger(count) || count < 4 || count > 100) errors.push("count must be a whole number from 4 to 100");
  else if (d.mode === "half-life" && count % 4 !== 0) errors.push("a half-life grid needs a count divisible by 4 so the halves are whole");
  const presses = d.goal?.presses;
  if (typeof presses !== "number" || !Number.isInteger(presses) || presses < 1 || presses > 6) errors.push("goal.presses must be a whole number from 1 to 6");
  else if (typeof count === "number" && presses > 1 && count < 2 ** presses) errors.push("count is too small for that many presses");
  return errors;
}
