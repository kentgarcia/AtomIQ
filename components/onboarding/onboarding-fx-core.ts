/**
 * The "Building your path" moment of onboarding, as pure maths (no React), so the timeline is
 * unit-tested (`scripts/test-onboarding.mjs`) and `PlanStep.tsx` only draws it. Tier C: seen once.
 * The feeling is "this was made for me": a bar fills while three lines, each repeating one of the
 * learner's answers, appear and are ticked off one by one, then the bar bursts and the page moves on.
 *
 *     0 .. 2600   bar fills (easeInOut)
 *   400 .. 700    line 1 fades in and rises 10, 1200..1500 line 2, 2000..2300 line 3
 *   700 .. 930    tick 1 pops (0.35 to 1.15 to 1) with a ring, 1500 tick 2, 2300 tick 3
 *  2600 ..        burst at the bar's end (drawn by `Burst`, hangs off `PLAN_FX.burst`)
 *  3000           the step is done and the screen moves on by itself
 *
 * Frame 0 is "nothing there yet" (empty bar, lines invisible, ticks absent); the last frame is the
 * plain finished checklist, so reduced motion shows it. Every time sits in `PLAN_FX`.
 */

import { clamp01, easeInOut, easeOut, lerp } from "../motion/motion-core.ts";

export const PLAN_FX = {
  barEnd: 2600,
  /** When each line starts to appear. */
  lines: [400, 1200, 2000],
  lineMs: 300,
  lineRise: 10,
  /** When each tick starts to pop. */
  ticks: [700, 1500, 2300],
  tickPop: 130,
  tickSettle: 100,
  tickFrom: 0.35,
  tickPeak: 1.15,
  ringMs: 320,
  burst: 2600,
  /** The step moves on. */
  total: 3000,
} as const;

/** How long the finished checklist is shown with reduced motion before the step moves on. */
export const PLAN_REDUCED_HOLD = 600;

/** How full the bar is at `t`, 0 to 1. */
export function planBarFrame(t: number): number {
  'worklet';
  return easeInOut(clamp01(t / PLAN_FX.barEnd));
}

export interface PlanLineFrame {
  opacity: number;
  /** Down is positive; it starts `lineRise` below and ends at 0. */
  y: number;
}

/** Line `i` arriving. */
export function planLineFrame(t: number, i: number): PlanLineFrame {
  'worklet';
  const p = clamp01((t - (PLAN_FX.lines[i] ?? 0)) / PLAN_FX.lineMs);
  const e = easeOut(p);
  return { opacity: e, y: lerp(PLAN_FX.lineRise, 0, e) };
}

export interface PlanTickFrame {
  scale: number;
  opacity: number;
  ringScale: number;
  ringOpacity: number;
}

/** Tick `i` popping: from 0.35 up past 1 and back, with a ring that grows and fades. Absent before its time. */
export function planTickFrame(t: number, i: number): PlanTickFrame {
  'worklet';
  const { tickPop, tickSettle, tickFrom, tickPeak, ringMs } = PLAN_FX;
  const local = t - (PLAN_FX.ticks[i] ?? 0);
  if (local <= 0) return { scale: tickFrom, opacity: 0, ringScale: 1, ringOpacity: 0 };
  const scale = local < tickPop ? lerp(tickFrom, tickPeak, easeOut(local / tickPop)) : lerp(tickPeak, 1, easeInOut(clamp01((local - tickPop) / tickSettle)));
  const ring = clamp01(local / ringMs);
  return {
    scale,
    opacity: clamp01(local / 40),
    ringScale: lerp(1, 1.7, easeOut(ring)),
    ringOpacity: local >= ringMs ? 0 : 0.5 * (1 - ring),
  };
}
