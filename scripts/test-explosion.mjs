/**
 * The explosion that ends a lost Myth Buster round (components/games/explosion-core.ts): it shows
 * nothing before it starts and after it ends, the blast pops past full size and settles, the pieces
 * stay finite, and the shake dies away.
 *
 * Run: npm run test:explosion
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { EXPLOSION, explosionFrame, explosionRing, explosionDebris, explosionShake, starburstPath } = loadTs("components/games/explosion-core.ts");

const FRAME = 1000 / 60;
const frames = Array.from({ length: Math.ceil(EXPLOSION.total / FRAME) + 2 }, (_, i) => i * FRAME);

test("nothing is drawn before it starts and after it ends", () => {
  for (const t of [-50, 0, EXPLOSION.total, EXPLOSION.total + 300]) {
    const f = explosionFrame(t);
    assert.equal(f.flash, 0);
    assert.equal(f.dim, 0);
    assert.equal(f.blastOpacity, 0);
    assert.equal(f.labelOpacity, 0);
    assert.equal(f.coreScale * f.coreOpacity, 0);
    for (let i = 0; i < EXPLOSION.ringCount; i++) assert.equal(explosionRing(i, t).opacity, 0);
    for (let i = 0; i < EXPLOSION.debrisCount; i++) assert.equal(explosionDebris(i, t).opacity, 0);
    assert.deepEqual(explosionShake(t), { x: 0, y: 0 });
  }
});

test("the blast pops past full size, then settles at 1", () => {
  const peak = Math.max(...frames.filter((t) => t < 300).map((t) => explosionFrame(t).blastScale));
  assert.ok(peak > 1.1 && peak < 1.4, `peak ${peak}`);
  assert.ok(Math.abs(explosionFrame(400).blastScale - 1) < 0.02);
});

test("BOOM! lands big, settles to size 1, holds, then goes", () => {
  assert.ok(explosionFrame(150).labelScale > 1.5);
  assert.ok(Math.abs(explosionFrame(500).labelScale - 1) < 0.02);
  assert.equal(explosionFrame(500).labelOpacity, 1);
  assert.ok(explosionFrame(1050).labelOpacity < 0.5);
});

test("every value is finite on every frame", () => {
  for (const t of frames) {
    for (const v of Object.values(explosionFrame(t))) assert.ok(Number.isFinite(v), `frame ${t}`);
    for (let i = 0; i < EXPLOSION.debrisCount; i++) for (const v of Object.values(explosionDebris(i, t))) assert.ok(Number.isFinite(v), `debris ${i} at ${t}`);
    for (let i = 0; i < EXPLOSION.ringCount; i++) for (const v of Object.values(explosionRing(i, t))) assert.ok(Number.isFinite(v));
  }
});

test("the debris flies outward and never leaves further than its reach plus the fall", () => {
  for (let i = 0; i < EXPLOSION.debrisCount; i++) {
    for (const t of frames) {
      const d = explosionDebris(i, t);
      assert.ok(Math.hypot(d.x, d.y) <= EXPLOSION.reach + 80);
    }
    assert.ok(Math.hypot(explosionDebris(i, 300).x, explosionDebris(i, 300).y) > Math.hypot(explosionDebris(i, 50).x, explosionDebris(i, 50).y));
  }
});

test("the shake starts hard and dies away", () => {
  const size = (t) => Math.hypot(explosionShake(t).x, explosionShake(t).y);
  const early = Math.max(...frames.filter((t) => t > 0 && t < 120).map(size));
  const late = Math.max(...frames.filter((t) => t > 340 && t < 460).map(size));
  assert.ok(early > 4);
  assert.ok(late < early / 4);
});

test("a starburst path has one point per spike and is closed", () => {
  const d = starburstPath(12, 100, 70);
  assert.equal((d.match(/L/g) ?? []).length + 1, 24);
  assert.ok(d.endsWith("Z"));
});
