/**
 * Curriculum logic: item evaluation, the lesson run state machine and mastery.
 *
 * Run: npm run test:curriculum
 */
import { computePathState, countCompletedLessons } from "../services/path-core.ts";
import { atomGoalMet, builderRows, describeAtom, goalChecklist, isStableNucleus, ELEMENTS, shellFilling } from "../content/curriculum/elements.ts";
import { formatEstimate, fractionFromValue, valueFromFraction } from "../content/curriculum/estimate.ts";
import { plainText, splitTerms } from "../content/curriculum/terms.ts";
import { pickItems, pickReviewItems } from "../services/session-core.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkModeOf } from "../content/curriculum/check-mode.ts";
import { evaluateItem, seededShuffle, shuffleNotSame, withinTolerance } from "../content/curriculum/evaluate.ts";
import {
  acceptDeeper,
  advance,
  canGoBack,
  createRun,
  currentCard,
  goBack,
  isRevisit,
  progressOf,
  skipDeeper,
  starsFor,
  submitAnswer,
  summarize,
} from "../services/lesson-core.ts";
import {
  BOX_DAYS,
  DAY_MS,
  applyAnswer,
  initialMastery,
  isDue,
  markFamiliar,
  selectDue,
} from "../services/mastery-core.ts";

describe("evaluateItem", () => {
  it("choice: correct by id, and returns the note of a wrong option", () => {
    const data = {
      options: [
        { id: "a", label: "A" },
        { id: "b", label: "B", note: "That mixes up X and Y." },
      ],
      answer: "a",
    };
    assert.equal(evaluateItem("choice", data, { type: "choice", optionId: "a" }).correct, true);
    assert.deepEqual(evaluateItem("choice", data, { type: "choice", optionId: "b" }), {
      correct: false,
      note: "That mixes up X and Y.",
    });
  });

  it("a response of the wrong type is incorrect and never throws", () => {
    assert.equal(evaluateItem("choice", { answer: "a" }, { type: "sort", placements: {} }).correct, false);
  });

  it("true_or_myth", () => {
    const data = { statement: "s", answer: "myth" };
    assert.equal(evaluateItem("true_or_myth", data, { type: "true_or_myth", answer: "myth" }).correct, true);
    assert.equal(evaluateItem("true_or_myth", data, { type: "true_or_myth", answer: "true" }).correct, false);
  });

  it("order: reports which positions are wrong", () => {
    const data = { items: [{ id: "h" }, { id: "c" }, { id: "o" }] };
    assert.equal(evaluateItem("order", data, { type: "order", orderedIds: ["h", "c", "o"] }).correct, true);
    const wrong = evaluateItem("order", data, { type: "order", orderedIds: ["c", "h", "o"] });
    assert.equal(wrong.correct, false);
    assert.deepEqual(wrong.wrongIds, ["h", "c"]);
  });

  it("match: a pair is right when the left id is matched to the right with the same id", () => {
    const data = { pairs: [{ id: "p" }, { id: "n" }] };
    assert.equal(evaluateItem("match", data, { type: "match", matches: { p: "p", n: "n" } }).correct, true);
    assert.deepEqual(evaluateItem("match", data, { type: "match", matches: { p: "n", n: "p" } }).wrongIds, ["p", "n"]);
    // An unplaced pair is wrong, not skipped.
    assert.equal(evaluateItem("match", data, { type: "match", matches: { p: "p" } }).correct, false);
  });

  it("sort", () => {
    const data = { items: [{ id: "x", bucket: "in" }, { id: "y", bucket: "out" }] };
    assert.equal(evaluateItem("sort", data, { type: "sort", placements: { x: "in", y: "out" } }).correct, true);
    assert.deepEqual(evaluateItem("sort", data, { type: "sort", placements: { x: "in", y: "in" } }).wrongIds, ["y"]);
  });

  it("fill: bank by id, number with tolerance", () => {
    const bank = { mode: "bank", answer: "carbon" };
    assert.equal(evaluateItem("fill", bank, { type: "fill", value: "carbon" }).correct, true);
    assert.equal(evaluateItem("fill", bank, { type: "fill", value: "oxygen" }).correct, false);
    const num = { mode: "number", answer: 8, tolerance: 0 };
    assert.equal(evaluateItem("fill", num, { type: "fill", value: 8 }).correct, true);
    assert.equal(evaluateItem("fill", num, { type: "fill", value: "8" }).correct, true);
    assert.equal(evaluateItem("fill", num, { type: "fill", value: 7 }).correct, false);
    assert.equal(evaluateItem("fill", num, { type: "fill", value: Number.NaN }).correct, false);
  });

  it("estimate: linear tolerance and log factor", () => {
    assert.equal(withinTolerance(55, 50, 10), true);
    assert.equal(withinTolerance(65, 50, 10), false);
    assert.equal(withinTolerance(900_000, 1_000_000, 10, "log"), true);
    assert.equal(withinTolerance(50_000, 1_000_000, 10, "log"), false);
    assert.equal(withinTolerance(0, 1000, 10, "log"), false);
    const data = { answer: 1_000_000, tolerance: 10, scale: "log" };
    assert.equal(evaluateItem("estimate", data, { type: "estimate", value: 300_000 }).correct, true);
  });

  it("hotspot", () => {
    const data = { answer: "nucleus" };
    assert.equal(evaluateItem("hotspot", data, { type: "hotspot", targetId: "nucleus" }).correct, true);
    assert.equal(evaluateItem("hotspot", data, { type: "hotspot", targetId: "cloud" }).correct, false);
  });
});

