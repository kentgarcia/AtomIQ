/**
 * NPC teachers: the drawing, as pure data.
 *
 * A teacher is `NpcSpec` (values) + a pose id. `buildNpc(spec, pose)` returns the shape tree as five
 * stacked layers, and `toSvg` serialises it for the offline contact sheet and the Studio preview. No
 * imports beyond the palette file, so Node can test it.
 *
 * The rules are the Duolingo character skill's (`.claude/skills/duolingo-character-style`), ported
 * from its reference kit: the head is 100 units wide and centred on (0, 0), y down; only rounded
 * rectangles, circles and rounded triangles; no outlines, no gradients, no alpha for shade; at most one
 * shade step per colour; arms are thick capsules whose shoulder is hidden behind the torso; hands are
 * circles, with fingers only where the gesture needs them. All strokes are round-capped capsules, so no
 * transform is ever needed (and none is used: animated SVG transforms are forbidden, see MOTION.md).
 *
 * Layers, back to front (skill section 9):
 *   back  back hair, arms behind the torso, neck, torso, worn props
 *   face  ears, head, face, facial hair
 *   top   front hair, glasses, hat
 *   front front sleeves, held props, gripping hands (they may land on the face)
 *   lids  the blink: skin over the eyes. Not part of the still drawing; the renderer fades it in.
 */

import { FACE, MUTE_CLOTHES_STEP, MUTE_DARK, MUTE_LIGHT, MUTE_SEPARATION } from "./npc-palette.ts";

// ── spec ─────────────────────────────────────────────────────────────────────

export type EyeStyle = "pill" | "round" | "glasses-round" | "glasses-square" | "dots";
export type HairStyle = "bob" | "curls" | "crop" | "bun" | "wrap";
export type OutfitKind = "sweater" | "hoodie" | "coat" | "vest" | "shirt";
export type PropKind = "none" | "marble" | "watch" | "clipboard" | "stethoscope" | "hardhat" | "vial" | "notebook";

export type NpcSpec = {
  skin: { base: string; shade: string; feature: string };
  head: "tombstone" | "capsule";
  /** 92 to 108 (variety). */
  headWidth: number;
  eyes: EyeStyle;
  nose: "single" | "double";
  hair: { style: HairStyle; color: string; shade: string };
  facialHair?: "moustache" | "beard";
  outfit: { kind: OutfitKind; color: string; shade: string; /** shirt or inner colour (coat, vest, shirt) */ collar?: string };
  /** The prop and its colours. */
  accent: { kind: PropKind; color: string; shade: string };
  /** Set by `mutedSpec`: the face colours (pupil, mouth, tongue) are muted too. */
  muted?: boolean;
};

export type PoseId = "idle" | "greet" | "explain" | "point" | "think" | "proud" | "cheer" | "sorry";
export const NPC_POSES: readonly PoseId[] = ["idle", "greet", "explain", "point", "think", "proud", "cheer", "sorry"];

export type Part = { d: string; fill: string; evenOdd?: boolean } | { d: string; stroke: string; sw: number };

export interface NpcTree {
  back: Part[];
  face: Part[];
  top: Part[];
  front: Part[];
  lids: Part[];
  /** The `bust` only: the face in each of its expressions, faded in over the resting face (see `BUST_MOODS`). */
  moods?: { face: Part[]; from: number; to: number }[];
}

// ── frame, proportions (head = 100) ──────────────────────────────────────────

/** Arm thickness (about the neck), hand radius (diameter half the head), cuff = sleeve end to hand centre. */
export const ARM = { w: 38, hand: 25, cuff: 38 } as const;
/** A thumb or finger: width 1/3 of the hand diameter. */
export const FINGER_W = 16;
export const THUMB_OUT = 16;
/** The shoulder: centre of the arm's round end, fully inside the torso. */
export const SHOULDER = { x: 46, y: 118 } as const;
export const HEAD = { top: -66, height: 122, width: 100 } as const;
export const NECK = { w: 28 } as const;
export const TORSO = { top: 68, width: 144, bottom: 250 } as const;
export const EYE = { x: 19.5, y: -8, w: 30, h: 40, pw: 13, ph: 20, shine: 2.8 } as const;
const FEATURE_W = 5;

/** What is shown: the whole bust with arms, or head and shoulders (chips and banners). */
export const NPC_VIEWBOX = {
  hero: { x: -175, y: -116, w: 350, h: 380 },
  head: { x: -100, y: -116, w: 200, h: 252 },
  /**
   * The lesson teacher, closer in than `head` (same 200:252 shape, so it drops in where `head` was): the head with just
   * a strip of shirt, whose bottom corners are rounded and flush with the bottom edge. Drawn without arms and held still.
   */
  bust: { x: -88, y: -114, w: 176, h: 221.76 },
  /** A square crop of head, neck and shoulders, for round and rounded-square avatar frames. */
  avatar: { x: -110, y: -112, w: 220, h: 220 },
  /**
   * For round avatars that pop out of their circle: head and shoulders at a larger scale, with room above the circle
   * (`POP_CIRCLE`) so the top of the head can rise past its edge. Drawn with `popClipPath()` so only the lower half
   * is cut to the circle.
   */
  pop: { x: -100, y: -112, w: 200, h: 228 },
} as const;
export type NpcForm = keyof typeof NPC_VIEWBOX;

