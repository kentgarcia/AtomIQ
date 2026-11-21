/**
 * Shrodi, AtomIQ's fox scientist, drawn as data.
 *
 * Pure and framework-free (no imports beyond the motion core, erasable syntax) so the
 * same drawing runs in the app (`Shrodi.tsx`), under `node --test`, and in the offline
 * renderer (`scripts/render-shrodi.mjs`) that produces contact sheets to look at.
 *
 * Flat rounded shapes, no outlines and no gradients (SVG gradients rendered black on device).
 * Brand identity comes from the old mascot art: orange fox,
 * round dark glasses, white muzzle, pale-blue lab coat. Proportions follow
 * assets/images/mascot/discover.svg: a big bun head, tall curved ears, big oval pupils.
 *
 * Coordinates: the head is about 100 units wide and centred on (0, 0); y grows down.
 * Moves are channels of a `Frame`, computed by `frameOf(pose, t)` (rossark-motion-skill:
 * a key pose, plus an idle layer that never stops, plus follow-through and accents).
 */

import { track, wave } from "../motion/motion-core.ts";
import { EAR_INNER_L, EAR_INNER_R, EAR_OUTER_L, EAR_OUTER_R, EAR_PIVOT_R, EYE_BOX_L, EYE_BOX_R, EYE_WHITE_L, EYE_WHITE_R, HEAD_BASE, HEAD_INNER } from "./shrodi-shapes.ts";

/* ------------------------------------------------------------------ */
/* Palette: invariant character colours (registered in the theme       */
/* exception register, EX-10). The same flat Duolingo-guide colours    */
/* the NPC teachers wear (`components/npc/npc-palette.ts`): Fox for    */
/* the fur and the back of the ears and the tail, Cheetah for the tail tip,        */
/* Flamingo inside the ears, Iguana and Blue Jay for the lab coat and  */
/* the face colours of the guide. Flat #RRGGBB, no gradients.          */
/* ------------------------------------------------------------------ */

export const SHRODI_COLORS = {
  fur: "#FF9600", // Fox
  furShade: "#FF9600", // the back of the ears and the base of the tail: the same Fox as the fur
  tailTip: "#FFCE8E", // Cheetah
  muzzle: "#FFFFFF",
  earInner: "#FFB2B2", // Flamingo
  coat: "#DDF4FF", // Iguana
  coatLight: "#F2FBFF",
  coatShade: "#B8E4FA",
  coatDetail: "#84D8FF", // Blue Jay
  ink: "#3C3C3C", // the guide's pupil
  nose: "#B03A3A", // the guide's mouth
  mouth: "#B03A3A",
  tongue: "#F15A5A", // the guide's tongue
  shine: "#FFFFFF",
} as const;

const C = SHRODI_COLORS;

/* ------------------------------------------------------------------ */
/* Poses                                                               */
/* ------------------------------------------------------------------ */

export type Mood = "idle" | "wave" | "happy" | "cheer" | "think" | "oops" | "wow" | "smile";
export const MOODS: readonly Mood[] = ["idle", "wave", "happy", "cheer", "think", "oops", "wow", "smile"];

/** The resting values of a mood. All numbers, so poses blend by `withTiming`. */
// A type alias, not an interface: Reanimated animates plain objects of numbers, which need an implicit index signature.
export type Pose = {
  /** Whole-body offset in units (negative is up). */
  lift: number;
  /** Hop amplitude 0..1 (cheering). */
  hop: number;
  lean: number;
  tilt: number;
  /** Arm: a = shoulder angle out from hanging (deg), e = elbow bend (deg). */
  armLa: number;
  armLe: number;
  armRa: number;
  armRe: number;
  /** Amplitude of a hand wave on the right forearm, 0..1. */
  waveAmp: number;
  /** Resting gaze, -1..1. */
  lookX: number;
  lookY: number;
  /** Resting upper lid, 0 open .. 1 closed. */
  lid: number;
  /** Mouth open depth, 0..1. */
  mouth: number;
  /** Mouth width, 1 is the resting width: about 0.45 is a small round "o", above 1 a broad grin. */
  mouthW: number;
  /** Mouth corners, -1 (a frown) .. 0 (flat) .. 1 (a broad smile). */
  mouthCurve: number;
  earL: number;
  earR: number;
  tail: number;
};

