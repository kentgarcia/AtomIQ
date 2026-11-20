/**
 * The Camera's flat backdrops (docs/features/PHONE_SPEC.md §9), in the lesson object art's look (project skill `duolingo-object-style`: flat colour, no
 * outlines, rounded shapes, the side facing away a step darker). Pure data with no framework imports, so Node tests can check it. Every
 * scene is one 100 x 125 frame (4:5); the figures stand on the ground line `GROUND` and are drawn over it. Colours are fixed hues, the same in
 * light and dark (theme exception EX-13).
 */

import {
  ANCHOVY,
  BEE,
  COFFEE,
  CRUMB,
  EEL,
  GLASS,
  LEAF,
  PINK,
  PLUM,
  RED,
  SEA,
  SNOW,
  circle,
  pill,
  rect,
  type ArtId,
  type ArtShape,
} from "../lesson/visual/object-art.ts";
import type { PhotoFrame, PhotoSceneId } from "./photo-core.ts";

export const PHOTO_FRAME = { w: 100, h: 125 } as const;
/** Where the figures' feet are (the ground starts here). */
export const GROUND = 100;

export type PhotoShape =
  ArtShape | { t: "art"; id: ArtId; x: number; y: number; size: number };

const art = (id: ArtId, x: number, y: number, size: number): PhotoShape => ({
  t: "art",
  id,
  x,
  y,
  size,
});
const sky = (fill: string): PhotoShape =>
  rect(0, 0, PHOTO_FRAME.w, PHOTO_FRAME.h, 0, fill);

export interface PhotoScene {
  id: PhotoSceneId;
  name: string;
  shapes: PhotoShape[];
  /**
   * Drawn over the figures: a hedge, a wall, a bench or a stage lip across the bottom, so the figures (waist-up, flat at the frame's edge)
   * look like they stand behind something instead of being cropped.
   */
  front: PhotoShape[];
}

/** Where the foreground starts: it hides the figures' cut edge, so it must start above the lowest point a figure shows. */
const FRONT = 104;

