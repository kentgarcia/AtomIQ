/**
 * Counts frames for the performance probe (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4). Mounted once in the root layout
 * and only when `PERF_PROBE_ON`. On the UI thread, a frame callback adds one to a histogram bucket and keeps the worst
 * frame: nothing is sent to JS per frame. Every 500 ms JS reads the histogram and turns it into numbers. A second loop
 * on the JS thread counts `requestAnimationFrame` calls and the stalls between them.
 */
import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useFrameCallback, useSharedValue } from "react-native-reanimated";

import { BUCKETS, addLevelWindow, addWindow, bucketOf, diffCounts, emptyBuckets, fpsOf, logHitch, logVisit, summarize } from "./perf-core";
import { getPerfSnapshot, noteWindowWorst, setPerfSnapshot, usePerfSnapshot } from "./perf-store";
import { getMotionLevel } from "@/services/motion-level";

const POLL_MS = 500;
const STALL_MS = 100;

export function PerfCollector() {
  const counts = useSharedValue<number[]>(emptyBuckets());
  const worst = useSharedValue(0);
  /** The worst frame since the last poll: JS reads it and puts it back to 0, so each half second is told apart. */
  const windowWorst = useSharedValue(0);
  /** Counts the frames over `HITCH_MS`, and the length of the latest: JS logs each hitch once, however many polls read it (a busy JS thread polls back to back before its resets reach the UI thread). */
  const hitchId = useSharedValue(0);
  const hitchMs = useSharedValue(0);
  /** True while the app is not in front and for a moment after it returns: the gap of a share sheet or a trip to another app is not a freeze. */
  const quiet = useSharedValue(false);
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const { resets } = usePerfSnapshot();
  const lastResets = useRef(resets);

  useFrameCallback((info) => {
    "worklet";
    if (quiet.get()) return;
    const d = info.timeSincePreviousFrame;
    // The first frame has no predecessor, and a gap over two seconds is the app having been in the background
    if (d === null || d > 2000) return;
    const b = bucketOf(d);
    counts.modify((arr) => {
      "worklet";
      arr[b] += 1;
      return arr;
    });
    if (d > worst.get()) worst.set(d);
    if (d > windowWorst.get()) windowWorst.set(d);
    if (d >= 100) {
      hitchMs.set(d);
      hitchId.set(hitchId.get() + 1);
    }
  });

  // Leaving the app (the share sheet, another app, the notification shade) is not a frame the learner sees: stay quiet until it is back
  const quietJs = useRef(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const apply = (value: boolean) => {
      quietJs.current = value;
      quiet.set(value);
    };
    const sub = AppState.addEventListener("change", (status) => {
      if (timer) clearTimeout(timer);
      if (status === "active") timer = setTimeout(() => apply(false), 800);
      else apply(true);
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [quiet]);

  // The screens in the order they came up (the report reads them as the walk the learner took)
  useEffect(() => {
    const before = getPerfSnapshot();
    setPerfSnapshot({ visits: logVisit(before.visits, { route: pathname || "/", at: Date.now() }) });
  }, [pathname, resets]);

  // A reset clears the UI-thread histogram
  useEffect(() => {
    if (resets === lastResets.current) return;
    lastResets.current = resets;
    counts.set(new Array(BUCKETS).fill(0));
    worst.set(0);
    windowWorst.set(0);
  }, [resets, counts, worst, windowWorst]);

  useEffect(() => {
    let lastTotal = 0;
    let lastCounts = emptyBuckets();
    let lastAt = Date.now();
    let lastHitchId = 0;
    const id = setInterval(() => {
      const now = Date.now();
      const arr = counts.get();
      const total = arr.reduce((a, b) => a + b, 0);
      const delta = total >= lastTotal ? total - lastTotal : total;
      // This window's frames and worst frame belong to the screen on show now (a window that straddles a change counts for the new one)
      const windowMs = windowWorst.get();
      windowWorst.set(0);
      noteWindowWorst(windowMs);
      const route = pathRef.current || "/";
      const before = getPerfSnapshot();
      const level = getMotionLevel();
      const windowCounts = diffCounts(arr, lastCounts);
      const has = delta > 0 || windowMs > 0;
      // A hitch is new only when a frame over the line has happened since the last poll
      const seenId = hitchId.get();
      const newHitch = seenId !== lastHitchId;
      lastHitchId = seenId;
      const hitchLength = hitchMs.get();
      setPerfSnapshot({
        ui: summarize(arr, worst.get()),
        uiFps: fpsOf(delta, now - lastAt),
        routes: has ? { ...before.routes, [route]: addWindow(before.routes[route], windowCounts, windowMs, newHitch) } : before.routes,
        levels: has ? { ...before.levels, [level]: addLevelWindow(before.levels[level], windowCounts, windowMs, now - lastAt, newHitch) } : before.levels,
        hitches: newHitch ? logHitch(before.hitches, { at: now, route, ms: hitchLength, level }) : before.hitches,
      });
      lastTotal = total;
      lastCounts = [...arr];
      lastAt = now;
    }, POLL_MS);
    return () => clearInterval(id);
  }, [counts, worst, windowWorst, hitchId, hitchMs]);

  useEffect(() => {
    let alive = true;
    let frames = 0;
    let windowStart = Date.now();
    let last = Date.now();
    const loop = () => {
      if (!alive) return;
      const now = Date.now();
      if (quietJs.current) last = now;
      if (now - last > STALL_MS) {
        const cur = getPerfSnapshot();
        const level = getMotionLevel();
        const route = pathRef.current || "/";
        const base = cur.levels[level] ?? { counts: emptyBuckets(), worstMs: 0, hitches: 0, stalls: 0, ms: 0 };
        setPerfSnapshot({
          jsStalls: cur.jsStalls + 1,
          stallsByRoute: { ...cur.stallsByRoute, [route]: (cur.stallsByRoute[route] ?? 0) + 1 },
          levels: { ...cur.levels, [level]: { ...base, stalls: base.stalls + 1 } },
        });
      }
      last = now;
      frames += 1;
      if (now - windowStart >= POLL_MS) {
        setPerfSnapshot({ jsFps: fpsOf(frames, now - windowStart) });
        frames = 0;
        windowStart = now;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return () => {
      alive = false;
    };
  }, []);

  return null;
}
