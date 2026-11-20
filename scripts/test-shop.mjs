/**
 * The shop's data: categories point at real avatar choices, items (none yet) are valid, and an item
 * previews on the avatar without changing the base.
 *
 * Run: npm run test:shop
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { PRICE_SCALE, itemsUnlockedBetween, featuredUnlocks, OUTFIT_PRICES: OUTFITS, FACE_PRICES: FACES, TIER_LEVELS, MAX_UNLOCK_LEVEL, isOwned, isEquipped, itemStatus, buyBlock, PAINT_PRICE, PATTERN_PRICE, SKIN_PRICE, HAIR_STYLE_PRICE, SHOP_CATEGORIES, SHOP_TABS, tabById, isFree, SHOP_ITEMS, itemsIn, previewConfig, colorChoiceOf, colorOptions, withColor } = loadTs("components/shop/shop-core.ts");
const { SCALLOP_DEPTH, awningHeight, awningStripes, stripeCount } = loadTs("components/shop/awning-core.ts");
const { AVATAR_OPTIONS, DEFAULT_AVATAR } = loadTs("components/avatar/avatar-core.ts");

test("every category sells a real avatar choice, and no two share an id or a choice", () => {
  // Every shelf the avatar can draw has a choice (a shelf without one would be empty: none is left)
  for (const c of SHOP_CATEGORIES) assert.ok(c.choice && c.choice in AVATAR_OPTIONS, c.id);
  assert.equal(new Set(SHOP_CATEGORIES.map((c) => c.id)).size, SHOP_CATEGORIES.length);
  assert.equal(new Set(SHOP_CATEGORIES.map((c) => c.choice)).size, SHOP_CATEGORIES.length);
  assert.deepEqual(SHOP_CATEGORIES.slice(0, 6).map((c) => c.id), ["hair", "eyebrows", "eyes", "nose", "mouth", "ears"], "the face sections come right after hair, in this order");
});

test("items: unique ids, a known category, an id the avatar has, a whole price (zero is free)", () => {
  assert.equal(new Set(SHOP_ITEMS.map((i) => i.id)).size, SHOP_ITEMS.length);
  for (const i of SHOP_ITEMS) {
    const cat = SHOP_CATEGORIES.find((c) => c.id === i.category);
    assert.ok(cat, i.id);
    assert.ok(AVATAR_OPTIONS[cat.choice].includes(i.value), i.id);
    assert.ok(Number.isInteger(i.price) && i.price >= 0, i.id);
  }
});

test("every tab has items (paints and patterns without the defaults)", () => {
  const paints = itemsIn("paint");
  const patterns = itemsIn("pattern");
  assert.deepEqual(paints.map((i) => i.value), AVATAR_OPTIONS.background.filter((id) => id !== DEFAULT_AVATAR.background));
  assert.deepEqual(patterns.map((i) => i.value), AVATAR_OPTIONS.pattern.filter((id) => id !== DEFAULT_AVATAR.pattern));
  assert.ok(paints.length >= 10 && patterns.length === AVATAR_OPTIONS.pattern.length - 1);
  assert.ok(paints.every((i) => i.price === PAINT_PRICE) && patterns.every((i) => i.price === PATTERN_PRICE));
  assert.ok(!paints.some((i) => i.value === DEFAULT_AVATAR.background), "the starting paint is not sold");
  assert.ok(!patterns.some((i) => i.value === "none"), "no pattern is not sold");
  for (const c of SHOP_CATEGORIES) assert.ok(itemsIn(c.id).length >= 5, `${c.id} has items`);
  assert.equal(SHOP_ITEMS.length, SHOP_CATEGORIES.reduce((n, c) => n + itemsIn(c.id).length, 0));
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
  assert.deepEqual(itemsIn("skin", [item]), []);
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

test("every skin tone is on the shelf and free", () => {
  const skins = itemsIn("skin");
  assert.deepEqual(skins.map((i) => i.value), AVATAR_OPTIONS.skin);
  assert.equal(SKIN_PRICE, 0);
  assert.ok(skins.length >= 15 && skins.every((i) => i.price === 0 && isFree(i)));
  assert.ok(SHOP_ITEMS.filter((i) => i.category === "paint" || i.category === "pattern").every((i) => !isFree(i)), "paints and patterns still cost diamonds");
  assert.equal(previewConfig(DEFAULT_AVATAR, skins.find((i) => i.value === "deep")).skin, "deep");
  assert.equal(DEFAULT_AVATAR.skin, "warm", "the base is not changed");
});

test("the colourful skin tones are on the shelf too, each a distinct face with a darker shade and a feature colour", () => {
  const { SKIN_TONES } = loadTs("components/avatar/avatar-core.ts");
  const colourful = ["blue", "aqua", "green", "yellow", "orange", "red", "bubblegum", "purple"];
  const natural = ["light", "warm", "pink", "olive", "tan", "brown", "deep"];
  assert.deepEqual(itemsIn("skin").map((i) => i.value), [...natural, ...colourful]);
  assert.equal(new Set(Object.values(SKIN_TONES).map((t) => t.base)).size, Object.keys(SKIN_TONES).length, "no two tones share a face colour");
  for (const id of colourful) {
    const t = SKIN_TONES[id];
    assert.ok(t && t.base !== t.shade && t.shade !== t.feature, id);
  }
});

test("hair: every style, no colour items (colour is not sold); the starting designs' styles are free and the rest costs diamonds", () => {
  const { STARTER_AVATARS } = loadTs("components/avatar/avatar-core.ts");
  const hair = itemsIn("hair");
  assert.deepEqual(hair.map((i) => i.value), AVATAR_OPTIONS.hairStyle);
  assert.ok(hair.every((i) => !i.id.includes("color") && !("choice" in i)), "no colour items");
  const worn = new Set(STARTER_AVATARS.map((a) => a.config.hairStyle));
  for (const i of hair) assert.equal(i.price, worn.has(i.value) ? 0 : HAIR_STYLE_PRICE, i.id);
  assert.ok(hair.some(isFree) && hair.some((i) => !isFree(i)));
  // A style changes the style and leaves the colour the learner has
  const bun = hair.find((i) => i.value === "bun");
  assert.deepEqual(previewConfig({ ...DEFAULT_AVATAR, hairColor: "pink" }, bun), { ...DEFAULT_AVATAR, hairColor: "pink", hairStyle: "bun" });
  assert.equal(DEFAULT_AVATAR.hairStyle, "crop", "the base is not changed");
});

test("the colour column: hair styles (and outfits) are coloured, the other tabs are not; a colour is only tried on", () => {
  const { HAIR_COLORS, OUTFIT_COLORS } = loadTs("components/avatar/avatar-core.ts");
  for (const c of SHOP_CATEGORIES) if (c.colorChoice) assert.ok(c.colorChoice in AVATAR_OPTIONS && c.colorChoice !== c.choice, c.id);
  assert.deepEqual(SHOP_CATEGORIES.filter((c) => c.colorChoice).map((c) => c.id), ["hair", "eyebrows", "eyes", "nose", "headwear", "eyewear", "earwear", "outfit"]);
  const bun = itemsIn("hair").find((i) => i.value === "bun");
  assert.equal(colorChoiceOf(bun), "hairColor");
  for (const id of ["skin", "paint", "pattern"]) assert.equal(colorChoiceOf(itemsIn(id)[0]), null, id);
  assert.equal(colorChoiceOf(null), null);
  const hair = colorOptions("hairColor");
  assert.deepEqual(hair.map((o) => o.id), Object.keys(HAIR_COLORS));
  assert.deepEqual(colorOptions("outfitColor").map((o) => o.id), Object.keys(OUTFIT_COLORS));
  assert.ok(hair.length >= 11 && new Set(hair.map((o) => o.color)).size === hair.length, "distinct swatches");
  assert.ok(hair.every((o) => o.name.trim() && o.color !== o.shade));
  assert.ok(!itemsIn("eyes").some((i) => i.value.startsWith("glasses")), "no glasses for sale");
  assert.equal(new Set(hair.map((o) => o.name)).size, hair.length, "names are unique for screen readers");
  // Setting a colour changes that one choice and leaves the config alone
  const tinted = withColor(DEFAULT_AVATAR, "hairColor", "ginger");
  assert.equal(tinted.hairColor, "ginger");
  assert.equal(DEFAULT_AVATAR.hairColor, "brown");
  assert.deepEqual({ ...tinted, hairColor: "brown" }, DEFAULT_AVATAR);
  // The tried-on style keeps the colour that was picked
  assert.deepEqual(withColor(previewConfig(DEFAULT_AVATAR, bun), "hairColor", "pink"), { ...DEFAULT_AVATAR, hairStyle: "bun", hairColor: "pink" });
});

test("face and outfit tabs: every choice of the avatar is an item, what the starting designs wear is free, the rest has the tab's price", () => {
  const { STARTER_AVATARS } = loadTs("components/avatar/avatar-core.ts");
  const { FACE_PRICES, isFaceCategory } = loadTs("components/shop/shop-core.ts");
  const { OUTFIT_PRICES } = loadTs("components/shop/shop-core.ts");
  assert.deepEqual(Object.keys(FACE_PRICES), ["eyebrows", "eyes", "nose", "mouth", "ears", "headwear", "eyewear", "earwear", "outfit"]);
  for (const cat of Object.keys(FACE_PRICES)) {
    const choice = SHOP_CATEGORIES.find((c) => c.id === cat).choice;
    const items = itemsIn(cat);
    assert.deepEqual(items.map((i) => i.value), AVATAR_OPTIONS[choice], cat);
    const worn = new Set(STARTER_AVATARS.map((a) => a.config[choice]));
    for (const i of items) assert.equal(i.price, worn.has(i.value) ? 0 : (cat === "outfit" ? OUTFIT_PRICES[i.value] : undefined) ?? FACE_PRICES[cat], i.id);
    assert.ok(items.some(isFree) && items.some((i) => !isFree(i)), `${cat}: some free, some for sale`);
    // Trying one on changes that choice only
    const other = items.find((i) => i.value !== DEFAULT_AVATAR[choice]);
    assert.deepEqual(previewConfig(DEFAULT_AVATAR, other), { ...DEFAULT_AVATAR, [choice]: other.value }, cat);
  }
  assert.deepEqual(["hair", "eyebrows", "eyes", "nose", "mouth", "ears", "headwear", "outfit", "skin"].filter(isFaceCategory), ["eyebrows", "eyes", "nose", "mouth", "ears"]);
  assert.ok(itemsIn("eyebrows").length >= 8 && itemsIn("eyes").length >= 8 && itemsIn("nose").length >= 9 && itemsIn("mouth").length >= 8 && itemsIn("ears").length >= 6 && itemsIn("outfit").length >= 17 && itemsIn("headwear").length >= 13 && itemsIn("eyewear").length >= 10 && itemsIn("earwear").length >= 9);
});

test("the tabs on the panel: the face and the accessories each share one tab (vertical tabs inside), everything else has a tab of its own", () => {
  assert.deepEqual(SHOP_TABS.map((t) => t.id), ["hair", "face", "accessories", "skin", "paint", "pattern"]);
  assert.deepEqual(tabById("accessories").categories, ["headwear", "eyewear", "earwear", "outfit"]);
  assert.equal(new Set(SHOP_TABS.map((t) => t.id)).size, SHOP_TABS.length);
  assert.deepEqual(tabById("face").categories, ["eyebrows", "eyes", "nose", "mouth", "ears"]);
  // Every category is in exactly one tab, and every tab and category has an icon and a name
  const all = SHOP_TABS.flatMap((t) => t.categories);
  assert.equal(new Set(all).size, all.length);
  assert.deepEqual([...all].sort(), SHOP_CATEGORIES.map((c) => c.id).sort());
  for (const t of SHOP_TABS) assert.ok(t.label.trim() && t.icon && t.categories.length >= 1, t.id);
  assert.deepEqual(SHOP_TABS.filter((t) => t.categories.length > 1).map((t) => t.id), ["face", "accessories"]);
  assert.equal(tabById("nope").id, "hair", "an unknown tab falls back to the first");
});

test("brows, pupils and the nose are coloured too; nothing to colour, no swatches; natural shows what it would be", () => {
  const { HAIR_COLORS, SKIN_TONES, PUPIL_COLORS, NOSE_COLORS } = loadTs("components/avatar/avatar-core.ts");
  const item = (cat, value) => itemsIn(cat).find((i) => i.value === value);
  assert.equal(colorChoiceOf(item("eyebrows", "arched")), "browColor");
  assert.equal(colorChoiceOf(item("eyes", "round")), "pupilColor");
  assert.equal(colorChoiceOf(item("nose", "button")), "noseColor");
  for (const [cat, value] of [["eyebrows", "none"], ["nose", "none"], ["eyes", "arches"]]) assert.equal(colorChoiceOf(item(cat, value)), null, `${cat} ${value} has nothing to colour`);
  const brow = colorOptions("browColor", { hairColor: "ginger", skin: "warm" });
  assert.deepEqual(brow.map((o) => o.id), ["natural", ...Object.keys(HAIR_COLORS)]);
  assert.equal(brow[0].color, HAIR_COLORS.ginger.shade, "natural brows are the hair's shade");
  const noses = colorOptions("noseColor", { hairColor: "brown", skin: "deep" });
  assert.deepEqual(noses.map((o) => o.id), ["natural", ...Object.keys(NOSE_COLORS)]);
  assert.equal(noses[0].color, SKIN_TONES.deep.feature, "a natural nose is the skin's feature colour");
  assert.deepEqual(colorOptions("pupilColor").map((o) => o.id), Object.keys(PUPIL_COLORS));
  for (const choice of ["browColor", "pupilColor", "noseColor", "hairColor", "outfitColor", "headwearColor", "eyewearColor", "earwearColor"]) {
    const list = colorOptions(choice);
    assert.equal(new Set(list.map((o) => o.name)).size, list.length, `${choice}: names are unique`);
    assert.ok(list.every((o) => /^#[0-9A-F]{6}$/i.test(o.color)), choice);
  }
  assert.equal(withColor(DEFAULT_AVATAR, "pupilColor", "blue").pupilColor, "blue");
});

test("accessories and clothes: bare is free, the rest costs; colourable except bare; tiles look closer where the thing is small", () => {
  const { WEAR_COLORS } = loadTs("components/avatar/avatar-core.ts");
  const { tileZoom, OUTFIT_PRICES, FACE_PRICES } = loadTs("components/shop/shop-core.ts");
  for (const [cat, choice, color] of [["headwear", "headwear", "headwearColor"], ["eyewear", "eyewear", "eyewearColor"], ["earwear", "earwear", "earwearColor"]]) {
    const items = itemsIn(cat);
    assert.equal(items[0].value, "none", `${cat}: bare first`);
    assert.ok(isFree(items[0]) && items.slice(1).every((i) => i.price === FACE_PRICES[cat]), cat);
    assert.equal(colorChoiceOf(items[0]), null, `${cat}: bare has nothing to colour`);
    assert.equal(colorChoiceOf(items[1]), color, cat);
    assert.deepEqual(colorOptions(color).map((o) => o.id), Object.keys(WEAR_COLORS));
    assert.deepEqual(previewConfig(DEFAULT_AVATAR, items[1]), { ...DEFAULT_AVATAR, [choice]: items[1].value });
  }
  // The fancier clothes cost more than a plain top; every price is a known id
  for (const id of Object.keys(OUTFIT_PRICES)) assert.ok(AVATAR_OPTIONS.outfit.includes(id), id);
  assert.ok(Object.values(OUTFIT_PRICES).every((p) => p > FACE_PRICES.outfit));
  assert.deepEqual(["hair", "eyebrows", "eyewear", "earwear", "outfit", "headwear", "skin"].map(tileZoom), [undefined, "face", "face", "ears", "chest", undefined, undefined]);
});

test("levels: free items are open, a paid item opens at its price's tier and a long shelf opens up gradually", () => {
  for (const i of SHOP_ITEMS) {
    assert.ok(Number.isInteger(i.level) && i.level >= 1 && i.level <= MAX_UNLOCK_LEVEL, i.id);
    if (i.price === 0) assert.equal(i.level, 1, `${i.id}: free is open`);
    else assert.ok(i.level >= (TIER_LEVELS[i.price] ?? 1), `${i.id}: not before its tier`);
  }
  // The first paid item of a shelf is at its tier; the shelf's levels never go down
  for (const c of SHOP_CATEGORIES) {
    const paid = itemsIn(c.id).filter((i) => i.price > 0);
    if (!paid.length) continue;
    assert.equal(paid[0].level, TIER_LEVELS[paid[0].price] ?? 1, `${c.id}: starts at its tier`);
    for (let k = 1; k < paid.length; k++) assert.ok(paid[k].level >= paid[k - 1].level || paid[k].price !== paid[k - 1].price, `${c.id}: levels do not go down`);
  }
  // A long shelf spreads out, and the dearer clothes wait longer than the plain ones
  assert.ok(new Set(itemsIn("hair").map((i) => i.level)).size >= 5, "hair opens up over several levels");
  const outfit = (v) => itemsIn("outfit").find((i) => i.value === v);
  assert.ok(outfit("tuxedo").level > outfit("polo").level, "a tuxedo comes after a polo");
  assert.ok(SHOP_ITEMS.some((i) => i.level === 1 && i.price > 0) === false, "no paid item is open from level 1");
});

test("owned, equipped, locked and for sale", () => {
  const hair = (v) => itemsIn("hair").find((i) => i.value === v);
  const wavy = hair("wavy"); // paid
  const crop = hair("crop"); // free, worn by the default avatar
  const none = new Set();
  const lvl = (n) => ({ owned: none, level: n, config: DEFAULT_AVATAR });
  assert.ok(isOwned(crop, none) && !isOwned(wavy, none), "free is owned, paid is not until bought");
  assert.ok(isOwned(wavy, new Set([wavy.id])));
  assert.ok(isEquipped(crop, DEFAULT_AVATAR) && !isEquipped(wavy, DEFAULT_AVATAR));
  assert.equal(itemStatus(crop, lvl(1)), "equipped");
  assert.equal(itemStatus(wavy, lvl(1)), "locked");
  assert.equal(itemStatus(wavy, lvl(wavy.level)), "for-sale");
  assert.equal(itemStatus(wavy, { owned: new Set([wavy.id]), level: 1, config: DEFAULT_AVATAR }), "owned", "an owned item never shows as locked");
  assert.equal(itemStatus(wavy, { owned: new Set([wavy.id]), level: 1, config: { ...DEFAULT_AVATAR, hairStyle: "wavy" } }), "equipped");
  // Not owned means not equipped, even if the avatar somehow has the value
  assert.equal(itemStatus(wavy, { owned: none, level: 99, config: { ...DEFAULT_AVATAR, hairStyle: "wavy" } }), "for-sale");
  // Bare accessories are free, owned, and equipped by default
  const bare = itemsIn("headwear")[0];
  assert.equal(itemStatus(bare, lvl(1)), "equipped");
});

test("what stops a buy: owned, a locked level, then too few diamonds", () => {
  const wavy = itemsIn("hair").find((i) => i.value === "wavy");
  const ctx = (o) => ({ owned: new Set(), level: wavy.level, diamonds: wavy.price, ...o });
  assert.equal(buyBlock(wavy, ctx({})), null, "exactly enough, exactly the level");
  assert.equal(buyBlock(wavy, ctx({ owned: new Set([wavy.id]) })), "owned");
  assert.equal(buyBlock(wavy, ctx({ level: wavy.level - 1 })), "locked");
  assert.equal(buyBlock(wavy, ctx({ diamonds: wavy.price - 1 })), "poor");
  assert.equal(buyBlock(wavy, ctx({ level: wavy.level - 1, diamonds: 0 })), "locked", "the level is said first");
  assert.equal(buyBlock(itemsIn("hair").find((i) => i.value === "crop"), ctx({})), "owned", "free items are already owned");
});

test("what a starting design wears is owned from the start; every other item, a free skin too, is got first", () => {
  const { STARTER_AVATARS } = loadTs("components/avatar/avatar-core.ts");
  const none = new Set();
  // Starter items: exactly what a starter avatar wears, in every shelf that has choices
  for (const i of SHOP_ITEMS) {
    const { choice } = SHOP_CATEGORIES.find((c) => c.id === i.category);
    const worn = STARTER_AVATARS.some((a) => a.config[choice] === i.value);
    if (["paint", "pattern"].includes(i.category)) assert.equal(i.starter, false, `${i.id}: the defaults are not items`);
    else assert.equal(i.starter, worn, i.id);
    assert.equal(isOwned(i, none), i.starter, i.id);
  }
  // Skins are all free, but only the one the starters have is already theirs
  const skins = itemsIn("skin");
  assert.ok(skins.every((i) => i.price === 0));
  assert.deepEqual(skins.filter((i) => i.starter).map((i) => i.value), ["warm"]);
  const blue = skins.find((i) => i.value === "blue");
  assert.equal(itemStatus(blue, { owned: none, level: 1, config: DEFAULT_AVATAR }), "for-sale", "free, but not yet got");
  assert.equal(buyBlock(blue, { owned: none, level: 1, diamonds: 0 }), null, "a free item can be got with no diamonds");
  assert.equal(itemStatus(blue, { owned: new Set([blue.id]), level: 1, config: DEFAULT_AVATAR }), "owned");
  // Starter items are always free
  assert.ok(SHOP_ITEMS.filter((i) => i.starter).every((i) => i.price === 0 && i.level === 1));
});

test("prices are the base prices times 1.5, whole diamonds, and none ends in 3 or 8", () => {
  assert.equal(PRICE_SCALE, 1.5);
  assert.deepEqual([PAINT_PRICE, PATTERN_PRICE, HAIR_STYLE_PRICE], [30, 45, 40]);
  assert.deepEqual(FACES, { eyebrows: 25, eyes: 30, nose: 25, mouth: 25, ears: 30, headwear: 45, eyewear: 40, earwear: 30, outfit: 60 });
  assert.deepEqual(Object.values(OUTFITS).sort((a, b) => a - b), [90, 90, 90, 90, 90, 120, 120, 120]);
  // Every tier is a price on sale, so no price falls through to level 1
  for (const i of SHOP_ITEMS.filter((x) => x.price > 0)) assert.ok(TIER_LEVELS[i.price] !== undefined, `${i.id}: ${i.price} has a tier`);
  for (const i of SHOP_ITEMS) assert.ok(Number.isInteger(i.price) && ![3, 8].includes(i.price % 10), `${i.id}: ${i.price}`);
});

test("what a level opens: the items between two levels, never what a starter wears, and a mix from every shelf", () => {
  const all = [];
  for (let lv = 2; lv <= 15; lv++) all.push(...itemsUnlockedBetween(lv - 1, lv));
  const paid = SHOP_ITEMS.filter((i) => i.level > 1);
  assert.equal(all.length, paid.length, "every locked item opens at exactly one level");
  assert.equal(new Set(all.map((i) => i.id)).size, all.length);
  assert.deepEqual(itemsUnlockedBetween(1, 1), [], "no level gained, nothing opened");
  assert.deepEqual(itemsUnlockedBetween(1, 3).map((i) => i.id), [...itemsUnlockedBetween(1, 2), ...itemsUnlockedBetween(2, 3)].map((i) => i.id).sort((a, b) => SHOP_ITEMS.findIndex((x) => x.id === a) - SHOP_ITEMS.findIndex((x) => x.id === b)), "several levels at once are the sum, in shelf order");
  assert.ok(itemsUnlockedBetween(1, 2).length > 0, "level 2 opens something");
  assert.ok(itemsUnlockedBetween(1, 2).every((i) => !i.starter && i.level === 2));
  // A mix: one from each shelf in turn, capped, nothing twice
  const mix = featuredUnlocks(itemsUnlockedBetween(1, 6), 8);
  assert.ok(mix.length <= 8 && new Set(mix.map((i) => i.id)).size === mix.length);
  const shelves = new Set(mix.map((i) => i.category));
  assert.ok(shelves.size >= Math.min(mix.length, new Set(itemsUnlockedBetween(1, 6).map((i) => i.category)).size), "the shelves are spread before any is repeated (when there is room)");
  assert.deepEqual(featuredUnlocks([], 8), []);
  assert.deepEqual(featuredUnlocks(itemsUnlockedBetween(1, 2), 0), []);
  assert.equal(featuredUnlocks(itemsUnlockedBetween(1, 15), 4).length, 4);
});
