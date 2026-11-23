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
/** `accent` and `accentShade` are the teacher's prop colours (Ada's bows); only a teacher's own hair uses them. */
export type HairTone = "hair" | "shade" | "tie" | "accent" | "accentShade";
export type HairPiece = { d: string; tone: HairTone; evenOdd?: boolean; under?: string } | { line: string; tone: HairTone; w: number };

export type ExtraHairStyle =
  | "buzzcut" | "classic" | "messy" | "sidepart" | "curtain" | "bowl" | "spiky" | "wavy" | "longer" | "undercut"
  | "longstraight" | "shortbob" | "medium" | "highpony" | "lowpony" | "twintails" | "bigbun" | "halfup" | "longwavy" | "curtainbangs" | "fluffy" | "cloud" | "flattop" | "crownbun" | "knotwrap" | "workcrop" | "layeredbob"
  | "trainer" | "shinobi" | "pirate" | "saiyan" | "odango";

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

/** The right puff of Ada's pigtails: overlapping round tufts (x, y, r) stacked down the side of the head, so it reads fluffy, not a flat blob. They stay within x 88, the narrowest crop (the lesson bust), so no picture cuts them off. */
const PUFF: [number, number, number][] = [
  [50, -20, 28], [62, -42, 23], [63, -6, 23], [61, 30, 23], [54, 56, 16],
];

/** The puffs of both sides: a darker layer behind, a little lower and further out, then the hair colour on top, which gives them depth. */
const puffs = (): HairPiece[] =>
  ([-1, 1] as const).flatMap((side) => [
    ...PUFF.map(([x, y, r]) => fill(disc(side * (x + 2), y + 5, r), "shade")),
    ...PUFF.map(([x, y, r]) => fill(disc(side * x, y, r))),
  ]);

/** Hal's hair: seven round tufts piled over the top of the head (x, y, r), a darker layer behind them for depth. It stays inside the lesson bust's crop (x 88, y -114). */
const CLOUD: [number, number, number][] = [[-58, -52, 19], [-44, -74, 22], [-18, -86, 22], [14, -88, 22], [42, -76, 22], [58, -52, 19], [0, -68, 34]];
const cloud = (): HairPiece[] => [...CLOUD.map(([x, y, r]) => fill(disc(x + 2, y + 5, r), "shade")), ...CLOUD.map(([x, y, r]) => fill(disc(x, y, r)))];

