// Activity tracker tests (docs/features/ACTIVITY_TRACKER.md).  Run: npm run test:activity
//
// The pure logic lives in services/activity-core.ts (framework-free). Timezones
// are simulated by injecting `offsetMin` (Date#getTimezoneOffset convention);
// real-timezone/DST behaviour is verified in child processes launched with a
// TZ env var, so process.env.TZ of this runner is never mutated.
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreUrl = pathToFileURL(path.join(REPO, "services", "activity-core.ts")).href;
const core = await import(coreUrl);
const {
  ACTIVITY_KINDS, KIND_POLICY, LEVEL_MIN_POINTS, levelForPoints, dayKeyFromInstant, addDays, daysBetween,
  weekdayOf, formatDayLong, applyEvent, emptyDay, buildWeekGrid, summarizeActivity, summaryText,
  cellAccessibilityLabel, describeCounts, sanitizeDay, createActivityEngine, importHistoricalEvents,
  parseStoredTimestamp, simulateExistingStreak, isDayKey,
} = core;

const T = (iso) => Date.parse(iso);

/** In-memory ActivityStore (stands in for SQLite across a simulated restart). */
function memoryStore() {
  const rows = new Map();
  const meta = new Map();
  return {
    rows, meta, failSaves: 0,
    async loadAll() { return Array.from(rows.values()).map((v) => JSON.parse(v)); },
    async saveDays(days) {
      if (this.failSaves > 0) { this.failSaves -= 1; throw new Error("disk full"); }
      for (const d of days) rows.set(d.date, JSON.stringify(d));
    },
    async getMeta(k) { return meta.has(k) ? meta.get(k) : null; },
    async setMeta(k, v) { meta.set(k, v); },
  };
}

const fixedClock = (ms, offsetMin) => { const c = { ms, offsetMin }; return { c, fn: () => ({ ...c }) }; };

/* ------------------------------------------------------------------ */
/* Local day keys                                                      */
/* ------------------------------------------------------------------ */

test("day key follows LOCAL date near midnight in several timezones", () => {
  // New York (EST, offset +300): 04:59:59Z is 23:59:59 on the 4th, 05:00:00Z is midnight on the 5th.
  assert.equal(dayKeyFromInstant(T("2025-03-05T04:59:59Z"), 300), "2025-03-04");
  assert.equal(dayKeyFromInstant(T("2025-03-05T05:00:00Z"), 300), "2025-03-05");
  // Tokyo (offset -540).
  assert.equal(dayKeyFromInstant(T("2025-03-04T14:59:59Z"), -540), "2025-03-04");
  assert.equal(dayKeyFromInstant(T("2025-03-04T15:00:00Z"), -540), "2025-03-05");
  // Pago Pago (offset +660) and Kiritimati (offset -840): UTC slicing would be wrong for both.
  assert.equal(dayKeyFromInstant(T("2025-03-05T10:59:00Z"), 660), "2025-03-04");
  assert.equal(dayKeyFromInstant(T("2025-03-04T10:00:00Z"), -840), "2025-03-05");
  // India (+05:30, offset -330): half-hour zone.
  assert.equal(dayKeyFromInstant(T("2025-03-04T18:29:59Z"), -330), "2025-03-04");
  assert.equal(dayKeyFromInstant(T("2025-03-04T18:30:00Z"), -330), "2025-03-05");
  // Year and leap-day boundaries.
  assert.equal(dayKeyFromInstant(T("2024-12-31T23:30:00Z"), -60), "2025-01-01");
  assert.equal(dayKeyFromInstant(T("2024-02-29T23:30:00Z"), 0), "2024-02-29");
});