export const POSES: Record<Mood, Pose> = {
  idle: { lift: 0, hop: 0, lean: 0, tilt: 0, armLa: 12, armLe: 8, armRa: 14, armRe: 10, waveAmp: 0, lookX: 0, lookY: 0, lid: 0, mouth: 0.55, mouthW: 1, mouthCurve: 0.35, earL: 0, earR: 0, tail: 0 },
  wave: { lift: 0, hop: 0, lean: -2, tilt: -3, armLa: 14, armLe: 6, armRa: 62, armRe: 112, waveAmp: 1, lookX: 0.2, lookY: -0.1, lid: 0, mouth: 0.65, mouthW: 1.05, mouthCurve: 0.6, earL: 3, earR: -2, tail: 6 },
  happy: { lift: 0, hop: 0, lean: 0, tilt: 3, armLa: 52, armLe: 70, armRa: 58, armRe: 62, waveAmp: 0, lookX: 0, lookY: -0.05, lid: 0, mouth: 0.75, mouthW: 1.08, mouthCurve: 0.8, earL: 2, earR: 2, tail: 8 },
  cheer: { lift: -2, hop: 1, lean: 0, tilt: 0, armLa: 150, armLe: 8, armRa: 146, armRe: 4, waveAmp: 0, lookX: 0, lookY: 0, lid: 0, mouth: 1, mouthW: 1.12, mouthCurve: 1, earL: 5, earR: 4, tail: 12 },
  think: { lift: 0, hop: 0, lean: 3, tilt: 7, armLa: -80, armLe: -76, armRa: 10, armRe: 24, waveAmp: 0, lookX: 0.8, lookY: -0.7, lid: 0.08, mouth: 0.05, mouthW: 0.62, mouthCurve: -0.15, earL: -3, earR: 4, tail: -4 },
  oops: { lift: 1, hop: 0, lean: 0, tilt: -4, armLa: 14, armLe: 20, armRa: 16, armRe: 26, waveAmp: 0, lookX: -0.2, lookY: 0.35, lid: 0.28, mouth: 0.12, mouthW: 0.85, mouthCurve: -0.85, earL: -9, earR: 9, tail: -10 },
  /** Surprised: a small round "o", eyes up, ears and arms lifted. */
  wow: { lift: -1, hop: 0, lean: -1, tilt: 0, armLa: 50, armLe: 30, armRa: 50, armRe: 30, waveAmp: 0, lookX: 0, lookY: -0.3, lid: 0, mouth: 0.7, mouthW: 0.45, mouthCurve: 0, earL: 6, earR: 6, tail: 6 },
  /** Calm and pleased: a closed, gentle smile, eyes a touch soft. */
  smile: { lift: 0, hop: 0, lean: 0, tilt: 2, armLa: 12, armLe: 8, armRa: 14, armRe: 10, waveAmp: 0, lookX: 0.1, lookY: 0, lid: 0.1, mouth: 0, mouthW: 1.06, mouthCurve: 1, earL: 1, earR: 1, tail: 3 },
};

/* ------------------------------------------------------------------ */
/* Frame: every moving channel at one moment                           */
/* ------------------------------------------------------------------ */

export interface Frame {
  bob: number;
  lean: number;
  tilt: number;
  tail: number;
  earL: number;
  earR: number;
  armLa: number;
  armLe: number;
  armRa: number;
  armRe: number;
  pupilX: number;
  pupilY: number;
  /** The upper lids: only the resting droop of a mood (oops, think). A blink does not use them. */
  lidL: number;
  lidR: number;
  /** A blink, 0 open .. 1 shut: only the black pupil closes (squashes flat), the glasses and the white stay. */
  blink: number;
  mouth: number;
  mouthW: number;
  mouthCurve: number;
}

/** One idle loop. Every idle period divides it, so it closes without a jump. */
export const SHRODI_LOOP_MS = 9000;

