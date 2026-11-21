/**
 * The performance probe's route (components/dev/PerfProbe.tsx). Without the probe in this build (a production build) it just goes home.
 */
import { Redirect } from "expo-router";
import React from "react";

import { PERF_PROBE_ON } from "@/components/dev/perf-flag";

// dev-perf: loaded only when the probe exists in this build; Metro folds the require away in a production build
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PerfProbe: typeof import("@/components/dev/PerfProbe").PerfProbe | null = PERF_PROBE_ON ? require("@/components/dev/PerfProbe").PerfProbe : null;

export default function DevPerfRoute() {
  return PerfProbe ? <PerfProbe /> : <Redirect href="/" />;
}
