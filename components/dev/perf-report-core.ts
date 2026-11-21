/**
 * The shared report as pure text (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4), with no React and no native modules, so it is
 * unit-tested (`npm run test:perf`). It is written to be read by the person who has to decide what to fix next, from one message:
 * who ran it (the phone, the build, the animation level), a verdict a glance can read, the numbers by animation level and by screen,
 * the walk the tester took, the worst moments with the screen and the level, and the sound log. `perf-report.ts` gathers the input.
 */
import { routeLine, routeRows, reportLine, summarize, verdict, type FrameSummary, type Hitch, type LevelStat, type RouteStat, type ScreenCost, type Visit, type WalkStep } from "./perf-core.ts";

export interface ReportInput {
  /** Now, ms since 1970. */
  now: number;
  /** When the run began (the last reset), ms since 1970. */
  startedAt: number;
  device: {
    model: string;
    os: string;
    memoryGb: number | null;
    yearClass: number | null;
    tier: string;
    /** The tier was forced with EXPO_PUBLIC_DEVICE_TIER. */
    tierForced: boolean;
  };
  app: {
    version: string;
    /** "Expo Go", "development build", "release build"... */
    runtime: string;
    /** "dev" bundle (slow, unminified) or "release". */
    jsBundle: "dev" | "release";
    engine: string;
    newArch: boolean | null;
    /** The EXPO_PUBLIC_* switches that are set, as "NAME=value". */
    flags: string[];
  };
  motion: { level: string; chosen: boolean };
  /** Crashes the guard has found: ever, and in the last two weeks. */
  crashes: { total: number; recent: number };
  ui: FrameSummary;
  jsFps: number;
  jsStalls: number;
  routes: Record<string, RouteStat>;
  stallsByRoute: Record<string, number>;
  levels: Record<string, LevelStat>;
  hitches: Hitch[];
  visits: Visit[];
  /** JS render time per timed screen. */
  costs: Record<string, ScreenCost>;
  /** The auto-walk's steps, in order (empty if it was not run). */
  walk: WalkStep[];
  sound: { engine: string; outcomes: string; faults: string[]; cues: string[] };
}

export const LEVEL_NAME: Record<string, string> = { max: "Max", reduced: "Reduced", off: "Disabled" };
const levelName = (l: string) => LEVEL_NAME[l] ?? l;

/** 4m 05s, 52s, 1h 02m. */
export const fmtDuration = (ms: number): string => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
};

const clock = (at: number) => new Date(at).toISOString().slice(11, 19);
const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

/** The levels that were used, in the order Max, Reduced, Disabled. */
const levelRows = (levels: Record<string, LevelStat>, budgetMs: number) =>
  ["max", "reduced", "off"]
    .filter((l) => levels[l] && levels[l].counts.reduce((a, b) => a + b, 0) > 0)
    .map((l) => ({ level: l, stat: levels[l], summary: summarize(levels[l].counts, levels[l].worstMs, budgetMs) }));

/** One line saying how the run went, so a glance (or a first read) is enough. */
const headline = (i: ReportInput): string => {
  const v = verdict(i.ui);
  const word = v === "ok" ? "SMOOTH" : v === "close" ? "BORDERLINE" : "CHOPPY";
  const sound = i.sound.faults.length === 0 ? "no sound faults" : `${i.sound.faults.length} sound fault kind${i.sound.faults.length === 1 ? "" : "s"}`;
  return `${word}: ${pct(i.ui.over2)} of UI frames over 2x, worst ${Math.round(i.ui.worstMs)} ms, ${i.jsStalls} JS stalls, ${sound}`;
};

/** The walk as one row per stop: first open, then revisit, each as worst UI frame and JS render time. */
export const walkRows = (steps: readonly WalkStep[]): { name: string; first?: WalkStep; again?: WalkStep }[] => {
  const rows = new Map<string, { name: string; first?: WalkStep; again?: WalkStep }>();
  for (const step of steps) {
    const row = rows.get(step.name) ?? { name: step.name };
    if (step.visit === 1) row.first = step;
    else row.again = step;
    rows.set(step.name, row);
  }
  return [...rows.values()];
};

const stepText = (s: WalkStep | undefined) => (s ? `${Math.round(s.worstMs)} ms frame, JS ${Math.round(s.jsMs)} ms` : "not reached");

/** The walk's verdict in one line: how many first opens went over the 100 ms a learner sees as a freeze. */
export const walkHeadline = (steps: readonly WalkStep[]): string => {
  const firsts = steps.filter((s) => s.visit === 1);
  if (firsts.length === 0) return "not run (press Auto-walk on the probe)";
  const over = firsts.filter((s) => s.worstMs >= 100);
  const worst = firsts.reduce((a, b) => (b.worstMs > a.worstMs ? b : a));
  return `${over.length} of ${firsts.length} first opens over 100 ms (worst: ${worst.name} ${Math.round(worst.worstMs)} ms)`;
};

