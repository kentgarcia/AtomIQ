/**
 * Tess's kit, as pure data: her tech vest (standing collar, zip track with gold pull, chest tracer-sensor module, clipped styluses and
 * lower utility pocket), the cross-body field gadget pack at her hip, and the glowing radiotracer vial she holds up.
 *
 * Drawn in the same body frame as the other outfits (`outfit-art.ts`: shoulders' dome of radius 72 centred at y 140, torso top at y 68).
 * The standing collar, zip pull, chest sensor module and clipped styluses sit in the upper chest so they read in the lesson bust and
 * small banners, while the lower pocket and hip gadget pack sit on the full figure. Flat shapes only, one shade step, every corner rounded.
 */

export type TechVestTone = "main" | "shade" | "collar" | "white" | "gold" | "pink";
export type TechVestPiece = { d: string; tone: TechVestTone };

export type GadgetPackTone = "strap" | "pack" | "packTop" | "screen" | "led" | "white";
export type GadgetPackPiece = { d: string; tone: GadgetPackTone };

export type VialTone = "glass" | "liquid" | "cap" | "capTop" | "white";
export type VialPiece = { d: string; tone: VialTone };

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

/** The tech vest: standing collar, zip track with gold pull, chest tracer-sensor module, clipped styluses and lower pocket. */
export const TECH_VEST_PIECES: TechVestPiece[] = [
  // Standing tech collar and inner neckline
  { d: rrect(-34, 60, 68, 20, 10), tone: "shade" },
  { d: rrect(-21, 61, 42, 14, 7), tone: "collar" },
  // Center zip track and gold pull tab
  { d: rrect(-4, 74, 8, 176, 4), tone: "shade" },
  { d: rrect(-1.5, 76, 3, 56, 1.5), tone: "white" },
  { d: circle(0, 94, 4), tone: "gold" },
  // Smart tracer-sensor module on the left chest
  { d: rrect(18, 86, 30, 24, 6.5), tone: "shade" },
  { d: rrect(21, 89, 24, 18, 4.5), tone: "white" },
  { d: circle(28, 98, 4.2), tone: "gold" },
  { d: rrect(34, 93.5, 8, 3.6, 1.8), tone: "main" },
  { d: rrect(34, 99.5, 8, 3.6, 1.8), tone: "main" },
  // Clipped gadget styluses in a right-chest holder
  { d: rrect(-38, 89, 6, 18, 3), tone: "gold" },
  { d: rrect(-29, 92, 6, 15, 3), tone: "pink" },
  { d: rrect(-42, 102, 23, 16, 5), tone: "shade" },
  // Lower utility pocket with a contrasting flap
  { d: rrect(18, 148, 34, 28, 7), tone: "shade" },
  { d: rrect(18, 148, 34, 10, 5), tone: "collar" },
];

/** The cross-body shoulder strap and portable field gadget pack with antenna and glowing screen at Tess's hip. */
export const GADGET_PACK_PIECES: GadgetPackPiece[] = [
  { d: roundPoly([[-53, 90], [-41, 86], [-47, 182], [-61, 180]], 4), tone: "strap" },
  { d: rrect(-88, 152, 7, 24, 3.5), tone: "strap" },
  { d: circle(-84.5, 150, 5.5), tone: "led" },
  { d: rrect(-94, 172, 60, 54, 12), tone: "pack" },
  { d: rrect(-94, 172, 60, 20, 12), tone: "packTop" },
  { d: rrect(-85, 180, 42, 22, 6), tone: "screen" },
  { d: circle(-64, 191, 6.5), tone: "white" },
  { d: circle(-64, 191, 3.2), tone: "led" },
  { d: rrect(-83, 209, 15, 6, 3), tone: "led" },
  { d: rrect(-62, 209, 18, 6, 3), tone: "screen" },
];

/** The glowing radiotracer capsule vial held up by Tess's raised hand in the `explain` pose, relative to the hand centre (hx, hy). */
export function vialPieces(hx: number, hy: number): VialPiece[] {
  return [
    { d: rrect(hx - 8, hy - 80, 16, 8, 4), tone: "capTop" },
    { d: rrect(hx - 16, hy - 74, 32, 11, 5.5), tone: "cap" },
    { d: rrect(hx - 14, hy - 65, 28, 53, 9), tone: "glass" },
    { d: rrect(hx - 11, hy - 44, 22, 30, 6.5), tone: "liquid" },
    { d: rrect(hx - 16, hy - 15, 32, 10, 5), tone: "cap" },
    // Glowing tracer drop, bubble and glass highlight bar
    { d: rrect(hx - 9, hy - 60, 4, 22, 2), tone: "white" },
    { d: circle(hx + 2, hy - 27, 5), tone: "white" },
    { d: circle(hx - 4, hy - 37, 2.8), tone: "white" },
  ];
}
