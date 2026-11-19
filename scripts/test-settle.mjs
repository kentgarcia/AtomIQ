/**
 * The quiet page entrance (components/motion/settle-core.ts) that replaces springify(): it is short,
 * has no spring, staggers by 60 ms and never makes a long page wait.
 *
 * Run: npm run test:settle
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { SETTLE, settleDelay } = loadTs("components/motion/settle-core.ts");

test("an entrance is a tier A move: under 300 ms, a small rise", () => {
  assert.ok(SETTLE.ms < 300);
  assert.ok(SETTLE.rise > 0 && SETTLE.rise <= 16);
});

test("blocks arrive 60 ms apart and a long page is capped", () => {
  assert.equal(settleDelay(0), 0);
  assert.equal(settleDelay(1), 60);
  assert.equal(settleDelay(3), 180);
  assert.equal(settleDelay(8), SETTLE.maxStaggered * SETTLE.step);
  assert.equal(settleDelay(40), settleDelay(8));
  assert.ok(settleDelay(40) + SETTLE.ms <= 700, "the last block is in before the eye has moved on");
  assert.equal(settleDelay(-2), 0);
  assert.equal(settleDelay(2.7), 120);
});
