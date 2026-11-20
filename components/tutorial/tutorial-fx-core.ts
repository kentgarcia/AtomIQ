/**
 * Shrodi's tour, the framework-free maths of the overlay (docs/features/TUTORIAL_SPEC.md §4 and §8): where the
 * hole is and how it is drawn with plain Views, the four touch strips round it, the glide between two
 * holes, the ring's pulse, the pointing hand's bob, the nudge, and which side the bubble goes on.
 * No React, so `scripts/test-tutorial-fx.mjs` runs it under Node. Times are in ms, sizes in dp.
 *
 * The dim has no SVG: one View sized to the hole plus a very wide border, whose inner edge is the
 * rounded hole (`borderHole`). Touch strips (`strips`) are the Views that swallow taps; the hole itself
 * has nothing over it, so a tap there reaches the real control.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Hole extends Rect {
  /** Corner radius of the hole. */
  r: number;
}

/** Extra room round the lit control, so its shadow and lip are inside the hole. */
export const HOLE_PAD = 8;

export const TUTORIAL_FX = {
  /** The dim fading in or out. */
  dimMs: 200,
  /** The hole gliding from one control to the next. */
  glideMs: 260,
  /** The fox pops this long after the overlay starts, then the bubble, then the typing. */
  foxAt: 120,
  bubbleAt: 200,
  /** The ring's pulse and the hand's bob, both loops. */
  ringMs: 1200,
  handMs: 700,
  handTravel: 8,
  /** The dim fade-out when a chapter or intro ends. */
  outMs: 160,
  /** A target must hold still this long before the hole goes to it (a bubble popping, a list scrolling). */
  settleMs: 120,
  /** How often the layer measures the lit view. */
  pollMs: 60,
  /** Once the lit control has held still, it is looked at this often (a scroll or a layout change still moves the hole). */
  restPollMs: 250,
  /** A target that has not appeared after this long gets the fallback. */
  missingMs: 1500,
  /** A `tap` beat's "Got it" fallback appears after this long with the control unreachable. */
  unreachableMs: 3000,
  /** The nudge when the dim is tapped. */
  nudgeMs: 260,
  /** A screen that has just opened is left alone this long before a beat shows (short: a learner can leave before a late beat). */
  screenHoldMs: 300,
  /** The Home map is left alone a little longer: it may be playing its unlock moment after a lesson. */
  homeHoldMs: 700,
  /** After a dialog or celebration clears, the overlay waits this long to come back. */
  busyHoldMs: 250,
  /** After a beat is done, a short hold so the burst reads before the next beat. */
  doneHoldMs: 120,
} as const;

export const easeOut = (p: number): number => {
  "worklet";
  const t = Math.min(1, Math.max(0, p));
  return 1 - Math.pow(1 - t, 3);
};

/** The hole round a control: padded, with a radius that fits (never more than half the short side). */
export function holeFor(target: Rect, opts: { pad?: number; radius?: number | "round" } = {}): Hole {
  const pad = opts.pad ?? HOLE_PAD;
  const w = Math.max(0, target.w + pad * 2);
  const h = Math.max(0, target.h + pad * 2);
  const half = Math.min(w, h) / 2;
  const wanted = opts.radius === "round" ? half : (opts.radius ?? 16);
  return { x: target.x - pad, y: target.y - pad, w, h, r: Math.min(half, Math.max(0, wanted)) };
}

/** A hole `p` of the way (0 to 1, eased out) from `a` to `b`. */
export function glide(a: Hole, b: Hole, p: number): Hole {
  const e = easeOut(p);
  const mix = (m: number, n: number) => m + (n - m) * e;
  return { x: mix(a.x, b.x), y: mix(a.y, b.y), w: mix(a.w, b.w), h: mix(a.h, b.h), r: mix(a.r, b.r) };
}

/**
 * The dim as one View. The View is the hole grown by `border` on every side, with that border in the scrim
 * colour; its radius is `border + r`, so the border's inner edge is the hole's rounded corner. `border` is
 * as wide as the screen's longer side, so the outer rim is off screen whatever the hole's place.
 */
export function borderHole(hole: Hole, screen: { w: number; h: number }): { left: number; top: number; width: number; height: number; borderWidth: number; borderRadius: number } {
  "worklet";
  const border = Math.ceil(Math.max(screen.w, screen.h)) + 2;
  return { left: hole.x - border, top: hole.y - border, width: hole.w + border * 2, height: hole.h + border * 2, borderWidth: border, borderRadius: border + hole.r };
}

/**
 * The move from one hole to the next as a crossfade (no size or place is animated, so nothing lays out or repaints while it runs).
 * `mix` is how far the move has got, 0 to 1. The new dim fades in over the old one during the first half, so the old hole is
 * covered; the old one fades out during the second half, which opens the new hole. At 1 only the new dim shows. The scrim
 * never gets lighter than itself in between, because the old one stays fully opaque while the new one is not yet.
 */
export function dimOpacities(mix: number): { prev: number; next: number } {
  "worklet";
  const m = Math.max(0, Math.min(1, mix));
  return { next: Math.min(1, m * 2), prev: m <= 0.5 ? 1 : Math.max(0, 1 - (m - 0.5) * 2) };
}

