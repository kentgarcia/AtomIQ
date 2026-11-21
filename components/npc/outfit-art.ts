/**
 * The extra clothes of the avatar, as pure data (only `lab-apron-art.ts` is imported): fourteen outfits beyond the five the teachers wear.
 *
 * Only the top of the body shows in the avatar's picture (the shoulders' dome from y 68 down to about 108), so
 * what makes each outfit is up there: the neckline, the collar, a scarf, straps, bands and patterns cut to the
 * curve of the shoulders. The dome is a circle (radius 72, centre y 140), so a band across it is exact: no clip.
 * `npc-art.ts` turns each piece's `tone` into a colour: `main` and `shade` are the colour the learner picked and
 * its darker step, `collar` is the shirt colour (white), the rest are fixed. Flat shapes only: no outlines, one
 * shade step, round-capped lines.
 */

import { APRON_PIECES, APRON_PUFFS, type ApronTone } from "./lab-apron-art.ts";

export type OutfitTone = "main" | "shade" | "collar" | "skin" | "white" | "swan" | "gold" | "red" | "pink" | "collarShade" | "tan" | "tanShade" | "violet" | "violetShade";
export type OutfitPiece = { d: string; tone: OutfitTone; evenOdd?: boolean } | { line: string; tone: OutfitTone; w: number };

export const EXTRA_OUTFITS = ["turtleneck", "striped", "overalls", "cardigan", "jacket", "polo", "sailor", "hawaiian", "puffer", "tuxedo", "knit", "scarf", "labapron", "whitecoat"] as const;
export type ExtraOutfit = (typeof EXTRA_OUTFITS)[number];

export interface OutfitArt {
  /** What the body is filled with: the learner's colour (default) or the shirt colour. */
  body?: "collar";
  /** The sleeves' colour: the learner's colour (default) or the shirt colour. */
  sleeve?: "collar";
  pieces: OutfitPiece[];
}

// ── the dome ─────────────────────────────────────────────────────────────────

const R = 72;
const CY = 140;
const f = (n: number) => Math.round(n * 100) / 100;
/** Half the width of the shoulders at height y. */
const half = (y: number) => (y >= CY ? R : Math.sqrt(Math.max(0, R * R - (CY - y) * (CY - y))));
/** The top of the dome at x. */
const topAt = (x: number) => CY - Math.sqrt(Math.max(0, R * R - x * x));

/** A band across the whole body between two heights, edges on the outline. */
function band(y1: number, y2: number): string {
  const right = y2 <= CY ? `A${R} ${R} 0 0 1 ${f(half(y2))} ${y2}` : y1 >= CY ? `L${f(half(y2))} ${y2}` : `A${R} ${R} 0 0 1 ${R} ${CY}L${R} ${y2}`;
  const left = y2 <= CY ? `A${R} ${R} 0 0 1 ${f(-half(y1))} ${y1}` : y1 >= CY ? `L${f(-half(y1))} ${y1}` : `L${-R} ${CY}A${R} ${R} 0 0 1 ${f(-half(y1))} ${y1}`;
  return `M${f(-half(y1))} ${y1}L${f(half(y1))} ${y1}${right}L${f(-half(y2))} ${y2}${left}Z`;
}

/** A vertical strap from the edge of the dome down to `bottom`, between x1 and x2. */
const strap = (x1: number, x2: number, bottom: number) => `M${x1} ${bottom}L${x1} ${f(topAt(x1))}A${R} ${R} 0 0 1 ${x2} ${f(topAt(x2))}L${x2} ${bottom}Z`;

const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}V${f(y + h - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w - q)} ${f(y + h)}H${f(x + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y + h - q)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}Z`;
}
function roundPoly(points: [number, number][], r: number): string {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const prev = points[(i + n - 1) % n];
    const next = points[(i + 1) % n];
    const lp = Math.hypot(prev[0] - p[0], prev[1] - p[1]);
    const ln = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const k = Math.min(r, lp / 2, ln / 2);
    const a = [p[0] + ((prev[0] - p[0]) / lp) * k, p[1] + ((prev[1] - p[1]) / lp) * k];
    const b = [p[0] + ((next[0] - p[0]) / ln) * k, p[1] + ((next[1] - p[1]) / ln) * k];
    d += `${i === 0 ? "M" : "L"}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
  }
  return d + "Z";
}
const mirror = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [-x, y]).reverse() as [number, number][];

/** Heights from `from` to the bottom of the body, `step` apart. */
const rows = (from: number, step: number): number[] => Array.from({ length: Math.ceil((250 - from) / step) }, (_, i) => from + i * step);

