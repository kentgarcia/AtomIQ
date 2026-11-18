/**
 * The finish-screen stat reveal (components/lesson/stat-reveal-core.ts): nothing before it starts,
 * the icon and value standing alone, the stars bursting and being pulled back, the tile fading
 * in, the count-up, and the timing of the tiles one after another.
 *
 * Run: npm run test:stat-reveal
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const fx = loadTs("components/lesson/stat-reveal-core.ts");
const { STAT_FX, STAT_TOTAL, STAT_STEP, STATS_START, cornerStarFrame, countValue, shineStart, starFrame, statFrame, statStart } = fx;

const times = (step = 10) => Array.from({ length: Math.ceil(STAT_TOTAL / step) + 1 }, (_, i) => i * step);

test("a tile waiting for its turn shows nothing", () => {
  const f = statFrame(0);
  assert.equal(f.heroOpacity, 0);
  assert.equal(f.shellOpacity, 0);
  assert.equal(f.ringOpacity, 0);
  for (let i = 0; i < STAT_FX.starCount; i++) assert.equal(starFrame(i, 0).opacity, 0);
  assert.equal(statFrame(-50).heroOpacity, 0);
});

test("the icon and value stand alone first: visible and big, with no tile yet", () => {
  const f = statFrame(STAT_FX.heroInEnd + 200);
  assert.equal(f.heroOpacity, 1);
  assert.equal(f.shellOpacity, 0);
  assert.equal(f.heroScale, STAT_FX.heroScale);
});

test("nothing appears from scale 0", () => {
  for (const t of times().filter((t) => t > 0)) assert.ok(statFrame(t).heroScale >= STAT_FX.heroScale * 0.85 - 1e-9 || t >= STAT_FX.gatherStart, `hero scale too small at ${t}`);
  for (const t of times()) assert.ok(statFrame(t).shellScale >= 0.94 - 1e-9);
});

test("the hero settles to tile size and the tile ends fully shown", () => {
  const end = statFrame(STAT_TOTAL);
  assert.equal(end.heroScale, 1);
  assert.equal(end.heroOpacity, 1);
  assert.equal(end.shellOpacity, 1);
  assert.equal(end.shellScale, 1);
  assert.equal(end.ringOpacity, 0);
  assert.equal(end.iconScale, 1);
  // It never grows back after it has begun to shrink
  let last = Infinity;
  for (let t = STAT_FX.gatherStart; t <= STAT_TOTAL; t += 10) {
    const s = statFrame(t).heroScale;
    assert.ok(s <= last + 1e-9, `hero scale rose at ${t}`);
    last = s;
  }
});

test("the tile fades in only once the stars are coming back, and never before the hero is up", () => {
  assert.ok(STAT_FX.shellStart >= STAT_FX.gatherStart);
  assert.ok(STAT_FX.shellStart >= STAT_FX.heroInEnd);
  let last = 0;
  for (const t of times()) {
    const o = statFrame(t).shellOpacity;
    assert.ok(o >= last - 1e-9, `tile opacity fell at ${t}`);
    last = o;
  }
});

test("the ring flashes once, bright to gone, and every value stays in range", () => {
  const peak = Math.max(...times(5).map((t) => statFrame(t).ringOpacity));
  assert.ok(peak > 0.5 && peak <= 1);
  assert.equal(statFrame(STAT_FX.flashEnd + 5).ringOpacity, 0);
  for (const t of times(5)) {
    const f = statFrame(t);
    for (const k of ["heroOpacity", "shellOpacity", "ringOpacity"]) assert.ok(f[k] >= 0 && f[k] <= 1, `${k} out of range at ${t}`);
    assert.ok(f.iconScale >= 1 && f.iconScale < 1.3);
  }
});

test("the stars burst out, hang round the middle, and are all pulled back in before the end", () => {
  for (let i = 0; i < STAT_FX.starCount; i++) {
    const hang = starFrame(i, (STAT_FX.starsOutEnd + STAT_FX.gatherStart) / 2);
    const dist = Math.hypot(hang.x, hang.y);
    assert.ok(dist > STAT_FX.starRadius * 0.6 && dist < STAT_FX.starRadius * 1.5, `star ${i} hangs at ${dist}`);
    assert.ok(hang.opacity > 0.9);
    // Gone once the gather is done
    assert.equal(starFrame(i, STAT_FX.gatherEnd).opacity, 0);
    assert.equal(starFrame(i, STAT_TOTAL).opacity, 0);
    // They come in to the middle: the distance only shrinks during the gather
    let last = Infinity;
    for (let t = STAT_FX.gatherStart; t < STAT_FX.gatherEnd; t += 10) {
      const f = starFrame(i, t);
      const d = Math.hypot(f.x, f.y);
      assert.ok(d <= last + 3.2, `star ${i} moved outwards at ${t}`);
      last = d;
    }
  }
});

test("the stars do not sit on top of each other", () => {
  const t = (STAT_FX.starsOutEnd + STAT_FX.gatherStart) / 2;
  const pts = Array.from({ length: STAT_FX.starCount }, (_, i) => starFrame(i, t));
  for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) assert.ok(Math.hypot(pts[a].x - pts[b].x, pts[a].y - pts[b].y) > 14, `stars ${a} and ${b} overlap`);
});

test("the stars are the same on every call (no random per frame)", () => {
  for (let i = 0; i < STAT_FX.starCount; i++) assert.deepEqual(starFrame(i, 500), starFrame(i, 500));
});

test("the corner stars twinkle during the flash and are gone after it", () => {
  for (const i of [0, 1]) {
    assert.ok(cornerStarFrame(i, 0).opacity < 1e-9);
    assert.ok(cornerStarFrame(i, STAT_FX.flashEnd).opacity < 1e-9, `corner star ${i} still visible when the flash ends`);
    assert.ok(cornerStarFrame(i, STAT_TOTAL).opacity < 1e-9, `corner star ${i} still visible on the last frame`);
    assert.ok(cornerStarFrame(i, STAT_TOTAL + 200).opacity < 1e-9);
    const peak = Math.max(...times(5).map((t) => cornerStarFrame(i, t).opacity));
    assert.ok(peak > 0.9);
  }
});

test("the count starts at 0, only goes up, and lands exactly on the number", () => {
  for (const target of [0, 1, 7, 40, 100, 98]) {
    assert.equal(countValue(0, target), 0);
    assert.equal(countValue(STAT_FX.countEnd, target), target);
    assert.equal(countValue(STAT_TOTAL, target), target);
    let last = 0;
    for (const t of times(5)) {
      const v = countValue(t, target);
      assert.ok(v >= last, `count fell at ${t} for ${target}`);
      assert.ok(Number.isInteger(v));
      last = v;
    }
  }
});

test("the count ends before the hero has settled, so the number lands while it shrinks", () => {
  assert.ok(STAT_FX.countEnd <= STAT_FX.gatherEnd);
  assert.ok(STAT_FX.countEnd >= STAT_FX.gatherStart);
});

test("tiles follow one another: each starts later, and the next starts while the last is settling", () => {
  assert.equal(statStart(0), STATS_START);
  assert.equal(statStart(2) - statStart(1), STAT_STEP);
  assert.ok(STAT_STEP < STAT_TOTAL, "overlap is on purpose: the next one begins as the last settles");
  assert.ok(STAT_STEP >= STAT_FX.gatherStart - 200, "but not before the last has begun to settle");
});

test("the light sweeps start only after the last tile is fully in, in order", () => {
  for (const count of [1, 2, 3]) {
    const lastDone = statStart(count - 1) + STAT_TOTAL;
    let prev = -Infinity;
    for (let n = 0; n < count; n++) {
      const s = shineStart(n, count);
      assert.ok(s > lastDone, `shine ${n}/${count} starts too early`);
      assert.ok(s > prev);
      prev = s;
    }
  }
});
