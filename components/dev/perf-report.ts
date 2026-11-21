/**
 * The probe's plain-text report: gathers what has been measured (the frame store, the sound log, the phone, the build, the animation
 * level) and hands it to the pure formatter `perf-report-core.ts`. Shared from the probe screen and, in one tap and without leaving
 * the screen being judged, from the HUD. docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4.
 */
import Constants, { ExecutionEnvironment } from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { formatReport, type ReportInput } from "./perf-report-core";
import { getPerfSnapshot, getScreenCosts, getWalkSteps } from "./perf-store";
import { getCrashSummary } from "@/services/crash-guard";
import { getDeviceTier } from "@/services/device-profile";
import { getMotionLevel, getStoredMotionLevel } from "@/services/motion-level";
import { getSfxEngineInfo } from "@/services/sfx";
import { FAULT_OUTCOMES, sfxDiag, type SfxOutcome } from "@/services/sfx-diag";

export const OUTCOME_ORDER: SfxOutcome[] = ["played", "late", "lost", "error", "retried", "gate", "skip-gap", "skip-burst", "skip-duck", "evicted"];

/** The faults in the log, one line per cue and reason with how often: "which sound, and why", the thing the counter alone cannot say. */
export const faultReasons = (): string[] => {
  const seen = new Map<string, number>();
  for (const e of sfxDiag.entries()) {
    if (!FAULT_OUTCOMES.includes(e.outcome)) continue;
    const key = `${e.cue} · ${e.outcome}${e.detail ? ` (${e.detail})` : ""}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].sort((a, b) => b[1] - a[1]).map(([key, n]) => `${key} x${n}`);
};

const runtimeName = (): string => {
  switch (Constants.executionEnvironment) {
    case ExecutionEnvironment.StoreClient:
      return "Expo Go";
    case ExecutionEnvironment.Standalone:
      return "standalone build";
    case ExecutionEnvironment.Bare:
      return __DEV__ ? "development build" : "release build";
    default:
      return "unknown runtime";
  }
};

/** The EXPO_PUBLIC switches that change how the app behaves, as they are set. Each is read by name: Metro inlines `process.env.EXPO_PUBLIC_*` only when written out in full. */
const switches = (): string[] =>
  (
    [
      ["EXPO_PUBLIC_DEVICE_TIER", process.env.EXPO_PUBLIC_DEVICE_TIER],
      ["EXPO_PUBLIC_SFX_BACKEND", process.env.EXPO_PUBLIC_SFX_BACKEND],
      ["EXPO_PUBLIC_CRASH_PROMPT", process.env.EXPO_PUBLIC_CRASH_PROMPT],
      ["EXPO_PUBLIC_PERF_PROBE", process.env.EXPO_PUBLIC_PERF_PROBE],
    ] as const
  ).flatMap(([name, value]) => (value ? [`${name}=${value}`] : []));

export const gatherReport = (): ReportInput => {
  const snap = getPerfSnapshot();
  const engine = getSfxEngineInfo();
  const counts = sfxDiag.counts();
  const crashes = getCrashSummary();
  const g = globalThis as { HermesInternal?: unknown; nativeFabricUIManager?: unknown };
  return {
    now: Date.now(),
    startedAt: snap.startedAt,
    device: {
      model: [Device.brand, Device.modelName].filter(Boolean).join(" ") || "unknown device",
      os: `${Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : Platform.OS} ${Device.osVersion ?? String(Platform.Version)}`,
      memoryGb: Device.totalMemory === null ? null : Device.totalMemory / 1024 ** 3,
      yearClass: Device.deviceYearClass,
      tier: getDeviceTier(),
      tierForced: !!process.env.EXPO_PUBLIC_DEVICE_TIER,
    },
    app: {
      version: Constants.expoConfig?.version ?? "unknown",
      runtime: runtimeName(),
      jsBundle: __DEV__ ? "dev" : "release",
      engine: g.HermesInternal ? "Hermes" : "JSC or other",
      newArch: typeof g.nativeFabricUIManager === "undefined" ? false : true,
      flags: [...switches()],
    },
    motion: { level: getMotionLevel(), chosen: getStoredMotionLevel() !== null },
    crashes,
    ui: snap.ui,
    jsFps: snap.jsFps,
    jsStalls: snap.jsStalls,
    routes: snap.routes,
    stallsByRoute: snap.stallsByRoute,
    levels: snap.levels,
    hitches: snap.hitches,
    visits: snap.visits,
    costs: getScreenCosts(),
    walk: getWalkSteps(),
    sound: {
      engine: `${engine.backend} (${engine.reason}), ${engine.live} live`,
      outcomes: OUTCOME_ORDER.map((o) => `${o} ${counts[o]}`).join(", "),
      faults: faultReasons(),
      cues: [...sfxDiag.perCue()]
        .filter(([, row]) => FAULT_OUTCOMES.some((o) => row[o] > 0) || row.late > 0 || row["skip-gap"] > 0 || row["skip-burst"] > 0)
        .map(([cue, row]) => `${cue}: ${OUTCOME_ORDER.filter((o) => row[o] > 0).map((o) => `${o} ${row[o]}`).join(", ")}`),
    },
  };
};

export const buildReport = (): string => formatReport(gatherReport());
