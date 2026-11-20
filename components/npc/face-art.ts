/**
 * The parts of the face the shop sells, drawn as pure data (no imports): eyebrows, extra noses, mouths (the resting
 * smile, in other shapes) and ears. `npc-art.ts` turns a piece's `tone` into a colour of the palette. Everything is on
 * the head the figure already has (eyes at x +-19.5, y -8, their tops at -28; the mouth around y 28; ears on the
 * side of the head at y 2), flat, no outlines, in the same chunky style as the rest. Eyes themselves are drawn in
 * `npc-art.ts` (they depend on the expression).
 */

/** What a piece is coloured with: `stroke` is the colour the caller gives the mouth line (skin on a beard). */
export type FaceTone = "skin" | "nose" | "feature" | "stroke" | "mouth" | "teeth" | "tongue" | "brow";
export type FacePiece = { d: string; tone: FaceTone } | { line: string; tone: FaceTone; w?: number };

export const NOSE_STYLES = ["single", "double", "button", "tiny", "long", "wide", "pointy", "round", "none"] as const;
export type NoseStyle = (typeof NOSE_STYLES)[number];

export const BROW_STYLES = ["none", "straight", "arched", "thick", "thin", "angled", "worried", "high", "bushy"] as const;
export type BrowStyle = (typeof BROW_STYLES)[number];

export const MOUTH_STYLES = ["smile", "smirk", "wide", "small", "toothy", "cat", "neutral", "open", "tongue"] as const;
export type MouthStyle = (typeof MOUTH_STYLES)[number];

export const EAR_STYLES = ["round", "small", "big", "pointed", "elf", "none"] as const;
export type EarStyle = (typeof EAR_STYLES)[number];

const f = (n: number) => Math.round(n * 100) / 100;
const circle = (cx: number, cy: number, r: number) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;
function rrect(x: number, y: number, w: number, h: number, r: number): string {
  const q = Math.min(r, w / 2, h / 2);
  return `M${f(x + q)} ${f(y)}H${f(x + w - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w)} ${f(y + q)}V${f(y + h - q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + w - q)} ${f(y + h)}H${f(x + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x)} ${f(y + h - q)}V${f(y + q)}A${f(q)} ${f(q)} 0 0 1 ${f(x + q)} ${f(y)}Z`;
}
const pill = (cx: number, cy: number, w: number, h: number) => rrect(cx - w / 2, cy - h / 2, w, h, Math.min(w, h) / 2);

/** A closed polygon with every corner rounded by `r`. */
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
  return d + "Z";
}

const fill = (d: string, tone: FaceTone): FacePiece => ({ d, tone });
const line = (d: string, tone: FaceTone, w?: number): FacePiece => (w === undefined ? { line: d, tone } : { line: d, tone, w });

// ── noses (the two older ones are drawn in npc-art.ts) ───────────────────────

export const NOSES: Partial<Record<NoseStyle, FacePiece[]>> = {
  button: [fill(circle(1, 6, 7.5), "nose")],
  tiny: [fill(circle(1, 6, 4.5), "nose")],
  long: [fill(pill(1, -2, 9, 32), "nose"), fill(rrect(-7, 10, 16, 10, 5), "nose")],
  wide: [fill(rrect(-10, 4, 22, 11, 5.5), "nose"), fill(pill(1, -3, 8, 16), "nose")],
  pointy: [fill("M1 -12Q4 -12 11 12Q12 16 8 16H-6Q-10 16 -9 12Q-2 -12 1 -12Z", "nose")],
  round: [fill(circle(1, 5, 10), "nose")],
  /** No nose at all. */
  none: [],
};

// ── eyebrows ─────────────────────────────────────────────────────────────────

/** One brow as a stroke from `from` to `to` (bending through `bend`), `w` thick, drawn for the right eye; `side` -1 mirrors it for the left. */
const BROWS: Record<Exclude<BrowStyle, "none">, { from: [number, number]; bend?: [number, number]; to: [number, number]; w: number }> = {
  straight: { from: [8, -34], to: [32, -34], w: 5 },
  arched: { from: [8, -31], bend: [20, -43], to: [32, -31], w: 5 },
  thick: { from: [8, -35], to: [32, -35], w: 8.5 },
  thin: { from: [8, -33], bend: [20, -38], to: [32, -33], w: 2.8 },
  angled: { from: [8, -30], to: [32, -38], w: 5 },
  worried: { from: [8, -39], to: [32, -31], w: 5 },
  high: { from: [8, -39], bend: [20, -45], to: [32, -39], w: 5 },
  bushy: { from: [7, -33], bend: [20, -43], to: [33, -33], w: 8.5 },
};

export function browPieces(style: BrowStyle): FacePiece[] {
  if (style === "none") return [];
  const b = BROWS[style];
  return ([1, -1] as const).map((s) => {
    const p = (pt: [number, number]) => `${f(s * pt[0])} ${pt[1]}`;
    return line(`M${p(b.from)}${b.bend ? `Q${p(b.bend)} ` : "L"}${p(b.to)}`, "brow", b.w);
  });
}

// ── mouths (the resting smile; the other expressions keep their own) ─────────

export const MOUTHS: Record<MouthStyle, FacePiece[]> = {
  smile: [line("M-8 28Q3 37 15 24", "stroke")],
  smirk: [line("M-8 30Q3 33 9 29Q13 26 16 21", "stroke")],
  wide: [line("M-15 25Q3 41 21 21", "stroke")],
  small: [line("M-3 29Q3 34 9 28", "stroke")],
  toothy: [fill("M-12 24Q3 35 17 23Q17 37 3 38Q-11 37 -12 24Z", "mouth"), fill("M-10.5 25.5Q3 34 15.5 24.5L15 29Q3 37 -10 30Z", "teeth")],
  cat: [line("M-13 27Q-6 35 1 28Q8 35 15 27", "stroke")],
  neutral: [line("M-6 30H12", "stroke")],
  open: [fill("M-9 25Q3 29 15 24Q15 37 3 37Q-8 37 -9 25Z", "mouth"), fill(circle(3, 34.5, 4.5), "tongue")],
  tongue: [fill(rrect(-1, 30, 10, 12, 5), "tongue"), line("M-8 29Q3 38 15 26", "stroke")],
};

// ── ears ─────────────────────────────────────────────────────────────────────

/** The ear on one side, for a head `half` wide each side (`side` 1 is the right). Drawn behind the head, so only the part past its edge shows. */
export function earPieces(style: EarStyle, half: number, side: 1 | -1): FacePiece[] {
  const x = (v: number) => side * v;
  const poly = (pts: [number, number][], r: number) => roundPoly(pts.map(([px, py]): [number, number] => [x(half + px), py]), r);
  switch (style) {
    case "none":
      return [];
    case "small":
      return [fill(circle(x(half - 1), 2, 8), "skin")];
    case "big":
      return [fill(circle(x(half + 2), 2, 14), "skin")];
    case "pointed":
      return [fill(poly([[-8, -6], [20, -16], [18, 8], [9, 17], [-8, 17]], 5), "skin")];
    case "elf":
      return [fill(poly([[-8, -4], [32, -32], [19, 4], [10, 17], [-8, 17]], 4), "skin")];
    case "round":
    default:
      return [fill(circle(x(half), 2, 11), "skin")];
  }
}
