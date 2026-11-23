/**
 * Sage's kit, as pure data: their scholarly shawl-collar cardigan over a collared shirt (folded collar points, necktie tab, leaf-and-balance
 * lapel pin, chest pocket with fountain pen and gold buttons), the cross-body policy folio bag at their hip, and the two-column "both sides"
 * notebook and pen they hold up in the `explain` pose.
 *
 * Drawn in the same body frame as the other outfits (`outfit-art.ts`: shoulders' dome of radius 72 centred at y 140, torso top at y 68).
 * The shirt collar, shawl lapels, leaf pin and chest pocket pen sit in the upper chest so they read in the lesson bust and small banners,
 * while the buttons and hip folio bag sit on the full figure. Flat shapes only, one shade step, every corner rounded.
 */

export type ScholarTone = "main" | "shade" | "collar" | "white" | "gold";
export type ScholarPiece = { d: string; tone: ScholarTone };

export type FolioBagTone = "strap" | "bag" | "bagShade" | "white" | "gold" | "leaf";
export type FolioBagPiece = { d: string; tone: FolioBagTone };

export type NotebookTone = "cover" | "coverShade" | "white" | "gold" | "leaf" | "coral" | "rule";
export type NotebookPiece = { d: string; tone: NotebookTone };

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

const SHAWL: [number, number][] = [[-46, 82], [-28, 64], [0, 128], [-12, 128], [-32, 104]];
const COLLAR_PT: [number, number][] = [[-28, 72], [-15, 62], [-2, 82], [-15, 91]];

/** The scholarly shawl-collar cardigan: collared shirt inset, tie tab, shawl lapels, leaf pin, chest pocket with pen and buttons. */
export const SCHOLAR_PIECES: ScholarPiece[] = [
  // Shirt V-inset, tie tab and folded collar points
  { d: roundPoly([[-28, 64], [28, 64], [0, 124]], 7), tone: "collar" },
  { d: roundPoly([[-6, 76], [6, 76], [8, 114], [0, 124], [-8, 114]], 3), tone: "shade" },
  { d: roundPoly(COLLAR_PT, 4.5), tone: "white" },
  { d: roundPoly(mirrorPts(COLLAR_PT), 4.5), tone: "white" },
  // Shawl lapels and center button placket
  { d: roundPoly(SHAWL, 5), tone: "shade" },
  { d: roundPoly(mirrorPts(SHAWL), 5), tone: "shade" },
  { d: rrect(-4.5, 124, 9, 126, 4.5), tone: "shade" },
  { d: circle(0, 138, 3.6), tone: "gold" },
  { d: circle(0, 158, 3.6), tone: "gold" },
  { d: circle(0, 178, 3.6), tone: "gold" },
  // Golden leaf-and-balance enamel pin on the left chest
  { d: circle(28, 96, 10.5), tone: "gold" },
  { d: circle(28, 96, 7.6), tone: "white" },
  { d: roundPoly([[24, 101], [25, 92], [33, 90], [32, 99]], 2.4), tone: "shade" },
  // Right chest pocket with a fountain pen
  { d: rrect(-36, 94, 6, 18, 3), tone: "gold" },
  { d: rrect(-36, 94, 6, 6, 3), tone: "white" },
  { d: rrect(-42, 106, 22, 16, 5), tone: "shade" },
];

/** The cross-body shoulder strap and policy research folio bag with document tabs and a balance-scale emblem at Sage's hip. */
export const FOLIO_BAG_PIECES: FolioBagPiece[] = [
  { d: roundPoly([[-53, 90], [-41, 86], [-47, 182], [-61, 180]], 4), tone: "strap" },
  // Document page and coloured bookmark tabs peeking out the top of the folio
  { d: rrect(-88, 160, 26, 16, 5), tone: "white" },
  { d: rrect(-84, 155, 10, 8, 3), tone: "gold" },
  { d: rrect(-71, 157, 10, 8, 3), tone: "leaf" },
  // Folio bag body, envelope flap and golden balance-scale emblem
  { d: rrect(-94, 172, 60, 54, 11), tone: "bag" },
  { d: roundPoly([[-94, 172], [-34, 172], [-34, 194], [-64, 206], [-94, 194]], 7), tone: "bagShade" },
  { d: circle(-64, 202, 5.2), tone: "gold" },
  { d: rrect(-78, 213, 28, 4.2, 2.1), tone: "gold" },
  { d: circle(-76, 219, 3.6), tone: "white" },
  { d: circle(-52, 219, 3.6), tone: "white" },
];

/** The two-column "both sides" notebook with tabs, bookmark ribbon and clipped fountain pen held up in the `explain` pose. */
export function notebookPieces(hx: number, hy: number): NotebookPiece[] {
  return [
    // Subject tabs along the top edge
    { d: rrect(hx - 16, hy - 77, 11, 8, 3.5), tone: "gold" },
    { d: rrect(hx - 2, hy - 77, 11, 8, 3.5), tone: "leaf" },
    { d: rrect(hx + 12, hy - 77, 11, 8, 3.5), tone: "coral" },
    // Hardcover spine, front board and white page
    { d: rrect(hx - 29, hy - 72, 58, 74, 10), tone: "coverShade" },
    { d: rrect(hx - 24, hy - 72, 53, 74, 10), tone: "cover" },
    { d: rrect(hx - 19, hy - 65, 43, 60, 6), tone: "white" },
    // Two-column comparison ("On one hand / On the other") and bottom summary bar
    { d: circle(hx - 9, hy - 53, 4), tone: "cover" },
    { d: rrect(hx - 15, hy - 44, 13, 4.5, 2.25), tone: "rule" },
    { d: rrect(hx - 15, hy - 35, 13, 4.5, 2.25), tone: "rule" },
    { d: rrect(hx + 1, hy - 57, 3, 36, 1.5), tone: "rule" },
    { d: circle(hx + 12, hy - 53, 4), tone: "coral" },
    { d: rrect(hx + 6, hy - 44, 13, 4.5, 2.25), tone: "rule" },
    { d: rrect(hx + 6, hy - 35, 13, 4.5, 2.25), tone: "rule" },
    { d: rrect(hx - 13, hy - 22, 31, 5, 2.5), tone: "gold" },
    // Hanging bookmark ribbon and side-clipped fountain pen
    { d: roundPoly([[hx - 8, hy - 5], [hx, hy - 5], [hx, hy + 9], [hx - 4, hy + 5], [hx - 8, hy + 9]], 1.2), tone: "gold" },
    { d: rrect(hx + 26, hy - 56, 7, 36, 3.5), tone: "coverShade" },
    { d: rrect(hx + 26, hy - 56, 7, 11, 3.5), tone: "gold" },
  ];
}