test("civil day arithmetic ignores DST (no skipped or repeated days)", () => {
  assert.equal(addDays("2025-03-09", 1), "2025-03-10");
  assert.equal(addDays("2025-11-02", 1), "2025-11-03");
  assert.equal(addDays("2024-02-28", 2), "2024-03-01");
  assert.equal(addDays("2025-01-01", -1), "2024-12-31");
  assert.equal(daysBetween("2025-03-08", "2025-03-11"), 3);
  assert.equal(daysBetween("2025-11-01", "2025-11-04"), 3);
  assert.equal(weekdayOf("2025-03-04"), 2); // Tuesday
  assert.equal(formatDayLong("2025-03-04"), "Tuesday 4 March");
  assert.equal(formatDayLong("2025-03-04", true), "Tuesday 4 March 2025");
  assert.ok(isDayKey("2024-02-29"));
  assert.ok(!isDayKey("2025-02-29"));
  assert.ok(!isDayKey("2025-3-4"));
});

function runChild(tz, code, payload = {}) {
  const out = execFileSync(process.execPath, ["--no-warnings", "--input-type=module", "-e", code], {
    env: { ...process.env, TZ: tz, PAYLOAD: JSON.stringify({ coreUrl, ...payload }) },
    encoding: "utf8",
  });
  return JSON.parse(out.trim().split("\n").pop());
}

const SWEEP_CODE = `
const { coreUrl, from, hours } = JSON.parse(process.env.PAYLOAD);
const core = await import(coreUrl);
const keys = []; let mismatches = 0; let prev = null; let badStep = 0;
for (let i = 0; i < hours; i++) {
  const ms = from + i * 3600_000; const d = new Date(ms);
  const viaOffset = core.dayKeyFromInstant(ms, d.getTimezoneOffset());
  if (viaOffset !== core.dayKeyFromLocalDate(d)) mismatches++;
  if (prev !== null) { const diff = core.daysBetween(prev, viaOffset); if (diff !== 0 && diff !== 1) badStep++; }
  prev = viaOffset; if (keys[keys.length - 1] !== viaOffset) keys.push(viaOffset);
}
console.log(JSON.stringify({ mismatches, badStep, keys }));
`;

for (const [tz, from, hours] of [
  ["America/New_York", "2025-03-07T12:00:00Z", 24 * 6], // spring forward Mar 9 (23h day)
  ["America/New_York", "2025-10-31T12:00:00Z", 24 * 6], // fall back Nov 2 (25h day)
  ["Europe/London", "2025-03-28T12:00:00Z", 24 * 5],
  ["Australia/Lord_Howe", "2025-04-04T00:00:00Z", 24 * 5], // 30-minute DST shift
  ["Pacific/Auckland", "2025-09-26T00:00:00Z", 24 * 5],
  ["Pacific/Kiritimati", "2025-03-01T00:00:00Z", 24 * 3],
]) {
  test(`real ${tz} around DST: offset-injected keys match local parts, none skipped or repeated`, () => {
    const r = runChild(tz, SWEEP_CODE, { from: Date.parse(from), hours });
    assert.equal(r.mismatches, 0);
    assert.equal(r.badStep, 0);
    // every consecutive key is exactly one civil day after the previous
    for (let i = 1; i < r.keys.length; i++) assert.equal(daysBetween(r.keys[i - 1], r.keys[i]), 1);
  });
}

/* ------------------------------------------------------------------ */
/* Scale and dedupe                                                    */
/* ------------------------------------------------------------------ */

test("level scale is fixed: 0 | 1 | 2-3 | 4-6 | 7+", () => {
  assert.deepEqual(LEVEL_MIN_POINTS, [1, 2, 4, 7]);
  const expected = { 0: 0, 1: 1, 2: 2, 3: 2, 4: 3, 5: 3, 6: 3, 7: 4, 8: 4, 50: 4, 1e6: 4 };
  for (const [pts, lvl] of Object.entries(expected)) assert.equal(levelForPoints(Number(pts)), lvl, `points ${pts}`);
  assert.equal(levelForPoints(NaN), 0);
  assert.equal(levelForPoints(-3), 0);
});

const at = (ms = T("2025-03-04T15:00:00Z"), offsetMin = 0) => ({ ms, offsetMin });

