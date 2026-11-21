/**
 * `useRenderTimer("/shop")`: times how long a screen's component takes on the JS thread, from the start of its render to the end of its
 * commit (its children included), and adds it to the probe's per-screen table and to the auto-walk step that is open. Works in release
 * builds too (React's Profiler does not report in them), which is why it is not a `<Profiler>`. A no-op unless the probe is in this build
 * (`PERF_PROBE_ON`). Put it first in the component. It reads the clock while rendering on purpose, so it opts out of the React Compiler.
 */
import { useLayoutEffect, useRef } from "react";

import { PERF_PROBE_ON } from "./perf-flag";
import { recordRender } from "./perf-store";

/** A sample longer than this is a render that was held back, not one that was slow. */
const MAX_SAMPLE_MS = 5000;

function useTimed(id: string): void {
  "use no memo";
  const started = useRef(0);
  // eslint-disable-next-line react-hooks/refs, react-hooks/purity -- measuring the render is the point
  started.current = performance.now();
  useLayoutEffect(() => {
    const ms = performance.now() - started.current;
    // A render whose commit waited for something else (a suspended or held-back tree) is not render cost: dropped, not added
    if (ms < MAX_SAMPLE_MS) recordRender(id, ms);
  });
}

const noop = (_id: string): void => {};

export const useRenderTimer: (id: string) => void = PERF_PROBE_ON ? useTimed : noop;
