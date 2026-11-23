/**
 * Kofi's kit, as pure data: his hard hat with a reactor-core sticker, his hi-vis engineer vest over a blue work shirt (reflective shoulder
 * and waist bands, zip placket, reactor clearance badge and lower tool pocket), the tool pouch with a wrench at his hip, and the reactor
 * blueprint he holds up in the `explain` pose.
 *
 * Drawn in the same body frame as the other outfits (`outfit-art.ts`: shoulders' dome of radius 72 centred at y 140, torso top at y 68).
 * The work shirt collar, reflective shoulder bands and clearance badge sit in the upper chest so they read in the lesson bust and small
 * banners, while the waist band, lower pocket and hip tool pouch sit on the full figure. Flat shapes only, one shade step, rounded corners.
 */

export type HardhatTone = "dome" | "brim" | "white" | "core" | "bolt";
export type HardhatPiece = { d: string; tone: HardhatTone };

export type WorkVestTone = "main" | "shade" | "collar" | "white" | "gold";
export type WorkVestPiece = { d: string; tone: WorkVestTone };

export type ToolBeltTone = "strap" | "pouch" | "pouchTop" | "metal" | "bolt";
export type ToolBeltPiece = { d: string; tone: ToolBeltTone };

export type BlueprintTone = "bp" | "bpShade" | "bpRoll" | "white" | "bolt";
export type BlueprintPiece = { d: string; tone: BlueprintTone };

const R = 72;
const CY = 140;
const f = (n: number) => Math.round(n * 100) / 100;
const topAt = (x: number) => CY - Math.sqrt(Math.max(0, R * R - x * x));
const strap = (x1: number, x2: number, bottom: number) => `M${x1} ${bottom}L${x1} ${f(topAt(x1))}A${R} ${R} 0 0 1 ${x2} ${f(topAt(x2))}L${x2} ${bottom}Z`;
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

/** Kofi's hard hat: sculpted dome, centre ridge, side ribs, brim and a reactor-core sticker badge on the front-right. */
export const HARDHAT_PIECES: HardhatPiece[] = [
  { d: rrect(-66, -59, 132, 14, 7), tone: "brim" },
  { d: "M-56 -50A56 56 0 0 1 56 -50Z", tone: "dome" },
  { d: rrect(-36, -94, 10, 38, 5), tone: "brim" },
  { d: rrect(26, -94, 10, 38, 5), tone: "brim" },
  { d: rrect(-9, -106, 18, 50, 8), tone: "brim" },
  // Reactor-core sticker on the front right and a small shine pill on the left
  { d: circle(30, -76, 11.5), tone: "white" },
  { d: circle(30, -76, 8.6), tone: "core" },
  { d: circle(30, -76, 4.2), tone: "bolt" },
  { d: rrect(-33, -84, 5, 13, 2.5), tone: "white" },
];

/** The hi-vis engineer vest over a work shirt: V-neck inner shirt, reflective shoulder and waist bands, zip track and clearance badge. */
export const WORK_VEST_PIECES: WorkVestPiece[] = [
  // Inner work shirt V-neck and collar band
  { d: roundPoly([[-30, 64], [30, 64], [0, 124]], 8), tone: "collar" },
  { d: rrect(-21, 61, 42, 13, 6.5), tone: "shade" },
  // Reflective hi-vis shoulder straps with white inner cores
  { d: strap(-46, -32, 146), tone: "gold" },
  { d: strap(32, 46, 146), tone: "gold" },
  { d: rrect(-42, 76, 6, 66, 3), tone: "white" },
  { d: rrect(36, 76, 6, 66, 3), tone: "white" },
  // Center front zip placket
  { d: rrect(-4.5, 118, 9, 132, 4.5), tone: "shade" },
  { d: rrect(-1.5, 120, 3, 68, 1.5), tone: "white" },
  // Reactor clearance ID badge on the left chest
  { d: rrect(16, 86, 7, 6, 2.5), tone: "white" },
  { d: rrect(10, 90, 19, 23, 4.5), tone: "white" },
  { d: rrect(13, 94, 13, 8, 2.5), tone: "collar" },
  { d: rrect(13, 105, 13, 3.6, 1.8), tone: "shade" },
  // Horizontal hi-vis reflective waist band and lower pocket
  { d: rrect(-52, 142, 104, 13, 6.5), tone: "gold" },
  { d: rrect(-48, 146, 96, 5, 2.5), tone: "white" },
  { d: rrect(16, 162, 32, 26, 6), tone: "shade" },
];

/** The cross-body tool strap and engineer's hip pouch with a wrench sticking up and a power-bolt emblem. */
export const TOOL_BELT_PIECES: ToolBeltPiece[] = [
  { d: roundPoly([[-53, 90], [-41, 86], [-47, 182], [-61, 180]], 4), tone: "strap" },
  // Wrench sticking out of the pouch
  { d: rrect(-86, 148, 9, 28, 4.5), tone: "metal" },
  { d: circle(-81.5, 145, 10.5), tone: "metal" },
  { d: rrect(-85, 134, 7, 10, 2.5), tone: "strap" },
  // Tool pouch body, flap and golden power bolt
  { d: rrect(-94, 172, 60, 54, 11), tone: "pouch" },
  { d: rrect(-94, 172, 60, 20, 11), tone: "pouchTop" },
  { d: roundPoly([[-61, 185], [-71, 201], [-63, 201], [-67, 216], [-55, 199], [-63, 199]], 1.2), tone: "bolt" },
];

/** The engineer's reactor blueprint held up by Kofi's raised hand in the `explain` pose, relative to the hand centre (hx, hy). */
export function blueprintPieces(hx: number, hy: number): BlueprintPiece[] {
  return [
    { d: rrect(hx - 29, hy - 72, 58, 74, 10), tone: "bpShade" },
    { d: rrect(hx - 26, hy - 69, 52, 68, 8), tone: "bp" },
    { d: rrect(hx - 28, hy - 75, 56, 11, 5.5), tone: "bpRoll" },
    // Cooling tower silhouette and steam puffs on the blueprint
    { d: roundPoly([[hx - 15, hy - 46], [hx + 1, hy - 46], [hx + 5, hy - 14], [hx - 19, hy - 14]], 2.5), tone: "white" },
    { d: circle(hx - 10, hy - 54, 4.2), tone: "white" },
    { d: circle(hx - 3, hy - 56, 5), tone: "white" },
    // Golden energy bolt beside the tower
    { d: roundPoly([[hx + 15, hy - 52], [hx + 7, hy - 37], [hx + 14, hy - 37], [hx + 10, hy - 22], [hx + 21, hy - 39], [hx + 14, hy - 39]], 1.2), tone: "bolt" },
  ];
}