const BLINK = [
  [0, 0],
  [2600, 0],
  [2710, 1],
  [2750, 1],
  [2940, 0, "out"],
  [5800, 0],
  [5910, 1],
  [5950, 1],
  [6140, 0, "out"],
  [6900, 0],
  [7010, 1],
  [7050, 1],
  [7240, 0, "out"],
  [9000, 0],
] as const;

/** A glance: toward something, hold, back. 0..1 and -1..0 for the other side. */
const GLANCE_X = [
  [0, 0],
  [1600, 0],
  [2100, 0.9],
  [3400, 0.9],
  [3900, 0],
  [6200, 0],
  [6700, -0.6],
  [7600, -0.6],
  [8100, 0],
  [9000, 0],
] as const;

const GLANCE_Y = [
  [0, 0],
  [1600, 0],
  [2100, -0.3],
  [3400, -0.3],
  [3900, 0],
  [9000, 0],
] as const;

/**
 * The mouth's own idle (0..1 each, always back to 0 at the loop's ends): it widens into a smile, presses
 * into a small "hm", and rounds into a quiet "oh", at different moments from the blinks and glances so
 * the face is never doing two things at once. Breathing (below) moves it a little between them.
 */
const MOUTH_SMILE = [
  [0, 0],
  [1500, 0],
  [1900, 1, "out"],
  [2700, 1],
  [3200, 0],
  [9000, 0],
] as const;

const MOUTH_HM = [
  [0, 0],
  [4600, 0],
  [4850, 1, "out"],
  [5300, 1],
  [5650, 0],
  [9000, 0],
] as const;

const MOUTH_OH = [
  [0, 0],
  [7700, 0],
  [7900, 1, "out"],
  [8250, 1],
  [8600, 0],
  [9000, 0],
] as const;

const EAR_TWITCH_L = [
  [0, 0],
  [4200, 0],
  [4310, -9],
  [4440, 0],
  [9000, 0],
] as const;

const EAR_TWITCH_R = [
  [0, 0],
  [7300, 0],
  [7410, 8],
  [7540, 0],
  [9000, 0],
] as const;

const PUPIL_TRAVEL = 5;
/** The pupil (an 8.5 x 11 oval) stays inside the eye white (r 19): it never reaches the rim. */
const PUPIL_MAX = 6;

export function frameOf(p: Pose, t: number): Frame {
  "worklet";
  const blink = track(t, BLINK);
  // Mouth: breathing, then the three small expressions on top. A mood with its mouth already wide open (cheer) keeps them small.
  const calm = 1 - 0.6 * p.mouth;
  const smile = track(t, MOUTH_SMILE) * calm;
  const hm = track(t, MOUTH_HM) * calm;
  const oh = track(t, MOUTH_OH) * calm;
  const hop = p.hop * Math.abs(Math.sin((t / 600) * Math.PI));
  let gx = (p.lookX + track(t, GLANCE_X) * 0.55) * PUPIL_TRAVEL;
  let gy = (p.lookY + track(t, GLANCE_Y) * 0.55) * PUPIL_TRAVEL;
  const reach = Math.sqrt(gx * gx + gy * gy);
  if (reach > PUPIL_MAX) {
    gx = (gx * PUPIL_MAX) / reach;
    gy = (gy * PUPIL_MAX) / reach;
  }
  return {
    // Breathing 1.2 units over 3 s, hop on top when cheering.
    bob: p.lift + 1.2 * wave(t, 3000) - hop * 9,
    lean: p.lean + 0.8 * wave(t, 4500, 0.3),
    tilt: p.tilt + 1.6 * wave(t, 4500),
    tail: p.tail + 7 * wave(t, 2250) + 3 * wave(t, 1500, 0.3),
    earL: p.earL + 2 * wave(t, 4500, 0.1) + track(t, EAR_TWITCH_L),
    earR: p.earR + 2 * wave(t, 4500, 0.6) + track(t, EAR_TWITCH_R),
    armLa: p.armLa + 3 * wave(t, 3000, 0.1) + 2 * wave(t, 1800, 0.4),
    armLe: p.armLe + 4 * wave(t, 2250, 0.7),
    armRa: p.armRa + 3 * wave(t, 3000, 0.55) + 2 * wave(t, 1800, 0.9),
    // The right forearm carries the wave accent; the follow-through is the elbow's own idle.
    armRe: p.armRe + 4 * wave(t, 2250, 0.2) + p.waveAmp * 13 * wave(t, 750),
    pupilX: gx,
    pupilY: gy,
    lidL: p.lid,
    lidR: p.lid,
    blink,
    mouth: Math.min(1, Math.max(0, p.mouth + 0.035 * wave(t, 3000) + 0.22 * smile - 0.8 * hm + 0.2 * oh)),
    mouthW: Math.min(1.3, Math.max(0.4, p.mouthW + 0.14 * smile - 0.12 * hm - 0.3 * oh)),
    mouthCurve: Math.min(1, Math.max(-1, p.mouthCurve + 0.45 * smile + 0.3 * hm - 0.25 * oh)),
  };
}

