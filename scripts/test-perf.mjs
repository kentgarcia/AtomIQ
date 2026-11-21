/**
 * The performance probe's maths (docs/features/PERFORMANCE_AND_SOUND_SPEC.md §3.4).
 *
 * Run: npm run test:perf
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BUCKETS, FRAME_EDGES, HITCH_MS, MAX_HITCHES, MAX_VISITS, addLevelWindow, logVisit, addWindow, bucketOf, budgetOf, diffCounts, emptyBuckets, fpsOf, logHitch, reportLine, routeLine, routeRows, summarize, verdict } from "../components/dev/perf-core.ts";
import { fmtDuration, formatReport, walkHeadline, walkRows } from "../components/dev/perf-report-core.ts";
import { addRender, emptyStep } from "../components/dev/perf-core.ts";
import { FLUSH_MS, HOLD_AGAIN_MS, HOLD_FIRST_MS, WALK_STOPS, walkPlan, walkSeconds } from "../components/dev/perf-walk-core.ts";

const counts = (entries) => {
  const c = emptyBuckets();
  for (const [ms, n] of entries) c[bucketOf(ms)] += n;
  return c;
};

describe("frame buckets", () => {
  it("puts a frame in the bucket whose range holds it", () => {
    assert.equal(bucketOf(5), 0);
    assert.equal(bucketOf(9.5), 1);
    assert.equal(bucketOf(16.7), 2);
    assert.equal(bucketOf(33), 5);
    assert.equal(bucketOf(500), BUCKETS - 1);
  });

  it("has one more bucket than edges", () => {
    assert.equal(BUCKETS, FRAME_EDGES.length + 1);
    assert.equal(emptyBuckets().length, BUCKETS);
  });
});

describe("the display's budget", () => {
  it("is read from where most frames land", () => {
    assert.equal(Math.round(budgetOf(counts([[8.3, 900], [16.6, 100]])) * 10) / 10, 8.3);
    assert.equal(Math.round(budgetOf(counts([[11.1, 900], [22, 100]])) * 10) / 10, 11.1);
    assert.equal(Math.round(budgetOf(counts([[16.7, 900], [33, 100]])) * 10) / 10, 16.7);
  });

  it("assumes 60 Hz until it has seen enough frames", () => {
    assert.equal(Math.round(budgetOf(counts([[8.3, 10]])) * 10) / 10, 16.7);
  });
});

describe("the summary", () => {
  it("counts a smooth 60 Hz run as clean", () => {
    const s = summarize(counts([[16.7, 1000]]), 17);
    assert.equal(s.refreshHz, 60);
    assert.equal(s.over12, 0);
    assert.equal(s.over2, 0);
    assert.equal(verdict(s), "ok");
  });

  it("finds the frames over the line and the ones a learner would see", () => {
    const s = summarize(counts([[16.7, 900], [24, 60], [40, 30], [120, 10]]), 130);
    assert.ok(Math.abs(s.over12 - 0.1) < 1e-9, String(s.over12));
    assert.ok(Math.abs(s.over2 - 0.04) < 1e-9, String(s.over2));
    assert.equal(verdict(s), "over");
  });

  it("judges a 120 Hz phone against its own, smaller budget", () => {
    const smooth = summarize(counts([[8.3, 1000]]), 9);
    assert.equal(smooth.refreshHz, 120);
    assert.equal(verdict(smooth), "ok");
    // The same 16.7 ms frames that are perfect at 60 Hz are slow frames at 120 Hz
    const slow = summarize(counts([[8.3, 500], [20, 500]]), 22);
    assert.ok(slow.over12 > 0.4);
  });

  it("says nothing bad about a run too short to judge", () => {
    assert.equal(verdict(summarize(counts([[100, 5]]), 100)), "ok");
    assert.equal(summarize(emptyBuckets(), 0).over12, 0);
  });

  it("has a close band between ok and over", () => {
    assert.equal(verdict(summarize(counts([[16.7, 930], [24, 70]]), 24)), "close");
  });
});

describe("fps and reports", () => {
  it("is frames over seconds", () => {
    assert.equal(fpsOf(30, 500), 60);
    assert.equal(fpsOf(0, 0), 0);
  });

  it("writes one plain line per run", () => {
    const line = reportLine("UI", summarize(counts([[16.7, 1000]]), 17));
    assert.match(line, /^UI: 1000 frames at 60 Hz, 0\.0% over 1\.2x, 0\.0% over 2x, worst 17 ms \(ok\)$/);
  });
});

import { fillOffsetPercent } from "../components/ui/progress-fill-core.ts";

describe("a progress fill that is moved, not resized", () => {
  it("is slid left by the empty share of its own width", () => {
    assert.equal(fillOffsetPercent(0), -100);
    assert.equal(fillOffsetPercent(0.25), -75);
    assert.equal(fillOffsetPercent(0.5), -50);
    assert.equal(fillOffsetPercent(1), 0);
  });

  it("holds at the ends for a value outside 0 to 1", () => {
    assert.equal(fillOffsetPercent(-0.2), -100);
    assert.equal(fillOffsetPercent(1.4), 0);
  });

  it("shows the same share as the width it replaces", () => {
    // visible share of the track = 1 + offset / 100
    for (const v of [0, 0.04, 0.33, 0.5, 0.99, 1]) assert.ok(Math.abs(1 + fillOffsetPercent(v) / 100 - v) < 1e-12);
  });
});

import { BUDGETS, budgetFor, idleQuantumMs, parseTierOverride, particlesFor, tierOf } from "../services/device-profile-core.ts";

const GB = 1024 ** 3;
const facts = (over = {}) => ({ os: "android", osVersion: "14", totalMemory: 8 * GB, yearClass: 2023, ...over });

describe("the device tier", () => {
  it("sorts Android by memory", () => {
    assert.equal(tierOf(facts({ totalMemory: 8 * GB })), "high");
    assert.equal(tierOf(facts({ totalMemory: 6 * GB })), "high");
    assert.equal(tierOf(facts({ totalMemory: 4 * GB })), "mid");
    assert.equal(tierOf(facts({ totalMemory: 3 * GB })), "low");
  });

  it("assumes the middle of the market when memory is unknown", () => {
    assert.equal(tierOf(facts({ totalMemory: null })), "mid");
  });

  it("treats Android 8 and older as low whatever the memory", () => {
    assert.equal(tierOf(facts({ osVersion: "8.1.0" })), "low");
    assert.equal(tierOf(facts({ osVersion: "9" })), "high");
  });

  it("drops an old iPhone one step", () => {
    assert.equal(tierOf(facts({ os: "ios", osVersion: "17.2", totalMemory: null, yearClass: 2015 })), "mid");
    assert.equal(tierOf(facts({ os: "ios", osVersion: "17.2", totalMemory: null, yearClass: 2016 })), "mid");
    assert.equal(tierOf(facts({ os: "ios", osVersion: "17.2", totalMemory: null, yearClass: 2017 })), "high");
  });

  it("ignores Android's year class: it stops at 2016, so a 2021 flagship reads 2016 (the Galaxy S21 report)", () => {
    assert.equal(tierOf({ os: "android", osVersion: "15", totalMemory: 7 * GB, yearClass: 2016 }), "high");
    assert.equal(tierOf(facts({ totalMemory: 4 * GB, yearClass: 2014 })), "mid");
    assert.equal(tierOf(facts({ totalMemory: 3 * GB, yearClass: 2012 })), "low");
  });

  it("calls an iPhone high", () => {
    assert.equal(tierOf(facts({ os: "ios", osVersion: "17.2", totalMemory: 6 * GB })), "high");
  });

  it("never throws on missing facts", () => {
    assert.equal(tierOf({ os: "android", osVersion: null, totalMemory: null, yearClass: null }), "mid");
    assert.equal(tierOf({ os: "web", osVersion: null, totalMemory: null, yearClass: null }), "mid");
  });
});

describe("the motion budget", () => {
  it("runs the idle loops at full rate only on high, and stops them on low", () => {
    assert.deepEqual([budgetFor("high").idleFps, budgetFor("mid").idleFps, budgetFor("low").idleFps], [60, 30, 0]);
  });

  it("never gives a lower tier more than a higher one", () => {
    const t = ["high", "mid", "low"];
    for (let i = 1; i < t.length; i += 1) {
      assert.ok(BUDGETS[t[i]].particleShare <= BUDGETS[t[i - 1]].particleShare);
      assert.ok(BUDGETS[t[i]].playerCap <= BUDGETS[t[i - 1]].playerCap);
      assert.ok(BUDGETS[t[i]].idleFps <= BUDGETS[t[i - 1]].idleFps);
    }
  });

  it("keeps a burst a burst: never fewer than four particles", () => {
    assert.equal(particlesFor(8, 1), 8);
    assert.equal(particlesFor(8, 0.5), 4);
    assert.equal(particlesFor(10, 0.75), 8);
    assert.equal(particlesFor(5, 0.5), 4);
    assert.equal(particlesFor(3, 0.5), 3, "a burst already under four is left alone");
  });

  it("holds a 30 fps idle clock to 33 ms steps and leaves 60 alone", () => {
    assert.equal(idleQuantumMs(60), 0);
    assert.ok(Math.abs(idleQuantumMs(30) - 33.333) < 0.01);
    assert.equal(idleQuantumMs(0), 0);
  });

  it("reads an override only when it is a tier", () => {
    assert.equal(parseTierOverride("low"), "low");
    assert.equal(parseTierOverride("fast"), null);
    assert.equal(parseTierOverride(undefined), null);
  });
});

import { layoutAnimations, unguardedLoops } from "./lib/perf-rules.mjs";

describe("check:perf rules", () => {
  it("finds an animated style that returns a layout key", () => {
    const src = "const a = useAnimatedStyle(() => ({ width: `${v.get() * 100}%` }));";
    assert.deepEqual(layoutAnimations(src).map((h) => h.key), ["width"]);
    assert.equal(layoutAnimations(src)[0].line, 1);
  });

  it("finds margins, offsets and sizes in a multi-line style", () => {
    const src = ["const a = useAnimatedStyle(() => {", "  const x = f(clock.get());", "  return { opacity: x, marginTop: x * 4 };", "});"].join("\n");
    assert.deepEqual(layoutAnimations(src).map((h) => [h.key, h.line]), [["marginTop", 3]]);
  });

  it("leaves transforms and opacity alone, even with a nested object", () => {
    const src = "const a = useAnimatedStyle(() => ({ opacity: 1, transform: [{ translateX: x.get() }, { scale: s.get() }] }));";
    assert.deepEqual(layoutAnimations(src), []);
  });

  it("does not mistake a size inside a transform array or a call for a style key", () => {
    const src = "const a = useAnimatedStyle(() => ({ transform: [{ translateY: Math.max(width: 0) }] }));";
    assert.deepEqual(layoutAnimations(src), []);
  });

  it("looks at animated props too, and ignores comments", () => {
    assert.equal(layoutAnimations("const p = useAnimatedProps(() => ({ height: h.get() }));").length, 1);
    assert.deepEqual(layoutAnimations("// useAnimatedStyle(() => ({ width: 1 }))\nconst a = 1;"), []);
  });

  it("flags a loop with no guard and not one with a focus or reduced-motion check", () => {
    assert.equal(unguardedLoops("x.set(withRepeat(withTiming(1), -1, false));"), true);
    assert.equal(unguardedLoops("const reduced = useReducedMotion();\nx.set(withRepeat(withTiming(1), -1, false));"), false);
    assert.equal(unguardedLoops("const c = useLoopClock(1000, live);"), false);
    assert.equal(unguardedLoops("const a = 1;"), false);
  });
});

describe("by screen", () => {
  const win = (pairs) => counts(pairs);

  it("gives the frames counted since the last look, and all of them after a reset", () => {
    assert.deepEqual(diffCounts([3, 2, 0, 0, 0, 0, 0, 0, 0], [1, 2, 0, 0, 0, 0, 0, 0, 0]), [2, 0, 0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(diffCounts([1, 0, 0, 0, 0, 0, 0, 0, 0], [5, 5, 0, 0, 0, 0, 0, 0, 0]), [1, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("adds windows to a screen's numbers and counts a hitch for a window with a frame over 100 ms", () => {
    let stat = addWindow(undefined, win([[8.3, 50]]), 12);
    assert.equal(stat.hitches, 0);
    stat = addWindow(stat, win([[8.3, 10], [300, 1]]), 300);
    assert.equal(stat.hitches, 1);
    assert.equal(stat.worstMs, 300);
    assert.equal(stat.counts.reduce((a, b) => a + b, 0), 61);
    assert.ok(HITCH_MS <= 300);
  });

  it("keeps only the newest hitches", () => {
    let log = [];
    for (let i = 0; i < MAX_HITCHES + 5; i += 1) log = logHitch(log, { at: i, route: "/x", ms: 120 });
    assert.equal(log.length, MAX_HITCHES);
    assert.equal(log[log.length - 1].at, MAX_HITCHES + 4);
  });

  it("lists the screens with the most hitches first, judged against the display's own budget", () => {
    const routes = {
      "/": addWindow(undefined, win([[8.3, 200]]), 20),
      "/shop": addWindow(undefined, win([[8.3, 100], [1100, 1]]), 1100),
      "/blip": addWindow(undefined, win([[8.3, 2]]), 9),
    };
    const rows = routeRows(routes, 1000 / 120);
    assert.deepEqual(rows.map((r) => r.route), ["/shop", "/"]);
    assert.equal(rows[0].summary.refreshHz, 120);
    assert.match(routeLine(rows[0]), /\/shop: 101 frames.*worst 1100 ms, 1 hitch$/);
  });

  it("summarizes against a given budget", () => {
    assert.equal(summarize(win([[8.3, 5]]), 8.3, 1000 / 120).refreshHz, 120);
  });
});

describe("by animation level and the walk", () => {
  it("adds a poll window to a level, with the time it took and stalls kept", () => {
    const first = addLevelWindow(undefined, counts([[16, 30]]), 40, 500);
    assert.equal(first.ms, 500);
    assert.equal(first.stalls, 0);
    const second = addLevelWindow({ ...first, stalls: 2 }, counts([[16, 30], [150, 1]]), 150, 500);
    assert.equal(second.ms, 1000);
    assert.equal(second.stalls, 2);
    assert.equal(second.hitches, 1);
    assert.equal(second.worstMs, 150);
  });

  it("counts a hitch only when the caller says it is new, so polls that re-read one frame do not inflate the count", () => {
    const window = counts([[16, 20], [150, 1]]);
    let stat = addWindow(undefined, window, 150, true);
    stat = addWindow(stat, window, 150, false);
    stat = addWindow(stat, window, 150, false);
    assert.equal(stat.hitches, 1);
    assert.equal(stat.worstMs, 150);
    assert.equal(addWindow(undefined, window, 150).hitches, 1, "unspecified: the window's worst frame decides, as before");
    assert.equal(addLevelWindow(undefined, window, 150, 500, false).hitches, 0);
  });

  it("logs a screen once per visit and keeps the newest", () => {
    let log = logVisit([], { route: "/", at: 1 });
    log = logVisit(log, { route: "/", at: 2 });
    assert.equal(log.length, 1);
    log = logVisit(log, { route: "/quests", at: 3 });
    assert.deepEqual(log.map((v) => v.route), ["/", "/quests"]);
    for (let i = 0; i < MAX_VISITS + 5; i++) log = logVisit(log, { route: `/r${i}`, at: 10 + i });
    assert.equal(log.length, MAX_VISITS);
    assert.equal(log.at(-1).route, `/r${MAX_VISITS + 4}`);
  });
});

describe("the shared report", () => {
  const now = Date.parse("2026-11-21T14:00:00Z");
  const ui = summarize(counts([[16, 900], [30, 6], [150, 3]]), 150);
  const input = (over = {}) => ({
    now,
    startedAt: now - 4 * 60_000 - 5_000,
    device: { model: "samsung SM-A346B", os: "Android 14", memoryGb: 5.5, yearClass: 2023, tier: "high", tierForced: false },
    app: { version: "1.0.0", runtime: "development build", jsBundle: "dev", engine: "Hermes", newArch: true, flags: ["EXPO_PUBLIC_PERF_PROBE=1"] },
    motion: { level: "reduced", chosen: true },
    crashes: { total: 1, recent: 1 },
    ui,
    jsFps: 60,
    jsStalls: 12,
    routes: { "/quests": addWindow(undefined, counts([[16, 100], [150, 2]]), 150) },
    stallsByRoute: { "/quests": 5 },
    levels: {
      max: addLevelWindow(undefined, counts([[16, 400]]), 20, 120_000),
      reduced: addLevelWindow(undefined, counts([[16, 500], [150, 3]]), 150, 125_000),
    },
    hitches: [{ at: now - 1000, route: "/quests", ms: 150, level: "reduced" }],
    visits: [{ route: "/", at: now - 120_000 }, { route: "/quests", at: now - 60_000 }],
    costs: { "/shop": addRender(addRender(undefined, 38), 12), "/phone": addRender(undefined, 20) },
    walk: [
      { name: "Shop", visit: 1, worstMs: 667, jsMs: 38, jsWorstMs: 38 },
      { name: "Phone", visit: 1, worstMs: 90, jsMs: 20, jsWorstMs: 20 },
      { name: "Shop", visit: 2, worstMs: 80, jsMs: 12, jsWorstMs: 12 },
    ],
    sound: { engine: "audio-api (ok), 78 live", outcomes: "played 10, late 2", faults: [], cues: ["ui.tick: late 2"] },
    ...over,
  });

  it("opens with a verdict and who ran it, so one read is enough", () => {
    const text = formatReport(input());
    const lines = text.split("\n");
    assert.match(lines[0], /^ATOMIQ PERF REPORT/);
    assert.match(text, /SUMMARY\n  (SMOOTH|BORDERLINE|CHOPPY): /);
    assert.match(text, /Animation: Reduced now \(chosen\); run lasted 4m 05s/);
    assert.match(text, /samsung SM-A346B, Android 14, 5\.5 GB, year class 2023/);
    assert.match(text, /development build, dev JS bundle, Hermes, new architecture on/);
    assert.match(text, /Switches: EXPO_PUBLIC_PERF_PROBE=1/);
    assert.match(text, /Crashes found: 1 ever, 1 in the last two weeks/);
  });

  it("splits the numbers by animation level, in the order Max, Reduced, Disabled", () => {
    const text = formatReport(input());
    const max = text.indexOf("  Max: 2m 00s");
    const reduced = text.indexOf("  Reduced: 2m 05s");
    assert.ok(max > 0 && reduced > max, "levels listed in order with their time");
    assert.ok(!text.includes("  Disabled:"), "a level that was not used is not listed");
  });

  it("puts JS stalls on each screen, the walk in order, and the level on each hitch", () => {
    const text = formatReport(input());
    assert.match(text, /\/quests: .*2 hitches?, 5 JS stalls|\/quests: .*1 hitch, 5 JS stalls/);
    assert.match(text, /THE WALK[^\n]*\n  \d\d:\d\d:\d\d \/ > \d\d:\d\d:\d\d \/quests/);
    assert.match(text, /\/quests 150 ms \[Reduced\]/);
  });

  it("says plainly when there is nothing yet and when the sound has faults", () => {
    const empty = formatReport(input({ routes: {}, levels: {}, hitches: [], visits: [], stallsByRoute: {}, ui: summarize(emptyBuckets(), 0) }));
    assert.match(empty, /Worst screens: none yet/);
    assert.match(empty, /FRAMES OVER 100 ms \(newest last\)\n  none/);
    const faulty = formatReport(input({ sound: { engine: "x", outcomes: "played 1", faults: ["ui.tap · lost x3"], cues: [] } }));
    assert.match(faulty, /1 sound fault kind/);
    assert.match(faulty, /ui\.tap · lost x3/);
  });

  it("puts the walk and the render cost in the report", () => {
    const text = formatReport(input());
    assert.match(text, /Auto-walk: 1 of 2 first opens over 100 ms \(worst: Shop 667 ms\)/);
    assert.match(text, /AUTO-WALK[^\n]*\n  Shop: first 667 ms frame, JS 38 ms; again 80 ms frame, JS 12 ms\n  Phone: first 90 ms frame, JS 20 ms; again not reached/);
    assert.match(text, /SCREEN RENDER COST[^\n]*\n  \/shop: mount 38 ms, 2 renders, worst 38 ms, total 50 ms\n  \/phone: mount 20 ms/);
    const none = formatReport(input({ walk: [], costs: {} }));
    assert.match(none, /Auto-walk: not run/);
    assert.ok(!none.includes("AUTO-WALK ("));
    assert.match(none, /SCREEN RENDER COST[^\n]*\n  none yet/);
  });

  it("formats durations", () => {
    assert.equal(fmtDuration(0), "0s");
    assert.equal(fmtDuration(52_000), "52s");
    assert.equal(fmtDuration(245_000), "4m 05s");
    assert.equal(fmtDuration(3_720_000), "1h 02m");
  });
});

describe("JS render cost by screen", () => {
  it("keeps the first commit as the mount cost and the worst and total after it", () => {
    let c = addRender(undefined, 40);
    c = addRender(c, 10);
    c = addRender(c, 25);
    assert.deepEqual(c, { renders: 3, mountMs: 40, worstMs: 40, totalMs: 75 });
    c = addRender(c, 90);
    assert.equal(c.worstMs, 90);
    assert.equal(c.mountMs, 40);
  });
});

describe("the auto-walk", () => {
  it("opens every stop once, then every stop again, each stop named", () => {
    const plan = walkPlan();
    assert.equal(plan.length, WALK_STOPS.length * 2);
    assert.ok(plan.slice(0, WALK_STOPS.length).every((p) => p.visit === 1 && p.holdMs === HOLD_FIRST_MS));
    assert.ok(plan.slice(WALK_STOPS.length).every((p) => p.visit === 2 && p.holdMs === HOLD_AGAIN_MS));
    assert.deepEqual(plan.slice(WALK_STOPS.length).map((p) => p.stop.name), WALK_STOPS.map((s) => s.name));
    assert.equal(new Set(WALK_STOPS.map((s) => s.name)).size, WALK_STOPS.length, "names are unique: the report pairs first and again by name");
  });

  it("leaves time for a screen's last frames to be read before the next stop", () => {
    assert.ok(FLUSH_MS >= 600, "more than the half-second window the collector reads");
    assert.ok(walkSeconds() < 120, "one tap, about a minute");
  });

  it("pairs first open and revisit by name, and counts first opens over 100 ms", () => {
    const steps = [emptyStep("A", 1), { ...emptyStep("B", 1), worstMs: 250 }, { ...emptyStep("A", 2), worstMs: 20 }];
    const rows = walkRows(steps);
    assert.equal(rows.length, 2);
    assert.equal(rows[0].again.worstMs, 20);
    assert.equal(rows[1].again, undefined);
    assert.match(walkHeadline(steps), /^1 of 2 first opens over 100 ms \(worst: B 250 ms\)/);
    assert.match(walkHeadline([]), /not run/);
  });

});