/** The circle of a `pop` avatar, in drawing units. The head (top at HEAD.top) and its hair reach above it. */
export const POP_CIRCLE = { cx: 0, cy: 28, r: 88 } as const;

/**
 * The clip of a `pop` figure: everything above the circle's middle line (so the head is free to rise out of
 * the top), and below it the circle itself (so the shoulders stay inside). One path, a rectangle over a half disc.
 */
export function popClipPath(): string {
  const { cy, r } = POP_CIRCLE;
  const { x, y, w } = NPC_VIEWBOX.pop;
  return `M${x} ${y}H${x + w}V${cy}H${r}A${r} ${r} 0 0 1 ${-r} ${cy}H${x}Z`;
}

/**
 * Where a `pop` figure sits for a circle of diameter `size` dp: the figure's box (relative to the circle's top
 * left corner, so the top is negative) and its size. Put the circle in a view of `size` x `size` that does not clip.
 */
export function popLayout(size: number): { width: number; height: number; left: number; top: number } {
  const k = size / (POP_CIRCLE.r * 2);
  const vb = NPC_VIEWBOX.pop;
  return { width: vb.w * k, height: vb.h * k, left: (vb.x + POP_CIRCLE.r - POP_CIRCLE.cx) * k, top: (vb.y - (POP_CIRCLE.cy - POP_CIRCLE.r)) * k };
}

/** Where the shirt of the `bust` form ends: the bottom edge of its crop (the bottom corners are rounded there). */
export const BUST_BOTTOM = NPC_VIEWBOX.bust.y + NPC_VIEWBOX.bust.h;
/** The radius of the bust shirt's rounded bottom corners. */
export const BUST_CORNER = 24;

/**
 * The expressions a held-still `bust` plays, on top of its resting face: a glance, a grin, another glance.
 * Each is faded in over `NPC_MOOD_FADE` ms at `from`, held, and faded out by `to + NPC_MOOD_FADE` (ms into
 * the idle loop). They keep clear of the blinks (`NPC_BLINKS`).
 */
export const NPC_MOOD_FADE = 170;
export type MoodDef = { expression: Expression; from: number; to: number };

/** One idle loop. Every idle period divides it, so it closes without a jump. */
export const NPC_LOOP_MS = 9000;
/** Blink times (ms into the loop) and their length. */
export const NPC_BLINKS = [2600, 6300] as const;
export const NPC_BLINK_MS = 190;
/** Periods of the idle motions the renderer uses (breathing bob, head sway). Both divide the loop. */
export const NPC_IDLE_PERIODS = { bob: 3000, sway: 4500 } as const;

// ── the three shapes ─────────────────────────────────────────────────────────

const f = (n: number) => Math.round(n * 100) / 100;
export const fillOf = (d: string, color: string, evenOdd = false): Part => ({ d, fill: color, ...(evenOdd ? { evenOdd } : {}) });
export const lineOf = (d: string, color: string, sw: number): Part => ({ d, stroke: color, sw });

export function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
}

/** The rounded rectangle, the most used shape. */
export function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return (
    `M${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}` +
    `V${f(y + h - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w - q)} ${f(y + h)}` +
    `H${f(x + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y + h - q)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}Z`
  );
}

/** The pill: a fully rounded rectangle centred at (cx, cy). */
export const pill = (cx: number, cy: number, w: number, h: number) => rrect(cx - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2);

/** The tombstone: half-circle top, straight sides, rounded bottom corners. When h <= w/2 it is a flat-bottomed cap. */
export function tomb(cx: number, top: number, w: number, h: number, r: number): string {
  const R = w / 2;
  const yb = top + h;
  if (h <= R) {
    const half = Math.sqrt(R * R - (R - h) * (R - h));
    return `M${f(cx - half)} ${f(yb)}A${f(R)} ${f(R)} 0 0 1 ${f(cx + half)} ${f(yb)}Z`;
  }
  const q = Math.min(r, R, h - R);
  return (
    `M${f(cx - R)} ${f(top + R)}A${f(R)} ${f(R)} 0 0 1 ${f(cx + R)} ${f(top + R)}` +
    `V${f(yb - q)}A${f(q)} ${f(q)} 0 0 1 ${f(cx + R - q)} ${f(yb)}H${f(cx - R + q)}A${f(q)} ${f(q)} 0 0 1 ${f(cx - R)} ${f(yb - q)}Z`
  );
}

