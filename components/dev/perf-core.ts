/**
 * The maths of the performance probe (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4), with no React and no Reanimated, so
 * it is unit-tested (`npm run test:perf`). The probe counts UI-thread frames into a histogram on the UI thread (a
 * handful of additions per frame, nothing sent to JS), and every half second the JS side turns the counts into the
 * numbers of the spec's budget table: share of frames over 1.2x and 2x the display's frame time, the worst frame, and the
 * display's own refresh rate, estimated from the frames themselves so a 90 or 120 Hz phone is judged against its own budget.
 */

/** Bucket edges in ms: bucket i holds frames with `EDGES[i-1] <= delta < EDGES[i]`; the last holds everything from the final edge up. */
export const FRAME_EDGES = [9.5, 12.5, 18, 21, 25, 34, 50, 100] as const;
export const BUCKETS = FRAME_EDGES.length + 1;

/** The bucket a frame of `deltaMs` falls in. Written to run as a worklet too (no closures but the constant). */
export const bucketOf = (deltaMs: number): number => {
  "worklet";
  let i = 0;
  while (i < FRAME_EDGES.length && deltaMs >= FRAME_EDGES[i]) i += 1;
  return i;
};

export const emptyBuckets = (): number[] => new Array(BUCKETS).fill(0);

/** The display's frame time (ms): 8.33 (120 Hz), 11.1 (90 Hz) or 16.7 (60 Hz), from where most frames land. */
export const budgetOf = (counts: readonly number[]): number => {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total < 30) return 1000 / 60;
  if (counts[0] / total > 0.4) return 1000 / 120;
  if (counts[1] / total > 0.4) return 1000 / 90;
  return 1000 / 60;
};

export interface FrameSummary {
  frames: number;
  /** Display frame time the rest is judged against. */
  budgetMs: number;
  refreshHz: number;
  /** Share of frames over 1.2x the budget, 0 to 1. Bucketed: a frame is counted once its whole bucket is over the line, so it may undercount a little. */
  over12: number;
  /** Share of frames over 2x the budget: the ones a learner sees as a hitch. */
  over2: number;
  worstMs: number;
}

/** `budgetMs` is given for a slice of the run (one screen): too few frames of its own to tell the display's refresh rate. */
export const summarize = (counts: readonly number[], worstMs: number, budgetMs: number = budgetOf(counts)): FrameSummary => {
  const frames = counts.reduce((a, b) => a + b, 0);
  const lower = (i: number) => (i === 0 ? 0 : FRAME_EDGES[i - 1]);
  const share = (factor: number) => {
    if (frames === 0) return 0;
    let n = 0;
    for (let i = 0; i < counts.length; i += 1) if (lower(i) >= budgetMs * factor) n += counts[i];
    return n / frames;
  };
  return { frames, budgetMs, refreshHz: Math.round(1000 / budgetMs), over12: share(1.2), over2: share(2), worstMs };
};

/** Frames per second over a window: `frames` counted in `windowMs`. */
export const fpsOf = (frames: number, windowMs: number): number => (windowMs <= 0 ? 0 : Math.round((frames * 1000) / windowMs));

/** The budget table of the spec (§3.1) as a verdict, so the screen can say "ok" or "over" without a reader doing the arithmetic. */
export const verdict = (s: FrameSummary): "ok" | "close" | "over" => {
  if (s.frames < 120) return "ok";
  if (s.over12 > 0.1 || s.over2 > 0.02) return "over";
  if (s.over12 > 0.05 || s.over2 > 0.005) return "close";
  return "ok";
};

/** One line of a plain-text report, for sharing a result out of the app. */
export const reportLine = (label: string, s: FrameSummary): string =>
  `${label}: ${s.frames} frames at ${s.refreshHz} Hz, ${(s.over12 * 100).toFixed(1)}% over 1.2x, ${(s.over2 * 100).toFixed(1)}% over 2x, worst ${Math.round(s.worstMs)} ms (${verdict(s)})`;

/* ---- by screen -------------------------------------------------------------------------------------------- */

/** What one screen (route) has cost so far: its frames, its worst frame, and how many half-second windows held a frame over `HITCH_MS`. */
export interface RouteStat {
  counts: number[];
  worstMs: number;
  hitches: number;
}

/** A frame this long is a hitch the learner sees as the app freezing. */
export const HITCH_MS = 100;

/** The newest hitches kept, each with the screen it happened on. */
export interface Hitch {
  at: number;
  route: string;
  ms: number;
  /** The animation level in use when it happened ("max" | "reduced" | "off"). */
  level?: string;
}
export const MAX_HITCHES = 30;

