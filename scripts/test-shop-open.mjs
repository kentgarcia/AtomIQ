import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const core = await import(pathToFileURL(path.resolve("components/shop/shop-open-core.ts")).href);
const { SHOP_OPEN, SIGN_DROP, shopOpenFrame } = core;

test("before it starts the shutter is down and the sign is not there yet", () => {
  const f = shopOpenFrame(0);
  assert.equal(f.rise, 0);
  assert.equal(f.signOpacity, 0);
  assert.equal(f.closed, 1);
  assert.equal(f.open, 0);
  assert.deepEqual(shopOpenFrame(-20), f);
});

test("after the end the shutter is gone and only OPEN is left", () => {
  const f = shopOpenFrame(SHOP_OPEN.total);
  assert.equal(f.rise, 1);
  assert.equal(f.open, 1);
  assert.equal(f.closed, 0);
  assert.deepEqual(shopOpenFrame(SHOP_OPEN.total + 800), f);
});

test("the beats are in order", () => {
  const o = [0, SHOP_OPEN.dropEnd, SHOP_OPEN.holdAt, SHOP_OPEN.flipAt, SHOP_OPEN.flipMid, SHOP_OPEN.flipEnd, SHOP_OPEN.riseAt, SHOP_OPEN.total];
  for (let i = 1; i < o.length; i++) assert.ok(o[i] >= o[i - 1], `beat ${i}`);
  // the run after the stall starts with the flip
  assert.equal(SHOP_OPEN.flipAt, SHOP_OPEN.holdAt);
});

test("the sign drops in from above and the stall is still", () => {
  assert.ok(shopOpenFrame(1).signY < -SIGN_DROP + 5);
  assert.ok(Math.abs(shopOpenFrame(SHOP_OPEN.dropEnd).signY) < 1e-9);
  const h = shopOpenFrame(SHOP_OPEN.holdAt);
  assert.ok(Math.abs(h.signRotate) < 1e-9, "the sign still swings at the hold");
  assert.equal(h.signY, 0);
  assert.equal(h.signOpacity, 1);
  assert.equal(h.signScaleX, 1);
  assert.equal(h.rise, 0);
  assert.equal(h.closed, 1);
});

test("the sign swings both ways while it settles", () => {
  let min = 0, max = 0;
  for (let t = 0; t <= SHOP_OPEN.holdAt; t += 5) {
    const r = shopOpenFrame(t).signRotate;
    min = Math.min(min, r);
    max = Math.max(max, r);
  }
  assert.ok(max > 3 && min < -3, `swing ${min}..${max}`);
});

test("the flip goes edge-on, swaps the word at the middle and comes back", () => {
  assert.ok(shopOpenFrame(SHOP_OPEN.flipMid).signScaleX < 0.05);
  assert.equal(shopOpenFrame(SHOP_OPEN.flipMid - 1).closed, 1);
  assert.equal(shopOpenFrame(SHOP_OPEN.flipMid + 1).open, 1);
  assert.equal(shopOpenFrame(SHOP_OPEN.flipMid + 1).closed, 0);
  assert.equal(shopOpenFrame(SHOP_OPEN.flipEnd).signScaleX, 1);
  // never both words, never neither
  for (let t = 0; t <= SHOP_OPEN.total; t += 5) {
    const f = shopOpenFrame(t);
    assert.equal(f.closed + f.open, 1, `at ${t}`);
  }
});

test("the shutter stays shut through the flip and the beat, then only rises", () => {
  assert.equal(shopOpenFrame(SHOP_OPEN.riseAt).rise, 0);
  let last = 0;
  for (let t = SHOP_OPEN.riseAt; t <= SHOP_OPEN.total; t += 5) {
    const r = shopOpenFrame(t).rise;
    assert.ok(r >= last - 1e-9, `went back at ${t}`);
    last = r;
  }
  assert.equal(last, 1);
});

test("short enough to be loading, not a wait", () => {
  assert.ok(SHOP_OPEN.total <= 1200);
});
