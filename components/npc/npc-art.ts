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

import { MOUTHS, NOSES, browPieces, earPieces, type BrowStyle, type EarStyle, type FacePiece, type MouthStyle, type NoseStyle } from "./face-art.ts";
import { EXTRA_OUTFIT_ART, isExtraOutfit, type ExtraOutfit, type OutfitTone } from "./outfit-art.ts";
import { EARWEAR, EYEWEAR, HEADWEAR, type WearPiece, type WearTone } from "./wear-art.ts";
import { shapedHair, type ExtraHairStyle, type HairPiece, type TeacherHairStyle } from "./hair-art.ts";
import { APRON_PIECES, APRON_PUFFS, type ApronTone } from "./lab-apron-art.ts";
import { SATCHEL_PIECES, samplePieces, type SatchelTone } from "./hal-art.ts";
import { HARDHAT_PIECES, TOOL_BELT_PIECES, blueprintPieces, type BlueprintTone, type HardhatTone, type ToolBeltTone } from "./kofi-art.ts";
import { STETHOSCOPE_PIECES, doseCardPieces, type DoseCardTone, type StethoscopeTone } from "./mina-art.ts";
import { COUNTER_PIECES, clipboardPieces, type ClipboardTone, type CounterTone } from "./ray-art.ts";
import { FOLIO_BAG_PIECES, notebookPieces, type FolioBagTone, type NotebookTone } from "./sage-art.ts";
import { GADGET_PACK_PIECES, vialPieces, type GadgetPackTone, type VialTone } from "./tess-art.ts";
import { CUSTOM, FACE, MUTE_CLOTHES_STEP, MUTE_DARK, MUTE_LIGHT, MUTE_SEPARATION, OFFICIAL } from "./npc-palette.ts";

// ── spec ─────────────────────────────────────────────────────────────────────

export type EyeStyle = "pill" | "round" | "glasses-round" | "glasses-square" | "dots" | "wide" | "sparkle" | "lashes" | "sleepy" | "arches" | "anime" | "power";
export type HairStyle = "bob" | "curls" | "crop" | "bun" | "wrap" | ExtraHairStyle | TeacherHairStyle;
/** `apron` is Ada's lab outfit (a teacher's own: the shop does not sell it). */
export type OutfitKind = "sweater" | "hoodie" | "coat" | "vest" | "shirt" | "apron" | ExtraOutfit;
export type PropKind = "none" | "marble" | "watch" | "clipboard" | "stethoscope" | "hardhat" | "vial" | "notebook" | "flask" | "sample";

export type NpcSpec = {
  skin: { base: string; shade: string; feature: string };
  head: "tombstone" | "capsule";
  /** 92 to 108 (variety). */
  headWidth: number;
  eyes: EyeStyle;
  nose: NoseStyle;
  /** Optional face parts (the avatar sets them; the teachers keep the defaults: no brows, the resting smile, round ears). */
  brows?: BrowStyle;
  mouth?: MouthStyle;
  ears?: EarStyle;
  /** Optional colours (hex) the avatar sets: the brows (else the hair's shade), the pupils (else the face ink) and the nose (else the skin's feature colour). */
  browColor?: string;
  pupilColor?: string;
  noseColor?: string;
  /** Round cheeks in this colour (Ada has them; the rest none). */
  blush?: string;
  /** The colour of the teacher's cover and chat header, when it should not be the outfit's (Hal's outfit is a white coat over a blue sweater, his brand is yellow). */
  cover?: { color: string; shade: string };
  hair: { style: HairStyle; color: string; shade: string };
  /** Worn on the head, over the eyes and on the ears (the avatar sets them, the teachers wear none): a style from `wear-art.ts` and its colour. */
  headwear?: WearSpec;
  eyewear?: WearSpec;
  earwear?: WearSpec;
  facialHair?: "moustache" | "beard";
  outfit: { kind: OutfitKind; color: string; shade: string; /** shirt or inner colour (coat, vest, shirt) */ collar?: string };
  /** The prop and its colours. */
  accent: { kind: PropKind; color: string; shade: string };
  /** Set by `mutedSpec`: the face colours (pupil, mouth, tongue) are muted too. */
  muted?: boolean;
};

