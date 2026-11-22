/**
 * Shrodi, AtomIQ's fox scientist, drawn as data.
 *
 * Pure and framework-free (no imports beyond the motion core, erasable syntax) so the
 * same drawing runs in the app (`Shrodi.tsx`), under `node --test`, and in the offline
 * renderer (`scripts/render-shrodi.mjs`) that produces contact sheets to look at.
 *
 * Pure flat shapes, zero outlines on fur/coat, zero gradients (SVG gradients render
 * black on device): vibrant orange fox with deeper-orange back ears & leg stubs, bold
 * round charcoal glasses with a crisp center bridge, transparent lenses showing orange
 * forehead fur (and solid orange fur + thick curved wink/blink arcs when closed), wide
 * periwinkle-blue lab coat with notched lapels & hollow U-pockets, flat-bottomed boots,
 * and a sweeping S-curved fox tail.
 */

import { track, wave } from "../motion/motion-core.ts";
import { EAR_INNER_L, EAR_INNER_R, EAR_OUTER_L, EAR_OUTER_R, EAR_PIVOT_R, EYE_BOX_L, EYE_BOX_R, EYE_WHITE_L, EYE_WHITE_R, HEAD_BASE, HEAD_INNER } from "./shrodi-shapes.ts";

/* ------------------------------------------------------------------ */
/* Palette: invariant character colours (EX-10). Flat #RRGGBB only.    */
/* Core brand/face tokens stay pinned to npc-palette.ts by test-mascot */
/* while coat & accent tones match the periwinkle lab coat reference.  */
/* ------------------------------------------------------------------ */

export const SHRODI_COLORS = {
  fur: "#FF9600", // Fox (head, paws, feet)
  furShade: "#FF9600", // pinned to fur by test-mascot
  furDeep: "#F57207", // deeper flat orange (back ears, leg stubs under coat)
  tailTip: "#FFCE8E", // Cheetah (pinned by test-mascot)
  muzzle: "#FFFFFF",
  earInner: "#FFB2B2", // Flamingo (pinned by test-mascot)
  coat: "#D3E1FB", // soft periwinkle-blue lab coat
  coatLight: "#E2ECFD",
  coatShade: "#BBD0F5",
  coatDetail: "#A5BDE9", // notched lapels, hollow U-pockets, buttons, sleeve seams
  ink: "#3C3C3C", // glasses, pupils, wink/blink arcs (pinned by test-mascot)
  nose: "#B03A3A", // nose & mouth (pinned by test-mascot)
  mouth: "#B03A3A",
  tongue: "#F15A5A", // tongue (pinned by test-mascot)
  shine: "#FFFFFF",
} as const;

const C = SHRODI_COLORS;

/* ------------------------------------------------------------------ */
/* Poses                                                               */
/* ------------------------------------------------------------------ */

export type Mood = "idle" | "wave" | "happy" | "cheer" | "think" | "oops" | "wow" | "smile";
export const MOODS: readonly Mood[] = ["idle", "wave", "happy", "cheer", "think", "oops", "wow", "smile"];

/** The resting values of a mood. All numbers, so poses blend by `withTiming`. */
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
  /** Right-eye playful wink, 0 open .. 1 closed into bold upward arc on orange fur. */
  winkR: number;
  /** 1 = joyful upward crescent blink (`^`), 0 = gentle downward blink. */
  happyBlink: number;
  /** Mouth open depth, 0..1. */
  mouth: number;
  /** Mouth width, 1 is resting: ~0.45 is a small round "o", above 1 a broad grin. */
  mouthW: number;
  /** Mouth corners, -1 (frown) .. 0 (flat) .. 1 (broad smile). */
  mouthCurve: number;
  earL: number;
  earR: number;
  tail: number;
};