/** Frames counted since the last look: `now` minus `before` bucket by bucket (a reset makes `now` smaller, then all of `now` is new). */
export const diffCounts = (now: readonly number[], before: readonly number[]): number[] => {
  const reset = now.reduce((a, b) => a + b, 0) < before.reduce((a, b) => a + b, 0);
  return now.map((n, i) => (reset ? n : Math.max(0, n - (before[i] ?? 0))));
};

/** Add one poll window (the frames counted in it and its worst frame) to a screen's running numbers. */
export const addWindow = (stat: RouteStat | undefined, windowCounts: readonly number[], windowWorstMs: number, hitched: boolean = windowWorstMs >= HITCH_MS): RouteStat => {
  const base = stat ?? { counts: emptyBuckets(), worstMs: 0, hitches: 0 };
  return {
    counts: base.counts.map((n, i) => n + (windowCounts[i] ?? 0)),
    worstMs: Math.max(base.worstMs, windowWorstMs),
    // `hitched` is told by the caller when it knows better than the window's worst frame (a hitch is counted once, however many polls read it)
    hitches: base.hitches + (hitched ? 1 : 0),
  };
};

/** Push a hitch onto the log, keeping the newest `MAX_HITCHES`. Returns a new array. */
export const logHitch = (log: readonly Hitch[], hitch: Hitch): Hitch[] => [...log, hitch].slice(-MAX_HITCHES);

export interface RouteRow {
  route: string;
  summary: FrameSummary;
  hitches: number;
}

/** Screens that were on show for at least `minFrames` frames, the worst first (most hitches, then the worst frame). */
export const routeRows = (routes: Readonly<Record<string, RouteStat>>, budgetMs: number, minFrames = 20): RouteRow[] =>
  Object.entries(routes)
    .map(([route, stat]) => ({ route, summary: summarize(stat.counts, stat.worstMs, budgetMs), hitches: stat.hitches }))
    .filter((row) => row.summary.frames >= minFrames || row.hitches > 0)
    .sort((a, b) => b.hitches - a.hitches || b.summary.worstMs - a.summary.worstMs);

export const routeLine = (row: RouteRow): string =>
  `  ${row.route}: ${row.summary.frames} frames, ${(row.summary.over12 * 100).toFixed(0)}% over 1.2x, ${(row.summary.over2 * 100).toFixed(1)}% over 2x, worst ${Math.round(row.summary.worstMs)} ms, ${row.hitches} hitch${row.hitches === 1 ? "" : "es"}`;


/* ---- by animation level, and the screens in the order they were visited ------------------------------------- */

/** What one animation level has cost so far: a screen's numbers plus the JS stalls and the time spent on it. */
export interface LevelStat extends RouteStat {
  stalls: number;
  ms: number;
}

/** Add one poll window to a level's running numbers (`windowMs` is how long the window was). */
export const addLevelWindow = (stat: LevelStat | undefined, windowCounts: readonly number[], windowWorstMs: number, windowMs: number, hitched?: boolean): LevelStat => {
  const base: LevelStat = stat ?? { counts: emptyBuckets(), worstMs: 0, hitches: 0, stalls: 0, ms: 0 };
  return { ...addWindow(base, windowCounts, windowWorstMs, hitched), stalls: base.stalls, ms: base.ms + Math.max(0, windowMs) };
};

/** One screen change: which screen came up and when. */
export interface Visit {
  route: string;
  at: number;
}
export const MAX_VISITS = 40;

/** Push a screen change onto the visit log (the same screen twice in a row is one visit), keeping the newest `MAX_VISITS`. */
export const logVisit = (log: readonly Visit[], visit: Visit): Visit[] => (log.at(-1)?.route === visit.route ? [...log] : [...log, visit].slice(-MAX_VISITS));


/* ---- JS render cost by screen, and the auto-walk ------------------------------------------------------------ */

/** What the timed screens cost the JS thread: from the start of a component's render to the end of its commit (children included). */
export interface ScreenCost {
  renders: number;
  /** The first commit: the cost of opening the screen on the JS side. */
  mountMs: number;
  worstMs: number;
  totalMs: number;
}

export const addRender = (prev: ScreenCost | undefined, ms: number): ScreenCost =>
  prev
    ? { renders: prev.renders + 1, mountMs: prev.mountMs, worstMs: Math.max(prev.worstMs, ms), totalMs: prev.totalMs + ms }
    : { renders: 1, mountMs: ms, worstMs: ms, totalMs: ms };

/** One stop of the auto-walk, seen once: the worst UI frame while it was open, and the JS render time spent in timed screens meanwhile. */
export interface WalkStep {
  name: string;
  /** 1 is the first open, 2 the revisit. */
  visit: number;
  worstMs: number;
  jsMs: number;
  jsWorstMs: number;
}

export const emptyStep = (name: string, visit: number): WalkStep => ({ name, visit, worstMs: 0, jsMs: 0, jsWorstMs: 0 });