/**
 * The shirt of the `bust`: the shoulders are the top of a circle (like `tomb`), cut flat at `bottom`, and the two
 * bottom corners are rounded with radius `r`. (`tomb` cannot do this: given so little height it becomes a plain cap.)
 */
export function bustShirt(cx: number, top: number, w: number, bottom: number, r: number): string {
  const R = w / 2;
  const cy = top + R;
  const halfAt = (y: number) => Math.sqrt(Math.max(0, R * R - (cy - y) * (cy - y)));
  const edge = halfAt(bottom);
  // Where the rounding leaves the arc: a little above the corner
  const y1 = bottom - r * 0.8;
  const x1 = halfAt(y1);
  return (
    `M${f(cx - edge + r)} ${f(bottom)}H${f(cx + edge - r)}Q${f(cx + edge)} ${f(bottom)} ${f(cx + x1)} ${f(y1)}` +
    `A${f(R)} ${f(R)} 0 0 0 ${f(cx - x1)} ${f(y1)}Q${f(cx - edge)} ${f(bottom)} ${f(cx - edge + r)} ${f(bottom)}Z`
  );
}

/** The rounded triangle with corners a, b, c and corner radius r. */
export function rtri(a: [number, number], b: [number, number], c: [number, number], r: number): string {
  const pts = [a, b, c];
  let d = "";
  for (let i = 0; i < 3; i++) {
    const p = pts[i];
    const prev = pts[(i + 2) % 3];
    const next = pts[(i + 1) % 3];
    const tp = unit(prev[0] - p[0], prev[1] - p[1]);
    const tn = unit(next[0] - p[0], next[1] - p[1]);
    const s = [p[0] + tp[0] * r, p[1] + tp[1] * r];
    const e = [p[0] + tn[0] * r, p[1] + tn[1] * r];
    d += `${i === 0 ? "M" : "L"}${f(s[0])} ${f(s[1])}Q${f(p[0])} ${f(p[1])} ${f(e[0])} ${f(e[1])}`;
  }
  return `${d}Z`;
}
function unit(x: number, y: number): [number, number] {
  const l = Math.hypot(x, y) || 1;
  return [x / l, y / l];
}

function topRound(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h);
  return `M${f(x)} ${f(y + h)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}V${f(y + h)}Z`;
}

// ── colours ──────────────────────────────────────────────────────────────────

export type Pal = {
  skin: string; skinShade: string; feature: string;
  hair: string; hairShade: string;
  top: string; topShade: string; sleeve: string; collar: string;
  accent: string; accentShade: string;
  glasses: string;
  eyeWhite: string; pupil: string; mouth: string; tongue: string; teeth: string;
};

export function paletteOf(spec: NpcSpec): Pal {
  const o = spec.outfit;
  // A vest hangs over a shirt: the sleeves are the shirt's. Everything else has sleeves of its own colour.
  const sleeve = o.kind === "vest" ? o.collar ?? FACE.teeth : o.color;
  return {
    skin: spec.skin.base, skinShade: spec.skin.shade, feature: spec.skin.feature,
    hair: spec.hair.color, hairShade: spec.hair.shade,
    top: o.color, topShade: o.shade, sleeve, collar: o.collar ?? FACE.teeth,
    accent: spec.accent.color, accentShade: spec.accent.shade,
    glasses: spec.muted ? muteColor(FACE.pupil) : FACE.pupil,
    eyeWhite: FACE.eyeWhite,
    pupil: spec.muted ? muteColor(FACE.pupil) : FACE.pupil,
    mouth: spec.muted ? muteColor(FACE.mouth) : FACE.mouth,
    tongue: spec.muted ? muteColor(FACE.tongue) : FACE.tongue,
    teeth: FACE.teeth,
  };
}

// The muted ("locked") version: lightness onto a cool pastel ramp, never grey.
function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(rgb: readonly number[]): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}
export function muteColor(hex: string, shift = 0): string {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return hex;
  const [r, g, b] = hexToRgb(hex);
  const l = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const t = Math.min(1, Math.max(0, (l - 0.1) / 0.8 - shift));
  return rgbToHex(MUTE_DARK.map((d, i) => d + (MUTE_LIGHT[i] - d) * t));
}
function lightnessOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
/** A spec with every colour muted. Eye whites and teeth are not in the spec, so they stay white. */
export function mutedSpec(spec: NpcSpec): NpcSpec {
  const m = (c: string, shift = 0) => muteColor(c, shift);
  const skinL = lightnessOf(m(spec.skin.base));
  let s = 0;
  while (Math.abs(lightnessOf(m(spec.outfit.color, s)) - skinL) < MUTE_SEPARATION && s < 0.6) s += MUTE_CLOTHES_STEP;
  return {
    ...spec,
    muted: true,
    skin: { base: m(spec.skin.base), shade: m(spec.skin.shade), feature: m(spec.skin.feature) },
    hair: { ...spec.hair, color: m(spec.hair.color), shade: m(spec.hair.shade) },
    outfit: { ...spec.outfit, color: m(spec.outfit.color, s), shade: m(spec.outfit.shade, s), collar: spec.outfit.collar ? m(spec.outfit.collar, s) : undefined },
    accent: { ...spec.accent, color: m(spec.accent.color), shade: m(spec.accent.shade) },
  };
}

