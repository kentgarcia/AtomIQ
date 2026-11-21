/**
 * The learner's animation level, as pure decisions (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §5.6). Framework-free and
 * unit-tested (`npm run test:motion-level`).
 *
 *   max      Everything, as designed: idle life, loops, shine, particles, every pop and stamp. The device tier may still thin
 *            the idle loops and the particles on a slow phone (`device-profile-core.ts`), as before.
 *   reduced  Everything that happens BECAUSE of something the learner did still plays (a pop, a stamp, a sheet sliding in, a
 *            claim), but nothing runs on its own: no idle life (Shrodi, teachers, scene figures, fireflies), no loops (shine
 *            sweeps, glows, bobbing cues, twinkles), and bursts throw half their particles.
 *   off      No animation: every moment is simply there. This is what the system's "reduce motion" setting already does,
 *            and that setting still wins whatever the level is.
 *
 * "max" is the app as it was before levels existed; nothing in it changes.
 */
import type { DeviceTier, MotionBudget } from "@/services/device-profile-core";

export type MotionLevel = "max" | "reduced" | "off";

export const MOTION_LEVELS: readonly MotionLevel[] = ["max", "reduced", "off"];

export const MOTION_LEVEL_LABEL: Record<MotionLevel, string> = { max: "Max", reduced: "Reduced", off: "Disabled" };

export const MOTION_LEVEL_NOTE: Record<MotionLevel, string> = {
  max: "Everything moves, as designed.",
  reduced: "Moments you cause still play. Nothing moves on its own, and bursts are smaller. Easier on slower phones.",
  off: "No animation. Everything is simply there. The fastest.",
};

export const normalizeLevel = (value: unknown): MotionLevel | null => (value === "max" || value === "reduced" || value === "off" ? value : null);

/** What a learner who has not chosen gets: a slow phone starts on reduced, every other phone on max. */
export const defaultLevelFor = (tier: DeviceTier): MotionLevel => (tier === "low" ? "reduced" : "max");

export const effectiveLevel = (stored: MotionLevel | null, tier: DeviceTier): MotionLevel => stored ?? defaultLevelFor(tier);

/** Animation of every kind is off: the level is "off", or the system asks for reduced motion. The one rule behind `useReducedMotion`. */
export const allMotionOff = (level: MotionLevel, systemReduced: boolean): boolean => level === "off" || systemReduced;

/** Nothing may run on its own (idle life, loops, shine): any level but max, or the system's reduced motion. */
export const idleOff = (level: MotionLevel, systemReduced: boolean): boolean => level !== "max" || systemReduced;

/** The device's budget as the level changes it: reduced holds every idle loop still and halves the burst; max leaves it alone. */
export const budgetForLevel = (device: MotionBudget, level: MotionLevel): MotionBudget =>
  level === "max" ? device : { ...device, idleFps: 0, particleShare: Math.min(device.particleShare, 0.5) };
