/**
 * Blog illustrations: full flat scenes for a blog piece's cover and its figures, in the same
 * Duolingo-style object look as the lesson pictures (project skill `duolingo-object-style`), only
 * composed instead of a single icon. Pure data with no framework imports, so Node tests can check it
 * and `scripts/render-blog-art.mjs` can draw a contact sheet of it.
 *
 * Every scene lives in one 200 x 120 frame (y down). It is a small set of objects on a flat backdrop,
 * listed back to front. Shapes are the object art's (rect, circle, path, line) plus `art`, which
 * places a whole lesson object picture (the hand, the cell, the banana...) at a position and size.
 *
 * Rules kept from the skill: flat colour, no outlines or gradients, rounded corners, light from the
 * upper left so the side facing away (the right and the bottom) is one step darker, a pale bar of
 * shine on glossy things only, colours from the official families, one accent that repeats.
 * Scene colours are fixed hues, the same in light and dark (theme exception EX-13).
 *
 * A scene is picked by the same id the content already uses for a cover or a figure (`atom`,
 * `radiation`, `banana`, `diamond`), so no content row changes. An id without a scene falls back to
 * the lesson object picture of that name.
 */

import {
  ANCHOVY,
  BEE,
  COFFEE,
  CRUMB,
  EEL,
  FOX,
  GLASS,
  LEAF,
  RED,
  SEA,
  SNOW,
  circle,
  line,
  on,
  path,
  pill,
  rect,
  ring,
  type ArtId,
  type ArtShape,
} from "../lesson/visual/object-art.ts";

export type BlogShape = ArtShape | { t: "art"; id: ArtId; x: number; y: number; size: number; rotate?: number };

export const SCENE_W = 200;
export const SCENE_H = 120;

const art = (id: ArtId, x: number, y: number, size: number, rotate?: number): BlogShape => ({ t: "art", id, x, y, size, ...(rotate === undefined ? {} : { rotate }) });

const f = (n: number) => Math.round(n * 100) / 100;

/** A white round plate with a soft step of shadow below it: where a picture sits. */
const plate = (cx: number, cy: number, r: number): BlogShape[] => [circle(cx + 1.5, cy + 3, r, ANCHOVY[1]), circle(cx, cy, r, SNOW)];

/** A picture centred on a point. */
const centred = (id: ArtId, cx: number, cy: number, size: number): BlogShape => art(id, cx - size / 2, cy - size / 2, size);

/** A ball: its darker twin behind, the body, and (when big enough) a pale shine bar. */
const ball = (cx: number, cy: number, r: number, fam: readonly [string, string, string]): BlogShape[] => [
  circle(cx + r * 0.22, cy + r * 0.22, r, fam[2]),
  circle(cx, cy, r, fam[1]),
  ...(r >= 5 ? [pill(cx - r * 0.55, cy - r * 0.5, Math.max(2.4, r * 0.4), r * 0.8, SNOW, 0.85)] : []),
];

/** A four-point sparkle with concave sides. */
const sparkle = (cx: number, cy: number, s: number, fill: string): BlogShape =>
  path(`M${f(cx)} ${f(cy - s)}Q${f(cx)} ${f(cy)} ${f(cx + s)} ${f(cy)}Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy + s)}Q${f(cx)} ${f(cy)} ${f(cx - s)} ${f(cy)}Q${f(cx)} ${f(cy)} ${f(cx)} ${f(cy - s)}Z`, fill);

/** A tight pile of `colors.length` small balls round a centre (a nucleus), nearest the middle first. */
function cluster(cx: number, cy: number, r: number, colors: readonly (readonly [string, string, string])[]): BlogShape[] {
  const step = r * 1.85;
  const pts: [number, number][] = [];
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) pts.push([(i + (j % 2 === 0 ? 0 : 0.5)) * step, j * step * 0.87]);
  pts.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]) || a[0] - b[0]);
  const out: BlogShape[] = [];
  // Top row first, so the balls below and to the right overlap them (light comes from the upper left)
  const placed = colors.map((c, i) => ({ c, p: pts[i] }));
  placed.sort((a, b) => a.p[1] - b.p[1] || a.p[0] - b.p[0]);
  for (const { c, p } of placed) out.push(...ball(cx + p[0], cy + p[1], r, c));
  return out;
}