// ── the face ─────────────────────────────────────────────────────────────────

export type Expression = { eyes: "open" | "worried" | "closedHappy"; mouth: "smile" | "grin" | "laugh" | "flat" | "sad" | "o"; look?: [number, number] };

const CUTS = { worried: { lid: [-9, -21] as [number, number], cheek: [15, 12] as [number, number] } };

function eyeParts(side: -1 | 1, e: Expression, p: Pal, style: EyeStyle, happy: boolean, noseX: number): Part[] {
  const cx = side * EYE.x;
  const cy = EYE.y;
  const [lx, ly] = e.look ?? [0, 0];
  const kx = noseX + side * EYE.x;
  if (e.eyes === "closedHappy") return [lineOf(`M${kx - 11} ${cy + 5}Q${kx} ${cy - 10} ${kx + 11} ${cy + 5}`, p.feature, FEATURE_W)];
  const out: Part[] = [];
  if (style === "dots") {
    out.push(fillOf(pill(cx + lx * 0.6, cy + 2 + ly * 0.6, 14, 22), p.pupil));
    out.push(fillOf(circle(cx + lx * 0.6 - 2, cy - 4 + ly * 0.6, 2.6), p.eyeWhite));
    return out;
  }
  if (style === "round") {
    out.push(fillOf(circle(cx, cy + 2, 18), p.eyeWhite));
    out.push(fillOf(circle(cx - side * 2 + lx, cy - 3 + ly, 8), p.pupil));
    out.push(fillOf(circle(cx - side * 2 + lx - 2.6, cy - 6 + ly, 2.6), p.eyeWhite));
  } else {
    out.push(fillOf(pill(cx, cy, EYE.w, EYE.h), p.eyeWhite));
    const top = cy - EYE.h / 2 + 7 + ly;
    const px = cx + lx - side * 2.5;
    out.push(fillOf(pill(px, top + EYE.ph / 2, EYE.pw, EYE.ph), p.pupil));
    out.push(fillOf(circle(px - EYE.pw * 0.22, top + EYE.shine + 1.6, EYE.shine), p.eyeWhite));
  }
  const cut: { lid?: [number, number]; cheek?: [number, number] } = { ...(e.eyes === "worried" ? CUTS.worried : {}), ...(happy ? { cheek: [10, 15] as [number, number] } : {}) };
  const half = EYE.w / 2;
  const xo = cx + side * (half + 2);
  const xi = cx - side * (half + 2);
  if (cut.lid) {
    const [o, i] = cut.lid;
    out.push(fillOf(`M${xo} ${cy - EYE.h}L${xi} ${cy - EYE.h}L${xi} ${cy + i}L${xo} ${cy + o}Z`, p.skin));
  }
  if (cut.cheek) {
    const [o, i] = cut.cheek;
    out.push(fillOf(`M${xo} ${cy + o}L${xi} ${cy + i}L${xi} ${cy + EYE.h}L${xo} ${cy + EYE.h}Z`, p.skin));
  }
  return out;
}

function mouthParts(e: Expression, p: Pal, stroke: string): Part[] {
  const out: Part[] = [];
  switch (e.mouth) {
    case "smile":
      out.push(lineOf("M-8 28Q3 37 15 24", stroke, FEATURE_W));
      break;
    case "grin":
      out.push(fillOf("M-13 24L17 18Q19 40 3 40Q-10 39 -13 24Z", p.teeth));
      break;
    case "laugh": {
      const x0 = -16, x1 = 18, top = 22, depth = 22, tilt = 6;
      const mid = (x0 + x1) / 2;
      out.push(fillOf(`M${x0} ${top}L${x1} ${top - tilt}Q${x1 + 2} ${top + depth} ${mid} ${top + depth}Q${x0 - 2} ${top + depth} ${x0} ${top}Z`, p.mouth));
      const tr = Math.min(depth * 0.36, (x1 - x0) * 0.22);
      out.push(fillOf(circle(mid + 1, top + depth - tr - 1.5, tr), p.tongue));
      out.push(fillOf(`M${x0 + 1} ${top}L${x1 - 1} ${top - tilt}L${x1 - 1.5} ${top - tilt + 5}L${x0 + 1.5} ${top + 5}Z`, p.teeth));
      break;
    }
    case "flat":
      out.push(lineOf("M-5 30H10", stroke, FEATURE_W));
      break;
    case "sad":
      out.push(lineOf("M-7 34Q3 26 13 33", stroke, FEATURE_W));
      break;
    case "o":
      out.push(fillOf(circle(4, 32, 6.5), p.mouth));
      break;
  }
  return out;
}

