/**
 * Mina's kit, as pure data: her clinician coat (notched lapels over a V-neck scrub top, a red heart lapel pin, a clip-on monthly dose badge
 * and a lower pocket with a penlight), the stethoscope draped round her neck, and the clinical dose-scale card she holds up.
 *
 * Drawn in the same body frame as the other outfits (`outfit-art.ts`: shoulders' dome of radius 72 centred at y 140, torso top at y 68).
 * The V-neck scrub collar, lapels, heart pin, dose badge and stethoscope sit in the upper chest so they read in the lesson bust and small
 * banners, while the lower coat pocket and seam sit on the full figure. Flat shapes only, one shade step, every corner rounded.
 */

export type ClinicianTone = "main" | "shade" | "collar" | "white" | "red" | "gold" | "collarShade";
export type ClinicianPiece = { d: string; tone: ClinicianTone };

export type StethoscopeTone = "tube" | "chestRim" | "white";
export type StethoscopePiece = { d: string; tone: StethoscopeTone } | { line: string; tone: StethoscopeTone; w: number };

export type DoseCardTone = "frame" | "frameShade" | "paper" | "heart" | "low" | "mid" | "high" | "rule";
export type DoseCardPiece = { d: string; tone: DoseCardTone };

const f = (n: number) => Math.round(n * 100) / 100;
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}V${f(y + h - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w - q)} ${f(y + h)}H${f(x + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y + h - q)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}Z`;
}

function roundPoly(points: [number, number][], r: number): string {
  const n = points.length;
  let d = "";
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const prev = points[(i + n - 1) % n];
    const next = points[(i + 1) % n];
    const lp = Math.hypot(prev[0] - p[0], prev[1] - p[1]);
    const ln = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const k = Math.min(r, lp / 2, ln / 2);
    const a = [p[0] + ((prev[0] - p[0]) / lp) * k, p[1] + ((prev[1] - p[1]) / lp) * k];
    const b = [p[0] + ((next[0] - p[0]) / ln) * k, p[1] + ((next[1] - p[1]) / ln) * k];
    d += `${i === 0 ? "M" : "L"}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
  }
  return `${d}Z`;
}

const mirrorPts = (pts: [number, number][]): [number, number][] => pts.map(([x, y]): [number, number] => [-x, y]).reverse();

/** A small flat heart centred at (cx, cy), about `2 * s` wide. */
const heart = (cx: number, cy: number, s: number): string =>
  `M${f(cx)} ${f(cy + s * 0.95)}C${f(cx - s * 1.25)} ${f(cy + s * 0.1)} ${f(cx - s * 0.95)} ${f(cy - s * 0.95)} ${f(cx)} ${f(cy - s * 0.35)}C${f(cx + s * 0.95)} ${f(cy - s * 0.95)} ${f(cx + s * 1.25)} ${f(cy + s * 0.1)} ${f(cx)} ${f(cy + s * 0.95)}Z`;

const LAPEL: [number, number][] = [[-50, 84], [-31, 65], [-2, 130], [-15, 130], [-34, 106]];

/** The clinician coat: inner V-neck top, notched lapels, a heart pin, a clip-on dose badge, a center placket and a lower pocket. */
export const CLINICIAN_PIECES: ClinicianPiece[] = [
  // Inner V-neck scrub collar and notched coat lapels
  { d: roundPoly([[-31, 64], [31, 64], [0, 130]], 8), tone: "collar" },
  { d: roundPoly([[-23, 64], [23, 64], [0, 114]], 6), tone: "collarShade" },
  { d: roundPoly(LAPEL, 5), tone: "shade" },
  { d: roundPoly(mirrorPts(LAPEL), 5), tone: "shade" },
  // Center coat seam and buttons below the V-neck
  { d: rrect(-2.5, 128, 5, 122, 2.5), tone: "shade" },
  { d: circle(0, 146, 3.6), tone: "white" },
  { d: circle(0, 168, 3.6), tone: "white" },
  // Cardinal red heart pin on the left lapel
  { d: heart(23, 92, 6.8), tone: "red" },
  // Clip-on monthly dose badge on the right chest
  { d: rrect(-33, 92, 8, 7, 2.5), tone: "white" },
  { d: rrect(-39, 97, 20, 24, 5.5), tone: "white" },
  { d: rrect(-36, 101, 14, 9, 3), tone: "gold" },
  { d: rrect(-36, 113, 14, 4, 2), tone: "shade" },
  // Lower left pocket with a medical penlight
  { d: rrect(18, 148, 34, 28, 6), tone: "shade" },
  { d: rrect(26, 135, 6, 17, 3), tone: "gold" },
  { d: rrect(36, 138, 6, 14, 3), tone: "red" },
];

/** The clinician's stethoscope draped round the neck: the right tube ends in the round diaphragm chestpiece, the left in the binaural earpieces. */
export const STETHOSCOPE_PIECES: StethoscopePiece[] = [
  // Right side: tubing from the collar down to the diaphragm chestpiece
  { line: "M-32 72Q-46 102 -42 132", tone: "tube", w: 7 },
  { d: circle(-42, 134, 12.5), tone: "chestRim" },
  { d: circle(-42, 134, 8.8), tone: "tube" },
  { d: circle(-42, 134, 4.6), tone: "white" },
  // Left side: tubing from the collar to the Y-yoke and the two earpieces
  { line: "M32 72Q44 92 40 108", tone: "tube", w: 7 },
  { line: "M40 108L32 128", tone: "chestRim", w: 4.6 },
  { line: "M40 108L48 128", tone: "chestRim", w: 4.6 },
  { d: circle(32, 130, 4.2), tone: "white" },
  { d: circle(48, 130, 4.2), tone: "white" },
];

/** The clinical heart and dose-scale chart held up by Mina's raised hand in the `explain` pose, relative to the hand centre (hx, hy). */
export function doseCardPieces(hx: number, hy: number): DoseCardPiece[] {
  return [
    { d: rrect(hx - 29, hy - 72, 58, 74, 11), tone: "frameShade" },
    { d: rrect(hx - 26, hy - 69, 52, 68, 9), tone: "frame" },
    { d: rrect(hx - 21, hy - 63, 42, 56, 6), tone: "paper" },
    // Header: a calming red heart and a title bar
    { d: heart(hx - 11, hy - 51, 6.2), tone: "heart" },
    { d: rrect(hx - 1, hy - 54, 17, 5.5, 2.75), tone: "rule" },
    // Three-step dose comparison bars (everyday life small at the top, medium in the middle, high at the bottom)
    { d: rrect(hx - 16, hy - 39, 13, 6, 3), tone: "low" },
    { d: rrect(hx - 16, hy - 29, 23, 6, 3), tone: "mid" },
    { d: rrect(hx - 16, hy - 19, 32, 6, 3), tone: "high" },
  ];
}
