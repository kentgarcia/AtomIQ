/**
 * The motion of a lesson-map node bubble, as pure numbers (no React): measured frame by frame (60 fps)
 * from a reference clip, unit-tested in `scripts/test-path-nodes.mjs`, drawn by `NodeBubble.tsx`.
 *
 * What the clip does:
 *  - POP: the bubble grows out of its pointer from about a third of its size to full size in 12 frames
 *    (200 ms), easing out with no overshoot, fading in over the first two or three frames.
 *  - SHINE: while it settles, a slanted band of light crosses the button, slow at first and faster
 *    towards the end (about 0.7 s), and two small sparkles twinkle on the button's corners.
 *  - PRESS: while the finger is down the whole bubble sinks to 92% and the button takes the bubble's colour.
 *  - LAUNCH: on release the title is gone within 3 frames and the bubble zooms up, accelerating
 *    (ease-in, 7 frames, 120 ms) from 92% to about 145%, going see-through as it grows, while white dots
 *    and four-point sparkles fly out from its edge. The clip then cuts to the next screen; here the
 *    bubble keeps dissolving (to `launchTotalMs`) while the lesson preview, which lives on the map screen,
 *    fades in over it and settles from slightly zoomed (PREVIEW_FX), so the zoom reads as going into the page.
 *
 * Times are ms on a clock that starts at 0 when the thing starts. Everything is a worklet so
 * `useAnimatedStyle` can call it on the UI thread.
 */

export const BUBBLE_FX = {
  popMs: 200,
  popFrom: 0.35,
  /** The pop fades in over this long. */
  popFadeMs: 40,
  /** The band of light is on screen from `sweepStart` to `sweepEnd` (ms after the pop starts). */
  sweepStart: 80,
  sweepEnd: 780,
  /** The band's width as a fraction of the button's width, and how far its bottom leans behind its top (degrees). */
  bandWidth: 0.26,
  bandLean: 16,
  pressScale: 0.92,
  pressMs: 80,
  /** The zoom itself (ease-in) and the whole launch, which ends with the bubble fully faded. */
  launchMs: 120,
  launchTotalMs: 260,
  launchScale: 1.45,
  /** After the zoom the bubble keeps growing this much more, slowly, while it dissolves. */
  launchDrift: 0.12,
  /** The title and the eyebrow are gone this far into the launch. */
  titleGoneMs: 50,
  /** The bubble starts going see-through this far into the launch (0 to 1), and is at `launchOpacityEnd` when it ends. */
  fadeFrom: 0.4,
  launchOpacityEnd: 0.45,
  /** Particles flying out of the edge on launch. */
  particleCount: 8,
  particleReach: 56,
} as const;

const clamp01 = (n: number) => {
  'worklet';
  return Math.min(1, Math.max(0, n));
};

/** Scale and opacity of the pop at `t` ms. */
export function popFrame(t: number): { scale: number; opacity: number } {
  'worklet';
  const p = clamp01(t / BUBBLE_FX.popMs);
  const eased = 1 - (1 - p) * (1 - p) * (1 - p);
  return { scale: BUBBLE_FX.popFrom + (1 - BUBBLE_FX.popFrom) * eased, opacity: clamp01(t / BUBBLE_FX.popFadeMs) };
}

/** The band of light: its left edge as a fraction of the button's width (it starts fully off the left), and whether it is shown. */
export function bandFrame(t: number): { left: number; opacity: number } {
  'worklet';
  const { sweepStart, sweepEnd, bandWidth } = BUBBLE_FX;
  if (t < sweepStart || t >= sweepEnd) return { left: -bandWidth, opacity: 0 };
  const p = (t - sweepStart) / (sweepEnd - sweepStart);
  return { left: -bandWidth + (1 + bandWidth * 2) * p * p, opacity: 1 };
}