/** Protons and neutrons shuffled together, so a nucleus never looks like two halves. */
function mix(protons: number, neutrons: number): (readonly [string, string, string])[] {
  const out: (readonly [string, string, string])[] = [];
  let p = protons;
  let n = neutrons;
  while (p + n > 0) {
    if (p > 0 && (p >= n || n === 0)) {
      out.push(RED);
      p--;
    }
    if (n > 0) {
      out.push(SEA);
      n--;
    }
  }
  return out;
}

// ── scene: the scale ladder (blog-the-smallest-thing) ────────────────────────────────────────────
const atomScene = (): BlogShape[] => {
  const cy = 64;
  const nucleus = cluster(160, cy, 5.4, mix(4, 3));
  const rings = [30, 19];
  return [
    rect(0, 0, SCENE_W, SCENE_H, 0, GLASS[0]),
    circle(168, 64, 60, GLASS[1]),
    circle(34, 108, 34, GLASS[1]),
    sparkle(14, 20, 6, SNOW),
    sparkle(92, 20, 4.5, SNOW),
    sparkle(190, 14, 5, SNOW),

    // The row of things, each about 300 times smaller than the one before
    ...plate(22, cy, 19),
    centred("hand", 22, cy, 32),
    line("M43 58L48 64L43 70", SEA[1], 3),
    ...plate(66, cy, 15),
    centred("cell", 66, cy, 25),
    line("M85 58L90 64L85 70", SEA[1], 3),
    ...plate(104, cy, 11),
    centred("virus", 104, cy, 19),
    line("M118 58L123 64L118 70", SEA[1], 3),

    // The atom: the last stop of the zoom, drawn large
    ...plate(160, cy, 38),
    line(ring(160, cy, rings[0]), SEA[0], 3.4),
    line(ring(160, cy, rings[1]), SEA[0], 3.4),
    ...nucleus,
    ...ball(...on(160, cy, rings[0], 35), 4.4, BEE),
    ...ball(...on(160, cy, rings[0], 215), 4.4, BEE),
    ...ball(...on(160, cy, rings[1], 125), 4, BEE),

    // A scale bar under each: shorter and shorter
    pill(12, 104, 20, 4, SEA[1]),
    pill(57, 104, 14, 4, SEA[1]),
    pill(99.5, 104, 9, 4, SEA[1]),
    pill(155, 104, 5, 4, SEA[1]),
  ];
};

// ── scene: one nucleus is a surprise, a crowd is a pattern (blog-nobody-knows-when) ──────────────
const radiationScene = (): BlogShape[] => {
  const crowd: BlogShape[] = [];
  const decayed = new Set([1, 4, 8]);
  for (let i = 0; i < 9; i++) {
    const cx = 152 + (i % 3) * 17;
    const cy = 41 + Math.floor(i / 3) * 16;
    if (decayed.has(i)) crowd.push(circle(cx, cy, 5.6, GLASS[1]), circle(cx, cy, 2.4, SEA[1]));
    else crowd.push(...ball(cx - 2, cy - 1.5, 4.8, RED), ...ball(cx + 3, cy + 2, 4.4, SEA));
  }
  const pip = (cx: number, cy: number) => circle(cx, cy, 3, EEL[1]);
  return [
    rect(0, 0, SCENE_W, SCENE_H, 0, SEA[2]),
    circle(100, 60, 60, SEA[1]),
    sparkle(76, 12, 5, SNOW),
    sparkle(128, 106, 4.5, SNOW),
    sparkle(176, 16, 4, GLASS[1]),
    sparkle(22, 108, 4, GLASS[1]),

    // The middle: the radiation sign on a white halo
    circle(101.5, 63, 47, SEA[2]),
    circle(100, 60, 47, SNOW),
    circle(100, 60, 38, GLASS[0]),
    centred("radiation", 100, 60, 64),

    // Left: a single die, because one roll cannot be called
    rect(8, 28, 52, 64, 14, SEA[1]),
    rect(14, 36, 38, 38, 10, ANCHOVY[2]),
    rect(10, 32, 38, 38, 10, SNOW),
    pip(19, 41),
    pip(39, 41),
    pip(29, 51),
    pip(19, 61),
    pip(39, 61),
    pill(20, 82, 16, 4, GLASS[1]),

    // Right: a crowd of nuclei, some already changed (a pale ring), the rest still waiting
    rect(138, 28, 56, 64, 14, SEA[1]),
    ...crowd,
    pill(150, 82, 6, 4, GLASS[1]),
    pill(160, 82, 6, 4, GLASS[1]),
    pill(170, 82, 6, 4, GLASS[1]),
    pill(180, 82, 6, 4, GLASS[1]),
  ];
};