/* ------------------------------------------------------------------ */
/* The drawing: three layers of nodes                                  */
/* ------------------------------------------------------------------ */
/*
 * Nothing in the SVG is ever transformed per frame (an animated `transform` on an SVG
 * group crashes some Android builds: "String cannot be cast to ReadableArray"). Moving
 * parts are plain geometry recomputed by worklets (points, paths, line ends, circles).
 * The three whole-layer moves are ordinary native view transforms done by the renderer:
 *   - the wrapper (all layers) bobs and leans about the feet,
 *   - the head layer tilts about the neck,
 * and the layers stack back, head, front (the arms come last so a hand can reach the face).
 */

export type Attrs = Record<string, string | number>;
export type Dynamic = (f: Frame) => Attrs;

export interface Node {
  tag: "g" | "path" | "circle" | "ellipse" | "rect" | "line" | "polygon" | "clipPath" | "defs";
  /** Static attributes. */
  a?: Attrs;
  /** Attributes recomputed every frame. */
  dyn?: Dynamic;
  id?: string;
  ch?: Node[];
}

export interface Layers {
  back: Node[];
  head: Node[];
  front: Node[];
}

/**
 * The head is drawn this much larger than its natural size, about the neck, so the character
 * is top-heavy and cute (a big head on a small body). A plain uniform scale of the head layer.
 */
export const HEAD_SCALE = 1.25;

/** Pivots of the two whole-layer moves, in art units. */
export const SHRODI_PIVOTS = { lean: { x: 0, y: 115 }, tilt: { x: 0, y: 44 } } as const;

const n = (tag: Node["tag"], a: Attrs | undefined, ch?: Node[], extra?: Partial<Node>): Node => ({ tag, a, ch, ...extra });
const path = (d: string, fill: string, extra: Attrs = {}) => n("path", { d, fill, ...extra });
const circle = (cx: number, cy: number, r: number, fill: string, extra: Attrs = {}) => n("circle", { cx, cy, r, fill, ...extra });

/** Rotate a point about a pivot. Clockwise for positive degrees (as SVG). */
export function turn(x: number, y: number, px: number, py: number, deg: number): { x: number; y: number } {
  "worklet";
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = x - px;
  const dy = y - py;
  return { x: px + dx * c - dy * s, y: py + dx * s + dy * c };
}

/** A flat list [x0, y0, x1, y1, ...] rotated about a pivot, as the numbers of an SVG points list. */
function turned(pts: readonly number[], px: number, py: number, deg: number): number[] {
  "worklet";
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const q = turn(pts[i], pts[i + 1], px, py, deg);
    out.push(Math.round(q.x * 100) / 100, Math.round(q.y * 100) / 100);
  }
  return out;
}

/** Arm geometry (short chibi arms). `side` -1 is the viewer's left arm. Angles in degrees: `a` out from hanging, `e` the elbow bend. */
export const ARM = { upper: 15, fore: 13, hand: 15, shoulderX: 27, shoulderY: 56 } as const;

export function armPoints(side: -1 | 1, a: number, e: number) {
  "worklet";
  // SVG rotates clockwise for positive angles, which swings a hanging arm to the LEFT:
  // outward for the left arm, inward for the right. So the right arm takes the negative.
  const t1 = (-side * a * Math.PI) / 180;
  const t2 = (-side * (a + e) * Math.PI) / 180;
  const sx = side * 27;
  const sy = 56;
  const ex = sx - 15 * Math.sin(t1);
  const ey = sy + 15 * Math.cos(t1);
  return {
    sx,
    sy,
    ex,
    ey,
    wx: ex - 13 * Math.sin(t2),
    wy: ey + 13 * Math.cos(t2),
    hx: ex - 15 * Math.sin(t2),
    hy: ey + 15 * Math.cos(t2),
  };
}

