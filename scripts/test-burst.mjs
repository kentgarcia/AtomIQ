/**
 * The burst round a hero element and the three small timelines the celebrations share
 * (components/motion/burst-core.ts, reveal-core.ts): stars fly out, hang and leave nothing
 * behind; the ring flashes once; a reveal ends as the plain element; a count lands on its target;
 * a pulse starts and ends at rest.
 *
 * Run: npm run test:burst
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { BURST, burstStar, burstRing, burstTwinkle } = loadTs("components/motion/burst-core.ts");
const { REVEAL, PULSE, revealFrame, countBetween, pulseScale } = loadTs("components/motion/reveal-core.ts");

const FRAME = 1000 / 60;
const frames = (to) => Array.from({ length: Math.floor(to / FRAME) + 2 }, (_, i) => i * FRAME);

test("before it starts and after it ends the burst draws nothing", () => {
  for (let i = 0; i < BURST.count; i++) {
    for (const t of [-50, 0, BURST.total, BURST.total + 400]) assert.equal(burstStar(i, t).opacity, 0, `star ${i} at ${t}`);
  }
  for (const t of [-50, 0, BURST.ringMs, BURST.ringMs + 300]) assert.equal(burstRing(t).opacity, 0);
  for (const i of [0, 1]) for (const t of [-50, 0, BURST.twinkleEnd + 200]) assert.equal(burstTwinkle(i, t).opacity, 0);
});

test("the stars fly out fast, then hang, then shrink and fade", () => {
  for (let i = 0; i < BURST.count; i++) {
    const dist = (t) => Math.hypot(burstStar(i, t).x, burstStar(i, t).y);
    assert.ok(dist(120) > dist(BURST.outMs) * 0.5, "an ease-out: half the way out in the first third of the flight");
    assert.ok(dist(BURST.outMs) > dist(120), "and still moving after that");
    assert.ok(dist(BURST.outMs) > BURST.reach * 0.7, "reaches near the reach");
    assert.ok(burstStar(i, BURST.outMs).opacity > 0.99, "fully visible while hanging");
    assert.ok(burstStar(i, BURST.total - 10).opacity < 0.1, "nearly gone at the end");
    assert.ok(burstStar(i, BURST.total - 10).scale < burstStar(i, BURST.outMs).scale, "smaller as it leaves");
  }
});

test("the stars do not leave the burst in a line, and every star differs", () => {
  const spots = Array.from({ length: BURST.count }, (_, i) => burstStar(i, BURST.outMs));
  const angles = spots.map((s) => Math.atan2(s.y, s.x));
  assert.equal(new Set(angles.map((a) => a.toFixed(2))).size, BURST.count);
  assert.deepEqual(burstStar(2, 300), burstStar(2, 300), "deterministic");
  assert.notDeepEqual(burstStar(0, 300), burstStar(1, 300));
});

test("a smaller reach keeps the stars closer", () => {
  assert.ok(Math.hypot(burstStar(0, 400, 30).x, burstStar(0, 400, 30).y) < Math.hypot(burstStar(0, 400, 60).x, burstStar(0, 400, 60).y));
});

test("the ring only grows and only fades", () => {
  let scale = 0;
  let opacity = Infinity;
  for (const t of frames(BURST.ringMs).filter((x) => x > 0 && x < BURST.ringMs)) {
    const r = burstRing(t);
    assert.ok(r.scale >= scale - 1e-9);
    assert.ok(r.opacity <= opacity + 1e-9);
    scale = r.scale;
    opacity = r.opacity;
  }
  assert.ok(scale <= BURST.ringTo + 1e-9);
});

test("the second twinkle trails the first and turns the other way", () => {
  const peak = (i) => frames(BURST.twinkleEnd).reduce((b, t) => (burstTwinkle(i, t).opacity > burstTwinkle(i, b).opacity ? t : b), 0);
  assert.ok(peak(1) > peak(0));
  assert.ok(burstTwinkle(0, 400).rotate * burstTwinkle(1, 400).rotate < 0);
});

test("a reveal starts invisible and ends as the plain element, never from the wrong side", () => {
  assert.deepEqual(revealFrame(0), { opacity: 0, y: REVEAL.rise });
  assert.deepEqual(revealFrame(-100), revealFrame(0));
  assert.deepEqual(revealFrame(REVEAL.ms), { opacity: 1, y: 0 });
  assert.deepEqual(revealFrame(REVEAL.ms + 500), { opacity: 1, y: 0 });
  let last = -1;
  for (const t of frames(REVEAL.ms)) {
    const o = revealFrame(t).opacity;
    assert.ok(o >= last - 1e-9);
    last = o;
  }
});

test("a count starts on `from`, lands on `to` and only moves one way", () => {
  assert.equal(countBetween(0, 4, 5, 400), 4);
  assert.equal(countBetween(-20, 4, 5, 400), 4);
  assert.equal(countBetween(400, 4, 5, 400), 5);
  assert.equal(countBetween(900, 4, 5, 400), 5);
  let last = 0;
  for (const t of frames(400)) {
    const v = countBetween(t, 0, 40, 400);
    assert.ok(v >= last);
    assert.equal(v, Math.round(v));
    last = v;
  }
  assert.equal(last, 40);
});

test("the pulse starts and ends at rest and peaks in the middle", () => {
  assert.equal(pulseScale(0), 1);
  assert.ok(Math.abs(pulseScale(PULSE.ms) - 1) < 1e-9);
  assert.ok(Math.abs(pulseScale(PULSE.ms / 2) - (1 + PULSE.amount)) < 1e-9);
  assert.equal(pulseScale(-30), 1);
});