const fill = (d: string, tone: OutfitTone): OutfitPiece => ({ d, tone });
const line = (d: string, tone: OutfitTone, w: number): OutfitPiece => ({ line: d, tone, w });
/** A shape and its mirror image across the middle. */
const pair = (pts: [number, number][], r: number, tone: OutfitTone): OutfitPiece[] => [fill(roundPoly(pts, r), tone), fill(roundPoly(mirror(pts), r), tone)];

function flower(cx: number, cy: number, r: number, petal: OutfitTone, centre: OutfitTone): OutfitPiece[] {
  const out: OutfitPiece[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    out.push(fill(circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.8), petal));
  }
  out.push(fill(circle(cx, cy, r * 0.55), centre));
  return out;
}

/** The apron's own tones as the extra outfits' tones: the shirt is the learner's colour, the rest are fixed. */
const APRON_TONES: Record<ApronTone, OutfitTone> = { shirt: "main", shirtShade: "shade", apron: "tan", apronShade: "tanShade", white: "white", mint: "white", badge: "violet", badgeInk: "violetShade" };

// ── the outfits ──────────────────────────────────────────────────────────────

export const EXTRA_OUTFIT_ART: Record<ExtraOutfit, OutfitArt> = {
  // A tall ribbed neck that hides the neck, with a fold
  turtleneck: {
    pieces: [
      fill(rrect(-27, 56, 54, 34, 15), "shade"),
      ...[-16, -8, 0, 8, 16].map((x) => line(`M${x} 64V82`, "main", 3)),
      line("M-22 86Q0 94 22 86", "main", 3),
      ...[-40, 40].map((x) => line(`M${x} 100V170`, "shade", 3.2)),
      ...[-52, 52].map((x) => line(`M${x} 112V170`, "shade", 3.2)),
    ],
  },
  // A Breton top: stripes across the white shirt, a boat neck
  striped: {
    body: "collar",
    pieces: rows(74, 16).map((y) => fill(band(y, y + 8), "main")).concat([fill(rrect(-27, 62, 54, 18, 9), "shade"), fill(rrect(-21, 61, 42, 14, 7), "skin")]),
  },
  // A white tee under a bib with two straps, gold buttons and a pocket
  overalls: {
    body: "collar",
    sleeve: "collar",
    pieces: [
      fill(rrect(-17, 63, 34, 12, 6), "swan"),
      fill(strap(-38, -24, 106), "main"),
      fill(strap(24, 38, 106), "main"),
      fill(rrect(-36, 103, 72, 160, 12), "main"),
      fill(rrect(-15, 113, 30, 20, 5), "shade"),
      fill(circle(-31, 104, 3.8), "gold"),
      fill(circle(31, 104, 3.8), "gold"),
    ],
  },
  // A knitted cardigan over a white tee: scoop neck, a placket with buttons, cable stitches
  cardigan: {
    pieces: [
      fill("M-30 66A30 30 0 0 0 30 66Z", "collar"),
      line("M-31 67A31 31 0 0 0 31 67", "shade", 6),
      fill(rrect(-5, 94, 10, 160, 3), "shade"),
      ...rows(102, 15).map((y) => fill(circle(0, y, 3.2), "white")),
      ...[-42, 42].map((x) => line(`M${x} 90V170`, "shade", 3.2)),
      ...[-53, 53].map((x) => line(`M${x} 100V170`, "shade", 3.2)),
    ],
  },
  // A zip jacket with a standing collar, a zip and two white stripes across the chest
  jacket: {
    pieces: [
      fill(band(98, 103), "collar"),
      fill(band(108, 112), "collar"),
      fill(rrect(-30, 63, 60, 24, 11), "shade"),
      line("M0 70V250", "white", 3.4),
      fill(circle(0, 93, 3.6), "gold"),
    ],
  },
  // A polo: two collar flaps and a placket with two buttons
  polo: {
    pieces: [
      fill(rrect(-6.5, 76, 13, 64, 4), "shade"),
      ...pair([[-26, 66], [-3, 72], [-4, 93], [-18, 90]], 5, "shade"),
      ...[89, 101, 113, 125].map((y) => fill(circle(0, y, 2.6), "white")),
    ],
  },
  // A sailor top: a white collar with a stripe along its edge and a red bow
  sailor: {
    pieces: [
      ...pair([[-52, 80], [-17, 63], [-3, 98], [-9, 111], [-46, 107]], 6, "collar"),
      line("M-44 98L-12 106", "main", 3.4),
      line("M44 98L12 106", "main", 3.4),
      fill(roundPoly([[0, 90], [-17, 80], [-17, 100]], 4), "red"),
      fill(roundPoly([[0, 90], [17, 80], [17, 100]], 4), "red"),
      fill(circle(0, 90, 5.4), "red"),
    ],
  },
  // An aloha shirt: open collar and a scatter of flowers
  hawaiian: {
    pieces: [
      fill(roundPoly([[-18, 64], [18, 64], [0, 97]], 5), "skin"),
      ...pair([[-34, 70], [-15, 62], [-1, 93], [-18, 99]], 5, "collar"),
      ...flower(-37, 92, 5.2, "white", "gold"),
      ...flower(-51, 103, 4.4, "pink", "gold"),
      ...flower(37, 91, 5.2, "pink", "gold"),
      ...flower(51, 102, 4.4, "white", "gold"),
      ...flower(23, 104, 4.2, "white", "gold"),
      ...flower(-20, 124, 5.2, "pink", "gold"),
      ...flower(38, 128, 5, "white", "gold"),
      ...flower(-46, 140, 5, "white", "gold"),
      ...flower(6, 144, 5.2, "pink", "gold"),
      ...flower(54, 156, 4.6, "pink", "gold"),
    ],
  },
  // A puffer jacket: a tall padded collar and quilted seams
  puffer: {
    pieces: [
      ...rows(82, 12).map((y) => line(`M${f(-half(y) + 7)} ${y}H${f(half(y) - 7)}`, "shade", 3)),
      fill(rrect(-35, 58, 70, 34, 16), "shade"),
      line("M0 90V250", "white", 3.4),
    ],
  },
  // A dressy jacket: lapels, a white shirt and a red bow tie
  tuxedo: {
    pieces: [
      fill(roundPoly([[-26, 64], [26, 64], [0, 120]], 6), "collar"),
      ...pair([[-48, 82], [-26, 64], [0, 120], [-14, 119], [-30, 102]], 5, "shade"),
      fill(roundPoly([[0, 78], [-19, 67], [-19, 89]], 4), "red"),
      fill(roundPoly([[0, 78], [19, 67], [19, 89]], 4), "red"),
      fill(circle(0, 78, 5), "red"),
    ],
  },
  // A knitted jumper with a band of diamonds and a row of dots
  knit: {
    pieces: [
      fill(band(88, 104), "collar"),
      ...[-44, -22, 0, 22, 44].map((x) => fill(roundPoly([[x, 90], [x + 8, 96], [x, 102], [x - 8, 96]], 1.5), "main")),
      fill(band(128, 144), "collar"),
      ...[-55, -33, -11, 11, 33, 55].map((x) => fill(roundPoly([[x, 130], [x + 8, 136], [x, 142], [x - 8, 136]], 1.5), "main")),
      fill(band(160, 164), "collar"),
      ...[-30, -12, 12, 30].map((x) => fill(circle(x, 80.5, 2.3), "collar")),
      fill(rrect(-23, 63, 46, 14, 7), "shade"),
    ],
  },
  // A striped scarf wound round the neck, one end hanging with a fringe
  scarf: {
    pieces: [
      fill(rrect(8, 78, 22, 46, 6), "collar"),
      fill(rrect(8, 90, 22, 6, 0), "main"),
      fill(rrect(8, 104, 22, 6, 0), "main"),
      ...[13, 19, 25].map((x) => line(`M${x} 124V131`, "collar", 2.8)),
      fill(rrect(-28, 60, 56, 28, 13), "collar"),
      ...[-20, -3, 14].map((x) => fill(rrect(x, 62, 6, 24, 2), "main")),
    ],
  },
  // A white lab coat over a jumper in the learner's colour: the jumper shows in a V under a crew neck, the lapels and a chest pocket with two pens
  whitecoat: {
    body: "collar",
    sleeve: "collar",
    pieces: [
      fill(roundPoly([[-34, 64], [34, 64], [0, 130]], 8), "main"),
      fill(rrect(-22, 62, 44, 16, 8), "shade"),
      ...pair([[-52, 86], [-34, 66], [0, 130], [-13, 130], [-34, 106]], 5, "collarShade"),
      fill(rrect(20, 122, 34, 28, 6), "collarShade"),
      fill(rrect(27, 108, 6, 18, 3), "red"),
      fill(rrect(38, 111, 6, 15, 3), "main"),
    ],
  },
  // Ada's lab outfit: a shirt in the learner's colour with puffed shoulders and a white round collar, under a tan apron with a violet radiation badge
  labapron: {
    pieces: [...APRON_PUFFS, ...APRON_PIECES].map((piece): OutfitPiece => ({ d: piece.d, tone: APRON_TONES[piece.tone] })),
  },
};

export const isExtraOutfit = (kind: string): kind is ExtraOutfit => (EXTRA_OUTFITS as readonly string[]).includes(kind);
