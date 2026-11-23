/**
 * The cover of a teacher's profile: a wallpaper of small flat pictures that speak about them, in the
 * teacher's own outfit colour (docs/features/NPC_TEACHERS_SPEC.md). Hal's is atoms and questions, Ada's decay
 * curves and trefoils, Ray's shields and rays, Mina's hearts and drops, Kofi's gears and cooling towers,
 * Tess's sprouts and gadgets, Sage's scales and leaves.
 *
 * Pure data with no framework imports, so Node tests can check it and `scripts/render-npc-covers.mjs`
 * can draw a contact sheet. Every picture (a glyph) is one colour in a 24 x 24 box: solid shapes and
 * round-capped strokes, never an outline round a fill. The layout is a staggered grid, the same for
 * everyone; only the glyphs differ. The cover itself has two tones taken from the outfit: a lighter
 * tint of its colour for the glyphs, and its shade for the small dots between them.
 */

import { lighten } from "../lesson/visual/color-math.ts";

export type GlyphShape =
  | { t: "p"; d: string } // a filled path
  | { t: "l"; d: string; w: number } // a round-capped stroke
  | { t: "c"; cx: number; cy: number; r: number } // a filled circle
  | { t: "r"; cx: number; cy: number; r: number; w: number }; // a ring (stroked circle)

const p = (d: string): GlyphShape => ({ t: "p", d });
const l = (d: string, w = 2): GlyphShape => ({ t: "l", d, w });
const c = (cx: number, cy: number, r: number): GlyphShape => ({ t: "c", cx, cy, r });
const r = (cx: number, cy: number, rad: number, w = 2): GlyphShape => ({ t: "r", cx, cy, r: rad, w });

const f = (n: number) => Math.round(n * 100) / 100;
const on = (cx: number, cy: number, rad: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [f(cx + rad * Math.cos(a)), f(cy + rad * Math.sin(a))];
};

const sparkle = p("M12 2C12 9 15 12 22 12C15 12 12 15 12 22C12 15 9 12 2 12C9 12 12 9 12 2Z");
const rounded = (x: number, y: number, w: number, h: number, rad: number) =>
  `M${x + rad} ${y}H${x + w - rad}A${rad} ${rad} 0 0 1 ${x + w} ${y + rad}V${y + h - rad}A${rad} ${rad} 0 0 1 ${x + w - rad} ${y + h}H${x + rad}A${rad} ${rad} 0 0 1 ${x} ${y + h - rad}V${y + rad}A${rad} ${rad} 0 0 1 ${x + rad} ${y}Z`;

