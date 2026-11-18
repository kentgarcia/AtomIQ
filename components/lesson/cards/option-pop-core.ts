/**
 * The "pop" of a lesson option button, as pure maths (no React), so the timeline is unit-tested
 * (`scripts/test-option-pop.mjs`) and `shared.tsx` only draws it. It plays once when an option
 * becomes selected or correct.
 *
 * The keyframes are measured frame by frame from a 60 fps reference (one row per frame; t = 0 is
 * the frame the finger lifts and the colour flips, which is instant, not a cross-fade):
 *
 *     0 ..  17   at rest
 *    33 ..  83   anticipation: the face squashes to ~72% height, a little wider, sinking toward its lip
 *   100 .. 117   it springs up tall and narrow (about 115% x 96%)
 *   117 .. 300   it hangs ~13 dp up, slightly tall, on a visible slab of lip
 *   300 .. 400   it falls, stretching, to the lip
 *   400          lands squashed (about 90% height, 102% width)
 *   417 .. 550   a small rebound hop (~4 dp) and a hang
 *   567          at rest
 *   117 .. 400   a slanted band of light accelerates across (ease-in), two sparkles twinkle
 *
 * Only the face SHAPE (fill and border) takes the squash and stretch; the label never scales.
 * Vertical offsets are fractions of the face height (so they suit any button); the component caps
 * them for tall cards. The last frame is the plain button, so reduced motion simply skips the pop.
 */

/** [t ms, vertical offset (fraction of face height, down +), width scale, height scale]. */
type Key = readonly [number, number, number, number];

// One row per video frame (16.67 ms apart), from the frame the finger lifts.
const FACE_KEYS: readonly Key[] = [
  [17, 0.02, 1, 1],
  [33, 0.09, 1.017, 0.8],
  [50, 0.108, 1.022, 0.743],
  [67, 0.118, 1.022, 0.723],
  [83, 0.122, 1.022, 0.716],
  [100, -0.12, 0.96, 1.15],
  [117, -0.213, 0.983, 1.115],
  [133, -0.23, 0.984, 1.09],
  [150, -0.243, 0.992, 1.07],
  [167, -0.25, 0.995, 1.055],
  [183, -0.257, 1, 1.04],
  [283, -0.257, 1, 1.04],
  [300, -0.247, 1, 1.047],
  [317, -0.236, 1, 1.054],
  [333, -0.216, 1, 1.068],
  [350, -0.196, 1, 1.08],
  [367, -0.16, 1, 1.14],
  [383, -0.085, 1, 1.155],
  [400, 0.04, 1.02, 0.905],
  [417, -0.017, 1.005, 0.99],
  [433, -0.054, 1, 1.01],
  [450, -0.07, 1, 1.047],
  [467, -0.074, 1, 1.027],
  [483, -0.078, 1, 1.03],
  [500, -0.081, 1, 1.04],
  [517, -0.081, 1, 1.04],
  [533, -0.074, 1, 1.027],
  [550, -0.05, 1, 1.03],
  [567, 0, 1, 1],
];

/** When the whole pop is over. */
export const POP_TOTAL = 567;

/**
 * What an option's pop clock does when the option's state changes from `before` to `after`:
 *  - "start": becoming selected or correct plays the pop from the beginning;
 *  - "rest":  any other change puts the clock at the end (`POP_TOTAL`), so a pop that was still playing
 *    (an instant-graded answer is selected for one frame, then wrong; a pick changed to another) is not
 *    left frozen half way, squashed and lifted off its base;
 *  - "none":  nothing changed.
 * Reduced motion never pops, so it always rests.
 */
export function popAction(before: string, after: string, reducedMotion: boolean): "start" | "rest" | "none" {
  if (reducedMotion) return "rest";
  if (before === after) return "none";
  return after === "selected" || after === "correct" ? "start" : "rest";
}

export const POP = {
  /** The band of light is on screen from here to `sweepEnd`. */
  sweepStart: 117,
  sweepEnd: 400,
  /** The band's width as a fraction of the button's width. */
  bandWidth: 0.233,
  /** How far the bottom of the band leans behind its top, degrees. */
  bandLean: 16,
} as const;

