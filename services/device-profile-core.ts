/**
 * Which kind of phone this is, and the three numbers that depend on it (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §7).
 * Framework-free and unit-tested (`npm run test:perf`). The tier never changes the design: it changes only how fast the
 * decorative idle loops run, how many particles a burst throws, and how many native sound players may be alive. Reduced
 * motion (the OS setting) wins over every tier and is not one.
 */

export type DeviceTier = "high" | "mid" | "low";

export interface DeviceFacts {
  /** `Platform.OS`. */
  os: string;
  /** `Device.osVersion`, e.g. "14" on Android or "17.2" on iOS. */
  osVersion: string | null;
  /** `Device.totalMemory`, bytes, or null when unknown. */
  totalMemory: number | null;
  /** `Device.deviceYearClass`, or null when unknown. */
  yearClass: number | null;
}

export interface MotionBudget {
  /** Decorative idle loops (Shrodi breathing, drifting clouds): 60 is every frame, 30 is half, 0 holds frame 0 (a good drawing). */
  idleFps: 60 | 30 | 0;
  /** Share of a burst's particles that are drawn, 0 to 1. */
  particleShare: number;
  /** Most native players the `expo-audio` engine keeps alive. */
  playerCap: number;
}

const GB = 1024 * 1024 * 1024;

const DOWN: Record<DeviceTier, DeviceTier> = { high: "mid", mid: "low", low: "low" };

export const tierOf = ({ os, osVersion, totalMemory, yearClass }: DeviceFacts): DeviceTier => {
  const major = osVersion ? parseInt(osVersion, 10) : NaN;
  let tier: DeviceTier;
  if (os === "ios") {
    tier = "high";
  } else if (os === "android") {
    // Unknown memory is assumed to be the middle of the market, not the top
    tier = totalMemory === null ? "mid" : totalMemory >= 5.5 * GB ? "high" : totalMemory >= 3.5 * GB ? "mid" : "low";
    // Android 8 and older: no matter the memory, it is an old phone
    if (Number.isFinite(major) && major < 9) tier = "low";
  } else {
    tier = "mid";
  }
  // An old iPhone drops a step even with plenty of memory. Android's year class is NOT used: expo-device computes it from memory and
  // CPU with a table that stops at 2016, so every current phone reads "2016" (a 7 GB Galaxy S21 on Android 15 did, and was rated mid).
  // On Android, age is the OS version above and the memory.
  if (os === "ios" && yearClass !== null && yearClass < 2017) tier = DOWN[tier];
  return tier;
};

export const BUDGETS: Readonly<Record<DeviceTier, MotionBudget>> = {
  high: { idleFps: 60, particleShare: 1, playerCap: 32 },
  mid: { idleFps: 30, particleShare: 0.75, playerCap: 24 },
  low: { idleFps: 0, particleShare: 0.5, playerCap: 16 },
};

export const budgetFor = (tier: DeviceTier): MotionBudget => BUDGETS[tier];

/** `EXPO_PUBLIC_DEVICE_TIER=high|mid|low` forces a tier, to judge a budget on one phone. Anything else is ignored. */
export const parseTierOverride = (value: string | undefined): DeviceTier | null => (value === "high" || value === "mid" || value === "low" ? value : null);

/** How many particles a burst of `count` draws under `share`, never fewer than 4 so it still reads as a burst. */
export const particlesFor = (count: number, share: number): number => (share >= 1 ? count : Math.max(Math.min(count, 4), Math.round(count * share)));

/** The quantum, ms, an idle clock is held to for `idleFps`; 0 means "do not quantise" (every frame). */
export const idleQuantumMs = (idleFps: 60 | 30 | 0): number => (idleFps === 30 ? 1000 / 30 : 0);
