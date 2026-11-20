// Atom Maze progression tests (docs/qa/ATOMIQ_FEEDBACK_SUMMARY_SPEC.md §4.4).
// Run: npm run test:maze
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const P = await import(
  pathToFileURL(path.join(REPO, "services", "atom-maze-progression.ts")).href
);

// Deterministic PRNG so failures reproduce.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const bank = (n) => {
  const diffs = ["easy", "medium", "hard"];
  return Array.from({ length: n }, (_, i) => ({
    id: P.makeQuestionId(`  Question   number ${i}? `),
    difficulty: diffs[i % 3],
  }));
};

const assertNoRepeats = (ids, label) => {
  const seen = new Set();
  ids.forEach((id, i) => {
    assert.ok(!seen.has(id), `${label}: id repeated at position ${i}: ${id}`);
    seen.add(id);
  });
};

/** One full correct answer cycle with duplicate "rapid" callbacks. */
const answerCorrectly = (state, token, { duplicates = 3 } = {}) => {
  let s = state;
  let begun = 0;
  let committed = 0;
  for (let i = 0; i < duplicates; i += 1) {
    const r = P.beginAnswer(s, token);
    if (r.applied) begun += 1;
    s = r.state;
  }
  for (let i = 0; i < duplicates; i += 1) {
    const r = P.commitCorrect(s, token);
    if (r.applied) committed += 1;
    s = r.state;
  }
  assert.equal(begun, 1, "exactly one submission accepted");
  assert.equal(committed, 1, "exactly one commit applied");
  return s;
};

test("makeQuestionId normalizes whitespace and case", () => {
  assert.equal(P.makeQuestionId("  What   IS this? "), "what is this?");
});

test("endless mode: 150-question bank is served once each, no repeats, then exhausts", () => {
  const rng = mulberry32(42);
  const items = bank(150);
  let state = P.createProgression(items);
  const served = [];
  for (let wave = 0; wave < 400; wave += 1) {
    const r = P.serveNext(state, { pick: P.createEndlessPicker(wave, rng) });
    if (r.status === "exhausted") break;
    assert.equal(r.status, "served");
    served.push(r.served.id);
    // Re-render / duplicate serve while unresolved must not skip or reselect.
    const again = P.serveNext(r.state, { pick: P.createEndlessPicker(wave, rng) });
    assert.equal(again.status, "active");
    assert.equal(again.served.id, r.served.id);
    assert.equal(again.token, r.token);
    state = answerCorrectly(again.state, r.token);
  }
  assert.equal(served.length, 150);
  assertNoRepeats(served, "endless");
  assert.deepEqual(state.servedLog, served);
  assert.equal(P.isExhausted(state), true);
  assert.equal(P.getProgress(state).consumed, 150);
  assert.equal(P.serveNext(state).status, "exhausted");
});

test("endless ramp: early waves are easy, later waves mix difficulties", () => {
  const rng = mulberry32(7);
  let state = P.createProgression(bank(150));
  const diffs = [];
  for (let wave = 0; wave < 60; wave += 1) {
    const r = P.serveNext(state, { pick: P.createEndlessPicker(wave, rng) });
    diffs.push(r.served.difficulty);
    state = answerCorrectly(r.state, r.token, { duplicates: 1 });
  }
  assert.ok(diffs.slice(0, 5).every((d) => d === "easy"));
  assert.ok(diffs.slice(10).some((d) => d !== "easy"));
});