/** An accessory: the style id (a key of `HEADWEAR`, `EYEWEAR` or `EARWEAR`) and the colour of its `main` and `shade` pieces. */
export type WearSpec = { style: string; color: string; shade: string };

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
  /** The face close up, for the shop tiles of eyebrows, eyes, nose, mouth and ears. */
  face: { x: -68, y: -64, w: 136, h: 136 },
  /** The ears and the side of the head, for the shop tiles of earrings and earmuffs. */
  ears: { x: -80, y: -48, w: 160, h: 160 },
  /** Neck, shoulders and the top of the arms, for the shop tiles of clothes. */
  chest: { x: -84, y: 30, w: 168, h: 168 },
  /** The `avatar` crop with more body under it (same width and scale), for the shop's big preview: it continues behind the panel, so when it squashes and bounces no cut-off shirt shows. */
  preview: { x: -110, y: -112, w: 220, h: 280 },
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
  const sleeve = o.kind === "vest" || (isExtraOutfit(o.kind) && EXTRA_OUTFIT_ART[o.kind].sleeve === "collar") ? o.collar ?? FACE.teeth : o.color;
  return {
    skin: spec.skin.base, skinShade: spec.skin.shade, feature: spec.skin.feature,
    hair: spec.hair.color, hairShade: spec.hair.shade,
    top: o.color, topShade: o.shade, sleeve, collar: o.collar ?? FACE.teeth,
    accent: spec.accent.color, accentShade: spec.accent.shade,
    glasses: spec.muted ? muteColor(FACE.pupil) : FACE.pupil,
    eyeWhite: FACE.eyeWhite,
    pupil: spec.muted ? muteColor(spec.pupilColor ?? FACE.pupil) : (spec.pupilColor ?? FACE.pupil),
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
    ...(spec.headwear ? { headwear: { ...spec.headwear, color: m(spec.headwear.color), shade: m(spec.headwear.shade) } } : {}),
    ...(spec.eyewear ? { eyewear: { ...spec.eyewear, color: m(spec.eyewear.color), shade: m(spec.eyewear.shade) } } : {}),
    ...(spec.earwear ? { earwear: { ...spec.earwear, color: m(spec.earwear.color), shade: m(spec.earwear.shade) } } : {}),
    ...(spec.browColor ? { browColor: m(spec.browColor) } : {}),
    ...(spec.noseColor ? { noseColor: m(spec.noseColor) } : {}),
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
  if (style === "arches") return [lineOf(`M${kx - 11} ${cy + 5}Q${kx} ${cy - 10} ${kx + 11} ${cy + 5}`, p.feature, FEATURE_W)];
  if (style === "dots") {
    out.push(fillOf(pill(cx + lx * 0.6, cy + 2 + ly * 0.6, 14, 22), p.pupil));
    out.push(fillOf(circle(cx + lx * 0.6 - 2, cy - 4 + ly * 0.6, 2.6), p.eyeWhite));
    return out;
  }
  if (style === "round" || style === "wide" || style === "sparkle") {
    const R = style === "wide" ? 21 : 18;
    const pr = style === "wide" ? 10.5 : style === "sparkle" ? 9.5 : 8;
    out.push(fillOf(circle(cx, cy + 2, R), p.eyeWhite));
    out.push(fillOf(circle(cx - side * 2 + lx, cy - 3 + ly, pr), p.pupil));
    out.push(fillOf(circle(cx - side * 2 + lx - 2.6, cy - 6 + ly, 2.6), p.eyeWhite));
    if (style === "sparkle") out.push(fillOf(circle(cx - side * 2 + lx + 3.6, cy + 1.8 + ly, 1.5), p.eyeWhite));
  } else {
    out.push(fillOf(pill(cx, cy, EYE.w, EYE.h), p.eyeWhite));
    const top = cy - EYE.h / 2 + 7 + ly;
    const px = cx + lx - side * 2.5;
    out.push(fillOf(pill(px, top + EYE.ph / 2, EYE.pw, EYE.ph), p.pupil));
    out.push(fillOf(circle(px - EYE.pw * 0.22, top + EYE.shine + 1.6, EYE.shine), p.eyeWhite));
    if (style === "lashes") {
      for (const [x1, y1, x2, y2] of [[13, -14, 22, -19], [15, -7, 24.5, -9], [13, -21, 18.5, -29]] as const) out.push(lineOf(`M${f(cx + side * x1)} ${cy + y1}L${f(cx + side * x2)} ${cy + y2}`, p.feature, 3.4));
    }
    if (style === "sleepy") {
      out.push(fillOf(`M${cx - 18} ${cy - 22}H${cx + 18}V${cy - 3}H${cx - 18}Z`, p.skin), lineOf(`M${cx - 15} ${cy - 3}H${cx + 15}`, p.feature, FEATURE_W));
    }
    if (style === "anime") {
      out.push(
        fillOf(pill(px, top + EYE.ph / 2, EYE.pw + 2, EYE.ph + 2), p.pupil),
        fillOf(circle(px - 3, top + 4.8, 3.6), p.eyeWhite),
        fillOf(circle(px + 3, top + 13.5, 1.8), p.eyeWhite),
        lineOf(`M${f(cx - 14)} ${cy - 18}Q${cx} ${cy - 22} ${f(cx + 14)} ${cy - 18}`, p.feature, 4),
      );
    }
    if (style === "power") {
      out.push(
        fillOf(`M${cx - 18} ${cy - 22}H${cx + 18}V${cy - 12}L${cx - side * 18} ${cy - 18}Z`, p.skin),
        lineOf(`M${f(cx + side * 15)} ${cy - 19}L${f(cx - side * 15)} ${cy - 12}`, p.feature, 4),
        fillOf(circle(px, top + 7, 3.2), p.eyeWhite),
      );
    }
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

/** A piece of the face (face-art.ts) in the palette's colour for its tone. */
/** The brow and nose colours of a face: the avatar's own, or the hair's shade and the skin's feature colour. */
type FaceColors = { brow: string; nose: string };

function facePart(piece: FacePiece, p: Pal, stroke: string, cols: FaceColors = { brow: p.hairShade, nose: p.feature }): Part {
  const color = { skin: p.skin, nose: cols.nose, feature: p.feature, stroke, mouth: p.mouth, teeth: p.teeth, tongue: p.tongue, brow: cols.brow }[piece.tone];
  return "line" in piece ? lineOf(piece.line, color, piece.w ?? FEATURE_W) : fillOf(piece.d, color);
}

function mouthParts(e: Expression, p: Pal, stroke: string, style: MouthStyle = "smile"): Part[] {
  const out: Part[] = [];
  switch (e.mouth) {
    case "smile":
      out.push(...MOUTHS[style].map((piece) => facePart(piece, p, stroke)));
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
  const color = spec.noseColor ?? p.feature;
  const own = NOSES[spec.nose];
  if (own) return own.map((piece) => facePart(piece, p, p.feature, { brow: p.hairShade, nose: color }));
  return spec.nose === "single"
    ? [fillOf(pill(1.5, 2, 8.5, 19), color)]
    : [fillOf(pill(1, 1, 8.5, 19), color), fillOf(pill(-1, 7.5, 13, 8.5), color)];
}

function headPath(spec: NpcSpec): string {
  const w = spec.headWidth;
  return spec.head === "capsule" ? rrect(-w / 2, HEAD.top, w, HEAD.height, w / 2) : tomb(0, HEAD.top, w, HEAD.height, 26);
}

const hasEars = (spec: NpcSpec) => {
  const style = spec.hair.style;
  const shaped = shapedHair(style);
  if (shaped) return shaped.ears !== false;
  return style !== "bob" && style !== "wrap";
};

function faceParts(spec: NpcSpec, e: Expression, p: Pal): Part[] {
  const out: Part[] = [];
  if (hasEars(spec)) for (const side of [-1, 1] as const) out.push(...earPieces(spec.ears ?? "round", spec.headWidth / 2, side).map((piece) => facePart(piece, p, p.feature)));
  out.push(fillOf(headPath(spec), p.skin));
  const glasses = spec.eyes === "glasses-round" || spec.eyes === "glasses-square";
  const style: EyeStyle = glasses ? "pill" : spec.eyes;
  const happy = e.mouth === "grin" && e.eyes === "open";
  const noseX = spec.nose === "single" ? 2 : 1;
  if (spec.facialHair === "beard") {
    const w = spec.headWidth;
    out.push(
      fillOf(rrect(-w / 2, 2, 11, 36, 5.5), p.hair),
      fillOf(rrect(w / 2 - 11, 2, 11, 36, 5.5), p.hair),
      fillOf(rrect(-w / 2, 18, w, 38, 26), p.hair),
    );
  }
  out.push(...eyeParts(-1, e, p, style, happy, noseX), ...eyeParts(1, e, p, style, happy, noseX), ...noseParts(spec, p));
  // After the eyes: their happy-cheek cut (skin over the bottom of the eye) reaches this far and would cover part of the cheeks
  if (spec.blush) for (const side of [-1, 1] as const) out.push(fillOf(pill(side * 35, 24, 20, 13), spec.muted ? muteColor(spec.blush) : spec.blush));
  if (spec.facialHair === "moustache") out.push(fillOf(pill(1, 18, 38, 11), p.hair));
  // On a beard the mouth is drawn in the skin tone, or it would vanish into the hair.
  out.push(...mouthParts(e, p, spec.facialHair === "beard" ? p.skin : p.feature, spec.mouth));
  out.push(...browPieces(spec.brows ?? "none").map((piece) => facePart(piece, p, p.feature, { brow: spec.browColor ?? p.hairShade, nose: p.feature })));
  return out;
}

/** The blink: skin over each eye, with a closed-eye stroke. Faded in by the renderer. */
function lidParts(spec: NpcSpec, p: Pal): Part[] {
  const out: Part[] = [];
  for (const side of [-1, 1] as const) {
    const cx = side * EYE.x;
    const cy = EYE.y;
    if (spec.eyes === "dots") out.push(fillOf(pill(cx, cy + 2, 18, 26), p.skin));
    else if (spec.eyes === "round" || spec.eyes === "wide" || spec.eyes === "sparkle") out.push(fillOf(circle(cx, cy + 2, 20), p.skin));
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

/** A hand-drawn piece (hair-art.ts) in the hair colour or its shade. */
const hairTone = (tone: HairPiece["tone"], p: Pal) => (tone === "hair" ? p.hair : tone === "tie" ? p.top : tone === "accent" ? p.accent : tone === "accentShade" ? p.accentShade : p.hairShade);
const hairPiece = (piece: HairPiece, p: Pal): Part => {
  const color = hairTone(piece.tone, p);
  return "line" in piece ? lineOf(piece.line, color, piece.w) : fillOf(piece.d, color, piece.evenOdd);
};

const CROP_OUTER = "M-56 -15.5V-50C-58 -76 -38 -88 -8 -89L-1 -96C18 -95 40 -88 51 -73C56 -65 56 -56 56 -50V-15.5Z";
const CROP_INNER = "M-45 -15.5V-32C-38 -43 -18 -51 6 -48C26 -45 39 -40 45 -32V-15.5Z";
const BUN_OUTER = "M-56 -15.5V-48C-56 -78 -34 -86 0 -86C34 -86 56 -78 56 -48V-15.5Z";
const BUN_INNER = "M-45 -15.5V-29C-45 -37 -34 -41 -22 -45C-10 -49 -4 -54 0 -60C4 -54 10 -49 22 -45C34 -41 45 -37 45 -29V-15.5Z";

function hairBack(spec: NpcSpec, p: Pal): Part[] {
  const style = spec.hair.style;
  const shape = shapedHair(style);
  if (shape) {
    // Behind the head: each cap's whole outline in its colour, so no gap can show where its face cut-out is wider than the head
    const unders = shape.front.flatMap((piece): Part[] => ("under" in piece && piece.under ? [fillOf(piece.under, hairTone(piece.tone, p))] : []));
    return [...(shape.back ?? []).map((piece) => hairPiece(piece, p)), ...unders];
  }
  if (style === "bob") return [fillOf(tomb(0, -80, 128, 146, 20), p.hair)];
  if (style === "bun") {
    return [
      fillOf(pill(-48, 12, 14, 38), p.hairShade),
      fillOf(pill(48, 12, 14, 38), p.hairShade),
      fillOf(circle(0, -95, 24), p.hairShade),
      fillOf(circle(-1, -92, 21.5), p.hair),
      fillOf(BUN_OUTER, p.hair),
    ];
  }
  if (style === "crop" || style === "curls") return [fillOf(CROP_OUTER, style === "curls" ? p.hairShade : p.hair)];
  return [];
}

/** The fringe: an outer cap (top, height) with the face cut out of it. Its sides end at the top of the ear. */
const HAIR_BASE = { top: -74, height: 64 } as const;
const HAIR_WRAP = { top: -76, height: 66 } as const;

/** Where the hair on the side of the head ends (y). The ear is centred at y 2, so its top is at -9: hair always reaches it. */
export function hairSideBottom(style: HairStyle): number {
  const shaped = shapedHair(style);
  if (shaped) return shaped.sideBottom;
  if (style === "bob") return -80 + 146;
  return style === "wrap" ? HAIR_WRAP.top + HAIR_WRAP.height : HAIR_BASE.top + HAIR_BASE.height;
}

function hairFront(spec: NpcSpec, p: Pal): Part[] {
  const shaped = shapedHair(spec.hair.style);
  if (shaped) return shaped.front.map((piece) => hairPiece(piece, p));
  const tips = (color: string) => [fillOf(circle(-50.5, -15.5, 5.5), color), fillOf(circle(50.5, -15.5, 5.5), color)];
  switch (spec.hair.style) {
    case "bob":
      return [fillOf(tomb(0, -75, 112, 42, 0), p.hair)];
    case "curls":
      return [
        ...CURLS.map(([x, y, r]) => fillOf(circle(x, y, r), p.hair)),
        fillOf(CROP_OUTER + CROP_INNER, p.hairShade, true),
        ...tips(p.hairShade),
      ];
    case "bun":
      return [
        fillOf(BUN_OUTER + BUN_INNER, p.hair, true),
        ...tips(p.hair),
        fillOf(pill(0, -81, 30, 8.5), p.top),
        lineOf("M-14 -67Q-6 -61 0 -60", p.hairShade, 3.4),
        lineOf("M14 -67Q6 -61 0 -60", p.hairShade, 3.4),
      ];
    case "wrap":
      // A head wrap: a cap in the wrap colour, with a knot on top.
      return [fillOf(rrect(12, -94, 36, 24, 12), p.hairShade), fillOf(tomb(0, HAIR_WRAP.top, 112, HAIR_WRAP.height, 8) + topRound(-40, -42, 80, 32, 18), p.hair, true)];
    default:
      return [
        fillOf(CROP_OUTER + CROP_INNER, p.hair, true),
        ...tips(p.hair),
        lineOf("M-23 -78Q-17 -64 -11 -49", p.hairShade, 3.4),
      ];
  }
}

function glassesParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.eyes === "glasses-round") {
    return [
      lineOf(circle(-23.5, EYE.y, 21.5), p.glasses, 4.6),
      lineOf(circle(23.5, EYE.y, 21.5), p.glasses, 4.6),
      lineOf("M-2 -10H2", p.glasses, 4.6),
      lineOf("M-45 -10L-51 -9", p.glasses, 4.6),
      lineOf("M45 -10L51 -9", p.glasses, 4.6),
    ];
  }
  if (spec.eyes === "glasses-square") {
    return [
      lineOf(rrect(-45, EYE.y - 23, 43, 46, 12), p.glasses, 4.6),
      lineOf(rrect(2, EYE.y - 23, 43, 46, 12), p.glasses, 4.6),
      lineOf("M-2 -14H2", p.glasses, 4.6),
      lineOf("M-45 -12L-52 -10", p.glasses, 4.6),
      lineOf("M45 -12L52 -10", p.glasses, 4.6),
    ];
  }
  return [];
}

/** The fixed colours of an accessory's own details (a gem, a pearl, a lens). */
const WEAR_FIXED: Record<Exclude<WearTone, "main" | "shade">, string> = { white: FACE.eyeWhite, swan: OFFICIAL.swan, ink: FACE.pupil, gold: OFFICIAL.bee, red: OFFICIAL.cardinal, blue: OFFICIAL.macaw, green: OFFICIAL.featherGreen, pink: OFFICIAL.flamingo };

function wearParts(table: Record<string, WearPiece[]>, wear: WearSpec | undefined, spec: NpcSpec): Part[] {
  const pieces = wear ? table[wear.style] : undefined;
  if (!wear || !pieces) return [];
  const colorOf = (tone: WearTone) => {
    const c = tone === "main" ? wear.color : tone === "shade" ? wear.shade : WEAR_FIXED[tone];
    return spec.muted && tone !== "main" && tone !== "shade" ? muteColor(c) : c;
  };
  return pieces.map((piece): Part => ("line" in piece ? lineOf(piece.line, colorOf(piece.tone), piece.w) : fillOf(piece.d, colorOf(piece.tone), piece.evenOdd)));
}

function hatParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.accent.kind !== "hardhat") return [];
  const fixed: Record<HardhatTone, string> = {
    dome: p.accent,
    brim: p.accentShade,
    white: p.eyeWhite,
    core: spec.muted ? muteColor(OFFICIAL.macaw) : OFFICIAL.macaw,
    bolt: p.accent,
  };
  return HARDHAT_PIECES.map((piece) => fillOf(piece.d, fixed[piece.tone]));
}

// ── body ─────────────────────────────────────────────────────────────────────

function neckParts(p: Pal): Part[] {
  return [fillOf(rrect(-14, 40, NECK.w, 40, 6), p.skin), fillOf(rrect(-14, 40, NECK.w, 14, 6), p.feature)];
}

/** Hal's satchel (the kit that goes with his rock sample): the strap over the shoulder and the bag at the hip. The bust shows just the top of the strap. */
function satchelParts(spec: NpcSpec): Part[] {
  if (spec.accent.kind !== "sample") return [];
  const fixed: Record<SatchelTone, string> = { strap: OFFICIAL.grizzly, bag: OFFICIAL.grizzly, bagShade: CUSTOM.skinBrown[1], badge: OFFICIAL.bee, ink: FACE.pupil };
  return SATCHEL_PIECES.map((piece) => fillOf(piece.d, spec.muted ? muteColor(fixed[piece.tone]) : fixed[piece.tone]));
}

/** Mina's clinician stethoscope draped round the neck: the diaphragm chestpiece on the right chest, the binaural earpieces on the left. */
function stethoscopeParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.accent.kind !== "stethoscope") return [];
  const colorOf = (tone: StethoscopeTone): string => (tone === "tube" ? p.accent : tone === "chestRim" ? p.accentShade : p.eyeWhite);
  return STETHOSCOPE_PIECES.map((piece): Part => ("line" in piece ? lineOf(piece.line, colorOf(piece.tone), piece.w) : fillOf(piece.d, colorOf(piece.tone))));
}

