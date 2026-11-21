/**
 * Which nodes of the Home map are drawn (docs/features/RENDER_COST_SPEC.md C1). The map was one ScrollView that mounted every node of every unit
 * (each a few Svg views and animated styles), so it grew with every unit shipped. Node positions are fixed numbers, so a node far from the screen
 * can simply not be drawn: its spot is empty space (nodes are absolutely placed), and it is mounted again before it scrolls into view.
 *
 * The window is recomputed in steps (`band`) of scrolling, not on every scroll event, so the map re-renders about once per `WINDOW_BAND` dp.
 * Pure numbers, tested in `scripts/test-path-nodes.mjs`.
 */

/** Scrolling this far moves the window one step. */
export const WINDOW_BAND = 320;

/** The window step for a scroll offset. */
export const windowBand = (scrollY: number, band: number = WINDOW_BAND): number => (Number.isFinite(scrollY) ? Math.max(0, Math.floor(scrollY / band)) : 0);

/** How far past the screen, each side, nodes stay drawn: a screen and a half, so a fling never reaches an empty map before the next step. */
export const windowMargin = (viewportHeight: number): number => Math.round(viewportHeight * 1.5);

/**
 * Whether a node whose box starts at `nodeY` (in scroll-content coordinates) is inside the window of step `bandIndex`. The window is the
 * screen at the whole step (so wherever in the step the offset is, the screen is inside), plus the margin each side.
 */
export function nodeInWindow(nodeY: number, boxHeight: number, bandIndex: number, viewportHeight: number, band: number = WINDOW_BAND): boolean {
  const margin = windowMargin(viewportHeight);
  const top = bandIndex * band - margin;
  const bottom = (bandIndex + 1) * band + viewportHeight + margin;
  return nodeY + boxHeight > top && nodeY < bottom;
}
