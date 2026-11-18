/**
 * Lesson object art: small flat pictures of things (a hand, a cell, an atom, an apple, a flame) in the
 * Duolingo-style object look (project skill `duolingo-object-style`). Pure data with no imports, so
 * Node tests can check it and `scripts/render-object-art.mjs` can draw a contact sheet of it.
 *
 * Every picture lives in one 100 x 100 frame (y down), centred, no wider or taller than 100. Shapes
 * are listed back to front and are only:
 *
 *   { t: "rect",   x, y, w, h, r, fill, opacity? }   rounded rectangle (a pill when r is half the short side)
 *   { t: "circle", cx, cy, r, fill, opacity? }
 *   { t: "path",   d, fill, opacity? }
 *   { t: "line",   d, stroke, width }                a capsule: a round-capped stroke
 *
 * Rules (from the skill): flat colour, no outlines or gradients, rounded corners, the side facing
 * away (the right) one step darker, a pale bar for shine on glossy things only, three to five
 * colours with one repeating accent. Colours are fixed hues, the same in light and dark (theme
 * exception EX-13), so there is no theme input here.
 */

export type ArtShape =
  | { t: "rect"; x: number; y: number; w: number; h: number; r: number; fill: string; opacity?: number }
  | { t: "circle"; cx: number; cy: number; r: number; fill: string; opacity?: number }
  | { t: "path"; d: string; fill: string; opacity?: number }
  | { t: "line"; d: string; stroke: string; width: number };

// ── palette: [light, base, dark] families from the official Duolingo-style colours ───────────────
const SNOW = "#FFFFFF";
const EEL = ["#767676", "#4B4B4B", "#413D3D"] as const;
const GLASS = ["#DDF8FE", "#BAF2FE", "#7AE1FE"] as const;
const ANCHOVY = ["#E8F1F4", "#D2E4E8", "#B8CDD3"] as const;
const BEE = ["#FFE070", "#FFC800", "#E6A800"] as const;
const FOX = ["#FFB650", "#FF9600", "#DA7C00"] as const;
const CRUMB = ["#FFE0B2", "#FECC8D", "#F2B66F"] as const;
const COFFEE = ["#8A4B0C", "#733C00", "#522A01"] as const;
const SEA = ["#7AE1FE", "#1CB0F6", "#1899D6"] as const;
const LEAF = ["#A5ED6E", "#58CC02", "#46A302"] as const;
const RED = ["#FF7878", "#FF4B4B", "#D93B3B"] as const;
const PLUM = ["#CE82FF", "#9069CD", "#6F4EA1"] as const;
const PINK = ["#FFDFE0", "#FFB2B2", "#F5A4A4"] as const;
const SKIN = ["#FFCBA3", "#F5B092", "#E8946F"] as const;

// ── constructors ─────────────────────────────────────────────────────────────────────────────────
const rect = (x: number, y: number, w: number, h: number, r: number, fill: string, opacity?: number): ArtShape => ({ t: "rect", x, y, w, h, r: Math.min(r, w / 2, h / 2), fill, ...(opacity === undefined ? {} : { opacity }) });
const pill = (x: number, y: number, w: number, h: number, fill: string, opacity?: number) => rect(x, y, w, h, Math.min(w, h) / 2, fill, opacity);
const circle = (cx: number, cy: number, r: number, fill: string, opacity?: number): ArtShape => ({ t: "circle", cx, cy, r, fill, ...(opacity === undefined ? {} : { opacity }) });
const path = (d: string, fill: string, opacity?: number): ArtShape => ({ t: "path", d, fill, ...(opacity === undefined ? {} : { opacity }) });
const line = (d: string, stroke: string, width: number): ArtShape => ({ t: "line", d, stroke, width });

const f = (n: number) => Math.round(n * 100) / 100;
/** A polygon with rounded corners (radius r), as path data. */
function poly(points: [number, number][], r: number, fill: string): ArtShape {
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
  return path(d + "Z", fill);
}

/** Points on a circle: degrees clockwise from 12 o'clock. */
const on = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a))];
};

