/**
 * The phone's illustrated wallpapers: five flat, calm scenes in the lesson object style (project skill `duolingo-object-style`: flat colour,
 * no outlines or gradients, rounded shapes, bands of colour for light, a lighter tone for glow). Pure data with no framework imports, so
 * Node tests can check it and `scripts/render-wallpapers.mjs` can draw a contact sheet. Each is one 100 x 200 portrait frame, drawn
 * `slice` (it fills the screen and loses a little of its sides or ends on other shapes), so the picture is built with a calm middle,
 * where the app icons sit, and its few shapes towards the edges and the bottom. A wallpaper that competes with the icons (many small
 * pictures, hard contrast across the middle) does not belong here. Colours are fixed hues, the same in light and dark mode
 * (theme exception EX-13); `base` is the colour behind the picture and `ink` the colour for text on it.
 */

import {
  BEE,
  CRUMB,
  EEL,
  FOX,
  GLASS,
  LEAF,
  PINK,
  PLUM,
  RED,
  SEA,
  SNOW,
  circle,
  line,
  path,
  pill,
  rect,
} from "../lesson/visual/object-art.ts";
import { darken } from "../lesson/visual/color-math.ts";
import type { ScanShape } from "../scanner/scan-scenes.ts";
import type { WallpaperId } from "./wallpaper-core.ts";

export const WALLPAPER_FRAME = { w: 100, h: 200 } as const;

export interface Wallpaper {
  id: WallpaperId;
  name: string;
  /** The colour behind the picture (the phone's background while it loads, and the page colour round it). */
  base: string;
  /** The colour of text and icons on the header. */
  ink: string;
  shapes: readonly ScanShape[];
}

const f = (n: number) => Math.round(n * 100) / 100;

/** A closed path that follows a wave along its top edge and is filled down to the bottom of the frame. */
function waveFill(top: number, amp: number, periods: number, phase: number, fill: string, opacity?: number): ScanShape {
  const steps = 40;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * WALLPAPER_FRAME.w;
    const y = top + amp * Math.sin((i / steps) * periods * Math.PI * 2 + phase);
    d += `${i === 0 ? "M" : "L"}${f(x)} ${f(y)}`;
  }
  return path(`${d}L${WALLPAPER_FRAME.w} ${WALLPAPER_FRAME.h}L0 ${WALLPAPER_FRAME.h}Z`, fill, opacity);
}

/** An ellipse outline (centre, radii, tilt in degrees) as one closed path of two arcs. */
function orbitPath(cx: number, cy: number, rx: number, ry: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  const dx = rx * Math.cos(a);
  const dy = rx * Math.sin(a);
  const [x1, y1, x2, y2] = [cx - dx, cy - dy, cx + dx, cy + dy].map(f);
  return `M${x1} ${y1}A${rx} ${ry} ${deg} 1 0 ${x2} ${y2}A${rx} ${ry} ${deg} 1 0 ${x1} ${y1}Z`;
}

/** The point at angle `t` (degrees round the ellipse) on a tilted ellipse. */
function onOrbit(cx: number, cy: number, rx: number, ry: number, deg: number, t: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  const u = rx * Math.cos((t * Math.PI) / 180);
  const v = ry * Math.sin((t * Math.PI) / 180);
  return [f(cx + u * Math.cos(a) - v * Math.sin(a)), f(cy + u * Math.sin(a) + v * Math.cos(a))];
}

/** A four-point sparkle, rounded by its soft waist. */
const sparkle = (x: number, y: number, r: number, fill: string, opacity?: number): ScanShape =>
  path(`M${x} ${f(y - r)}Q${x} ${y} ${f(x + r)} ${y}Q${x} ${y} ${x} ${f(y + r)}Q${x} ${y} ${f(x - r)} ${y}Q${x} ${y} ${x} ${f(y - r)}Z`, fill, opacity);

// ── 1. Orbit: three crossing orbits round a nucleus, electrons and stars, on a bright blue ────────────────────

const ORBIT_BLUE = SEA[1];
const orbitShapes = (): ScanShape[] => {
  const cx = 50;
  const cy = 142;
  const tilts = [0, 60, 120];
  const electrons: [number, string, number][] = [
    [40, BEE[1], 4.6],
    [160, SNOW, 4.2],
    [275, PINK[1], 4.6],
  ];
  return [
    rect(0, 0, 100, 200, 0, ORBIT_BLUE),
    circle(50, 142, 64, SEA[0], 0.45),
    circle(50, 142, 46, SEA[0], 0.4),
    ...tilts.map((deg) => line(orbitPath(cx, cy, 44, 15, deg), SNOW, 1.6)),
    ...tilts.flatMap((deg, i) => {
      const [t, fill, r] = electrons[i];
      const [x, y] = onOrbit(cx, cy, 44, 15, deg, t);
      return [circle(x, y, r + 2.2, fill === SNOW ? SEA[0] : SNOW, 0.7), circle(x, y, r, fill)];
    }),
    circle(cx, cy, 11, RED[2]),
    circle(cx - 1.5, cy - 1.5, 10, RED[1]),
    circle(cx + 4, cy + 5, 5.5, BEE[1]),
    circle(cx - 5, cy + 5, 4.5, SNOW),
    pill(cx - 8, cy - 8, 4, 8, SNOW, 0.7),
    sparkle(14, 22, 5, SNOW),
    sparkle(84, 44, 4, SNOW, 0.9),
    sparkle(26, 78, 3, SNOW, 0.8),
    sparkle(90, 104, 3.4, BEE[0]),
    circle(70, 14, 1.6, SNOW, 0.9),
    circle(8, 56, 1.4, SNOW, 0.9),
    circle(52, 36, 1.4, SNOW, 0.8),
    circle(92, 76, 1.4, SNOW, 0.8),
    circle(10, 112, 1.6, SNOW, 0.8),
    circle(88, 178, 1.6, SNOW, 0.8),
    circle(12, 186, 1.4, SNOW, 0.8),
  ];
};

