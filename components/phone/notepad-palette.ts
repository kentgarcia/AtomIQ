/**
 * Field Notes' header is the top of a yellow legal pad: a darker yellow binding strip with a perforated tear edge and its
 * controls in dark grey ink. Fixed colours from the object art's families (mixed in code, no literals), the same in light and
 * dark mode like a real pad (theme exception EX-13); anything drawn on the strip uses `PAD.ink`, never the theme's text colour.
 * The page under the strip is the app's own page colour, with the theme's text. Pure data and geometry, no framework.
 */

import { mixHex } from "../periodic-table/category-colors.ts";
import { BEE, EEL, SNOW } from "../lesson/visual/object-art.ts";

export const PAD = {
  /** The pills and round buttons on the strip: white warmed a little toward yellow. */
  paper: mixHex(SNOW, BEE[0], 0.5),
  /** The binding strip and the one-step-darker edge under it. */
  band: BEE[1],
  bandLip: BEE[2],
  /** Handwriting on the strip: dark grey. */
  ink: EEL[1],
  /** The highlighter under the chosen tab, and the sticky note a clipping sits on. */
  highlight: BEE[1],
} as const;

const f = (n: number) => Math.round(n * 100) / 100;

/** The perforation along the strip's lower edge: a row of holes `radius` wide, about `gap` apart, centred on the edge. */
export function perforation(width: number, radius = 6, gap = 22): { cx: number; r: number }[] {
  const n = Math.max(1, Math.floor(width / gap));
  const step = width / n;
  return Array.from({ length: n }, (_, i) => ({ cx: f(step * (i + 0.5)), r: radius }));
}
