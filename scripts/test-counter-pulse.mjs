/**
 * The number a header counter shows while coins fly to it (components/quests/counter-core.ts): it holds the
 * old number, takes a share of the gain as each coin lands, ends on the real number, never passes it, and
 * does not depend on whether the saved number or the first coin arrives first.
 *
 * Run: npm run test:counter-pulse
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { HOLD_MS, MIN_PULSE_GAP, landingShares, initialCounter, counterStep } = loadTs("components/quests/counter-core.ts");

const run = (start, events) => events.reduce((s, e) => counterStep(s, e), initialCounter(start));
const landings = (n) => Array.from({ length: n }, () => ({ type: "landing" }));

test("the gain is shared out in whole numbers, the earlier coins taking the remainder, and sums to the gain", () => {
  assert.deepEqual(landingShares(25, 8), [4, 3, 3, 3, 3, 3, 3, 3]);
  assert.deepEqual(landingShares(8, 8), [1, 1, 1, 1, 1, 1, 1, 1]);
  assert.deepEqual(landingShares(3, 8), [1, 1, 1, 0, 0, 0, 0, 0]);
  assert.deepEqual(landingShares(0, 4), [0, 0, 0, 0]);
  for (const [d, n] of [[25, 8], [5, 5], [100, 7], [1, 3], [0, 1]]) {
    const s = landingShares(d, n);
    assert.equal(s.length, n);
    assert.equal(s.reduce((a, b) => a + b, 0), d);
    assert.ok(s.every((x) => Number.isInteger(x) && x >= 0));
  }
});

test("a counter with nothing happening shows what it is told", () => {
  const s = run(10, [{ type: "value", value: 10 }]);
  assert.equal(s.shown, 10);
  assert.equal(counterStep(s, { type: "landing" }), s, "a landing with no flight changes nothing");
});

test("a spend or a reset shows at once, even with a flight on", () => {
  assert.equal(run(50, [{ type: "value", value: 30 }]).shown, 30);
  assert.equal(run(50, [{ type: "start", count: 4 }, { type: "value", value: 0 }]).shown, 0);
});

test("saved number AFTER the flight starts: the number holds, then each coin adds its share, the last lands on the real number", () => {
  let s = run(100, [{ type: "start", count: 4 }, { type: "value", value: 125 }]);
  assert.equal(s.shown, 100, "nothing shown before a coin lands");
  const seen = [];
  for (const e of landings(4)) {
    s = counterStep(s, e);
    seen.push(s.shown);
  }
  assert.deepEqual(seen, [107, 113, 119, 125]);
  assert.equal(s.flight, null);
});

test("saved number BEFORE the flight is announced (a chest pays, then the diamonds fly): held, then paid out by the coins", () => {
  let s = run(10, [{ type: "value", value: 15 }]);
  assert.equal(s.shown, 10);
  assert.equal(s.holding, true);
  s = counterStep(s, { type: "start", count: 5 });
  assert.equal(s.holding, false);
  const seen = [];
  for (const e of landings(5)) {
    s = counterStep(s, e);
    seen.push(s.shown);
  }
  assert.deepEqual(seen, [11, 12, 13, 14, 15]);
});

test("a first coin that lands before the saved number arrives is paid when the number arrives", () => {
  let s = run(0, [{ type: "start", count: 4 }, { type: "landing" }, { type: "landing" }]);
  assert.equal(s.shown, 0);
  s = counterStep(s, { type: "value", value: 20 });
  assert.equal(s.shown, 10, "two of four coins have already landed: half the gain");
  s = counterStep(s, { type: "landing" });
  assert.equal(s.shown, 15);
  s = counterStep(s, { type: "landing" });
  assert.equal(s.shown, 20);
});

test("a gain with no flight is shown once the hold is over", () => {
  let s = run(10, [{ type: "value", value: 14 }]);
  assert.equal(s.shown, 10);
  s = counterStep(s, { type: "settle" });
  assert.equal(s.shown, 14);
  assert.ok(HOLD_MS > 0 && HOLD_MS < 500);
});

test("settle does nothing once a flight has taken the gain", () => {
  const s = run(10, [{ type: "value", value: 14 }, { type: "start", count: 2 }, { type: "settle" }]);
  assert.equal(s.shown, 10);
});

test("a flight that never plays is ended and shows the real number", () => {
  const s = run(10, [{ type: "start", count: 6 }, { type: "value", value: 30 }, { type: "landing" }, { type: "end" }]);
  assert.equal(s.shown, 30);
  assert.equal(s.flight, null);
});

test("whatever order things come in, shown never passes the real number and never goes down in a flight, and ends on it", () => {
  const orders = [
    [{ type: "value", value: 40 }, { type: "start", count: 8 }],
    [{ type: "start", count: 8 }, { type: "value", value: 40 }],
    [{ type: "start", count: 8 }, { type: "landing" }, { type: "value", value: 40 }],
    [{ type: "start", count: 8 }, { type: "landing" }, { type: "landing" }, { type: "landing" }, { type: "value", value: 40 }],
  ];
  for (const head of orders) {
    let s = initialCounter(15);
    let last = s.shown;
    for (const e of [...head, ...landings(8)]) {
      s = counterStep(s, e);
      assert.ok(s.shown <= s.value, `shown ${s.shown} passed value ${s.value}`);
      assert.ok(s.shown >= last, "went down");
      last = s.shown;
    }
    assert.equal(s.shown, 40);
    assert.equal(s.flight, null);
  }
});

test("a second gain inside the same flight is brought by the last coin", () => {
  let s = run(0, [{ type: "start", count: 2 }, { type: "value", value: 10 }, { type: "landing" }]);
  assert.equal(s.shown, 5);
  s = counterStep(s, { type: "value", value: 14 });
  assert.equal(s.shown, 5);
  s = counterStep(s, { type: "landing" });
  assert.equal(s.shown, 14);
});

test("pulses are spaced", () => {
  assert.ok(MIN_PULSE_GAP >= 80 && MIN_PULSE_GAP <= 200);
});
