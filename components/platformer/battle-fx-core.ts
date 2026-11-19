/**
 * The battle on the map, as pure maths (no React), unit-tested (`npm run test:platformer`). When the
 * hero touches an enemy the world freezes, the view zooms in on the pair, a question is asked, and
 * the answer plays out as a short fight in the language of the app's other one-shots (see
 * `duolingo-motion-style`): anticipation, a lunge, contact with a hang (hit-stop) while it squashes,
 * a recoil, a settle. One clock, in ms, starts the moment the answer is given:
 *
 *   "attack" (a right answer): the hero crouches (0..110), lunges at the enemy (110..230), hits it
 *     (230, held 60 ms) and the enemy squashes, flies back (290..520) and returns;
 *     the hero cheers.
 *   "hurt" (a wrong answer): the enemy crouches, lunges at the hero, hits (230) and the hero flashes
 *     red, squashes and is thrown back (230..520), then returns; the screen shakes, a heart breaks.
 *
 * Offsets are in TILES (`dx` is signed, along the ground: `dir` is +1 when the enemy stands to the
 * hero's right), scales are 1 at rest, `flash` is 0..1. The pictures read these from the frame array
 * (`fillFrame` in platformer-view.ts). Frame 0 and the last frame are the resting pose, so nothing
 * is left displaced.
 */

import { CLIPS, modeFrame } from "./hero-anim-core.ts";
import { bell, clamp01, easeOut, flow, lerp, seeded, seg } from "../motion/motion-core.ts";

export type FxKind = "attack" | "hurt";

export const FX = {
  /** The moment of contact, ms after the answer. */
  contact: 230,
  attackMs: 1000,
  hurtMs: 1100,
  /** The view zooms in over this long, and out over this. */
  zoomIn: 340,
  zoomOut: 260,
} as const;

export const fxTotal = (kind: FxKind): number => (kind === "attack" ? FX.attackMs : FX.hurtMs);

export interface FxBody {
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  flash: number;
}

export interface FxPose {
  hero: FxBody;
  enemy: FxBody;
  /** A frame of the hero's sheet to show instead of the walking one, or null to leave it. */
  heroFrame: number | null;
}

const REST: FxBody = { dx: 0, dy: 0, sx: 1, sy: 1, flash: 0 };
export const NO_FX: FxPose = { hero: REST, enemy: REST, heroFrame: null };

const C = FX.contact;

/** The fight at `t` ms. `dir` is +1 when the enemy is on the hero's right, -1 on the left; `lethal` sends the beaten enemy further. */
export function fxPose(kind: FxKind, t: number, dir: 1 | -1, lethal: boolean = false): FxPose {
  'worklet';
  if (t <= 0 || t >= fxTotal(kind)) return NO_FX;
  if (kind === "attack") {
    const heroForward = flow(t, [[0, 0], [110, -0.2], [C, 0.34], [330, 0.3], [600, 0], [1000, 0]]);
    const far = lethal ? 0.95 : 0.55;
    const enemyAway = flow(t, [[0, 0], [C + 60, 0], [520, far], [850, lethal ? far : 0], [1000, lethal ? far : 0]]);
    const frame =
      t < 110 ? CLIPS.idle.start : t < 300 ? CLIPS.apex.start : modeFrame("cheer", t - 300);
    return {
      hero: {
        dx: heroForward * dir,
        dy: flow(t, [[0, 0], [110, 0], [170, -0.26], [C, -0.1], [330, 0], [1000, 0]]),
        sx: flow(t, [[0, 1], [110, 1.08], [C, 1.12], [300, 1], [1000, 1]]),
        sy: flow(t, [[0, 1], [110, 0.88], [C, 0.92], [300, 1.06], [420, 1], [1000, 1]]),
        flash: 0,
      },
      enemy: {
        dx: enemyAway * dir,
        dy: flow(t, [[0, 0], [C + 60, 0], [380, -0.32], [520, lethal ? -0.1 : 0], [1000, 0]]),
        sx: flow(t, [[0, 1], [C, 1], [C + 20, 1.26], [330, 0.86], [450, 1.04], [600, 1], [1000, 1]]),
        sy: flow(t, [[0, 1], [C, 1], [C + 20, 0.74], [330, 1.16], [450, 0.98], [600, 1], [1000, 1]]),
        // A beaten enemy does not flash: only the hero does, when hurt
        flash: 0,
      },
      heroFrame: frame,
    };
  }
  const enemyForward = flow(t, [[0, 0], [110, -0.16], [C, 0.34], [330, 0.3], [650, 0], [1100, 0]]);
  const heroBack = flow(t, [[0, 0], [C, 0], [520, -0.72], [800, -0.72], [1100, 0]]);
  return {
    hero: {
      dx: heroBack * dir,
      dy: flow(t, [[0, 0], [C, 0], [330, -0.34], [480, 0], [1100, 0]]),
      sx: flow(t, [[0, 1], [C, 1], [C + 20, 1.22], [340, 0.88], [470, 1.03], [600, 1], [1100, 1]]),
      sy: flow(t, [[0, 1], [C, 1], [C + 20, 0.78], [340, 1.12], [470, 0.98], [600, 1], [1100, 1]]),
      flash: C <= t ? 1 - seg(t, C + 40, 480) : 0,
    },
    enemy: {
      dx: -enemyForward * dir,
      dy: flow(t, [[0, 0], [110, 0], [170, -0.24], [C, -0.04], [330, 0], [1100, 0]]),
      sx: flow(t, [[0, 1], [110, 1.08], [C, 0.94], [300, 1], [1100, 1]]),
      sy: flow(t, [[0, 1], [110, 0.88], [C, 1.08], [300, 1], [1100, 1]]),
      flash: 0,
    },
    heroFrame: t < C ? CLIPS.idle.start : CLIPS.hit.start + (t - C < 170 ? 0 : 1),
  };
}

