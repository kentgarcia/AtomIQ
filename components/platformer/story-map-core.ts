/**
 * The Atom Maze level map as pure maths (no React), unit-tested in `scripts/test-story-map.mjs`:
 * where each stop of a world sits on its winding path, the dotted road between stops, which stops are
 * done, open or shut, a world's stars, the scenery along the road and where to scroll to the learner's
 * next level. `app/explorer/story.tsx` only draws what this says; the nodes, their bubble and their
 * fireflies are the lesson map's own (`components/path/`), so the two maps feel like one app.
 */

import type { SceneryKind } from "./platformer-core.ts";
import { currentLevelIndex, isLevelUnlocked, type LevelRecord } from "./story-core.ts";

/** Sizes of the map, dp. */
export const MAP = {
  /** The world's banner on top of its path. */
  bannerH: 124,
  /** Gap between the banner and the first stop's row. */
  bannerGap: 14,
  /** From the top of the path to the first stop's centre. */
  top: 64,
  /** Between two stops' centres: room for the stars and the name under a stop. */
  row: 156,
  /** From the last stop's centre to the end of the path. */
  bottom: 118,
  /** Between the end of a world and the next banner. */
  worldGap: 22,
  /** The most a stop swings away from the middle. */
  swing: 92,
  /** Stops keep this far from the edge of the map (their half width is added). */
  edge: 28,
} as const;

/** Half the box of a stop (`NODE.box` of the lesson map), kept here so this file needs no imports of its own. */
const HALF_NODE = 40;

/** How far down a stop's puck sits from the stop's own y (the lesson map's `PUCK_CENTER_Y - NODE.box / 2`). */
export const PUCK_DROP = 4;

/** x of the centre of stop `index` (from 0) on a map `width` wide: a gentle S, so the road winds. */
export function stopX(index: number, width: number): number {
  const room = Math.max(0, width / 2 - HALF_NODE - MAP.edge);
  const swing = Math.min(MAP.swing, room);
  return Math.round(width / 2 + Math.sin(index * 1.25 + 0.2) * swing);
}

/** y of the centre of stop `index`, from the top of its world's path. */
export const stopY = (index: number): number => MAP.top + index * MAP.row;

/** Height of a world's path with `count` stops. */
export const pathHeight = (count: number): number => stopY(Math.max(0, count - 1)) + MAP.bottom;

/** Height of one whole world: banner, gap and path. */
export const worldHeight = (count: number): number => MAP.bannerH + MAP.bannerGap + pathHeight(count);

/** Where world `index` starts in the scrolling content (top padding not included), when worlds have these stop counts. */
export function worldTop(counts: readonly number[], index: number): number {
  let y = 0;
  for (let i = 0; i < index; i++) y += worldHeight(counts[i] ?? 0) + MAP.worldGap;
  return y;
}

/** Height of everything, top padding not included. */
export const contentHeight = (counts: readonly number[]): number => worldTop(counts, counts.length) - (counts.length ? MAP.worldGap : 0);

export type StopStatus = "locked" | "current" | "completed";

/** Done (won with a star or more), open (the next one to play) or shut. */
export function stopStatus(index: number, ids: readonly string[], records: readonly LevelRecord[]): StopStatus {
  const record = records.find((r) => r.levelId === ids[index]);
  if (record && record.stars >= 1) return "completed";
  return isLevelUnlocked(index, ids, records) ? "current" : "locked";
}

/** The stars earned in a world and the most it can give. */
export function worldStars(levelIds: readonly string[], records: readonly LevelRecord[]): { earned: number; total: number; won: number } {
  let earned = 0;
  let won = 0;
  for (const id of levelIds) {
    const stars = Math.max(0, Math.min(3, records.find((r) => r.levelId === id)?.stars ?? 0));
    earned += stars;
    if (stars >= 1) won += 1;
  }
  return { earned, total: levelIds.length * 3, won };
}

/** A world is open once its first level is (the one before it, in the world before, is won). */
export const worldOpen = (firstGlobalIndex: number, ids: readonly string[], records: readonly LevelRecord[]): boolean => isLevelUnlocked(firstGlobalIndex, ids, records);

const r1 = (v: number) => Math.round(v * 10) / 10;

export interface RoadSegment {
  /** An SVG path from one stop's puck to the next: an S that leaves and arrives going straight down. */
  d: string;
  /** The stop it leaves has been won, so the road past it is lit. */
  lit: boolean;
}