export const POSES: Record<Mood, Pose> = {
  idle: { lift: 0, hop: 0, lean: 0, tilt: 0, armLa: 18, armLe: 2, armRa: 18, armRe: 2, waveAmp: 0, lookX: 0, lookY: 0, lid: 0, winkR: 0, happyBlink: 0.85, mouth: 0.64, mouthW: 1.0, mouthCurve: 0.16, earL: 0, earR: 0, tail: 0 },
  wave: { lift: 0, hop: 0, lean: -2, tilt: -3, armLa: 18, armLe: 2, armRa: 90, armRe: 62, waveAmp: 1, lookX: 0.2, lookY: -0.08, lid: 0, winkR: 0, happyBlink: 1, mouth: 0.72, mouthW: 1.04, mouthCurve: 0.3, earL: 3, earR: -2, tail: 5 },
  /** Iconic Shrodi look: both bright eyes open, happy D-smile, cheerful raised paws. */
  happy: { lift: 0, hop: 0, lean: 0, tilt: 2, armLa: 56, armLe: 60, armRa: 64, armRe: 62, waveAmp: 0, lookX: 0.08, lookY: -0.04, lid: 0, winkR: 0, happyBlink: 1, mouth: 0.78, mouthW: 1.04, mouthCurve: 0.22, earL: 2, earR: 2, tail: 4 },
  cheer: { lift: -2, hop: 1, lean: 0, tilt: 0, armLa: 142, armLe: 12, armRa: 142, armRe: 12, waveAmp: 0, lookX: 0, lookY: -0.05, lid: 0, winkR: 0, happyBlink: 1, mouth: 0.94, mouthW: 1.1, mouthCurve: 0.4, earL: 5, earR: 5, tail: 10 },
  think: { lift: 0, hop: 0, lean: 2.5, tilt: 6, armLa: -68, armLe: -64, armRa: 18, armRe: 8, waveAmp: 0, lookX: 0.75, lookY: -0.65, lid: 0.08, winkR: 0, happyBlink: 0, mouth: 0.04, mouthW: 0.56, mouthCurve: -0.1, earL: -3, earR: 4, tail: -4 },
  oops: { lift: 1.5, hop: 0, lean: 0, tilt: -4, armLa: 18, armLe: 12, armRa: 18, armRe: 12, waveAmp: 0, lookX: -0.15, lookY: 0.32, lid: 0.24, winkR: 0, happyBlink: 0, mouth: 0.08, mouthW: 0.76, mouthCurve: -0.82, earL: -9, earR: 9, tail: -9 },
  /** Surprised: small round "o", wide eyes, arms raised high clear of the tail. */
  wow: { lift: -1.5, hop: 0, lean: -1, tilt: 0, armLa: 96, armLe: 44, armRa: 96, armRe: 44, waveAmp: 0, lookX: 0, lookY: -0.22, lid: 0, winkR: 0, happyBlink: 0, mouth: 0.74, mouthW: 0.44, mouthCurve: 0, earL: 6, earR: 6, tail: 5 },
  /** Calm and pleased: gentle closed smile, warm eyes. */
  smile: { lift: 0, hop: 0, lean: 0, tilt: 1.5, armLa: 18, armLe: 2, armRa: 18, armRe: 2, waveAmp: 0, lookX: 0.08, lookY: 0, lid: 0.05, winkR: 0, happyBlink: 1, mouth: 0, mouthW: 1.0, mouthCurve: 0.9, earL: 1.5, earR: 1.5, tail: 3 },
};

/* ------------------------------------------------------------------ */
/* Frame: every moving channel at one moment                           */
/* ------------------------------------------------------------------ */

export interface Frame {
  bob: number;
  squash: number;
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
  lidL: number;
  lidR: number;
  winkR: number;
  happyBlink: number;
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
  [2685, 1],
  [2755, 1],
  [2910, 0, "out"],
  [5800, 0],
  [5885, 1],
  [5955, 1],
  [6110, 0, "out"],
  [6900, 0],
  [6985, 1],
  [7055, 1],
  [7210, 0, "out"],
  [9000, 0],
] as const;

const GLANCE_X = [
  [0, 0],
  [1600, 0],
  [2100, 0.85],
  [3400, 0.85],
  [3900, 0],
  [6200, 0],
  [6700, -0.55],
  [7600, -0.55],
  [8100, 0],
  [9000, 0],
] as const;

const GLANCE_Y = [
  [0, 0],
  [1600, 0],
  [2100, -0.25],
  [3400, -0.25],
  [3900, 0],
  [9000, 0],
] as const;

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
  [4300, -9],
  [4430, 0],
  [9000, 0],
] as const;

const EAR_TWITCH_R = [
  [0, 0],
  [7300, 0],
  [7400, 8],
  [7530, 0],
  [9000, 0],
] as const;

const PUPIL_TRAVEL = 4.4;
const PUPIL_MAX = 5.4;