describe("shuffle", () => {
  it("is deterministic for a seed and keeps every element", () => {
    const items = ["a", "b", "c", "d", "e"];
    assert.deepEqual(seededShuffle(items, "s"), seededShuffle(items, "s"));
    assert.deepEqual([...seededShuffle(items, "s")].sort(), items);
  });
  it("shuffleNotSame never returns the original order", () => {
    for (let i = 0; i < 40; i++) {
      const items = ["a", "b", "c"];
      assert.notDeepEqual(shuffleNotSame(items, `seed-${i}`), items);
    }
  });
});

const card = (id, extra = {}) => ({ id, kind: "item", tier: "core", scored: true, objectiveId: "o1", ...extra });
const teach = (id) => ({ id, kind: "teach", tier: "core", scored: false });

describe("lesson run", () => {
  it("plays core cards in order and finishes when nothing was missed", () => {
    let run = createRun([teach("t1"), card("q1"), card("q2")]);
    assert.equal(currentCard(run).id, "t1");
    run = advance(run);
    run = submitAnswer(run, "q1", true);
    run = advance(run);
    run = submitAnswer(run, "q2", true);
    run = advance(run);
    assert.equal(run.phase, "done");
    assert.equal(currentCard(run), null);
    const s = summarize(run);
    assert.equal(s.scoredTotal, 2);
    assert.equal(s.accuracy, 1);
    assert.equal(starsFor(s), 3);
  });

  it("an empty card list is already done", () => {
    assert.equal(createRun([]).phase, "done");
  });

  it("a wrong answer does not block; the card returns in the mistakes replay", () => {
    let run = createRun([card("q1"), card("q2")]);
    run = submitAnswer(run, "q1", false);
    run = advance(run); // not blocked
    assert.equal(currentCard(run).id, "q2");
    run = submitAnswer(run, "q2", true);
    run = advance(run); // end of pass: replay starts
    assert.equal(run.phase, "replay");
    assert.equal(currentCard(run).id, "q1");
    run = submitAnswer(run, "q1", true);
    run = advance(run);
    assert.equal(run.phase, "done");
    const s = summarize(run);
    assert.equal(s.firstTryCorrect, 1);
    assert.equal(s.replayed, 1);
    assert.equal(s.accuracy, 0.5);
    assert.deepEqual(s.perObjective.o1, { total: 2, firstTryCorrect: 1, solved: 2 });
  });

  it("a card still wrong in the replay is queued again until it is right", () => {
    let run = createRun([card("q1")]);
    run = submitAnswer(run, "q1", false);
    run = advance(run);
    assert.equal(run.phase, "replay");
    run = submitAnswer(run, "q1", false);
    run = advance(run);
    assert.equal(run.phase, "replay");
    assert.equal(currentCard(run).id, "q1");
    run = submitAnswer(run, "q1", true);
    run = advance(run);
    assert.equal(run.phase, "done");
    // First-try result is kept, not overwritten by the later correct answer.
    assert.equal(summarize(run).firstTryCorrect, 0);
  });

  it("predictions are unscored: no replay, no accuracy", () => {
    let run = createRun([card("p1", { scored: false })]);
    run = submitAnswer(run, "p1", false);
    run = advance(run);
    assert.equal(run.phase, "done");
    assert.equal(summarize(run).scoredTotal, 0);
    assert.equal(summarize(run).accuracy, 1);
  });

  it("ignores an answer for a card that is not current (double taps, late callbacks)", () => {
    let run = createRun([card("q1"), card("q2")]);
    const before = run;
    run = submitAnswer(run, "q2", false);
    assert.equal(run, before);
    run = submitAnswer(run, "q1", true);
    const once = run;
    run = advance(run);
    run = submitAnswer(run, "q1", false); // q1 is no longer current
    assert.deepEqual(run.records, once.records);
  });

  it("deeper cards are offered after their core card and only play when accepted", () => {
    const cards = [card("q1"), card("d1", { tier: "deeper", scored: false, kind: "teach" }), card("q2")];
    let run = createRun(cards);
    run = submitAnswer(run, "q1", true);
    run = advance(run);
    assert.deepEqual(run.offer.map((c) => c.id), ["d1"]);
    assert.equal(advance(run), run, "must resolve the offer before advancing");

    const accepted = acceptDeeper(run);
    assert.equal(currentCard(accepted).id, "d1");
    assert.equal(accepted.offer, null);
    assert.equal(currentCard(advance(accepted)).id, "q2");

    const skipped = skipDeeper(run);
    assert.equal(currentCard(skipped).id, "q2");
    assert.equal(summarize(skipped).deeperPlayed, 0);
  });

  it("a deeper card before any core card is dropped", () => {
    const run = createRun([card("d0", { tier: "deeper" }), card("q1")]);
    assert.deepEqual(run.queue.map((c) => c.id), ["q1"]);
  });

  it("progress rises monotonically and ends at 1", () => {
    let run = createRun([teach("t1"), card("q1"), card("q2")]);
    let last = progressOf(run);
    for (const id of ["q1", "q2"]) {
      run = advance(run);
      if (id !== "q1") run = submitAnswer(run, "q1", true);
      assert.ok(progressOf(run) >= last);
      last = progressOf(run);
    }
    assert.equal(progressOf({ ...run, phase: "done" }), 1);
  });

  it("stars follow first-try accuracy", () => {
    assert.equal(starsFor({ accuracy: 0.95 }), 3);
    assert.equal(starsFor({ accuracy: 0.75 }), 2);
    assert.equal(starsFor({ accuracy: 0.2 }), 1);
  });
});