test("fixed maze: rooms then boss never repeat a question across segments", () => {
  const rng = mulberry32(99);
  const rooms = Array.from({ length: 9 }, (_, r) => ({
    id: `room-${r}`,
    // A room can list several questions; only one is needed to clear it.
    questions: [0, 1].map((q) => `Room ${r} question ${q}?`),
  }));
  const roomItems = rooms.flatMap((room) =>
    room.questions.map((text) => ({ id: P.makeQuestionId(text), group: room.id })),
  );
  let state = P.createProgression(roomItems);
  const served = [];

  for (const room of rooms) {
    const r = P.serveNext(state, { group: room.id });
    assert.equal(r.status, "served");
    assert.equal(r.served.group, room.id);
    served.push(r.served.id);
    // One wrong attempt keeps the same question for a retry.
    let s = P.beginAnswer(r.state, r.token).state;
    const wrong = P.resolveWrong(s, r.token);
    assert.equal(wrong.applied, true);
    assert.equal(P.resolveWrong(wrong.state, r.token).applied, false, "duplicate wrong ignored");
    const retry = P.serveNext(wrong.state, { group: room.id });
    assert.equal(retry.status, "active");
    assert.equal(retry.served.id, r.served.id);
    state = answerCorrectly(retry.state, r.token);
    // Serving the same room again must not hand back the consumed question.
    assert.notEqual(P.serveNext(state, { group: room.id }).served.id, r.served.id);
    // ...and the screen leaves the room; abandon that serve by consuming siblings later.
    const sibling = P.serveNext(state, { group: room.id });
    state = P.beginAnswer(sibling.state, sibling.token).state;
    state = P.resolveWrong(state, sibling.token, { retire: true }).state;
  }

  // Boss pool: includes some ids already used in rooms (must be ignored)
  // plus fresh ones; wrong answers retire, correct answers consume.
  const bossItems = [
    ...roomItems.slice(0, 5).map((i) => ({ id: i.id, group: "boss" })),
    ...Array.from({ length: 8 }, (_, i) => ({
      id: P.makeQuestionId(`Boss question ${i}?`),
      group: "boss",
    })),
  ];
  state = P.addItems(state, bossItems);
  assert.equal(P.getAvailable(state, "boss").length, 8, "reused ids are not re-introduced");

  let bossServed = 0;
  for (;;) {
    const r = P.serveNext(state, { group: "boss" });
    if (r.status === "exhausted") break;
    served.push(r.served.id);
    bossServed += 1;
    state = P.beginAnswer(r.state, r.token).state;
    state =
      rng() < 0.4
        ? P.resolveWrong(state, r.token, { retire: true }).state
        : P.commitCorrect(state, r.token).state;
  }
  assert.equal(bossServed, 8);
  assertNoRepeats(served, "fixed maze");
  assert.equal(P.isExhausted(state, "boss"), true);
});

test("duplicate commit / rapid taps / stale token are idempotent", () => {
  let state = P.createProgression(bank(5));
  const first = P.serveNext(state);
  state = first.state;

  assert.equal(P.commitCorrect(state, first.token).applied, false, "cannot commit before answering");
  const b1 = P.beginAnswer(state, first.token);
  assert.equal(b1.applied, true);
  assert.equal(P.beginAnswer(b1.state, first.token).applied, false, "double tap rejected");
  assert.equal(P.beginAnswer(b1.state, "999:1").applied, false, "stale token rejected");

  const c1 = P.commitCorrect(b1.state, first.token);
  assert.equal(c1.applied, true);
  assert.equal(c1.id, first.served.id);
  const c2 = P.commitCorrect(c1.state, first.token);
  assert.equal(c2.applied, false);
  assert.strictEqual(c2.state, c1.state, "duplicate commit returns same state object");
  assert.equal(P.getProgress(c2.state).consumed, 1);

  // A late duplicate callback for the previous question cannot touch the next.
  const second = P.serveNext(c2.state);
  assert.notEqual(second.served.id, first.served.id);
  const b2 = P.beginAnswer(second.state, second.token);
  assert.equal(P.commitCorrect(b2.state, first.token).applied, false);
  assert.equal(P.beginAnswer(b2.state, first.token).applied, false);
  assert.equal(P.getProgress(b2.state).consumed, 1);
});

test("consumed only after commit: answering alone does not consume", () => {
  let state = P.createProgression(bank(3));
  const r = P.serveNext(state);
  const b = P.beginAnswer(r.state, r.token);
  assert.equal(b.state.entries[r.served.id].status, "active");
  assert.equal(P.getProgress(b.state).consumed, 0);
  const c = P.commitCorrect(b.state, r.token);
  assert.equal(c.state.entries[r.served.id].status, "consumed");
});

test("wrong answer keeps the question for retry, never consumes it", () => {
  let state = P.createProgression(bank(3));
  const r = P.serveNext(state);
  let s = P.beginAnswer(r.state, r.token).state;
  s = P.resolveWrong(s, r.token).state;
  assert.equal(s.active.wrongAttempts, 1);
  assert.equal(s.active.answering, false);
  assert.equal(s.entries[r.served.id].status, "active");
  // Can answer again with the same token (same serve).
  assert.equal(P.beginAnswer(s, r.token).applied, true);
});

