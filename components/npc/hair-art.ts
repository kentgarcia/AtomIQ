/**
 * Hair styles drawn by hand as outlines (the shop's twenty extra styles), kept apart from `npc-art.ts` so
 * that file stays about the figure. Pure data with no imports.
 *
 * Every style sits on the same head (an apex at y -66, ears at x +-50 with their tops at y -9), in head
 * units, and is a few flat pieces in the hair colour or its shade: a cap whose face cut-out is an even-odd
 * hole (so sideburns and a fringe line fall out of two outlines), a top shape, a parting line. Rules kept
 * from the character skill: simple big shapes, hair always above the ear, nothing across the eyes (every
 * fringe stays above y -34, the top of the eyes is -28).
 */

/**
 * A piece of hair: a filled outline, or a round-capped line (a parting). `tone` picks the hair colour or its shade.
 * `under` is the cap's whole outer outline, drawn behind the head in the same colour: wherever the face cut-out
 * is wider than the head (at a hairline corner) hair shows instead of a gap.
 */
export type HairTone = "hair" | "shade" | "tie";
export type HairPiece = { d: string; tone: HairTone; evenOdd?: boolean; under?: string } | { line: string; tone: HairTone; w: number };

export type ExtraHairStyle =
  | "buzzcut" | "classic" | "messy" | "sidepart" | "curtain" | "bowl" | "spiky" | "wavy" | "longer" | "undercut"
  | "longstraight" | "shortbob" | "medium" | "highpony" | "lowpony" | "twintails" | "bigbun" | "halfup" | "longwavy" | "curtainbangs";

const f = (n: number) => Math.round(n * 100) / 100;