const T0 = Date.UTC(2026, 0, 1);

describe("how each item type is checked", () => {
  it("single taps are graded at once", () => {
    for (const t of ["choice", "true_or_myth", "hotspot"]) assert.equal(checkModeOf(t, {}), "instant");
    assert.equal(checkModeOf("fill", { mode: "bank" }), "instant");
  });
  it("match, order and sort are graded when complete and retried in place", () => {
    for (const t of ["match", "order", "sort"]) assert.equal(checkModeOf(t, {}), "retry");
  });
  it("typed numbers, sliders and predictions keep an explicit button", () => {
    assert.equal(checkModeOf("fill", { mode: "number" }), "manual");
    assert.equal(checkModeOf("estimate", {}), "manual");
    assert.equal(checkModeOf("predict", {}), "manual");
    assert.equal(checkModeOf("something-new", {}), "manual");
  });
});

describe("trying again in place (match, order and sort)", () => {
  it("a right answer after a wrong one lets the learner move on, but the card still comes back at the end", () => {
    let run = createRun([card("q1"), card("q2")]);
    run = submitAnswer(run, "q1", false); // wrong, the card resets and the learner tries again
    run = submitAnswer(run, "q1", true); // right on the retry
    assert.equal(run.records.q1.solved, false, "not solved: a wrong answer came first on this visit");
    assert.equal(run.records.q1.firstTryCorrect, false);
    assert.deepEqual(run.missed, ["q1"]);
    run = advance(run);
    assert.equal(currentCard(run).id, "q2");
    run = submitAnswer(run, "q2", true);
    run = advance(run); // end of the pass
    assert.equal(run.phase, "replay");
    assert.equal(currentCard(run).id, "q1");
  });

  it("in the replay it must be right with no wrong answer first; otherwise it is queued again", () => {
    let run = createRun([card("q1")]);
    run = submitAnswer(run, "q1", false);
    run = submitAnswer(run, "q1", true);
    run = advance(run);
    assert.equal(run.phase, "replay");
    run = submitAnswer(run, "q1", false); // wrong again in the replay
    run = submitAnswer(run, "q1", true); // then right on the retry
    run = advance(run);
    assert.equal(run.phase, "replay", "still not clean, so it comes round again");
    assert.equal(currentCard(run).id, "q1");
    run = submitAnswer(run, "q1", true); // a clean visit at last
    assert.equal(run.records.q1.solved, true);
    assert.deepEqual(run.missed, []);
    run = advance(run);
    assert.equal(run.phase, "done");
  });

  it("several wrong tries on one visit still count as one miss in the summary", () => {
    let run = createRun([card("q1"), card("q2")]);
    run = submitAnswer(run, "q1", false);
    run = submitAnswer(run, "q1", false);
    run = submitAnswer(run, "q1", true);
    run = advance(run);
    run = submitAnswer(run, "q2", true);
    run = advance(run);
    run = submitAnswer(run, "q1", true);
    run = advance(run);
    assert.equal(run.phase, "done");
    const s = summarize(run);
    assert.equal(s.scoredTotal, 2);
    assert.equal(s.firstTryCorrect, 1);
    assert.equal(s.replayed, 1);
    assert.equal(s.accuracy, 0.5);
  });

  it("the wrong flag belongs to one visit: a new card starts clean, and so does stepping back", () => {
    let run = createRun([card("q1"), card("q2")]);
    run = submitAnswer(run, "q1", false);
    assert.equal(run.visitWrong, true);
    run = advance(run);
    assert.equal(run.visitWrong, false);
    run = submitAnswer(run, "q2", true);
    assert.equal(run.records.q2.solved, true, "a clean first try is solved at once");
    run = goBack(run);
    assert.equal(run.visitWrong, false);
  });

  it("unscored cards never count as wrong", () => {
    let run = createRun([card("p1", { scored: false })]);
    run = submitAnswer(run, "p1", false);
    assert.equal(run.visitWrong, false);
    assert.equal(run.records.p1.solved, true);
    assert.deepEqual(run.missed, []);
  });

  it("a run saved before this existed (no flag) behaves as if clean", () => {
    let run = createRun([card("q1")]);
    delete run.visitWrong;
    run = submitAnswer(run, "q1", true);
    assert.equal(run.records.q1.solved, true);
  });
});