// ── scene: a banana and a Geiger counter on a kitchen counter (blog-the-banana-on-your-counter) ──
const bananaScene = (): BlogShape[] => [
  rect(0, 0, SCENE_W, SCENE_H, 0, CRUMB[0]),
  circle(24, 30, 40, CRUMB[1]),

  // A window with the sun in it
  rect(145, 9, 48, 52, 12, ANCHOVY[2]),
  rect(147, 11, 44, 48, 10, SNOW),
  rect(150, 14, 38, 42, 8, GLASS[1]),
  pill(167, 14, 3, 42, SNOW),
  pill(150, 33, 38, 3, SNOW),
  centred("sun", 159, 25, 20),
  pill(154, 42, 6, 11, GLASS[0]),

  // The counter: a top edge, the front, and a few grain marks
  rect(0, 84, SCENE_W, 12, 0, COFFEE[0]),
  rect(0, 96, SCENE_W, 24, 0, COFFEE[1]),
  pill(14, 104, 30, 4, COFFEE[2]),
  pill(74, 110, 22, 4, COFFEE[2]),
  pill(124, 103, 34, 4, COFFEE[2]),
  pill(168, 111, 16, 4, COFFEE[2]),

  // A small apple at the left
  centred("apple", 18, 70, 26),

  // A bunch of three bananas, resting on the counter
  art("banana", 12, 32, 60, -6),
  art("banana", 27, 33, 60, 3),
  art("banana", 42, 36, 56, 12),

  // The Geiger counter: a handle, a body, a round dial with a needle, two buttons, a cable and a probe
  line("M110 53V47Q126 40 142 47V53", EEL[2], 4.2),
  rect(112, 52, 36, 34, 10, EEL[2]),
  rect(108, 50, 36, 34, 10, EEL[1]),
  circle(126, 65, 11, SNOW),
  circle(126, 65, 8.5, ANCHOVY[0]),
  line("M126 68L132 58", RED[1], 2.8),
  circle(126, 68, 2.6, EEL[1]),
  circle(117, 78, 2.6, BEE[1]),
  circle(126, 78, 2.6, LEAF[1]),
  pill(115, 55, 4, 8, SNOW, 0.7),
  line("M144 70Q164 66 166 80", EEL[1], 3.2),
  rect(160, 79, 14, 6, 3, EEL[0]),

  // Tiny sparks: a little natural radioactivity, and a click from the counter
  sparkle(80, 14, 6, BEE[1]),
  sparkle(62, 38, 4.5, BEE[0]),
  sparkle(12, 36, 4.5, SNOW),
  line("M99 64Q94 70 99 76", BEE[2], 3),
  line("M93 60Q85 70 93 80", BEE[2], 3),
];