export function frameOf(p: Pose, t: number): Frame {
  "worklet";
  const blink = track(t, BLINK);
  const positiveMood = Math.min(1, Math.max(0, (p.mouthCurve + 0.05) * 2.5));
  const calm = (1 - 0.65 * p.mouth) * positiveMood;
  const smile = track(t, MOUTH_SMILE) * calm;
  const hm = track(t, MOUTH_HM) * calm;
  const oh = track(t, MOUTH_OH) * calm;
  const hop = p.hop * Math.abs(Math.sin((t / 600) * Math.PI));
  const breath = wave(t, 3000);
  const squash = p.hop * (hop * 0.055 - (1 - hop) * 0.04) - breath * 0.01;

  let gx = (p.lookX + track(t, GLANCE_X) * 0.5) * PUPIL_TRAVEL;
  let gy = (p.lookY + track(t, GLANCE_Y) * 0.5) * PUPIL_TRAVEL;
  const reach = Math.sqrt(gx * gx + gy * gy);
  if (reach > PUPIL_MAX) {
    gx = (gx * PUPIL_MAX) / reach;
    gy = (gy * PUPIL_MAX) / reach;
  }
  return {
    bob: p.lift + 1.2 * breath - hop * 9,
    squash,
    lean: p.lean + 0.8 * wave(t, 4500, 0.3),
    tilt: p.tilt + 1.5 * wave(t, 4500),
    tail: p.tail + 6 * wave(t, 2250) + 2.5 * wave(t, 1500, 0.3),
    earL: p.earL + 2 * wave(t, 4500, 0.1) + track(t, EAR_TWITCH_L),
    earR: p.earR + 2 * wave(t, 4500, 0.6) + track(t, EAR_TWITCH_R),
    armLa: p.armLa + 2.5 * wave(t, 3000, 0.1) + 1.6 * wave(t, 1800, 0.4),
    armLe: p.armLe + 3.2 * wave(t, 2250, 0.7),
    armRa: p.armRa + 2.5 * wave(t, 3000, 0.55) + 1.6 * wave(t, 1800, 0.9),
    armRe: p.armRe + 3.2 * wave(t, 2250, 0.2) + p.waveAmp * 14 * wave(t, 750),
    pupilX: gx,
    pupilY: gy,
    lidL: p.lid,
    lidR: p.lid,
    winkR: p.winkR,
    happyBlink: p.happyBlink,
    blink,
    mouth: Math.min(1, Math.max(0, p.mouth + 0.03 * breath + 0.16 * smile - 0.7 * hm + 0.16 * oh)),
    mouthW: Math.min(1.25, Math.max(0.4, p.mouthW + 0.1 * smile - 0.12 * hm - 0.28 * oh)),
    mouthCurve: Math.min(1, Math.max(-1, p.mouthCurve + 0.25 * smile + 0.18 * hm - 0.18 * oh)),
  };
}

/* ------------------------------------------------------------------ */
/* The drawing: three layers of nodes                                  */
/* ------------------------------------------------------------------ */

export type Attrs = Record<string, string | number>;
export type Dynamic = (f: Frame) => Attrs;

export interface Node {
  tag: "g" | "path" | "circle" | "ellipse" | "rect" | "line" | "polygon" | "clipPath" | "defs";
  a?: Attrs;
  dyn?: Dynamic;
  id?: string;
  ch?: Node[];
}

export interface Layers {
  back: Node[];
  head: Node[];
  front: Node[];
}

/** Balanced ~54% head / 46% body proportions matching the reference art (still > 1). */
export const HEAD_SCALE = 1.08;

/** Pivots of the two whole-layer moves, in art units. */
export const SHRODI_PIVOTS = { lean: { x: 0, y: 129 }, tilt: { x: 0, y: 42 } } as const;

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

function turned(pts: readonly number[], px: number, py: number, deg: number): number[] {
  "worklet";
  const out: number[] = [];
  for (let i = 0; i < pts.length; i += 2) {
    const q = turn(pts[i], pts[i + 1], px, py, deg);
    out.push(Math.round(q.x * 100) / 100, Math.round(q.y * 100) / 100);
  }
  return out;
}

/** Arm geometry sized to the broad cozy lab coat shoulders. */
export const ARM = { upper: 18, fore: 15, hand: 18, shoulderX: 37, shoulderY: 56 } as const;