describe("stepping back", () => {
  it("cannot go back on the first card, can afterwards, and lowers progress", () => {
    let run = createRun([teach("t1"), card("q1"), card("q2")]);
    assert.equal(canGoBack(run), false);
    run = advance(run);
    assert.equal(canGoBack(run), true);
    const before = progressOf(run);
    run = goBack(run);
    assert.equal(currentCard(run).id, "t1");
    assert.ok(progressOf(run) < before);
    assert.equal(goBack(run), run);
  });

  it("an answered card is a revisit, keeps its first try, and is solved by a corrected answer", () => {
    let run = createRun([card("q1"), card("q2")]);
    run = submitAnswer(run, "q1", false);
    run = advance(run);
    run = goBack(run);
    assert.equal(isRevisit(run, "q1"), true);
    run = submitAnswer(run, "q1", true);
    assert.equal(run.records.q1.firstTryCorrect, false);
    assert.equal(run.records.q1.tries, 2);
    assert.deepEqual(run.missed, []);
  });

  it("backs out of the deeper offer to the same card, and does not re-offer accepted deeper cards", () => {
    let run = createRun([card("q1"), card("d1", { tier: "deeper", scored: false }), card("q2")]);
    run = advance(run);
    assert.ok(run.offer);
    assert.equal(canGoBack(run), true);
    run = goBack(run);
    assert.equal(run.offer, null);
    assert.equal(currentCard(run).id, "q1");
    run = advance(run);
    run = acceptDeeper(run);
    assert.equal(currentCard(run).id, "d1");
    run = goBack(run);
    run = advance(run);
    assert.equal(run.offer, null);
    assert.equal(currentCard(run).id, "d1");
  });

  it("is not available in the mistakes replay", () => {
    let run = createRun([card("q1")]);
    run = submitAnswer(run, "q1", false);
    run = advance(run);
    assert.equal(run.phase, "replay");
    assert.equal(canGoBack(run), false);
  });
});