/** Every picture the covers use, by name. */
export const GLYPHS = {
  // Hal: what things are made of
  atom: [r(12, 12, 8, 2), c(12, 12, 2.8), c(18.7, 7.6, 1.9), c(5.7, 16.9, 1.9)],
  nucleus: [c(9.5, 14, 4.2), c(15, 14, 4.2), c(12.3, 8.6, 4.2)],
  orbit: [r(12, 12, 8.5, 2), c(12, 3.5, 2.2), c(12, 20.5, 2.2), c(12, 12, 2)],
  proton: [r(12, 12, 9, 2.2), l("M12 7.8V16.2M7.8 12H16.2", 2.2)],
  question: [l("M8.5 8.8A3.7 3.7 0 1 1 12.8 12.2C12 12.7 12 13.4 12 14.8", 2.3), c(12, 19.3, 1.6)],
  sparkle: [sparkle],
  // her flask and her bow
  flask: [p("M9.2 3.2H14.8V4.6H13.6V9.4L19.3 18.4C20.2 19.9 19.2 21.4 17.5 21.4H6.5C4.8 21.4 3.8 19.9 4.7 18.4L10.4 9.4V4.6H9.2Z"), c(19.2, 6.2, 1.5), c(5.4, 8.2, 1.2), c(17.4, 10.8, 1)],
  bow: [p("M12 12L3.5 6.2Q2.2 5.3 2.4 7.3L3.2 15.8Q3.4 17.8 5 16.7Z"), p("M12 12L20.5 6.2Q21.8 5.3 21.6 7.3L20.8 15.8Q20.6 17.8 19 16.7Z"), c(12, 12, 3.1)],

  // Hal's test tube and his rock sample
  tube: [p("M8.8 3.4H15.2V5H14.2V17.2A2.2 2.2 0 0 1 12 20.6A2.2 2.2 0 0 1 9.8 17.2V5H8.8Z"), c(18.6, 7.4, 1.4), c(5.6, 11, 1.1)],
  rock: [c(12, 12, 7.6), ...Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2 + 0.3; return c(f(12 + Math.cos(a) * 7.6), f(12 + Math.sin(a) * 7.6), 2.7); })],

  // Ada: why atoms change; time, decay
  watch: [r(12, 13.5, 8, 2), l("M12 9.5V13.5L15 15.2", 2), l("M10 3.2H14", 2.4)],
  hourglass: [l("M7 3.5H17M7 20.5H17M8 3.5C8 9 16 10.5 16 12C16 13.5 8 15 8 20.5M16 3.5C16 9 8 10.5 8 12C8 13.5 16 15 16 20.5", 1.9)],
  decay: [l("M3.5 4.5C7 4.5 7.5 17.5 20.5 19.5", 2.2), c(4, 4.6, 1.9), c(8.4, 11.3, 1.9), c(20.5, 19.5, 1.9)],
  ticks: [c(5, 12, 3.2), c(13, 12, 2.4), c(19.5, 12, 1.6)],
  trefoil: [
    ...[0, 120, 240].map((deg) => {
      const a = on(12, 12, 9.5, deg - 27);
      const b = on(12, 12, 9.5, deg + 27);
      return p(`M12 12L${a[0]} ${a[1]}A9.5 9.5 0 0 1 ${b[0]} ${b[1]}Z`);
    }),
    c(12, 12, 2),
  ],
  halflife: [r(12, 12, 8.5, 2), p("M12 3.5A8.5 8.5 0 0 1 12 20.5Z")],

  // Ray: practical; shielding, rays, clipboard and hand-held counter
  shield: [p("M12 2.8L19.5 5.5V11.5C19.5 16.2 16.2 19.6 12 21.2C7.8 19.6 4.5 16.2 4.5 11.5V5.5Z")],
  rays: [l("M3 6H12M9.5 3.5L12 6L9.5 8.5", 2), l("M3 12H12M9.5 9.5L12 12L9.5 14.5", 2), l("M3 18H12M9.5 15.5L12 18L9.5 20.5", 2), l("M18.5 3V21", 3.2)],
  clipboard: [l(rounded(5.5, 4.5, 13, 16.5, 2.5), 2.1), p(rounded(9, 2.5, 6, 3.6, 1.5)), l("M8.8 10.5H15.2M8.8 14H15.2M8.8 17.5H13", 2)],
  counter: [l(rounded(6, 7, 12, 14, 2.8), 2.1), l("M9 12.5L12.5 9.8", 2), c(12, 17, 1.8), l("M9.5 7V3.5M14.5 7V5", 2.1)],
  zigzag: [l("M2.5 12L6 6L10 18L14 6L18 18L21.5 12", 2)],
  glasses: [l("M3 10H10.5V15.5H3Z M13.5 10H21V15.5H13.5Z M10.5 12H13.5", 1.9)],
  layers: [l("M6 7V17", 3.4), l("M12 5V19", 3.4), l("M18 3V21", 3.4)],
  crosshair: [r(12, 12, 7.5, 2), c(12, 12, 2.2), l("M12 1.8V5M12 19V22.2M1.8 12H5M19 12H22.2", 2)],

  // Mina: warm and calm; the body, dose, stethoscope
  heart: [p("M12 20.5C5 15.5 3 11.5 3 8.5A4.8 4.8 0 0 1 12 6.5A4.8 4.8 0 0 1 21 8.5C21 11.5 19 15.5 12 20.5Z")],
  stethoscope: [l("M7 4.5V9.5A5 5 0 0 0 17 9.5V4.5", 2.1), l("M12 14.5V17.5A3.5 3.5 0 0 0 19 17.5V15", 2.1), c(19, 13.5, 2.4), c(7, 4.2, 1.4), c(17, 4.2, 1.4)],
  drop: [p("M12 3C15 8 18 11 18 15A6 6 0 0 1 6 15C6 11 9 8 12 3Z")],
  cross: [l("M12 5V19M5 12H19", 4.4)],
  calm: [l("M2.5 9Q5.5 3.5 8.5 9T14.5 9T20.5 9", 2.2), l("M3.5 16Q6.5 10.5 9.5 16T15.5 16T21.5 16", 2.2)],
  cell: [r(12, 12, 9, 2), c(10, 11, 3), c(16, 15.5, 1.6)],
  pulse: [l("M2 12H7L9.5 6.5L13.5 18L16 12H22", 2.2)],

  // Kofi: an engineer; how things work
  gear: [r(12, 12, 6, 2.4), ...Array.from({ length: 8 }, (_, i) => {
    const a = on(12, 12, 7.6, i * 45);
    const b = on(12, 12, 10.6, i * 45);
    return l(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, 3.2);
  })],
  tower: [p("M7 3C8 8 8.5 12 5.5 21H18.5C15.5 12 16 8 17 3Z")],
  bolt: [p("M13.5 2.5L5.5 13.5H11.5L10 21.5L18.5 10H12.5Z")],
  steam: [c(8, 16, 4), c(15, 14, 4.6), c(11.5, 7.5, 3.6)],
  wrench: [l("M4.5 19.5L13 11", 3.6), r(16.2, 7.8, 4.2, 2.4)],
  gauge: [l("M3.5 17A8.5 8.5 0 0 1 20.5 17", 2.4), l("M12 17L16 10.5", 2.4), c(12, 17, 2)],

  // Tess: quick; gadgets, hospitals, farms, factories, glowing tracer vial
  vial: [l(rounded(8, 5.5, 8, 15, 3), 2.1), p(rounded(9, 12.5, 6, 7, 2)), l("M9 3.2H15", 2.4), c(18.8, 7.5, 1.4), c(5.2, 10.5, 1.2)],
  sprout: [l("M12 21V11", 2.2), p("M12 12C12 7 8 5 4 5C4 10 7 12 12 12Z"), p("M12 14C12 9.5 15.5 7.5 20 7.5C20 12 17 14 12 14Z")],
  factory: [p("M3 21V11L9.5 15V11L16 15V4H20V21Z")],
  chip: [l("M7.5 7.5H16.5V16.5H7.5Z", 2.2), l("M10 3.5V7.5M14 3.5V7.5M10 16.5V20.5M14 16.5V20.5M3.5 10H7.5M3.5 14H7.5M16.5 10H20.5M16.5 14H20.5", 2), c(12, 12, 1.8)],
  hospital: [l(rounded(4, 4, 16, 16, 2.5), 2.1), l("M12 8V16M8 12H16", 2.2)],
  phone: [l(rounded(7, 3, 10, 18, 2.5), 2.1), c(12, 17.4, 1.2)],

  // Sage: weighs both sides; safety and society, notebook and pen
  scale: [l("M12 4V20M6.5 20H17.5M5 7H19", 2.1), l("M5 7L2.8 13.5H7.2Z M19 7L16.8 13.5H21.2Z", 1.8)],
  notebook: [l(rounded(5.5, 3.5, 13, 17, 2.5), 2.1), l("M9 3.5V20.5M12 9H15.5M12 13H15.5", 2)],
  leaf: [p("M5 19C5 10 10 4.5 20 4C20 14 15 19.5 6 19.5Z")],
  drum: [l(rounded(5.5, 3.5, 13, 17, 3.5), 2), l("M5.8 9H18.2M5.8 15H18.2", 1.8)],
  people: [c(8.5, 8, 3.2), c(16, 9.5, 2.6), p("M2.5 20C2.5 15 5 13 8.5 13S14.5 15 14.5 20Z"), p("M14.5 20C14.5 16.5 15.5 14.8 17.5 14.5C20 14.5 21.5 16 21.5 20Z")],
  check: [r(12, 12, 9, 2.2), l("M7.8 12.3L10.8 15.3L16.4 9.2", 2.3)],
  loop: [l("M19.5 12A7.5 7.5 0 0 0 6 7.5M4.5 12A7.5 7.5 0 0 0 18 16.5", 2.2), l("M6 3.5V7.8H10.3M18 20.5V16.2H13.7", 2.2)],
} satisfies Record<string, GlyphShape[]>;

