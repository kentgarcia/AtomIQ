/**
 * The stamp on the finish screen (components/lesson/stamp-core.ts): waits invisible, drops from big
 * and tilted, squashes on contact, settles to the plain element; and the stamps come in order and
 * are all down before the first stat appears.
 *
 * Run: npm run test:stamp
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { STAMP, STAMP_TOTAL, STAMP_LANDS, FINISH_STAMPS, stampFrame } = loadTs("components/lesson/stamp-core.ts");
const { STATS_START } = loadTs("components/lesson/stat-reveal-core.ts");

const times = (step = 5) => Array.from({ length: Math.ceil(STAMP_TOTAL / step) + 1 }, (_, i) => i * step);

test("waiting for its turn it is invisible, big and tilted", () => {
  const f = stampFrame(0);
  assert.equal(f.opacity, 0);
  assert.equal(f.scale, STAMP.fromScale);
  assert.equal(f.rotate, STAMP.fromTilt);
  assert.equal(stampFrame(-100).opacity, 0);
});

test("the last frame is the plain element, so reduced motion can show it", () => {
  const f = stampFrame(STAMP_TOTAL);
  assert.equal(f.opacity, 1);
  assert.equal(f.scale, 1);
  assert.equal(f.rotate, 0);
  assert.deepEqual(stampFrame(STAMP_TOTAL + 500), f);
});

test("it only gets smaller while it falls, and is fully opaque before it lands", () => {
  let last = Infinity;
  for (let t = 0; t <= STAMP_LANDS; t += 5) {
    const s = stampFrame(t).scale;
    assert.ok(s <= last + 1e-9, `grew while falling at ${t}`);
    last = s;
  }
  assert.equal(stampFrame(STAMP_LANDS).scale, 1);
  assert.equal(stampFrame(STAMP_LANDS).opacity, 1);
});

test("it accelerates into the page: the second half of the fall covers more than the first", () => {
  const half = STAMP_LANDS / 2;
  const first = stampFrame(0).scale - stampFrame(half).scale;
  const second = stampFrame(half).scale - stampFrame(STAMP_LANDS).scale;
  assert.ok(second > first);
});

test("it squashes a little on contact, never below the squash, then settles back up", () => {
  const min = Math.min(...times().map((t) => stampFrame(t).scale));
  assert.ok(Math.abs(min - STAMP.squash) < 1e-6);
  let last = STAMP.squash;
  for (let t = STAMP.squashEnd; t <= STAMP_TOTAL; t += 5) {
    const s = stampFrame(t).scale;
    assert.ok(s >= last - 1e-9 && s <= 1 + 1e-9, `settle went the wrong way at ${t}`);
    last = s;
  }
});

test("it straightens as it falls and stays straight; the tilt flips with the sign", () => {
  for (let t = STAMP_LANDS; t <= STAMP_TOTAL; t += 10) assert.equal(stampFrame(t).rotate, 0);
  assert.equal(stampFrame(0, -1).rotate, -STAMP.fromTilt);
  assert.ok(Math.abs(stampFrame(60, 1).rotate) < Math.abs(STAMP.fromTilt));
});

test("title, then the line, then the stars one by one, each after the last has begun", () => {
  assert.ok(FINISH_STAMPS.title < FINISH_STAMPS.message);
  assert.ok(FINISH_STAMPS.message < FINISH_STAMPS.stars);
  assert.ok(FINISH_STAMPS.starStep > 0);
});

test("the stats play together with the stamps: the first starts after the title lands and before the stars are done", () => {
  const lastStar = FINISH_STAMPS.stars + 2 * FINISH_STAMPS.starStep;
  assert.ok(STATS_START >= FINISH_STAMPS.title + STAMP_LANDS, "the first stat waits for the title to land");
  assert.ok(STATS_START < lastStar, "and starts while the stars are still coming");
});
