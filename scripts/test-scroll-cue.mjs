/**
 * The "more below" cue on lesson pages (components/lesson/scroll-cue-core.ts): it shows only when
 * the page runs past the screen and the learner is not at the end, and a tap scrolls a bit less
 * than a screen.
 *
 * Run: npm run test:scroll-cue
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { SCROLL_CUE, hiddenBelow, moreBelow, scrollTarget } = loadTs("components/lesson/scroll-cue-core.ts");

const m = (contentHeight, viewHeight, offsetY = 0) => ({ contentHeight, viewHeight, offsetY });

test("a page that fits has no cue", () => {
  assert.equal(moreBelow(m(500, 700)), false);
  assert.equal(moreBelow(m(700, 700)), false);
});

test("a few pixels of overflow are not worth a cue", () => {
  assert.equal(moreBelow(m(710, 700)), false);
  assert.equal(moreBelow(m(700 + SCROLL_CUE.endThreshold, 700)), false);
  assert.equal(moreBelow(m(700 + SCROLL_CUE.endThreshold + 1, 700)), true);
});

test("a page that runs past the screen shows the cue at the top", () => {
  assert.equal(moreBelow(m(1400, 700)), true);
});

test("the cue goes away near the end and comes back if the page grows", () => {
  assert.equal(moreBelow(m(1400, 700, 300)), true);
  assert.equal(moreBelow(m(1400, 700, 700)), false, "at the very end");
  assert.equal(moreBelow(m(1400, 700, 700 - SCROLL_CUE.endThreshold + 1)), false, "within the threshold of the end");
  assert.equal(moreBelow(m(1900, 700, 700)), true, "the page grew while it was at the end");
});

test("nothing shows before the view is measured, and bad numbers do not break it", () => {
  assert.equal(moreBelow(m(1400, 0)), false);
  assert.equal(moreBelow(m(0, 700)), false);
  assert.equal(moreBelow(m(1400, 700, -50)), true, "an overscroll at the top still counts as the top");
  assert.equal(hiddenBelow(m(500, 700, 40)), 0);
});

test("a tap scrolls about four fifths of a screen and stops at the end", () => {
  assert.equal(scrollTarget(m(3000, 700, 0)), Math.round(700 * SCROLL_CUE.stepFraction));
  assert.equal(scrollTarget(m(3000, 700, 100)), 100 + 700 * SCROLL_CUE.stepFraction);
  assert.equal(scrollTarget(m(1000, 700, 200)), 300, "never past the end");
  assert.equal(scrollTarget(m(500, 700, 0)), 0, "a page that fits does not move");
});

test("the cue fades quickly and the bob is small", () => {
  assert.ok(SCROLL_CUE.fadeMs < 300);
  assert.ok(SCROLL_CUE.bob <= 6);
});
