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

export const NOSE_STYLES = ["single", "double", "button", "tiny", "long", "wide", "pointy", "round", "anime", "none"] as const;
export type NoseStyle = (typeof NOSE_STYLES)[number];

export const BROW_STYLES = ["none", "straight", "arched", "thick", "thin", "angled", "worried", "high", "bushy", "hero", "saiyan"] as const;
export type BrowStyle = (typeof BROW_STYLES)[number];

export const MOUTH_STYLES = ["smile", "smirk", "wide", "small", "toothy", "cat", "neutral", "open", "tongue", "trainer", "whiskers", "scargrin"] as const;
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
  // Cute horizontal oval button nose
  button: [fill(pill(1, 6, 14.5, 10.5), "nose")],
  // Petite vertical mini-capsule nose
  tiny: [fill(pill(1, 5, 8.5, 12.5), "nose")],
  // Sculpted bridge with a right-facing rounded tip
  long: [fill(pill(1, -1, 9, 23), "nose"), fill(pill(3.5, 8, 12.5, 9), "nose")],
  // Soft rounded bulb nose: short bridge with a wide plush base
  wide: [fill(pill(1, 1, 9.5, 19), "nose"), fill(pill(1, 7.5, 17.5, 11), "nose")],
  // Crisp L-hook upturned nose with rounded corners
  pointy: [fill(roundPoly([[0, -7], [5, -7], [8.5, 8], [6.5, 12.5], [-5.5, 12.5], [-5.5, 7.5], [0.5, 7.5]], 2.4), "nose")],
  // Cute round ball nose
  round: [fill(circle(1, 6.5, 7.2), "nose")],
  // Sharp anime triangular nose shadow wedge
  anime: [fill(roundPoly([[1, -3], [8.5, 9], [0, 12], [-2, 8]], 1.8), "nose")],
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
  hero: { from: [7, -29], bend: [19, -35], to: [34, -41], w: 6.5 },
  saiyan: { from: [6, -27], bend: [16, -31], to: [35, -43], w: 8 },
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
  // Warm, balanced everyday smile with a slight upward lilt on the right
  smile: [line("M-10 27.5Q1 36.5 13 25.5", "stroke")],
  // Confident asymmetric smirk with a corner cheek crease
  smirk: [line("M-9 29.5Q3 32.5 14 23.5", "stroke"), line("M12.5 20.5Q16.5 22 16 26", "stroke", 3.4)],
  // Broad beaming smile with happy corner dimples
  wide: [
    line("M-15 25.5Q1 39.5 17 24.5", "stroke"),
    line("M-17.5 22.5Q-15 25.5 -13.5 28.5", "stroke", 3.4),
    line("M15.5 27.5Q17 24.5 19.5 21.5", "stroke", 3.4),
  ],
  // Sweet petite pocket smile centered under the nose
  small: [line("M-5.5 28.5Q1 34 7.5 27.5", "stroke")],
  // Bright D-shaped toothy grin with upper teeth band and warm tongue
  toothy: [
    fill("M-14 24Q1 26 16 23.5Q15.5 39 1 39Q-13.5 39 -14 24Z", "mouth"),
    fill("M-12.6 24.2Q1 26 14.6 23.7Q14 31 1 31.2Q-12 31 -12.6 24.2Z", "teeth"),
    fill("M-7.5 36.8Q1 32 9.5 36.8Q5.5 39 1 39Q-3.5 39 -7.5 36.8Z", "tongue"),
  ],
  // Playful :3 cat smile with two rounded lobes meeting at a center peak
  cat: [line("M-12 27.5Q-5.5 35.5 1 27.5Q7.5 35.5 14 27.5", "stroke")],
  // Calm, centered resting expression
  neutral: [line("M-8 29.5Q1 30.5 10 29.5", "stroke")],
  // Cheerful open D-mouth with a tongue nestled cleanly inside the lower curve
  open: [
    fill("M-11.5 24.5Q1 26.5 13.5 24Q13.5 39 1 39Q-11.5 39 -11.5 24.5Z", "mouth"),
    fill("M-7.5 36.2Q1 30.5 9.5 36.2Q5.5 39 1 39Q-3.5 39 -7.5 36.2Z", "tongue"),
  ],
  // Cheeky smile with a tilted rounded tongue peeking out from the lip line
  tongue: [
    fill("M0 30.2L10.5 28.2L11.6 35.2A5.3 5.3 0 0 1 1.2 37.2Z", "tongue"),
    line("M-11 27.5Q1 36 14 25", "stroke"),
  ],
  // Anime trainer grin: confident open hero smile with iconic Z-shaped lightning-bolt cheek marks
  trainer: [
    line("M-43 13L-33 11L-39 18L-29 16", "stroke", 2.4),
    line("M43 13L33 11L39 18L29 16", "stroke", 2.4),
    fill("M-15 23.5L16 22.5Q15.5 39.5 1 39.5Q-14 39.5 -15 23.5Z", "mouth"),
    fill("M-13.5 23.8L14.5 22.9Q14 30.2 1 30.5Q-12.5 30.2 -13.5 23.8Z", "teeth"),
    fill("M-8 36.8Q1 31.5 10 36.8Q5.8 39.5 1 39.5Q-3.8 39.5 -8 36.8Z", "tongue"),
  ],
  // Shinobi fox whiskers (Naruto-inspired): three whisker marks on each cheek with a confident toothy smirk
  whiskers: [
    line("M-44 8L-30 10", "stroke", 2.4),
    line("M-45 14L-30 15", "stroke", 2.4),
    line("M-43 20L-30 20", "stroke", 2.4),
    line("M44 8L30 10", "stroke", 2.4),
    line("M45 14L30 15", "stroke", 2.4),
    line("M43 20L30 20", "stroke", 2.4),
    fill("M-14 25L17 22Q16 38 1 38Q-13 38 -14 25Z", "teeth"),
  ],
  // Pirate captain grin (Luffy-inspired): huge beaming two-row toothy grin with the stitched scar under the left eye
  scargrin: [
    line("M-33 12Q-23 15 -14 12", "stroke", 2.4),
    line("M-28 9.5L-27 15.5", "stroke", 2.4),
    line("M-20 10L-19 16", "stroke", 2.4),
    fill("M-18 23Q1 25 20 22.5Q19 40 1 40Q-17 40 -18 23Z", "teeth"),
    line("M-15 31.5Q1 33 17 31", "stroke", 2.4),
  ],
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