function noseParts(spec: NpcSpec, p: Pal): Part[] {
  return spec.nose === "single"
    ? [fillOf(pill(2, -2, 8, 22), p.feature), fillOf(circle(2, 9, 6.5), p.feature)]
    : [fillOf(pill(1, -3, 10, 22), p.feature), fillOf(rrect(-7, 4, 16, 10, 5), p.feature)];
}

function headPath(spec: NpcSpec): string {
  const w = spec.headWidth;
  return spec.head === "capsule" ? rrect(-w / 2, HEAD.top, w, HEAD.height, w / 2) : tomb(0, HEAD.top, w, HEAD.height, 26);
}

const hasEars = (spec: NpcSpec) => spec.hair.style !== "bob" && spec.hair.style !== "wrap";

function faceParts(spec: NpcSpec, e: Expression, p: Pal): Part[] {
  const out: Part[] = [];
  if (hasEars(spec)) out.push(fillOf(circle(-spec.headWidth / 2, 2, 11), p.skin), fillOf(circle(spec.headWidth / 2, 2, 11), p.skin));
  out.push(fillOf(headPath(spec), p.skin));
  const glasses = spec.eyes === "glasses-round" || spec.eyes === "glasses-square";
  const style: EyeStyle = glasses ? "pill" : spec.eyes;
  const happy = e.mouth === "grin" && e.eyes === "open";
  const noseX = spec.nose === "single" ? 2 : 1;
  if (spec.facialHair === "beard") out.push(fillOf(rrect(-spec.headWidth / 2, 20, spec.headWidth, 36, 26), p.hair));
  out.push(...eyeParts(-1, e, p, style, happy, noseX), ...eyeParts(1, e, p, style, happy, noseX), ...noseParts(spec, p));
  if (spec.facialHair === "moustache") out.push(fillOf(pill(1, 18, 38, 11), p.hair));
  // On a beard the mouth is drawn in the skin tone, or it would vanish into the hair.
  out.push(...mouthParts(e, p, spec.facialHair === "beard" ? p.skin : p.feature));
  return out;
}

/** The blink: skin over each eye, with a closed-eye stroke. Faded in by the renderer. */
function lidParts(spec: NpcSpec, p: Pal): Part[] {
  const out: Part[] = [];
  for (const side of [-1, 1] as const) {
    const cx = side * EYE.x;
    const cy = EYE.y;
    if (spec.eyes === "dots") out.push(fillOf(pill(cx, cy + 2, 18, 26), p.skin));
    else if (spec.eyes === "round") out.push(fillOf(circle(cx, cy + 2, 20), p.skin));
    else out.push(fillOf(pill(cx, cy, EYE.w + 6, EYE.h + 6), p.skin));
    out.push(lineOf(`M${cx - 10} ${cy + 3}Q${cx} ${cy + 9} ${cx + 10} ${cy + 3}`, p.feature, FEATURE_W));
  }
  return out;
}

// ── hair, glasses, hats ──────────────────────────────────────────────────────

const CURLS: [number, number, number][] = [
  [-32, -66, 22],
  [-8, -82, 26],
  [22, -80, 25],
  [42, -60, 20],
];

function hairBack(spec: NpcSpec, p: Pal): Part[] {
  return spec.hair.style === "bob" ? [fillOf(tomb(0, -80, 128, 146, 20), p.hair)] : [];
}

/** The fringe: an outer cap (top, height) with the face cut out of it. Its sides end at the top of the ear. */
const HAIR_BASE = { top: -74, height: 64 } as const;
const HAIR_WRAP = { top: -76, height: 66 } as const;

/** Where the hair on the side of the head ends (y). The ear is centred at y 2, so its top is at -9: hair always reaches it. */
export function hairSideBottom(style: HairStyle): number {
  if (style === "bob") return -80 + 146;
  return style === "wrap" ? HAIR_WRAP.top + HAIR_WRAP.height : HAIR_BASE.top + HAIR_BASE.height;
}

function hairFront(spec: NpcSpec, p: Pal): Part[] {
  const base = fillOf(tomb(0, HAIR_BASE.top, 110, HAIR_BASE.height, 8) + topRound(-39, -42, 78, 32, 18), p.hair, true);
  switch (spec.hair.style) {
    case "bob":
      return [fillOf(tomb(0, -75, 112, 42, 0), p.hair)];
    case "curls":
      return [...CURLS.map(([x, y, r]) => fillOf(circle(x, y, r), p.hair)), fillOf(tomb(0, HAIR_BASE.top, 110, HAIR_BASE.height, 8) + topRound(-39, -42, 78, 32, 18), p.hairShade, true)];
    case "bun":
      return [fillOf(circle(0, -88, 22), p.hairShade), base];
    case "wrap":
      // A head wrap: a cap in the wrap colour, with a knot on top.
      return [fillOf(rrect(12, -94, 36, 24, 12), p.hairShade), fillOf(tomb(0, HAIR_WRAP.top, 112, HAIR_WRAP.height, 8) + topRound(-40, -42, 80, 32, 18), p.hair, true)];
    default:
      return [base];
  }
}

function glassesParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.eyes === "glasses-round") {
    return [
      lineOf(circle(-EYE.x, EYE.y, 26), p.glasses, 4.6),
      lineOf(circle(EYE.x, EYE.y, 26), p.glasses, 4.6),
      lineOf(`M${-EYE.x + 26} ${EYE.y}H${EYE.x - 26}`, p.glasses, 4.6),
    ];
  }
  if (spec.eyes === "glasses-square") {
    return [
      lineOf(rrect(-EYE.x - 26, EYE.y - 27, 52, 54, 14), p.glasses, 4.6),
      lineOf(rrect(EYE.x - 26, EYE.y - 27, 52, 54, 14), p.glasses, 4.6),
      lineOf(`M${-EYE.x + 26} ${EYE.y - 6}H${EYE.x - 26}`, p.glasses, 4.6),
    ];
  }
  return [];
}

function hatParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.accent.kind !== "hardhat") return [];
  return [
    fillOf(pill(0, -52, 130, 14), p.accentShade),
    fillOf(tomb(0, -104, 112, 54, 0), p.accent),
    fillOf(rrect(-9, -104, 18, 46, 8), p.accentShade),
    fillOf(circle(30, -78, 7), p.eyeWhite),
  ];
}

// ── body ─────────────────────────────────────────────────────────────────────

function neckParts(p: Pal): Part[] {
  return [fillOf(rrect(-14, 40, NECK.w, 40, 6), p.skin), fillOf(rrect(-14, 40, NECK.w, 14, 6), p.feature)];
}

function torsoParts(spec: NpcSpec, p: Pal, bottom: number = TORSO.bottom, bust = false): Part[] {
  const top = TORSO.top;
  const body = (w: number, color: string) => fillOf(bust ? bustShirt(0, top, w, bottom, BUST_CORNER) : tomb(0, top, w, bottom - top, 30), color);
  const out: Part[] = [];
  switch (spec.outfit.kind) {
    case "sweater":
      out.push(body(TORSO.width, p.top), fillOf(pill(0, 70, 40, 14), p.topShade));
      break;
    case "hoodie":
      out.push(
        fillOf(pill(0, 74, 70, 22), p.topShade),
        body(148, p.top),
        fillOf(pill(0, 72, 46, 16), p.topShade),
        lineOf("M-9 82V108", p.collar, 4.6),
        lineOf("M9 82V104", p.collar, 4.6),
      );
      break;
    case "coat":
      // An open coat over a shirt: the inner shirt is a V, and the coat edges are the lapels.
      out.push(body(TORSO.width, p.top), fillOf(rtri([-30, top - 2], [30, top - 2], [0, 134], 8), p.collar), fillOf(pill(0, 70, 34, 12), p.topShade));
      break;
    case "vest":
      out.push(body(TORSO.width, p.top), fillOf(rtri([-30, top - 2], [30, top - 2], [0, 122], 8), p.collar), fillOf(pill(0, 70, 34, 12), p.collar));
      break;
    case "shirt":
      // A V-neck shirt (work shirt, scrubs): the V shows skin.
      out.push(body(TORSO.width, p.top), fillOf(rtri([-26, top - 2], [26, top - 2], [0, 112], 8), p.skin), fillOf(pill(0, 70, 34, 12), p.topShade));
      break;
  }
  if (spec.accent.kind === "stethoscope") {
    out.push(lineOf("M-30 74Q-38 138 0 142Q38 138 30 74", p.accent, 7), fillOf(circle(0, 146, 11), p.accentShade));
  }
  // The watch is on the wrist, and the bust has no arms
  if (spec.accent.kind === "watch" && !bust) {
    out.push(lineOf("M-26 96Q-14 126 26 122", p.accentShade, 3.4), fillOf(circle(30, 124, 12), p.accent), fillOf(circle(30, 124, 7.5), p.eyeWhite), lineOf("M30 124V119M30 124L34 126", p.pupil, 2.4));
  }
  return out;
}

// ── arms and hands ───────────────────────────────────────────────────────────

type HandKind = "ball" | "thumbsUp" | "point" | "wave";
export type ArmSpec = {
  from: [number, number];
  elbow?: [number, number];
  to: [number, number];
  hand: HandKind;
  side: -1 | 1;
  front?: boolean;
  shadeHand?: boolean;
  handOver?: boolean;
};

