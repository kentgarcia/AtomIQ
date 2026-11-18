/**
 * The pop of a lesson option button (components/lesson/cards/option-pop-core.ts), whose keyframes
 * were measured frame by frame from a reference clip: starts from the pressed position, squashes
 * (anticipation), springs up tall, hangs, falls stretched, lands squashed, hops a little and
 * settles; the band of light accelerates across and the corner sparkles come and go, leaving
 * nothing behind.
 *
 * Run: npm run test:option-pop
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { POP, POP_TOTAL, bandFrame, faceFrame, popAction, starFrame } = loadTs("components/lesson/cards/option-pop-core.ts");
const FROM = 0.08;
const ts = (step = 1, max = POP_TOTAL + 100) => Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => i * step);
const argmin = (f) => ts().reduce((b, t) => (f(t) < f(b) ? t : b), 0);
const argmax = (f) => ts().reduce((b, t) => (f(t) > f(b) ? t : b), 0);

test("it starts exactly where the pressed face is, so nothing jumps", () => {
  assert.deepEqual(faceFrame(0, FROM), { y: FROM, sx: 1, sy: 1 });
  assert.deepEqual(faceFrame(-30, FROM), { y: FROM, sx: 1, sy: 1 });
  assert.ok(Math.abs(faceFrame(1, FROM).y - FROM) < 0.01);
});

test("it ends exactly at rest and stays there", () => {
  for (const t of [POP_TOTAL, POP_TOTAL + 1, POP_TOTAL + 500]) assert.deepEqual(faceFrame(t, FROM), { y: 0, sx: 1, sy: 1 });
});

test("the anticipation squash comes first: about 72% tall, a touch wider, sunk toward the lip", () => {
  const tSquash = argmin((t) => faceFrame(t, FROM).sy);
  const f = faceFrame(tSquash, FROM);
  assert.ok(tSquash < POP.sweepStart, `deepest squash at ${tSquash}`);
  assert.ok(Math.abs(f.sy - 0.716) < 0.01, `squash ${f.sy}`);
  assert.ok(f.sx > 1.01 && f.sx < 1.04);
  assert.ok(f.y > 0.1, "it sinks down while squashed");
});

test("then it springs up tall and narrow, and hangs about a quarter of its height up", () => {
  const tTall = argmax((t) => faceFrame(t, FROM).sy);
  assert.ok(tTall > 300 && tTall < POP_TOTAL, "the tallest stretch is the fall, after the hang");
  const tUp = argmin((t) => faceFrame(t, FROM).y);
  assert.ok(Math.abs(faceFrame(tUp, FROM).y + 0.257) < 0.005);
  assert.ok(tUp > 100 && tUp < 300);
  const launch = faceFrame(100, FROM);
  assert.ok(launch.sy > 1.1 && launch.sx < 0.97, "tall and narrow as it launches");
  for (let t = 183; t <= 283; t += 5) assert.ok(faceFrame(t, FROM).y < -0.25, `not hanging at ${t}`);
});

test("it lands squashed, then hops a little, then settles", () => {
  const land = faceFrame(400, FROM);
  assert.ok(land.sy < 0.95 && land.sx > 1.01 && land.y > 0, `landing ${JSON.stringify(land)}`);
  let hop = 0;
  for (let t = 417; t <= 550; t += 1) hop = Math.min(hop, faceFrame(t, FROM).y);
  assert.ok(hop < -0.07 && hop > -0.1, `rebound hop ${hop}`);
});

test("the order is: squash, then up, then down onto the lip, then the small hop", () => {
  const tSquash = argmin((t) => faceFrame(t, FROM).sy);
  const tUp = argmin((t) => faceFrame(t, FROM).y);
  const tLand = argmax((t) => faceFrame(t, FROM).y > 0 && t > 300 ? faceFrame(t, FROM).y : -1);
  assert.ok(tSquash < tUp && tUp < tLand);
  assert.ok(tLand >= 380 && tLand <= 420);
});

test("the shape stays sane: no scale outside a narrow range", () => {
  for (const t of ts()) {
    const f = faceFrame(t, FROM);
    assert.ok(f.sx > 0.94 && f.sx < 1.04, `sx ${f.sx} at ${t}`);
    assert.ok(f.sy > 0.7 && f.sy < 1.2, `sy ${f.sy} at ${t}`);
  }
});

test("the band of light: off before and after, only left to right, accelerating", () => {
  assert.equal(bandFrame(0).opacity, 0);
  assert.equal(bandFrame(POP.sweepStart - 1).opacity, 0);
  assert.equal(bandFrame(POP.sweepEnd).opacity, 0);
  assert.equal(bandFrame(POP_TOTAL).opacity, 0);
  let last = -Infinity;
  for (let t = POP.sweepStart; t < POP.sweepEnd; t += 2) {
    const b = bandFrame(t);
    assert.equal(b.opacity, 1);
    assert.ok(b.left >= last, `band went backwards at ${t}`);
    last = b.left;
  }
  const speed = (a, b) => (bandFrame(b).left - bandFrame(a).left) / (b - a);
  assert.ok(speed(340, 380) > speed(130, 170) * 2, "it speeds up");
  assert.ok(bandFrame(POP.sweepEnd - 1).left > 0.9, "it leaves through the right edge");
});

test("the band sweeps while the face is in the air, and ends before the landing settles", () => {
  assert.ok(POP.sweepStart >= 100);
  assert.ok(POP.sweepEnd <= 400);
});

test("both corner sparkles grow, peak, shrink and leave nothing on the last frame", () => {
  for (const i of [0, 1]) {
    assert.equal(starFrame(i, 0).size, 0);
    assert.equal(starFrame(i, POP.sweepEnd + 100).size, 0);
    assert.equal(starFrame(i, POP_TOTAL).size, 0);
    assert.equal(starFrame(i, POP_TOTAL + 500).size, 0);
    const peak = Math.max(...ts().map((t) => starFrame(i, t).size));
    assert.ok(peak > 0.6 && peak <= 1);
  }
});

test("the bottom-right sparkle is smaller than the top-left one", () => {
  const peak = (i) => Math.max(...ts().map((t) => starFrame(i, t).size));
  assert.ok(peak(1) < peak(0) * 0.75);
});

// ---------------------------------------------------------------------------------------------
// The "wrong" shake
// ---------------------------------------------------------------------------------------------

const { SHAKE, shakeOffset } = loadTs("components/lesson/cards/shake-core.ts");

test("the shake starts and ends at rest, and is at rest outside its time", () => {
  for (const t of [-10, 0, SHAKE.total, SHAKE.total + 300]) assert.equal(shakeOffset(t), 0);
});

test("the shake swings both ways, never past its amplitude, and dies away", () => {
  const xs = Array.from({ length: SHAKE.total }, (_, t) => shakeOffset(t));
  assert.ok(xs.some((x) => x > 3) && xs.some((x) => x < -3), "swings both ways");
  assert.ok(xs.every((x) => Math.abs(x) <= SHAKE.amplitude));
  const early = Math.max(...xs.slice(0, 140).map(Math.abs));
  const late = Math.max(...xs.slice(280).map(Math.abs));
  assert.ok(late < early * 0.4, `late swing ${late} vs early ${early}`);
});

test("the shake changes direction about once per half swing", () => {
  let crossings = 0;
  let last = 0;
  for (let t = 1; t < SHAKE.total; t++) {
    const x = shakeOffset(t);
    if (last !== 0 && Math.sign(x) !== 0 && Math.sign(x) !== Math.sign(last)) crossings++;
    if (x !== 0) last = x;
  }
  assert.ok(crossings >= 4 && crossings <= 7, `crossings ${crossings}`);
});

test("only becoming selected or correct plays the pop; every other change puts a running pop at rest", () => {
  assert.equal(popAction("idle", "selected", false), "start");
  assert.equal(popAction("selected", "correct", false), "start", "an instant-graded right answer restarts a whole pop");
  assert.equal(popAction("idle", "correct", false), "start");
  // The bug: selected for a frame, then graded wrong: the pop must not stay frozen half way
  assert.equal(popAction("selected", "wrong", false), "rest");
  assert.equal(popAction("selected", "idle", false), "rest", "a pick changed to another option");
  assert.equal(popAction("selected", "dim", false), "rest");
  assert.equal(popAction("idle", "wrong", false), "rest");
  assert.equal(popAction("wrong", "idle", false), "rest");
  assert.equal(popAction("selected", "selected", false), "none");
  assert.equal(popAction("idle", "selected", true), "rest", "reduced motion never pops");
});

test("a pop put at rest shows the plain face: no lift, no squash", () => {
  const f = faceFrame(POP_TOTAL, 0.07);
  assert.deepEqual([f.y, f.sx, f.sy], [0, 1, 1]);
});
