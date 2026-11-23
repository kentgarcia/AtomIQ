/**
 * Ray's kit, as pure data: his field hoodie (sculpted hood, drawstrings with toggles, clip-on chest dosimeter badge and kangaroo pocket),
 * the hand-held radiation counter strapped at his hip, and the lead-lined checklist clipboard he holds up.
 *
 * Drawn in the same body frame as the other outfits (`outfit-art.ts`: shoulders' dome of radius 72 centred at y 140, torso top at y 68).
 * The hood, drawstrings, shoulder strap and chest dosimeter badge sit in the upper chest so they read in the lesson bust and small banners,
 * while the kangaroo pocket and holstered counter sit lower on the full figure. Flat shapes only, one shade step, every corner rounded.
 */

import { trefoil } from "./lab-apron-art.ts";

export type FieldHoodieTone = "main" | "shade" | "white" | "gold";
export type FieldHoodiePiece = { d: string; tone: FieldHoodieTone };

export type CounterTone = "strap" | "probeTip" | "counter" | "counterShade" | "white" | "needle" | "ink";
export type CounterPiece = { d: string; tone: CounterTone };

export type ClipboardTone = "board" | "boardShade" | "paper" | "clip" | "check" | "rule" | "star" | "penCap";
export type ClipboardPiece = { d: string; tone: ClipboardTone };

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

/** The field hoodie's hood, half-zip placket, drawstrings, clip-on chest dosimeter badge and front kangaroo pocket. */
export const FIELD_HOODIE_PIECES: FieldHoodiePiece[] = [
  // Sculpted hood resting on the shoulders and neck opening
  { d: rrect(-48, 58, 96, 26, 13), tone: "shade" },
  { d: rrect(-30, 60, 60, 18, 9), tone: "main" },
  { d: rrect(-21, 63, 42, 12, 6), tone: "shade" },
  // Half-zip chest placket
  { d: rrect(-4.5, 74, 9, 36, 4.5), tone: "shade" },
  { d: rrect(-1.6, 76, 3.2, 28, 1.6), tone: "white" },
  // Drawstrings and toggle tips
  { d: rrect(-14.5, 76, 4.2, 26, 2.1), tone: "white" },
  { d: rrect(10.3, 76, 4.2, 22, 2.1), tone: "white" },
  { d: circle(-12.4, 103, 3.6), tone: "gold" },
  { d: circle(12.4, 99, 3.6), tone: "gold" },
  // Clip-on dosimeter badge on the chest
  { d: rrect(32, 86, 10, 8, 3), tone: "white" },
  { d: rrect(25, 92, 24, 26, 6.5), tone: "gold" },
  { d: circle(37, 105, 8.5), tone: "white" },
  ...trefoil(37, 105, 7).map((d): FieldHoodiePiece => ({ d, tone: "shade" })),
  // Front kangaroo pocket
  { d: roundPoly([[-42, 140], [42, 140], [50, 190], [-50, 190]], 11), tone: "shade" },
  { d: roundPoly([[-32, 147], [32, 147], [38, 185], [-38, 185]], 8), tone: "main" },
  { d: rrect(-2.2, 146, 4.4, 40, 2.2), tone: "shade" },
];

/** The cross-body utility strap over the right shoulder and the hand-held radiation counter holstered at the hip. */
export const COUNTER_PIECES: CounterPiece[] = [
  { d: roundPoly([[-53, 90], [-41, 86], [-47, 182], [-61, 180]], 4), tone: "strap" },
  { d: rrect(-91, 148, 12, 30, 6), tone: "strap" },
  { d: rrect(-91, 146, 12, 9, 4.5), tone: "probeTip" },
  { d: rrect(-94, 172, 60, 54, 11), tone: "counter" },
  { d: rrect(-94, 202, 60, 24, 11), tone: "counterShade" },
  { d: rrect(-85, 178, 42, 20, 5.5), tone: "white" },
  { d: roundPoly([[-65, 194], [-62, 194], [-53, 182], [-56, 182]], 1.2), tone: "needle" },
  { d: circle(-64, 194, 2.8), tone: "ink" },
  { d: circle(-74, 214, 5), tone: "ink" },
  { d: rrect(-61, 211, 18, 6, 3), tone: "white" },
];

/** The lead-lined checklist clipboard held up by the raised hand, relative to the hand centre (hx, hy). */
export function clipboardPieces(hx: number, hy: number): ClipboardPiece[] {
  return [
    { d: rrect(hx - 29, hy - 72, 58, 74, 10), tone: "boardShade" },
    { d: rrect(hx - 26, hy - 69, 52, 68, 8), tone: "board" },
    { d: rrect(hx - 22, hy - 62, 44, 56, 5), tone: "paper" },
    { d: rrect(hx - 14, hy - 74, 28, 12, 5.5), tone: "clip" },
    { d: circle(hx, hy - 74, 4), tone: "paper" },
    // Checked-off items and the starred, double-underlined line
    { d: circle(hx - 13, hy - 48, 4.2), tone: "check" },
    { d: rrect(hx - 5, hy - 50.5, 22, 5, 2.5), tone: "rule" },
    { d: circle(hx - 13, hy - 35, 4.2), tone: "check" },
    { d: rrect(hx - 5, hy - 37.5, 18, 5, 2.5), tone: "rule" },
    { d: circle(hx - 13, hy - 22, 4.2), tone: "star" },
    { d: rrect(hx - 5, hy - 24.5, 20, 5, 2.5), tone: "board" },
    { d: rrect(hx - 5, hy - 16.5, 20, 2.6, 1.3), tone: "boardShade" },
    // Pen clipped to the side of the board
    { d: rrect(hx + 24, hy - 54, 7, 34, 3.5), tone: "clip" },
    { d: rrect(hx + 24, hy - 54, 7, 10, 3.5), tone: "penCap" },
  ];
}