/* ------------------------------ effects ------------------------------ */

/** A little push on the zoom at the moment of contact (added to the zoom's scale). */
export function zoomPunch(t: number): number {
  'worklet';
  if (t <= C || t >= C + 200) return 0;
  return 0.05 * bell((t - C) / 200);
}

/** Camera shake in px along x: a hurt shakes hard, a hit only a little, both die away. */
export function camShake(kind: FxKind, t: number): number {
  'worklet';
  const start = C;
  const span = kind === "hurt" ? 420 : 220;
  const p = (t - start) / span;
  if (p <= 0 || p >= 1) return 0;
  const amp = kind === "hurt" ? 7 : 2.5;
  return amp * Math.sin(p * 4 * Math.PI * 2) * (1 - p);
}

/** The red wash over the screen when the hero is hurt: 0..0.28. */
export function vignette(kind: FxKind, t: number): number {
  'worklet';
  if (kind !== "hurt") return 0;
  return 0.28 * seg(t, C, C + 30, 'out') * (1 - seg(t, C + 30, C + 460, 'inOut'));
}

export const IMPACT_LINES = 8;

export interface LineFrame {
  /** Distance of the line's middle from the centre, px. */
  dist: number;
  /** Length, px. */
  length: number;
  /** Degrees. */
  angle: number;
  opacity: number;
}

const NO_LINE: LineFrame = { dist: 0, length: 0, angle: 0, opacity: 0 };

/** Impact line `i`: a short dash that flies out of the point of contact and thins away, 260 ms. */
export function impactLine(i: number, t: number, reach: number = 52): LineFrame {
  'worklet';
  const p = (t - C) / 260;
  if (p <= 0 || p >= 1) return NO_LINE;
  const angle = ((i + 0.25 * seeded(i, 41)) / IMPACT_LINES) * 360;
  const out = easeOut(clamp01(p / 0.8));
  return {
    dist: lerp(14, reach * lerp(0.85, 1.1, seeded(i, 42)), out),
    length: lerp(16, 4, p) * lerp(0.8, 1.2, seeded(i, 43)),
    angle,
    opacity: 1 - clamp01((p - 0.45) / 0.55),
  };
}

export interface HeartFrame {
  y: number;
  scale: number;
  opacity: number;
  rotate: number;
}

const NO_HEART: HeartFrame = { y: 0, scale: 0.6, opacity: 0, rotate: 0 };

/** The heart that breaks off the hero when a wrong answer hurts: pops out, rises and fades, 700 ms. */
export function lostHeart(t: number, rise: number = 46): HeartFrame {
  'worklet';
  const p = (t - (C + 30)) / 700;
  if (p <= 0 || p >= 1) return NO_HEART;
  const out = easeOut(clamp01(p / 0.7));
  return {
    y: -rise * out,
    scale: lerp(0.5, 1.15, easeOut(clamp01(p / 0.25))) * lerp(1, 0.85, clamp01((p - 0.5) / 0.5)),
    opacity: clamp01(p / 0.08) * (1 - clamp01((p - 0.55) / 0.45)),
    rotate: lerp(0, -18, out),
  };
}

/* ------------------------------ the zoom ------------------------------ */

export interface ZoomPlan {
  scale: number;
  /** Where the view moves to, px, on top of scaling about the middle of the area. */
  tx: number;
  ty: number;
}

/**
 * The zoom that brings the pair (centred on `focus`, `pairW` px wide, both in unzoomed screen px) to
 * `target` in an area `areaW` by `areaH`, scaling about the area's middle: a point p lands at
 * middle + scale * (p - middle) + (tx, ty), so the focus lands exactly on the target.
 */
export const zoomPlan = (opts: { focus: { x: number; y: number }; pairW: number; areaW: number; areaH: number; target: { x: number; y: number }; min?: number; max?: number }): ZoomPlan => {
  const { focus, pairW, areaW, areaH, target, min = 1.4, max = 2.2 } = opts;
  const scale = Math.max(min, Math.min(max, (areaW * 0.62) / Math.max(1, pairW)));
  const cx = areaW / 2;
  const cy = areaH / 2;
  return { scale, tx: target.x - cx - scale * (focus.x - cx), ty: target.y - cy - scale * (focus.y - cy) };
};
