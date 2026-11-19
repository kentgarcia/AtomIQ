/**
 * The Radiation Shield Lab's rules and its beam, as pure maths (no React), so the physics and the
 * timeline are unit-tested (`scripts/test-shield.mjs`) and `RadiationShieldLab.tsx` only draws them.
 *
 * The physics is the lab's own: the detector reads `100 * exp(-k * factor * thickness)`, where `k`
 * belongs to the material and `factor` to the radiation (alpha is stopped four times as hard as
 * gamma, which is why paper is enough for it).
 *
 * A run sends `BEAM.count` particles one after another down a track (0 at the source, 1 at the
 * detector). Which of them get through is decided once, by `planBeam`, so the picture agrees with
 * the number: exactly `round(reading / 100 * count)` pass and the others stop inside the shield,
 * mostly near its front, each with a small pulse where it stopped. The needle and the digits follow
 * the survivors as they arrive. One linear clock in ms drives everything; frame 0 shows only the
 * resting lab and the last frame the finished run.
 */

import { clamp01, easeOut, lerp, seeded } from "../motion/motion-core.ts";

export type Radiation = "alpha" | "beta" | "gamma";
export type Material = "paper" | "plastic" | "aluminum" | "concrete" | "lead";

/** The reading the lab asks the learner to get under. */
export const THRESHOLD = 20;
export const THICKNESS = { min: 1, max: 20 } as const;
/** The top of the detector's dial. */
export const GAUGE_MAX = 100;

export const RADIATIONS: readonly { key: Radiation; label: string; symbol: string; factor: number; travelMs: number; fact: string }[] = [
  { key: "alpha", label: "Alpha", symbol: "α", factor: 4, travelMs: 1700, fact: "A helium nucleus: big, slow and easily stopped. Even paper blocks it." },
  { key: "beta", label: "Beta", symbol: "β", factor: 1.3, travelMs: 1000, fact: "A fast electron. It goes through paper but a few millimetres of metal stop it." },
  { key: "gamma", label: "Gamma", symbol: "γ", factor: 1, travelMs: 620, fact: "A burst of energy, not a particle. It needs something dense and thick." },
];

export const MATERIALS: readonly { key: Material; label: string; baseK: number }[] = [
  { key: "paper", label: "Paper", baseK: 0.083 },
  { key: "plastic", label: "Plastic", baseK: 0.11 },
  { key: "aluminum", label: "Aluminum", baseK: 0.162 },
  { key: "concrete", label: "Concrete", baseK: 0.223 },
  { key: "lead", label: "Lead", baseK: 0.357 },
];

export function detectorReading(rad: Radiation, mat: Material, thickness: number): number {
  const factor = RADIATIONS.find((r) => r.key === rad)!.factor;
  const baseK = MATERIALS.find((m) => m.key === mat)!.baseK;
  return Math.max(1, Math.round(100 * Math.exp(-baseK * factor * thickness)));
}

export const BEAM = {
  count: 24,
  /** The particles leave the source over this long. */
  emitMs: 1800,
  /** After the last arrival the needle settles for this long before the run is done. */
  settleMs: 500,
} as const;

export interface BeamParticle {
  /** When it leaves the source, ms. */
  emitAt: number;
  /** Where across the beam it travels, -1 (top) to 1 (bottom). */
  lane: number;
  survives: boolean;
  /** For a stopped particle: how deep into the shield it gets, 0 (front face) to 1 (back face). Front-loaded. */
  stop: number;
}

export interface BeamPlan {
  particles: BeamParticle[];
  survivors: number;
  /** How long one particle takes from the source to the detector, ms. */
  travelMs: number;
  reading: number;
  /** The whole run, ms. */
  total: number;
}

/** Decide the run once: who passes, who stops and where. The same inputs always give the same plan. */
export function planBeam(rad: Radiation, mat: Material, thickness: number): BeamPlan {
  const { count, emitMs, settleMs } = BEAM;
  const reading = detectorReading(rad, mat, thickness);
  const survivors = Math.round((reading / 100) * count);
  const travelMs = RADIATIONS.find((r) => r.key === rad)!.travelMs;
  const luck = Array.from({ length: count }, (_, i) => seeded(i, 7 + Math.round(thickness) * 3));
  const step = emitMs / count;
  const particles = luck.map((v, i) => {
    const rank = luck.filter((w) => w < v).length;
    return {
      emitAt: i * step + seeded(i, 8) * step * 0.6,
      lane: seeded(i, 9) * 2 - 1,
      survives: rank < survivors,
      stop: Math.pow(seeded(i, 10), 1.6),
    };
  });
  return { particles, survivors, travelMs, reading, total: emitMs + travelMs + settleMs };
}

export interface ParticleFrame {
  /** Position along the track, 0 to 1. */
  f: number;
  opacity: number;
  scale: number;
}

const HIDDEN: ParticleFrame = { f: 0, opacity: 0, scale: 1 };

/**
 * One particle at time `t`. `a` and `b` are where the shield's front and back face sit on the track
 * (0 to 1). A stopped particle halts inside the shield and flares and fades there; one that got
 * through runs on to the detector and goes out against it.
 */