export const PHOTO_SCENE_LIST: readonly PhotoScene[] = [
  {
    id: "meadow",
    name: "Meadow",
    shapes: [
      sky(GLASS[0]),
      circle(80, 22, 17, BEE[0], 0.55),
      circle(80, 22, 11, BEE[1]),
      pill(10, 20, 26, 9, SNOW, 0.9),
      pill(18, 14, 18, 9, SNOW, 0.9),
      pill(52, 40, 22, 8, SNOW, 0.8),
      circle(18, 150, 70, LEAF[0]),
      circle(100, 142, 64, LEAF[1]),
      rect(0, GROUND, PHOTO_FRAME.w, 25, 0, LEAF[1]),
      rect(0, GROUND + 12, PHOTO_FRAME.w, 13, 0, LEAF[2]),
      circle(12, 110, 2.6, PINK[1]),
      circle(30, 114, 2.6, BEE[1]),
      circle(78, 112, 2.6, SNOW),
      circle(92, 108, 2.6, PINK[1]),
    ],
    // a hedge: darker bushes behind, lighter in front, a few flowers
    front: [
      rect(0, FRONT + 13, PHOTO_FRAME.w, 25, 0, LEAF[2]),
      ...[4, 20, 36, 52, 68, 84, 100].map((x) => circle(x, FRONT + 13, 9, LEAF[2])),
      rect(0, FRONT + 19, PHOTO_FRAME.w, 20, 0, LEAF[1]),
      ...[-2, 12, 28, 44, 60, 76, 92, 108].map((x) => circle(x, FRONT + 19, 7.5, LEAF[1])),
      circle(14, FRONT + 20, 2.2, PINK[1]),
      circle(46, FRONT + 21, 2.2, BEE[1]),
      circle(70, FRONT + 19, 2.2, SNOW),
      circle(90, FRONT + 21, 2.2, PINK[1]),
    ],
  },
  {
    id: "night",
    name: "Night",
    shapes: [
      sky(PLUM[2]),
      circle(78, 24, 11, CRUMB[0]),
      circle(83, 20, 10, PLUM[2]),
      ...[
        [14, 14, 1.8],
        [30, 30, 1.4],
        [50, 12, 1.8],
        [64, 44, 1.4],
        [90, 56, 1.6],
        [8, 52, 1.4],
        [42, 56, 1.4],
      ].map(([x, y, r]) => circle(x, y, r, SNOW)),
      circle(20, 150, 68, PLUM[1]),
      circle(98, 140, 60, PLUM[1]),
      rect(0, GROUND, PHOTO_FRAME.w, 25, 0, EEL[2]),
      rect(0, GROUND + 14, PHOTO_FRAME.w, 11, 0, EEL[1], 0.5),
    ],
    // a low stone wall with a pale cap
    front: [
      rect(-4, FRONT + 2, PHOTO_FRAME.w + 8, 30, 8, EEL[0]),
      rect(-4, FRONT + 8, PHOTO_FRAME.w + 8, 30, 0, EEL[1]),
      pill(-4, FRONT + 2, PHOTO_FRAME.w + 8, 7, EEL[0]),
      pill(8, FRONT + 14, 26, 6, EEL[2]),
      pill(46, FRONT + 14, 20, 6, EEL[2]),
      pill(76, FRONT + 14, 26, 6, EEL[2]),
      pill(26, FRONT + 24, 24, 6, EEL[2]),
      pill(62, FRONT + 24, 22, 6, EEL[2]),
    ],
  },
  {
    id: "lab",
    name: "Lab",
    shapes: [
      sky(GLASS[1]),
      rect(0, 70, PHOTO_FRAME.w, 40, 0, GLASS[0]),
      rect(58, 10, 34, 38, 7, COFFEE[1]),
      rect(60, 12, 30, 34, 5, SNOW),
      art("atom", 62, 14, 26),
      rect(8, 26, 34, 5, 2.5, COFFEE[1]),
      art("magnet", 10, 8, 20),
      art("bolt", 28, 10, 16),
      rect(0, GROUND, PHOTO_FRAME.w, 25, 0, ANCHOVY[2]),
      rect(0, GROUND, PHOTO_FRAME.w, 6, 0, ANCHOVY[1]),
    ],
    // a lab bench: a pale top over a wooden front with two drawers
    front: [
      rect(-4, FRONT + 4, PHOTO_FRAME.w + 8, 30, 0, COFFEE[1]),
      rect(-4, FRONT + 4, PHOTO_FRAME.w + 8, 6, 3, ANCHOVY[0]),
      rect(8, FRONT + 14, 38, 11, 4, COFFEE[2]),
      rect(54, FRONT + 14, 38, 11, 4, COFFEE[2]),
      pill(22, FRONT + 18, 10, 3.5, COFFEE[0]),
      pill(68, FRONT + 18, 10, 3.5, COFFEE[0]),
    ],
  },
  {
    id: "stage",
    name: "Stage",
    shapes: [
      sky(PINK[0]),
      { t: "path", d: "M50 0L82 100H18Z", fill: SNOW, opacity: 0.5 },
      rect(-8, -4, 24, 110, 8, RED[1]),
      rect(84, -4, 24, 110, 8, RED[1]),
      rect(-8, -4, 14, 110, 7, RED[2]),
      rect(94, -4, 14, 110, 7, RED[2]),
      rect(0, GROUND, PHOTO_FRAME.w, 25, 0, PLUM[1]),
      rect(0, GROUND, PHOTO_FRAME.w, 6, 0, PLUM[0]),
      ...[
        [30, 20, SEA[1]],
        [66, 14, BEE[1]],
        [44, 46, LEAF[1]],
        [74, 52, RED[1]],
        [24, 60, BEE[1]],
      ].map(([x, y, fill]) =>
        circle(x as number, y as number, 2.4, fill as string),
      ),
    ],
    // the front of the stage: velvet with a gold trim and footlights
    front: [
      rect(-4, FRONT + 4, PHOTO_FRAME.w + 8, 30, 0, RED[2]),
      pill(-4, FRONT + 2, PHOTO_FRAME.w + 8, 6, BEE[1]),
      ...[10, 30, 50, 70, 90].map((x) => circle(x, FRONT + 15, 3, BEE[0])),
      rect(-4, FRONT + 22, PHOTO_FRAME.w + 8, 14, 0, RED[1], 0.35),
    ],
  },
];

export const PHOTO_SCENE_BY_ID: Readonly<Record<PhotoSceneId, PhotoScene>> =
  Object.fromEntries(PHOTO_SCENE_LIST.map((s) => [s.id, s])) as Record<
    PhotoSceneId,
    PhotoScene
  >;

/** A frame: the border colour and its widths as a share of the picture's width (the white one leaves a taller strip below, like an instant photo). */
export const PHOTO_FRAME_STYLE: Readonly<
  Record<PhotoFrame, { color: string; side: number; bottom: number } | null>
> = {
  none: null,
  white: { color: SNOW, side: 0.05, bottom: 0.16 },
  sun: { color: BEE[1], side: 0.05, bottom: 0.05 },
  ink: { color: EEL[1], side: 0.05, bottom: 0.05 },
};
