/**
 * The side tail of a speech bubble, as pure geometry (no React), so `scripts/test-speech-tail.mjs`
 * can check it and `SpeechBubble.tsx` only draws it. The tail is the bubble's own border carried out
 * to a rounded point: an outline as thick as the card's border in the border colour, with the face
 * colour inset by exactly that thickness.
 *
 * Two rules keep it clean (both were broken before):
 *  - It is never taller than the straight part of the card's edge. A card's side is only straight
 *    between its two corner arcs (`faceHeight - 2 * cardRadius`), and a one-line bubble has only
 *    about 22 dp of it, so the tail shrinks to fit (`tailHeightFor`) instead of poking out over the
 *    curved corner and into the bottom border.
 *  - Its base is flush with the border's inner edge, with square corners. A rounded or overlapping base
 *    leaves little nubs that stick into the face at the two corners where the tail leaves the card.
 *
 * Drawn pointing LEFT in local coordinates (tip at x = 0, base at x = `w`); the right-hand tail is the
 * same drawing mirrored. The face-coloured inner shape runs 1 dp further than the base, into the face,
 * so no hairline of the border shows where it opens the border.
 */

export const TAIL = {
  maxHeight: 30,
  minHeight: 18,
  /** Width over height of the full-size tail. */
  ratio: 16 / 30,
  /** How far past the straight part of the edge the tail may reach, dp (the arc has barely curved there). */
  slack: 4,
  tipRadius: 3,
  innerTipRadius: 1.5,
} as const;

/** The tail's height for a card face of `faceHeight` (without the lip), whole even dp so it centres on a pixel. */
export function tailHeightFor(faceHeight: number, cardRadius: number): number {
  const fit = faceHeight - 2 * cardRadius + TAIL.slack;
  const h = Math.max(TAIL.minHeight, Math.min(TAIL.maxHeight, fit));
  return 2 * Math.round(h / 2);
}

const f = (n: number): number => Math.round(n * 100) / 100;

/** A triangle with a vertical base at `baseX` from `y0` to `y1` and a rounded tip. */
function tipTriangle(baseX: number, y0: number, y1: number, tip: [number, number], r: number): string {
  const toward = (y: number): [number, number] => {
    const dx = baseX - tip[0];
    const dy = y - tip[1];
    const l = Math.hypot(dx, dy) || 1;
    return [tip[0] + (dx / l) * r, tip[1] + (dy / l) * r];
  };
  const a = toward(y0);
  const b = toward(y1);
  return `M${f(baseX)} ${f(y0)}L${f(a[0])} ${f(a[1])}Q${f(tip[0])} ${f(tip[1])} ${f(b[0])} ${f(b[1])}L${f(baseX)} ${f(y1)}Z`;
}

export interface SideTailGeometry {
  /** Height and width of the outline (the base is `w` from the tip). */
  h: number;
  w: number;
  /** Width of the drawing: the outline plus the 1 dp the face-coloured shape runs on. */
  drawW: number;
  /** How far the tail sticks out of the card's edge (its tip), dp. */
  protrude: number;
  outer: string;
  inner: string;
}

/** The two shapes of a tail of height `h` on a card with border `border`. */
export function sideTailGeometry(h: number, border: number): SideTailGeometry {
  const w = Math.round(h * TAIL.ratio);
  const half = h / 2;
  const slant = Math.atan2(half, w);
  // The inner edge is the outer edge moved in by exactly `border`, measured across the slant
  const innerTipX = border / Math.sin(slant);
  const slope = half / w;
  const innerBaseX = w + 1;
  // Half the height of the inner shape's base: the inner edge climbs `slope` per dp from its tip
  const innerHalf = (innerBaseX - innerTipX) * slope;
  return {
    h,
    w,
    drawW: w + 1,
    protrude: w - border,
    outer: tipTriangle(w, 0, h, [0, half], TAIL.tipRadius),
    inner: tipTriangle(innerBaseX, half - innerHalf, half + innerHalf, [innerTipX, half], TAIL.innerTipRadius),
  };
}