export function particleFrame(p: BeamParticle, t: number, travelMs: number, a: number, b: number): ParticleFrame {
  'worklet';
  const q = (t - p.emitAt) / travelMs;
  if (q <= 0) return HIDDEN;
  const fadeIn = clamp01((t - p.emitAt) / 70);
  if (!p.survives) {
    const stopF = a + (b - a) * p.stop;
    if (q < stopF) return { f: q, opacity: fadeIn, scale: 1 };
    const k = clamp01((t - (p.emitAt + stopF * travelMs)) / 340);
    if (k >= 1) return { f: stopF, opacity: 0, scale: 1 };
    return { f: stopF, opacity: 1 - easeOut(k), scale: 1 + 0.9 * easeOut(k) };
  }
  if (q < 1) return { f: q, opacity: fadeIn, scale: 1 };
  const k = clamp01((t - (p.emitAt + travelMs)) / 200);
  if (k >= 1) return { f: 1, opacity: 0, scale: 1.5 };
  return { f: 1, opacity: 1 - k, scale: 1 + 0.5 * k };
}

/** How many of the survivors have reached the detector by `t`, as a smooth number (each one eases in over 260 ms). */
export function arrivedAt(plan: BeamPlan, t: number): number {
  'worklet';
  let n = 0;
  for (let i = 0; i < plan.particles.length; i++) {
    const p = plan.particles[i]!;
    if (p.survives) n += easeOut(clamp01((t - (p.emitAt + plan.travelMs)) / 260));
  }
  return n;
}

/** The detector's reading at `t`: it grows as the survivors arrive and ends on the true reading. */
export function readingAt(plan: BeamPlan, t: number): number {
  'worklet';
  if (t >= plan.total) return plan.reading;
  if (plan.survivors === 0) return 0;
  return Math.round(plan.reading * (arrivedAt(plan, t) / plan.survivors));
}

/** The same, unrounded, so the needle glides. */
export function needleReadingAt(plan: BeamPlan, t: number): number {
  'worklet';
  if (t >= plan.total) return plan.reading;
  if (plan.survivors === 0) return 0;
  return plan.reading * (arrivedAt(plan, t) / plan.survivors);
}

/** The needle's angle in degrees: -80 at zero, 80 at the top of the dial. */
export function needleAngle(reading: number): number {
  'worklet';
  return lerp(-80, 80, clamp01(reading / GAUGE_MAX));
}

/** A flash on the detector (1 to 0) for a moment after each survivor lands. */
export function detectorPulse(plan: BeamPlan, t: number): number {
  'worklet';
  let best = 0;
  for (let i = 0; i < plan.particles.length; i++) {
    const p = plan.particles[i]!;
    if (!p.survives) continue;
    const k = (t - (p.emitAt + plan.travelMs)) / 220;
    if (k > 0 && k < 1) best = Math.max(best, 1 - k);
  }
  return best;
}

/** The source's glow while it is firing: 1 at rest, up to 1.12 while emitting, back to rest after. */
export function sourceGlow(t: number): number {
  'worklet';
  if (t <= 0 || t >= BEAM.emitMs + 200) return 1;
  return 1 + 0.12 * (0.5 + 0.5 * Math.sin(t / 70)) * clamp01(Math.min(t / 120, (BEAM.emitMs + 200 - t) / 200));
}

/** The shield's drawn width for a thickness, px. */
export function shieldWidth(thickness: number, maxWidth: number): number {
  return lerp(12, maxWidth, clamp01((thickness - THICKNESS.min) / (THICKNESS.max - THICKNESS.min)));
}

/** An arc of the detector's dial from fraction `f0` to `f1` (0 left end, 1 right end) as an SVG path. */
export function arcPath(cx: number, cy: number, r: number, f0: number, f1: number): string {
  const pt = (f: number) => {
    const ang = Math.PI * (1 - f);
    return `${(cx + r * Math.cos(ang)).toFixed(2)} ${(cy - r * Math.sin(ang)).toFixed(2)}`;
  };
  return `M${pt(f0)} A${r} ${r} 0 0 1 ${pt(f1)}`;
}

/** Where the shield's front and back faces sit on the track (0 to 1) for a track `trackLen` px long. */
export function shieldSpan(trackLen: number, thickness: number, maxWidth: number): { a: number; b: number } {
  const sw = shieldWidth(thickness, maxWidth);
  return { a: (trackLen / 2 - sw / 2) / trackLen, b: (trackLen / 2 + sw / 2) / trackLen };
}

export type BeamSound = "launch" | "emit" | "hit" | "arrive" | "done";

export interface BeamCue {
  /** ms from the start of the run. */
  at: number;
  kind: BeamSound;
}

/**
 * The sounds of a run, on the run's own clock: a launch as the source fires, a soft tick as each
 * particle leaves, a thud where a stopped one halts inside the shield, a Geiger click as each
 * survivor reaches the detector, and the end of the run. Sorted by time, so the screen can
 * schedule them and the test can check them against the picture.
 */
export function beamCues(plan: BeamPlan, a: number, b: number): BeamCue[] {
  const cues: BeamCue[] = [{ at: 0, kind: "launch" }];
  for (const p of plan.particles) {
    cues.push({ at: p.emitAt, kind: "emit" });
    if (p.survives) cues.push({ at: p.emitAt + plan.travelMs, kind: "arrive" });
    else cues.push({ at: p.emitAt + (a + (b - a) * p.stop) * plan.travelMs, kind: "hit" });
  }
  cues.push({ at: plan.total, kind: "done" });
  return cues.sort((x, y) => x.at - y.at);
}