/** The two corner sparkles on the button: 0 is top-right (bigger), 1 bottom-left. Size 0 to 1, turning as they grow. */
export function twinkleFrame(i: 0 | 1, t: number): { size: number; rotate: number } {
  'worklet';
  const start = i === 0 ? 260 : 380;
  const life = 420;
  const p = (t - start) / life;
  if (p <= 0 || p >= 1) return { size: 0, rotate: 0 };
  // Up fast, held, down
  const size = p < 0.3 ? p / 0.3 : p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4;
  return { size: (i === 0 ? 1 : 0.65) * size, rotate: p * 90 };
}

/** The lesson preview arriving over the map (and leaving it again): it starts just after the launch does. */
export const PREVIEW_FX = {
  /** ms after the launch starts. */
  delay: 40,
  inMs: 220,
  /** It settles from this scale to 1, as if the zoom carried on into the page. */
  fromScale: 1.08,
  outMs: 180,
  outScale: 0.96,
} as const;

/** The preview arriving: `t` ms after the launch started. */
export function previewInFrame(t: number): { opacity: number; scale: number } {
  'worklet';
  const p = clamp01((t - PREVIEW_FX.delay) / PREVIEW_FX.inMs);
  const eased = 1 - (1 - p) * (1 - p) * (1 - p);
  return { opacity: eased, scale: PREVIEW_FX.fromScale + (1 - PREVIEW_FX.fromScale) * eased };
}

/** The preview leaving (closed, or covered by the lesson): `t` ms after it started to leave. */
export function previewOutFrame(t: number): { opacity: number; scale: number } {
  'worklet';
  const p = clamp01(t / PREVIEW_FX.outMs);
  const eased = 1 - (1 - p) * (1 - p);
  return { opacity: 1 - eased, scale: 1 + (PREVIEW_FX.outScale - 1) * eased };
}

/** The press: 0 (finger up) to 1 (finger down) gives the scale. */
export function pressScale(press: number): number {
  'worklet';
  return 1 + (BUBBLE_FX.pressScale - 1) * clamp01(press);
}

/** The launch at `t` ms: the bubble's scale and opacity and the title's opacity. */
export function launchFrame(t: number): { scale: number; opacity: number; titleOpacity: number } {
  'worklet';
  const { launchMs, launchTotalMs, launchDrift, pressScale: from, launchScale, titleGoneMs, fadeFrom, launchOpacityEnd } = BUBBLE_FX;
  const p = clamp01(t / launchMs);
  const fade = clamp01((p - fadeFrom) / (1 - fadeFrom));
  // After the zoom: keep growing a little and dissolve the rest of the way
  const tail = clamp01((t - launchMs) / (launchTotalMs - launchMs));
  return {
    scale: from + (launchScale - from) * p * p + launchDrift * tail,
    opacity: (1 - (1 - launchOpacityEnd) * fade) * (1 - tail),
    titleOpacity: 1 - clamp01(t / titleGoneMs),
  };
}

/**
 * One particle of the launch burst, `i` of `particleCount`: it starts on the bubble's edge at an
 * angle all round and flies outward, shrinking and fading in the last part. Even ones are dots, odd ones
 * sparkles. `x`/`y` are offsets from the point on the edge, in dp; `dx`/`dy` give the direction.
 */
export function particleFrame(i: number, t: number): { x: number; y: number; scale: number; opacity: number; kind: "dot" | "star" } {
  'worklet';
  const { launchMs, particleCount, particleReach } = BUBBLE_FX;
  const p = clamp01(t / launchMs);
  const angle = (i / particleCount) * Math.PI * 2 + 0.4;
  const out = 1 - (1 - p) * (1 - p);
  // Every other one goes a little further, so the burst is not a ring
  const reach = particleReach * (i % 2 === 0 ? 1 : 0.7);
  return {
    x: Math.cos(angle) * reach * out,
    y: Math.sin(angle) * reach * out,
    scale: t <= 0 ? 0 : 1 - 0.4 * p,
    opacity: t <= 0 ? 0 : p < 0.6 ? 1 : 1 - (p - 0.6) / 0.4,
    kind: i % 2 === 0 ? "dot" : "star",
  };
}