// ── 3. Green hills: a pale sky, a small sun and three soft hills ──────────────────────────────────────────────

const hillsShapes = (): ScanShape[] => [
  rect(0, 0, 100, 200, 0, GLASS[1]),
  rect(0, 96, 100, 110, 0, GLASS[0]),
  circle(72, 120, 19, BEE[0], 0.5),
  circle(72, 120, 12, BEE[1]),
  pill(8, 112, 26, 8, SNOW, 0.85),
  pill(16, 106, 17, 8, SNOW, 0.85),
  pill(40, 134, 22, 7, SNOW, 0.8),
  waveFill(150, 6, 0.7, 0.5, LEAF[0]),
  waveFill(166, 5, 0.9, 2, LEAF[1]),
  waveFill(182, 4, 1.1, 4, LEAF[2]),
];

// ── 4. Moonlight: a big pale moon in a deep blue sky over two dark hills ─────────────────────────────────────

const moonShapes = (): ScanShape[] => {
  const sky = darken(SEA[2], 0.62);
  return [
    rect(0, 0, 100, 200, 0, sky),
    circle(50, 122, 30, SNOW, 0.06),
    circle(50, 122, 22, SNOW, 0.1),
    circle(50, 122, 14, CRUMB[0]),
    circle(46, 118, 3, CRUMB[1], 0.8),
    circle(55, 127, 2.2, CRUMB[1], 0.8),
    sparkle(16, 28, 4, SNOW),
    sparkle(86, 80, 3.2, SNOW, 0.9),
    circle(80, 20, 1.5, SNOW, 0.9),
    circle(24, 78, 1.4, SNOW, 0.8),
    circle(84, 138, 1.3, SNOW, 0.7),
    circle(14, 146, 1.3, SNOW, 0.7),
    waveFill(164, 6, 0.7, 1, darken(PLUM[2], 0.5)),
    waveFill(180, 5, 1, 3.4, darken(PLUM[2], 0.68)),
  ];
};

// ── 5. Bubbles: big soft circles of purple and pink with a few sparkles ───────────────────────────────────────

const bubblesShapes = (): ScanShape[] => [
  rect(0, 0, 100, 200, 0, PLUM[1]),
  circle(14, 34, 34, PLUM[0], 0.45),
  circle(92, 70, 26, PINK[1], 0.35),
  circle(70, 8, 18, PINK[0], 0.4),
  circle(24, 150, 44, PLUM[2], 0.55),
  circle(88, 168, 30, PLUM[0], 0.5),
  circle(64, 130, 12, PINK[1], 0.4),
  circle(40, 192, 16, PINK[0], 0.35),
  sparkle(60, 60, 3.4, SNOW, 0.9),
  sparkle(20, 100, 3, SNOW, 0.8),
  circle(80, 112, 1.5, SNOW, 0.8),
  circle(44, 20, 1.4, SNOW, 0.8),
  circle(10, 184, 1.4, SNOW, 0.7),
];

// ── 5. Sunny waves: warm ribbons rolling over a golden sky, with a sun and sparkles ───────────────────────────

const wavesShapes = (): ScanShape[] => [
  rect(0, 0, 100, 200, 0, BEE[0]),
  circle(76, 38, 22, BEE[1], 0.55),
  circle(76, 38, 14, BEE[1]),
  sparkle(18, 30, 5, SNOW),
  sparkle(44, 70, 3.4, SNOW, 0.9),
  sparkle(90, 86, 3, SNOW, 0.9),
  circle(30, 16, 1.6, SNOW, 0.9),
  circle(58, 12, 1.4, SNOW, 0.9),
  waveFill(100, 8, 1.2, 0, CRUMB[1]),
  waveFill(116, 8, 1.2, 0.9, FOX[0]),
  waveFill(132, 8, 1.2, 1.8, FOX[1]),
  waveFill(148, 8, 1.2, 2.7, RED[0]),
  waveFill(164, 8, 1.2, 3.6, PINK[1]),
  waveFill(180, 8, 1.2, 4.5, PLUM[0]),
  circle(14, 128, 1.8, SNOW, 0.8),
  circle(62, 144, 1.6, SNOW, 0.8),
  circle(88, 126, 1.6, SNOW, 0.8),
  circle(36, 160, 1.6, SNOW, 0.7),
];

export const WALLPAPERS: Readonly<Record<WallpaperId, Wallpaper>> = {
  orbit: { id: "orbit", name: "Orbit", base: ORBIT_BLUE, ink: SNOW, shapes: orbitShapes() },
  waves: { id: "waves", name: "Sunny waves", base: BEE[0], ink: EEL[1], shapes: wavesShapes() },
  hills: { id: "hills", name: "Green hills", base: GLASS[1], ink: EEL[1], shapes: hillsShapes() },
  moon: { id: "moon", name: "Moonlight", base: darken(SEA[2], 0.62), ink: SNOW, shapes: moonShapes() },
  bubbles: { id: "bubbles", name: "Bubbles", base: PLUM[1], ink: SNOW, shapes: bubblesShapes() },
};
