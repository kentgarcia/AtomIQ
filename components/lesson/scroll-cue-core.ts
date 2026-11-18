/**
 * When a lesson page runs past the bottom of the screen, the learner is shown that there is more:
 * a fade at the bottom edge and a small down-arrow button (`ScrollCue.tsx`). The page does not
 * scroll by itself (the top is read first), so this is the only hint. Pure numbers, no React
 * (`node --test scripts/test-scroll-cue.mjs`).
 */

export const SCROLL_CUE = {
  /** Within this many dp of the end counts as "at the end": the cue goes away. */
  endThreshold: 24,
  /** Less than this much hidden below is not worth a cue (a few pixels of padding). */
  minHidden: 16,
  /** A tap on the button scrolls this fraction of the visible height, so the next lines land near the top. */
  stepFraction: 0.8,
  /** The cue fades in and out this long, ms. */
  fadeMs: 200,
  /** The arrow bobs this far, dp, every `bobMs`. */
  bob: 4,
  bobMs: 900,
} as const;

export interface ScrollMetrics {
  /** Height of everything inside the scroll view. */
  contentHeight: number;
  /** Height of the visible part. */
  viewHeight: number;
  /** How far it is scrolled from the top. */
  offsetY: number;
}

/** How much of the page is below the visible part, dp (never negative). */
export function hiddenBelow({ contentHeight, viewHeight, offsetY }: ScrollMetrics): number {
  return Math.max(0, contentHeight - viewHeight - Math.max(0, offsetY));
}

/**
 * Whether the cue should show: the page is taller than the screen and the learner is not yet at its end.
 * Before the view has been measured (`viewHeight` 0) it does not show.
 */
export function moreBelow(m: ScrollMetrics): boolean {
  if (m.viewHeight <= 0 || m.contentHeight <= 0) return false;
  const hidden = hiddenBelow(m);
  return hidden > Math.max(SCROLL_CUE.minHidden, SCROLL_CUE.endThreshold);
}

/** Where a tap on the button scrolls to: a bit less than a screen further, and never past the end. */
export function scrollTarget(m: ScrollMetrics): number {
  const end = Math.max(0, m.contentHeight - m.viewHeight);
  return Math.min(end, Math.max(0, m.offsetY) + m.viewHeight * SCROLL_CUE.stepFraction);
}