test("repeated actions can never push a day above level 4 or past the per-day caps", () => {
  let day = emptyDay("2025-03-04");
  for (let i = 0; i < 1000; i++) for (const kind of ACTIVITY_KINDS) day = applyEvent(day, kind, { id: `id-${i}` }, at());
  assert.equal(day.level, 4);
  for (const kind of ACTIVITY_KINDS) {
    assert.ok(day.counts[kind] <= KIND_POLICY[kind].maxPerDay, `${kind} within maxPerDay`);
  }
  const maxPoints = ACTIVITY_KINDS.reduce((s, k) => s + KIND_POLICY[k].maxPerDay * KIND_POLICY[k].weight, 0);
  assert.ok(day.points <= maxPoints);
  assert.equal(day.total, ACTIVITY_KINDS.reduce((s, k) => s + (day.counts[k] || 0), 0));
});

test("dedupe: same id counts at most maxPerId times per day per kind", () => {
  const cases = {
    lesson_step: 1, lesson_complete: 1, quiz_attempt: 3, quiz_complete: 1,
    lab_session: 1, game_session: 5, periodic_table_explore: 1, blog_read: 1,
  };
  for (const [kind, max] of Object.entries(cases)) {
    assert.equal(KIND_POLICY[kind].maxPerId, max, `${kind} policy`);
    let day = emptyDay("2025-03-04");
    for (let i = 0; i < 40; i++) day = applyEvent(day, kind, { id: "same" }, at());
    assert.equal(day.counts[kind], max, `${kind} same id`);
  }
  // distinct ids each count (up to the per-day cap)
  let day = emptyDay("2025-03-04");
  for (let i = 0; i < 5; i++) day = applyEvent(day, "periodic_table_explore", { id: `a${i}` }, at());
  assert.equal(day.counts.periodic_table_explore, 5);
  assert.equal(day.level, 3); // 5 points
  // id-less events share one bucket
  day = emptyDay("2025-03-04");
  for (let i = 0; i < 9; i++) day = applyEvent(day, "periodic_table_explore", undefined, at());
  assert.equal(day.counts.periodic_table_explore, 1);
  // deduped events return the identical object (nothing to persist)
  const same = applyEvent(day, "periodic_table_explore", undefined, at());
  assert.equal(same, day);
});

test("weights: completions/labs/games are worth 2, steps/attempts/explores 1", () => {
  const w = Object.fromEntries(ACTIVITY_KINDS.map((k) => [k, KIND_POLICY[k].weight]));
  assert.deepEqual(w, {
    lesson_step: 1, lesson_complete: 2, quiz_attempt: 1, quiz_complete: 2,
    lab_session: 2, game_session: 2, periodic_table_explore: 1, blog_read: 1,
  });
  let day = emptyDay("2025-03-04");
  day = applyEvent(day, "lesson_complete", { id: "l1" }, at());
  assert.equal(day.level, 2);
  for (const id of ["a", "b"]) day = applyEvent(day, "quiz_complete", { id }, at());
  assert.equal(day.points, 6);
  assert.equal(day.level, 3);
});

test("event metadata is stored for diagnosis (ISO timestamp + tz offset)", () => {
  const day = applyEvent(emptyDay("2025-03-04"), "lesson_step", { id: "s" }, { ms: T("2025-03-04T15:00:00Z"), offsetMin: 300 });
  assert.equal(day.lastEventAt, "2025-03-04T15:00:00.000Z");
  assert.equal(day.lastTzOffsetMin, 300);
});

/* ------------------------------------------------------------------ */
/* Engine: clocks, persistence                                         */
/* ------------------------------------------------------------------ */

