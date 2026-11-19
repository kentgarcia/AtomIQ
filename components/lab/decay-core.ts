/**
 * The Radioactive Decay Lab's rules and its sample, as pure maths (no React), so they are
 * unit-tested (`scripts/test-decay.mjs`) and `DecayLab.tsx` only draws them.
 *
 * The sample is 100 dots, each standing for `initial / 100` atoms. Which dot decays when is fixed
 * once by `planDecay`: dot `k` (by rank) decays when the fraction already gone first reaches
 * `(k + 0.5) / 100`, so at every moment the number of dots left matches the half-life law to within
 * one dot, and which dots go first is shuffled. Time is measured in half-lives (`h`); the real unit
 * (years, days, hours) is only for labels. One clock `h` drives the picture whether the learner
 * plays it or drags the time slider, so scrubbing back brings the dots back.
 */

import { clamp01, easeOut, seeded } from "../motion/motion-core.ts";

export interface Isotope {
  key: string;
  label: string;
  halfLife: number;
  unit: string;
  tone: "primary" | "success" | "info";
}

export const ISOTOPES: readonly Isotope[] = [
  { key: "c14", label: "Carbon-14", halfLife: 5730, unit: "years", tone: "primary" },
  { key: "i131", label: "Iodine-131", halfLife: 8, unit: "days", tone: "success" },
  { key: "tc99m", label: "Technetium-99m", halfLife: 6, unit: "hours", tone: "info" },
];

/** The sample on the page: dots, and the half-lives the lab shows. */
export const DOTS = 100;
export const MAX_H = 4;
/** Watching runs this long per half-life, ms. */
export const MS_PER_HALF_LIFE = 2500;
export const WATCH_MS = MAX_H * MS_PER_HALF_LIFE;

export const PREDICT = { initial: 1000, options: [750, 500, 250, 125], answer: 250 } as const;
export const CHALLENGE = { initial: 800, min: 150, max: 250 } as const;

export const DISCOVERIES = [
  { text: "Half of the sample decays every half-life", right: true },
  { text: "All atoms disappear after one half-life", right: false },
  { text: "The sample increases over time", right: false },
] as const;

/** Atoms left after `h` half-lives. */
export function remainingAtoms(initial: number, h: number): number {
  'worklet';
  return initial * Math.pow(0.5, h);
}

export function inChallengeRange(left: number): boolean {
  return left >= CHALLENGE.min && left <= CHALLENGE.max;
}

export interface DecayAtom {
  /** When it decays, in half-lives from the start. */
  decayAt: number;
  /** Which way its spark flies, radians. */
  angle: number;
}

/** The sample's fate, decided once. The same call always gives the same plan. */
export function planDecay(count: number = DOTS): DecayAtom[] {
  const luck = Array.from({ length: count }, (_, i) => seeded(i, 61));
  return luck.map((v, i) => {
    const rank = luck.filter((w) => w < v).length;
    return { decayAt: -Math.log2(1 - (rank + 0.5) / count), angle: seeded(i, 62) * Math.PI * 2 };
  });
}

/** How many dots are left at `h`. */
export function dotsLeft(plan: DecayAtom[], h: number): number {
  'worklet';
  let n = 0;
  for (let i = 0; i < plan.length; i++) if (plan[i]!.decayAt > h) n++;
  return n;
}

export interface AtomFrame {
  /** The dot itself: 1 and full until it decays, then it flashes out. */
  scale: number;
  opacity: number;
  /** The spark it throws: 0 to 1 along its path, and its fade. */
  sparkP: number;
  sparkOpacity: number;
}

const FLASH = 0.12;
const SPARK = 0.35;

export function atomFrame(a: DecayAtom, h: number): AtomFrame {
  'worklet';
  const dt = h - a.decayAt;
  if (dt < 0) return { scale: 1, opacity: 1, sparkP: 0, sparkOpacity: 0 };
  const k = clamp01(dt / FLASH);
  const sp = clamp01(dt / SPARK);
  return {
    scale: k >= 1 ? 1 : 1 + 0.4 * Math.sin(Math.PI * k),
    opacity: 1 - easeOut(k),
    sparkP: easeOut(sp),
    sparkOpacity: sp >= 1 ? 0 : 1 - sp,
  };
}

export function formatCount(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** The real time at `h` half-lives: "11,460 years". */
export function formatTime(h: number, iso: Isotope): string {
  const t = h * iso.halfLife;
  const shown = t >= 100 ? Math.round(t) : Math.round(t * 10) / 10;
  return `${shown.toLocaleString("en-US")} ${iso.unit}`;
}

/** The percent left after `h` half-lives. */
export function percentLeft(h: number): number {
  return Math.round(100 * Math.pow(0.5, h));
}

export interface DecayCue {
  /** ms from the start of the watch. */
  at: number;
  kind: "click" | "half-life";
  /** For a half-life cue: which one (1 to 4). */
  n?: number;
}

/** The sounds of a watch: a Geiger click for every dot that decays, a thud at each half-life. Sorted by time. */
export function decayCues(plan: DecayAtom[]): DecayCue[] {
  const cues: DecayCue[] = [];
  for (const a of plan) if (a.decayAt <= MAX_H) cues.push({ at: a.decayAt * MS_PER_HALF_LIFE, kind: "click" });
  for (let n = 1; n <= MAX_H; n++) cues.push({ at: n * MS_PER_HALF_LIFE, kind: "half-life", n });
  return cues.sort((x, y) => x.at - y.at);
}

/** Points of the decay curve for a graph `w` by `hgt` px with `pad` around it. */
export function curvePath(w: number, hgt: number, pad: number, steps = 48): string {
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const h = (MAX_H * i) / steps;
    pts.push(`${(pad + (w - 2 * pad) * (h / MAX_H)).toFixed(1)} ${(hgt - pad - (hgt - 2 * pad) * Math.pow(0.5, h)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")}`;
}

export function graphX(h: number, w: number, pad: number): number {
  'worklet';
  return pad + (w - 2 * pad) * (h / MAX_H);
}

export function graphY(h: number, hgt: number, pad: number): number {
  'worklet';
  return hgt - pad - (hgt - 2 * pad) * Math.pow(0.5, h);
}
