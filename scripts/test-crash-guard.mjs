import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

const g = await import(pathToFileURL(path.join(process.cwd(), "services/crash-guard-core.ts")).href);
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

test("a first start is not a crash, and the app is then running", () => {
  const { state, crashed } = g.onLaunch(g.EMPTY_GUARD, NOW, true);
  assert.equal(crashed, false);
  assert.equal(state.running, true);
  assert.equal(state.total, 0);
});

test("a start that finds the app still running is a crash, and it is counted and dated", () => {
  const prev = { ...g.EMPTY_GUARD, running: true };
  const { state, crashed } = g.onLaunch(prev, NOW, true);
  assert.equal(crashed, true);
  assert.deepEqual(state.crashes, [NOW]);
  assert.equal(state.total, 1);
});

test("going to the background first (a swipe away, back, the system tidying up) is never a crash", () => {
  let s = g.onLaunch(g.EMPTY_GUARD, NOW, true).state;
  s = g.onBackground(s);
  assert.equal(g.onLaunch(s, NOW + 1000, true).crashed, false);
  s = g.onForeground(s);
  assert.equal(s.running, true);
  assert.equal(g.onLaunch(s, NOW + 2000, true).crashed, true, "killed while in front");
});

test("a development build does not trust the flag (a reload looks like a crash), only a simulated crash counts there", () => {
  const prev = { ...g.EMPTY_GUARD, running: true };
  assert.equal(g.onLaunch(prev, NOW, false).crashed, false);
  const sim = g.simulateCrash(g.EMPTY_GUARD);
  const r = g.onLaunch(sim, NOW, false);
  assert.equal(r.crashed, true);
  assert.equal(r.state.simulated, false, "a simulation is used once");
});

test("the list of crashes keeps only the newest ten, but the total keeps counting", () => {
  let s = g.EMPTY_GUARD;
  for (let i = 0; i < 14; i++) s = g.onLaunch({ ...s, running: true }, NOW + i, true).state;
  assert.equal(s.crashes.length, 10);
  assert.equal(s.total, 14);
});

test("the advice: Reduced after a first crash on Max, Disabled after two in two weeks or when Reduced did not hold, nothing once Disabled", () => {
  const one = g.onLaunch({ ...g.EMPTY_GUARD, running: true }, NOW, true).state;
  assert.deepEqual(g.adviceFor(one, "max", NOW), { level: "reduced", crashes: 1 });
  assert.deepEqual(g.adviceFor(one, "reduced", NOW), { level: "off", crashes: 1 });
  assert.equal(g.adviceFor(one, "off", NOW), null);
  const two = g.onLaunch({ ...one, running: true }, NOW + DAY, true).state;
  assert.deepEqual(g.adviceFor(two, "max", NOW + DAY), { level: "off", crashes: 2 });
});

test("a crash is offered once: after the learner answers, the same crash is never offered again, a new one is", () => {
  const one = g.onLaunch({ ...g.EMPTY_GUARD, running: true }, NOW, true).state;
  const answered = g.onAnswered(one);
  assert.equal(g.adviceFor(answered, "max", NOW), null);
  const again = g.onLaunch({ ...answered, running: true }, NOW + DAY, true).state;
  assert.notEqual(g.adviceFor(again, "max", NOW + DAY), null);
});

test("crashes older than two weeks do not make the advice stronger", () => {
  const old = { ...g.EMPTY_GUARD, crashes: [NOW - 20 * DAY], total: 1, prompted: 1 };
  const fresh = g.onLaunch({ ...old, running: true }, NOW, true).state;
  assert.equal(g.recentCrashes(fresh, NOW), 1);
  assert.deepEqual(g.adviceFor(fresh, "max", NOW), { level: "reduced", crashes: 1 });
});

test("saved state that is missing, damaged or from the future reads as a safe state", () => {
  for (const bad of [null, undefined, "x", 5, [], { crashes: "no", total: -3, prompted: 99 }]) {
    const s = g.normalizeGuard(bad);
    assert.ok(s.total >= 0 && s.prompted <= s.total && Array.isArray(s.crashes));
  }
  assert.equal(g.normalizeGuard({ running: true }).running, true);
});
