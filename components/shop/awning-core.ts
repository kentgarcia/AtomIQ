/**
 * The shop's roof: a striped awning with a scalloped edge, as pure geometry.
 *
 * The awning is a row of stripes that alternate between two colours. Each stripe is a rectangle from
 * the top of the screen down to `body`, ending in a shallow round bump (the scallop: half an ellipse as
 * wide as the stripe and `SCALLOP_DEPTH` deep), so the lower edge is a run of bumps. A copy of the whole
 * row, shifted down by `lip` and drawn first in a darker shade, shows under the bumps as the awning's
 * thickness. Flat shapes only: no gradients, no outlines.
 */

export interface Stripe {
  /** Position in the row, from 0 at the left: even and odd stripes take the two colours. */
  index: number;
  /** The path, in dp, with the origin at the top-left of the awning. */
  d: string;
}

/** How far a scallop hangs below the straight part, whatever the stripe's width. */
export const SCALLOP_DEPTH = 14;

const f = (n: number) => Math.round(n * 100) / 100;

/** How many stripes fit `width`: an even number (so the row starts and ends on different colours), each close to `target` dp wide. */
export function stripeCount(width: number, target = 58): number {
  const n = Math.max(2, Math.round(width / target));
  return n % 2 === 0 ? n : n + 1;
}

/** The stripes of an awning `width` wide whose straight part is `body` tall (the scallops hang below it). */
export function awningStripes(width: number, count: number, body: number, lipShift = 0): Stripe[] {
  const w = width / count;
  return Array.from({ length: count }, (_, index) => {
    const x0 = index * w;
    const x1 = (index + 1) * w;
    const y = body + lipShift;
    // The top edge runs a little past the screen so no hairline shows; down the right side, a half ellipse back, up the left.
    const d = `M${f(x0)} ${f(-4 + lipShift)}H${f(x1)}V${f(y)}A${f(w / 2)} ${SCALLOP_DEPTH} 0 0 1 ${f(x0)} ${f(y)}Z`;
    return { index, d };
  });
}

/** The height the awning takes: the straight part, the scallops, and the lip under them. */
export const awningHeight = (body: number, lip: number): number => body + SCALLOP_DEPTH + lip;