/** The four rectangles that swallow touches round the hole: together with the hole they tile the screen. */
export function strips(hole: Rect, screen: { w: number; h: number }): { top: Rect; bottom: Rect; left: Rect; right: Rect } {
  const x0 = Math.max(0, Math.min(screen.w, hole.x));
  const y0 = Math.max(0, Math.min(screen.h, hole.y));
  const x1 = Math.max(x0, Math.min(screen.w, hole.x + hole.w));
  const y1 = Math.max(y0, Math.min(screen.h, hole.y + hole.h));
  return {
    top: { x: 0, y: 0, w: screen.w, h: y0 },
    bottom: { x: 0, y: y1, w: screen.w, h: screen.h - y1 },
    left: { x: 0, y: y0, w: x0, h: y1 - y0 },
    right: { x: x1, y: y0, w: screen.w - x1, h: y1 - y0 },
  };
}

/** The ring round the hole: scale and opacity on a loop (starts at rest, peaks at the middle). */
export function ringFrame(t: number): { scale: number; opacity: number } {
  "worklet";
  const p = (((t % TUTORIAL_FX.ringMs) + TUTORIAL_FX.ringMs) % TUTORIAL_FX.ringMs) / TUTORIAL_FX.ringMs;
  const wave = Math.sin(p * Math.PI); // 0 to 1 and back
  return { scale: 1 + 0.06 * wave, opacity: 1 - 0.55 * wave };
}

/** The pointing hand's offset toward the control (0 to `handTravel`), a loop; `pressed` 0 to 1 sinks it once on a tap. */
export function handFrame(t: number, pressed = 0): { travel: number; press: number } {
  "worklet";
  const p = (((t % TUTORIAL_FX.handMs) + TUTORIAL_FX.handMs) % TUTORIAL_FX.handMs) / TUTORIAL_FX.handMs;
  const travel = TUTORIAL_FX.handTravel * (0.5 - 0.5 * Math.cos(p * Math.PI * 2));
  return { travel, press: Math.min(1, Math.max(0, pressed)) };
}

/** The bubble's sideways shake when the dim is tapped: a damped wobble that ends at rest. */
export function nudgeX(t: number): number {
  "worklet";
  if (t <= 0 || t >= TUTORIAL_FX.nudgeMs) return 0;
  const p = t / TUTORIAL_FX.nudgeMs;
  return Math.sin(p * Math.PI * 4) * 8 * (1 - p);
}

export type BubbleSide = "above" | "below" | "center";

/**
 * Which side of the hole the bubble sits on: below if it fits, else above, else centred (the hole is
 * so big or so central that neither side has room). `reserved` is the bottom the tab bar takes.
 */
export function bubbleSide(hole: Rect | null, screen: { w: number; h: number }, bubbleH: number, opts: { top?: number; bottom?: number; gap?: number } = {}): BubbleSide {
  if (!hole) return "center";
  const top = opts.top ?? 0;
  const bottom = opts.bottom ?? 0;
  const gap = opts.gap ?? 12;
  const below = screen.h - bottom - (hole.y + hole.h) - gap;
  const above = hole.y - top - gap;
  if (below >= bubbleH) return "below";
  if (above >= bubbleH) return "above";
  return "center";
}

/** The bubble's top edge for a side, clamped so it stays on screen. */
export function bubbleTop(side: BubbleSide, hole: Rect | null, screen: { w: number; h: number }, bubbleH: number, opts: { top?: number; bottom?: number; gap?: number } = {}): number {
  const top = opts.top ?? 0;
  const bottom = opts.bottom ?? 0;
  const gap = opts.gap ?? 12;
  const lo = top;
  const hi = Math.max(lo, screen.h - bottom - bubbleH);
  const raw = side === "below" && hole ? hole.y + hole.h + gap : side === "above" && hole ? hole.y - gap - bubbleH : (screen.h - bubbleH) / 2;
  return Math.min(hi, Math.max(lo, raw));
}

/**
 * Whether a measured rectangle has been still for long enough to light: `samples` are `[time, rect]` pairs,
 * newest last. True when the newest `settleMs` of them are the same (within half a dp).
 */
export function isSettled(samples: readonly (readonly [number, Rect])[], settleMs: number = TUTORIAL_FX.settleMs): boolean {
  if (samples.length < 2) return false;
  const [lastAt, last] = samples[samples.length - 1];
  const close = (a: Rect, b: Rect) => Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.w - b.w) < 0.5 && Math.abs(a.h - b.h) < 0.5;
  let sawOld = false;
  for (let i = samples.length - 2; i >= 0; i--) {
    const [at, rect] = samples[i];
    if (!close(rect, last)) return false;
    if (lastAt - at >= settleMs) sawOld = true;
  }
  return sawOld;
}

/** What the layer does about a target that is not (or no longer) there, from how long it has been missing. */
export type MissingAction = "wait" | "fallback" | "step-back";

export function missingAction(missingForMs: number, stable: boolean): MissingAction {
  if (missingForMs < TUTORIAL_FX.missingMs) return "wait";
  return stable ? "fallback" : "step-back";
}

/** Whether the overlay may draw: nothing busy, on the beat's own screen and host, long enough after the last dialog. */
export function mayShow(opts: { busy: number; sinceBusyClearedMs: number; onScreen: boolean; hostMatches: boolean; enabled: boolean }): boolean {
  return opts.enabled && opts.busy === 0 && opts.onScreen && opts.hostMatches && opts.sinceBusyClearedMs >= TUTORIAL_FX.busyHoldMs;
}
