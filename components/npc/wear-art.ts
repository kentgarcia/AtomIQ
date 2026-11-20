/**
 * What the avatar wears on and around the head, drawn as pure data (no imports): head accessories (hats, bows, a crown,
 * flowers...), eye accessories (glasses, goggles, an eyepatch...) and ear accessories (earrings, earmuffs, headphones...).
 * `npc-art.ts` turns each piece's `tone` into a colour: `main` and `shade` are the colour the learner picked and its
 * darker step, the others are fixed. They sit on the same head as everything else (apex y -66, eyes at x +-19.5, y -8,
 * ears on the side at y 2) in the same flat style: no outlines, round-capped strokes, one shade step.
 */

export type WearTone = "main" | "shade" | "white" | "swan" | "ink" | "gold" | "red" | "blue" | "green" | "pink";
export type WearPiece = { d: string; tone: WearTone; evenOdd?: boolean } | { line: string; tone: WearTone; w: number };

export const HEADWEAR_STYLES = ["none", "beanie", "cap", "headband", "bow", "crown", "catears", "bunnyears", "flowers", "wizard", "party", "graduation", "hardhat"] as const;
export type HeadwearStyle = (typeof HEADWEAR_STYLES)[number];
export const EYEWEAR_STYLES = ["none", "round", "square", "sunglasses", "heart", "star", "goggles", "eyepatch", "monocle", "cateye"] as const;
export type EyewearStyle = (typeof EYEWEAR_STYLES)[number];
export const EARWEAR_STYLES = ["none", "stud", "hoop", "pearl", "star", "gem", "flower", "earmuffs", "headphones"] as const;
export type EarwearStyle = (typeof EARWEAR_STYLES)[number];

// ── helpers ──────────────────────────────────────────────────────────────────