describe("mastery", () => {
  it("a New objective stays New until its lesson is completed", () => {
    const s = applyAnswer(initialMastery(), { correct: true, surface: "practice", sessionId: "a", now: T0 });
    assert.equal(s.level, 0);
    assert.equal(s.dueAt, null);
    assert.equal(s.correct, 1);
  });

  it("completing the lesson makes it Familiar with a review due in a day", () => {
    const s = markFamiliar(initialMastery(), T0);
    assert.equal(s.level, 1);
    assert.equal(s.dueAt, T0 + DAY_MS);
    assert.equal(isDue(s, T0), false);
    assert.equal(isDue(s, T0 + DAY_MS), true);
    assert.equal(markFamiliar(s, T0 + 5 * DAY_MS), s, "idempotent once Familiar");
  });

  it("lesson answers do not level up; two separate later sessions make it Practised", () => {
    let s = markFamiliar(initialMastery(), T0);
    s = applyAnswer(s, { correct: true, surface: "lesson", sessionId: "l", now: T0 });
    assert.equal(s.level, 1);
    s = applyAnswer(s, { correct: true, surface: "practice", sessionId: "p1", now: T0 + DAY_MS });
    assert.equal(s.level, 1);
    s = applyAnswer(s, { correct: true, surface: "practice", sessionId: "p1", now: T0 + DAY_MS });
    assert.equal(s.level, 1, "same session twice counts once");
    s = applyAnswer(s, { correct: true, surface: "review", sessionId: "r1", now: T0 + 3 * DAY_MS });
    assert.equal(s.level, 2);
    assert.equal(s.practisedAt, T0 + 3 * DAY_MS);
  });

  it("Mastered needs a checkpoint or review at least 7 days after Practised", () => {
    let s = markFamiliar(initialMastery(), T0);
    s = applyAnswer(s, { correct: true, surface: "practice", sessionId: "a", now: T0 });
    s = applyAnswer(s, { correct: true, surface: "practice", sessionId: "b", now: T0 });
    assert.equal(s.level, 2);
    const early = applyAnswer(s, { correct: true, surface: "review", sessionId: "c", now: T0 + 6 * DAY_MS });
    assert.equal(early.level, 2);
    const wrongSurface = applyAnswer(s, { correct: true, surface: "practice", sessionId: "d", now: T0 + 8 * DAY_MS });
    assert.equal(wrongSurface.level, 2);
    const done = applyAnswer(s, { correct: true, surface: "checkpoint", sessionId: "e", now: T0 + 8 * DAY_MS });
    assert.equal(done.level, 3);
  });

  it("a wrong review drops a level (never below Familiar) and resets the box", () => {
    let s = markFamiliar(initialMastery(), T0);
    s = applyAnswer(s, { correct: false, surface: "review", sessionId: "a", now: T0 });
    assert.equal(s.level, 1);
    assert.equal(s.box, 0);
    s = { ...s, level: 3, box: 4, practisedAt: T0 };
    s = applyAnswer(s, { correct: false, surface: "checkpoint", sessionId: "b", now: T0 + DAY_MS });
    assert.equal(s.level, 2);
    assert.equal(s.box, 0);
    assert.equal(s.dueAt, T0 + 2 * DAY_MS);
  });

  it("a wrong answer in a game or practice resets the box without dropping the level", () => {
    let s = { ...markFamiliar(initialMastery(), T0), level: 2, box: 3, practisedAt: T0 };
    s = applyAnswer(s, { correct: false, surface: "game", sessionId: "g", now: T0 + DAY_MS });
    assert.equal(s.level, 2);
    assert.equal(s.box, 0);
  });

  it("correct reviews walk the box schedule 1, 3, 7, 16, 35 and stop at the last", () => {
    let s = markFamiliar(initialMastery(), T0);
    let now = T0;
    const seen = [];
    for (let i = 0; i < 7; i++) {
      now += 1;
      s = applyAnswer(s, { correct: true, surface: "review", sessionId: `r${i}`, now });
      seen.push(Math.round((s.dueAt - now) / DAY_MS));
    }
    assert.deepEqual(seen.slice(0, 5), [3, 7, 16, 35, 35]);
    assert.equal(seen[6], BOX_DAYS[BOX_DAYS.length - 1]);
  });

  it("does not mutate its input", () => {
    const s = markFamiliar(initialMastery(), T0);
    const frozen = JSON.stringify(s);
    applyAnswer(s, { correct: true, surface: "review", sessionId: "x", now: T0 + 2 * DAY_MS });
    assert.equal(JSON.stringify(s), frozen);
  });

  it("selectDue returns only due objectives, weakest and most overdue first, capped", () => {
    const fam = (dueAt, level = 1) => ({ ...markFamiliar(initialMastery(), T0), level, dueAt });
    const now = T0 + 10 * DAY_MS;
    const states = {
      notDue: fam(now + DAY_MS),
      newOne: initialMastery(),
      strongOld: fam(now - 5 * DAY_MS, 2),
      weakRecent: fam(now - 1 * DAY_MS, 1),
      weakOld: fam(now - 4 * DAY_MS, 1),
    };
    assert.deepEqual(selectDue(states, now, 10), ["weakOld", "weakRecent", "strongOld"]);
    assert.deepEqual(selectDue(states, now, 2), ["weakOld", "weakRecent"]);
  });
});