test("engine records under the local date at event time (near midnight, tz change)", async () => {
  const store = memoryStore();
  const clock = fixedClock(T("2025-03-05T04:59:59Z"), 300); // 23:59:59 on the 4th in New York
  const engine = createActivityEngine({ store, clock: clock.fn, debounceMs: 0 });
  engine.record("lesson_step", { id: "a" });
  clock.c.ms = T("2025-03-05T05:00:01Z"); // two seconds later: the 5th
  engine.record("lesson_step", { id: "b" });
  // Traveller flies to Tokyo: same instant range, new offset, new local date.
  clock.c.ms = T("2025-03-05T06:00:00Z");
  clock.c.offsetMin = -540; // 15:00 on the 5th in Tokyo
  engine.record("lesson_step", { id: "c" });
  const days = await engine.getDays();
  assert.deepEqual(Object.keys(days).sort(), ["2025-03-04", "2025-03-05"]);
  assert.equal(days["2025-03-04"].total, 1);
  assert.equal(days["2025-03-05"].total, 2);
  assert.equal(days["2025-03-05"].lastTzOffsetMin, -540);
});

test("clock moved backwards: nothing deleted, nothing double counted, past days only extended by real events", async () => {
  const store = memoryStore();
  const clock = fixedClock(T("2025-03-10T12:00:00Z"), 0);
  const engine = createActivityEngine({ store, clock: clock.fn, debounceMs: 0 });
  engine.record("periodic_table_explore", { id: "x" });
  engine.record("lesson_complete", { id: "l1" });
  let before = await engine.getDays();
  const snapshot = JSON.stringify(before["2025-03-10"]);

  clock.c.ms = T("2025-03-07T12:00:00Z"); // device clock set 3 days back
  engine.record("periodic_table_explore", { id: "y" });
  engine.record("lesson_complete", { id: "l1" });
  let days = await engine.getDays();
  assert.equal(days["2025-03-10"] && JSON.stringify(days["2025-03-10"]), snapshot, "later day untouched");
  assert.equal(days["2025-03-07"].total, 2);
  assert.equal(Object.keys(days).length, 2);

  // Clock returns to the correct time: the same element/lesson on the 10th is deduped, not doubled.
  clock.c.ms = T("2025-03-10T18:00:00Z");
  engine.record("periodic_table_explore", { id: "x" });
  engine.record("lesson_complete", { id: "l1" });
  days = await engine.getDays();
  assert.equal(JSON.stringify(days["2025-03-10"]), snapshot);
  assert.equal(days["2025-03-07"].total, 2);
});

test("no future days are created; future-dated stored data is retained but never displayed", async () => {
  const store = memoryStore();
  // A record left over from a clock that was set forward earlier.
  store.rows.set("2025-04-01", JSON.stringify({ ...applyEvent(emptyDay("2025-04-01"), "lesson_step", { id: "s" }, at()) }));
  const clock = fixedClock(T("2025-03-10T12:00:00Z"), 0);
  const engine = createActivityEngine({ store, clock: clock.fn, debounceMs: 0 });
  engine.record("lesson_step", { id: "t" });
  await engine.flush();
  const days = await engine.getDays();
  assert.deepEqual(Object.keys(days).sort(), ["2025-03-10", "2025-04-01"]); // retained, nothing invented
  assert.ok(store.rows.has("2025-04-01"), "never deleted");
  const grid = buildWeekGrid({ todayKey: "2025-03-10", weeks: 20 });
  assert.ok(!grid.columns.flat().includes("2025-04-01"));
  const s = summarizeActivity(days, "2025-03-10");
  assert.equal(s.activeDays, 1);
});

test("restart persistence round-trip through the storage adapter", async () => {
  const store = memoryStore();
  const clock = fixedClock(T("2025-03-04T15:00:00Z"), 0);
  const a = createActivityEngine({ store, clock: clock.fn, debounceMs: 0 });
  a.record("lesson_step", { id: "s1" });
  a.record("quiz_complete", { id: "q1" });
  a.record("periodic_table_explore", { id: "Fe" });
  await a.flush();
  const first = await a.getDays();

  // "App restart": brand new engine, same storage.
  const b = createActivityEngine({ store, clock: clock.fn, debounceMs: 0 });
  const second = await b.getDays();
  assert.deepEqual(second, first);
  assert.equal(second["2025-03-04"].total, 3);
  // and dedupe state survived the restart
  b.record("lesson_step", { id: "s1" });
  b.record("lesson_step", { id: "s2" });
  const third = await b.getDays();
  assert.equal(third["2025-03-04"].total, 4);
});