export type GlyphId = keyof typeof GLYPHS;

/** What each teacher's cover is made of, in the order the grid cycles through them. */
export const NPC_COVER_GLYPHS: Record<string, readonly GlyphId[]> = {
  // The first two teach each other's unit now (2026-11-22), so each keeps the pictures that are theirs (Ada's flask, bow and sparkle, Hal's tube and rock) and takes their unit's for the rest
  "npc-hal": ["atom", "tube", "nucleus", "rock", "orbit", "question"],
  "npc-ada": ["trefoil", "flask", "decay", "sparkle", "bow", "halflife"],
  "npc-ray": ["shield", "clipboard", "rays", "counter", "layers", "crosshair"],
  "npc-mina": ["heart", "stethoscope", "calm", "cross", "cell", "pulse"],
  "npc-kofi": ["gear", "tower", "bolt", "steam", "wrench", "gauge"],
  "npc-tess": ["vial", "sprout", "chip", "factory", "hospital", "phone"],
  "npc-sage": ["scale", "notebook", "leaf", "people", "drum", "loop"],
  // Shrodi, the guide (not a row of npcs): his glasses, a spark of an idea and the atom he starts everyone on
  shrodi: ["glasses", "atom", "sparkle", "question", "bolt", "orbit"],
};

/** Used for a teacher that has no set of their own, so a profile never has a bare banner. */
export const DEFAULT_COVER_GLYPHS: readonly GlyphId[] = ["sparkle", "atom", "question", "heart"];

