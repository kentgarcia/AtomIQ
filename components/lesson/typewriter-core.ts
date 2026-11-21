/**
 * The typewriter for a speech bubble, as pure maths (no React): how many characters are showing
 * after a time, and how to cut text that holds glossary terms ("[[atom|atoms]]") at that point.
 * Unit-tested in `scripts/test-lecture.mjs`.
 *
 * The part not typed yet is still laid out (just invisible), so the bubble never changes size or
 * re-wraps while it types.
 */

import type { TextSegment } from "../../content/curriculum/terms.ts";

/** How fast a bubble types, characters per second: a calm reading pace, not a flood. */
export const TYPE_CPS = 48;

/** Characters showing `elapsedMs` after typing starts, out of `total`. */
export function visibleCount(elapsedMs: number, total: number, cps: number = TYPE_CPS): number {
  if (elapsedMs <= 0) return 0;
  return Math.min(total, Math.floor((elapsedMs / 1000) * cps));
}

/** How many characters appear at once: a bubble is laid out again at each step, so fewer, larger steps cost the JS thread and the text layout less (RENDER_COST_SPEC C4). */
export const TYPE_STEP = 3;

/** `count` rounded down to a whole step, except that the end is always reached. */
export function stepped(count: number, total: number, step: number = TYPE_STEP): number {
  if (count >= total) return total;
  return Math.floor(Math.max(0, count) / step) * step;
}

/** How long typing `total` characters takes, ms. */
export function typeDuration(total: number, cps: number = TYPE_CPS): number {
  return Math.ceil((total / cps) * 1000);
}

/** The characters of a whole text as the learner sees it (term markers resolved). */
export function totalChars(segments: readonly TextSegment[]): number {
  let n = 0;
  for (const s of segments) n += s.text.length;
  return n;
}

export interface ClippedSegment {
  /** The whole segment, as in the text. */
  text: string;
  termId?: string;
  /** The typed part and the part still to come; `shown + hidden === text`. */
  shown: string;
  hidden: string;
}

/** Cut the segments after `count` characters (in order), keeping each segment whole. */
export function clipSegments(segments: readonly TextSegment[], count: number): ClippedSegment[] {
  let left = Math.max(0, count);
  return segments.map((s) => {
    const take = Math.min(left, s.text.length);
    left -= take;
    return { text: s.text, termId: s.termId, shown: s.text.slice(0, take), hidden: s.text.slice(take) };
  });
}