/** Sage's policy research folio bag: the cross-body strap over their right shoulder and the hip folio with tabs and a balance-scale emblem. */
function folioBagParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.accent.kind !== "notebook") return [];
  const fixed: Record<FolioBagTone, string> = {
    strap: p.accentShade,
    bag: p.accent,
    bagShade: p.accentShade,
    white: FACE.eyeWhite,
    gold: OFFICIAL.bee,
    leaf: OFFICIAL.featherGreen,
  };
  return FOLIO_BAG_PIECES.map((piece) => fillOf(piece.d, spec.muted && piece.tone !== "white" ? muteColor(fixed[piece.tone]) : fixed[piece.tone]));
}

/** Kofi's engineer tool pouch: the cross-body strap over his right shoulder and the hip pouch with a wrench and power bolt. */
function toolBeltParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.accent.kind !== "hardhat") return [];
  const fixed: Record<ToolBeltTone, string> = {
    strap: OFFICIAL.narwhal,
    pouch: OFFICIAL.narwhal,
    pouchTop: OFFICIAL.humpback,
    metal: OFFICIAL.anchovy,
    bolt: p.accent,
  };
  return TOOL_BELT_PIECES.map((piece) => fillOf(piece.d, spec.muted ? muteColor(fixed[piece.tone]) : fixed[piece.tone]));
}