test("writes are debounced and write-behind failures are retried, never thrown", async () => {
  const store = memoryStore();
  const errors = [];
  const clock = fixedClock(T("2025-03-04T15:00:00Z"), 0);
  const engine = createActivityEngine({ store, clock: clock.fn, debounceMs: 60_000, onError: (e) => errors.push(e) });
  engine.record("lesson_step", { id: "a" });
  await engine.getDays();
  assert.equal(store.rows.size, 0, "not written before the debounce fires");
  store.failSaves = 1;
  await engine.flush();
  assert.equal(store.rows.size, 0);
  assert.equal(errors.length, 1);
  await engine.flush(); // retried; still dirty
  assert.equal(store.rows.size, 1);

  // A store that cannot be read yet (DB not ready) must not break record(),
  // drop events, or overwrite stored days once it becomes readable.
  const late = memoryStore();
  late.rows.set("2025-03-04", JSON.stringify(applyEvent(emptyDay("2025-03-04"), "lesson_step", { id: "old" }, at())));
  let failLoads = 1;
  const realLoad = late.loadAll.bind(late);
  late.loadAll = async () => { if (failLoads-- > 0) throw new Error("db not ready"); return realLoad(); };
  const e2 = createActivityEngine({ store: late, clock: clock.fn, debounceMs: 0, onError: () => {} });
  assert.doesNotThrow(() => e2.record("lesson_step", { id: "x" }));
  assert.doesNotThrow(() => e2.record("not_a_kind", {}));
  const days = await e2.getDays();
  assert.equal(days["2025-03-04"].total, 2, "stored event kept and queued event replayed");
  assert.deepEqual(days["2025-03-04"].counts, { lesson_step: 2 });
});

test("sanitizeDay tolerates corrupt rows and recomputes totals/levels", () => {
  assert.equal(sanitizeDay(null), null);
  assert.equal(sanitizeDay({ date: "garbage" }), null);
  const d = sanitizeDay({ date: "2025-03-04", counts: { lesson_step: 3, bogus: 9, quiz_complete: -2 }, total: 999, level: 4 });
  assert.equal(d.total, 3);
  assert.equal(d.points, 3);
  assert.equal(d.level, 2);
});

test("sanitizeDay ignores the removed article_read kind without losing other counts", () => {
  const d = sanitizeDay({
    date: "2025-03-04",
    counts: { lesson_step: 2, article_read: 4 },
    seen: { lesson_step: { a: 1, b: 1 }, article_read: { x: 1 } },
    total: 6,
    points: 6,
  });
  assert.deepEqual(d.counts, { lesson_step: 2 });
  assert.equal(d.seen.article_read, undefined);
  assert.equal(d.total, 2);
  assert.equal(d.points, 2);
});

