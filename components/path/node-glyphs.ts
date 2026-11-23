/**
 * Glyphs for the lesson-map nodes: flat, one-colour pictures drawn on a 48 x 48 grid, as pure
 * data (paths, no components), so a node renders them with react-native-svg and
 * `scripts/render-node-glyphs.mjs` can draw a contact sheet to look at.
 *
 * Rules (same family as the lesson figures): no gradients (they rendered black on a device),
 * no filters, one fill colour chosen by the node. A shape is filled, stroked with round caps,
 * or both; `evenOdd` cuts holes. Keep the picture inside a 40 x 40 box centred at 24, 24 so it
 * has the same optical size as its neighbours. Erasable TypeScript only (it runs under
 * `node --test`).
 */

export const GLYPH_VIEWBOX = 48;

export interface GlyphShape {
  d: string;
  /** Stroke width. With `fill: false` (or no `fill`) the shape is stroked only. */
  sw?: number;
  /** Fill the shape. Defaults to true when there is no stroke width. */
  fill?: boolean;
  evenOdd?: boolean;
}

export interface Glyph {
  shapes: GlyphShape[];
  /** Degrees about the centre (24, 24), for a picture that reads better tilted. */
  rotate?: number;
}

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */

const n = (v: number) => String(Math.round(v * 100) / 100);

/** A full circle as a path (two arcs). */
const circle = (cx: number, cy: number, r: number): string =>
  `M${n(cx - r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)}A${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}Z`;