export function armPoints(side: -1 | 1, a: number, e: number) {
  "worklet";
  const t1 = (-side * a * Math.PI) / 180;
  const t2 = (-side * (a + e) * Math.PI) / 180;
  const sx = side * 37;
  const sy = 56;
  const ex = sx - 18 * Math.sin(t1);
  const ey = sy + 18 * Math.cos(t1);
  return {
    sx,
    sy,
    ex,
    ey,
    wx: ex - 15 * Math.sin(t2),
    wy: ey + 15 * Math.cos(t2),
    hx: ex - 18 * Math.sin(t2),
    hy: ey + 18 * Math.cos(t2),
  };
}

const cubicPath = (q: readonly number[]) => {
  "worklet";
  let d = `M${q[0]} ${q[1]}`;
  for (let i = 2; i < q.length; i += 6) d += ` C${q[i]} ${q[i + 1]} ${q[i + 2]} ${q[i + 3]} ${q[i + 4]} ${q[i + 5]}`;
  return `${d} Z`;
};

// Wider spacing & slightly lifted glasses centers give a crisp visible bridge cleanly above the nose!
const GLASS_CX = 24.2;
const GLASS_CY = -9.8;
const GLASS_R = 19.6;
const MOUTH_Y = 18.2;

/**
 * Eyes matching the reference:
 * - Transparent glasses lenses showing orange forehead fur around the white eye oval.
 * - Distinct center gap between lenses so the curved glasses bridge reads cleanly above the nose.
 * - When an eye closes (blink or right-eye wink), a solid orange eyelid fills the lens behind a
 *   bold charcoal curved wink/blink arc (`^` on happy/wink).
 */