describe("path state", () => {
  const units = [
    { id: "u1", position: 1 },
    { id: "u2", position: 2 },
  ];
  const nodes = [
    { id: "a", unitId: "u1", position: 0, kind: "lesson" },
    { id: "b", unitId: "u1", position: 1, kind: "practice" },
    { id: "c", unitId: "u1", position: 2, kind: "checkpoint" },
    { id: "d", unitId: "u2", position: 0, kind: "lesson" },
    { id: "e", unitId: "u2", position: 1, kind: "checkpoint" },
  ];
  const run = (done = [], out = []) => computePathState(units, nodes, new Set(done), new Set(out));

  it("starts with the first node current and the rest locked", () => {
    const s = run();
    assert.deepEqual(s.nodes, { a: "current", b: "locked", c: "locked", d: "locked", e: "locked" });
    assert.equal(s.currentNodeId, "a");
    assert.equal(s.units.u1.unlocked, true);
    assert.equal(s.units.u2.unlocked, false);
  });

  it("advances one node at a time", () => {
    const s = run(["a"]);
    assert.deepEqual([s.nodes.a, s.nodes.b, s.nodes.c], ["completed", "current", "locked"]);
  });

  it("opens the next unit when the checkpoint is done", () => {
    const s = run(["a", "b", "c"]);
    assert.equal(s.units.u1.completed, true);
    assert.equal(s.units.u2.unlocked, true);
    assert.equal(s.nodes.d, "current");
    assert.equal(s.currentNodeId, "d");
  });

  it("does not open the next unit from lessons alone", () => {
    const s = run(["a", "b"]);
    assert.equal(s.units.u2.unlocked, false);
    assert.equal(s.nodes.d, "locked");
  });

  it("testing out completes the unit, opens the next and leaves the rest replayable", () => {
    const s = run([], ["u1"]);
    assert.equal(s.units.u1.completed, true);
    assert.equal(s.units.u1.testedOut, true);
    assert.deepEqual([s.nodes.a, s.nodes.b, s.nodes.c], ["available", "available", "available"]);
    assert.equal(s.nodes.d, "current");
  });

  it("lets a locked unit be tested out, which opens the one after it", () => {
    const three = [...units, { id: "u3", position: 3 }];
    const more = [...nodes, { id: "f", unitId: "u3", position: 0, kind: "lesson" }, { id: "g", unitId: "u3", position: 1, kind: "checkpoint" }];
    const s = computePathState(three, more, new Set(), new Set(["u2"]));
    assert.equal(s.units.u2.unlocked, true, "tested-out unit is open");
    assert.equal(s.units.u2.completed, true);
    assert.equal(s.units.u1.completed, false, "unit 1 is still to do");
    assert.equal(s.nodes.a, "current");
    assert.equal(s.units.u3.unlocked, true, "the unit after a tested-out unit opens");
    assert.equal(s.nodes.f, "current", "the opened unit has its own next node");
    assert.equal(s.currentNodeId, "a", "the earliest open node stays the main one");
  });

  it("has no current node when everything is complete", () => {
    const s = run(["a", "b", "c", "d", "e"]);
    assert.equal(s.currentNodeId, null);
    assert.equal(s.units.u2.completed, true);
  });

  it("keeps a locked unit locked even if its nodes were somehow completed", () => {
    const s = run(["d", "e"]);
    assert.equal(s.nodes.d, "locked");
  });

  it("counts completed lessons in open units only", () => {
    const s = run(["a", "b"]);
    assert.equal(countCompletedLessons(nodes, s), 1);
    const locked = run(["d"]);
    assert.equal(countCompletedLessons(nodes, locked), 0);
  });
});