/** An ellipse rotated by `deg`, as four cubic curves. */
const ellipse = (cx: number, cy: number, rx: number, ry: number, deg: number): string => {
  const k = 0.5522847498;
  const a = (deg * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const p = (x: number, y: number) => `${n(cx + x * cos - y * sin)} ${n(cy + x * sin + y * cos)}`;
  return (
    `M${p(rx, 0)}` +
    `C${p(rx, ry * k)} ${p(rx * k, ry)} ${p(0, ry)}` +
    `C${p(-rx * k, ry)} ${p(-rx, ry * k)} ${p(-rx, 0)}` +
    `C${p(-rx, -ry * k)} ${p(-rx * k, -ry)} ${p(0, -ry)}` +
    `C${p(rx * k, -ry)} ${p(rx, -ry * k)} ${p(rx, 0)}Z`
  );
};

/** A rounded rectangle. */
const rrect = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${n(x + r)} ${n(y)}H${n(x + w - r)}A${r} ${r} 0 0 1 ${n(x + w)} ${n(y + r)}V${n(y + h - r)}A${r} ${r} 0 0 1 ${n(x + w - r)} ${n(y + h)}H${n(x + r)}A${r} ${r} 0 0 1 ${n(x)} ${n(y + h - r)}V${n(y + r)}A${r} ${r} 0 0 1 ${n(x + r)} ${n(y)}Z`;

/** A point on a circle, angle in degrees clockwise from 3 o'clock. */
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/** A blade of the radiation trefoil: the ring between r1 and r2, centred on `deg`, `span` wide. */
const blade = (cx: number, cy: number, r1: number, r2: number, deg: number, span: number): string => {
  const [ox1, oy1] = polar(cx, cy, r2, deg - span / 2);
  const [ox2, oy2] = polar(cx, cy, r2, deg + span / 2);
  const [ix2, iy2] = polar(cx, cy, r1, deg + span / 2);
  const [ix1, iy1] = polar(cx, cy, r1, deg - span / 2);
  return `M${n(ox1)} ${n(oy1)}A${r2} ${r2} 0 0 1 ${n(ox2)} ${n(oy2)}L${n(ix2)} ${n(iy2)}A${r1} ${r1} 0 0 0 ${n(ix1)} ${n(iy1)}Z`;
};

const dot = (cx: number, cy: number, r: number): GlyphShape => ({ d: circle(cx, cy, r) });
/** A ball drawn as an outline: a neutron next to a filled proton. */
const ring = (cx: number, cy: number, r: number, sw = 2.4): GlyphShape => ({ d: circle(cx, cy, r - sw / 2), sw });

/* ------------------------------------------------------------------ */
/* The glyphs                                                          */
/* ------------------------------------------------------------------ */

export const GLYPHS = {
  /** Atoms are everywhere: a nucleus inside three orbits. */
  atom: {
    shapes: [
      dot(24, 24, 4.4),
      { d: ellipse(24, 24, 19, 7.6, 0), sw: 2.6 },
      { d: ellipse(24, 24, 19, 7.6, 60), sw: 2.6 },
      { d: ellipse(24, 24, 19, 7.6, 120), sw: 2.6 },
    ],
  },
  /** Protons, neutrons, electrons: the particles of one atom, an electron on its orbit. */
  nucleus: {
    shapes: [
      { d: circle(24, 24, 20), sw: 2.2 },
      dot(24, 17, 5.8),
      ring(16.8, 29.4, 5.8),
      dot(31.2, 29.4, 5.8),
      dot(41.4, 13.6, 3.2),
    ],
  },
  /** Elements and the periodic table: the staggered grid of tiles, one left hollow. */
  table: {
    shapes: [
      // row 1: two tiles
      { d: rrect(4, 8, 8.5, 8.5, 2.2) },
      { d: rrect(35.5, 8, 8.5, 8.5, 2.2) },
      // row 2: four tiles
      { d: rrect(4, 19.7, 8.5, 8.5, 2.2) },
      { d: rrect(15.2, 19.7, 8.5, 8.5, 2.2) },
      { d: rrect(26.4, 19.7, 8.5, 8.5, 2.2) },
      { d: rrect(35.5, 19.7, 8.5, 8.5, 2.2) },
      // row 3: four tiles, one hollow
      { d: rrect(4, 31.4, 8.5, 8.5, 2.2) },
      { d: rrect(16.2, 32.4, 6.5, 6.5, 1.4), sw: 2.2 },
      { d: rrect(26.4, 31.4, 8.5, 8.5, 2.2) },
      { d: rrect(35.5, 31.4, 8.5, 8.5, 2.2) },
    ],
  },
  /** Isotopes: two nuclei of one element, the right one with more neutrons. */
  isotope: {
    shapes: [
      // left: 1 proton, 1 neutron
      dot(10.6, 18.6, 5.8),
      ring(10.6, 31, 5.8),
      // right: 1 proton, 3 neutrons
      dot(33, 13, 5.8),
      ring(26.8, 24.6, 5.8),
      ring(39.2, 24.6, 5.8),
      ring(33, 36.2, 5.8),
    ],
  },
  /** Stable and unstable nuclei: a nucleus that has just thrown a particle out. */
  burst: {
    shapes: [
      // the nucleus
      dot(13, 24.6, 5.8),
      ring(12.6, 36.4, 5.8),
      dot(24.2, 38.4, 5.8),
      // the particle, with its trail
      dot(37.6, 10.6, 4.8),
      { d: "M21.4 21.2L24.4 18.2", sw: 3 },
      { d: "M28.4 14.2L31 11.6", sw: 3 },
      { d: "M32 27L36.6 22.4", sw: 3 },
    ],
  },
  /** Radiation: the trefoil. */
  trefoil: {
    shapes: [
      dot(24, 24, 3.6),
      { d: blade(24, 24, 7.4, 19.5, -90, 58) },
      { d: blade(24, 24, 7.4, 19.5, 30, 58) },
      { d: blade(24, 24, 7.4, 19.5, 150, 58) },
    ],
  },
  /** Alpha, beta and gamma: a nucleus with three different things leaving it (a chunk, a dot, a wave). */
  rays: {
    shapes: [
      dot(9.5, 24, 6),
      dot(37.4, 9.6, 5.4),
      { d: "M16 20.4L29.6 12.4", sw: 2.6 },
      dot(40.4, 24, 3),
      { d: "M17.4 24H33.6", sw: 2.6 },
      { d: "M19 39L23.4 34L27.6 42L32 34L36.4 42L41 36", sw: 2.6, fill: false },
    ],
  },
  /** Half-life: a pocket watch. */
  clock: {
    shapes: [
      { d: circle(24, 26, 16), sw: 3 },
      { d: rrect(20.4, 4, 7.2, 5, 1.6) },
      { d: "M24 26V16", sw: 3 },
      { d: "M24 26L31 30", sw: 3 },
      dot(24, 26, 2.2),
    ],
  },
  /** Decay chains: nucleus after nucleus, ending in a hollow, stable one. */
  chain: {
    shapes: [
      dot(10.5, 10.5, 5.4),
      { d: "M15 15L19.4 19.4", sw: 3 },
      dot(24, 24, 5.4),
      { d: "M28.4 28.4L32.8 32.8", sw: 3 },
      ring(37.5, 37.5, 5.4),
    ],
  },
  /** Radioactivity is natural: rock and sky. */
  mountain: {
    shapes: [{ d: "M4 41L17 15L25 29L31 20L44 41Z" }, dot(37, 10, 4.4)],
  },
  /** Safety: a shield with a ring cut into it. */
  shield: {
    shapes: [
      {
        d: "M24 4.5L39.5 10.2V23C39.5 32.6 33.4 39.8 24 43.5C14.6 39.8 8.5 32.6 8.5 23V10.2Z M24 12L33 15.3V23C33 29 29.4 33.6 24 36.4C18.6 33.6 15 29 15 23V15.3Z",
        evenOdd: true,
      },
    ],
  },
  /** Health: a heartbeat line. */
  pulse: {
    shapes: [{ d: "M4.5 26H14L18.6 13.5L26.4 37L31.2 24H43.5", sw: 3.6 }],
  },
  /** Energy: a bolt. */
  bolt: {
    shapes: [{ d: "M27.5 4L10.5 27H22L19 44L37.5 20H26Z", sw: 2.6, fill: true }],
  },
  /** Technology and the lab: a flask. */
  flask: {
    shapes: [
      { d: "M19 5H29", sw: 3 },
      {
        d: "M20.2 7V18.5L9.2 37C8 39.4 9.6 42 12.3 42H35.7C38.4 42 40 39.4 38.8 37L27.8 18.5V7Z M14.6 33.5H33.4L36 38.2C36.3 38.9 35.9 39.4 35.2 39.4H12.8C12.1 39.4 11.7 38.9 12 38.2Z",
        evenOdd: true,
      },
    ],
  },
  /** Practice: a dumbbell, tilted. */
  dumbbell: {
    rotate: -45,
    shapes: [
      { d: rrect(13, 21.4, 22, 5.2, 2.6) },
      { d: rrect(8.5, 14, 6, 20, 3) },
      { d: rrect(33.5, 14, 6, 20, 3) },
      { d: rrect(3.6, 18.4, 4, 11.2, 2) },
      { d: rrect(40.4, 18.4, 4, 11.2, 2) },
    ],
  },
  /** Checkpoint: a trophy. */
  trophy: {
    shapes: [
      { d: "M14 7.5H34V19.5C34 26.4 29.6 30.6 24 30.6C18.4 30.6 14 26.4 14 19.5Z" },
      { d: "M14 12H8.6V14.6C8.6 19.4 11.4 21.8 15 22.6", sw: 2.8 },
      { d: "M34 12H39.4V14.6C39.4 19.4 36.6 21.8 33 22.6", sw: 2.8 },
      { d: rrect(21, 30, 6, 7, 1) },
      { d: rrect(14.5, 36.6, 19, 5.4, 2.4) },
    ],
  },
  /** A lesson with no topic picture: a star. */
  star: {
    shapes: [{ d: "M24 5.5L29.6 17.7L42.8 19.3L33 28.4L35.6 41.5L24 34.9L12.4 41.5L15 28.4L5.2 19.3L18.4 17.7Z", sw: 3.2, fill: true }],
  },
  /** Unit 4, the dose scale: a dial with its needle part way round. */
  gauge: {
    shapes: [
      { d: "M6.5 34A17.5 17.5 0 0 1 41.5 34", sw: 4 },
      { d: "M24 34L33.4 21.4", sw: 3.6 },
      dot(24, 34, 4),
      { d: "M6 41H42", sw: 3 },
    ],
  },
  /** Unit 4, radiation and cells: a cell with its nucleus. */
  cell: {
    shapes: [
      { d: ellipse(24, 24, 19.2, 15.6, -12), sw: 2.8 },
      dot(21.4, 22.4, 6.2),
      dot(33.6, 30.4, 2.6),
      dot(13.4, 31.4, 2.2),
    ],
  },
  /** Unit 4, all at once or over time: an hourglass with sand in the lower half. */
  hourglass: {
    shapes: [
      { d: "M11 6H37M11 42H37", sw: 3.6 },
      { d: "M14.4 6C14.4 17.6 22 19.6 24 24C22 28.4 14.4 30.4 14.4 42M33.6 6C33.6 17.6 26 19.6 24 24C26 28.4 33.6 30.4 33.6 42", sw: 3 },
      { d: "M17.4 41C18 35.4 21.6 33.6 24 31.2C26.4 33.6 30 35.4 30.6 41Z" },
    ],
  },
  /** Unit 4, time, distance, shielding: a source, a wall, and an arrow going away. */
  distance: {
    shapes: [
      dot(8.4, 24, 5),
      { d: rrect(19.5, 10, 5.6, 28, 2.4) },
      { d: "M30 24H42" , sw: 3.2 },
      { d: "M37 18.4L42.6 24L37 29.6", sw: 3.2 },
    ],
  },
  /** Unit 4, risk in perspective: a balance. */
  scales: {
    shapes: [
      { d: "M24 8V38", sw: 3 },
      { d: rrect(14, 38, 20, 4.4, 2.2) },
      { d: "M8 13.4H40", sw: 3.2 },
      { d: "M8 13.4L3.6 27M8 13.4L12.4 27", sw: 1.8 },
      { d: "M40 13.4L35.6 27M40 13.4L44.4 27", sw: 1.8 },
      { d: "M2.8 27H13.2C13.2 32.4 2.8 32.4 2.8 27Z" },
      { d: "M34.8 27H45.2C45.2 32.4 34.8 32.4 34.8 27Z" },
    ],
  },
  /** A guidebook. */
  book: {
    shapes: [
      { d: "M22.4 12.6C18.6 9.6 12 9 5.5 10.6V36.6C12 35 18.6 35.6 22.4 38.6Z" },
      { d: "M25.6 12.6C29.4 9.6 36 9 42.5 10.6V36.6C36 35 29.4 35.6 25.6 38.6Z" },
    ],
  },
} as const satisfies Record<string, Glyph>;

export type GlyphId = keyof typeof GLYPHS;

export const GLYPH_IDS = Object.keys(GLYPHS) as GlyphId[];

/* ------------------------------------------------------------------ */
/* Which glyph a node gets                                             */
/* ------------------------------------------------------------------ */

export interface GlyphNode {
  kind: "lesson" | "practice" | "checkpoint";
  lessonId?: string | null;
  title?: string | null;
}

/** The topic words of a lesson, first match wins. Order matters: specific before general. */
const TOPIC_RULES: readonly (readonly [RegExp, GlyphId])[] = [
  // Unit 4, Radiation and the Body (each lesson has its own picture, and these come first)
  [/dose-scale/, "gauge"],
  [/radiation-and-cells/, "cell"],
  [/dose-and-time/, "hourglass"],
  [/time-distance/, "distance"],
  [/risk-in-perspective/, "scales"],
  // Unit 3, Radiation Meets Matter (before the general rules below, which would give most of it a trefoil; each lesson has its own picture)
  [/ioniz/, "bolt"],
  [/stops|shielding/, "shield"],
  [/irradiat|contaminat|exposed/, "flask"],
  [/detect|geiger|counter/, "pulse"],
  [/becquerel|sievert|gray/, "book"],
  [/isotop/, "isotope"],
  [/periodic|element/, "table"],
  [/proton|neutron|electron|particle/, "nucleus"],
  [/chain/, "chain"],
  [/half-?life/, "clock"],
  [/alpha|beta|gamma/, "rays"],
  [/natural|nature/, "mountain"],
  [/decay|radioactiv|radiation|dose|geiger|detect/, "trefoil"],
  [/stable|unstable|nuclei|nucleus|fission|fusion|binding/, "burst"],
  [/shield|safety|protect|risk|waste|society/, "shield"],
  [/health|medic|body|cancer|therapy|imaging/, "pulse"],
  [/energy|power|reactor|electric|grid|plant/, "bolt"],
  [/technolog|lab|experiment|tool|chem|engineer/, "flask"],
  [/atom/, "atom"],
];

/** The glyph for a path node: its kind decides practice and checkpoints, its topic decides lessons. */
export function glyphForNode(node: GlyphNode): GlyphId {
  if (node.kind === "practice") return "dumbbell";
  if (node.kind === "checkpoint") return "trophy";
  const text = `${node.lessonId ?? ""} ${node.title ?? ""}`.toLowerCase();
  for (const [pattern, glyph] of TOPIC_RULES) {
    if (pattern.test(text)) return glyph;
  }
  return "star";
}