// ── the pictures ─────────────────────────────────────────────────────────────────────────────────
const spokes = (cx: number, cy: number, r0: number, r1: number, count: number, offset: number, stroke: string, width: number): ArtShape[] =>
  Array.from({ length: count }, (_, i) => {
    const a = on(cx, cy, r0, offset + (360 / count) * i);
    const b = on(cx, cy, r1, offset + (360 / count) * i);
    return line(`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`, stroke, width);
  });

const ring = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`;

export const OBJECT_ART = {
  /** A flat open hand: a palm, four fingers and a thumb, the far side one step darker. */
  hand: [
    rect(30, 42, 48, 46, 20, SKIN[2]),
    line("M71 44V30", SKIN[2], 11),
    rect(26, 42, 48, 46, 20, SKIN[1]),
    line("M33 46V28", SKIN[1], 11),
    line("M44 44V16", SKIN[1], 11),
    line("M55 44V20", SKIN[1], 11),
    line("M66 46V30", SKIN[1], 11),
    line("M31 70L17 52", SKIN[1], 12),
    pill(34, 60, 6, 16, SKIN[0]),
  ],

  /** A cell: a pink body, a darker right edge, a purple nucleus and two small parts. */
  cell: [
    circle(55, 53, 38, PINK[2]),
    circle(50, 50, 38, PINK[0]),
    circle(48, 50, 17, PLUM[1]),
    circle(52, 54, 6, PLUM[2]),
    pill(22, 70, 14, 7, PINK[1]),
    pill(66, 28, 10, 6, PINK[1]),
    pill(28, 28, 5, 12, SNOW, 0.9),
  ],

  /** A virus: a round green body ringed by eight spikes that end in round knobs. */
  virus: [
    ...spokes(50, 50, 24, 38, 8, 22.5, LEAF[2], 9),
    circle(50, 50, 28, LEAF[1]),
    circle(57, 57, 3.4, LEAF[2]),
    circle(42, 58, 2.6, LEAF[2]),
    pill(36, 36, 5, 12, LEAF[0]),
  ],

  /** An atom: a nucleus of four small balls, two flat rings and three electrons. */
  atom: [
    line(ring(50, 50, 25), SEA[0], 4.2),
    line(ring(50, 50, 42), SEA[0], 4.2),
    circle(43, 44, 9.5, RED[1]),
    circle(58, 45, 9.5, SEA[1]),
    circle(51, 58, 9.5, RED[1]),
    circle(38, 58, 8, SEA[1]),
    circle(...on(50, 50, 25, 30), 6.4, BEE[1]),
    circle(...on(50, 50, 42, 140), 6.4, BEE[1]),
    circle(...on(50, 50, 42, 255), 6.4, BEE[1]),
  ],

  /** A drop of water: blue, the right side a step darker, a pale shine. */
  water: [
    path("M50 8C50 8 22 42 22 62A28 28 0 0 0 78 62C78 42 50 8 50 8Z", SEA[1]),
    path("M56 24C66 38 78 50 78 62A28 28 0 0 1 50 90C64 82 68 58 56 24Z", SEA[2]),
    pill(32, 56, 6, 18, SEA[0]),
  ],

  /** Air: three curling lines of wind and two drifting specks. */
  air: [
    line("M12 36H56Q70 36 70 26Q70 18 62 18", SEA[1], 8),
    line("M20 54H78Q92 54 92 64Q92 72 84 72", GLASS[2], 8),
    line("M12 74H50Q60 74 60 82", SEA[0], 8),
    circle(80, 36, 4, GLASS[2]),
    circle(30, 90, 3, GLASS[2]),
  ],

  /** A phone: dark body, a pale screen with two app tiles, a darker right edge. */
  phone: [
    rect(30, 8, 44, 84, 11, EEL[2]),
    rect(28, 8, 44, 84, 11, EEL[1]),
    rect(33, 16, 34, 62, 5, GLASS[1]),
    rect(38, 24, 10, 10, 3, BEE[1]),
    rect(52, 24, 10, 10, 3, LEAF[1]),
    rect(38, 38, 10, 10, 3, RED[1]),
    pill(36, 22, 4, 14, SNOW, 0.7),
    pill(43, 83, 14, 4, EEL[0]),
  ],

  /** An apple: a round red body with a dimple on top, a brown stem and a green leaf. */
  apple: [
    rect(16, 30, 72, 60, 26, RED[2]),
    rect(12, 30, 72, 60, 26, RED[1]),
    pill(40, 28, 20, 7, RED[2]),
    pill(47, 8, 6, 24, COFFEE[1]),
    poly([[54, 22], [82, 10], [76, 34]], 6, LEAF[1]),
    pill(22, 46, 6, 18, RED[0]),
  ],

  /** The sun: a round yellow face with eight short rays. */
  sun: [
    ...spokes(50, 50, 32, 44, 8, 0, BEE[1], 8),
    circle(50, 50, 26, BEE[2]),
    circle(48, 48, 26, BEE[1]),
    pill(34, 34, 5, 14, BEE[0]),
  ],

  /** A flame: orange outside, yellow inside, the right edge a step darker. */
  flame: [
    path("M50 6C58 26 82 38 82 62A32 32 0 0 1 18 62C18 46 30 38 38 24C42 32 44 34 47 35C49 27 48 17 50 6Z", FOX[1]),
    path("M62 38C74 46 82 52 82 62A32 32 0 0 1 50 94C68 86 74 56 62 38Z", FOX[2]),
    path("M50 46C56 56 68 62 68 74A18 18 0 0 1 32 74C32 64 44 60 50 46Z", BEE[1]),
  ],

  /** Two red blood cells: red discs with a darker dip, the far one a step darker. */
  rbc: [
    circle(68, 66, 27, RED[2]),
    circle(35, 38, 31, RED[2]),
    circle(33, 36, 31, RED[1]),
    circle(33, 36, 13, RED[2]),
    circle(66, 64, 27, RED[1]),
    circle(66, 64, 11, RED[2]),
    pill(14, 24, 5, 14, RED[0]),
  ],

  /** A hair: two long wavy strands, brown, one darker. */
  hair: [
    line("M14 82C30 10 46 96 62 40C70 14 86 18 88 22", COFFEE[2], 7),
    line("M10 70C28 4 42 90 58 38C66 14 84 14 90 14", COFFEE[1], 7),
    line("M18 52C22 36 26 30 30 34", COFFEE[0], 3),
  ],

  /** Grains of rice: pointed pale grains, each with a darker underside. */
  rice: [
    path("M23 83Q66 74 75 31Q32 40 23 83Z", CRUMB[2]),
    path("M20 80Q63 71 72 28Q29 37 20 80Z", CRUMB[0]),
    line("M30 64L48 46", SNOW, 5),
    path("M60 92Q86 88 92 62Q66 66 60 92Z", CRUMB[1]),
    path("M10 44Q30 40 36 20Q16 24 10 44Z", CRUMB[1]),
  ],

  /** A salt shaker: pale glass full of salt, a metal cap with three holes, two crystals. */
  salt: [
    rect(26, 34, 48, 56, 12, GLASS[2]),
    rect(24, 34, 48, 56, 12, GLASS[1]),
    rect(29, 46, 38, 40, 8, SNOW),
    rect(26, 16, 44, 22, 9, ANCHOVY[2]),
    rect(24, 16, 44, 22, 9, ANCHOVY[1]),
    circle(36, 27, 2.8, EEL[1]),
    circle(46, 27, 2.8, EEL[1]),
    circle(56, 27, 2.8, EEL[1]),
    pill(32, 52, 5, 14, GLASS[0]),
  ],

  /** A shadow: a blue ball and the long pale shape it throws on the ground. */
  shadow: [
    pill(24, 78, 72, 14, ANCHOVY[2]),
    circle(40, 42, 28, SEA[2]),
    circle(38, 40, 28, SEA[1]),
    pill(22, 28, 6, 16, SEA[0]),
  ],

  /** A sound: a speaker with two arcs of waves. */
  sound: [
    poly([[40, 36], [62, 16], [62, 84], [40, 64]], 6, EEL[2]),
    rect(12, 36, 32, 28, 7, EEL[1]),
    poly([[38, 36], [60, 16], [60, 84], [38, 64]], 6, EEL[1]),
    line("M72 38Q82 50 72 62", SEA[1], 7),
    line("M80 26Q98 50 80 74", SEA[0], 7),
  ],

  /** A lamp: a yellow shade, a thin stand and base, three rays of light. */
  lamp: [
    pill(28, 86, 44, 8, EEL[1]),
    line("M50 50V86", EEL[1], 7),
    poly([[32, 12], [68, 12], [84, 46], [16, 46]], 8, BEE[2]),
    poly([[30, 12], [66, 12], [82, 46], [14, 46]], 8, BEE[1]),
    pill(32, 20, 5, 12, BEE[0]),
    line("M26 58L18 70", BEE[0], 6),
    line("M50 60V74", BEE[0], 6),
    line("M74 58L82 70", BEE[0], 6),
  ],

  /** A marble: a blue glass ball with a lighter core and a shine bar. */
  marble: [
    circle(55, 56, 34, SEA[2]),
    circle(50, 51, 34, SEA[1]),
    circle(52, 56, 17, SEA[0]),
    circle(56, 60, 7, SEA[2]),
    pill(28, 30, 7, 18, GLASS[0]),
  ],

  /** A car from the side: a red body and cabin, two windows, two wheels. */
  car: [
    rect(15, 46, 80, 28, 11, RED[2]),
    rect(10, 46, 80, 28, 11, RED[1]),
    poly([[26, 48], [38, 26], [66, 26], [78, 48]], 6, RED[1]),
    poly([[35, 46], [42, 32], [53, 32], [53, 46]], 3, GLASS[1]),
    poly([[57, 46], [57, 32], [64, 32], [71, 46]], 3, GLASS[1]),
    pill(80, 54, 8, 7, BEE[1]),
    circle(30, 74, 12, EEL[1]),
    circle(70, 74, 12, EEL[1]),
    circle(30, 74, 5, ANCHOVY[1]),
    circle(70, 74, 5, ANCHOVY[1]),
  ],

  /** A football stadium from above: grey stands round a green pitch, a halfway line and a centre circle. */
  stadium: [
    rect(26, 8, 64, 84, 28, ANCHOVY[2]),
    rect(16, 8, 64, 84, 28, ANCHOVY[1]),
    rect(24, 18, 48, 64, 16, ANCHOVY[0]),
    rect(30, 24, 36, 52, 6, LEAF[1]),
    rect(30, 30, 36, 9, 2, LEAF[0]),
    rect(30, 61, 36, 9, 2, LEAF[0]),
    pill(30, 48, 36, 3, SNOW),
    line(ring(48, 50, 7), SNOW, 3),
  ],

  /** A blade of grass: three leaves, light to dark, on a strip of soil. */
  grass: [
    poly([[26, 36], [42, 86], [12, 86]], 5, LEAF[0]),
    poly([[76, 30], [92, 86], [62, 86]], 5, LEAF[2]),
    poly([[52, 8], [66, 86], [38, 86]], 5, LEAF[1]),
    pill(8, 82, 84, 10, COFFEE[1]),
  ],

  /** A party balloon: a red body, a knot, a string and a shine bar (helium). */
  balloon: [
    line("M50 80Q40 86 50 94", EEL[0], 3),
    rect(26, 8, 54, 66, 27, RED[2]),
    rect(20, 8, 54, 66, 27, RED[1]),
    poly([[44, 72], [56, 72], [50, 82]], 2, RED[2]),
    pill(28, 20, 7, 18, PINK[0]),
  ],

  /** A diamond: a pale crown, a blue body, the right half one step darker (carbon). */
  diamond: [
    poly([[10, 42], [90, 42], [50, 90]], 5, SEA[1]),
    poly([[50, 42], [90, 42], [50, 90]], 5, SEA[2]),
    poly([[28, 16], [72, 16], [90, 42], [10, 42]], 5, SEA[0]),
    poly([[40, 16], [60, 16], [64, 42], [36, 42]], 3, GLASS[0]),
  ],

  /** A gold bar: a light top face and a gold front, the right side darker. */
  gold: [
    rect(20, 46, 74, 34, 8, BEE[2]),
    rect(14, 46, 74, 34, 8, BEE[1]),
    poly([[30, 24], [74, 24], [90, 46], [14, 46]], 6, BEE[0]),
    pill(34, 58, 26, 7, BEE[2]),
    pill(22, 56, 6, 14, SNOW),
  ],

  /** A lightning bolt: yellow with a darker edge (electric push). */
  bolt: [
    poly([[62, 6], [28, 56], [50, 56], [42, 94], [82, 40], [58, 40]], 6, BEE[2]),
    poly([[58, 6], [24, 56], [46, 56], [38, 94], [78, 40], [54, 40]], 6, BEE[1]),
    pill(40, 22, 5, 18, BEE[0]),
  ],

  /** A horseshoe magnet: a red U with pale tips (the strong force pulls together). */
  magnet: [
    line("M31 22V56A24 24 0 0 0 79 56V22", RED[2], 18),
    line("M26 22V56A24 24 0 0 0 74 56V22", RED[1], 18),
    line("M26 20V32", ANCHOVY[0], 18),
    line("M74 20V32", ANCHOVY[0], 18),
    pill(15, 46, 5, 18, PINK[0]),
  ],

  /** The radiation sign: a yellow disc with three dark blades round a hub. */
  radiation: [
    circle(53, 53, 41, BEE[2]),
    circle(49, 49, 41, BEE[1]),
    ...[0, 120, 240].map((deg) => {
      const a = on(49, 49, 31, deg - 30);
      const b = on(49, 49, 31, deg + 30);
      return path(`M49 49L${a[0]} ${a[1]}A31 31 0 0 1 ${b[0]} ${b[1]}Z`, EEL[1]);
    }),
    circle(49, 49, 10, BEE[1]),
    circle(49, 49, 6, EEL[1]),
  ],
  /** A banana: a curved yellow capsule with a brown stem and tip (it holds a little natural potassium-40). */
  banana: [
    line("M26 26Q30 78 80 74", BEE[2], 26),
    line("M22 24Q26 72 76 70", BEE[1], 26),
    line("M30 34Q34 60 54 66", BEE[0], 4),
    line("M22 12L21 22", COFFEE[1], 9),
    line("M78 70L86 70", COFFEE[1], 9),
  ],

  /** A rock: a grey lump with a lighter top, the right side one step darker (rocks contain natural uranium and thorium). */
  rock: [
    poly([[20, 72], [28, 40], [52, 22], [82, 30], [94, 60], [84, 88], [30, 90]], 12, EEL[0]),
    poly([[14, 70], [22, 38], [46, 20], [76, 28], [88, 58], [78, 86], [24, 88]], 12, ANCHOVY[2]),
    poly([[22, 38], [46, 20], [76, 28], [64, 46], [36, 52]], 6, ANCHOVY[1]),
    pill(24, 60, 6, 14, ANCHOVY[0]),
    line("M58 62L66 74", EEL[0], 3),
  ],
} as const satisfies Record<string, readonly ArtShape[]>;

export type ArtId = keyof typeof OBJECT_ART;

export const ART_IDS = Object.keys(OBJECT_ART) as ArtId[];

export function isArtId(id: unknown): id is ArtId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(OBJECT_ART, id);
}

/** What each picture shows, for screen readers when a picture stands alone. */
export const ART_NAMES: Record<ArtId, string> = {
  hand: "a hand",
  cell: "a cell",
  virus: "a virus",
  atom: "an atom",
  water: "a drop of water",
  air: "air, shown as wind",
  phone: "a phone",
  apple: "an apple",
  sun: "the sun",
  flame: "a flame",
  rbc: "a red blood cell",
  hair: "a hair",
  rice: "a grain of rice",
  salt: "a salt shaker",
  shadow: "a ball and its shadow",
  sound: "a speaker",
  lamp: "a lamp",
  marble: "a marble",
  car: "a car",
  stadium: "a football stadium seen from above",
  grass: "a blade of grass",
  balloon: "a balloon",
  diamond: "a diamond",
  gold: "a gold bar",
  bolt: "a lightning bolt",
  magnet: "a horseshoe magnet",
  radiation: "the radiation sign",
  banana: "a banana",
  rock: "a rock",
};