// ── scene: three kinds of carbon (blog-three-kinds-of-carbon) ────────────────────────────────────
const carbonScene = (): BlogShape[] => {
  const cards = [
    { x: 17, n: 6, accent: LEAF },
    { x: 75, n: 7, accent: SEA },
    { x: 133, n: 8, accent: FOX },
  ];
  const out: BlogShape[] = [
    rect(0, 0, SCENE_W, SCENE_H, 0, ANCHOVY[0]),
    circle(100, 60, 58, ANCHOVY[1]),
    sparkle(8, 12, 5, SNOW),
    sparkle(192, 108, 5, SNOW),
    sparkle(190, 12, 4, SNOW),
  ];
  for (const c of cards) {
    const mid = c.x + 25;
    out.push(
      rect(c.x + 2, 21, 50, 84, 14, ANCHOVY[2]),
      rect(c.x, 18, 50, 84, 14, c.accent[1]),
      rect(c.x, 28, 50, 74, 14, SNOW),
      line(ring(mid, 56, 20), c.accent[0], 3),
      ...cluster(mid, 56, 3.2, mix(6, c.n)),
      ...ball(...on(mid, 56, 20, 40), 3.4, BEE),
      ...ball(...on(mid, 56, 20, 220), 3.4, BEE),
    );
    // Six red dots (protons) over a row of blue ones (neutrons): the count is the difference
    for (let i = 0; i < 6; i++) out.push(circle(mid - 13.75 + i * 5.5, 86, 2.1, RED[1]));
    for (let i = 0; i < c.n; i++) out.push(circle(mid - ((c.n - 1) * 5.5) / 2 + i * 5.5, 94, 2.1, SEA[1]));
  }
  // Only carbon-14 is unstable: two sparks leave it
  out.push(sparkle(184, 20, 6, BEE[1]), sparkle(192, 40, 4, BEE[1]));
  return out;
};

// ── scene: exposed is not contaminated (cover id "hand") ───────────────────────
const exposureScene = (): BlogShape[] => {
  const dots: BlogShape[] = [];
  for (const [x, y] of [[138, 52], [153, 46], [160, 62], [146, 70], [170, 56]]) dots.push(circle(x, y, 3.2, RED[1]), circle(x - 1, y - 1, 1.2, RED[0]));
  return [
    rect(0, 0, SCENE_W, SCENE_H, 0, ANCHOVY[0]),
    circle(100, 60, 58, ANCHOVY[1]),
    sparkle(100, 14, 5, SNOW),
    sparkle(100, 106, 4.5, SNOW),
    sparkle(10, 8, 4, SNOW),
    sparkle(190, 112, 4, SNOW),

    // Left: outside the radiation's path or in it. A source, three lines, a hand
    rect(8, 14, 88, 92, 16, ANCHOVY[2]),
    rect(6, 12, 88, 92, 16, SNOW),
    circle(26, 38, 17, GLASS[1]),
    centred("radiation", 26, 38, 26),
    line("M44 30L66 34", BEE[1], 3),
    line("M45 40L68 46", BEE[1], 3),
    line("M44 50L66 58", BEE[1], 3),
    centred("hand", 66, 76, 38),
    pill(18, 92, 60, 4, GLASS[1]),

    // Right: material on the skin, and water taking it off
    rect(106, 14, 88, 92, 16, ANCHOVY[2]),
    rect(104, 12, 88, 92, 16, SNOW),
    centred("hand", 150, 62, 54),
    ...dots,
    centred("water", 176, 28, 22),
    line("M170 40Q166 48 170 54", GLASS[2], 3),
    pill(116, 92, 60, 4, GLASS[1]),
  ];
};

