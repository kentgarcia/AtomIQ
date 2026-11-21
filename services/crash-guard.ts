/**
 * Runtime of the crash guard (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.7; rules in `crash-guard-core.ts`): reads the saved
 * state at start, decides whether the last session was a crash, then keeps the "app is in front" flag current from AppState.
 * Everything here is quiet: a storage failure never reaches the learner, and nothing leaves the phone.
 * `useCrashAdvice` is what the start-up prompt follows.
 */
import { useMemo, useSyncExternalStore } from "react";
import { AppState, type AppStateStatus } from "react-native";

import type { MotionLevel } from "@/components/motion/motion-level-core";
import { useMotionLevel } from "@/services/motion-level";
import { STORAGE_KEYS, getItem, setItem } from "@/services/storage";
import { EMPTY_GUARD, adviceFor, recentCrashes, normalizeGuard, onAnswered, onBackground, onForeground, onLaunch, simulateCrash, type CrashAdvice, type GuardState } from "./crash-guard-core";

/** When this session started: the advice is judged at the start, so the clock is not read while rendering. */
const STARTED_AT = Date.now();

let state: GuardState = EMPTY_GUARD;
let loaded = false;
let started = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

const save = async (next: GuardState) => {
  state = next;
  emit();
  try {
    await setItem(STORAGE_KEYS.CRASH_GUARD, next);
  } catch {
    // The flag is best effort: a failed write only means a crash may go unnoticed.
  }
};

const onAppState = (status: AppStateStatus) => {
  if (status === "active") void save(onForeground(state));
  else void save(onBackground(state));
};

/** Call once at start-up. A development build does not trust the flag (a reload looks like a crash). */
export async function initCrashGuard(): Promise<void> {
  if (started) return;
  started = true;
  let prev = EMPTY_GUARD;
  try {
    prev = normalizeGuard(await getItem(STORAGE_KEYS.CRASH_GUARD));
  } catch {
    prev = EMPTY_GUARD;
  }
  const trustRunning = !__DEV__ || process.env.EXPO_PUBLIC_CRASH_PROMPT === "1";
  loaded = true;
  await save(onLaunch(prev, STARTED_AT, trustRunning).state);
  // If the app started in the background (a system restart of it), it is not in front yet
  if (AppState.currentState && AppState.currentState !== "active") await save(onBackground(state));
  AppState.addEventListener("change", onAppState);
}

/** The learner has answered the prompt (any answer, or closing it): the same crash is not offered again. */
export const answerCrashPrompt = (): Promise<void> => save(onAnswered(state));

/** Make the next start count as a crash (the perf probe's button): a development build cannot tell a crash from a reload. */
export const simulateCrashOnNextStart = (): Promise<void> => save(simulateCrash(state));

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
const getState = () => state;

/** Crashes found, ever and in the last two weeks (the shared perf report says so). */
export const getCrashSummary = (): { total: number; recent: number } => ({ total: state.total, recent: recentCrashes(state, Date.now()) });

/** What to offer at this start, or null. Follows the saved state and the animation level in use. */
export function useCrashAdvice(): CrashAdvice | null {
  const s = useSyncExternalStore(subscribe, getState, getState);
  const level: MotionLevel = useMotionLevel();
  return useMemo(() => (loaded ? adviceFor(s, level, STARTED_AT) : null), [s, level]);
}