export interface FaceFrame {
  /** Offset as a fraction of the face height (negative = up). */
  y: number;
  /** Width scale of the face shape. */
  sx: number;
  /** Height scale of the face shape. */
  sy: number;
}

/** The face shape at time `t`, starting from `from` (the pressed offset, as a fraction of its height). */
export function faceFrame(t: number, from: number): FaceFrame {
  'worklet';
  if (t <= 0) return { y: from, sx: 1, sy: 1 };
  if (t >= POP_TOTAL) return { y: 0, sx: 1, sy: 1 };
  let ay = from;
  let ax = 1;
  let ah = 1;
  let at = 0;
  for (let i = 0; i < FACE_KEYS.length; i++) {
    const k = FACE_KEYS[i];
    if (t <= k[0]) {
      const p = (t - at) / (k[0] - at);
      return { y: ay + (k[1] - ay) * p, sx: ax + (k[2] - ax) * p, sy: ah + (k[3] - ah) * p };
    }
    at = k[0];
    ay = k[1];
    ax = k[2];
    ah = k[3];
  }
  return { y: 0, sx: 1, sy: 1 };
}

/** [t ms, left edge of the band as a fraction of the button's width]. It accelerates: ease-in. */
const BAND_KEYS: readonly (readonly [number, number])[] = [
  [117, -0.03],
  [133, 0.0],
  [150, 0.034],
  [167, 0.067],
  [183, 0.104],
  [200, 0.138],
  [217, 0.17],
  [233, 0.21],
  [250, 0.254],
  [267, 0.295],
  [283, 0.347],
  [300, 0.407],
  [317, 0.478],
  [333, 0.556],
  [350, 0.655],
  [367, 0.79],
  [383, 0.93],
  [400, 1.05],
];

/** The band of light: its left edge (fraction of the button's width) and whether it is on screen. */
export function bandFrame(t: number): { left: number; opacity: number } {
  'worklet';
  const { sweepStart, sweepEnd } = POP;
  if (t < sweepStart || t >= sweepEnd) return { left: -1, opacity: 0 };
  for (let i = 1; i < BAND_KEYS.length; i++) {
    const a = BAND_KEYS[i - 1];
    const b = BAND_KEYS[i];
    if (t <= b[0]) return { left: a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]), opacity: 1 };
  }
  return { left: 1.05, opacity: 1 };
}

/** [t ms, size 0..1] for each corner sparkle: 0 is the top-left (big), 1 the bottom-right (smaller). */
const STAR_KEYS: readonly (readonly (readonly [number, number])[])[] = [
  [[117, 0], [133, 0.1], [150, 0.55], [167, 0.7], [183, 0.85], [200, 0.92], [217, 0.95], [233, 1], [317, 1], [333, 0.95], [350, 0.93], [367, 0.78], [383, 0.62], [400, 0.38], [417, 0.2], [433, 0]],
  [[100, 0], [117, 0.1], [133, 0.1], [150, 0.7], [167, 0.8], [183, 0.9], [200, 1], [333, 1], [350, 0.95], [367, 0.85], [383, 0.7], [400, 0.4], [417, 0.15], [433, 0]],
];
/** The bottom-right sparkle peaks at this fraction of the top-left one's size. */
export const STAR_RELATIVE = [1, 0.65] as const;

/** A corner sparkle at time `t`: its size (0 = gone) and a slow turn. */
export function starFrame(i: 0 | 1, t: number): { size: number; rotate: number } {
  'worklet';
  const keys = STAR_KEYS[i];
  const first = keys[0][0];
  const last = keys[keys.length - 1][0];
  if (t <= first || t >= last) return { size: 0, rotate: 0 };
  let size = 0;
  for (let k = 1; k < keys.length; k++) {
    const a = keys[k - 1];
    const b = keys[k];
    if (t <= b[0]) {
      size = a[1] + ((b[1] - a[1]) * (t - a[0])) / (b[0] - a[0]);
      break;
    }
  }
  const p = (t - first) / (last - first);
  return { size: size * STAR_RELATIVE[i], rotate: (-20 + 30 * p) * (i === 0 ? 1 : -1) };
}
