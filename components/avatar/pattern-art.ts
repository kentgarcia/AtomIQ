/**
 * The patterns of the avatar shop: wallpapers of small flat pictures, drawn faintly over a paint. They
 * are made from the same one-colour 24-box pictures as the teachers' profile covers (npc-cover-art.ts),
 * plus a few shapes and things of their own, laid out on a tile that repeats without a seam.
 *
 * Pure data with no framework imports, so Node tests can read it and `scripts/render-avatar-patterns.mjs`
 * can draw a contact sheet. Ids are words (`atomlab`, `polka`) and never reused once shipped. A saved
 * avatar that names an id that does not exist reads as no pattern (see `normalizeAvatar`).
 *
 * A tile is 96 units square. A layout is a list of points on it; glyphs are dealt to the points in
 * steps that are coprime with the set's size, so the same picture never lands beside or above itself.
 * A picture that crosses the tile's edge is drawn again on the other side, which is what makes it seamless.
 */

import { GLYPHS as COVER_GLYPHS, type GlyphShape } from "../npc/npc-cover-art.ts";

const p = (d: string): GlyphShape => ({ t: "p", d });
const l = (d: string, w = 2): GlyphShape => ({ t: "l", d, w });
const c = (cx: number, cy: number, r: number): GlyphShape => ({ t: "c", cx, cy, r });
const r = (cx: number, cy: number, rad: number, w = 2): GlyphShape => ({ t: "r", cx, cy, r: rad, w });

const f = (n: number) => Math.round(n * 100) / 100;
const rounded = (d: string, w = 2.4): GlyphShape[] => [p(d), l(d, w)];

/** A star with five points, its corners softened by a stroke of the same colour. */
const starPath = (() => {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? 10 : 4.6;
    const a = ((i * 36 - 90) * Math.PI) / 180;
    d += `${i === 0 ? "M" : "L"}${f(12 + rad * Math.cos(a))} ${f(12.6 + rad * Math.sin(a))}`;
  }
  return d + "Z";
})();

/** Pictures only the patterns use (the covers' own are reused as they are). */
const OWN = {
  dot: [c(12, 12, 6.5)],
  ring: [r(12, 12, 7, 2.8)],
  plus: [l("M12 5V19M5 12H19", 2.8)],
  dash: [l("M5 12H19", 4.6)],
  diamond: rounded("M12 3L21 12L12 21L3 12Z"),
  square: rounded("M5.5 5.5H18.5V18.5H5.5Z", 3),
  triangle: rounded("M12 4L21 19H3Z"),
  star: rounded(starPath, 2),
  moon: [p("M16 3A9.5 9.5 0 1 0 21 15A8 8 0 0 1 16 3Z")],
  cloud: [c(7.5, 14, 4.2), c(13, 11.5, 5.2), c(17.5, 14.5, 3.8), l("M7 17.8H17.5", 4.4)],
  flask: [p("M9.5 3H14.5V9L20 19A1.8 1.8 0 0 1 18.4 21.5H5.6A1.8 1.8 0 0 1 4 19L9.5 9Z"), l("M8.5 3H15.5", 2.2)],
  magnet: [l("M6 4V13A6 6 0 0 0 18 13V4", 4.6)],
  planet: [c(12, 12, 6.4), l("M2 15Q12 8.5 22 10", 2.2)],
} satisfies Record<string, GlyphShape[]>;

/** Every picture a pattern can use, by name. */
export const PATTERN_GLYPHS = { ...COVER_GLYPHS, ...OWN } satisfies Record<string, GlyphShape[]>;
export type PatternGlyphId = keyof typeof PATTERN_GLYPHS;

export type PatternLayout = "stagger" | "dense";

export interface PatternDef {
  id: string;
  /** What the shop and a screen reader call it. */
  name: string;
  glyphs: readonly PatternGlyphId[];
  /** `stagger`: four big pictures in a brick pattern. `dense`: twelve small ones. */
  layout: PatternLayout;
  /** A fixed turn in degrees for every picture (stripes, waves), or leave out for a gentle mix of tilts. */
  turn?: number;
}

const S = (id: string, name: string, glyphs: PatternGlyphId[], layout: PatternLayout = "stagger", turn?: number): PatternDef => ({ id, name, glyphs, layout, ...(turn === undefined ? {} : { turn }) });

