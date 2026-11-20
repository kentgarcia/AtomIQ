/**
 * The Reference Library is drawn as a library: a dark wood header with a row of books standing on a shelf plank, and each
 * source is a book (a coloured spine with two lighter bands, then the cover) standing on the plank of its unit's shelf.
 * Fixed colours from the object art's families (no literals), the same in light and dark mode like painted wood and cloth
 * (theme exception EX-13); anything drawn on the wood uses `LIB`, never the theme's text colour. Pure data and geometry.
 */

import { BEE, COFFEE, CRUMB, FOX, LEAF, PLUM, RED, SEA } from "../lesson/visual/object-art.ts";

export const LIB = {
  /** The header's wood and the darker edge under it. */
  wood: COFFEE[1],
  woodLip: COFFEE[2],
  /** The shelf plank's face (lighter wood) and its edge. */
  plank: COFFEE[0],
  plankLip: COFFEE[2],
  /** Cream paper: the pills and round buttons on the wood, and the title. */
  paper: CRUMB[0],
  /** Dark ink on the cream. */
  ink: COFFEE[2],
} as const;

export interface Spine {
  /** The cloth colour and the lighter bands across it. */
  fill: string;
  band: string;
}

/** The book colours, in the order they repeat. */
export const SPINES: readonly Spine[] = [
  { fill: RED[1], band: RED[0] },
  { fill: SEA[1], band: SEA[0] },
  { fill: LEAF[1], band: LEAF[0] },
  { fill: PLUM[1], band: PLUM[0] },
  { fill: FOX[1], band: FOX[0] },
  { fill: BEE[1], band: BEE[0] },
];

/** The colour of the nth book (stable, so a source keeps its colour as the list changes only by position). */
export const spineAt = (i: number): Spine => SPINES[((i % SPINES.length) + SPINES.length) % SPINES.length];

export interface HeaderBook extends Spine {
  x: number;
  w: number;
  h: number;
}

/** The row of books on the header's plank: `width` wide, none taller than `maxH`, side by side with a small gap. */
export function headerBooks(width: number, maxH = 44, margin = 14): HeaderBook[] {
  const books: HeaderBook[] = [];
  let x = margin;
  for (let i = 0; ; i++) {
    const w = 12 + ((i * 7) % 9);
    if (x + w > width - margin) break;
    const h = Math.round(maxH * 0.6 + ((i * 13) % 17) * (maxH * 0.4) / 16);
    books.push({ ...spineAt(i * 5 + 1), x, w, h });
    x += w + 3;
  }
  return books;
}
