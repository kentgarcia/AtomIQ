/**
 * The device's tier and motion budget, read once (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §7). `expo-device` gives the
 * memory and the year class without any permission. The pure decisions are in `device-profile-core.ts`.
 */
import * as Device from "expo-device";
import { Platform } from "react-native";

import { budgetFor, parseTierOverride, tierOf, type DeviceTier, type MotionBudget } from "./device-profile-core";

let cached: { tier: DeviceTier; budget: MotionBudget } | null = null;

const read = () => {
  if (cached) return cached;
  let tier: DeviceTier;
  try {
    tier =
      parseTierOverride(process.env.EXPO_PUBLIC_DEVICE_TIER) ??
      tierOf({ os: Platform.OS, osVersion: Device.osVersion, totalMemory: Device.totalMemory, yearClass: Device.deviceYearClass });
  } catch {
    tier = "mid";
  }
  cached = { tier, budget: budgetFor(tier) };
  return cached;
};

export const getDeviceTier = (): DeviceTier => read().tier;

export const getMotionBudget = (): MotionBudget => read().budget;
