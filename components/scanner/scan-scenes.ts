/**
 * The Atom Scanner's drawn scenes (docs/features/PHONE_SPEC.md §8): flat backdrops in the lesson object art's look (project skill
 * `duolingo-object-style`: flat colour, no outlines, rounded shapes, light from the upper left, the side facing away one
 * step darker) with the scannable things standing on them, each as a small scene of its own (`scan-vignettes.ts`: a glass of
 * water on the counter, a bowl of rice, a hand under a tap). Pure data with no framework imports, so Node tests can check it
 * and `scripts/render-scan-scenes.mjs` can draw a contact sheet.
 *
 * Every scene is `WORLD` (320 x 200 units); the learner pans a 190-unit-wide window over it. A scannable thing is a lesson
 * object picture placed in a square box (`size`), and that box is its hit rectangle. Which target stands where is code; what a
 * target is made of is the `scan_targets` row (a test requires every row to have a place and every place a row).
 * Colours are fixed hues, the same in light and dark (theme exception EX-13).
 */

import {
  BEE,
  CRUMB,
  FOX,
  GLASS,
  LEAF,
  PINK,
  PLUM,
  SEA,
  SKIN,
  SNOW,
  circle,
  pill,
  rect,
  type ArtId,
  type ArtShape,
} from "../lesson/visual/object-art.ts";
import { BLEED, WORLD, type Place } from "./scanner-core.ts";
import { VIGNETTES } from "./scan-vignettes.ts";

/**
 * A `band` is a horizontal strip of flat colour that runs across the whole scene and, past its sides, across the bleed
 * (the view can look past the scene's edge). The scene's own drawing is one small Svg (320 x 200 units); the bleed is
 * plain Views from the same bands, so no big picture has to be rasterised.
 */
export type ScanShape =
  | ArtShape
  | { t: "art"; id: ArtId; x: number; y: number; size: number }
  /** Shapes drawn in a 100-unit frame, placed in a `size` box at x, y (a thing's little scene). */
  | {
      t: "group";
      x: number;
      y: number;
      size: number;
      shapes: readonly ScanShape[];
    }
  | { t: "band"; y: number; h: number; fill: string; opacity?: number };

export interface ScanScene {
  id: string;
  name: string;
  /** Behind the things, back to front. */
  backdrop: ScanShape[];
  /** The things, in the order the learner meets them left to right. */
  places: (Place & { object: ArtId })[];
}

/** The size of a thing's box. */
const SIZE = 84;

const thing = (
  id: string,
  object: ArtId,
  x: number,
  y: number,
  size = SIZE,
): Place & { object: ArtId } => ({ id, object, x, y, w: size, h: size });

/** A thing's own little scene, drawn in its box. */
const vignette = (p: Place & { object: ArtId }): ScanShape => ({
  t: "group",
  x: p.x,
  y: p.y,
  size: p.w,
  shapes: VIGNETTES[p.object] ?? [
    { t: "art", id: p.object, x: 0, y: 0, size: 100 },
  ],
});

function scene(
  id: string,
  name: string,
  backdrop: ScanShape[],
  places: (Place & { object: ArtId })[],
): ScanScene {
  return { id, name, backdrop: [...backdrop, ...places.map(vignette)], places };
}

const H = WORLD.h;

/** A flat strip across the whole scene and its bleed, from `y` for `h` units. */
const wall = (
  y: number,
  h: number,
  fill: string,
  opacity?: number,
): ScanShape => ({
  t: "band",
  y,
  h,
  fill,
  ...(opacity === undefined ? {} : { opacity }),
});

/** The base colour: a band from the top of the bleed to the bottom of it. */
const base = (fill: string): ScanShape => wall(-BLEED, H + BLEED * 2, fill);