export const formatReport = (i: ReportInput): string => {
  const rows = routeRows(i.routes, i.ui.budgetMs);
  const levels = levelRows(i.levels, i.ui.budgetMs);
  const stalls = (route: string) => i.stallsByRoute[route] ?? 0;
  const worstScreens = rows.slice(0, 3).map((r) => `${r.route} (${r.hitches} hitch${r.hitches === 1 ? "" : "es"}, worst ${Math.round(r.summary.worstMs)} ms)`);
  const mem = i.device.memoryGb === null ? "memory unknown" : `${i.device.memoryGb.toFixed(1)} GB`;
  const lines: string[] = [];
  lines.push(`ATOMIQ PERF REPORT  ${new Date(i.now).toISOString()}`);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(`  ${headline(i)}`);
  lines.push(`  Animation: ${levelName(i.motion.level)} now (${i.motion.chosen ? "chosen" : "default"}); run lasted ${fmtDuration(i.now - i.startedAt)}`);
  lines.push(`  Worst screens: ${worstScreens.length ? worstScreens.join("; ") : "none yet"}`);
  lines.push(`  Auto-walk: ${walkHeadline(i.walk)}`);
  lines.push("");
  lines.push("PHONE AND BUILD");
  lines.push(`  ${i.device.model}, ${i.device.os}, ${mem}, year class ${i.device.yearClass ?? "unknown"}`);
  lines.push(`  Tier ${i.device.tier}${i.device.tierForced ? " (forced)" : ""}; display ${i.ui.refreshHz} Hz`);
  lines.push(`  AtomIQ ${i.app.version}, ${i.app.runtime}, ${i.app.jsBundle} JS bundle, ${i.app.engine}, new architecture ${i.app.newArch === null ? "unknown" : i.app.newArch ? "on" : "off"}`);
  if (i.app.flags.length) lines.push(`  Switches: ${i.app.flags.join(", ")}`);
  lines.push(`  Crashes found: ${i.crashes.total} ever, ${i.crashes.recent} in the last two weeks`);
  lines.push("");
  lines.push("OVERALL");
  lines.push(`  ${reportLine("UI thread", i.ui)}`);
  lines.push(`  JS thread: ${i.jsFps} fps now, ${i.jsStalls} stalls over 100 ms`);
  if (levels.length) {
    lines.push("");
    lines.push("BY ANIMATION LEVEL (compare these)");
    for (const r of levels) {
      lines.push(
        `  ${levelName(r.level)}: ${fmtDuration(r.stat.ms)}, ${r.summary.frames} frames, ${pct(r.summary.over12)} over 1.2x, ${pct(r.summary.over2)} over 2x, worst ${Math.round(r.summary.worstMs)} ms, ${r.stat.hitches} hitch${r.stat.hitches === 1 ? "" : "es"}, ${r.stat.stalls} JS stalls`,
      );
    }
  }
  lines.push("");
  lines.push("BY SCREEN (worst first)");
  lines.push(...(rows.length ? rows.map((r) => `${routeLine(r)}, ${stalls(r.route)} JS stalls`) : ["  nothing yet"]));
  lines.push("");
  if (i.walk.length) {
    lines.push("AUTO-WALK (worst UI frame while open, JS render time in timed screens)");
    for (const r of walkRows(i.walk)) lines.push(`  ${r.name}: first ${stepText(r.first)}; again ${stepText(r.again)}`);
    lines.push("");
  }
  const costRows = Object.entries(i.costs).sort((a, b) => b[1].mountMs - a[1].mountMs);
  lines.push("SCREEN RENDER COST (JS thread: start of render to end of commit, children included)");
  lines.push(...(costRows.length ? costRows.map(([id, c]) => `  ${id}: mount ${Math.round(c.mountMs)} ms, ${c.renders} renders, worst ${Math.round(c.worstMs)} ms, total ${Math.round(c.totalMs)} ms`) : ["  none yet"]));
  lines.push("");
  lines.push("THE WALK (screens in order)");
  lines.push(`  ${i.visits.length ? i.visits.map((v) => `${clock(v.at)} ${v.route}`).join(" > ") : "nothing yet"}`);
  lines.push("");
  lines.push("FRAMES OVER 100 ms (newest last)");
  lines.push(...(i.hitches.length ? i.hitches.map((h) => `  ${clock(h.at)} ${h.route} ${Math.round(h.ms)} ms${h.level ? ` [${levelName(h.level)}]` : ""}`) : ["  none"]));
  lines.push("");
  lines.push("SOUND");
  lines.push(`  Faults: ${i.sound.faults.length ? "" : "none"}`);
  lines.push(...i.sound.faults.map((f) => `    ${f}`));
  lines.push(`  Engine: ${i.sound.engine}`);
  lines.push(`  Outcomes: ${i.sound.outcomes}`);
  lines.push(...i.sound.cues.map((c) => `    ${c}`));
  return lines.join("\n");
};
