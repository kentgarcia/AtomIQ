/**
 * Saving a lesson in progress (services/lesson-progress-core.ts): what is worth saving, how a saved
 * run is checked before it is used again, and the unit ring on the map.
 *
 * Run: npm run test:lesson-progress
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("services/lesson-progress-core.ts");
const lesson = loadTs("services/lesson-core.ts");
const { canSaveProgress, contentKeyOf, isResumable, parseSnapshot, runProgress, toSnapshot, unitRingProgress } = core;
const { advance, createRun, skipDeeper, submitAnswer } = lesson;

const cards = [
  { id: "a", kind: "teach", tier: "core", scored: false },
  { id: "b", kind: "item", tier: "core", scored: true },
  { id: "b2", kind: "item", tier: "deeper", scored: true },
  { id: "c", kind: "item", tier: "core", scored: true },
  { id: "d", kind: "teach", tier: "core", scored: false },
];
const key = contentKeyOf(cards.map((c) => c.id));
const stateOf = (run, extra = {}) => ({ run, answers: [], guesses: {}, replayIntroDone: false, elapsedMs: 4000, ...extra });
const midRun = () => advance(skipDeeper(advance(advance(createRun(cards))))); // past a and b, now on c
const saved = (run, extra) => JSON.stringify(toSnapshot("n1", key, stateOf(run, extra), 123));

test("only lessons save: practice, checkpoint, test-out and review start again", () => {
  assert.equal(canSaveProgress("lesson"), true);
  for (const kind of ["practice", "checkpoint", "testout", "review"]) assert.equal(canSaveProgress(kind), false, kind);
});

test("a run is worth saving once it is past the first card or answering", () => {
  const fresh = createRun(cards);
  assert.equal(isResumable(fresh), false);
  assert.equal(isResumable(advance(fresh)), true);
  const answeredFirst = submitAnswer(createRun(cards), "a", true);
  assert.equal(isResumable(answeredFirst), true);
  // A finished run is never saved
  let done = createRun(cards);
  for (let i = 0; i < 12 && done.phase !== "done"; i++) done = done.offer ? skipDeeper(done) : advance(done);
  assert.equal(done.phase, "done");
  assert.equal(isResumable(done), false);
});

test("progress is the share of the lesson passed, never full for a saved run", () => {
  const run = midRun();
  assert.ok(runProgress(run) > 0 && runProgress(run) < 1);
  assert.equal(runProgress(createRun(cards)), 0);
  const last = { ...createRun(cards), index: 4 };
  assert.ok(runProgress(last) <= 0.95);
});

test("the unit ring is completed nodes plus the part of the current one", () => {
  assert.equal(unitRingProgress(0, 6, 0), 0);
  assert.equal(unitRingProgress(2, 6, 0), 2 / 6);
  assert.ok(Math.abs(unitRingProgress(2, 6, 0.5) - 2.5 / 6) < 1e-9);
  assert.equal(unitRingProgress(6, 6, 0.5), 1, "a finished unit has no current node to add to");
  assert.equal(unitRingProgress(0, 0, 0.5), 0);
  assert.equal(unitRingProgress(Number.NaN, 6, Number.NaN), 0);
  for (const [c, t, p] of [[1, 5, 9], [-2, 5, -1], [9, 5, 1]]) {
    const v = unitRingProgress(c, t, p);
    assert.ok(v >= 0 && v <= 1, `${c},${t},${p}: ${v}`);
  }
  // The partial progress of the current node never pushes the ring past the next node's share
  assert.ok(unitRingProgress(2, 6, 1) <= 3 / 6 + 1e-9);
});

test("a saved run reads back exactly as it was saved", () => {
  const run = submitAnswer(midRun(), "c", false);
  const raw = saved(run, { answers: [{ itemId: "i1", objectiveId: "o1", surface: "lesson", correct: false }], guesses: { b: { text: "24" } }, replayIntroDone: true });
  const back = parseSnapshot(raw, { nodeId: "n1", contentKey: key });
  assert.ok(back);
  assert.deepEqual(back.run, run);
  assert.equal(back.answers.length, 1);
  assert.deepEqual(back.guesses, { b: { text: "24" } });
  assert.equal(back.replayIntroDone, true);
  assert.equal(back.elapsedMs, 4000);
});

test("a saved run that cannot be trusted is dropped, so the lesson starts again", () => {
  const good = JSON.parse(saved(midRun()));
  const expect = { nodeId: "n1", contentKey: key };
  assert.ok(parseSnapshot(JSON.stringify(good), expect));
  const bad = (mutate) => {
    const c = JSON.parse(JSON.stringify(good));
    mutate(c);
    return parseSnapshot(JSON.stringify(c), expect);
  };
  assert.equal(parseSnapshot(null, expect), null);
  assert.equal(parseSnapshot("", expect), null);
  assert.equal(parseSnapshot("not json{", expect), null);
  assert.equal(parseSnapshot("[1,2]", expect), null);
  assert.equal(parseSnapshot(JSON.stringify(good), { nodeId: "other", contentKey: key }), null, "another node's run");
  assert.equal(parseSnapshot(JSON.stringify(good), { nodeId: "n1", contentKey: contentKeyOf(["a", "b", "x"]) }), null, "the lesson's cards changed");
  assert.equal(bad((c) => (c.v = 99)), null);
  assert.equal(bad((c) => (c.run.index = 99)), null);
  assert.equal(bad((c) => (c.run.index = -1)), null);
  assert.equal(bad((c) => (c.run.phase = "done")), null);
  assert.equal(bad((c) => (c.run.queue = [])), null);
  assert.equal(bad((c) => (c.run.queue[0] = { id: "ghost", kind: "teach", tier: "core", scored: false })), null, "a card the run does not know");
  assert.equal(bad((c) => (c.run.records.a = { tries: "1" })), null);
  assert.equal(bad((c) => (c.answers = [{ itemId: 1 }])), null);
  assert.equal(bad((c) => (c.guesses = { x: { text: 5 } })), null);
  assert.equal(bad((c) => delete c.replayIntroDone), null);
  assert.equal(bad((c) => (c.elapsedMs = "x"))?.elapsedMs, 0, "a bad clock only resets the time");
});

test("a run with nothing done is not resumed", () => {
  assert.equal(parseSnapshot(saved(createRun(cards)), { nodeId: "n1", contentKey: key }), null);
});

test("the content key changes when the cards change, and not when they do not", () => {
  assert.equal(contentKeyOf(["a", "b"]), contentKeyOf(["a", "b"]));
  assert.notEqual(contentKeyOf(["a", "b"]), contentKeyOf(["b", "a"]));
  assert.notEqual(contentKeyOf(["a", "b"]), contentKeyOf(["a", "b", "c"]));
});