// ── kitchen: a warm wall, a window and a counter ─────────────────────────────────────────────────
const kitchenPlaces = [
  thing("scan-water", "water", 8, 60, 72),
  thing("scan-salt", "salt", 86, 60, 72),
  thing("scan-banana", "banana", 164, 60, 72),
  thing("scan-rice", "rice", 242, 60, 72),
];
const kitchen = scene(
  "kitchen",
  "Kitchen",
  [
    base(CRUMB[0]),
    wall(126, 74 + BLEED, FOX[2]),
    wall(120, 14, FOX[1]),
    wall(134, 6, FOX[2], 0.35),
    // a window with a sky and a sill
    rect(116, 12, 88, 48, 10, SNOW),
    rect(122, 18, 76, 36, 6, GLASS[1]),
    rect(158, 18, 4, 36, 0, SNOW),
    circle(138, 34, 8, SNOW, 0.85),
    // a few tiles on the wall
    ...[20, 70, 220, 270].map((x) => rect(x, 30, 26, 4, 2, CRUMB[2], 0.5)),
  ],
  kitchenPlaces,
);

// ── outside: sky, a hill and a lawn ──────────────────────────────────────────────────────────────
const outsidePlaces = [
  thing("scan-grass", "grass", 8, 90),
  thing("scan-sun", "sun", 120, 16, 80),
  thing("scan-air", "air", 224, 40),
];
const outside = scene(
  "outside",
  "Outside",
  [
    base(GLASS[0]),
    circle(60, 40, 30, SNOW, 0.8),
    circle(88, 52, 24, SNOW, 0.8),
    circle(280, 24, 24, SNOW, 0.7),
    circle(300, 34, 18, SNOW, 0.7),
    circle(90, 180, 110, LEAF[0]),
    circle(250, 200, 120, LEAF[1]),
    wall(160, 40 + BLEED, LEAF[1]),
    wall(186, 14 + BLEED, LEAF[2]),
  ],
  outsidePlaces,
);

// ── body: a soft pink room with three samples on plates ─────────────────────────────────────────
const bodyPlaces = [
  thing("scan-hand", "hand", 14, 54),
  thing("scan-hair", "hair", 118, 54),
  thing("scan-red-blood-cell", "rbc", 222, 54),
];
const body = scene(
  "body",
  "Body",
  [
    base(PINK[0]),
    wall(140, 60 + BLEED, PINK[1]),
    wall(134, 12, SKIN[0]),
    pill(20, 20, 40, 8, SNOW, 0.7),
    pill(250, 28, 50, 8, SNOW, 0.7),
    circle(160, 16, 10, SNOW, 0.6),
  ],
  bodyPlaces,
);

// ── treasure: a plum vault with two things on pedestals ─────────────────────────────────────────
const treasurePlaces = [
  thing("scan-gold", "gold", 50, 50),
  thing("scan-diamond", "diamond", 190, 50),
];
const treasure = scene(
  "treasure",
  "Treasure",
  [
    base(PLUM[0]),
    wall(150, 50 + BLEED, PLUM[1]),
    wall(144, 12, PLUM[2], 0.6),
    rect(24, 118, 136, 24, 10, SNOW),
    rect(164, 118, 136, 24, 10, SNOW),
    circle(20, 30, 8, BEE[0]),
    circle(300, 40, 6, SEA[0]),
    circle(160, 22, 5, BEE[0]),
  ],
  treasurePlaces,
);

export const SCAN_SCENES: readonly ScanScene[] = [
  kitchen,
  outside,
  body,
  treasure,
];

export const SCENE_BY_ID: Readonly<Record<string, ScanScene>> =
  Object.fromEntries(SCAN_SCENES.map((s) => [s.id, s]));

/** Every thing that can be scanned, with the scene it is in. */
export const ALL_PLACES: readonly {
  sceneId: string;
  place: Place & { object: ArtId };
}[] = SCAN_SCENES.flatMap((s) =>
  s.places.map((place) => ({ sceneId: s.id, place })),
);
