/**
 * The tour's pointing hand as pure data (docs/features/TUTORIAL_SPEC.md §4.1): an index finger up, three curled fingers beside it, a thumb
 * and a round palm, on a 52 x 64 frame. The picture is drawn twice by `PointingHand.tsx`: every shape in the outline colour grown by
 * `OUTLINE` on each side, then every shape in the fill on top, so one clean outline runs round the whole hand and no seam shows
 * where a finger meets the palm. `CREASES` are the short lines between the fingers. The hand is always upright: it comes from
 * below, and `HAND_TIP` is the point of the finger, which the layer puts on the lit control.
 */

export interface HandRect {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  /** Turn, in degrees, about the rectangle's centre. */
  turn?: number;
}

export const HAND_VIEWBOX = { w: 52, h: 64 } as const;

/** The tip of the pointing finger, in the frame's units. */
export const HAND_TIP = { x: 20, y: 2 } as const;

/** Half the outline's width: how far every shape is grown for the outline layer. */
export const OUTLINE = 2.2;

/** Back to front: the curled fingers, the index finger, the thumb, then the palm that hides their feet. */
export const HAND_SHAPES: readonly HandRect[] = [
  { x: 43, y: 27, w: 8, h: 21, r: 4 },
  { x: 34, y: 23, w: 10, h: 25, r: 5 },
  { x: 25, y: 20, w: 11, h: 28, r: 5.5 },
  { x: 14, y: 2, w: 12, h: 40, r: 6 },
  { x: 2, y: 37, w: 21, h: 12, r: 6, turn: -28 },
  { x: 9, y: 33, w: 42, h: 29, r: 14 },
];

/** Short lines between the fingers and at the thumb, in the outline colour at low strength. */
export const CREASES: readonly { x1: number; y1: number; x2: number; y2: number }[] = [
  { x1: 25.6, y1: 25, x2: 25.6, y2: 36 },
  { x1: 35, y1: 28, x2: 35, y2: 37 },
  { x1: 43.6, y1: 31, x2: 43.6, y2: 38 },
];
