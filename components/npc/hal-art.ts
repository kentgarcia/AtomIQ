/**
 * Hal's kit, as pure data: the brown satchel with the radiation badge that hangs from his shoulder, and the bumpy rock sample he holds up.
 *
 * The satchel is drawn on the torso in the body frame of the other outfits (shoulders' dome: a circle of radius 72 centred at y 140, torso top
 * at y 68): its strap comes over the wearer's right shoulder (the viewer's left) and the bag hangs at that hip. The lesson bust shows only the
 * top of the strap. Flat shapes, one shade step, every corner rounded.
 *
 * `npc-art.ts` turns each piece's `tone` into a colour: `strap` and `bag` are brown, `bagShade` a darker brown, `badge` the yellow of the
 * warning sign, `ink` its dark ink.
 */

import { trefoil } from "./lab-apron-art.ts";

export type SatchelTone = "strap" | "bagShade" | "bag" | "badge" | "ink";
export type SatchelPiece = { d: string; tone: SatchelTone };

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

/** The strap over the shoulder, then the bag with its flap and the badge (back to front). */
export const SATCHEL_PIECES: SatchelPiece[] = [
  { d: roundPoly([[-53, 90], [-41, 86], [-47, 184], [-61, 182]], 4), tone: "strap" },
  { d: rrect(-94, 172, 60, 54, 11), tone: "bag" },
  { d: rrect(-94, 172, 60, 25, 11), tone: "bagShade" },
  { d: rrect(-70, 190, 12, 9, 3.5), tone: "badge" },
  { d: circle(-64, 212, 10.5), tone: "badge" },
  ...trefoil(-64, 212, 8.4).map((d): SatchelPiece => ({ d, tone: "ink" })),
];

/** The rock sample held up by the raised hand, as pieces relative to the hand centre (hx, hy): a bumpy disc and its dark flecks. */
export function samplePieces(hx: number, hy: number): { d: string; tone: "main" | "shade" | "spark" }[] {
  const cx = hx;
  const cy = hy - 36;
  const bumps = Array.from({ length: 9 }, (_, i) => {
    const a = (i / 9) * Math.PI * 2 + 0.3;
    return { d: circle(cx + Math.cos(a) * 18, cy + Math.sin(a) * 18, 7.4), tone: "main" as const };
  });
  return [
    ...bumps,
    { d: circle(cx, cy, 19.5), tone: "main" },
    { d: circle(cx - 6, cy - 5, 4.2), tone: "shade" },
    { d: circle(cx + 7, cy - 2, 3.4), tone: "shade" },
    { d: circle(cx - 1, cy + 8, 3.8), tone: "shade" },
    { d: circle(cx + 9, cy + 9, 2.4), tone: "shade" },
    { d: circle(cx - 11, cy + 6, 2.4), tone: "shade" },
  ];
}