/** A closed polygon with every corner rounded by radius `r`, except the points whose index is in `sharp` (the bottom corners of a cap: the sideburn tip rounds them). */
function soft(points: [number, number][], r: number, sharp: number[] = []): string {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const prev = points[(i + n - 1) % n];
    const next = points[(i + 1) % n];
    const lp = Math.hypot(prev[0] - p[0], prev[1] - p[1]);
    const ln = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const k = sharp.includes(i) ? 0 : Math.min(r, lp / 2, ln / 2);
    const a = [p[0] + ((prev[0] - p[0]) / lp) * k, p[1] + ((prev[1] - p[1]) / lp) * k];
    const b = [p[0] + ((next[0] - p[0]) / ln) * k, p[1] + ((next[1] - p[1]) / ln) * k];
    d += `${i === 0 ? "M" : "L"}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
  }
  return d + "Z";
}

const disc = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

/** The ears: the head's side is straight below this y, and its top is a circle of radius 50 centred at y -16. */
export const SIDE_END = -10;

/**
 * The sideburns of a cap that is `xo` wide on the outside and `xi` on the inside (each side). They end in a round
 * tip: the cap stops `r` above `SIDE_END` (r = half the sideburn's width) and a disc of that radius finishes it, so
 * the lowest point is at `SIDE_END` and the end is a half circle, like the older haircuts.
 */
function sides(xo: number, xi: number) {
  const r = (xo - xi) / 2;
  const B = SIDE_END - r;
  const mid = (xo + xi) / 2;
  return { B, r, tips: (tone: HairTone = "hair"): HairPiece[] => [fill(disc(-mid, B, r), tone), fill(disc(mid, B, r), tone)] };
}

/** The cap: an outer outline with the face cut out of it (both end flat on the same line, so no band crosses the eyes). */
const cap = (outer: string, inner: string, tone: HairTone = "hair"): HairPiece => ({ d: outer + inner, tone, evenOdd: true, under: outer });
const fill = (d: string, tone: HairTone = "hair"): HairPiece => ({ d, tone });
const line = (d: string, w = 4, tone: HairTone = "shade"): HairPiece => ({ line: d, tone, w });

/** A shaved side: a pad over the sideburn in the shade, with a round tip, from `top` down to `SIDE_END`. */
const pad = (xl: number, xr: number, top: number, B: number, tone: HairTone = "shade"): HairPiece => {
  const r = (xr - xl) / 2;
  return fill(`M${xl} ${top}H${xr}V${B}A${f(r)} ${f(r)} 0 0 1 ${xl} ${B}Z`, tone);
};

/** A hairline that follows the head: a flat fringe at y -46 whose corners stay inside the round top of the head (half width 40 there). */
const hairline = (xi: number, B: number) => `M${-xi} ${B}V-30C${-xi} -38 -41 -44 -37 -46H37C41 -44 ${xi} -38 ${xi} -30V${B}Z`;

/** A path mirrored left to right (absolute M L C Q H V Z commands only). */
function mirror(d: string): string {
  return d.replace(/([MLCQHVZ])([^MLCQHVZ]*)/g, (_, cmd: string, args: string) => {
    if (cmd === "Z") return "Z";
    const nums = (args.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const out = nums.map((n, i) => (cmd === "V" ? n : cmd === "H" || i % 2 === 0 ? -n : n));
    return cmd + out.map(f).join(" ");
  });
}

/** A small rounded band (a hair tie) centred at (cx, cy), `w` by `h`, turned by `deg`. */
function band(cx: number, cy: number, w: number, h: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  const pts = ([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as [number, number][]).map(([x, y]): [number, number] => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  return soft(pts, Math.min(w, h) / 2.4);
}

/** The outer outline of a head of hair that is `xo` wide each side, and rises to `apex`: a bell, flat at the sides down to `B`. */
const bell = (xo: number, B: number, apex: number) => `M${-xo} ${B}V-50C${-xo - 4} ${apex + 14} -34 ${apex} 0 ${apex}C34 ${apex} ${xo + 4} ${apex + 14} ${xo} -50V${B}Z`;

/** The face cut-out of a long style: a hairline that arches to a gentle point at the parting. */
const arch = (xi: number, B: number, peak: number) => `M${-xi} ${B}V-30C${-xi} -44 -24 -50 0 ${peak}C24 -50 ${xi} -44 ${xi} -30V${B}Z`;

const OUT = { buzz: sides(55, 45), classic: sides(57, 44), sidepart: sides(60, 45), bowl: sides(59, 46), spiky: sides(55, 44), wavy: sides(58, 44), curtain: sides(58, 40), longer: sides(57, 40), hair: sides(56, 46) };

/** A darker panel of hair behind the neck and jaw: its top hides behind the ears, its bottom behind the shoulders. */
const BEHIND = "M-58 4V90H58V4Z";

/** The right tail of the twin tails (the left one is its mirror). */
const TAIL = "M56 -30C74 -34 90 -16 94 14C98 44 92 62 82 66C72 68 68 50 66 32C64 14 60 4 54 -2Z";

export const HAIR_SHAPES: Record<ExtraHairStyle, { back?: HairPiece[]; front: HairPiece[]; /** Where the hair at the side of the head ends (y). */ sideBottom: number; /** False when the hair comes down over the ears. */ ears?: false }> = {
  // A short rounded cap with a straight hairline
  buzzcut: {
    front: [cap(`M-55 ${OUT.buzz.B}V-50C-55 -72 -34 -80 0 -80C34 -80 55 -72 55 -50V${OUT.buzz.B}Z`, hairline(45, OUT.buzz.B)), ...OUT.buzz.tips()],
    sideBottom: SIDE_END,
  },

  // A short cut swept to one side, with a flick up at the front
  classic: {
    front: [
      cap(
        `M-57 ${OUT.classic.B}V-52C-65 -76 -54 -92 -36 -98L-26 -88C-12 -102 16 -104 34 -94C52 -88 60 -70 57 -50V${OUT.classic.B}Z`,
        `M-44 ${OUT.classic.B}V-34C-36 -46 -16 -52 2 -47C16 -43 30 -42 44 -36V${OUT.classic.B}Z`,
      ),
      ...OUT.classic.tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Tousled: tufts all over the top and a jagged fringe
  messy: {
    front: [
      cap(
        soft([[-57, -16], [-57, -50], [-68, -66], [-54, -76], [-60, -98], [-38, -86], [-30, -108], [-14, -90], [2, -110], [16, -90], [32, -106], [38, -86], [60, -96], [54, -74], [67, -62], [57, -48], [57, -16]], 6, [0, 16]),
        soft([[-44, -16], [-44, -32], [-36, -42], [-28, -34], [-18, -47], [-8, -35], [4, -47], [14, -35], [26, -45], [34, -35], [44, -40], [44, -16]], 3, [0, 11]),
      ),
      ...sides(57, 44).tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Parted on one side, a big sweep over the other, the sides cut short
  sidepart: {
    front: [
      cap(
        `M-60 ${OUT.sidepart.B}V-48C-70 -84 -34 -102 2 -98C40 -94 64 -78 60 -46V${OUT.sidepart.B}Z`,
        `M-45 ${OUT.sidepart.B}V-32C-32 -38 -12 -50 8 -54C24 -57 36 -48 45 -40V${OUT.sidepart.B}Z`,
      ),
      ...OUT.sidepart.tips(),
      pad(-60, -45, -44, OUT.sidepart.B),
      pad(45, 60, -44, OUT.sidepart.B),
      line("M-12 -96C-10 -82 -6 -66 0 -56"),
    ],
    sideBottom: SIDE_END,
  },

  // Parted in the middle, two curtains that curl out over the ears
  curtain: {
    front: [
      cap(
        `M-58 ${OUT.curtain.B}C-70 -22 -68 -34 -57 -38V-50C-62 -82 -34 -98 0 -98C34 -98 62 -82 57 -50V-38C68 -34 70 -22 58 ${OUT.curtain.B}Z`,
        `M-40 ${OUT.curtain.B}V-26C-40 -42 -16 -54 0 -54C16 -54 40 -42 40 -26V${OUT.curtain.B}Z`,
      ),
      ...OUT.curtain.tips(),
      line("M0 -96V-72"),
    ],
    sideBottom: SIDE_END,
  },

  // A round bowl with straight bangs
  bowl: {
    front: [
      cap(`M-59 ${OUT.bowl.B}V-44C-64 -80 -34 -94 0 -94C34 -94 64 -80 59 -44V${OUT.bowl.B}Z`, `M-46 ${OUT.bowl.B}V-31Q-46 -38 -39 -38H39Q46 -38 46 -31V${OUT.bowl.B}Z`),
      ...OUT.bowl.tips(),
      line("M-20 -38V-48", 3),
      line("M22 -38V-48", 3),
    ],
    sideBottom: SIDE_END,
  },

  // Spikes swept up and to the right
  spiky: {
    front: [
      cap(
        soft([[-55, -16], [-55, -58], [-62, -78], [-46, -76], [-42, -102], [-28, -78], [-14, -106], [-4, -78], [12, -110], [22, -78], [40, -104], [46, -74], [64, -90], [55, -56], [55, -16]], 5, [0, 14]),
        soft([[-44, -16], [-44, -34], [-34, -46], [-24, -36], [-12, -50], [0, -38], [12, -50], [24, -38], [34, -48], [44, -36], [44, -16]], 3, [0, 10]),
      ),
      ...sides(55, 44).tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Soft waves: a scalloped top and a rolling fringe
  wavy: {
    front: [
      cap(
        `M-58 ${OUT.wavy.B}V-44A16 16 0 0 1 -53 -72A18 18 0 0 1 -26 -90A18 18 0 0 1 0 -95A18 18 0 0 1 26 -90A18 18 0 0 1 53 -72A16 16 0 0 1 58 -44V${OUT.wavy.B}Z`,
        `M-44 ${OUT.wavy.B}V-34C-36 -46 -24 -45 -16 -37C-8 -30 4 -48 14 -40C22 -34 34 -46 44 -36V${OUT.wavy.B}Z`,
      ),
      ...OUT.wavy.tips(),
      line("M-34 -78Q-24 -86 -14 -78", 3),
      line("M6 -84Q16 -92 26 -84", 3),
    ],
    sideBottom: SIDE_END,
  },

  // Down to the jaw with scalloped ends, a centre parting and locks that frame the face
  longer: {
    back: [fill("M-66 -50C-72 -92 -34 -104 0 -104C34 -104 72 -92 66 -50V14C66 30 58 38 46 38H-46C-58 38 -66 30 -66 14Z")],
    front: [
      cap(
        `M-57 ${OUT.longer.B}V-50C-62 -84 -34 -98 0 -98C34 -98 62 -84 57 -50V${OUT.longer.B}Z`,
        `M-40 ${OUT.longer.B}V-26C-40 -42 -16 -54 0 -54C16 -54 40 -42 40 -26V${OUT.longer.B}Z`,
      ),
      ...OUT.longer.tips(),
      // Two locks that frame the face, ending in soft curls
      fill("M-64 -14C-68 6 -66 22 -58 32A9 9 0 0 0 -44 28C-48 14 -46 -2 -48 -14Z"),
      fill("M64 -14C68 6 66 22 58 32A9 9 0 0 1 44 28C48 14 46 -2 48 -14Z"),
      line("M0 -96V-72"),
    ],
    sideBottom: 34,
    ears: false,
  },

  // A big swept top over shaved sides
  undercut: {
    front: [
      cap(`M-55 ${OUT.buzz.B}V-50C-55 -72 -34 -80 0 -80C34 -80 55 -72 55 -50V${OUT.buzz.B}Z`, hairline(45, OUT.buzz.B), "shade"),
      ...OUT.buzz.tips("shade"),
      fill("M-52 -42C-64 -86 -28 -108 6 -102C28 -116 62 -98 56 -64C56 -54 52 -48 50 -44C38 -48 18 -54 -4 -46C-20 -40 -38 -38 -52 -42Z"),
    ],
    sideBottom: SIDE_END,
  },

  // Long and straight, hair behind the ears down past the shoulders, a centre parting
  longstraight: {
    back: [
      fill("M-70 122C-80 90 -68 40 -69 -36C-69 -80 -40 -97 0 -97C40 -97 69 -80 69 -36C68 40 80 90 70 122Z"),
      fill(BEHIND, "shade"),
    ],
    front: [cap(bell(56, OUT.hair.B, -90), arch(46, OUT.hair.B, -58)), ...OUT.hair.tips()],
    sideBottom: SIDE_END,
  },

  // A bob to the jaw with a soft fringe
  shortbob: {
    back: [fill("M-64 44C-67 20 -65 -10 -65 -36C-65 -80 -38 -94 0 -94C38 -94 65 -80 65 -36C65 -10 67 20 64 44C62 56 58 60 46 60H-46C-58 60 -62 56 -64 44Z")],
    front: [
      cap(bell(56, OUT.hair.B, -89), `M-46 ${OUT.hair.B}V-30C-46 -40 -34 -44 -22 -42Q-10 -40 0 -50Q10 -40 22 -42C34 -44 46 -40 46 -30V${OUT.hair.B}Z`),
      ...OUT.hair.tips(),
      line("M-14 -64Q-11 -54 -7 -47", 3),
      line("M14 -64Q11 -54 7 -47", 3),
    ],
    sideBottom: SIDE_END,
  },

  // Down to the shoulders, the ends flicking out
  medium: {
    back: [
      fill("M-60 100C-72 100 -80 96 -83 90C-71 88 -65 76 -66 60C-69 34 -68 6 -68 -36C-68 -80 -40 -96 0 -96C40 -96 68 -80 68 -36C68 6 69 34 66 60C65 76 71 88 83 90C80 96 72 100 60 100Z"),
      fill(BEHIND, "shade"),
    ],
    front: [cap(bell(56, OUT.hair.B, -90), arch(46, OUT.hair.B, -58)), ...OUT.hair.tips()],
    sideBottom: SIDE_END,
  },

  // A tail high on the head that rises and falls behind the right shoulder, in a hair tie
  highpony: {
    back: [fill("M4 -84C-2 -104 14 -112 34 -110C70 -106 96 -70 98 -20C100 22 92 52 82 64C74 70 66 58 70 40C76 6 74 -40 52 -62C44 -70 30 -78 22 -82Z")],
    front: [
      cap(bell(56, OUT.hair.B, -88), arch(46, OUT.hair.B, -58)),
      ...OUT.hair.tips(),
      fill(band(26, -86, 24, 9, -28), "tie"),
      line("M-49 -22C-53 -8 -49 6 -45 12", 3.5),
    ],
    sideBottom: SIDE_END,
  },

  // Pulled back into a tail that rests low at the right of the neck
  lowpony: {
    back: [fill("M44 4C60 0 82 20 88 50C92 74 72 86 66 74C62 62 60 44 46 36Z"), fill(band(55, 21, 12, 24, 22), "tie")],
    front: [cap(bell(56, OUT.hair.B, -88), arch(46, OUT.hair.B, -60)), ...OUT.hair.tips(), line("M-49 -22C-55 -6 -53 12 -45 24", 3.5)],
    sideBottom: SIDE_END,
  },

  // Two tails, one each side, each in a tie
  twintails: {
    back: [fill(TAIL), fill(mirror(TAIL))],
    front: [
      cap(bell(56, OUT.hair.B, -88), arch(46, OUT.hair.B, -56)),
      ...OUT.hair.tips(),
      fill(band(61, -18, 9, 22, 18), "tie"),
      fill(band(-61, -18, 9, 22, -18), "tie"),
    ],
    sideBottom: SIDE_END,
  },

  // A big round bun on top and a loose lock each side
  bigbun: {
    front: [
      fill(disc(0, -92, 19)),
      cap(bell(56, OUT.hair.B, -85), arch(46, OUT.hair.B, -54)),
      ...OUT.hair.tips(),
      fill(soft([[-17, -80], [17, -80], [17, -73], [-17, -73]], 3.5), "shade"),
      line("M-50 -22C-54 -6 -51 14 -45 26", 3.5),
      line("M50 -22C54 -6 51 14 45 26", 3.5),
    ],
    sideBottom: SIDE_END,
  },

  // Long waves down the back with a small knot on top
  halfup: {
    back: [
      fill("M-70 122C-84 96 -66 70 -70 44C-74 20 -66 6 -69 -36C-69 -80 -40 -96 0 -96C40 -96 69 -80 69 -36C66 6 74 20 70 44C66 70 84 96 70 122Z"),
      fill(BEHIND, "shade"),
    ],
    front: [
      fill(disc(0, -90, 13)),
      fill("M-3 -100C-4 -108 2 -112 8 -108C4 -108 4 -103 5 -100Z"),
      cap(bell(56, OUT.hair.B, -86), arch(46, OUT.hair.B, -58)),
      ...OUT.hair.tips(),
      fill(soft([[-13, -84], [13, -84], [13, -78], [-13, -78]], 3), "shade"),
    ],
    sideBottom: SIDE_END,
  },

  // Long, rolling waves that bulge out past the shoulders
  longwavy: {
    back: [
      fill("M-70 124C-88 100 -86 74 -74 56C-62 38 -84 22 -72 4C-66 -10 -69 -20 -69 -36C-69 -80 -40 -97 0 -97C40 -97 69 -80 69 -36C69 -20 66 -10 72 4C84 22 62 38 74 56C86 74 88 100 70 124Z"),
      fill(BEHIND, "shade"),
    ],
    front: [cap(bell(56, OUT.hair.B, -90), arch(46, OUT.hair.B, -58)), ...OUT.hair.tips()],
    sideBottom: SIDE_END,
  },

  // Long hair with fringes that part in the middle and sweep out to the sides
  curtainbangs: {
    back: [
      fill("M-70 122C-78 94 -66 66 -69 38C-72 12 -69 -10 -69 -36C-69 -80 -40 -97 0 -97C40 -97 69 -80 69 -36C69 -10 72 12 69 38C66 66 78 94 70 122Z"),
      fill(BEHIND, "shade"),
    ],
    front: [
      cap(bell(56, OUT.hair.B, -92), `M-46 ${OUT.hair.B}V-30C-46 -38 -38 -40 -28 -44C-14 -49 -6 -54 0 -62C6 -54 14 -49 28 -44C38 -40 46 -38 46 -30V${OUT.hair.B}Z`),
      ...OUT.hair.tips(),
    ],
    sideBottom: SIDE_END,
  },
};

export const EXTRA_HAIR_STYLES = Object.keys(HAIR_SHAPES) as ExtraHairStyle[];

export const isExtraHair = (style: string): style is ExtraHairStyle => Object.prototype.hasOwnProperty.call(HAIR_SHAPES, style);