test("history import: real timestamps only, idempotent, labelled, no future/invalid", async () => {
  const store = memoryStore();
  const clock = fixedClock(T("2025-03-10T12:00:00Z"), 0);
  const engine = createActivityEngine({ store, clock: clock.fn, debounceMs: 0 });
  const events = [
    { kind: "lesson_complete", id: "L1", timestamp: "2025-03-01T10:00:00.000Z" },
    { kind: "quiz_complete", id: "Q1", timestamp: "2025-03-01 11:00:00" }, // SQLite UTC format
    { kind: "lesson_complete", id: "L1", timestamp: "2025-03-01T10:30:00.000Z" }, // same lesson/day: deduped
    { kind: "game_session", id: "myth-buster", timestamp: "2025-03-02 08:00:00" },
    { kind: "lesson_complete", id: "FUT", timestamp: "2025-04-01T00:00:00Z" }, // future: skipped
    { kind: "lesson_complete", id: "BAD", timestamp: "not a date" }, // invalid: skipped
  ];
  const offsetAt = () => 0;
  const n = await engine.importHistory(events, offsetAt);
  assert.equal(n, 3);
  const again = await engine.importHistory(events, offsetAt); // idempotent
  assert.equal(again, 0);
  const days = await engine.getDays();
  assert.deepEqual(Object.keys(days).sort(), ["2025-03-01", "2025-03-02"]);
  assert.equal(days["2025-03-01"].imported, true);
  assert.equal(days["2025-03-01"].total, 2);
  // survives restart and is not re-imported by a new engine
  const e2 = createActivityEngine({ store, clock: clock.fn, debounceMs: 0 });
  assert.equal(await e2.importHistory(events, offsetAt), 0);
  assert.equal((await e2.getDays())["2025-03-01"].total, 2);
  // empty history fabricates nothing
  const e3 = createActivityEngine({ store: memoryStore(), clock: clock.fn, debounceMs: 0 });
  assert.equal(await e3.importHistory([], offsetAt), 0);
  assert.deepEqual(await e3.getDays(), {});
  // placement uses the local day at that instant
  const r = importHistoricalEvents({}, [{ kind: "lesson_complete", id: "z", timestamp: "2025-03-05T04:30:00Z" }], T("2025-03-10T00:00:00Z"), () => 300);
  assert.deepEqual(Object.keys(r.days), ["2025-03-04"]);
  assert.equal(parseStoredTimestamp("2025-03-01 11:00:00"), T("2025-03-01T11:00:00Z"));
});

/* ------------------------------------------------------------------ */
/* Grid                                                                */
/* ------------------------------------------------------------------ */