/** The road through the stops of a world, one segment between each pair. */
export function roadSegments(width: number, statuses: readonly StopStatus[]): RoadSegment[] {
  const out: RoadSegment[] = [];
  for (let i = 0; i + 1 < statuses.length; i++) {
    const x1 = stopX(i, width);
    const y1 = stopY(i) + PUCK_DROP;
    const x2 = stopX(i + 1, width);
    const y2 = stopY(i + 1) + PUCK_DROP;
    const mid = (y1 + y2) / 2;
    out.push({ d: `M${x1} ${r1(y1)}C${x1} ${r1(mid)} ${x2} ${r1(mid)} ${x2} ${r1(y2)}`, lit: statuses[i] === "completed" });
  }
  return out;
}

/* ------------------------------ scenery along the road ------------------------------ */

export interface Decor {
  kind: SceneryKind;
  /** Centre x and the bottom edge's y, from the top of the path. */
  x: number;
  y: number;
  size: number;
  flip: boolean;
}

/** What grows along the road in each biome (the same scenery pictures the level uses). */
export const BIOME_DECOR: Readonly<Record<"hills" | "trees" | "desert" | "mushrooms", readonly SceneryKind[]>> = {
  hills: ["bush", "grass", "grass", "rock", "fence", "bush"],
  trees: ["bush", "grass", "rock", "bush", "grass", "mushroom_brown"],
  desert: ["cactus", "rock", "grass", "cactus", "rock"],
  mushrooms: ["mushroom_red", "mushroom_brown", "grass_purple", "mushroom_red", "rock"],
};

/** A small repeatable random generator (mulberry32), so a map looks the same every time. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Scenery size range, dp. */
const DECOR_SIZE = { min: 34, max: 52 } as const;
/** Clear space kept between a decoration and a stop's disc. */
const DECOR_CLEAR = 30;

/**
 * Scenery for the stretch of road behind each stop: on the side of the row away from the road, one or two
 * pieces, never over a stop's disc or the margin. `biomes` has the biome of each stop's row (a tutorial changes it level
 * by level; a unit keeps one).
 */
export function decorFor(biomes: readonly ("hills" | "trees" | "desert" | "mushrooms")[], width: number, seed: number): Decor[] {
  const rnd = seeded(seed);
  const out: Decor[] = [];
  biomes.forEach((biome, i) => {
    const kinds = BIOME_DECOR[biome];
    const x = stopX(i, width);
    const y = stopY(i);
    const left = x > width / 2;
    const pieces = 1 + (rnd() < 0.6 ? 1 : 0);
    for (let k = 0; k < pieces; k++) {
      const size = Math.round(DECOR_SIZE.min + rnd() * (DECOR_SIZE.max - DECOR_SIZE.min));
      // The free stretch on that side: from the margin to the stop's disc, or from it to the other margin
      const from = left ? 12 : x + HALF_NODE + DECOR_CLEAR;
      const to = left ? x - HALF_NODE - DECOR_CLEAR : width - 12;
      if (to - from < size) continue;
      const cx = from + size / 2 + rnd() * (to - from - size);
      const by = y + (k === 0 ? 8 : 40) + Math.round((rnd() - 0.5) * 34);
      out.push({ kind: kinds[Math.floor(rnd() * kinds.length)], x: Math.round(cx), y: Math.round(by), size, flip: rnd() < 0.5 });
    }
  });
  return out;
}

/* ------------------------------ where to scroll ------------------------------ */

/**
 * The scroll offset that puts the learner's next level a little above the middle of the screen: `levelPosition` is
 * its place in its world (from 0), `viewportH` the height of the scrolling area, `pad` the content's top padding. Never negative,
 * never past the end.
 */
export function scrollTarget(args: { counts: readonly number[]; worldIndex: number; levelPosition: number; viewportH: number; pad: number }): number {
  const { counts, worldIndex, levelPosition, viewportH, pad } = args;
  const y = pad + worldTop(counts, worldIndex) + MAP.bannerH + MAP.bannerGap + stopY(levelPosition);
  const end = pad + contentHeight(counts);
  return Math.max(0, Math.min(Math.round(y - viewportH * 0.4), Math.max(0, end - viewportH)));
}

/** The world and the place in it of the level the learner should play next. */
export function nextStop(worlds: readonly { levelIds: readonly string[] }[], records: readonly LevelRecord[]): { worldIndex: number; position: number; globalIndex: number } {
  const ids = worlds.flatMap((w) => w.levelIds);
  const globalIndex = currentLevelIndex(ids, records);
  let rest = globalIndex;
  for (let w = 0; w < worlds.length; w++) {
    if (rest < worlds[w].levelIds.length) return { worldIndex: w, position: rest, globalIndex };
    rest -= worlds[w].levelIds.length;
  }
  return { worldIndex: 0, position: 0, globalIndex: 0 };
}
