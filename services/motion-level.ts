/**
 * The animation level in use (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.6): one module-level value that screens follow
 * with `useMotionLevel`. `initMotionLevel` reads the saved choice once at start-up (until it has, the default for this
 * phone is in use: max, or reduced on a slow phone); `setMotionLevel` changes it at once and saves it. The decisions are in
 * the framework-free `components/motion/motion-level-core.ts`.
 */
import { useSyncExternalStore } from "react";

import { effectiveLevel, normalizeLevel, type MotionLevel } from "@/components/motion/motion-level-core";
import { getDeviceTier } from "@/services/device-profile";
import { STORAGE_KEYS, getItem, setItem } from "@/services/storage";

let stored: MotionLevel | null = null;
let level: MotionLevel = effectiveLevel(null, getDeviceTier());
const listeners = new Set<() => void>();

const apply = (next: MotionLevel) => {
  if (next === level) return;
  level = next;
  listeners.forEach((l) => l());
};

export const getMotionLevel = (): MotionLevel => level;

/** The saved choice, or null when the learner has never chosen (then the phone's default is in use). */
export const getStoredMotionLevel = (): MotionLevel | null => stored;

export async function initMotionLevel(): Promise<void> {
  try {
    stored = normalizeLevel(await getItem<string>(STORAGE_KEYS.MOTION_LEVEL));
  } catch {
    stored = null;
  }
  apply(effectiveLevel(stored, getDeviceTier()));
}

export async function setMotionLevel(next: MotionLevel): Promise<void> {
  stored = next;
  apply(next);
  try {
    await setItem(STORAGE_KEYS.MOTION_LEVEL, next);
  } catch {
    // The level is in use for this session even if it could not be saved.
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useMotionLevel = (): MotionLevel => useSyncExternalStore(subscribe, getMotionLevel, getMotionLevel);