describe("elements", () => {
  it("knows the stable and unstable isotopes the lessons use", () => {
    assert.equal(isStableNucleus(6, 6), true, "carbon-12");
    assert.equal(isStableNucleus(6, 7), true, "carbon-13");
    assert.equal(isStableNucleus(6, 8), false, "carbon-14");
    assert.equal(isStableNucleus(1, 0), true, "hydrogen-1");
    assert.equal(isStableNucleus(1, 2), false, "tritium");
    assert.equal(isStableNucleus(8, 8), true, "oxygen-16");
    assert.equal(isStableNucleus(19, 21), false, "potassium-40");
    assert.equal(isStableNucleus(0, 1), false, "no protons");
    assert.equal(isStableNucleus(92, 146), false, "outside the table");
  });

  it("covers elements 1-20 once each with a common count that is stable", () => {
    assert.deepEqual(ELEMENTS.map((e) => e.z), Array.from({ length: 20 }, (_, i) => i + 1));
    for (const e of ELEMENTS) assert.ok(e.stableNeutrons.includes(e.common), `${e.symbol} common is stable`);
  });

  it("describes an atom", () => {
    const d = describeAtom(6, 8, 6);
    assert.equal(d.isotopeName, "Carbon-14");
    assert.equal(d.massNumber, 14);
    assert.equal(d.charge, 0);
    assert.equal(d.stable, false);
    assert.equal(describeAtom(8, 8, 10).charge, -2);
    assert.equal(describeAtom(0, 3, 0).element, undefined);
  });

  it("checks every key of an atom-builder goal", () => {
    const he = { protons: 2, neutrons: 2, electrons: 2 };
    assert.equal(atomGoalMet({ protons: 2, neutrons: 2, electrons: 2 }, he), true);
    assert.equal(atomGoalMet({ protons: 2, neutrons: 2, electrons: 2 }, { ...he, electrons: 1 }), false);
    assert.equal(atomGoalMet({ neutrons: 8 }, { protons: 6, neutrons: 8, electrons: 6 }), true);
    assert.equal(atomGoalMet({ stable: true }, { protons: 6, neutrons: 8, electrons: 6 }), false);
    assert.equal(atomGoalMet({ stable: true }, { protons: 6, neutrons: 6, electrons: 6 }), true);
    assert.equal(atomGoalMet({ elementSymbol: "O" }, { protons: 8, neutrons: 0, electrons: 0 }), true);
    assert.equal(atomGoalMet({}, he), false, "an empty goal is never met");
  });

  it("shows only the counters a goal is about", () => {
    assert.deepEqual(builderRows({ neutrons: 8 }, { protons: true, electrons: true }), ["neutrons"]);
    assert.deepEqual(builderRows({ protons: 2, neutrons: 2, electrons: 2 }), ["protons", "neutrons", "electrons"]);
    assert.deepEqual(builderRows({ elementSymbol: "O" }), ["protons", "neutrons"]);
    assert.deepEqual(builderRows({ stable: true }, { protons: true, electrons: true }), ["neutrons"]);
    assert.deepEqual(builderRows({ stable: true }, { protons: true, neutrons: true }), ["protons", "neutrons"], "never an empty list");
  });

  it("turns a goal into a checklist that follows the atom", () => {
    const goal = { protons: 2, neutrons: 2, electrons: 2 };
    const at = (protons, neutrons, electrons) => goalChecklist(goal, { protons, neutrons, electrons });
    assert.deepEqual(at(2, 1, 0).map((p) => [p.label, p.met]), [["2 protons", true], ["2 neutrons", false], ["2 electrons", false]]);
    assert.ok(at(2, 2, 2).every((p) => p.met));
    assert.equal(goalChecklist({ protons: 1 }, { protons: 1, neutrons: 0, electrons: 0 })[0].label, "1 proton");
    assert.deepEqual(goalChecklist({ elementSymbol: "O" }, { protons: 8, neutrons: 8, electrons: 8 }).map((p) => [p.label, p.met]), [["Make oxygen", true]]);
    assert.deepEqual(goalChecklist({ stable: true }, { protons: 6, neutrons: 8, electrons: 6 }).map((p) => [p.label, p.met]), [["A stable nucleus", false]]);
    // The checklist agrees with the goal check.
    for (const n of [5, 6, 7, 8]) {
      const atom = { protons: 6, neutrons: n, electrons: 6 };
      assert.equal(goalChecklist({ stable: true }, atom).every((p) => p.met), atomGoalMet({ stable: true }, atom));
    }
  });

  it("fills shells", () => {
    assert.deepEqual(shellFilling(2), [2]);
    assert.deepEqual(shellFilling(6), [2, 4]);
    assert.deepEqual(shellFilling(11), [2, 8, 1]);
    assert.deepEqual(shellFilling(0), []);
  });
});

describe("term markers", () => {
  it("splits text around markers", () => {
    assert.deepEqual(splitTerms("About [[atom|atoms]] here."), [
      { text: "About " },
      { text: "atoms", termId: "atom" },
      { text: " here." },
    ]);
    assert.deepEqual(splitTerms("No markers."), [{ text: "No markers." }]);
    assert.deepEqual(splitTerms("[[a|x]][[b|y]]"), [{ text: "x", termId: "a" }, { text: "y", termId: "b" }]);
  });
  it("resolves speakable text", () => {
    assert.equal(plainText("The [[atomic-number|atomic number]] decides."), "The atomic number decides.");
  });
});

