/**
 * A tiny seeded random number generator, shared by the feed, social and rank cores so that
 * "random" choices are repeatable: the same seed always gives the same numbers. Framework-free.
 */

/** Returns numbers in [0, 1). */
export type Rng = () => number;

/** FNV-1a: a stable 32-bit hash of a string, used to turn ids into seeds. */
export function hashString(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: small, fast and good enough for picking NPCs and reactions. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A generator seeded from any string (a target id, "npc|week", ...). */
export const rngFromSeed = (seed: string): Rng => mulberry32(hashString(seed));

/** An integer in [min, max] (both included). */
export const randInt = (rng: Rng, min: number, max: number): number =>
  min + Math.floor(rng() * (max - min + 1));

/** A new array in a random order (Fisher-Yates). The input is not changed. */
export function shuffled<T>(rng: Rng, items: readonly T[]): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** One entry chosen by weight; entries with a weight of 0 or less never win. `null` for an empty or all-zero list. */
export function pickWeighted<T>(rng: Rng, items: readonly T[], weightOf: (item: T) => number): T | null {
  let total = 0;
  for (const item of items) total += Math.max(0, weightOf(item));
  if (total <= 0) return null;
  let roll = rng() * total;
  for (const item of items) {
    const w = Math.max(0, weightOf(item));
    if (w <= 0) continue;
    if (roll < w) return item;
    roll -= w;
  }
  return items.filter((i) => weightOf(i) > 0).pop() ?? null;
}
