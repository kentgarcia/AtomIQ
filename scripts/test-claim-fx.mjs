/**
 * The quest claim animation (components/quests/claim-fx-core.ts): the fill, the sparkles, the XP
 * coins scattering and being pulled to the target, and the moment the claim is saved.
 *
 * Run: npm run test:claim-fx
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const fx = loadTs("components/quests/claim-fx-core.ts");
const { CLAIM_FX, CLAIM_AT, CLAIM_TOTAL, FIRST_LANDING, burstFrame, coinFrame, coinSpec, fillAmount, landingRing, streamFrame } = fx;

const TARGET = { x: 140, y: 380 };
const W = 260;
const H = 56;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const times = (step = 10) => Array.from({ length: Math.ceil(CLAIM_TOTAL / step) + 1 }, (_, i) => i * step);

test("the fill is slow and smooth: empty at 0, full when done, never going backwards", () => {
  assert.equal(fillAmount(0), 0);
  assert.equal(fillAmount(CLAIM_FX.fillEnd), 1);
  assert.equal(fillAmount(CLAIM_TOTAL), 1);
  let last = 0;
  for (let t = 0; t <= CLAIM_FX.fillEnd; t += 10) {
    const v = fillAmount(t);
    assert.ok(v >= last - 1e-9 && v >= 0 && v <= 1, `t=${t}`);
    assert.ok(v - last < 0.06, `no jumps: ${v - last} at ${t}`);
    last = v;
  }
  assert.ok(CLAIM_FX.fillEnd >= 600, "slow enough to watch");
});

test("the timeline is in order: fill, burst, scatter, then the magnet", () => {
  assert.ok(CLAIM_FX.burstStart <= CLAIM_FX.fillEnd, "the burst starts as the fill finishes");
  assert.ok(CLAIM_FX.burstEnd <= CLAIM_FX.scatterEnd);
  assert.ok(CLAIM_FX.scatterStart < CLAIM_FX.scatterEnd && CLAIM_FX.scatterEnd <= CLAIM_FX.magnetStart);
  assert.equal(FIRST_LANDING, CLAIM_FX.magnetStart + CLAIM_FX.magnetDuration);
  assert.ok(CLAIM_AT >= FIRST_LANDING, "XP is awarded no earlier than the first coin landing");
  assert.ok(CLAIM_TOTAL > CLAIM_AT);
  assert.ok(CLAIM_TOTAL <= 3200, "the whole thing stays under about three seconds");
});

test("nothing shows before the claim and nothing is left on screen after it", () => {
  for (let i = 0; i < CLAIM_FX.xpCount; i++) {
    assert.equal(coinFrame(coinSpec(i), 0, TARGET).opacity, 0);
    assert.equal(coinFrame(coinSpec(i), CLAIM_TOTAL, TARGET).opacity, 0);
  }
  for (let i = 0; i < CLAIM_FX.burstCount; i++) {
    assert.equal(burstFrame(i, 0, W).opacity, 0);
    assert.equal(burstFrame(i, CLAIM_TOTAL, W).opacity, 0);
  }
  for (let i = 0; i < CLAIM_FX.streamCount; i++) {
    assert.equal(streamFrame(i, 0, W, H).opacity, 0);
    assert.equal(streamFrame(i, CLAIM_TOTAL, W, H).opacity, 0);
  }
  assert.equal(landingRing(0).opacity, 0);
  assert.equal(landingRing(CLAIM_TOTAL).opacity, 0);
});

test("every value is finite and opacity and scale stay in range, at every moment", () => {
  for (const t of times(7)) {
    const frames = [
      ...Array.from({ length: CLAIM_FX.xpCount }, (_, i) => coinFrame(coinSpec(i), t, TARGET)),
      ...Array.from({ length: CLAIM_FX.burstCount }, (_, i) => burstFrame(i, t, W)),
      ...Array.from({ length: CLAIM_FX.streamCount }, (_, i) => streamFrame(i, t, W, H)),
    ];
    for (const f of frames) {
      assert.ok(Number.isFinite(f.x) && Number.isFinite(f.y), `t=${t}`);
      assert.ok(f.opacity >= 0 && f.opacity <= 1.000001, `opacity ${f.opacity} at ${t}`);
      assert.ok(f.scale > 0 && f.scale <= 1.2, `scale ${f.scale} at ${t}`);
    }
  }
});

test("coins scatter out of the bar to a spread of spots, none starting from nothing", () => {
  const spots = [];
  for (let i = 0; i < CLAIM_FX.xpCount; i++) {
    const spec = coinSpec(i);
    const start = coinFrame(spec, CLAIM_FX.scatterStart + 1, TARGET);
    assert.ok(start.scale >= 0.4, "a coin pops in at a visible size, never from scale 0");
    const settled = coinFrame(spec, CLAIM_FX.scatterEnd, TARGET);
    const r = Math.hypot(settled.x, settled.y);
    assert.ok(r >= 25 && r <= 95, `coin ${i} scattered ${r}px`);
    assert.equal(settled.opacity, 1);
    spots.push(settled);
  }
  for (let a = 0; a < spots.length; a++) for (let b = a + 1; b < spots.length; b++) assert.ok(dist(spots[a], spots[b]) > 8, `coins ${a} and ${b} overlap`);
});

test("each coin is pulled to the target: it ends there, and speeds up on the way", () => {
  for (let i = 0; i < CLAIM_FX.xpCount; i++) {
    const spec = coinSpec(i);
    const nearEnd = coinFrame(spec, spec.launch + CLAIM_FX.magnetDuration - 0.01, TARGET);
    assert.ok(dist(nearEnd, TARGET) < 4, `coin ${i} ends ${dist(nearEnd, TARGET)}px from the target`);
    // A magnet accelerates: it covers more ground in the last quarter than in the first
    const at = (k) => coinFrame(spec, spec.launch + k * CLAIM_FX.magnetDuration, TARGET);
    const firstQuarter = dist(at(0), at(0.25));
    const lastQuarter = dist(at(0.75), at(1 - 1e-6));
    assert.ok(lastQuarter > firstQuarter * 2, `coin ${i}: ${firstQuarter} then ${lastQuarter}`);
    assert.ok(at(0.99).scale < at(0).scale, "it shrinks as it lands");
  }
});

test("coins leave one after another, and their landings are staggered", () => {
  const launches = Array.from({ length: CLAIM_FX.xpCount }, (_, i) => coinSpec(i).launch);
  for (let i = 1; i < launches.length; i++) assert.equal(launches[i] - launches[i - 1], CLAIM_FX.magnetStagger);
  assert.equal(launches[0], CLAIM_FX.magnetStart);
});

test("coins bow to both sides of the straight line, so they do not queue", () => {
  const bows = Array.from({ length: CLAIM_FX.xpCount }, (_, i) => Math.sign(coinSpec(i).bow));
  assert.ok(bows.includes(1) && bows.includes(-1));
});

test("the sparkles stay close to the bar, and the stream follows the fill front", () => {
  for (let t = 10; t < CLAIM_FX.fillEnd; t += 30) {
    const front = (fillAmount(t) - 0.5) * W;
    for (let i = 0; i < CLAIM_FX.streamCount; i++) {
      const f = streamFrame(i, t, W, H);
      if (f.opacity > 0) {
        assert.ok(Math.abs(f.x - front) <= 12, `stream ${i} at ${t}: ${f.x} vs front ${front}`);
        assert.ok(Math.abs(f.y) <= H / 2 + 24, `stream ${i} flies off: ${f.y}`);
      }
    }
  }
  let lit = 0;
  for (let t = 100; t < CLAIM_FX.fillEnd; t += 50) for (let i = 0; i < CLAIM_FX.streamCount; i++) if (streamFrame(i, t, W, H).opacity > 0.3) lit++;
  assert.ok(lit > 20, "the front is never dark while it fills");
});

test("the burst flies out of the bar's end", () => {
  const mid = (CLAIM_FX.burstStart + CLAIM_FX.burstEnd) / 2;
  for (let i = 0; i < CLAIM_FX.burstCount; i++) {
    const f = burstFrame(i, mid, W);
    assert.ok(f.opacity > 0.4, "visible in the middle of the burst");
    assert.ok(dist(f, { x: W / 2 - 18, y: 0 }) > 8 && dist(f, { x: W / 2 - 18, y: 0 }) <= 70);
  }
});

test("a ring flashes at the target after each landing", () => {
  assert.ok(landingRing(FIRST_LANDING + 60).opacity > 0.4);
  assert.ok(landingRing(CLAIM_TOTAL - 5).opacity < 0.05);
  const a = landingRing(FIRST_LANDING + 20);
  const b = landingRing(FIRST_LANDING + 300);
  assert.ok(b.scale > a.scale && b.opacity < a.opacity, "it grows and fades");
});

test("a chest's diamonds fly the same way with their own count and no wait for a fill", () => {
  const { flightTotal, SKIP_FILL, coinSpec, coinFrame, CLAIM_FX: C } = fx;
  assert.equal(flightTotal(C.xpCount), CLAIM_TOTAL, "eight coins last exactly as the quest flight");
  assert.ok(flightTotal(5) < flightTotal(8), "fewer coins land sooner");
  assert.ok(SKIP_FILL > C.fillEnd && SKIP_FILL < C.scatterStart, "the clock starts after the fill, just before the coins pop");
  const target = { x: 120, y: 260 };
  for (const count of [3, 5, 8]) {
    const total = flightTotal(count) - SKIP_FILL;
    assert.ok(total > 0);
    for (let i = 0; i < count; i++) {
      const spec = coinSpec(i, count);
      assert.ok(coinFrame(spec, SKIP_FILL + 120, target).opacity > 0, `coin ${i} of ${count} is out soon after the start`);
      assert.equal(coinFrame(spec, flightTotal(count), target).opacity, 0, "gone once it has landed");
    }
    // The coins spread round the whole circle, whatever their number
    const angles = Array.from({ length: count }, (_, i) => Math.atan2(coinSpec(i, count).scatter.y, coinSpec(i, count).scatter.x));
    assert.ok(Math.max(...angles) - Math.min(...angles) > 2, `${count} coins fan out`);
  }
});