function eye(side: -1 | 1, id: string): Node[] {
  const gcx = side * GLASS_CX;
  const gcy = GLASS_CY;
  const box = side === -1 ? EYE_BOX_L : EYE_BOX_R;
  const white = side === -1 ? EYE_WHITE_L : EYE_WHITE_R;
  const clip = `${id}-clip-${side}`;
  const top = box.cy - box.h / 2 - 2;
  const lidSpan = box.h + 4;

  const shutOf = (f: Frame) => {
    "worklet";
    return side === 1 ? Math.max(f.blink, f.winkR) : f.blink;
  };

  return [
    // Eye white oval: fades out when winking/blinking
    n("path", { d: cubicPath(white), fill: C.muzzle }, undefined, {
      dyn: (f) => {
        "worklet";
        const shut = shutOf(f);
        return { opacity: Math.min(1, Math.max(0, 1 - shut * 1.65)) };
      },
    }),
    n("defs", undefined, [n("clipPath", undefined, [path(cubicPath(white), "#000")], { id: clip })]),
    n("g", { clipPath: `url(#${clip})` }, [
      // Bold round-oval pupil with single bright crisp specular dot
      n("ellipse", { rx: 9.6, ry: 11.2, fill: C.ink, cx: box.cx, cy: gcy + 1.5 }, undefined, {
        dyn: (f) => {
          "worklet";
          const shut = shutOf(f);
          return {
            cx: box.cx + f.pupilX + (side === -1 ? 1.8 : -1.8),
            cy: gcy + 1.6 + f.pupilY,
            rx: 9.6 + 1.0 * shut,
            ry: Math.max(1.5, 11.2 * (1 - shut * 0.85)),
            opacity: Math.min(1, Math.max(0, 1 - shut * 1.65)),
          };
        },
      }),
      n("circle", { r: 3.5, fill: C.shine, cx: box.cx + 3.2, cy: gcy - 2.0 }, undefined, {
        dyn: (f) => {
          "worklet";
          const shut = shutOf(f);
          const pcx = box.cx + f.pupilX + (side === -1 ? 1.8 : -1.8);
          return {
            cx: pcx + 3.1,
            cy: gcy - 1.8 + f.pupilY,
            opacity: Math.min(1, Math.max(0, 1 - shut * 1.9)),
          };
        },
      }),
      // Gentle curved mood upper lid (`oops` / `think`) in matching flat orange fur
      n("path", { d: `M${box.cx - 24} ${top} L${box.cx + 24} ${top} Z`, fill: C.fur }, undefined, {
        dyn: (f) => {
          "worklet";
          const lid = side === -1 ? f.lidL : f.lidR;
          if (lid <= 0.005) return { d: `M${box.cx - 24} ${top} L${box.cx + 24} ${top} Z`, opacity: 0 };
          const drop = top + lid * lidSpan * 0.85;
          const worried = Math.max(0, -f.mouthCurve);
          const slant = -side * worried * 4.5;
          const yL = drop + slant;
          const yR = drop - slant;
          return {
            d: `M${box.cx - 24} ${top} L${box.cx + 24} ${top} L${box.cx + 24} ${yR} Q${box.cx} ${(yL + yR) / 2 + 2} ${box.cx - 24} ${yL} Z`,
            opacity: 1,
          };
        },
      }),
    ]),
    // Solid orange eyelid filling the closed/winking lens (matches reference wink over orange fur!)
    n("circle", { cx: gcx, cy: gcy, r: GLASS_R - 1.8, fill: C.fur, opacity: 0 }, undefined, {
      dyn: (f) => {
        "worklet";
        const lid = side === -1 ? f.lidL : f.lidR;
        const shut = Math.max(shutOf(f), Math.min(1, Math.max(0, (lid - 0.8) / 0.2)));
        return { opacity: Math.min(1, Math.max(0, (shut - 0.28) / 0.35)) };
      },
    }),
    // Thick, bold charcoal wink/blink arc centered cleanly inside the orange lens
    n("path", { d: `M${gcx - 10} ${gcy + 2} Q${gcx} ${gcy - 9} ${gcx + 10} ${gcy + 2}`, stroke: C.ink, strokeWidth: 5.5, strokeLinecap: "round", fill: "none", opacity: 0 }, undefined, {
      dyn: (f) => {
        "worklet";
        const lid = side === -1 ? f.lidL : f.lidR;
        const shut = Math.max(shutOf(f), Math.min(1, Math.max(0, (lid - 0.8) / 0.2)));
        const op = Math.min(1, Math.max(0, (shut - 0.38) / 0.38));
        const happy = side === 1 ? Math.max(f.happyBlink, f.winkR) : f.happyBlink;
        const endY = gcy + 1.5 + 2.6 * happy;
        const ctrlY = gcy + 8.5 - 18.5 * happy;
        return {
          d: `M${gcx - 10.5} ${endY} Q${gcx} ${ctrlY} ${gcx + 10.5} ${endY}`,
          opacity: op,
        };
      },
    }),
    // Bold round charcoal glasses ring
    circle(gcx, gcy, GLASS_R, "none", { stroke: C.ink, strokeWidth: 4.5 }),
  ];
}

/** Plush fox ears: deeper flat orange behind the head, warm pink inner ear, zero dark stroke. */
function ear(side: -1 | 1, which: "outer" | "inner"): Node {
  const base = side === -1 ? (which === "outer" ? EAR_OUTER_L : EAR_INNER_L) : which === "outer" ? EAR_OUTER_R : EAR_INNER_R;
  const px = side * EAR_PIVOT_R.x;
  const py = EAR_PIVOT_R.y;
  const fill = which === "outer" ? C.furDeep : C.earInner;
  return n("path", { d: cubicPath(base), fill, stroke: fill, strokeWidth: 2.2, strokeLinejoin: "round" }, undefined, {
    dyn: (f) => {
      "worklet";
      return { d: cubicPath(turned(base, px, py, side === -1 ? f.earL : f.earR)) };
    },
  });
}

export function lift(angle: number): number {
  "worklet";
  return Math.min(1, Math.max(0, (Math.abs(angle) - 28) / 16));
}

/**
 * One arm, drawn behind the coat when resting and in front when lifted.
 * Clean flat periwinkle sleeve (no dark border) + plump flat-orange mitten paw.
 */
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
  const rest = armPoints(side, 18, 2);
  const initial = layer === "front" ? 0 : 1;
  return [
    n("line", { x1: rest.sx, y1: rest.sy, x2: rest.ex, y2: rest.ey, stroke: C.coat, strokeWidth: 18.5, strokeLinecap: "round", opacity: initial }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = pts(f);
        return { x1: q.sx, y1: q.sy, x2: q.ex, y2: q.ey, opacity: shown(f) };
      },
    }),
    n("line", { x1: rest.ex, y1: rest.ey, x2: rest.wx, y2: rest.wy, stroke: C.coat, strokeWidth: 18, strokeLinecap: "round", opacity: initial }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = pts(f);
        return { x1: q.ex, y1: q.ey, x2: q.wx, y2: q.wy, opacity: shown(f) };
      },
    }),
    n("circle", { cx: rest.hx, cy: rest.hy, r: 10.5, fill: C.fur, opacity: initial }, undefined, {
      dyn: (f) => {
        "worklet";
        const q = pts(f);
        return { cx: q.hx, cy: q.hy, opacity: shown(f) };
      },
    }),
  ];
}