/** Tess's portable field gadget pack: the cross-body strap over her right shoulder and the scanner pack with antenna at her hip. */
function gadgetPackParts(spec: NpcSpec, p: Pal): Part[] {
  if (spec.accent.kind !== "vial") return [];
  const fixed: Record<GadgetPackTone, string> = {
    strap: OFFICIAL.narwhal,
    pack: OFFICIAL.narwhal,
    packTop: p.topShade,
    screen: p.accent,
    led: OFFICIAL.bee,
    white: FACE.eyeWhite,
  };
  return GADGET_PACK_PIECES.map((piece) => fillOf(piece.d, spec.muted && piece.tone !== "white" ? muteColor(fixed[piece.tone]) : fixed[piece.tone]));
}

/** Ray's hand-held radiation counter: the utility strap over his right shoulder and the holstered counter with its probe at his hip. */
function counterParts(spec: NpcSpec): Part[] {
  if (spec.accent.kind !== "clipboard") return [];
  const fixed: Record<CounterTone, string> = {
    strap: OFFICIAL.butterfly,
    probeTip: OFFICIAL.fox,
    counter: OFFICIAL.bee,
    counterShade: OFFICIAL.fox,
    white: FACE.eyeWhite,
    needle: OFFICIAL.cardinal,
    ink: FACE.pupil,
  };
  return COUNTER_PIECES.map((piece) => fillOf(piece.d, spec.muted && piece.tone !== "white" ? muteColor(fixed[piece.tone]) : fixed[piece.tone]));
}

