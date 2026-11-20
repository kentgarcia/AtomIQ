/**
 * The Atom Scanner's little scenes (docs/PHONE_SPEC.md §8): each scannable thing is drawn as a small scene of its own, not as a
 * lone picture on a plate: a glass of water with a drop beside it, a shaker with a pile of salt, a bowl of rice and chopsticks, a hand
 * under a tap, a blood vessel with its cells. Pure data with no framework imports, like `scan-scenes.ts`, so Node tests can check it and
 * `scripts/render-scan-scenes.mjs` can draw it. Every vignette lives in the lesson object art's 100 x 100 frame (flat colour, no
 * outlines, light from the upper left, the side facing away one step darker; project skill `duolingo-object-style`), keyed by the
 * target's `object`, and stands on y = 80 (a thing that sits on a counter or the ground) or floats (a hand, a hair, a vessel).
 * Colours are fixed hues, the same in light and dark (theme exception EX-13).
 */

import {
  ANCHOVY,
  BEE,
  COFFEE,
  CRUMB,
  GLASS,
  LEAF,
  PINK,
  PLUM,
  RED,
  SEA,
  SNOW,
  circle,
  line,
  path,
  pill,
  poly,
  rect,
  type ArtId,
} from "../lesson/visual/object-art.ts";
import type { ScanShape } from "./scan-scenes.ts";

/** A pale pill under a thing standing on a surface (never an oval). */
const floor = (w: number, cx = 50): ScanShape =>
  pill(cx - w / 2, 80, w, 8, COFFEE[2], 0.25);

/** A four-point sparkle. */
const spark = (
  cx: number,
  cy: number,
  r: number,
  fill: string = SNOW,
): ScanShape =>
  poly(
    [
      [cx, cy - r],
      [cx + r * 0.3, cy - r * 0.3],
      [cx + r, cy],
      [cx + r * 0.3, cy + r * 0.3],
      [cx, cy + r],
      [cx - r * 0.3, cy + r * 0.3],
      [cx - r, cy],
      [cx - r * 0.3, cy - r * 0.3],
    ],
    1.5,
    fill,
  );

const art = (id: ArtId, x: number, y: number, size: number): ScanShape => ({
  t: "art",
  id,
  x,
  y,
  size,
});