/** The sleeve capsule points: shoulder, optional elbow, and the cuff, ARM.cuff short of the hand centre. */
export function armPoints(a: ArmSpec): { points: [number, number][]; cuff: [number, number] } {
  const [hx, hy] = a.to;
  const [bx, by] = a.elbow ?? a.from;
  const len = Math.hypot(hx - bx, hy - by) || 1;
  const ux = (hx - bx) / len;
  const uy = (hy - by) / len;
  const cuff: [number, number] = [hx - ux * ARM.cuff, hy - uy * ARM.cuff];
  return { points: a.elbow ? [a.from, a.elbow, cuff] : [a.from, cuff], cuff };
}

function handParts(a: ArmSpec, p: Pal): Part[] {
  const skin = a.shadeHand ? p.skinShade : p.skin;
  const [hx, hy] = a.to;
  const r = ARM.hand;
  if (a.hand === "wave") {
    // Four short capsules fanned out from the end of the sleeve, no palm shape.
    const { cuff } = armPoints(a);
    const dirAngle = Math.atan2(hy - cuff[1], hx - cuff[0]);
    return [-0.62, -0.2, 0.22, 0.64].map((spread, i) => {
      const ang = dirAngle + spread;
      const len = [34, 44, 44, 36][i];
      return lineOf(`M${f(cuff[0])} ${f(cuff[1])}L${f(cuff[0] + Math.cos(ang) * len)} ${f(cuff[1] + Math.sin(ang) * len)}`, skin, 17);
    });
  }
  const parts: Part[] = [fillOf(circle(hx, hy, r), skin)];
  if (a.hand === "thumbsUp") {
    const tx = hx - a.side * 0.42 * r;
    parts.push(lineOf(`M${f(tx)} ${f(hy)}V${f(hy - r - THUMB_OUT + FINGER_W / 2)}`, skin, FINGER_W));
  }
  if (a.hand === "point") {
    // The finger points sideways, toward the speech bubble. Straight up, a lone finger reads as a rude gesture.
    parts.push(lineOf(`M${f(hx)} ${f(hy)}H${f(hx - a.side * (r + 22))}`, skin, FINGER_W));
  }
  return parts;
}

function sleeveParts(a: ArmSpec, p: Pal): Part[] {
  return [lineOf(`M${armPoints(a).points.map(([x, y]) => `${f(x)} ${f(y)}`).join("L")}`, p.sleeve, ARM.w)];
}

function armParts(a: ArmSpec, p: Pal, only?: "sleeve" | "hand"): Part[] {
  if (only === "sleeve") return sleeveParts(a, p);
  if (only === "hand") return handParts(a, p);
  return [...handParts(a, p), ...sleeveParts(a, p)];
}

// ── held props ───────────────────────────────────────────────────────────────

function heldProp(kind: PropKind, hx: number, hy: number, p: Pal): Part[] {
  switch (kind) {
    case "marble":
      return [fillOf(circle(hx, hy - 34, 19), p.accentShade), fillOf(circle(hx, hy - 36, 19), p.accent), fillOf(circle(hx - 7, hy - 43, 4.5), p.eyeWhite)];
    case "clipboard":
      return [
        fillOf(rrect(hx - 26, hy - 66, 52, 68, 8), p.accentShade),
        fillOf(rrect(hx - 22, hy - 62, 44, 60, 5), p.eyeWhite),
        fillOf(pill(hx, hy - 64, 24, 11), p.accent),
        lineOf(`M${hx - 13} ${hy - 44}H${hx + 13}M${hx - 13} ${hy - 32}H${hx + 13}M${hx - 13} ${hy - 20}H${hx + 4}`, p.accent, 4),
      ];
    case "vial":
      return [
        fillOf(rrect(hx - 11, hy - 58, 22, 52, 11), p.eyeWhite),
        fillOf(rrect(hx - 11, hy - 32, 22, 26, 11), p.accent),
        fillOf(pill(hx, hy - 61, 18, 9), p.accentShade),
      ];
    case "notebook":
      return [
        fillOf(rrect(hx - 25, hy - 62, 50, 64, 8), p.accentShade),
        fillOf(rrect(hx - 20, hy - 62, 45, 64, 8), p.accent),
        fillOf(rrect(hx - 8, hy - 50, 24, 12, 6), p.eyeWhite),
      ];
    default:
      return [];
  }
}

// ── poses ────────────────────────────────────────────────────────────────────

const S = SHOULDER;
const hanging = (side: -1 | 1): ArmSpec => ({ from: [side * S.x, S.y], to: [side * 80, 252], hand: "ball", side });

export type PoseDef = {
  expression: Expression;
  arms: ArmSpec[];
  /** The right hand carries the teacher's held prop. */
  holds?: boolean;
  /** Whether the head may sway in idle life (not when a hand is on the face). */
  sway: boolean;
};