/** The head of Ada's pigtails: a tall cap, a middle part with soft bangs, and the sideburn tips. */
const PIGTAIL_HEAD: HairPiece[] = [
  cap(bell(56, OUT.hair.B, -96), `M-46 ${OUT.hair.B}V-30C-46 -38 -38 -40 -28 -44C-14 -49 -6 -54 0 -62C6 -54 14 -49 28 -44C38 -40 46 -38 46 -30V${OUT.hair.B}Z`),
  ...OUT.hair.tips(),
];

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
      line("M-14 -64Q-6 -56 0 -54", 3.4),
      line("M14 -64Q6 -56 0 -54", 3.4),
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

  // Feathered mid-length wolf cut: tousled top, side-swept fringe and winged collar-length flicks at the jaw
  longer: {
    back: [
      fill(
        soft(
          [
            [-58, -36], [-66, -12], [-72, 10], [-60, 14], [-68, 36], [-50, 42], [-42, 34],
            [42, 34], [50, 42], [68, 36], [60, 14], [72, 10], [66, -12], [58, -36],
          ],
          6,
        ),
        "shade",
      ),
    ],
    front: [
      cap(
        `M-57 ${OUT.longer.B}V-50C-60 -82 -34 -95 0 -95C34 -95 60 -82 57 -50V${OUT.longer.B}Z`,
        `M-42 ${OUT.longer.B}V-30C-42 -40 -26 -45 -6 -48C10 -50 22 -44 42 -32V${OUT.longer.B}Z`,
      ),
      ...OUT.longer.tips(),
      line("M-18 -78Q0 -86 20 -76", 3.4),
    ],
    sideBottom: SIDE_END,
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

  // A bouncy high ponytail puff rising from the top crown with a soft flared tail behind
  highpony: {
    back: [
      fill(disc(24, -88, 22), "shade"),
      fill(disc(44, -76, 20), "shade"),
      fill(disc(58, -54, 18), "shade"),
      fill(disc(62, -30, 14), "shade"),
      fill(disc(22, -90, 22)),
      fill(disc(42, -78, 20)),
      fill(disc(56, -56, 18)),
      fill(disc(60, -32, 14)),
    ],
    front: [
      cap(
        bell(56, OUT.hair.B, -88),
        `M-46 ${OUT.hair.B}V-30C-46 -40 -26 -46 0 -52C22 -56 40 -44 46 -32V${OUT.hair.B}Z`,
      ),
      ...OUT.hair.tips(),
      fill(band(18, -86, 22, 10, -28), "tie"),
    ],
    sideBottom: SIDE_END,
  },

  // A braided side tail draped over the right shoulder, tied at the end
  lowpony: {
    back: [
      fill(disc(50, 12, 17), "shade"),
      fill(disc(58, 32, 15.5), "shade"),
      fill(disc(63, 51, 14), "shade"),
      fill(disc(66, 72, 11), "shade"),
      fill(disc(48, 10, 17)),
      fill(disc(56, 30, 15.5)),
      fill(disc(61, 49, 14)),
      fill(disc(64, 70, 11)),
      fill(band(63, 61, 16, 7, -14), "tie"),
    ],
    front: [
      cap(
        bell(56, OUT.hair.B, -88),
        `M-46 ${OUT.hair.B}V-30C-46 -40 -26 -44 -6 -49C10 -53 20 -58 26 -62C32 -50 40 -40 46 -30V${OUT.hair.B}Z`,
      ),
      ...OUT.hair.tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Twin braided pigtails with top and bottom ties
  twintails: {
    back: ([-1, 1] as const).flatMap((s) => [
      fill(disc(s * 60, -28, 16), "shade"),
      fill(disc(s * 66, -6, 15), "shade"),
      fill(disc(s * 68, 16, 14), "shade"),
      fill(disc(s * 66, 38, 11.5), "shade"),
      fill(disc(s * 58, -30, 16)),
      fill(disc(s * 64, -8, 15)),
      fill(disc(s * 66, 14, 14)),
      fill(disc(s * 64, 36, 11.5)),
      fill(band(s * 65, 26, 15, 6.5, s * 12), "tie"),
    ]),
    front: [
      ...PIGTAIL_HEAD,
      fill(band(54, -44, 10, 20, 28), "tie"),
      fill(band(-54, -44, 10, 20, -28), "tie"),
    ],
    sideBottom: SIDE_END,
  },

  // A full two-tone top bun with a wrap band and soft curtain bangs
  bigbun: {
    back: [fill(disc(0, -96, 24), "shade"), fill(disc(0, -92, 22))],
    front: [
      cap(bell(56, OUT.hair.B, -83), arch(46, OUT.hair.B, -54)),
      ...OUT.hair.tips(),
      fill(soft([[-18, -83], [18, -83], [16, -75], [-16, -75]], 3.5), "tie"),
    ],
    sideBottom: SIDE_END,
  },

  // Half-up double space buns with long waves down the back
  halfup: {
    back: [
      fill("M-70 122C-84 96 -66 70 -70 44C-74 20 -66 6 -68 -36C-68 -64 -40 -82 0 -82C40 -82 68 -64 68 -36C66 6 74 20 70 44C66 70 84 96 70 122Z"),
      fill(BEHIND, "shade"),
      fill(disc(-45, -84, 21), "shade"),
      fill(disc(45, -84, 21), "shade"),
      fill(disc(-43, -82, 19.5)),
      fill(disc(43, -82, 19.5)),
    ],
    front: [
      cap(bell(56, OUT.hair.B, -86), arch(46, OUT.hair.B, -58)),
      ...OUT.hair.tips(),
      fill(band(-38, -70, 22, 8, -36), "tie"),
      fill(band(38, -70, 22, 8, 36), "tie"),
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
  // Ada's pigtails: a middle part with soft bangs and two big fluffy puffs, each held by a tie
  fluffy: {
    back: puffs(),
    front: [...PIGTAIL_HEAD, fill(band(57, -50, 9, 22, 35), "tie"), fill(band(-57, -50, 9, 22, -35), "tie")],
    sideBottom: SIDE_END,
  },

  // A big cloud of hair piled up on top, with a low fringe swept across the forehead
  cloud: {
    back: cloud(),
    front: [
      cap(bell(56, OUT.hair.B, -84), `M-46 ${OUT.hair.B}V-30C-46 -34 -38 -37 -24 -39C-8 -41 6 -44 16 -54C22 -44 36 -38 46 -32V${OUT.hair.B}Z`),
      ...OUT.hair.tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Ray's flat-top fade: a sculpted flat-crowned high top with shaved sides and a crisp razor part
  flattop: {
    front: [
      cap(
        `M-56 ${OUT.hair.B}V-68C-56 -84 -46 -90 -24 -91H24C46 -90 56 -84 56 -68V${OUT.hair.B}Z`,
        hairline(46, OUT.hair.B),
      ),
      ...OUT.hair.tips("shade"),
      pad(-56, -46, -46, OUT.hair.B),
      pad(46, 56, -46, OUT.hair.B),
      line("M-35 -84L-27 -50", 3.4),
    ],
    sideBottom: SIDE_END,
  },

  // Mina's braided bun: a full double-layered top bun held by a wrap band, with a soft centre-parted fringe and cheek locks
  crownbun: {
    back: [fill(disc(0, -93, 24), "shade")],
    front: [
      fill(disc(0, -89, 22)),
      fill(soft([[-20, -78], [20, -78], [18, -70], [-18, -70]], 4), "tie"),
      cap(
        bell(56, OUT.hair.B, -84),
        `M-46 ${OUT.hair.B}V-30C-46 -40 -30 -44 -14 -49C-5 -52 0 -58 0 -62C0 -58 5 -52 14 -49C30 -44 46 -40 46 -30V${OUT.hair.B}Z`,
      ),
      ...OUT.hair.tips(),
      fill("M-56 -14C-60 2 -57 16 -49 22C-47 12 -46 0 -46 -14Z"),
      fill("M56 -14C60 2 57 16 49 22C47 12 46 0 46 -14Z"),
    ],
    sideBottom: SIDE_END,
  },

  // Tess's knotted head wrap: a pleated wrap with a contrasting headband trim and a two-lobed top knot
  knotwrap: {
    front: [
      fill(soft([[4, -84], [24, -104], [38, -88], [20, -76]], 8), "shade"),
      fill(soft([[14, -82], [38, -100], [48, -82], [26, -72]], 8)),
      fill(disc(18, -84, 8.5), "shade"),
      cap(
        bell(57, OUT.classic.B, -88),
        `M-44 ${OUT.classic.B}V-32C-44 -42 -24 -50 0 -50C24 -50 44 -42 44 -32V${OUT.classic.B}Z`,
      ),
      ...OUT.classic.tips(),
      fill("M-56 -38C-26 -54 26 -54 56 -38L57 -30C26 -46 -26 -46 -57 -30Z", "tie"),
      line("M-38 -66Q0 -80 38 -66", 3.4),
    ],
    sideBottom: SIDE_END,
  },

  // Kofi's textured crop: a sturdy scalloped crop with full sideburns that frame the temples
  workcrop: {
    front: [
      cap(
        `M-57 ${OUT.classic.B}V-48C-59 -76 -36 -88 0 -88C36 -88 59 -76 57 -48V${OUT.classic.B}Z`,
        `M-44 ${OUT.classic.B}V-30C-44 -40 -28 -45 0 -45C28 -45 44 -40 44 -30V${OUT.classic.B}Z`,
      ),
      ...OUT.classic.tips(),
      line("M-26 -72Q0 -80 26 -72", 3.4),
    ],
    sideBottom: SIDE_END,
  },

  // Sage's layered bob: a full jaw-length bob with a side-swept fringe, soft face-framing locks and a hair clip on the temple
  layeredbob: {
    back: [
      fill("M-66 48C-70 22 -67 -10 -67 -38C-67 -82 -38 -96 0 -96C38 -96 67 -82 67 -38C67 -10 70 22 66 48C63 62 56 66 44 66H-44C-56 66 -63 62 -66 48Z"),
      fill(BEHIND, "shade"),
    ],
    front: [
      cap(
        bell(57, OUT.classic.B, -91),
        `M-44 ${OUT.classic.B}V-28C-44 -38 -26 -42 -6 -48C8 -52 18 -57 24 -64C28 -52 38 -42 44 -32V${OUT.classic.B}Z`,
      ),
      ...OUT.classic.tips(),
      fill("M-57 -14C-63 10 -60 36 -48 52C-44 36 -45 10 -44 -14Z"),
      fill("M57 -14C63 10 60 36 48 52C44 36 45 10 44 -14Z"),
      fill(band(-44, -36, 18, 7, -18), "tie"),
      line("M24 -88V-64", 3.4),
    ],
    sideBottom: SIDE_END,
  },

  // Anime trainer spikes: wild horizontal side-flares that jut out under a cap and a jagged V-fringe
  trainer: {
    back: [
      fill(
        soft(
          [
            [-50, -32], [-78, -24], [-58, -10], [-76, 6], [-52, 12], [-64, 28], [-44, 24],
            [44, 24], [64, 28], [52, 12], [76, 6], [58, -10], [78, -24], [50, -32],
          ],
          3.5,
        ),
        "shade",
      ),
    ],
    front: [
      cap(
        soft(
          [
            [-57, -16.5], [-57, -38], [-80, -34], [-60, -54], [-78, -70], [-54, -74], [-64, -100],
            [-34, -84], [-20, -108], [-4, -86], [18, -110], [28, -84], [60, -100], [54, -74],
            [78, -70], [60, -54], [80, -34], [57, -38], [57, -16.5],
          ],
          4,
          [0, 18],
        ),
        soft(
          [
            [-44, -16.5], [-44, -32], [-33, -46], [-22, -33], [-8, -50], [2, -32],
            [16, -49], [27, -34], [37, -44], [44, -32], [44, -16.5],
          ],
          2.5,
          [0, 10],
        ),
      ),
      ...sides(57, 44).tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Shinobi spikes (Naruto-inspired): swept-up golden anime spikes with a spiky crown and framed temple locks
  shinobi: {
    back: [
      fill(
        soft(
          [
            [-52, -26], [-72, -16], [-56, -2], [-68, 14], [-46, 14],
            [46, 14], [68, 14], [56, -2], [72, -16], [52, -26],
          ],
          3.5,
        ),
        "shade",
      ),
    ],
    front: [
      cap(
        soft(
          [
            [-57, -16.5], [-57, -46], [-74, -56], [-56, -68], [-70, -88], [-46, -84],
            [-48, -106], [-26, -88], [-16, -110], [-2, -90], [14, -110], [26, -88],
            [48, -106], [46, -84], [70, -88], [56, -68], [74, -56], [57, -46], [57, -16.5],
          ],
          4,
          [0, 18],
        ),
        soft(
          [
            [-44, -16.5], [-44, -30], [-36, -44], [-26, -33], [-14, -47], [-4, -34],
            [6, -47], [18, -34], [28, -45], [37, -33], [44, -30], [44, -16.5],
          ],
          2.5,
          [0, 11],
        ),
      ),
      ...sides(57, 44).tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Straw-hat captain shag (Luffy-inspired): tousled, choppy dark anime locks with jagged bangs across the brow
  pirate: {
    back: [
      fill(
        soft(
          [
            [-52, -20], [-68, -4], [-54, 10], [-64, 26], [-44, 22],
            [44, 22], [64, 26], [54, 10], [68, -4], [52, -20],
          ],
          4,
        ),
        "shade",
      ),
    ],
    front: [
      cap(
        soft(
          [
            [-56, -16], [-56, -48], [-68, -60], [-54, -70], [-62, -90], [-40, -86],
            [-32, -102], [-14, -92], [2, -104], [18, -92], [36, -100], [42, -84],
            [62, -88], [54, -68], [68, -58], [56, -48], [56, -16],
          ],
          5,
          [0, 16],
        ),
        soft(
          [
            [-44, -16], [-44, -31], [-34, -44], [-25, -31], [-12, -48], [-2, -31],
            [10, -47], [20, -32], [32, -44], [44, -31], [44, -16],
          ],
          2.5,
          [0, 10],
        ),
      ),
      ...sides(56, 44).tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Saiyan fighter spikes (Goku-inspired): huge asymmetric gravity-defying side & crown spikes with hanging V-bangs
  saiyan: {
    back: [
      fill(
        soft(
          [
            [-50, -38], [-86, -34], [-60, -14], [-84, 8], [-48, 14],
            [48, 14], [82, 6], [58, -14], [84, -36], [50, -38],
          ],
          3.5,
        ),
        "shade",
      ),
    ],
    front: [
      cap(
        soft(
          [
            [-57, -16.5], [-57, -42], [-86, -54], [-58, -68], [-82, -92], [-46, -86],
            [-52, -109], [-20, -88], [4, -110], [22, -86], [58, -108], [48, -82],
            [82, -88], [58, -64], [84, -48], [57, -42], [57, -16.5],
          ],
          3.5,
          [0, 16],
        ),
        soft(
          [
            [-44, -16.5], [-44, -32], [-30, -48], [-18, -31], [-4, -52], [6, -31],
            [20, -50], [32, -33], [44, -32], [44, -16.5],
          ],
          2.2,
          [0, 9],
        ),
      ),
      ...sides(57, 44).tips(),
    ],
    sideBottom: SIDE_END,
  },

  // Moon guardian odango (Sailor Moon-inspired): high twin odango buns with long flowing twin tails and crescent bangs
  odango: {
    back: [
      // Long flowing twin tails sweeping down past the shoulders
      fill("M-58 -52C-78 -20 -84 44 -76 118C-64 118 -56 86 -58 34C-60 -6 -54 -34 -46 -52Z", "shade"),
      fill("M58 -52C78 -20 84 44 76 118C64 118 56 86 58 34C60 -6 54 -34 46 -52Z", "shade"),
      fill("M-55 -52C-73 -18 -78 44 -70 116C-60 116 -52 84 -54 34Z"),
      fill("M55 -52C73 -18 78 44 70 116C60 116 52 84 54 34Z"),
      // High twin odango buns
      fill(disc(-48, -84, 20), "shade"),
      fill(disc(48, -84, 20), "shade"),
      fill(disc(-46, -82, 18.5)),
      fill(disc(46, -82, 18.5)),
    ],
    front: [
      cap(
        bell(56, OUT.hair.B, -88),
        `M-46 ${OUT.hair.B}V-30C-46 -40 -32 -42 -16 -48C-6 -52 -2 -58 0 -64C2 -58 6 -52 16 -48C32 -42 46 -40 46 -30V${OUT.hair.B}Z`,
      ),
      ...OUT.hair.tips(),
      fill(band(-39, -70, 20, 8, -36), "tie"),
      fill(band(39, -70, 20, 8, 36), "tie"),
    ],
    sideBottom: SIDE_END,
  },
};

export const EXTRA_HAIR_STYLES = Object.keys(HAIR_SHAPES) as ExtraHairStyle[];

export const isExtraHair = (style: string): style is ExtraHairStyle => Object.prototype.hasOwnProperty.call(HAIR_SHAPES, style);

// ── a teacher's own hair (not in the shop) ───────────────────────────────────

/** Hair only a teacher wears, so the shop's lists and prices do not change. */
export type TeacherHairStyle = "pigtailbows";

/** A leaf-shaped bow: two soft lobes round a knot, centred at (cx, cy), the right one turned up by `deg` (the left is its mirror). */
function bow(cx: number, cy: number, deg: number): HairPiece[] {
  const a = (deg * Math.PI) / 180;
  const at = (x: number, y: number): [number, number] => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  const lobe = (side: -1 | 1) => fill(soft([at(0, 0), at(side * 30, -27), at(side * 40, -2), at(side * 28, 14)], 12), "accent");
  return [lobe(-1), lobe(1), fill(disc(...at(0, 0), 8.5), "accentShade")];
}

export const TEACHER_HAIR_SHAPES: Record<TeacherHairStyle, (typeof HAIR_SHAPES)[ExtraHairStyle]> = {
  // Ada: a middle part with soft bangs, and two high puffs, each tied with a bow
  pigtailbows: {
    back: puffs(),
    front: [...PIGTAIL_HEAD, ...bow(52, -60, -14), ...bow(-52, -60, 14)],
    sideBottom: SIDE_END,
  },
};

export const isTeacherHair = (style: string): style is TeacherHairStyle => Object.prototype.hasOwnProperty.call(TEACHER_HAIR_SHAPES, style);

/** The hand-drawn shape of a style that has one: a shop style or a teacher's own. */
export const shapedHair = (style: string) => (isExtraHair(style) ? HAIR_SHAPES[style] : isTeacherHair(style) ? TEACHER_HAIR_SHAPES[style] : undefined);