/** A path from baked cubic data: [x0, y0, (c1x, c1y, c2x, c2y, x, y)...]. */
const cubicPath = (q: readonly number[]) => {
  "worklet";
  let d = `M${q[0]} ${q[1]}`;
  for (let i = 2; i < q.length; i += 6) d += ` C${q[i]} ${q[i + 1]} ${q[i + 2]} ${q[i + 3]} ${q[i + 4]} ${q[i + 5]}`;
  return `${d} Z`;
};

/**
 * Eyes. The white of the eye is part of the head's inner base (`HEAD_INNER`); the black pupil
 * is the only eye. The glasses are rings over it. Pupil and lid are clipped to the eye white; nothing ever covers the pupil with white.
 */
function eye(side: -1 | 1, id: string): Node[] {
  const box = side === -1 ? EYE_BOX_L : EYE_BOX_R;
  const white = side === -1 ? EYE_WHITE_L : EYE_WHITE_R;
  const clip = `${id}-clip-${side}`;
  const top = box.cy - box.h / 2 - 2;
  const lidH = box.h + 4;
  return [
    n("defs", undefined, [n("clipPath", undefined, [path(cubicPath(white), "#000")], { id: clip })]),
    n("g", { clipPath: `url(#${clip})` }, [
      // Big oval pupil and its shine slide with the gaze, never swap. A blink closes ONLY the pupil: it
      // squashes flat (wider as it flattens, so it keeps its weight) while the white of the eye and the
      // glasses stay exactly as they are; the shine goes out as it shuts.
      n("ellipse", { rx: 8, ry: 10.4, fill: C.ink, cx: box.cx, cy: box.cy }, undefined, {
        dyn: (f) => {
          "worklet";
          return { cx: box.cx + f.pupilX, cy: box.cy + f.pupilY + 1, rx: 8 + 1.6 * f.blink, ry: Math.max(1.1, 10.4 * (1 - f.blink)) };
        },
      }),
      n("circle", { r: 3.2, fill: C.shine, cx: box.cx, cy: box.cy }, undefined, {
        dyn: (f) => {
          "worklet";
          return { cx: box.cx + f.pupilX + 2.6, cy: box.cy + f.pupilY - 3.2, opacity: Math.min(1, Math.max(0, 1 - f.blink * 1.6)) };
        },
      }),
      // Upper lid: fur sliding down, only for the droop of "oops" and "think" (a mood's resting lid). Not the blink.
      n("rect", { x: box.cx - box.w, width: box.w * 2, fill: C.fur, y: top, height: 0 }, undefined, {
        dyn: (f) => {
          "worklet";
          return { y: top, height: (side === -1 ? f.lidL : f.lidR) * lidH };
        },
      }),
    ]),
    // A fully closed eye gets its closing line, never an empty lens.
    n("path", { d: `M${box.cx - 8} ${box.cy + 3} Q${box.cx} ${box.cy + 10} ${box.cx + 8} ${box.cy + 3}`, stroke: C.ink, strokeWidth: 3.2, strokeLinecap: "round", fill: "none", opacity: 0 }, undefined, {
      dyn: (f) => {
        "worklet";
        return { opacity: Math.min(1, Math.max(0, ((side === -1 ? f.lidL : f.lidR) - 0.85) / 0.15)) };
      },
    }),
    // The glasses go over everything so the lids never leak past the rim.
    circle(box.cx, box.cy, GLASS_R, "none", { stroke: C.ink, strokeWidth: 3.6 }),
  ];
}

const GLASS_R = 17.2;
/** Top edge of the mouth (the D opens downward from here). */
const MOUTH_Y = 19.5;

