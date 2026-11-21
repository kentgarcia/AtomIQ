/**
 * Ada's lab outfit, as pure data (no imports): a pink shirt with a white round collar and puffed shoulders, under a
 * tan apron with a bib, two straps and a radiation badge on the chest.
 *
 * Drawn in the same body frame as the other outfits (`outfit-art.ts`): the shoulders' dome is a circle of radius 72
 * centred at y 140, torso top at y 68. Like the extra outfits it is only the top of the body that tells who is wearing
 * it (the lesson bust shows down to y ~107): the collar, the straps and the top of the bib are up there, the pocket
 * further down for the full figure. Flat shapes only, one shade step, every corner rounded.
 *
 * `npc-art.ts` turns each piece's `tone` into a colour: `shirt` and `shirtShade` are the outfit's colour and shade,
 * `apron` is its `collar` colour, `apronShade` is fixed, `badge` and `badgeInk` are the teacher's prop colours (Ada's violet),
 * `mint` and `white` are fixed.
 */

export type ApronTone = "shirt" | "shirtShade" | "apron" | "apronShade" | "white" | "mint" | "badge" | "badgeInk";
export type ApronPiece = { d: string; tone: ApronTone };

const R = 72;
const CY = 140;
const f = (n: number) => Math.round(n * 100) / 100;
const topAt = (x: number) => CY - Math.sqrt(Math.max(0, R * R - x * x));

const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

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

function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}V${f(y + h - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w - q)} ${f(y + h)}H${f(x + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y + h - q)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}Z`;
}

/** A strap from the edge of the dome down to `bottom`, between x1 and x2. */
const strap = (x1: number, x2: number, bottom: number) => `M${x1} ${bottom}L${x1} ${f(topAt(x1))}A${R} ${R} 0 0 1 ${x2} ${f(topAt(x2))}L${x2} ${bottom}Z`;

const mirrorPts = (pts: [number, number][]): [number, number][] => pts.map(([x, y]): [number, number] => [-x, y]).reverse();

/**
 * The radiation trefoil: three blades (60 degrees wide, one pointing up) round a small hub, centred at (cx, cy) and
 * `r` across. Each blade is an annular sector with soft corners.
 */
export function trefoil(cx: number, cy: number, r: number): string[] {
  const inner = r * 0.3;
  const at = (rad: number, deg: number): [number, number] => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  };
  const blades = [0, 120, 240].map((deg) => {
    const pts: [number, number][] = [];
    for (let k = 0; k <= 2; k++) pts.push(at(inner, deg - 30 + k * 30));
    for (let k = 4; k >= 0; k--) pts.push(at(r, deg - 30 + k * 15));
    return roundPoly(pts.reverse(), r * 0.09);
  });
  return [...blades, circle(cx, cy, r * 0.17)];
}

const COLLAR: [number, number][] = [[-37, 80], [-15, 64], [-2, 84], [-6, 95], [-30, 93]];

/** Behind the arms' sleeves and the apron: the puffed shoulders. Skipped by the bust, which has no arms. */
export const APRON_PUFFS: ApronPiece[] = [-1, 1].flatMap((s): ApronPiece[] => [
  { d: circle(s * 59, 100, 21), tone: "shirtShade" },
  { d: circle(s * 58, 96, 21), tone: "shirt" },
]);

/** The apron, the collar and the badge, over the shirt (back to front). */
export const APRON_PIECES: ApronPiece[] = [
  { d: strap(-39, -24, 100), tone: "apron" },
  { d: strap(24, 39, 100), tone: "apron" },
  { d: rrect(-39, 90, 78, 170, 14), tone: "apron" },
  { d: rrect(-25, 154, 50, 34, 9), tone: "apronShade" },
  { d: roundPoly(COLLAR, 7), tone: "white" },
  { d: roundPoly(mirrorPts(COLLAR), 7), tone: "white" },
  { d: circle(0, 114, 16), tone: "badge" },
  { d: circle(0, 114, 12.6), tone: "mint" },
  ...trefoil(0, 114, 11.2).map((d): ApronPiece => ({ d, tone: "badgeInk" })),
];