// ── scene: a counter always finds a little (cover id "rock") ─────────────────────
const backgroundScene = (): BlogShape[] => [
  rect(0, 0, SCENE_W, SCENE_H, 0, GLASS[0]),
  circle(172, 22, 40, GLASS[1]),
  centred("sun", 170, 24, 24),

  // The ground, with a few of the things the natural radiation comes from
  rect(0, 84, SCENE_W, 36, 0, LEAF[1]),
  rect(0, 100, SCENE_W, 20, 0, LEAF[2]),
  pill(14, 108, 30, 4, LEAF[1]),
  pill(120, 110, 36, 4, LEAF[1]),
  centred("rock", 24, 72, 34),
  centred("grass", 160, 74, 28),
  centred("water", 190, 76, 18),

  // The counter, with a probe lying on the ground
  line("M108 56V50Q124 43 140 50V56", EEL[2], 4.2),
  rect(100, 55, 38, 34, 10, EEL[2]),
  rect(96, 53, 38, 34, 10, EEL[1]),
  circle(115, 68, 11, SNOW),
  circle(115, 68, 8.5, ANCHOVY[0]),
  line("M115 71L120 62", RED[1], 2.8),
  circle(115, 71, 2.6, EEL[1]),
  circle(106, 81, 2.6, BEE[1]),
  circle(115, 81, 2.6, LEAF[1]),
  pill(104, 58, 4, 8, SNOW, 0.7),
  line("M134 74Q150 72 154 84", EEL[1], 3.2),

  // Only a few counts: small sparks, not many
  sparkle(70, 40, 6, BEE[1]),
  sparkle(52, 56, 4.5, BEE[0]),
  sparkle(84, 22, 4.5, SNOW),
  line("M88 66Q83 72 88 78", EEL[1], 3),
  line("M82 62Q76 70 82 80", EEL[1], 3),

  // A few clouds and tufts to fill the sky and the lawn
  pill(18, 18, 34, 10, SNOW, 0.8),
  pill(30, 12, 22, 10, SNOW, 0.8),
  pill(60, 98, 4, 10, LEAF[0]),
  pill(66, 98, 4, 14, LEAF[0]),
  pill(150, 100, 4, 10, LEAF[0]),
  pill(156, 100, 4, 14, LEAF[0]),
  sparkle(130, 30, 4, SNOW),
];

// ── scene: the dose you already get (cover id "dial") ─────────────────────────────
const doseDialScene = (): BlogShape[] => [
  rect(0, 0, SCENE_W, SCENE_H, 0, LEAF[0]),
  circle(100, 70, 64, LEAF[1]),
  ...plate(100, 62, 52),
  // The dial: a low zone, a middle one and a high one, the needle resting in the low one
  line("M56 78A44 44 0 0 1 80 40", LEAF[1], 9),
  line("M84 38A44 44 0 0 1 116 38", BEE[1], 9),
  line("M120 40A44 44 0 0 1 144 78", RED[1], 9),
  line("M100 78L76 52", EEL[2], 4.4),
  circle(100, 78, 7, EEL[1]),
  circle(99, 77, 2.6, SNOW),
  pill(54, 90, 92, 5, ANCHOVY[1]),
  // Ticks along the dial
  line("M60 66L65 68", EEL[1], 2.6),
  line("M72 50L76 54", EEL[1], 2.6),
  line("M100 34V40", EEL[1], 2.6),
  line("M128 50L124 54", EEL[1], 2.6),
  line("M140 66L135 68", EEL[1], 2.6),
  // The everyday sources round it: sun, rock, grass and water
  rect(0, 104, SCENE_W, 16, 0, LEAF[2]),
  centred("sun", 24, 54, 26),
  centred("rock", 176, 58, 28),
  centred("grass", 24, 96, 24),
  centred("water", 176, 96, 20),
  pill(8, 20, 30, 9, SNOW, 0.8),
  pill(158, 14, 28, 9, SNOW, 0.8),
  pill(70, 108, 4, 8, LEAF[0]),
  pill(76, 108, 4, 11, LEAF[0]),
  pill(120, 108, 4, 8, LEAF[0]),
  sparkle(24, 24, 6, SNOW),
  sparkle(178, 30, 5, SNOW),
  sparkle(170, 100, 4, SNOW),
  sparkle(30, 98, 4.5, SNOW),
];