/** In shop order: the teachers' sets first, then one picture repeated, then shapes, then mixes. */
export const PATTERN_DEFS: readonly PatternDef[] = [
  // The cast
  S("atomlab", "Atom lab", ["atom", "question", "nucleus", "sparkle", "proton", "orbit"], "dense"),
  S("halflife", "Half-life", ["watch", "decay", "hourglass", "ticks", "trefoil", "halflife"], "dense"),
  S("shielded", "Shielded", ["shield", "rays", "glasses", "zigzag", "layers", "crosshair"], "dense"),
  S("heartbeat", "Heartbeat", ["heart", "drop", "calm", "cross", "cell", "pulse"], "dense"),
  S("engineroom", "Engine room", ["gear", "tower", "bolt", "steam", "wrench", "gauge"], "dense"),
  S("gadgets", "Gadgets", ["sprout", "chip", "factory", "sparkle", "hospital", "phone"], "dense"),
  S("balance", "Balance", ["scale", "leaf", "people", "drum", "check", "loop"], "dense"),

  // One picture, again and again
  S("sparkles", "Sparkles", ["sparkle"]),
  S("atoms", "Atoms", ["atom"]),
  S("drops", "Drops", ["drop"]),
  S("bolts", "Bolts", ["bolt"]),
  S("leaves", "Leaves", ["leaf"]),
  S("hearts", "Hearts", ["heart"]),
  S("gears", "Gears", ["gear"]),
  S("trefoils", "Trefoils", ["trefoil"]),
  S("questions", "Questions", ["question"]),
  S("stars", "Stars", ["star"]),
  S("moons", "Moons", ["moon"]),
  S("clouds", "Clouds", ["cloud"]),
  S("flasks", "Flasks", ["flask"]),
  S("magnets", "Magnets", ["magnet"]),
  S("planets", "Planets", ["planet"]),

  // Shapes
  S("polka", "Polka", ["dot"], "dense"),
  S("rings", "Rings", ["ring"]),
  S("pluses", "Pluses", ["plus"], "dense", 0),
  S("diamonds", "Diamonds", ["diamond"]),
  S("squares", "Squares", ["square"], "stagger", 0),
  S("triangles", "Triangles", ["triangle"]),
  S("dashes", "Dashes", ["dash"], "dense", -45),
  S("zigzags", "Zigzags", ["zigzag"], "stagger", 0),
  S("waves", "Waves", ["calm"], "stagger", 0),

  // Mixes
  S("confetti", "Confetti", ["dot", "dash", "diamond", "triangle", "ring", "plus"], "dense"),
  S("nightsky", "Night sky", ["star", "moon", "planet", "sparkle", "cloud"], "stagger"),
  S("labbench", "Lab bench", ["flask", "magnet", "bolt", "atom", "gauge", "drop"], "dense"),
  S("garden", "Garden", ["leaf", "sprout", "drop", "cloud", "sparkle"], "stagger"),
  S("bowlab", "Bows & flasks", ["flask", "bow", "atom", "sparkle", "nucleus"], "stagger"),
  S("samples", "Hot samples", ["trefoil", "tube", "rock", "decay", "sparkle"], "stagger"),
];

export const PATTERN_IDS: readonly string[] = PATTERN_DEFS.map((d) => d.id);
export const PATTERN_COUNT = PATTERN_DEFS.length;

export const patternDef = (id: string): PatternDef | undefined => PATTERN_DEFS.find((d) => d.id === id);

export const TILE = 96;

export interface TilePlacement {
  glyph: PatternGlyphId;
  /** Centre, in tile units. A copy over the edge has its centre outside 0 to 96. */
  x: number;
  y: number;
  size: number;
  rotate: number;
}

const TILTS = [-14, 8, -6, 16, 0, -10, 12];

/** Points on the 96 tile. `stagger`: a brick pattern, rows 48 apart. `dense`: four rows of three, 24 apart. */
function points(layout: PatternLayout): [number, number][] {
  if (layout === "stagger")
    return [
      [24, 24],
      [72, 24],
      [0, 72],
      [48, 72],
    ];
  const out: [number, number][] = [];
  for (let j = 0; j < 4; j++) for (let i = 0; i < 3; i++) out.push([16 + 32 * i - (j % 2) * 16, 12 + 24 * j]);
  return out;
}

const SIZES = { stagger: [34, 30, 36, 32], dense: [20, 18, 22, 19] } as const;

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** The step through the glyph set: five when it is coprime with the set size, else the next that is. */
export const dealStep = (n: number): number => [5, 3, 7, 11, 1].find((s) => gcd(s, n) === 1) ?? 1;

/** Everything drawn on one tile, with the copies that make the edges meet. */
export function tilePlacements(def: PatternDef): TilePlacement[] {
  const step = dealStep(def.glyphs.length);
  const out: TilePlacement[] = [];
  points(def.layout).forEach(([x, y], k) => {
    const size = SIZES[def.layout][k % SIZES[def.layout].length];
    const base = { glyph: def.glyphs[(k * step) % def.glyphs.length], size, rotate: def.turn ?? TILTS[k % TILTS.length] };
    const half = size * 0.62;
    const xs = [x, ...(x - half < 0 ? [x + TILE] : []), ...(x + half > TILE ? [x - TILE] : [])];
    const ys = [y, ...(y - half < 0 ? [y + TILE] : []), ...(y + half > TILE ? [y - TILE] : [])];
    for (const px of xs) for (const py of ys) out.push({ ...base, x: px, y: py });
  });
  return out;
}