test("grid: Sunday-first week boundaries, 7 rows, contiguous, no future cells", () => {
  // 2025-03-04 is a Tuesday: its Sunday-first week starts 2025-03-02.
  const g = buildWeekGrid({ todayKey: "2025-03-04", weeks: 4 });
  assert.equal(g.columns.length, 4);
  for (const col of g.columns) assert.equal(col.length, 7);
  assert.deepEqual(g.rowLabels, ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  assert.equal(g.columns[0][0], "2025-02-09");
  assert.equal(g.columns[3][0], "2025-03-02");
  assert.deepEqual(g.columns[3], ["2025-03-02", "2025-03-03", "2025-03-04", null, null, null, null]);
  const flat = g.columns.flat().filter(Boolean);
  for (let i = 1; i < flat.length; i++) assert.equal(daysBetween(flat[i - 1], flat[i]), 1);
  assert.ok(flat.every((k) => k <= "2025-03-04"));
  assert.equal(weekdayOf(g.columns[0][0]), 0);
});

test("grid: today on the first / last row of a week", () => {
  const sun = buildWeekGrid({ todayKey: "2025-03-02", weeks: 2 }); // Sunday
  assert.deepEqual(sun.columns[1], ["2025-03-02", null, null, null, null, null, null]);
  const sat = buildWeekGrid({ todayKey: "2025-03-08", weeks: 2 }); // Saturday
  assert.equal(sat.columns[1][6], "2025-03-08");
  assert.ok(sat.columns[1].every(Boolean));
});

test("grid: Monday-first rule", () => {
  const g = buildWeekGrid({ todayKey: "2025-03-04", weeks: 3, weekStart: 1 });
  assert.deepEqual(g.rowLabels, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  assert.equal(g.columns[2][0], "2025-03-03");
  assert.deepEqual(g.columns[2], ["2025-03-03", "2025-03-04", null, null, null, null, null]);
  assert.equal(weekdayOf(g.columns[0][0]), 1);
});

test("grid: partial first week via rangeStart, month labels, leap/year boundaries", () => {
  const g = buildWeekGrid({ todayKey: "2025-03-04", weeks: 3, rangeStart: "2025-02-20" });
  // 2025-02-20 is a Thursday; first column (Sun 2025-02-16) is partial.
  assert.deepEqual(g.columns[0], [null, null, null, null, "2025-02-20", "2025-02-21", "2025-02-22"]);
  const labels = buildWeekGrid({ todayKey: "2025-03-04", weeks: 8 }).monthLabels;
  assert.ok(labels.some((m) => m.label === "Mar"));
  assert.ok(labels.every((m, i) => i === 0 || m.column > labels[i - 1].column));
  const y = buildWeekGrid({ todayKey: "2025-01-05", weeks: 3 });
  const keys = y.columns.flat().filter(Boolean);
  assert.ok(keys.includes("2024-12-31") && keys.includes("2025-01-01"));
  assert.ok(y.monthLabels.some((m) => m.label === "Jan"));
  const leap = buildWeekGrid({ todayKey: "2024-03-02", weeks: 2 }).columns.flat().filter(Boolean);
  assert.ok(leap.includes("2024-02-29"));
});

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

test("accessibility labels and summary text read in plain words", () => {
  let rec = emptyDay("2025-03-04");
  rec = applyEvent(rec, "lesson_step", { id: "1" }, at());
  rec = applyEvent(rec, "lesson_step", { id: "2" }, at());
  rec = applyEvent(rec, "quiz_complete", { id: "q" }, at());
  assert.equal(cellAccessibilityLabel("2025-03-04", rec), "Tuesday 4 March: 3 activities, level 3");
  assert.equal(cellAccessibilityLabel("2025-03-05", undefined), "Wednesday 5 March: 0 activities, level 0");
  assert.deepEqual(describeCounts(rec), ["2 lesson steps", "1 quiz completed"]);
  const days = { "2025-03-04": rec };
  const s = summarizeActivity(days, "2025-03-04");
  assert.equal(summaryText(3, s), "Current streak 3 days · 1 active day in the last 12 weeks · Today: 3 activities");
  assert.equal(summaryText(1, summarizeActivity({}, "2025-03-04")), "Current streak 1 day · 0 active days in the last 12 weeks · Today: 0 activities");
  // window edges: 84 days including today
  const first = addDays("2025-03-04", -83);
  const before = addDays("2025-03-04", -84);
  const edge = { [first]: { ...rec, date: first }, [before]: { ...rec, date: before } };
  assert.equal(summarizeActivity(edge, "2025-03-04").activeDays, 1);
  assert.equal(daysBetween(first, "2025-03-04"), 83);
});

/* ------------------------------------------------------------------ */
/* Streak consistency with the EXISTING streak system                  */
/* ------------------------------------------------------------------ */

// Runs the REAL services/utils.ts `checkDailyStreak` (with the AsyncStorage
// import stubbed and the clock pinned to local noon of each open day) and
// compares it with `simulateExistingStreak` on shared fixtures, in several
// timezones including DST transitions.
const STREAK_CODE = `
const { coreUrl, utilsUrl, fixtures } = JSON.parse(process.env.PAYLOAD);
const core = await import(coreUrl);
const utils = await import(utilsUrl);
const RealDate = Date; let fixed = null;
globalThis.Date = class extends RealDate {
  constructor(...a) { if (a.length === 0 && fixed !== null) super(fixed); else super(...a); }
  static now() { return fixed ?? RealDate.now(); }
};
const out = [];
for (const openDays of fixtures) {
  const profile = { current_streak: 0, longest_streak: 0 };
  globalThis.__lastActive = null;
  for (const d of openDays) {
    const [y, m, dd] = d.split("-").map(Number);
    fixed = new RealDate(y, m - 1, dd, 12, 0, 0).getTime();
    const increment = async () => { profile.current_streak += 1; profile.longest_streak = Math.max(profile.longest_streak, profile.current_streak); };
    const update = async (u) => { Object.assign(profile, u); };
    await utils.checkDailyStreak(increment, update, profile);
    globalThis.__lastActive = d; // ensureDailyTracking: setLastActiveDate(today)
  }
  const model = core.simulateExistingStreak(openDays);
  out.push({ openDays, real: { current: profile.current_streak, longest: profile.longest_streak, lastActive: globalThis.__lastActive }, model });
}
console.log(JSON.stringify(out));
`;

const STREAK_FIXTURES = [
  ["2025-03-01"],
  ["2025-03-01", "2025-03-02", "2025-03-03", "2025-03-04", "2025-03-05"],
  ["2025-03-01", "2025-03-01", "2025-03-02", "2025-03-02"], // same-day repeats
  ["2025-03-01", "2025-03-02", "2025-03-04", "2025-03-05"], // one missed day -> reset
  ["2025-03-01", "2025-03-02", "2025-03-03", "2025-03-10", "2025-03-11", "2025-03-12"],
  ["2024-02-27", "2024-02-28", "2024-02-29", "2024-03-01", "2024-03-02"], // leap day
  ["2024-12-30", "2024-12-31", "2025-01-01", "2025-01-02"], // year boundary
  ["2025-03-07", "2025-03-08", "2025-03-09", "2025-03-10", "2025-03-11"], // US spring-forward
  ["2025-10-31", "2025-11-01", "2025-11-02", "2025-11-03", "2025-11-04"], // US fall-back
  ["2025-03-28", "2025-03-29", "2025-03-30", "2025-03-31"], // EU spring-forward
  ["2025-03-03", "2025-03-04", "2025-03-03", "2025-03-04", "2025-03-05"], // clock moved backwards
];

const stubDir = fs.mkdtempSync(path.join(os.tmpdir(), "activity-streak-"));
fs.writeFileSync(
  path.join(stubDir, "utils.ts"),
  fs
    .readFileSync(path.join(REPO, "services", "utils.ts"), "utf8")
    .replace(/import \{ getLastActiveDate \} from ['"]\.\/storage['"];/, "const getLastActiveDate = async () => globalThis.__lastActive ?? null;"),
);
const utilsUrl = pathToFileURL(path.join(stubDir, "utils.ts")).href;

test("stubbed utils.ts is the real streak code (guard against silent drift)", () => {
  const src = fs.readFileSync(path.join(stubDir, "utils.ts"), "utf8");
  assert.ok(src.includes("getLastActiveDate = async"), "storage import was replaced");
  assert.ok(src.includes("export const checkDailyStreak"), "real checkDailyStreak present");
});

for (const tz of ["UTC", "America/New_York", "Europe/London", "Asia/Kolkata", "Pacific/Auckland", "Australia/Lord_Howe"]) {
  test(`streak model equals the real checkDailyStreak on shared fixtures (${tz})`, () => {
    const results = runChild(tz, STREAK_CODE, { utilsUrl, fixtures: STREAK_FIXTURES });
    assert.equal(results.length, STREAK_FIXTURES.length);
    for (const r of results) {
      assert.deepEqual(r.real, r.model, `fixture ${r.openDays.join(",")}`);
    }
  });
}

test("documented streak rules on the model", () => {
  assert.deepEqual(simulateExistingStreak(["2025-03-01", "2025-03-02", "2025-03-03"]), { current: 3, longest: 3, lastActive: "2025-03-03" });
  // gap: streak resets to 0 on the return day (today is not counted), 1 the day after; longest is kept
  assert.deepEqual(simulateExistingStreak(["2025-03-01", "2025-03-02", "2025-03-05"]), { current: 0, longest: 2, lastActive: "2025-03-05" });
  assert.deepEqual(simulateExistingStreak(["2025-03-01", "2025-03-02", "2025-03-05", "2025-03-06"]), { current: 1, longest: 2, lastActive: "2025-03-06" });
});

test("the UI reads the streak from the same profile value (no competing calculation)", () => {
  const streakScreen = fs.readFileSync(path.join(REPO, "app", "streak.tsx"), "utf8");
  assert.match(streakScreen, /const currentStreak = userProfile\?\.current_streak/);
  assert.match(streakScreen, /currentStreak=\{currentStreak\}/);
});