/** The ear as drawn in the layer art, tilting about its base; a round-joined stroke in its own colour softens the tip. */
function ear(side: -1 | 1, which: "outer" | "inner"): Node {
  const base = side === -1 ? (which === "outer" ? EAR_OUTER_L : EAR_INNER_L) : which === "outer" ? EAR_OUTER_R : EAR_INNER_R;
  // Pivot: the middle of the ear's hidden base edge (inside the head).
  const px = side * EAR_PIVOT_R.x;
  const py = EAR_PIVOT_R.y;
  const fill = which === "outer" ? C.furShade : C.earInner;
  return n("path", { d: cubicPath(base), fill, stroke: fill, strokeWidth: 2, strokeLinejoin: "round" }, undefined, {
    dyn: (f) => {
      "worklet";
      return { d: cubicPath(turned(base, px, py, side === -1 ? f.earL : f.earR)) };
    },
  });
}

/**
 * How far an arm is raised, 0 (resting at the side) to 1 (clearly lifted). A resting arm is drawn
 * behind the coat so it never looks stiff; a lifted one is drawn in front (it reaches the face,
 * waves, cheers). The two copies cross-fade on this value, so it is smooth as an arm lifts.
 */
export function lift(angle: number): number {
  "worklet";
  return Math.min(1, Math.max(0, (Math.abs(angle) - 28) / 16));
}

/** One arm, drawn twice: behind the coat (visible when resting) and in front (visible when lifted). */
function arm(side: -1 | 1, layer: "behind" | "front"): Node[] {
  const pts = (f: Frame) => {
    "worklet";
    return armPoints(side, side === -1 ? f.armLa : f.armRa, side === -1 ? f.armLe : f.armRe);
  };
  const shown = (f: Frame) => {
    "worklet";
    const up = lift(side === -1 ? f.armLa : f.armRa);
    return layer === "front" ? up : 1 - up;
  };
  const rest = armPoints(side, 12, 8);
  const initial = layer === "front" ? 0 : 1;
  return [
    n("line", { x1: rest.sx, y1: rest.sy, x2: rest.ex, y2: rest.ey, stroke: C.coat, strokeWidth: 14, strokeLinecap: "round", opacity: initial }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = pts(f);
        return { x1: q.sx, y1: q.sy, x2: q.ex, y2: q.ey, opacity: shown(f) };
      },
    }),
    n("line", { x1: rest.ex, y1: rest.ey, x2: rest.wx, y2: rest.wy, stroke: C.coat, strokeWidth: 14, strokeLinecap: "round", opacity: initial }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = pts(f);
        return { x1: q.ex, y1: q.ey, x2: q.wx, y2: q.wy, opacity: shown(f) };
      },
    }),
    n("circle", { cx: rest.hx, cy: rest.hy, r: 9.5, fill: C.fur, opacity: initial }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = pts(f);
        return { cx: q.hx, cy: q.hy, opacity: shown(f) };
      },
    }),
  ];
}

// A tail curling up behind the body on the right, with a lighter tip. Drawn at TAIL_SCALE of
// its layer-art size about its root so it stays small next to the big head.
const TAIL_ROOT = { x: 14, y: 96 } as const;
const TAIL_SCALE = 0.68;
const shrinkTail = (pts: readonly number[]) => pts.map((v, i) => Math.round((i % 2 === 0 ? TAIL_ROOT.x + (v - TAIL_ROOT.x) * TAIL_SCALE : TAIL_ROOT.y + (v - TAIL_ROOT.y) * TAIL_SCALE) * 10) / 10);
const TAIL_MAIN = shrinkTail([14, 96, 48, 104, 70, 88, 62, 56]);
const TAIL_TIP = shrinkTail([64, 66, 62, 56]);
const TAIL_W = 14;

