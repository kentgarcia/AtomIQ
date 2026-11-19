/**
 * The shop's data: categories point at real avatar choices, items (none yet) are valid, and an item
 * previews on the avatar without changing the base.
 *
 * Run: npm run test:shop
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { PAINT_PRICE, PATTERN_PRICE, SHOP_CATEGORIES, SHOP_ITEMS, itemsIn, previewConfig } = loadTs("components/shop/shop-core.ts");
const { SCALLOP_DEPTH, awningHeight, awningStripes, stripeCount } = loadTs("components/shop/awning-core.ts");
const { AVATAR_OPTIONS, DEFAULT_AVATAR } = loadTs("components/avatar/avatar-core.ts");

test("every category sells a real avatar choice, and no two share an id or a choice", () => {
  for (const c of SHOP_CATEGORIES) assert.ok(c.choice in AVATAR_OPTIONS, c.id);
  assert.equal(new Set(SHOP_CATEGORIES.map((c) => c.id)).size, SHOP_CATEGORIES.length);
  assert.equal(new Set(SHOP_CATEGORIES.map((c) => c.choice)).size, SHOP_CATEGORIES.length);
});

test("items: unique ids, a known category, an id the avatar has, a whole positive price", () => {
  assert.equal(new Set(SHOP_ITEMS.map((i) => i.id)).size, SHOP_ITEMS.length);
  for (const i of SHOP_ITEMS) {
    const cat = SHOP_CATEGORIES.find((c) => c.id === i.category);
    assert.ok(cat, i.id);
    assert.ok(AVATAR_OPTIONS[cat.choice].includes(i.value), i.id);
    assert.ok(Number.isInteger(i.price) && i.price > 0, i.id);
  }
});

test("paints and patterns are for sale, every one except the defaults; nothing else is yet", () => {
  const paints = itemsIn("paint");
  const patterns = itemsIn("pattern");
  assert.deepEqual(paints.map((i) => i.value), AVATAR_OPTIONS.background.filter((id) => id !== DEFAULT_AVATAR.background));
  assert.deepEqual(patterns.map((i) => i.value), AVATAR_OPTIONS.pattern.filter((id) => id !== DEFAULT_AVATAR.pattern));
  assert.ok(paints.length >= 10 && patterns.length === AVATAR_OPTIONS.pattern.length - 1);
  assert.ok(paints.every((i) => i.price === PAINT_PRICE) && patterns.every((i) => i.price === PATTERN_PRICE));
  assert.ok(!paints.some((i) => i.value === DEFAULT_AVATAR.background), "the starting paint is not sold");
  assert.ok(!patterns.some((i) => i.value === "none"), "no pattern is not sold");
  for (const c of ["hair", "eyes", "outfit", "skin"]) assert.deepEqual(itemsIn(c), [], c);
  assert.equal(SHOP_ITEMS.length, paints.length + patterns.length);
});

test("every item has a name for screen readers, and names do not repeat within a tab", () => {
  for (const c of SHOP_CATEGORIES) {
    const names = itemsIn(c.id).map((i) => i.name);
    assert.ok(names.every((n) => n.trim().length > 0), c.id);
    assert.equal(new Set(names).size, names.length, c.id);
  }
});

test("an item previews on the avatar and leaves the base alone", () => {
  const item = { id: "t", name: "Sweater", category: "outfit", value: "sweater", price: 100 };
  const outfitChoice = SHOP_CATEGORIES.find((c) => c.id === "outfit").choice;
  const shown = previewConfig(DEFAULT_AVATAR, item);
  assert.equal(shown[outfitChoice], "sweater");
  assert.equal(DEFAULT_AVATAR[outfitChoice], "hoodie");
  assert.deepEqual({ ...shown, [outfitChoice]: DEFAULT_AVATAR[outfitChoice] }, DEFAULT_AVATAR);
  assert.deepEqual(itemsIn("outfit", [item]), [item]);
  assert.deepEqual(itemsIn("hair", [item]), []);
});

test("the awning: an even number of wide stripes that tile the width, shallow scallops, the lip is a shifted copy", () => {
  for (const width of [320, 360, 393, 412, 600, 720]) {
    const n = stripeCount(width);
    assert.equal(n % 2, 0, `${width}`);
    assert.ok(width / n >= 40 && width / n <= 80, `${width} stripe ${width / n}`);
    const stripes = awningStripes(width, n, 80);
    assert.equal(stripes.length, n);
    assert.deepEqual(stripes.map((s) => s.index), [...Array(n).keys()]);
    // Each scallop is half an ellipse as wide as its stripe and SCALLOP_DEPTH deep, however wide the stripe is.
    const w = width / n;
    for (const s of stripes) assert.ok(s.d.includes(`A${Math.round((w / 2) * 100) / 100} ${SCALLOP_DEPTH} `), s.d);
    assert.equal(awningHeight(80, 6), 80 + SCALLOP_DEPTH + 6);
  }
  const plain = awningStripes(300, 6, 50);
  const lip = awningStripes(300, 6, 50, 6);
  assert.notEqual(plain[0].d, lip[0].d);
  assert.ok(lip[0].d.includes("V56"), "the lip hangs 6 below the face");
});