const f = (n: number) => Math.round(n * 100) / 100;
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}V${f(y + h - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w - q)} ${f(y + h)}H${f(x + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y + h - q)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}Z`;
}
/** A ring (a circle with a circle cut out of it, `t` thick). */
const ring = (cx: number, cy: number, r: number, t: number) => circle(cx, cy, r) + circle(cx, cy, r - t);

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

/** A point star, apex up, tips at `R`, valleys at `r`, corners softened a little. */
function star(cx: number, cy: number, R: number, r: number, n = 5, soft = 1.2): string {
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
  }
  return roundPoly(pts, soft);
}

/** A heart, `s` is about half its width. */
const heart = (cx: number, cy: number, s: number) =>
  `M${f(cx)} ${f(cy + s * 0.95)}C${f(cx - s * 1.25)} ${f(cy + s * 0.1)} ${f(cx - s * 0.95)} ${f(cy - s * 0.95)} ${f(cx)} ${f(cy - s * 0.35)}C${f(cx + s * 0.95)} ${f(cy - s * 0.95)} ${f(cx + s * 1.25)} ${f(cy + s * 0.1)} ${f(cx)} ${f(cy + s * 0.95)}Z`;

/** A path with every x flipped (absolute M L C Q Z commands, every coordinate a pair). */
const flipX = (d: string) => d.replace(/(-?\d*\.?\d+) (-?\d*\.?\d+)/g, (_, x: string, y: string) => `${f(-Number(x))} ${y}`);

/** An ellipse turned by `deg`, as two arcs. */
function tilted(cx: number, cy: number, rx: number, ry: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  const dx = rx * Math.cos(a);
  const dy = rx * Math.sin(a);
  return `M${f(cx - dx)} ${f(cy - dy)}A${f(rx)} ${f(ry)} ${deg} 1 0 ${f(cx + dx)} ${f(cy + dy)}A${f(rx)} ${f(ry)} ${deg} 1 0 ${f(cx - dx)} ${f(cy - dy)}Z`;
}

const fill = (d: string, tone: WearTone, evenOdd = false): WearPiece => ({ d, tone, ...(evenOdd ? { evenOdd } : {}) });
const line = (d: string, tone: WearTone, w: number): WearPiece => ({ line: d, tone, w });
/** Build the pieces for each side: `make(1)` is the right, `make(-1)` the left. */
const both = (make: (s: 1 | -1) => WearPiece[]): WearPiece[] => [...make(-1), ...make(1)];

// ── head accessories ─────────────────────────────────────────────────────────

/** Petals round a centre: a flower of five circles. */
function flower(cx: number, cy: number, r: number, petal: WearTone, centre: WearTone): WearPiece[] {
  const out: WearPiece[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    out.push(fill(circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.78), petal));
  }
  out.push(fill(circle(cx, cy, r * 0.62), centre));
  return out;
}

const FLOWERS: WearPiece[] = (() => {
  const out: WearPiece[] = [];
  const pts = [-160, -128, -90, -52, -20].map((deg): [number, number] => [64 * Math.cos((deg * Math.PI) / 180), -24 + 66 * Math.sin((deg * Math.PI) / 180)]);
  // Leaves between the flowers, then the flowers
  for (let i = 0; i < pts.length - 1; i++) {
    const mx = (pts[i][0] + pts[i + 1][0]) / 2;
    const my = (pts[i][1] + pts[i + 1][1]) / 2;
    out.push(fill(tilted(mx, my, 9, 4.2, i % 2 ? 40 : -40), "green"));
  }
  const kinds: [WearTone, WearTone][] = [["main", "gold"], ["white", "gold"], ["pink", "gold"], ["white", "gold"], ["main", "gold"]];
  pts.forEach(([x, y], i) => out.push(...flower(x, y, i === 2 ? 8 : 7, kinds[i][0], kinds[i][1])));
  return out;
})();

export const HEADWEAR: Record<Exclude<HeadwearStyle, "none">, WearPiece[]> = {
  // A knitted hat: a fold of ribbing, seams up the dome, a pom-pom
  beanie: [
    fill("M-60 -46C-62 -80 -34 -98 0 -98C34 -98 62 -80 60 -46Z", "main"),
    ...[-42, -21, 0, 21, 42].map((x) => line(`M${x} -60Q${f(x * 0.7)} -80 ${f(x * 0.25)} -96`, "shade", 2.6)),
    fill(rrect(-63, -62, 126, 18, 9), "shade"),
    ...[-52, -39, -26, -13, 0, 13, 26, 39, 52].map((x) => line(`M${x} -58V-48`, "main", 2.6)),
    fill(circle(0, -100, 9), "white"),
  ],
  // A baseball cap: dome, seams, a button, a brim and a badge
  cap: [
    fill("M-58 -48C-58 -80 -32 -98 0 -98C32 -98 58 -80 58 -48Z", "main"),
    line("M0 -96V-52", "shade", 2.6),
    line("M-24 -92Q-36 -72 -40 -52", "shade", 2.6),
    line("M24 -92Q36 -72 40 -52", "shade", 2.6),
    fill(circle(0, -98, 3.6), "shade"),
    fill("M-56 -52Q0 -36 56 -52L60 -44Q0 -26 -60 -44Z", "shade"),
    fill(circle(0, -72, 7), "white"),
    fill(circle(0, -72, 3), "main"),
  ],
  // A sports band round the forehead with a stripe
  headband: [fill("M-57 -62C-30 -70 30 -70 57 -62L58 -48C30 -56 -30 -56 -58 -48Z", "main"), line("M-57 -55C-30 -63 30 -63 57 -55", "white", 2.6)],
  // A big bow on top, off to one side
  bow: [
    fill(roundPoly([[30, -88], [4, -106], [2, -74]], 9), "main"),
    fill(roundPoly([[30, -88], [56, -106], [58, -74]], 9), "main"),
    fill(roundPoly([[28, -88], [10, -99], [9, -80]], 5), "shade"),
    fill(roundPoly([[32, -88], [50, -99], [51, -80]], 5), "shade"),
    fill(roundPoly([[24, -82], [14, -60], [27, -64]], 3), "shade"),
    fill(roundPoly([[36, -82], [46, -60], [33, -64]], 3), "shade"),
    fill(circle(30, -88, 8.5), "main"),
    fill(circle(30, -88, 4), "shade"),
  ],
  // A crown with three jewels
  crown: [
    fill(roundPoly([[-42, -58], [-46, -98], [-24, -80], [0, -107], [24, -80], [46, -98], [42, -58]], 5), "main"),
    fill(rrect(-46, -71, 92, 16, 7), "shade"),
    fill(circle(-28, -63, 3.8), "red"),
    fill(circle(0, -63, 4.8), "blue"),
    fill(circle(28, -63, 3.8), "red"),
    fill(circle(-46, -99, 4.6), "white"),
    fill(circle(0, -108, 4.6), "white"),
    fill(circle(46, -99, 4.6), "white"),
  ],
  // Cat ears, pink inside
  catears: both((s) => [
    fill(roundPoly([[s * 52, -60], [s * 46, -104], [s * 14, -80]], 7), "main"),
    fill(roundPoly([[s * 46, -70], [s * 44, -92], [s * 27, -78]], 4), "pink"),
  ]),
  // Tall bunny ears leaning out, pink inside
  bunnyears: both((s) => [fill(tilted(s * 30, -86, 10, 22, s * 12), "main"), fill(tilted(s * 30.5, -84, 5, 15, s * 12), "pink")]),
  // A crown of flowers along the top of the head
  flowers: FLOWERS,
  // A wizard hat: a wide brim, a bent cone, a gold band and two stars
  wizard: [
    fill("M-74 -52Q0 -30 74 -52Q52 -66 0 -68Q-52 -66 -74 -52Z", "shade"),
    fill("M-46 -56C-40 -80 -16 -98 12 -110C10 -94 22 -78 46 -56Q0 -46 -46 -56Z", "main"),
    fill("M-45 -61Q0 -51 45 -61L46 -54Q0 -44 -46 -54Z", "gold"),
    fill(star(-8, -80, 6, 2.6, 4, 0.6), "gold"),
    fill(star(16, -70, 4.6, 2, 4, 0.5), "gold"),
  ],
  // A party hat with stripes and a pom-pom
  party: [
    fill("M-34 -50L0 -104L34 -50Q0 -42 -34 -50Z", "main"),
    fill("M-21 -72L21 -72L24.6 -66L-24.6 -66Z", "white"),
    fill("M-11.7 -88L11.7 -88L15.2 -82L-15.2 -82Z", "white"),
    fill(circle(0, -104, 6.5), "gold"),
  ],
  // A graduation cap: the board, the cap under it, a tassel
  graduation: [
    fill(roundPoly([[-34, -70], [-34, -52], [0, -42], [34, -52], [34, -70]], 6), "shade"),
    fill(roundPoly([[-74, -80], [0, -100], [74, -80], [0, -62]], 4), "main"),
    fill(circle(0, -81, 4), "gold"),
    line("M0 -81L54 -74V-58", "gold", 2.6),
    fill(rrect(49, -58, 10, 17, 4), "gold"),
  ],
  // A hard hat
  hardhat: [
    fill(rrect(-65, -59, 130, 14, 7), "shade"),
    fill("M-56 -50A56 56 0 0 1 56 -50Z", "main"),
    fill(rrect(-9, -105, 18, 55, 8), "shade"),
    fill(circle(30, -78, 6), "white"),
  ],
};

// ── eye accessories ──────────────────────────────────────────────────────────

/** Lenses are centred on x +-23 (the eyes are at +-19.5) so the pair meets in the middle and covers the whole eye. */
const LX = 23;
const arms = (s: 1 | -1, w = 4): WearPiece => line(`M${s * 45} -10L${s * 59} -9`, "main", w);

const CATEYE = "M2 -6C2 -22 12 -27 26 -27C34 -27 41 -31 47 -37C49 -26 47 -12 42 -2C37 8 28 12 19 12C9 12 2 6 2 -6Z";

export const EYEWEAR: Record<Exclude<EyewearStyle, "none">, WearPiece[]> = {
  round: [...both((s) => [fill(ring(s * LX, -8, 22, 4.4), "main", true), arms(s)])],
  square: [...both((s) => [fill(rrect(s * LX - 22, -30, 44, 44, 12) + rrect(s * LX - 17.6, -25.6, 35.2, 35.2, 8), "main", true), arms(s)]), line("M-3 -14H3", "main", 4.4)],
  sunglasses: [
    ...both((s) => [
      fill(rrect(s * LX - 21.5, -28, 43, 36, 14), "ink"),
      line(`M${s * (LX - 11)} -19L${s * (LX - 3)} -11`, "white", 3.4),
      line(`M${s * (LX + 1)} -22L${s * (LX + 5)} -18`, "white", 3.4),
      arms(s, 5),
    ]),
    line("M-3 -16H3", "main", 5),
  ],
  heart: both((s) => [line(heart(s * LX, -8, 21), "main", 4.4), arms(s)]),
  star: [...both((s) => [line(star(s * LX, -8, 25, 11, 5, 3), "main", 4), arms(s)]), line("M-4 -8H4", "main", 4)],
  goggles: [
    ...both((s) => [fill(ring(s * LX, -8, 22, 6), "main", true), line(`M${s * (LX - 11)} -21Q${s * (LX - 3)} -27 ${s * (LX + 5)} -24`, "white", 3), line(`M${s * 44} -12L${s * 60} -14`, "main", 8)]),
    line("M-3 -8H3", "main", 6),
  ],
  eyepatch: [fill(rrect(3, -30, 40, 44, 15), "main"), line("M5 -26Q-20 -40 -52 -36", "main", 3.2), line("M40 -26Q48 -38 53 -34", "main", 3.2), line("M10 -18Q14 -22 20 -22", "white", 3)],
  monocle: [fill(ring(LX, -8, 22, 3.6), "main", true), line("M40 6Q56 24 47 56", "gold", 2.4)],
  cateye: [line(CATEYE, "main", 4.4), line(flipX(CATEYE), "main", 4.4), line("M-3 -8H3", "main", 4.4)],
};

// ── ear accessories ──────────────────────────────────────────────────────────

/** Where an earring hangs: the lobe of the ear on side `s` (the ear is a circle of radius 11 at (+-50, 2)). */
const lobe = (s: 1 | -1) => ({ x: s * 52, y: 13 });

export const EARWEAR: Record<Exclude<EarwearStyle, "none">, WearPiece[]> = {
  stud: both((s) => [fill(circle(lobe(s).x - s, lobe(s).y, 5.2), "main"), fill(circle(lobe(s).x - s - 1.4, lobe(s).y - 1.4, 1.6), "white")]),
  hoop: both((s) => [line(circle(s * 53, 23, 10), "main", 3.4)]),
  pearl: both((s) => {
    const { x, y } = lobe(s);
    return [fill(circle(x, y, 3.2), "gold"), line(`M${x} ${y + 2}V${y + 8}`, "gold", 2.2), fill(circle(x, y + 15.5, 8), "swan"), fill(circle(x, y + 15, 7.2), "white"), fill(circle(x - 2.4, y + 12.6, 1.8), "swan")];
  }),
  star: both((s) => {
    const { x, y } = lobe(s);
    return [fill(circle(x, y, 3.2), "gold"), line(`M${x} ${y + 2}V${y + 7}`, "gold", 2.2), fill(star(x, y + 18, 11, 4.8), "main")];
  }),
  gem: both((s) => {
    const { x, y } = lobe(s);
    return [fill(circle(x, y, 3.4), "gold"), fill(roundPoly([[x, y + 3], [x + 8, y + 13], [x, y + 28], [x - 8, y + 13]], 2.2), "main"), fill(roundPoly([[x, y + 3], [x + 8, y + 13], [x, y + 13]], 1.4), "shade"), line(`M${x - 3.4} ${y + 12}L${x - 0.6} ${y + 8.6}`, "white", 2.2)];
  }),
  // A flower tucked behind the right ear
  flower: [fill(roundPoly([[48, 2], [68, -2], [58, 16]], 5), "green"), ...flower(52, -9, 7.4, "main", "gold")],
  // Round fluffy cups and a band over the head
  earmuffs: [
    line("M-56 -4C-64 -104 64 -104 56 -4", "shade", 6),
    ...both((s) => [fill(circle(s * 57, 2, 17), "white"), fill(circle(s * 57, 2, 11), "main")]),
  ],
  // Cups and a band, a bar of light on each cup
  headphones: [
    line("M-57 -4C-65 -104 65 -104 57 -4", "shade", 6),
    ...both((s) => [fill(rrect(s * 58 - 10, -16, 20, 36, 10), "main"), fill(rrect(s * 58 - 5, -9, 10, 22, 5), "shade"), line(`M${s * 58 - 2} -10V-6`, "white", 2.4)]),
  ],
};
