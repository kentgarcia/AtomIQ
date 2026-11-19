/**
 * The speech bubble that opens when a lesson-map node is tapped: where it sits and what it says.
 * Pure data and numbers (unit-tested in `scripts/test-path-nodes.mjs`); `NodeBubble.tsx` draws it.
 */

import { NODE, PUCK_CENTER_Y } from "./node-geometry.ts";

export const BUBBLE = {
  maxWidth: 260,
  /** Least space between the bubble and the edge of the map. */
  margin: 16,
  /** Side of the little square that makes the pointer. */
  arrow: 16,
  /** Gap between the node (or its ring) and the bubble, which the pointer crosses. */
  gap: 14,
  /** Keep the pointer this far from the bubble's corners. */
  arrowInset: 22,
} as const;

/** Which side of its node the bubble opens on. */
export type BubbleSide = "below" | "above";

export interface BubblePlacement {
  left: number;
  width: number;
  /** Left edge of the pointer inside the bubble. */
  arrowLeft: number;
  /** Top of the bubble when it is below its node, in the same space as the node's centre y. */
  top: number;
  /** Lower edge of the bubble when it is above its node, in the same space. */
  bottomEdge: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * The bubble is as wide as it can be up to `maxWidth`, kept inside the map, with its pointer aimed
 * at the node. Below the node (`top`) or above it (`bottomEdge`): `chooseBubbleSide` picks. The
 * current node has a ring, so its bubble keeps clear of that.
 */
export function bubblePlacement(args: { x: number; y: number; mapWidth: number; current: boolean }): BubblePlacement {
  const { x, y, mapWidth, current } = args;
  const width = Math.max(0, Math.min(BUBBLE.maxWidth, mapWidth - BUBBLE.margin * 2));
  const left = clamp(x - width / 2, BUBBLE.margin, Math.max(BUBBLE.margin, mapWidth - width - BUBBLE.margin));
  const arrowLeft = clamp(
    x - left - BUBBLE.arrow / 2,
    BUBBLE.arrowInset,
    Math.max(BUBBLE.arrowInset, width - BUBBLE.arrowInset - BUBBLE.arrow),
  );
  const boxTop = y - NODE.box / 2;
  const ring = NODE.ring.radius + NODE.ring.stroke / 2;
  const nodeBottom = current ? boxTop + PUCK_CENTER_Y + ring : boxTop + NODE.faceH + NODE.lip;
  const nodeTop = current ? boxTop + PUCK_CENTER_Y - ring : boxTop;
  return { left, width, arrowLeft, top: nodeBottom + BUBBLE.gap, bottomEdge: nodeTop - BUBBLE.gap };
}

/**
 * About how tall the bubble is, before it has been drawn: the padding, the small line, the title
 * (wrapping at about 11 px a letter) and the button or the locked hint. Used to decide which side
 * has room, so it errs a little tall.
 */
export function bubbleHeight(args: { title: string; width: number; locked: boolean; /** A sentence under the title (about 7.5 px a letter, 20 px a line). */ detail?: string; /** Lines the locked note takes when it is not the usual three. */ hintLines?: number }): number {
  const perLine = Math.max(8, Math.floor((args.width - 32) / 11));
  const titleLines = Math.min(3, Math.max(1, Math.ceil(args.title.length / perLine)));
  const action = args.locked ? 8 + (args.hintLines ?? 3) * 19 : 12 + 62;
  const detailLines = args.detail ? Math.min(5, Math.ceil(args.detail.length / Math.max(8, Math.floor((args.width - 32) / 7.5)))) : 0;
  return 14 + 16 + 14 + 4 + titleLines * 26 + (detailLines ? 4 + detailLines * 20 : 0) + action + 4;
}

export interface BubbleChoice {
  side: BubbleSide;
  /** How far to scroll the map (positive: further down) so the whole bubble can be seen; 0 when it already can. */
  scrollBy: number;
}

/**
 * Below the node when the bubble fits there, above it when it does not (a node near the bottom,
 * by the navbar). `bandTop` and `bandBottom` are the part of the screen the map can be seen in:
 * under the lesson card and above the navbar, in the same space as `y`. When neither side fits
 * the map is scrolled by the smaller amount that makes one of them.
 */
export function chooseBubbleSide(args: {
  /** Centre of the node, in the same space as the band. */
  y: number;
  current: boolean;
  height: number;
  bandTop: number;
  bandBottom: number;
}): BubbleChoice {
  const { y, current, height, bandTop, bandBottom } = args;
  const place = bubblePlacement({ x: 0, y, mapWidth: 1000, current });
  const extent = {
    below: { top: place.top, bottom: place.top + height },
    above: { top: place.bottomEdge - height, bottom: place.bottomEdge },
  };
  // Positive: the bubble runs past the bottom, so scroll down; negative: it runs past the top
  const need = (side: BubbleSide) => {
    const e = extent[side];
    if (e.bottom > bandBottom) return e.bottom - bandBottom;
    if (e.top < bandTop) return e.top - bandTop;
    return 0;
  };
  const below = need("below");
  if (below === 0) return { side: "below", scrollBy: 0 };
  const above = need("above");
  if (above === 0) return { side: "above", scrollBy: 0 };
  return Math.abs(below) <= Math.abs(above) ? { side: "below", scrollBy: below } : { side: "above", scrollBy: above };
}

export type BubbleKind = "lesson" | "practice" | "checkpoint";
export type BubbleStatus = "locked" | "current" | "completed";

export interface BubbleCopy {
  /** Small line above the title: what kind of stop it is and where it sits in the unit. (No status line: the node itself shows it.) */
  eyebrow: string;
  /** The button, or null when the node cannot be opened yet. */
  actionLabel: string | null;
  /** Shown instead of a button when locked. */
  hint: string | null;
}

const KIND_LABEL: Record<BubbleKind, string> = { lesson: "Lesson", practice: "Practice", checkpoint: "Checkpoint" };

export function bubbleCopy(args: { kind: BubbleKind; status: BubbleStatus; index: number; total: number }): BubbleCopy {
  const { kind, status, index, total } = args;
  const eyebrow = `${KIND_LABEL[kind]} · ${Math.min(total, Math.max(1, index + 1))} of ${Math.max(1, total)}`;
  if (status === "locked") {
    return {
      eyebrow,
      actionLabel: null,
      hint: "Finish the steps before this one to unlock it.",
    };
  }
  if (status === "current") {
    return { eyebrow, actionLabel: "Start", hint: null };
  }
  return {
    eyebrow,
    actionLabel: kind === "lesson" ? "Review" : "Practice again",
    hint: null,
  };
}
