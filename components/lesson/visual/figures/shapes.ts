/**
 * The drawing helpers for lesson figures: they return plain shape objects (`SceneShape`, see content/visual-blocks.ts).
 * Scenes are 100 units wide. Pure functions, no React, erasable syntax: the app, the tests and the content tooling
 * import this same file (docs/features/CONTENT_SOURCE_PHASE5_SPEC.md section 2).
 *
 * Tone convention across the curriculum:
 *   proton = danger (+), neutron = neutral (0), electron = info (-), attention = warning
 */

export type Shape = Record<string, any> & { t: string };
export type Tone = string | undefined;
const round = (n: number) => Math.round(n * 100) / 100;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

export const circle = (x: number, y: number, r: number, tone?: Tone, fill: string = "solid"): Shape => ({ t: "circle", x: round(x), y: round(y), r: round(r), tone, fill });
export const rect = (x: number, y: number, w: number, h: number, tone?: Tone, fill: string = "solid", rx?: number): Shape => ({ t: "rect", x, y, w, h, tone, fill, ...(rx ? { rx } : {}) });
export const line = (x1: number, y1: number, x2: number, y2: number, tone?: Tone, extra: Record<string, any> = {}): Shape => ({ t: "line", x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2), tone, ...extra });
/** A picture from the lesson object art (components/lesson/visual/object-art.ts), centred on (x, y). */
export const art = (id: string, x: number, y: number, size: number): Shape => ({ t: "art", id, x: round(x), y: round(y), size });
export const text = (x: number, y: number, s: string, size: number = 5, extra: Record<string, any> = {}): Shape => ({ t: "text", x: round(x), y: round(y), text: s, size, ...extra });

/** Sunflower packing of `n` particles around (cx, cy); radius `c * sqrt(i)`. */
export function cluster(cx: number, cy: number, n: number, c: number = 3): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const r = c * Math.sqrt(i + 0.5);
    const a = i * GOLDEN;
    return { x: round(cx + r * Math.cos(a)), y: round(cy + r * Math.sin(a)) };
  });
}

/** Point on a circle, angle in degrees (0 = right, 90 = down). */
export function onRing(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const a = (deg * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(a)), y: round(cy + r * Math.sin(a)) };
}

/** A nucleus: protons and neutrons interleaved so both show. */
export function nucleus(cx: number, cy: number, protons: number, neutrons: number, size: number = 2.6): Shape[] {
  const total = protons + neutrons;
  const spots = cluster(cx, cy, total, size * 0.9);
  const shapes: Shape[] = [];
  let p = protons;
  let n = neutrons;
  spots.forEach((s, i) => {
    const takeProton = p > 0 && (n === 0 || i % 2 === 0 || p >= n * 2);
    if (takeProton) {
      shapes.push(circle(s.x, s.y, size, "danger"));
      p--;
    } else if (n > 0) {
      shapes.push(circle(s.x, s.y, size, "neutral"));
      n--;
    } else {
      shapes.push(circle(s.x, s.y, size, "danger"));
      p--;
    }
  });
  return shapes;
}

/** Radius a nucleus of `total` particles occupies. */
export const nucleusRadius = (total: number, size: number = 2.6): number => size * 0.9 * Math.sqrt(total + 0.5) + size;

/**
 * Orbit period per shell (ms). Inner shells are quicker. All divide the 60 s figure loop
 * (SCENE_LOOP_MS), and the whole ring turns together, so electrons never bunch up.
 */
export const SHELL_PERIODS = [6000, 10000, 15000];

/** Electron rings (shell model, 2 then 8) with electrons placed on them. They orbit (idle motion). */
export function electronRings(cx: number, cy: number, electrons: number, base: number = 17, step: number = 11, size: number = 2): Shape[] {
  const shapes: Shape[] = [];
  const caps = [2, 8, 8];
  let left = electrons;
  caps.forEach((cap, ring) => {
    if (left <= 0) return;
    const r = base + ring * step;
    shapes.push(circle(cx, cy, r, undefined, "none"));
    const count = Math.min(cap, left);
    for (let i = 0; i < count; i++) {
      const pt = onRing(cx, cy, r, -90 + (360 / count) * i + ring * 20);
      shapes.push({ ...circle(pt.x, pt.y, size, "info"), motion: { kind: "orbit", cx, cy, period: SHELL_PERIODS[ring] } });
    }
    left -= count;
  });
  return shapes;
}

/** A whole atom drawn around (cx, cy), with its nucleus size scaled to fit. */
export function atom(cx: number, cy: number, protons: number, neutrons: number, electrons: number, opts: { base?: number; step?: number; particle?: number; electronSize?: number } = {}): Shape[] {
  const { base = 17, step = 11, particle = 2.4, electronSize = 2 } = opts;
  return [...electronRings(cx, cy, electrons, base, step, electronSize), ...nucleus(cx, cy, protons, neutrons, particle)];
}

export const arrow = (x1: number, y1: number, x2: number, y2: number, tone?: Tone, width: number = 1): Shape => line(x1, y1, x2, y2, tone, { arrow: true, width });


/** A trembling copy of some circles: the picture of an unstable nucleus. */
export const tremble = (shapes: Shape[]): Shape[] => shapes.map((c, i) => ({ ...c, motion: { kind: "pulse", period: 2000 + (i % 3) * 1000, amount: 0.1, phase: (i % 4) / 4 } }));

/** A zigzag line from x1 to x2 at height y: a wave of electromagnetic radiation. */
export function wave(x1: number, x2: number, y: number, tone?: Tone, { amp = 2.4, steps = 12, width = 1 }: { amp?: number; steps?: number; width?: number } = {}): Shape[] {
  const shapes: Shape[] = [];
  for (let i = 0; i < steps; i++) {
    const xa = x1 + ((x2 - x1) * i) / steps;
    const xb = x1 + ((x2 - x1) * (i + 1)) / steps;
    shapes.push(line(xa, y + (i % 2 ? amp : -amp), xb, y + (i % 2 ? -amp : amp), tone, { width }));
  }
  return shapes;
}

/** Deterministic shuffle of 0..n-1 (authoring time only, so the figure never changes between builds). */
export function shuffled(n: number, seed: number): number[] {
  const list = Array.from({ length: n }, (_, i) => i);
  let s = seed;
  for (let i = n - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** A grid of small circles. `state(i)` returns the tone and fill of nucleus i. */
export function crowd(cx: number, top: number, cols: number, rows: number, gap: number, r: number, state: (i: number) => { tone?: Tone; fill?: string }): Shape[] {
  const shapes: Shape[] = [];
  const left = cx - ((cols - 1) * gap) / 2;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { tone, fill } = state(row * cols + col);
      shapes.push(circle(left + col * gap, top + row * gap, r, tone, fill));
    }
  }
  return shapes;
}

