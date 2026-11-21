/**
 * Runs the auto-walk (plan in `perf-walk-core.ts`): resets the probe, opens each stop with the router, holds it, closes it, then goes
 * Home and opens the share sheet with the report. Dev and preview builds only (it is required from the probe screen and the HUD).
 * A tab that is locked by the tour sends the learner Home; the report says nothing about it, so finish or skip the tour first.
 */
import type { useRouter } from "expo-router";
import { Share } from "react-native";

import { FLUSH_MS, walkPlan } from "./perf-walk-core";
import { buildReport } from "./perf-report";
import { beginWalkStep, endWalkStep, getPerfSnapshot, resetPerf, setPerfSnapshot } from "./perf-store";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let cancelled = false;

export const cancelWalk = (): void => {
  cancelled = true;
};

export async function runWalk(router: ReturnType<typeof useRouter>, share: boolean = true): Promise<void> {
  if (getPerfSnapshot().walk.running) return;
  cancelled = false;
  const plan = walkPlan();
  router.navigate("/(tabs)" as never);
  await sleep(1200);
  resetPerf();
  setPerfSnapshot({ walk: { running: true, done: 0, total: plan.length } });
  try {
    for (let i = 0; i < plan.length && !cancelled; i++) {
      const { stop, visit, holdMs } = plan[i];
      beginWalkStep(stop.name, visit);
      if (stop.kind === "tab") router.navigate(stop.href as never);
      else router.push(stop.href as never);
      await sleep(holdMs);
      if (stop.kind === "push") router.back();
      await sleep(FLUSH_MS);
      endWalkStep();
      setPerfSnapshot({ walk: { running: true, done: i + 1, total: plan.length } });
    }
  } finally {
    endWalkStep();
    router.navigate("/(tabs)" as never);
    setPerfSnapshot({ walk: { running: false, done: getPerfSnapshot().walk.done, total: plan.length } });
  }
  await sleep(FLUSH_MS);
  if (share && !cancelled) await Share.share({ message: buildReport() });
}
