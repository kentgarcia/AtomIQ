/**
 * What the performance probe has measured so far: one module-level snapshot the collector writes and the HUD and the probe
 * screen read (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4). No React here; the hook is `usePerfSnapshot`.
 */
import { useSyncExternalStore } from "react";

import { addRender, emptyBuckets, emptyStep, summarize, type FrameSummary, type Hitch, type LevelStat, type RouteStat, type ScreenCost, type Visit, type WalkStep } from "./perf-core";

export interface PerfSnapshot {
  /** UI-thread frames since the last reset. */
  ui: FrameSummary;
  /** UI frames per second over the last poll. */
  uiFps: number;
  /** JS-thread frames per second over the last poll (a `requestAnimationFrame` loop). */
  jsFps: number;
  /** Times the JS thread was held for over 100 ms since the last reset. */
  jsStalls: number;
  /** The small always-on-top readout. */
  hud: boolean;
  /** Frames by screen since the last reset (the route is read at the end of each half-second window). */
  routes: Record<string, RouteStat>;
  /** The newest frames over 100 ms, with the screen they happened on. */
  hitches: Hitch[];
  /** Counts a reset, so the collector can clear the UI-thread histogram. */
  resets: number;
  /** Frames, hitches, stalls and time by animation level ("max" | "reduced" | "off") since the last reset. */
  levels: Record<string, LevelStat>;
  /** JS stalls by screen since the last reset. */
  stallsByRoute: Record<string, number>;
  /** The screens in the order they came up since the last reset. */
  visits: Visit[];
  /** When the run began: the last reset (or the start of the app). */
  startedAt: number;
  /** The auto-walk: not running, or which stop it is on. */
  walk: { running: boolean; done: number; total: number };
}

let snapshot: PerfSnapshot = { ui: summarize(emptyBuckets(), 0), uiFps: 0, jsFps: 0, jsStalls: 0, hud: true, routes: {}, hitches: [], resets: 0, levels: {}, stallsByRoute: {}, visits: [], startedAt: Date.now(), walk: { running: false, done: 0, total: 0 } };
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const getPerfSnapshot = (): PerfSnapshot => snapshot;

export const setPerfSnapshot = (patch: Partial<PerfSnapshot>): void => {
  snapshot = { ...snapshot, ...patch };
  emit();
};

export const subscribePerf = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/* ---- JS render cost by screen and the auto-walk steps (not reactive: written on every commit of a timed screen) ---- */

let costs: Record<string, ScreenCost> = {};
let steps: WalkStep[] = [];
let current: WalkStep | null = null;

export const recordRender = (id: string, ms: number): void => {
  costs[id] = addRender(costs[id], ms);
  if (current) {
    current.jsMs += ms;
    current.jsWorstMs = Math.max(current.jsWorstMs, ms);
  }
};
export const getScreenCosts = (): Record<string, ScreenCost> => costs;

export const beginWalkStep = (name: string, visit: number): void => {
  current = emptyStep(name, visit);
};
/** Called with each half-second window's worst UI frame while a step is open. */
export const noteWindowWorst = (ms: number): void => {
  if (current && ms > current.worstMs) current.worstMs = ms;
};
export const endWalkStep = (): void => {
  if (current) steps.push(current);
  current = null;
};
export const getWalkSteps = (): WalkStep[] => steps;

export const resetPerf = (): void => {
  costs = {};
  steps = [];
  current = null;
  setPerfSnapshot({ ui: summarize(emptyBuckets(), 0), jsStalls: 0, routes: {}, hitches: [], levels: {}, stallsByRoute: {}, visits: [], startedAt: Date.now(), resets: snapshot.resets + 1 });
};

export const usePerfSnapshot = (): PerfSnapshot => useSyncExternalStore(subscribePerf, getPerfSnapshot, getPerfSnapshot);
