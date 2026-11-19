/**
 * Two small feedback effects: the band of light that waits on a main button
 * (components/motion/shine-core.ts) and the icons that float up out of a chosen reaction
 * (components/motion/float-up-core.ts).
 *
 * Run: npm run test:feedback-fx
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { SHINE, shineFrame } = loadTs("components/motion/shine-core.ts");
const { FLOAT, FLOAT_TOTAL, floatFrame } = loadTs("components/motion/float-up-core.ts");

const FRAME = 1000 / 60;
const frames = (to) => Array.from({ length: Math.floor(to / FRAME) + 1 }, (_, i) => i * FRAME);

test("the shine starts and ends fully off the face and shows nothing at rest", () => {
  for (const t of [0, SHINE.sweepMs, SHINE.sweepMs + 1, 2000, SHINE.periodMs - 1, -10]) assert.equal(shineFrame(t).opacity, 0, `t=${t}`);
  assert.ok(shineFrame(1).left < 0 && shineFrame(1).left + SHINE.bandWidth < 0.02, "starts left of the face");
  const end = shineFrame(SHINE.sweepMs - 1);
  assert.ok(end.left > 1 - 0.02, "ends right of the face");
});

test("the band only moves right during a sweep, slow at the ends and fast in the middle", () => {
  let last = -Infinity;
  for (const t of frames(SHINE.sweepMs - 1).filter((x) => x > 0)) {
    const f = shineFrame(t);
    assert.equal(f.opacity, 1);
    assert.ok(f.left >= last - 1e-9);
    last = f.left;
  }
  const speed = (t) => shineFrame(t + 10).left - shineFrame(t).left;
  assert.ok(speed(SHINE.sweepMs / 2 - 5) > speed(40) * 2, "faster in the middle than at the start");
  assert.ok(speed(SHINE.sweepMs / 2 - 5) > speed(SHINE.sweepMs - 60) * 2, "and than at the end");
});

test("the loop is long enough to be a quiet idle, and starts after a look at the button", () => {
  assert.ok(SHINE.periodMs >= 4000 && SHINE.periodMs > SHINE.sweepMs * 4);
  assert.ok(SHINE.firstDelay >= 1500);
});

test("float: nothing shows before it starts or after it ends", () => {
  for (let i = 0; i < FLOAT.count; i++) {
    for (const t of [-20, 0, FLOAT_TOTAL, FLOAT_TOTAL + 300]) assert.equal(floatFrame(i, t).opacity, 0, `icon ${i} at ${t}`);
  }
});

test("float: each icon rises, only up, by the rise, and is gone before the end of its life", () => {
  for (let i = 0; i < FLOAT.count; i++) {
    let last = 0;
    for (const t of frames(FLOAT_TOTAL - 1)) {
      const f = floatFrame(i, t);
      if (f.opacity === 0) continue;
      assert.ok(f.y <= last + 1e-9, `icon ${i} sank at ${t}`);
      assert.ok(f.y >= -FLOAT.rise - 1e-9);
      last = f.y;
    }
    assert.ok(last < -FLOAT.rise * 0.8, `icon ${i} rose most of the way`);
    assert.ok(floatFrame(i, i * FLOAT.step + FLOAT.life - 8).opacity < 0.2, "nearly gone at the end");
  }
});

test("float: the icons come one after another, in their own sideways spots, and never from scale 0", () => {
  const xs = Array.from({ length: FLOAT.count }, (_, i) => floatFrame(i, i * FLOAT.step + 200).x);
  assert.equal(new Set(xs.map((x) => x.toFixed(1))).size, FLOAT.count);
  assert.ok(xs[0] < xs[FLOAT.count - 1], "spread left to right");
  assert.ok(floatFrame(0, 5).opacity < floatFrame(0, 60).opacity);
  assert.ok(floatFrame(1, FLOAT.step + 5).opacity > 0 && floatFrame(1, FLOAT.step - 5).opacity === 0);
  for (let i = 0; i < FLOAT.count; i++) for (const t of frames(FLOAT_TOTAL)) assert.ok(floatFrame(i, t).scale >= 0.48);
  assert.deepEqual(floatFrame(1, 200), floatFrame(1, 200));
});

test("float: it is about half a second", () => {
  assert.ok(FLOAT_TOTAL >= 400 && FLOAT_TOTAL <= 600);
});