describe("estimate slider", () => {
  const log = { min: 10, max: 10000000, scale: "log" };
  it("maps the ends and the middle", () => {
    assert.equal(valueFromFraction(0, log), 10);
    assert.equal(valueFromFraction(1, log), 10000000);
    assert.equal(valueFromFraction(0.5, { min: 0, max: 100, step: 5 }), 50);
  });
  it("is symmetric and spreads log values by decade", () => {
    for (const v of [10, 100, 1000, 100000, 10000000]) {
      assert.ok(Math.abs(valueFromFraction(fractionFromValue(v, log), log) - v) / v < 0.02, `round trip ${v}`);
    }
    assert.ok(Math.abs(fractionFromValue(1000, log) - 1 / 3) < 1e-9);
  });
  it("clamps out-of-range input", () => {
    assert.equal(valueFromFraction(2, { min: 0, max: 10 }), 10);
    assert.equal(fractionFromValue(-5, { min: 0, max: 10 }), 0);
  });
  it("formats big numbers", () => {
    assert.equal(formatEstimate(400000, "atoms"), "400,000 atoms");
    assert.equal(formatEstimate(2500000), "2.5 million");
    assert.equal(formatEstimate(1200000000, "m"), "1.2 billion m");
    assert.equal(formatEstimate(42), "42");
  });
});


describe("session picking", () => {
  const mk = (objective, n, difficulty = 1) => Array.from({ length: n }, (_, i) => ({ id: `${objective}-${i}`, objectiveId: objective, difficulty: i % 3 === 0 ? difficulty + 1 : difficulty }));
  const pool = [...mk("a", 5), ...mk("b", 5), ...mk("c", 5), ...mk("d", 2)];

  it("returns the requested count of distinct items", () => {
    const out = pickItems(pool, { count: 8, seed: "s" });
    assert.equal(out.length, 8);
    assert.equal(new Set(out.map((i) => i.id)).size, 8);
  });

  it("is deterministic for a seed and varies with another", () => {
    const a = pickItems(pool, { count: 8, seed: "s" }).map((i) => i.id).join();
    assert.equal(a, pickItems(pool, { count: 8, seed: "s" }).map((i) => i.id).join());
    assert.notEqual(a, pickItems(pool, { count: 8, seed: "other" }).map((i) => i.id).join());
  });

  it("covers every required objective", () => {
    for (const seed of ["1", "2", "3", "4"]) {
      const out = pickItems(pool, { count: 5, seed, coverObjectives: ["a", "b", "c", "d"] });
      for (const o of ["a", "b", "c", "d"]) assert.ok(out.some((i) => i.objectiveId === o), `seed ${seed} covers ${o}`);
    }
  });

  it("does not let one objective dominate", () => {
    const out = pickItems(pool, { count: 8, seed: "s" });
    for (const o of ["a", "b", "c"]) assert.ok(out.filter((i) => i.objectiveId === o).length <= 3);
  });

  it("orders easy to hard", () => {
    const out = pickItems(pool, { count: 10, seed: "s" });
    for (let i = 1; i < out.length; i++) assert.ok(out[i].difficulty >= out[i - 1].difficulty);
  });

  it("takes a share from earlier units", () => {
    const earlier = mk("old1", 3).concat(mk("old2", 3));
    const out = pickItems(pool, { count: 8, seed: "s", earlierPool: earlier, earlierShare: 0.25 });
    assert.equal(out.length, 8);
    assert.equal(out.filter((i) => i.objectiveId.startsWith("old")).length, 2);
  });

  it("returns fewer when the pool is small", () => {
    assert.equal(pickItems(mk("a", 3), { count: 10, seed: "s" }).length, 3);
    assert.deepEqual(pickItems([], { count: 5, seed: "s" }), []);
  });

  it("builds a review from due objectives, most urgent first, capped", () => {
    const out = pickReviewItems(["c", "a"], pool, { count: 3, perObjective: 2, seed: "s" });
    assert.equal(out.length, 3);
    assert.equal(out[0].objectiveId, "c");
    assert.equal(out[1].objectiveId, "c");
    assert.equal(out[2].objectiveId, "a");
    assert.deepEqual(pickReviewItems([], pool, { count: 5, seed: "s" }), []);
  });
});