/** `arms: false` leaves both arms and paws out (a picture where only the head and coat show, e.g. peeking from behind a label). */
export function buildShrodi(id: string, opts: { arms?: boolean } = {}): Layers {
  const arms = opts.arms !== false;
  const back: Node[] = [
    n("path", { d: `M${TAIL_MAIN[0]} ${TAIL_MAIN[1]} C${TAIL_MAIN[2]} ${TAIL_MAIN[3]} ${TAIL_MAIN[4]} ${TAIL_MAIN[5]} ${TAIL_MAIN[6]} ${TAIL_MAIN[7]}`, stroke: C.furShade, strokeWidth: TAIL_W, strokeLinecap: "round", fill: "none" }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = turned(TAIL_MAIN, TAIL_ROOT.x, TAIL_ROOT.y, f.tail);
        return { d: `M${q[0]} ${q[1]} C${q[2]} ${q[3]} ${q[4]} ${q[5]} ${q[6]} ${q[7]}` };
      },
    }),
    n("path", { d: `M${TAIL_TIP[0]} ${TAIL_TIP[1]} L${TAIL_TIP[2]} ${TAIL_TIP[3]}`, stroke: C.tailTip, strokeWidth: TAIL_W, strokeLinecap: "round", fill: "none" }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = turned(TAIL_TIP, TAIL_ROOT.x, TAIL_ROOT.y, f.tail);
        return { d: `M${q[0]} ${q[1]} L${q[2]} ${q[3]}` };
      },
    }),
    n("ellipse", { cx: -15, cy: 106, rx: 12.5, ry: 8.5, fill: C.fur }),
    n("ellipse", { cx: 15, cy: 106, rx: 12.5, ry: 8.5, fill: C.fur }),
    // resting arms: behind the coat, so only a paw peeks out at the side
    ...(arms ? [...arm(-1, "behind"), ...arm(1, "behind")] : []),
    // short lab coat, chest fur at the collar, then the lapels over it
    path("M-23 40 Q-33 42 -34 56 L-36 96 Q-36 104 -28 104 L28 104 Q36 104 36 96 L34 56 Q33 42 23 40 Z", C.coat),
    path("M-11 42 L11 42 L0 62 Z", C.fur),
    path("M-24 43 L-11 42 L0 62 L-20 58 Z", C.coatLight),
    path("M24 43 L11 42 L0 62 L20 58 Z", C.coatLight),
    n("rect", { x: -28, y: 78, width: 19, height: 15, rx: 5, fill: C.coatShade }),
    n("rect", { x: 9, y: 78, width: 19, height: 15, rx: 5, fill: C.coatShade }),
    circle(0, 72, 2.1, C.coatDetail),
    circle(0, 82, 2.1, C.coatDetail),
    n("rect", { x: 10, y: 62, width: 14, height: 4.5, rx: 2.25, fill: C.coatDetail }),
  ];

  const head: Node[] = [
    ear(-1, "outer"),
    ear(-1, "inner"),
    ear(1, "outer"),
    ear(1, "inner"),
    // The head as drawn in the layer art: base, then the white inner base (muzzle + eye whites).
    path(cubicPath(HEAD_BASE), C.fur),
    path(cubicPath(HEAD_INNER), C.muzzle),
    // The eye whites are part of the inner base: same white, drawn with it.
    path(cubicPath(EYE_WHITE_L), C.muzzle),
    path(cubicPath(EYE_WHITE_R), C.muzzle),
    ...eye(-1, id),
    ...eye(1, id),
    // Glasses bridge between the two rings.
    n("path", { d: `M${EYE_BOX_L.cx + GLASS_R - 1} ${EYE_BOX_L.cy - 1} Q0 ${(EYE_BOX_L.cy + EYE_BOX_R.cy) / 2 - 6} ${EYE_BOX_R.cx - GLASS_R + 1} ${EYE_BOX_R.cy - 1}`, stroke: C.ink, strokeWidth: 3, strokeLinecap: "round", fill: "none" }),
    circle(0, 9, 4, C.nose),
    // mouth: a D that opens with `mouth`, as wide as `mouthW`, its corners lifted into a smile or dropped into a frown by `mouthCurve`.
    // Closing never leaves two lips side by side: as it shuts, the lower lip is drawn onto the upper one until the mouth is ONE
    // curve (the shape has no area left, and the round stroke is the line), like a ")" turned on its side.
    n("path", { d: `M-9 ${MOUTH_Y} Q0 ${MOUTH_Y + 1.5} 9 ${MOUTH_Y} Q0 ${MOUTH_Y + 4} -9 ${MOUTH_Y} Z`, fill: C.mouth, stroke: C.mouth, strokeWidth: 2.8, strokeLinejoin: "round", strokeLinecap: "round" }, undefined, {
      dyn: (f) => {
        "worklet";
        const hw = 11.5 * f.mouthW;
        const corner = MOUTH_Y - 0.5 - 3 * f.mouthCurve;
        const ctrl = MOUTH_Y + 1.5 + 2 * f.mouthCurve;
        // How open: nothing until `mouth` passes 0.12, so the resting closed mouths are a single line
        const h = Math.max(0, (f.mouth - 0.12) / 0.88) * 17;
        const mid = (corner + ctrl) / 2;
        const b = mid + h;
        // The lower lip is two cubic halves from the right corner to the bottom middle and on to the left corner. Shut, they are the
        // top curve cut at its middle (controls 2/3 and 1/3 of the way in), so the two lips are the same line; open, a rounded D.
        const open = Math.min(1, h / 4);
        const c1x = hw * (2 / 3 + (1 / 3) * open);
        const c1y = corner + (ctrl - corner) / 3 + (corner + (b - corner) * 0.75 - (corner + (ctrl - corner) / 3)) * open;
        const c2x = hw * (1 / 3 + (0.52 - 1 / 3) * open);
        const c2y = mid + (b - mid) * open;
        return { d: `M${-hw} ${corner} Q0 ${ctrl} ${hw} ${corner} C${c1x} ${c1y} ${c2x} ${c2y} 0 ${b} C${-c2x} ${c2y} ${-c1x} ${c1y} ${-hw} ${corner} Z`, strokeWidth: 2.8 - 1.4 * open };
      },
    }),
    n("ellipse", { cx: 0, cy: MOUTH_Y + 9, rx: 6.5, ry: 0.1, fill: C.tongue, opacity: 0 }, undefined, {
      dyn: (f) => {
        "worklet";
        const h = Math.max(0, (f.mouth - 0.12) / 0.88) * 17;
        const ry = Math.max(0.1, h * 0.26);
        const corner = MOUTH_Y - 0.5 - 3 * f.mouthCurve;
        const mid = (corner + MOUTH_Y + 1.5 + 2 * f.mouthCurve) / 2;
        return { cy: mid + h - ry - 0.6, rx: 6.5 * Math.min(1, f.mouthW), ry, opacity: Math.min(1, Math.max(0, (f.mouth - 0.4) / 0.2)) };
      },
    }),
  ];

  return { back, head, front: arms ? [...arm(-1, "front"), ...arm(1, "front")] : [] };
}

