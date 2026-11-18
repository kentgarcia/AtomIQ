/**
 * Geometry of a lesson-map node: the round face on its lip, the swirl lines on the face and
 * the progress ring around the current node. Pure numbers and path strings, so the layout is
 * unit-tested (`scripts/test-path-nodes.mjs`) and the component only draws it.
 *
 * The 2.5D look is a cheat drawn on the node itself (the map stays flat, so scrolling and taps
 * are untouched): a puck seen from above. The face is an ellipse `disc` wide and `faceH` tall, the
 * side is a band `lip` deep in a darker shade, nothing else (no shadow).
 * The glyph is squashed with the face, as if lying on it.
 */

export const NODE = {
  /** The box a node takes on the map (the path code centres on it). */
  box: 80,
  /** Width of the face. */
  disc: 72,
  /** Height of the face: the ellipse is the disc seen from above. */
  faceH: 62,
  /** Depth of the side band under the face. */
  lip: 10,
  /** How far the face sinks when pressed (the side still shows 10 - 6 = 4 px). */
  press: 6,
  /** Size of the glyph on the face. */
  glyph: 40,
  /** Ring around the current node. */
  ring: { radius: 47, stroke: 7, box: 116 },
} as const;

/** The patch the fireflies drift in: tight around the current node and its ring. */
export const FIREFLY_AREA = { width: 150, height: 150, count: 9 } as const;

/** Vertical squash of the face. */
export const FACE_SQUASH = NODE.faceH / NODE.disc;
/** Centre of the whole puck (face and side) from the top of the box: the ring and fireflies centre here. */
export const PUCK_CENTER_Y = (NODE.faceH + NODE.lip) / 2;

/** Left edge of the face inside the box (the face is centred horizontally). */
export const DISC_LEFT = (NODE.box - NODE.disc) / 2;

const r2 = (v: number) => Math.round(v * 100) / 100;

/** A point on a circle, angle in degrees clockwise from 3 o'clock. */
export function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [r2(cx + r * Math.cos(a)), r2(cy + r * Math.sin(a))];
}

/** An open arc from `startDeg` to `endDeg`, clockwise. */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const sweep = (((endDeg - startDeg) % 360) + 360) % 360;
  return `M${x1} ${y1}A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/** The soft swirl lines on a face: concentric arcs, kept clear of the glyph in the middle. */
export function swirlArcs(): { d: string; sw: number }[] {
  const c = NODE.disc / 2;
  return [
    { d: arcPath(c, c, 29.5, 196, 292), sw: 3.4 },
    { d: arcPath(c, c, 23.5, 22, 118), sw: 3.4 },
    { d: arcPath(c, c, 29.5, 24, 54), sw: 3.4 },
  ];
}

/** Progress as 0 to 1; anything else (NaN, negative, above 1) is pulled into range. */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export interface RingGeometry {
  /** Centre of the ring inside its own box. */
  cx: number;
  cy: number;
  radius: number;
  stroke: number;
  circumference: number;
  /** `strokeDasharray` for the progress arc, which starts at 12 o'clock (rotate the circle -90). */
  dash: [number, number];
  /** Where the arc ends, for the round marker. */
  end: [number, number];
  /** Where the arc starts (always 12 o'clock). */
  start: [number, number];
}

export function ringGeometry(progress: number): RingGeometry {
  const p = clampProgress(progress);
  const { radius, stroke, box } = NODE.ring;
  const c = box / 2;
  const circumference = 2 * Math.PI * radius;
  return {
    cx: c,
    cy: c,
    radius,
    stroke,
    circumference,
    dash: [r2(circumference * p), r2(circumference)],
    start: polar(c, c, radius, -90),
    end: polar(c, c, radius, -90 + 360 * p),
  };
}