export const POSES: Record<PoseId, PoseDef> = {
  idle: { expression: { eyes: "open", mouth: "smile" }, arms: [hanging(-1), hanging(1)], sway: true },
  greet: {
    expression: { eyes: "open", mouth: "grin" },
    arms: [hanging(-1), { from: [S.x, S.y], elbow: [112, 84], to: [118, 2], hand: "wave", side: 1 }],
    sway: true,
  },
  explain: {
    expression: { eyes: "open", mouth: "laugh", look: [3, 0] },
    arms: [hanging(-1), { from: [S.x, S.y], elbow: [118, 96], to: [112, 30], hand: "ball", side: 1, front: true, handOver: true }],
    holds: true,
    sway: true,
  },
  point: {
    expression: { eyes: "open", mouth: "smile", look: [4, -2] },
    arms: [hanging(-1), { from: [S.x, S.y], elbow: [118, 96], to: [112, 30], hand: "point", side: 1, front: true }],
    sway: true,
  },
  think: {
    expression: { eyes: "open", mouth: "flat", look: [3, -5] },
    arms: [hanging(-1), { from: [S.x, S.y], elbow: [118, 92], to: [40, 58], hand: "ball", side: 1, front: true, shadeHand: true }],
    sway: false,
  },
  proud: {
    expression: { eyes: "open", mouth: "grin" },
    arms: [hanging(-1), { from: [S.x, S.y], elbow: [116, 158], to: [112, 76], hand: "thumbsUp", side: 1 }],
    sway: true,
  },
  cheer: {
    expression: { eyes: "closedHappy", mouth: "laugh" },
    arms: [
      { from: [-S.x, S.y], to: [-128, -42], hand: "ball", side: -1 },
      { from: [S.x, S.y], to: [128, -42], hand: "ball", side: 1 },
    ],
    sway: true,
  },
  sorry: {
    expression: { eyes: "worried", mouth: "sad" },
    arms: [hanging(-1), { from: [S.x, S.y], elbow: [114, 30], to: [30, -50], hand: "ball", side: 1, front: true, shadeHand: true }],
    sway: false,
  },
};

/** What the held-still bust does besides blink: a glance aside, a grin, a glance up the other way. */
export const BUST_MOODS: readonly MoodDef[] = [
  { expression: { eyes: "open", mouth: "smile", look: [-4, 1] }, from: 1100, to: 2150 },
  { expression: { eyes: "open", mouth: "grin" }, from: 3500, to: 5000 },
  { expression: { eyes: "open", mouth: "smile", look: [4, -2] }, from: 6800, to: 7900 },
];

// ── build ────────────────────────────────────────────────────────────────────

export function buildNpc(spec: NpcSpec, pose: PoseId = "idle", form: NpcForm = "hero"): NpcTree {
  const p = paletteOf(spec);
  const def = POSES[pose];
  const bust = form === "bust";
  // The bust is the head and a strip of shirt: no arms, and the shirt ends in rounded corners at the bottom of the crop
  const arms = bust ? [] : def.arms;
  const holdsProp = def.holds && ["marble", "clipboard", "vial", "notebook"].includes(spec.accent.kind);
  const handArm = arms.find((a) => a.handOver);
  const back: Part[] = [
    ...hairBack(spec, p),
    ...arms.filter((a) => !a.front).flatMap((a) => armParts(a, p)),
    ...neckParts(p),
    ...(bust ? torsoParts(spec, p, BUST_BOTTOM, true) : torsoParts(spec, p)),
  ];
  const front: Part[] = [
    ...arms.filter((a) => a.front).flatMap((a) => armParts(a, p, a.handOver ? "sleeve" : undefined)),
    ...(holdsProp && handArm ? heldProp(spec.accent.kind, handArm.to[0], handArm.to[1], p) : []),
    ...arms.filter((a) => a.front && a.handOver).flatMap((a) => armParts(a, p, "hand")),
  ];
  return {
    back,
    face: faceParts(spec, def.expression, p),
    top: [...hairFront(spec, p), ...glassesParts(spec, p), ...hatParts(spec, p)],
    front,
    lids: lidParts(spec, p),
    ...(bust ? { moods: BUST_MOODS.map((m) => ({ face: faceParts(spec, m.expression, p), from: m.from, to: m.to })) } : {}),
  };
}

// ── SVG output (offline sheet, Studio preview) ───────────────────────────────

export function partToSvg(part: Part): string {
  if ("stroke" in part) return `<path d="${part.d}" fill="none" stroke="${part.stroke}" stroke-width="${part.sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<path d="${part.d}" fill="${part.fill}"${part.evenOdd ? ' fill-rule="evenodd"' : ""}/>`;
}

/** The still drawing: back, face, top, front. */
export function treeParts(tree: NpcTree): Part[] {
  return [...tree.back, ...tree.face, ...tree.top, ...tree.front];
}

export function toSvg(tree: NpcTree, form: NpcForm = "hero", size = 1): string {
  const vb = NPC_VIEWBOX[form];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(vb.w * size)}" height="${f(vb.h * size)}" viewBox="${vb.x} ${vb.y} ${vb.w} ${vb.h}">${treeParts(tree).map(partToSvg).join("")}</svg>`;
}