/** A cool, slightly darker step of a colour: the lapels and pockets of a pale coat (white goes to a pale blue, never grey). */
function coolShade(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const to = [122, 155, 176];
  return rgbToHex([r, g, b].map((v, i) => v * 0.8 + to[i] * 0.2));
}

function torsoParts(spec: NpcSpec, p: Pal, bottom: number = TORSO.bottom, bust = false): Part[] {
  const top = TORSO.top;
  const bodyColor = isExtraOutfit(spec.outfit.kind) && EXTRA_OUTFIT_ART[spec.outfit.kind].body === "collar" ? p.collar : p.top;
  const body = (w: number, color: string) => fillOf(bust ? bustShirt(0, top, w, bottom, BUST_CORNER) : tomb(0, top, w, bottom - top, 30), color);
  const out: Part[] = [];
  if (isExtraOutfit(spec.outfit.kind)) {
    out.push(body(TORSO.width, bodyColor));
    const outfitColor = (tone: OutfitTone) => {
      switch (tone) {
        case "main": return p.top;
        case "shade": return p.topShade;
        case "collar": return p.collar;
        case "skin": return p.skin;
        case "white": return FACE.eyeWhite;
        case "swan": return OFFICIAL.swan;
        case "gold": return OFFICIAL.bee;
        case "red": return OFFICIAL.cardinal;
        case "pink": return OFFICIAL.flamingo;
        case "collarShade": return coolShade(p.collar);
        case "tan": return OFFICIAL.cheetah;
        case "tanShade": return OFFICIAL.monkey;
        case "violet": return OFFICIAL.beetle;
        case "violetShade": return OFFICIAL.betta;
        case "ink": return FACE.pupil;
        case "blue": return OFFICIAL.humpback;
      }
    };
    for (const piece of EXTRA_OUTFIT_ART[spec.outfit.kind].pieces) {
      const raw = outfitColor(piece.tone);
      const color = spec.muted && piece.tone !== "white" ? muteColor(raw) : raw;
      out.push("line" in piece ? lineOf(piece.line, color, piece.w) : fillOf(piece.d, color, piece.evenOdd));
    }
    out.push(...satchelParts(spec), ...counterParts(spec), ...stethoscopeParts(spec, p), ...gadgetPackParts(spec, p), ...toolBeltParts(spec, p), ...folioBagParts(spec, p));
    return out;
  }
  switch (spec.outfit.kind) {
    case "sweater":
      out.push(
        body(TORSO.width, p.top),
        fillOf(pill(0, 71, 48, 17), p.topShade),
        ...[-14, -7, 0, 7, 14].map((x) => lineOf(`M${x} 66V76`, p.top, 2.4)),
        fillOf(pill(0, 66, 34, 9), p.collar),
        lineOf("M-38 92V145", p.topShade, 3.4),
        lineOf("M38 92V145", p.topShade, 3.4),
      );
      break;
    case "hoodie":
      out.push(
        fillOf(pill(0, 73, 76, 24), p.topShade),
        body(148, p.top),
        fillOf(rtri([-13, 73], [13, 73], [0, 91], 3), p.topShade),
        fillOf(pill(0, 71, 48, 16), p.topShade),
        fillOf(rrect(-36, 122, 72, 34, 10), p.topShade),
        fillOf(rrect(-30, 126, 60, 26, 7), p.top),
        lineOf("M-11 79V101", p.collar, 4.6),
        lineOf("M11 79V97", p.collar, 4.6),
        fillOf(circle(-11, 102, 3.4), p.topShade),
        fillOf(circle(11, 98, 3.4), p.topShade),
      );
      break;
    case "coat":
      // A varsity jacket: striped rib-knit collar, contrast snap-button placket, angled welt pockets and a golden chest patch.
      out.push(
        body(TORSO.width, p.top),
        fillOf(pill(0, 70, 50, 18), p.topShade),
        fillOf(pill(0, 69, 38, 8), p.collar),
        fillOf(rrect(-7, 77, 14, bottom - 77, 4), p.topShade),
        ...[90, 108, 126, 144].map((y) => fillOf(circle(0, y, 3.2), p.eyeWhite)),
        fillOf(rrect(18, 92, 24, 24, 6), spec.muted ? muteColor(OFFICIAL.bee) : OFFICIAL.bee),
        fillOf(circle(30, 104, 6), p.topShade),
        fillOf(circle(30, 104, 2.5), p.eyeWhite),
        lineOf("M-40 124L-26 142", p.collar, 4),
        lineOf("M40 124L26 142", p.collar, 4),
      );
      break;
    case "vest":
      // A preppy argyle sweater vest over a collared shirt: V-neck shirt inset, white collar flaps, ribbed V-trim and chest diamonds.
      out.push(
        body(TORSO.width, p.top),
        fillOf(rtri([-30, top - 2], [30, top - 2], [0, 124], 8), p.collar),
        lineOf("M-28 70L0 120L28 70", p.topShade, 7),
        fillOf(rtri([-26, 66], [-4, 71], [-14, 90], 4), p.eyeWhite),
        fillOf(rtri([26, 66], [4, 71], [14, 90], 4), p.eyeWhite),
        fillOf(circle(0, 86, 2.4), p.eyeWhite),
        fillOf(circle(0, 100, 2.4), p.eyeWhite),
        ...[-34, 0, 34].map((x) => fillOf(`M${x} 126L${x + 11} 138L${x} 150L${x - 11} 138Z`, p.topShade)),
        ...[-17, 17].map((x) => fillOf(`M${x} 131L${x + 7} 138L${x} 145L${x - 7} 138Z`, p.eyeWhite)),
      );
      break;
    case "apron": {
      // Ada's lab outfit: puffed shoulders behind the arms' sleeves, then the apron, collar and badge over a shirt in the outfit colour
      const apronColor = (tone: ApronTone) => {
        const fixed = { white: FACE.eyeWhite, mint: OFFICIAL.snow, apronShade: OFFICIAL.monkey } as const;
        switch (tone) {
          case "shirt": return p.top;
          case "shirtShade": return p.topShade;
          case "apron": return p.collar;
          case "badge": return p.accent;
          case "badgeInk": return p.accentShade;
          default: return spec.muted ? muteColor(fixed[tone]) : fixed[tone];
        }
      };
      out.push(body(TORSO.width, p.top));
      if (!bust) for (const piece of APRON_PUFFS) out.push(fillOf(piece.d, apronColor(piece.tone)));
      for (const piece of APRON_PIECES) out.push(fillOf(piece.d, apronColor(piece.tone)));
      break;
    }
    case "shirt":
      // A Henley shirt: contrast ringer neckband, 3-button placket and a stitched chest pocket with white welt trim.
      out.push(
        body(TORSO.width, p.top),
        fillOf(rrect(-7, 74, 14, 46, 5), p.topShade),
        fillOf(pill(0, 70, 48, 16), p.eyeWhite),
        fillOf(pill(0, 67, 32, 10), p.skin),
        ...[85, 97, 109].map((y) => fillOf(circle(0, y, 2.6), p.eyeWhite)),
        fillOf(rrect(18, 102, 28, 28, 6), p.topShade),
        fillOf(rrect(18, 102, 28, 7, 3), p.eyeWhite),
      );
      break;
  }
  out.push(...satchelParts(spec), ...counterParts(spec), ...stethoscopeParts(spec, p), ...gadgetPackParts(spec, p), ...toolBeltParts(spec, p), ...folioBagParts(spec, p));
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

function heldProp(kind: PropKind, hx: number, hy: number, p: Pal, muted = false): Part[] {
  switch (kind) {
    case "marble":
      return [fillOf(circle(hx, hy - 34, 19), p.accentShade), fillOf(circle(hx, hy - 36, 19), p.accent), fillOf(circle(hx - 7, hy - 43, 4.5), p.eyeWhite)];
    case "clipboard": {
      const toneOf = (tone: ClipboardTone): string => {
        switch (tone) {
          case "board": return p.accent;
          case "boardShade": return p.accentShade;
          case "paper": return p.eyeWhite;
          case "clip": return p.pupil;
          case "check": return p.top === OFFICIAL.featherGreen ? OFFICIAL.macaw : p.pupil;
          case "rule": return p.topShade;
          case "star": return p.accent;
          case "penCap": return p.mouth;
        }
      };
      return clipboardPieces(hx, hy).map((piece) => fillOf(piece.d, toneOf(piece.tone)));
    }
    case "vial": {
      const toneOf = (tone: VialTone): string => (tone === "glass" ? OFFICIAL.iguana : tone === "liquid" ? p.accent : tone === "cap" ? p.topShade : tone === "capTop" ? p.accentShade : p.eyeWhite);
      return [
        ...vialPieces(hx, hy).map((piece) => fillOf(piece.d, toneOf(piece.tone))),
        lineOf(`M${hx - 22} ${hy - 54}L${hx - 29} ${hy - 60}M${hx + 22} ${hy - 54}L${hx + 29} ${hy - 60}M${hx + 24} ${hy - 38}H${hx + 32}`, p.accent, 4),
      ];
    }
    case "flask": {
      // A round-bottomed flask with a glowing green liquid, sat on the raised hand: glass, liquid, a pale shine and a few sparks
      const y = hy - 18;
      return [
        fillOf(rrect(hx - 10, y - 78, 20, 38, 6), OFFICIAL.iguana),
        fillOf(pill(hx, y - 79, 30, 10), p.accentShade),
        fillOf(`M${hx - 10} ${y - 46}H${hx + 10}L${hx + 33} ${y - 12}Q${hx + 38} ${y} ${hx + 22} ${y}H${hx - 22}Q${hx - 38} ${y} ${hx - 33} ${y - 12}Z`, OFFICIAL.iguana),
        fillOf(`M${hx - 27} ${y - 24}Q${hx} ${y - 32} ${hx + 27} ${y - 24}L${hx + 33} ${y - 12}Q${hx + 38} ${y} ${hx + 22} ${y}H${hx - 22}Q${hx - 38} ${y} ${hx - 33} ${y - 12}Z`, p.accent),
        fillOf(rrect(hx - 18, y - 40, 5, 14, 2.5), OFFICIAL.snow),
        fillOf(circle(hx + 8, y - 13, 4.6), OFFICIAL.snow),
        fillOf(circle(hx - 9, y - 8, 2.6), OFFICIAL.snow),
        lineOf(`M${hx - 36} ${y - 64}L${hx - 43} ${y - 72}M${hx + 36} ${y - 64}L${hx + 43} ${y - 72}M${hx - 40} ${y - 50}H${hx - 50}M${hx + 40} ${y - 50}H${hx + 50}`, p.accent, 4),
      ];
    }
    case "sample":
      // A rock sample held up on the hand, with a few sparks off it
      return [
        ...samplePieces(hx, hy).map((piece) => fillOf(piece.d, piece.tone === "main" ? p.accent : p.accentShade)),
        lineOf(`M${hx - 24} ${hy - 62}L${hx - 30} ${hy - 70}M${hx + 24} ${hy - 62}L${hx + 30} ${hy - 70}M${hx} ${hy - 68}V${hy - 77}`, OFFICIAL.bee, 4),
      ];
    case "notebook": {
      const gold = muted ? muteColor(OFFICIAL.bee) : OFFICIAL.bee;
      const leaf = muted ? muteColor(OFFICIAL.featherGreen) : OFFICIAL.featherGreen;
      const toneOf = (tone: NotebookTone): string => {
        switch (tone) {
          case "cover": return p.accent;
          case "coverShade": return p.accentShade;
          case "white": return p.eyeWhite;
          case "gold": return gold;
          case "leaf": return leaf;
          case "coral": return p.top;
          case "rule": return p.accentShade;
        }
      };
      return notebookPieces(hx, hy).map((piece) => fillOf(piece.d, toneOf(piece.tone)));
    }
    case "stethoscope": {
      const toneOf = (tone: DoseCardTone): string => {
        switch (tone) {
          case "frame": return p.accent;
          case "frameShade": return p.accentShade;
          case "paper": return p.eyeWhite;
          case "heart": return p.tongue;
          case "low": return p.top;
          case "mid": return p.accent;
          case "high": return p.accentShade;
          case "rule": return p.topShade;
        }
      };
      return doseCardPieces(hx, hy).map((piece) => fillOf(piece.d, toneOf(piece.tone)));
    }
    case "hardhat": {
      const bp = muted ? muteColor(OFFICIAL.humpback) : OFFICIAL.humpback;
      const bpShade = muted ? muteColor(OFFICIAL.narwhal) : OFFICIAL.narwhal;
      const bpRoll = muted ? muteColor(OFFICIAL.blueJay) : OFFICIAL.blueJay;
      const toneOf = (tone: BlueprintTone): string => (tone === "bp" ? bp : tone === "bpShade" ? bpShade : tone === "bpRoll" ? bpRoll : tone === "bolt" ? p.accent : p.eyeWhite);
      return blueprintPieces(hx, hy).map((piece) => fillOf(piece.d, toneOf(piece.tone)));
    }
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
  const holdsProp = def.holds && ["marble", "clipboard", "vial", "notebook", "flask", "sample", "stethoscope", "hardhat"].includes(spec.accent.kind);
  const handArm = arms.find((a) => a.handOver);
  const back: Part[] = [
    ...hairBack(spec, p),
    ...arms.filter((a) => !a.front).flatMap((a) => armParts(a, p)),
    ...neckParts(p),
    ...(bust ? torsoParts(spec, p, BUST_BOTTOM, true) : torsoParts(spec, p)),
  ];
  const front: Part[] = [
    ...arms.filter((a) => a.front).flatMap((a) => armParts(a, p, a.handOver ? "sleeve" : undefined)),
    ...(holdsProp && handArm ? heldProp(spec.accent.kind, handArm.to[0], handArm.to[1], p, Boolean(spec.muted)) : []),
    ...arms.filter((a) => a.front && a.handOver).flatMap((a) => armParts(a, p, "hand")),
  ];
  return {
    back,
    face: faceParts(spec, def.expression, p),
    top: [
      ...hairFront(spec, p),
      ...wearParts(EARWEAR, spec.earwear, spec),
      ...glassesParts(spec, p),
      ...wearParts(EYEWEAR, spec.eyewear, spec),
      ...hatParts(spec, p),
      ...wearParts(HEADWEAR, spec.headwear, spec),
    ],
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
