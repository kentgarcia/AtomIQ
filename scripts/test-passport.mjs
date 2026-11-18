/**
 * The Explorer Passport numbers (components/profile/passport-core.ts): the printed number, the
 * barcode made from it, and the rank under the name.
 *
 * Run: npm run test:passport
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("components/profile/passport-core.ts");
const { BARCODE, LEVEL_SEGMENTS, barcodeBars, barcodeWidth, explorerTitle, filledSegments, levelFromXp, passportNumber, resolveShowcase, toggleShowcase, MAX_SHOWCASE } = core;

test("a friend code becomes the passport number, upper-cased", () => {
  assert.equal(passportNumber("7k3m9p", "u1"), "AQ-7K3M9P");
  assert.equal(passportNumber(" ABC123 ", "u1"), "AQ-ABC123");
});

test("without a usable friend code the number comes from the user id and stays the same", () => {
  for (const code of [null, undefined, "", "abc", "TOOLONG1", "AB-123"]) {
    const n = passportNumber(code, "user-42");
    assert.match(n, /^AQ-[A-Z0-9]{6}$/);
    assert.equal(n, passportNumber(code, "user-42"));
  }
  assert.notEqual(passportNumber(null, "user-42"), passportNumber(null, "user-43"));
});

test("the barcode is a function of the number and uses only the allowed widths", () => {
  const a = barcodeBars("AQ-7K3M9P");
  assert.equal(a.length, BARCODE.count);
  assert.deepEqual(a, barcodeBars("AQ-7K3M9P"));
  assert.notDeepEqual(a, barcodeBars("AQ-7K3M9Q"));
  for (const bar of a) {
    assert.ok(BARCODE.widths.includes(bar.width));
    assert.ok(BARCODE.gaps.includes(bar.gap));
  }
  const w = barcodeWidth(a);
  const min = BARCODE.count * (Math.min(...BARCODE.widths) + Math.min(...BARCODE.gaps));
  const max = BARCODE.count * (Math.max(...BARCODE.widths) + Math.max(...BARCODE.gaps));
  assert.ok(w >= min && w <= max);
});

test("level and rank follow the XP, one level per 100 XP", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(99), 1);
  assert.equal(levelFromXp(100), 2);
  assert.equal(levelFromXp(-5), 1);
  assert.equal(explorerTitle(1), "Atomic Novice");
  assert.equal(explorerTitle(4), "Atomic Novice");
  assert.equal(explorerTitle(5), "Isotope Initiate");
  assert.equal(explorerTitle(10), "Fusion Explorer");
  assert.equal(explorerTitle(20), "Quantum Master");
  assert.equal(explorerTitle(99), "Quantum Master");
});

test("the level bar lights whole segments and is never full before the level is done", () => {
  assert.equal(filledSegments(0), 0);
  assert.equal(filledSegments(0.34), 3);
  assert.equal(filledSegments(0.99), LEVEL_SEGMENTS - 1);
  assert.equal(filledSegments(1), LEVEL_SEGMENTS);
  assert.equal(filledSegments(-1), 0);
  assert.equal(filledSegments(5), LEVEL_SEGMENTS);
  assert.equal(filledSegments(Number.NaN), 0);
});

const earned = [
  { id: 1, level: 2 },
  { id: 2, level: 5 },
  { id: 3, level: 5 },
  { id: 4, level: 1 },
];

test("without a pick the best earned badges show, highest level first", () => {
  assert.deepEqual(resolveShowcase(null, earned), [2, 3, 1]);
  assert.deepEqual(resolveShowcase(undefined, []), []);
});

test("a pick is kept in order, drops what is not earned, and is capped", () => {
  assert.deepEqual(resolveShowcase([4, 1], earned), [4, 1]);
  assert.deepEqual(resolveShowcase([9, 4, 4, 1], earned), [4, 1]);
  assert.deepEqual(resolveShowcase([1, 2, 3, 4], earned), [1, 2, 3]);
  assert.deepEqual(resolveShowcase([], earned), []);
});

test("toggling adds to the end, removes, and stops at the cap", () => {
  assert.deepEqual(toggleShowcase([], 2), [2]);
  assert.deepEqual(toggleShowcase([2, 3], 3), [2]);
  const full = [1, 2, 3];
  assert.equal(full.length, MAX_SHOWCASE);
  assert.deepEqual(toggleShowcase(full, 4), full);
  assert.notEqual(toggleShowcase(full, 4), full);
});