/** viewBox that frames the whole character with room for the highest hop and the V cheer. */
export const SHRODI_VIEWBOX = { x: -93, y: -122, w: 197, h: 244 } as const;

/* ------------------------------------------------------------------ */
/* Offline renderer: a frame as SVG markup (tests, contact sheets)     */
/* ------------------------------------------------------------------ */

const attrString = (a: Attrs): string =>
  Object.entries(a)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}="${v}"`)
    .join(" ");

function renderNodes(nodes: Node[], f: Frame): string {
  return nodes
    .map((node) => {
      const attrs: Attrs = { ...(node.a ?? {}), ...(node.dyn ? node.dyn(f) : {}) };
      const kids = renderNodes(node.ch ?? [], f);
      const id = node.id ? ` id="${node.id}"` : "";
      return `<${node.tag}${id} ${attrString(attrs)}>${kids}</${node.tag}>`;
    })
    .join("");
}

/** Compose the layers the way the app does: wrapper bob + lean, head tilt, arms in front. */
export function toSvg(layers: Layers, f: Frame): string {
  const { lean, tilt } = SHRODI_PIVOTS;
  return (
    `<g transform="translate(0 ${f.bob.toFixed(3)}) rotate(${f.lean.toFixed(3)} ${lean.x} ${lean.y})">` +
    renderNodes(layers.back, f) +
    `<g transform="translate(${tilt.x} ${tilt.y}) rotate(${f.tilt.toFixed(3)}) scale(${HEAD_SCALE}) translate(${-tilt.x} ${-tilt.y})">${renderNodes(layers.head, f)}</g>` +
    renderNodes(layers.front, f) +
    `</g>`
  );
}