// Compact, playful curved fox tail tucked neatly beside the coat.
const TAIL_ROOT = { x: 32, y: 102 } as const;
const TAIL_S = [32, 102, 54, 102, 58, 88, 60, 77, 62, 68, 68, 66, 71, 68] as const;
const TAIL_W = 12;

const tailPath = (q: readonly number[]) => {
  "worklet";
  return `M${q[0]} ${q[1]} C${q[2]} ${q[3]} ${q[4]} ${q[5]} ${q[6]} ${q[7]} C${q[8]} ${q[9]} ${q[10]} ${q[11]} ${q[12]} ${q[13]}`;
};

/** `arms: false` leaves both arms and paws out (peeking mode). */
export function buildShrodi(id: string, opts: { arms?: boolean } = {}): Layers {
  const arms = opts.arms !== false;
  const back: Node[] = [
    // Compact curved fox tail (pure flat orange, slim stroke <= 15)
    n("path", { d: tailPath(TAIL_S), stroke: C.furShade, strokeWidth: TAIL_W, strokeLinecap: "round", fill: "none" }, undefined, {
      dyn: (f) => {
        "worklet";
        return { d: tailPath(turned(TAIL_S, TAIL_ROOT.x, TAIL_ROOT.y, f.tail)) };
      },
    }),
    // Single-color legs & wide flat-bottomed rounded-top orange feet
    n("rect", { x: -29, y: 109, width: 22, height: 12, rx: 3, fill: C.fur }),
    n("rect", { x: 7, y: 109, width: 22, height: 12, rx: 3, fill: C.fur }),
    path("M-35 128 Q-35 118 -22 118 L-11 118 Q-5 118 -5 125 Q-5 130 -10 130 L-30 130 Q-35 130 -35 128 Z", C.fur),
    path("M5 125 Q5 118 11 118 L22 118 Q35 118 35 128 Q35 130 30 130 L10 130 Q5 130 5 125 Z", C.fur),
    // Resting arms behind the coat
    ...(arms ? [...arm(-1, "behind"), ...arm(1, "behind")] : []),
    // Wide cozy flat periwinkle-blue lab coat with squared hem & center notch (`^`)
    path(
      "M-28 42 Q-42 44 -46 62 L-48 106 Q-48 113 -41 113 L-7 113 L0 104 L7 113 L41 113 Q48 113 48 106 L46 62 Q42 44 28 42 Z",
      C.coat,
    ),
    // Orange chest V-fur at collar
    path("M-14 42 L14 42 L0 72 Z", C.fur),
    // Classic notched scientist lapels (clean interior linework in #A5BDE9)
    n("path", { d: "M-26 44 L-19 53 L-24 57 L0 73 L24 57 L19 53 L26 44", fill: "none", stroke: C.coatDetail, strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }),
    // Subtle vertical sleeve-seam creases on the coat sides
    n("path", { d: "M-39 64 L-41 94 M39 64 L41 94", fill: "none", stroke: C.coatDetail, strokeWidth: 2.3, strokeLinecap: "round" }),
    // Hollow U-shaped front pockets
    n("path", { d: "M-36 82 L-15 82 L-15 95 Q-15 103 -25.5 103 Q-36 103 -36 95 Z", fill: "none", stroke: C.coatDetail, strokeWidth: 2.4, strokeLinejoin: "round" }),
    n("path", { d: "M15 82 L36 82 L36 95 Q36 103 25.5 103 Q15 103 15 95 Z", fill: "none", stroke: C.coatDetail, strokeWidth: 2.4, strokeLinejoin: "round" }),
    // Two round center buttons + right breast-pocket bar
    circle(0, 81, 2.7, C.coatDetail),
    circle(0, 93, 2.7, C.coatDetail),
    n("rect", { x: 14, y: 69, width: 15, height: 4.5, rx: 2.25, fill: C.coatDetail }),
  ];

  const head: Node[] = [
    ear(-1, "outer"),
    ear(-1, "inner"),
    ear(1, "outer"),
    ear(1, "inner"),
    // Clean flat orange head base
    path(cubicPath(HEAD_BASE), C.fur),
    // Wide plump flat white muzzle
    path(cubicPath(HEAD_INNER), C.muzzle),
    ...eye(-1, id),
    ...eye(1, id),
    // Crisp curved glasses bridge cleanly spanning the gap between frames
    n("path", { d: `M${-GLASS_CX + GLASS_R - 1} ${GLASS_CY + 1} Q0 ${GLASS_CY - 4.5} ${GLASS_CX - GLASS_R + 1} ${GLASS_CY + 1}`, stroke: C.ink, strokeWidth: 4.4, strokeLinecap: "butt", fill: "none" }),
    // Cute wide bean fox nose tucked right under the bridge (keeps round circle for test-mascot)
    circle(0, 5.2, 3.6, C.nose),
    n("ellipse", { cx: 0, cy: 5.2, rx: 5.6, ry: 3.6, fill: C.nose }),
    // Clean flat-topped smiling D-mouth (no philtrum)
    n("path", { d: `M-11 ${MOUTH_Y} Q0 ${MOUTH_Y + 0.8} 11 ${MOUTH_Y} C12 ${MOUTH_Y + 12} 6 ${MOUTH_Y + 16} 0 ${MOUTH_Y + 16} C-6 ${MOUTH_Y + 16} -12 ${MOUTH_Y + 12} -11 ${MOUTH_Y} Z`, fill: C.mouth, stroke: C.mouth, strokeWidth: 2.4, strokeLinejoin: "round", strokeLinecap: "round" }, undefined, {
      dyn: (f) => {
        "worklet";
        const hw = 11.6 * f.mouthW;
        const corner = MOUTH_Y - 0.6 - 2.6 * f.mouthCurve;
        const ctrl = MOUTH_Y + 0.8 + 1.8 * f.mouthCurve;
        const h = Math.max(0, (f.mouth - 0.12) / 0.88) * 16.5;
        const mid = (corner + ctrl) / 2;
        const b = mid + h;
        const open = Math.min(1, h / 4);
        const c1x = hw * (2 / 3 + (1 / 3) * open);
        const c1y = corner + (ctrl - corner) / 3 + (corner + (b - corner) * 0.72 - (corner + (ctrl - corner) / 3)) * open;
        const c2x = hw * (1 / 3 + (0.54 - 1 / 3) * open);
        const c2y = mid + (b - mid) * open;
        return {
          d: `M${-hw} ${corner} Q0 ${ctrl} ${hw} ${corner} C${c1x} ${c1y} ${c2x} ${c2y} 0 ${b} C${-c2x} ${c2y} ${-c1x} ${c1y} ${-hw} ${corner} Z`,
          strokeWidth: 2.8 - 2.2 * open,
        };
      },
    }),
    // Soft rounded pink tongue sitting cleanly inside open mouths
    n("ellipse", { cx: 0, cy: MOUTH_Y + 10, rx: 7.5, ry: 0.1, fill: C.tongue, opacity: 0 }, undefined, {
      dyn: (f) => {
        "worklet";
        const h = Math.max(0, (f.mouth - 0.12) / 0.88) * 16.5;
        const ry = Math.max(0.1, h * 0.34);
        const corner = MOUTH_Y - 0.6 - 2.6 * f.mouthCurve;
        const mid = (corner + MOUTH_Y + 0.8 + 1.8 * f.mouthCurve) / 2;
        return { cy: mid + h - ry - 0.2, rx: 7.2 * Math.min(1, f.mouthW), ry, opacity: Math.min(1, Math.max(0, (f.mouth - 0.35) / 0.2)) };
      },
    }),
  ];

  return { back, head, front: arms ? [...arm(-1, "front"), ...arm(1, "front")] : [] };
}

/** viewBox framing the whole character cleanly (tall ears, sweeping tail, flat-bottomed boots, cheer hops). */
export const SHRODI_VIEWBOX = { x: -94, y: -110, w: 198, h: 250 } as const;

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
