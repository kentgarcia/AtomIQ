/**
 * motion-core.ts: the pure math of the motion engine (curves, tracks, shaping helpers).
 *
 * Framework-free on purpose (no imports, erasable syntax) so it runs on the UI thread
 * as worklets, in the app, and under `node --test` and the offline art renderers.
 * `motion.ts` adds the Reanimated clocks on top. Copied from rossark-motion-skill's
 * `templates/react-native/motion.ts`, with the Reanimated easings replaced by an
 * equivalent pure cubic-bezier so none of this needs the library.
 */

/** Solve a CSS-style cubic-bezier(x1, y1, x2, y2) at progress x (0 to 1). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number, x: number): number {
  'worklet';
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  // Newton's method for t, with a bisection fallback.
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = ((ax * t + bx) * t + cx) * t - x;
    if (Math.abs(err) < 1e-6) return ((ay * t + by) * t + cy) * t;
    const d = (3 * ax * t + 2 * bx) * t + cx;
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }
  let lo = 0;
  let hi = 1;
  t = x;
  for (let i = 0; i < 24; i++) {
    const v = ((ax * t + bx) * t + cx) * t;
    if (Math.abs(v - x) < 1e-6) break;
    if (v < x) lo = t;
    else hi = t;
    t = (lo + hi) / 2;
  }
  return ((ay * t + by) * t + cy) * t;
}

/** Things that travel (gaze, sway, a head turning, a lid closing). */
export function easeInOut(p: number): number {
  'worklet';
  return cubicBezier(0.77, 0, 0.175, 1, p);
}
/** Things that open or arrive (a mouth, a lid reopening, a prop appearing). */
export function easeOut(p: number): number {
  'worklet';
  return cubicBezier(0.23, 1, 0.32, 1, p);
}
/** Only for things leaving or falling away. Never for something the eye is waiting on. */
export function easeIn(p: number): number {
  'worklet';
  return cubicBezier(0.55, 0, 1, 0.45, p);
}

/** A keyframe: time (ms), value, and the curve of the segment ARRIVING here ('out', or ease-in-out by default). */
export type Key = readonly [number, number, 'out'?];
export type Keys = readonly Key[];

/** The value of a track at time `t`. The last key should equal the first, so loops never jump. */
export function track(t: number, keys: Keys): number {
  'worklet';
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const k1 = keys[i];
    if (t <= k1[0]) {
      const k0 = keys[i - 1];
      const span = k1[0] - k0[0];
      const p = span > 0 ? (t - k0[0]) / span : 1;
      const e = k1[2] === 'out' ? easeOut(p) : easeInOut(p);
      return k0[1] + (k1[1] - k0[1]) * e;
    }
  }
  return keys[keys.length - 1][1];
}

/** A key pose for `flow`: time (ms) and value, sorted by time. */
export type FlowKey = readonly [number, number];

/**
 * A smooth track through key poses, for acting (a body, arms, a head turn).
 * `track` eases in and out of EVERY key, so the motion stops at each one: fine for one
 * move (a blink, a lid), but a chain of poses then reads as stop-and-go, like a robot.
 * `flow` passes through the keys with a continuous speed and never overshoots one
 * (a monotone cubic). Repeat a value to hold, and layer idle life on top of the hold.
 */
export function flow(t: number, k: readonly FlowKey[]): number {
  'worklet';
  const n = k.length;
  if (t <= k[0][0]) return k[0][1];
  if (t >= k[n - 1][0]) return k[n - 1][1];
  let i = 0;
  while (k[i + 1][0] < t) i++;
  function slope(j: number): number {
    return (k[j + 1][1] - k[j][1]) / (k[j + 1][0] - k[j][0]);
  }
  function tangent(j: number): number {
    if (j === 0 || j === n - 1) return 0;
    const a = slope(j - 1);
    const b = slope(j);
    if (a * b <= 0) return 0;
    const h0 = k[j][0] - k[j - 1][0];
    const h1 = k[j + 1][0] - k[j][0];
    const w0 = 2 * h1 + h0;
    const w1 = h1 + 2 * h0;
    return (w0 + w1) / (w0 / a + w1 / b);
  }
  const h = k[i + 1][0] - k[i][0];
  const s = (t - k[i][0]) / h;
  const s2 = s * s;
  const s3 = s2 * s;
  return (
    (2 * s3 - 3 * s2 + 1) * k[i][1] +
    (s3 - 2 * s2 + s) * h * tangent(i) +
    (-2 * s3 + 3 * s2) * k[i + 1][1] +
    (s3 - s2) * h * tangent(i + 1)
  );
}

/** 0 → 1 inside the window [a, b] of a clock (eased), 0 before it, 1 after. One beat of a scene. */
export function seg(t: number, a: number, b: number, curve: 'out' | 'inOut' = 'out'): number {
  'worklet';
  if (t <= a) return 0;
  if (t >= b) return 1;
  const p = (t - a) / (b - a);
  return curve === 'out' ? easeOut(p) : easeInOut(p);
}

/** A smooth back-and-forth from -1 to 1. `phase` (0 to 1) offsets one item from the next. */
export function wave(t: number, period: number, phase = 0): number {
  'worklet';
  return Math.sin((t / period + phase) * Math.PI * 2);
}

/** Progress through a loop, 0 to 1, with a phase (for drifting or falling items). */
export function loop(t: number, period: number, phase = 0): number {
  'worklet';
  const p = (t / period + phase) % 1;
  return p < 0 ? p + 1 : p;
}

/** 0 at both ends of a loop and 1 in the middle: fade in and out (steam, sparkles, ripples). */
export function bell(p: number): number {
  'worklet';
  return Math.sin(Math.PI * Math.min(1, Math.max(0, p)));
}

/** A stable pseudo-random number in [0, 1) for item `i`: variety that is the same every render. */
export function seeded(i: number, salt = 0): number {
  'worklet';
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}


export function lerp(a: number, b: number, k: number): number {
  'worklet';
  return a + (b - a) * k;
}

export function clamp01(v: number): number {
  'worklet';
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
