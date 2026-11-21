/**
 * The lecture flow (components/lesson/lecture-core.ts, typewriter-core.ts): the steps of a teaching
 * card with its figure placed, how long Continue stays hidden, which cards share a page, and the
 * typewriter that cuts text without breaking glossary terms.
 *
 * Run: npm run test:lecture
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { lectureSteps, continueDelay, CONTINUE_DELAY, pageStart, MAX_BUBBLES } = loadTs("components/lesson/lecture-core.ts");
const { TYPE_CPS, TYPE_STEP, clipSegments, stepped, totalChars, typeDuration, visibleCount } = loadTs("components/lesson/typewriter-core.ts");
const { splitTerms } = loadTs("content/curriculum/terms.ts");

const BODY = "One thing. Two things. Three things. Four things.";
const kinds = (steps) => steps.map((s) => (s.kind === "figure" ? "F" : "b")).join("");

test("a card is a few bubbles, at most three", () => {
  const steps = lectureSteps(BODY, false);
  assert.ok(steps.length <= MAX_BUBBLES);
  assert.ok(steps.every((s) => s.kind === "bubble" && s.text.length > 0));
  assert.equal(lectureSteps("Just one sentence.", false).length, 1);
});

test("the figure comes after the number of bubbles the card asks for", () => {
  assert.equal(kinds(lectureSteps(BODY, true, 0)), "Fbbb");
  assert.equal(kinds(lectureSteps(BODY, true, 1)), "bFbb");
  assert.equal(kinds(lectureSteps(BODY, true, 2)), "bbFb");
  assert.equal(kinds(lectureSteps(BODY, true, 3)), "bbbF");
});

test("left out, the figure comes after the first bubble; out of range is clamped", () => {
  assert.equal(kinds(lectureSteps(BODY, true)), "bFbb");
  assert.equal(kinds(lectureSteps(BODY, true, 9)), "bbbF");
  assert.equal(kinds(lectureSteps(BODY, true, -4)), "Fbbb");
  assert.equal(kinds(lectureSteps(BODY, true, Number.NaN)), "bFbb");
  assert.equal(kinds(lectureSteps(BODY, true, 1.4)), "bFbb");
});

test("a card without a figure has none, and a one-bubble card can end on its figure", () => {
  assert.ok(!lectureSteps(BODY, false, 1).some((s) => s.kind === "figure"));
  assert.equal(kinds(lectureSteps("Only one.", true, 1)), "bF");
  assert.equal(kinds(lectureSteps("Only one.", true)), "bF");
});

test("the bubbles read in the card's own order, whole", () => {
  const text = lectureSteps(BODY, true, 2).filter((s) => s.kind === "bubble").map((s) => s.text).join(" ");
  assert.equal(text, "One thing. Two things. Three things. Four things.");
});

test("Continue stays hidden 1 to 1.5 seconds after a bubble, a shorter moment after a figure", () => {
  // no typewriter in a lesson: only a short beat, and a figure is given a little longer to be seen
  assert.ok(CONTINUE_DELAY.bubble > 0 && CONTINUE_DELAY.bubble <= 600);
  assert.ok(CONTINUE_DELAY.figure >= CONTINUE_DELAY.bubble && CONTINUE_DELAY.figure <= 1000);
  assert.equal(continueDelay({ kind: "bubble", text: "x" }), CONTINUE_DELAY.bubble);
  assert.equal(continueDelay({ kind: "figure" }), CONTINUE_DELAY.figure);
  assert.equal(continueDelay(undefined), 0);
});

const T = (id) => ({ id, kind: "teach" });
const I = (id, connected = false) => ({ id, kind: "item", connected });
const S = (id) => ({ id, kind: "sim" });

test("consecutive teaching cards share one page; the page starts at the first", () => {
  const q = [I("p"), T("a"), T("b"), T("c"), I("q")];
  assert.equal(pageStart(q, 1), 1);
  assert.equal(pageStart(q, 2), 1);
  assert.equal(pageStart(q, 3), 1);
});

test("a plain activity, a simulation or an unconnected item is its own page", () => {
  const q = [T("a"), I("q"), S("s"), T("b"), I("r", false)];
  assert.equal(pageStart(q, 1), 1);
  assert.equal(pageStart(q, 2), 2);
  assert.equal(pageStart(q, 4), 4);
});

test("a connected activity joins the lecture just before it", () => {
  const q = [I("p"), T("a"), T("b"), I("q", true), T("c")];
  assert.equal(pageStart(q, 3), 1);
  assert.equal(pageStart(q, 4), 4, "the lecture after an activity starts a new page");
});

test("a connected activity with no lecture before it stands alone", () => {
  assert.equal(pageStart([I("p"), I("q", true)], 1), 1);
  assert.equal(pageStart([I("q", true)], 0), 0);
  assert.equal(pageStart([S("s"), I("q", true)], 1), 1);
});

test("a break (the go-deeper offer) cuts the page, and the replay never joins pages", () => {
  const q = [T("a"), T("b"), T("c")];
  assert.equal(pageStart(q, 2, 2), 2);
  assert.equal(pageStart(q, 2, 1), 1);
  assert.equal(pageStart([T("a"), I("q", true)], 1, 1), 1, "the lecture is behind the break");
  assert.equal(pageStart([T("a"), I("q", true)], 1, 0, true), 1);
  assert.equal(pageStart(q, 2, 0, true), 2);
});

test("an index outside the queue is its own page", () => {
  assert.equal(pageStart([T("a")], 5), 5);
});

// -- typewriter ---------------------------------------------------------------------------------

test("the typewriter shows nothing at first, then more, and never more than the text", () => {
  assert.equal(visibleCount(0, 100), 0);
  assert.equal(visibleCount(-5, 100), 0);
  let last = 0;
  for (let t = 0; t <= 6000; t += 50) {
    const n = visibleCount(t, 100);
    assert.ok(n >= last && n <= 100);
    last = n;
  }
  assert.equal(visibleCount(60000, 100), 100);
  assert.equal(visibleCount(1000, 1000), TYPE_CPS);
});

test("typing a whole bubble takes a few seconds, and the duration matches the speed", () => {
  const ms = typeDuration(100);
  assert.ok(ms > 1500 && ms < 4000, `${ms} ms for 100 characters`);
  assert.equal(visibleCount(ms, 100), 100);
});

test("cutting text keeps glossary terms whole and puts the cut in the right place", () => {
  const segments = splitTerms("An [[atom|atom]] is small.");
  assert.equal(totalChars(segments), "An atom is small.".length);
  const mid = clipSegments(segments, 5); // "An at"
  assert.deepEqual(mid.map((s) => [s.shown, s.hidden]), [["An ", ""], ["at", "om"], ["", " is small."]]);
  assert.equal(mid[1].termId, "atom");
  for (const s of mid) assert.equal(s.shown + s.hidden, s.text);
});

test("cutting at zero hides everything and at the end shows everything", () => {
  const segments = splitTerms("Hello [[atom|world]]!");
  const none = clipSegments(segments, 0);
  assert.ok(none.every((s) => s.shown === ""));
  const all = clipSegments(segments, 999);
  assert.ok(all.every((s) => s.hidden === "" && s.shown === s.text));
  assert.equal(all.map((s) => s.shown).join(""), "Hello world!");
  assert.ok(clipSegments(segments, -3).every((s) => s.shown === ""));
});

test("typing moves in whole steps and always reaches the end", () => {
  assert.equal(TYPE_STEP, 3);
  assert.equal(stepped(0, 100), 0);
  assert.equal(stepped(2, 100), 0);
  assert.equal(stepped(3, 100), 3);
  assert.equal(stepped(8, 100), 6);
  assert.equal(stepped(100, 100), 100, "the last characters are never held back");
  assert.equal(stepped(99, 100), 99);
  assert.equal(stepped(10, 10), 10, "a text shorter than a step still finishes");
  assert.equal(stepped(-4, 10), 0);
  // a whole typing run is at most total / step + 1 distinct counts: the commits the bubble costs
  const seen = new Set();
  for (let t = 0; t <= typeDuration(90) + 100; t += 5) seen.add(stepped(visibleCount(t, 90), 90));
  assert.ok(seen.size <= 90 / TYPE_STEP + 1, `${seen.size} counts for 90 characters`);
});