export const glyphsFor = (npcId: string | null | undefined): readonly GlyphId[] => (npcId ? NPC_COVER_GLYPHS[npcId] : undefined) ?? DEFAULT_COVER_GLYPHS;

export const COVER_W = 420;
export const COVER_H = 116;

export interface CoverPlacement {
  glyph: GlyphId;
  x: number;
  y: number;
  size: number;
  rotate: number;
  /** `light` glyphs carry the pattern; `shade` ones are the odd one out. */
  tone: "light" | "shade";
}

export interface CoverDot {
  x: number;
  y: number;
  r: number;
}

const TILTS = [-14, 8, -6, 16, 0, -10, 12];
const SIZES = [34, 28, 32, 36, 30, 32];

/**
 * The staggered grid: three rows, every other row shifted half a step, a small dot between neighbours.
 * The glyphs cycle in steps of five (so the same one never sits above or beside itself), and now and
 * then one is drawn in the shade instead of the light tone.
 */
export function coverLayout(glyphs: readonly GlyphId[]): { glyphs: CoverPlacement[]; dots: CoverDot[] } {
  const out: CoverPlacement[] = [];
  const dots: CoverDot[] = [];
  const stepX = 62;
  const stepY = 38;
  let k = 0;
  for (let j = 0; j < 3; j++) {
    for (let i = 0; i < 8; i++) {
      const cx = 8 + stepX * i + (j % 2) * (stepX / 2);
      const cy = 20 + stepY * j;
      const size = SIZES[k % SIZES.length];
      out.push({
        glyph: glyphs[(k * 5) % glyphs.length],
        x: f(cx - size / 2),
        y: f(cy - size / 2),
        size,
        rotate: TILTS[k % TILTS.length],
        tone: k % 5 === 3 ? "shade" : "light",
      });
      dots.push({ x: f(cx + stepX / 2), y: cy, r: 2.2 });
      k++;
    }
  }
  return { glyphs: out, dots };
}

/** The colour and shade a teacher's cover (and their chat header) is made from: their own `cover` colour, else the outfit's. */
export function coverColors(spec: { outfit: { color: string; shade: string }; cover?: { color: string; shade: string } }): { color: string; shade: string } {
  return spec.cover ?? spec.outfit;
}

/** The two tones of a cover, from the teacher's cover colour (the outfit colour unless they have their own) and its shade. */
export function coverTones(outfit: { color: string; shade: string }): { base: string; light: string; shade: string } {
  return { base: outfit.color, light: lighten(outfit.color, 0.42), shade: outfit.shade };
}

/** The part of the cover to draw in a box of this width over height (all of it when wide enough, a window round the middle when narrow). */
export function coverViewBox(aspect: number): { x: number; y: number; w: number; h: number } {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : COVER_W / COVER_H;
  if (a >= COVER_W / COVER_H) {
    const h = COVER_W / a;
    return { x: 0, y: (COVER_H - h) / 2, w: COVER_W, h };
  }
  const w = COVER_H * a;
  return { x: (COVER_W - w) / 2, y: 0, w, h: COVER_H };
}