// ── scene: reading a scary number (cover id "headline") ────────────────────────────
const headlineScene = (): BlogShape[] => [
  rect(0, 0, SCENE_W, SCENE_H, 0, ANCHOVY[0]),
  circle(100, 62, 58, ANCHOVY[1]),
  // A page with a big title and lines of text
  rect(28, 14, 112, 94, 12, ANCHOVY[2]),
  rect(26, 12, 112, 94, 12, SNOW),
  pill(38, 24, 68, 10, RED[1]),
  pill(38, 42, 90, 5, ANCHOVY[1]),
  pill(38, 53, 80, 5, ANCHOVY[1]),
  pill(38, 64, 88, 5, ANCHOVY[1]),
  pill(38, 75, 56, 5, ANCHOVY[1]),
  pill(38, 86, 70, 5, ANCHOVY[1]),
  pill(38, 97, 40, 5, ANCHOVY[1]),
  rect(104, 22, 24, 18, 4, GLASS[1]),
  centred("radiation", 116, 31, 14),
  // Round the page
  pill(150, 14, 34, 9, SNOW, 0.8),
  pill(8, 54, 12, 5, ANCHOVY[2]),
  pill(8, 64, 8, 5, ANCHOVY[2]),
  pill(8, 74, 12, 5, ANCHOVY[2]),
  circle(172, 36, 4, BEE[1]),
  circle(14, 30, 3, GLASS[1]),
  pill(46, 108, 4, 8, LEAF[1]),
  pill(150, 108, 4, 8, LEAF[1]),
  sparkle(64, 112, 4, SNOW),
  sparkle(120, 8, 4, SNOW),
  // A lens over the number, with the calm green of a right answer
  circle(138, 76, 26, GLASS[1], 0.55),
  line(`${ring(138, 76, 22)}`, EEL[1], 5),
  line("M155 94L172 111", EEL[1], 7),
  circle(138, 76, 7, LEAF[1]),
  sparkle(176, 28, 5.5, SNOW),
  sparkle(14, 100, 4.5, SNOW),
  sparkle(186, 70, 4, SNOW),
];

export interface BlogScene {
  shapes: BlogShape[];
  /** The middle of the part kept when a square crop is taken (a card's small cover), in scene units. */
  focusX: number;
  /** What the picture shows, for a screen reader and the contact sheet. */
  name: string;
}

export const BLOG_SCENES = {
  atom: { shapes: atomScene(), focusX: 130, name: "a hand, a cell and a virus, each smaller than the one before, leading to a large atom" },
  radiation: { shapes: radiationScene(), focusX: 100, name: "the radiation sign between a single die and a crowd of nuclei" },
  banana: { shapes: bananaScene(), focusX: 85, name: "a bunch of bananas and a Geiger counter on a kitchen counter" },
  hand: { shapes: exposureScene(), focusX: 100, name: "a hand in the path of radiation on the left, and a hand with specks being rinsed on the right" },
  rock: { shapes: backgroundScene(), focusX: 115, name: "a radiation counter standing among a rock, grass and water under the sun" },
  dial: { shapes: doseDialScene(), focusX: 100, name: "a dial with a green, a yellow and a red zone and its needle resting in the green" },
  headline: { shapes: headlineScene(), focusX: 100, name: "a page with a headline and a magnifying lens held over a number" },
  diamond: { shapes: carbonScene(), focusX: 100, name: "three carbon atoms with six, seven and eight neutrons" },
} satisfies Record<string, BlogScene>;

export type BlogSceneId = keyof typeof BLOG_SCENES;
export const BLOG_SCENE_IDS = Object.keys(BLOG_SCENES) as BlogSceneId[];

export function isBlogSceneId(id: unknown): id is BlogSceneId {
  return typeof id === "string" && Object.prototype.hasOwnProperty.call(BLOG_SCENES, id);
}

/**
 * The part of the scene to draw in a box of the given width over height: all of it when the box is
 * about as wide as the scene (a little off the top and bottom when it is wider), and a window of
 * the scene's full height around `focusX` when it is narrower (a square card).
 */
export function viewBoxFor(aspect: number, focusX: number): { x: number; y: number; w: number; h: number } {
  const a = Number.isFinite(aspect) && aspect > 0 ? aspect : SCENE_W / SCENE_H;
  if (a >= SCENE_W / SCENE_H) {
    const h = SCENE_W / a;
    return { x: 0, y: (SCENE_H - h) / 2, w: SCENE_W, h };
  }
  const w = SCENE_H * a;
  return { x: Math.min(Math.max(focusX - w / 2, 0), SCENE_W - w), y: 0, w, h: SCENE_H };
}