/** The vignette for each scannable object, in a 100-unit frame. */
export const VIGNETTES: Readonly<Partial<Record<ArtId, readonly ScanShape[]>>> =
  {
    // A glass of water on the counter, a drop of it beside it
    water: [
      floor(66, 48),
      poly(
        [
          [26, 24],
          [74, 24],
          [68, 82],
          [32, 82],
        ],
        6,
        GLASS[2],
      ),
      poly(
        [
          [24, 24],
          [70, 24],
          [65, 82],
          [30, 82],
        ],
        6,
        GLASS[1],
      ),
      poly(
        [
          [28, 44],
          [68, 44],
          [64, 80],
          [32, 80],
        ],
        5,
        SEA[1],
      ),
      poly(
        [
          [52, 44],
          [68, 44],
          [64, 80],
          [48, 80],
        ],
        5,
        SEA[2],
      ),
      pill(28, 42, 40, 5, SEA[0]),
      circle(42, 60, 3.5, SEA[0]),
      circle(53, 69, 2.5, SEA[0]),
      circle(38, 70, 2, SEA[0]),
      pill(22, 20, 50, 6, GLASS[2]),
      pill(31, 29, 5, 14, SNOW, 0.9),
      path(
        "M84 60C84 60 76 70 76 76A8 8 0 0 0 92 76C92 70 84 60 84 60Z",
        SEA[1],
      ),
    ],

    // A salt shaker and a small heap of what came out of it
    salt: [
      floor(54, 40),
      poly(
        [
          [62, 82],
          [76, 62],
          [94, 82],
        ],
        8,
        SNOW,
      ),
      poly(
        [
          [76, 62],
          [94, 82],
          [76, 82],
        ],
        8,
        ANCHOVY[1],
      ),
      circle(58, 85, 2.4, SNOW),
      art("salt", -2, 3, 86),
    ],

    // A banana on a plate
    banana: [
      rect(2, 76, 96, 13, 6.5, ANCHOVY[2]),
      rect(0, 72, 96, 13, 6.5, SNOW),
      art("banana", 4, 0, 92),
    ],

    // A bowl of rice with a pair of chopsticks
    rice: [
      floor(76),
      path("M16 56Q18 18 50 18Q82 18 84 56Z", SNOW),
      circle(40, 36, 2.5, CRUMB[1]),
      circle(57, 28, 2.5, CRUMB[1]),
      circle(64, 42, 2.5, CRUMB[1]),
      circle(46, 46, 2.5, CRUMB[1]),
      line("M70 4L52 38", COFFEE[1], 4),
      line("M80 8L58 40", COFFEE[0], 4),
      path("M10 52H90Q90 84 50 84Q10 84 10 52Z", SEA[1]),
      path("M64 52H90Q90 80 60 84Q70 70 64 52Z", SEA[2]),
      pill(8, 48, 84, 8, SEA[0]),
      pill(36, 82, 28, 6, SEA[2]),
    ],

    // A tuft of grass in a patch of soil, with a daisy
    grass: [
      rect(0, 78, 100, 14, 7, COFFEE[1]),
      art("grass", -6, 2, 88),
      line("M86 80V46", LEAF[2], 4),
      circle(86, 40, 9, PINK[0]),
      circle(86, 40, 4.5, BEE[1]),
    ],

    // The sun with a cloud drifting in front of it
    sun: [
      art("sun", 4, -2, 92),
      rect(56, 76, 40, 12, 6, ANCHOVY[1]),
      circle(66, 72, 11, SNOW),
      circle(80, 74, 9, SNOW),
      rect(54, 72, 40, 12, 6, SNOW),
    ],

    // Wind curling past, with a balloon that it carries
    air: [
      art("air", 0, 8, 80),
      art("balloon", 58, 0, 40),
      circle(14, 88, 4, LEAF[1]),
    ],

    // A hand under a running tap, soap bubbles floating by
    hand: [
      rect(60, 0, 28, 12, 6, ANCHOVY[2]),
      rect(60, 8, 12, 12, 4, ANCHOVY[1]),
      pill(63, 24, 6, 10, SEA[1]),
      pill(64, 38, 5, 8, SEA[0]),
      art("hand", 4, 14, 82),
      rect(18, 76, 58, 22, 9, PLUM[2]),
      rect(14, 76, 58, 22, 9, PLUM[1]),
      circle(80, 58, 7, GLASS[1]),
      circle(89, 74, 4, GLASS[1]),
      circle(10, 40, 5, GLASS[1]),
    ],

    // A hair caught in the teeth of a comb
    hair: [
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) =>
        pill(12 + i * 10.5, 66, 6, 22, PLUM[2]),
      ),
      rect(10, 56, 88, 16, 7, PLUM[2]),
      rect(6, 56, 88, 16, 7, PLUM[1]),
      art("hair", 6, -8, 88),
    ],

    // A blood vessel with red cells carried along in it
    rbc: [
      rect(2, 22, 96, 56, 28, RED[0]),
      rect(8, 28, 84, 44, 22, SNOW),
      ...[
        [26, 50, 14],
        [58, 42, 14],
        [77, 59, 11],
      ].flatMap(([cx, cy, r]) => [
        circle(cx + 1.5, cy + 2, r, RED[2]),
        circle(cx, cy, r, RED[1]),
        circle(cx - 1, cy, r * 0.42, RED[2]),
      ]),
    ],

    // Three gold bars stacked, sparkling
    gold: [
      art("gold", 0, 38, 56),
      art("gold", 44, 38, 56),
      art("gold", 22, 8, 56),
      spark(88, 20, 9),
      spark(10, 26, 6),
    ],

    // A diamond on a cushion, sparkling
    diamond: [
      rect(12, 76, 76, 16, 8, RED[2]),
      rect(8, 74, 76, 16, 8, RED[1]),
      circle(10, 82, 5, BEE[1]),
      circle(84, 82, 5, BEE[1]),
      art("diamond", 12, 8, 76),
      spark(88, 20, 8),
      spark(8, 30, 5),
    ],
  };
