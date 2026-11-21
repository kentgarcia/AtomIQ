/**
 * Did the app die last time, and what should the learner be offered because of it? (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.7)
 * Framework-free and unit-tested (`npm run test:crash-guard`).
 *
 * A JavaScript app cannot see its own crash (a native crash, the system killing it for memory, a frozen app force-closed), so it
 * keeps a flag instead: `running` is true while the app is in front and false once it has gone to the background (which is also
 * what happens before the learner swipes it away, presses back to leave, or the system tidies it up, so those are not crashes).
 * A start that finds `running` still true means the last session ended while the app was in front: a crash.
 * The one thing it cannot tell from a crash is a dev reload, so a development build does not trust the flag (`trustRunning`);
 * there the prompt is tried with a simulated crash (`simulated`, set from the perf probe).
 *
 * The advice is about animation, because that is the one setting that makes a struggling phone lighter: Reduced after a first
 * crash, Disabled after two in two weeks or when Reduced did not hold. It is offered once per crash and never again for the same one.
 */
import type { MotionLevel } from "@/components/motion/motion-level-core";

export interface GuardState {
  /** The app is (or was, at the last write) in front. */
  running: boolean;
  /** When each of the last few crashes was found, ms since 1970, oldest first. */
  crashes: number[];
  /** How many crashes have ever been found. */
  total: number;
  /** `total` at the last time the learner answered the prompt: a crash above it is still unanswered. */
  prompted: number;
  /** Set from the perf probe: the next start counts as a crash (a development build cannot tell a crash from a reload). */
  simulated: boolean;
}

export const EMPTY_GUARD: GuardState = { running: false, crashes: [], total: 0, prompted: 0, simulated: false };

/** Crashes older than this no longer count toward "again and again". */
export const CRASH_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const KEEP = 10;

export const normalizeGuard = (raw: unknown): GuardState => {
  if (!raw || typeof raw !== "object") return EMPTY_GUARD;
  const r = raw as Record<string, unknown>;
  const crashes = Array.isArray(r.crashes) ? r.crashes.filter((n): n is number => typeof n === "number" && Number.isFinite(n)).slice(-KEEP) : [];
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
  const total = Math.max(num(r.total, crashes.length), crashes.length);
  return { running: r.running === true, crashes, total, prompted: Math.min(num(r.prompted, 0), total), simulated: r.simulated === true };
};

/** The state after a start: was the last session a crash, and the new state (running again). */
export const onLaunch = (prev: GuardState, now: number, trustRunning: boolean): { state: GuardState; crashed: boolean } => {
  const crashed = prev.simulated || (trustRunning && prev.running);
  return {
    crashed,
    state: {
      running: true,
      simulated: false,
      crashes: crashed ? [...prev.crashes, now].slice(-KEEP) : prev.crashes,
      total: prev.total + (crashed ? 1 : 0),
      prompted: prev.prompted,
    },
  };
};

/** Gone to the background (or inactive): whatever happens next is not a crash. */
export const onBackground = (s: GuardState): GuardState => (s.running ? { ...s, running: false } : s);

/** Back in front. */
export const onForeground = (s: GuardState): GuardState => (s.running ? s : { ...s, running: true });

export const onAnswered = (s: GuardState): GuardState => (s.prompted === s.total ? s : { ...s, prompted: s.total });

export const simulateCrash = (s: GuardState): GuardState => ({ ...s, simulated: true });

export const recentCrashes = (s: GuardState, now: number): number => s.crashes.filter((t) => now - t <= CRASH_WINDOW_MS).length;

export interface CrashAdvice {
  /** The level to offer first. */
  level: Exclude<MotionLevel, "max">;
  /** Crashes in the last two weeks. */
  crashes: number;
}

/** What to offer at this start, or null: nothing unanswered, or the animation is already as low as it goes. */
export const adviceFor = (s: GuardState, current: MotionLevel, now: number): CrashAdvice | null => {
  const recent = recentCrashes(s, now);
  if (s.total <= s.prompted || current === "off") return null;
  // A first crash on Max gets Reduced; a repeat, or one that happened on Reduced already, gets Disabled
  const level = recent >= 2 || current === "reduced" ? "off" : "reduced";
  return { level, crashes: Math.max(recent, 1) };
};
