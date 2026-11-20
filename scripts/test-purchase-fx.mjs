/**
 * The buying moment's maths: how many diamonds fly, when they land, and that every frame is finite, starts and ends on nothing.
 *
 * Run: npm run test:purchase-fx
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { PURCHASE, PURCHASE_TOTAL, coinCount, coinFrame, labelFrame, landMs } = loadTs("components/shop/purchase-fx-core.ts");
const { BURST } = loadTs("components/motion/burst-core.ts");
const from = { x: 300, y: 40 };
const to = { x: 150, y: 200 };

test("a free item sends no diamonds, a dearer one sends more, within bounds", () => {
  assert.equal(coinCount(0), 0);
  assert.equal(coinCount(-5), 0);
  assert.equal(coinCount(Number.NaN), 0);
  const counts = [15, 20, 25, 40, 60, 80].map(coinCount);
  assert.ok(counts.every((n) => n >= PURCHASE.minCoins && n <= PURCHASE.maxCoins), counts.join());
  for (let i = 1; i < counts.length; i++) assert.ok(counts[i] >= counts[i - 1], "dearer is never fewer");
  assert.ok(counts[counts.length - 1] > counts[0]);
});

test("the item goes on when the last diamond lands; a free one at once", () => {
  assert.equal(landMs(0), 0);
  assert.equal(landMs(1), PURCHASE.flight);
  assert.equal(landMs(5), 4 * PURCHASE.step + PURCHASE.flight);
  assert.ok(PURCHASE_TOTAL >= landMs(PURCHASE.maxCoins) + BURST.total, "room for the burst after the last landing");
});

test("a diamond leaves the balance and arrives at the avatar, and shows nothing before or after", () => {
  for (let i = 0; i < PURCHASE.maxCoins; i++) {
    const start = i * PURCHASE.step;
    for (const t of [-10, 0, start, start + PURCHASE.flight, start + PURCHASE.flight + 500]) assert.equal(coinFrame(i, t, from, to).opacity, 0, `coin ${i} at ${t}`);
    const early = coinFrame(i, start + 40, from, to);
    const late = coinFrame(i, start + PURCHASE.flight - 20, from, to);
    assert.ok(early.opacity > 0 && late.opacity > 0);
    assert.ok(Math.hypot(early.x - from.x, early.y - from.y) < Math.hypot(late.x - from.x, late.y - from.y), "moves away from the balance");
    assert.ok(Math.hypot(late.x - to.x, late.y - to.y) < 40, "ends near the avatar");
    assert.ok(late.scale < 0.8, "shrinks as it arrives");
  }
  for (let t = 0; t <= PURCHASE_TOTAL; t += 7) {
    for (let i = 0; i < PURCHASE.maxCoins; i++) {
      const f = coinFrame(i, t, from, to);
      for (const v of Object.values(f)) assert.ok(Number.isFinite(v));
      assert.ok(f.opacity >= 0 && f.opacity <= 1 && f.scale > 0);
    }
  }
});

test("each diamond takes its own sideways path, the same every time", () => {
  const mid = (i) => coinFrame(i, i * PURCHASE.step + PURCHASE.flight / 2, from, to).x;
  assert.ok(new Set([0, 1, 2, 3].map(mid)).size === 4);
  assert.equal(mid(2), mid(2));
});

test("the -price rises and fades, and is gone at both ends", () => {
  assert.equal(labelFrame(0).opacity, 0);
  assert.equal(labelFrame(PURCHASE.label).opacity, 0);
  assert.equal(labelFrame(-5).opacity, 0);
  const a = labelFrame(PURCHASE.label * 0.3);
  const b = labelFrame(PURCHASE.label * 0.8);
  assert.ok(a.opacity > 0.9 && b.opacity < a.opacity && b.y > a.y);
});
