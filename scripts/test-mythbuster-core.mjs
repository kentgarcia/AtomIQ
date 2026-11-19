import assert from "node:assert/strict";
import test from "node:test";

import { GAME_MODES } from "../constants/mythbuster-modes.ts";
import { challengeRound, clockAfterAnswer, clockTick, livesAfterAnswer, nextEndless, originalDeck, quickRound, shuffle, unitDeck } from "../services/mythbuster-core.ts";

/** A repeatable rng (mulberry32). */
const seeded = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const myths = Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, mythStatement: `myth ${i}`, reality: `reality ${i}`, explanation: `why ${i}`, category: "c", difficulty: "easy" }));
const rows = (unitId, n) => Array.from({ length: n }, (_, i) => ({ id: `${unitId}-${i}`, unitId, statement: `s ${i}`, verdict: i % 2 ? "fact" : "myth", explanation: "e" }));
const quick = GAME_MODES.find((m) => m.id === "quick");
const challenge = GAME_MODES.find((m) => m.id === "challenge");
const endless = GAME_MODES.find((m) => m.id === "endless");
const ids = (list) => list.map((s) => s.id);

test("modes: quick is by unit, challenge has lives and no timer, endless has a clock and no lives", () => {
  assert.equal(quick.byUnit, true);
  assert.equal(quick.rounds, 10);
  assert.equal(challenge.lives, 3);
  assert.equal(challenge.clock, undefined);
  assert.equal(endless.clock.start, 30);
  assert.equal(endless.lives, undefined);
  assert.ok(GAME_MODES.every((m) => !("timeLimit" in m)), "no per-statement timer is left");
});

test("originalDeck: a false and a true statement for every myth", () => {
  const d = originalDeck(myths);
  assert.equal(d.length, 12);
  assert.deepEqual(d.slice(0, 2).map((s) => s.isTrue), [false, true]);
  assert.equal(d[0].explanation, "reality 0");
  assert.ok(d.every((s) => s.deck === "original"));
});

test("unitDeck: a fact is true, a myth is false", () => {
  const d = unitDeck(rows("u", 4), "Unit");
  assert.deepEqual(d.map((s) => s.isTrue), [false, true, false, true]);
  assert.ok(d.every((s) => s.deck === "unit" && s.category === "Unit"));
});

test("shuffle: same items, the input is untouched", () => {
  const input = [1, 2, 3, 4, 5, 6, 7, 8];
  const out = shuffle(input, seeded(1));
  assert.deepEqual([...out].sort(), input);
  assert.deepEqual(input, [1, 2, 3, 4, 5, 6, 7, 8]);
});

test("quickRound: the unit's own 10 statements, each once", () => {
  const unit = unitDeck(rows("u", 10));
  const round = quickRound(unit, quick.rounds, seeded(2));
  assert.equal(round.length, 10);
  assert.deepEqual(ids(round).sort(), ids(unit).sort());
  assert.equal(quickRound(unit, 4, seeded(2)).length, 4);
  assert.equal(quickRound(unitDeck(rows("u", 3)), 10, seeded(2)).length, 3);
});

test("challengeRound: both decks are in it, no repeats, the asked size", () => {
  const original = originalDeck(myths);
  const unit = unitDeck(rows("u", 10));
  const round = challengeRound(original, unit, challenge.rounds, seeded(3));
  assert.equal(round.length, 15);
  assert.equal(new Set(ids(round)).size, 15);
  assert.equal(round.filter((s) => s.deck === "unit").length, 8);
  assert.equal(round.filter((s) => s.deck === "original").length, 7);
});

test("challengeRound: a short deck is topped up from the other, and nothing at all gives nothing", () => {
  const original = originalDeck(myths);
  assert.equal(challengeRound(original, unitDeck(rows("u", 2)), 15, seeded(4)).length, 12 + 2);
  assert.equal(challengeRound([], unitDeck(rows("u", 10)), 15, seeded(4)).length, 10);
  assert.deepEqual(challengeRound([], [], 15, seeded(4)), []);
});

test("nextEndless: unseen first, then anything again, nothing from an empty pool", () => {
  const pool = unitDeck(rows("u", 3));
  const seen = new Set();
  const rng = seeded(5);
  const order = [];
  for (let i = 0; i < 3; i++) {
    const s = nextEndless(pool, seen, rng);
    order.push(s.id);
    seen.add(s.id);
  }
  assert.equal(new Set(order).size, 3, "all three come before any repeats");
  assert.ok(nextEndless(pool, seen, rng), "after all were seen the pool starts over");
  assert.equal(nextEndless([], new Set()), null);
});

test("endless clock: right adds, wrong takes, never above the max or below 0, ticks down by 1", () => {
  const c = endless.clock;
  assert.equal(clockAfterAnswer(c, 30, true), 33);
  assert.equal(clockAfterAnswer(c, 30, false), 25);
  assert.equal(clockAfterAnswer(c, 44, true), c.max);
  assert.equal(clockAfterAnswer(c, 3, false), 0);
  assert.equal(clockTick(10), 9);
  assert.equal(clockTick(0), 0);
});

test("challenge lives: only a wrong answer costs one, never below 0", () => {
  assert.equal(livesAfterAnswer(3, true), 3);
  assert.equal(livesAfterAnswer(3, false), 2);
  assert.equal(livesAfterAnswer(0, false), 0);
});