test("exhaustion is explicit and never silently repeats", () => {
  let state = P.createProgression(bank(3));
  for (let i = 0; i < 3; i += 1) {
    const r = P.serveNext(state);
    assert.equal(r.status, "served");
    state = answerCorrectly(r.state, r.token);
  }
  for (let i = 0; i < 5; i += 1) {
    const r = P.serveNext(state);
    assert.equal(r.status, "exhausted");
    assert.equal(r.served, null);
    assert.equal(r.token, null);
    state = r.state;
  }
  assert.equal(P.getProgress(state).exhausted, true);
});

test("retired (wrong in boss) questions are not reselected before exhaustion", () => {
  let state = P.createProgression(bank(4));
  const seen = [];
  for (;;) {
    const r = P.serveNext(state);
    if (r.status === "exhausted") break;
    seen.push(r.served.id);
    state = P.resolveWrong(P.beginAnswer(r.state, r.token).state, r.token, {
      retire: true,
    }).state;
  }
  assert.equal(seen.length, 4);
  assertNoRepeats(seen, "retire");
});

test("new run resets pool and invalidates tokens from the previous run", () => {
  const items = bank(3);
  let state = P.createProgression(items);
  const old = P.serveNext(state);
  state = P.beginAnswer(old.state, old.token).state;
  const oldToken = old.token;

  state = P.startNewRun(state, items);
  assert.equal(state.runId, 2);
  assert.equal(P.getProgress(state).available, 3);
  assert.deepEqual(state.servedLog, []);

  // Late callbacks from the previous run cannot commit into the new one.
  assert.equal(P.commitCorrect(state, oldToken).applied, false);
  const r = P.serveNext(state);
  assert.notEqual(r.token, oldToken);
  assert.equal(P.commitCorrect(P.beginAnswer(r.state, oldToken).state, oldToken).applied, false);

  // Full second run after exhaustion serves everything again exactly once.
  let s = r.state;
  const served = [r.served.id];
  s = answerCorrectly(s, r.token);
  for (;;) {
    const n = P.serveNext(s);
    if (n.status === "exhausted") break;
    served.push(n.served.id);
    s = answerCorrectly(n.state, n.token);
  }
  assert.equal(served.length, 3);
  assertNoRepeats(served, "second run");
  s = P.startNewRun(s, items);
  assert.equal(P.serveNext(s).status, "served");
});

test("progress survives re-renders: state is value-based, not order-based", () => {
  const items = bank(6);
  let state = P.createProgression(items);
  const r = P.serveNext(state);
  state = answerCorrectly(r.state, r.token);
  // Simulate the display order being reshuffled (e.g. useMemo recompute):
  // a state rebuilt from the reversed pool plus the same statuses is not
  // needed because identity is the id; verify ids do not depend on position.
  const reversed = P.addItems(P.createProgression([]), [...items].reverse());
  assert.equal(reversed.order[0], items[items.length - 1].id);
  assert.equal(state.entries[r.served.id].status, "consumed");
  // addItems for an already consumed id is ignored (no resurrection).
  const readded = P.addItems(state, [items.find((i) => i.id === r.served.id)]);
  assert.strictEqual(readded, state);
  assert.equal(readded.entries[r.served.id].status, "consumed");
});

test("picker returning a non-candidate falls back safely", () => {
  let state = P.createProgression(bank(3));
  const r = P.serveNext(state, { pick: () => ({ id: "ghost" }) });
  assert.equal(r.status, "served");
  assert.ok(state.entries[r.served.id]);
});

test("stress: random interleavings of duplicate callbacks never repeat", () => {
  const rng = mulberry32(2024);
  for (let run = 0; run < 25; run += 1) {
    let state = P.createProgression(bank(40));
    const served = [];
    for (let guard = 0; guard < 500; guard += 1) {
      const r = P.serveNext(state, { pick: P.createEndlessPicker(guard, rng) });
      if (r.status === "exhausted") break;
      served.push(r.served.id);
      let s = r.state;
      // Random wrong attempts, then correct, with noisy duplicate events.
      const wrongs = Math.floor(rng() * 3);
      for (let w = 0; w < wrongs; w += 1) {
        s = P.beginAnswer(s, r.token).state;
        s = P.beginAnswer(s, r.token).state;
        s = P.resolveWrong(s, r.token).state;
        s = P.resolveWrong(s, r.token).state;
        s = P.serveNext(s).state; // re-render re-serve: must be a no-op
      }
      s = answerCorrectly(s, r.token, { duplicates: 1 + Math.floor(rng() * 4) });
      s = P.commitCorrect(s, r.token).state;
      state = s;
    }
    assert.equal(served.length, 40);
    assertNoRepeats(served, `stress run ${run}`);
  }
});
