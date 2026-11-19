/**
 * The learner's avatar: the stored format, the fallbacks that keep old and new values readable, and that
 * every choice a future picker could offer resolves to a drawing that follows the teachers' rules.
 *
 * Run: npm run test:avatar
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("components/avatar/avatar-core.ts");
const { buildNpc, NPC_VIEWBOX } = loadTs("components/npc/npc-art.ts");
const { ALLOWED_COLORS } = loadTs("components/npc/npc-palette.ts");
const { NPC_ROSTER } = loadTs("components/npc/npc-roster.ts");
const { contrastRatio } = loadTs("theme/contrast.ts");
const { AVATAR_OPTIONS, DEFAULT_AVATAR, DEFAULT_AVATAR_VALUE, avatarSpec, normalizeAvatar, normalizeAvatarValue, serializeAvatar } = core;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const colorsOf = (tree) => [...tree.back, ...tree.face, ...tree.top, ...tree.front, ...tree.lids].map((p) => ("fill" in p ? p.fill : p.stroke));
/** The default with exactly one choice changed. */
const variants = () => Object.entries(AVATAR_OPTIONS).flatMap(([key, ids]) => ids.map((id) => ({ key, id, config: { ...DEFAULT_AVATAR, [key]: id } })));

test("the default round-trips through its stored text", () => {
  assert.deepEqual(normalizeAvatar(serializeAvatar(DEFAULT_AVATAR)), DEFAULT_AVATAR);
  assert.equal(normalizeAvatarValue(DEFAULT_AVATAR_VALUE), DEFAULT_AVATAR_VALUE);
});

test("every option of every choice round-trips, so a picker can save whatever it offers", () => {
  for (const { key, id, config } of variants()) assert.deepEqual(normalizeAvatar(serializeAvatar(config)), config, `${key}=${id}`);
});

test("old photo names, empty and missing values read as the default design", () => {
  for (const legacy of ["corgi.png", "profile", "mascot/profile.png", "", "   ", null, undefined]) {
    assert.deepEqual(normalizeAvatar(legacy), DEFAULT_AVATAR, String(legacy));
    assert.equal(normalizeAvatarValue(legacy), DEFAULT_AVATAR_VALUE);
  }
});

test("broken text and unknown ids fall back one choice at a time", () => {
  assert.deepEqual(normalizeAvatar("avatar:v1:{not json"), DEFAULT_AVATAR);
  assert.deepEqual(normalizeAvatar("avatar:v1:42"), DEFAULT_AVATAR);
  assert.deepEqual(normalizeAvatar("avatar:v1:null"), DEFAULT_AVATAR);
  // A newer app saved a hair style this one has never heard of, and a valid skin: keep the skin.
  const mixed = normalizeAvatar('avatar:v1:{"skin":"deep","hairStyle":"mohawk","extra":1}');
  assert.equal(mixed.skin, "deep");
  assert.equal(mixed.hairStyle, DEFAULT_AVATAR.hairStyle);
});

test("equal avatars give equal text whatever order the ids arrive in", () => {
  const a = normalizeAvatarValue('avatar:v1:{"skin":"deep","eyes":"dots"}');
  const b = normalizeAvatarValue('avatar:v1:{"eyes":"dots","skin":"deep"}');
  assert.equal(a, b);
});

test("the default is not a teacher: it differs from each in at least four of the cast's attributes", () => {
  const attrs = (s) => [s.skin.base, s.head, s.eyes, s.nose, s.hair.style, s.hair.color, s.outfit.kind, s.outfit.color, s.accent.kind];
  const mine = attrs(avatarSpec(DEFAULT_AVATAR));
  for (const n of NPC_ROSTER) {
    const theirs = attrs(n.spec);
    assert.ok(mine.filter((v, k) => v !== theirs[k]).length >= 4, n.name);
  }
});

test("every option resolves to a spec of palette colours that draws without a gradient, outline or alpha", () => {
  for (const { key, id, config } of variants()) {
    const spec = avatarSpec(config);
    const tree = buildNpc(spec, "idle");
    for (const c of colorsOf(tree)) assert.ok(HEX.test(c) && ALLOWED_COLORS.has(c.toUpperCase()), `${key}=${id}: ${c}`);
    const svg = JSON.stringify(tree);
    assert.ok(!/gradient|opacity|rgba/i.test(svg), `${key}=${id}`);
  }
});

test("every outfit colour shows on the white page and the dark surface, like the teachers' clothes", () => {
  for (const id of AVATAR_OPTIONS.outfitColor) {
    const spec = avatarSpec({ ...DEFAULT_AVATAR, outfitColor: id });
    assert.ok(contrastRatio(spec.outfit.color, "#FFFFFF") >= 1.4, `${id} on light`);
    assert.ok(contrastRatio(spec.outfit.color, "#131F24") >= 3, `${id} on dark`);
  }
});

test("a vest's sleeves are not white, and the avatar has no prop", () => {
  const vest = avatarSpec({ ...DEFAULT_AVATAR, outfit: "vest" });
  assert.notEqual(vest.outfit.collar.toUpperCase(), "#FFFFFF");
  assert.equal(avatarSpec(DEFAULT_AVATAR).accent.kind, "none");
  // The "none" prop adds nothing to the drawing in any pose.
  for (const pose of ["idle", "greet", "explain", "cheer"]) assert.ok(buildNpc(avatarSpec(DEFAULT_AVATAR), pose).front.every((p) => !("fill" in p) || HEX.test(p.fill)));
});

test("the avatar crop is square and holds the whole head with its hair", () => {
  const vb = NPC_VIEWBOX.avatar;
  assert.equal(vb.w, vb.h);
  assert.ok(vb.y <= -94, "hair top");
  assert.ok(vb.y + vb.h >= 56, "chin");
  assert.ok(vb.x <= -62 && vb.x + vb.w >= 62, "ears");
});

test("the pattern ids are the patterns of pattern-art.ts: words, unique, and every one resolves to real pictures", () => {
  const { PATTERN_COUNT, PATTERN_IDS } = core;
  const { PATTERN_DEFS, PATTERN_GLYPHS, TILE, dealStep, patternDef, tilePlacements } = loadTs("components/avatar/pattern-art.ts");
  assert.equal(PATTERN_COUNT, PATTERN_DEFS.length);
  assert.ok(PATTERN_COUNT >= 30, "a shop worth opening");
  assert.deepEqual(PATTERN_IDS, PATTERN_DEFS.map((d) => d.id));
  assert.equal(new Set(PATTERN_IDS).size, PATTERN_COUNT, "ids are unique");
  assert.equal(new Set(PATTERN_DEFS.map((d) => d.name)).size, PATTERN_COUNT, "names are unique");
  assert.deepEqual(AVATAR_OPTIONS.pattern, ["none", ...PATTERN_IDS]);
  assert.equal(DEFAULT_AVATAR.pattern, "none");
  assert.ok(!PATTERN_IDS.includes("none"));
  for (const d of PATTERN_DEFS) {
    assert.match(d.id, /^[a-z]{3,}$/, `${d.id}: a lower-case word`);
    assert.ok(d.name.length > 2 && d.glyphs.length >= 1, d.id);
    for (const g of d.glyphs) assert.ok(PATTERN_GLYPHS[g], `${d.id}: unknown picture ${g}`);
    assert.equal(patternDef(d.id), d);
  }
  assert.equal(patternDef("p042"), undefined);

  // The glyph dealt to neighbouring points differs whenever the set has more than one picture
  for (const n of [2, 3, 4, 5, 6, 7, 10]) assert.ok(n === 2 || (dealStep(n) * 1) % n !== 0, `step for ${n}`);
  for (const d of PATTERN_DEFS.filter((x) => x.glyphs.length > 1 && x.layout === "dense")) {
    const g = tilePlacements(d).filter((t) => t.y >= 0 && t.y < TILE && t.x >= 0 && t.x < TILE);
    assert.equal(g.length, 12, d.id);
    for (let i = 0; i < 11; i++) if (i % 3 !== 2) assert.notEqual(g[i].glyph, g[i + 1].glyph, `${d.id}: neighbours at ${i}`);
  }
});

test("a pattern tiles without a seam: whatever crosses an edge is drawn again on the other side", () => {
  const { PATTERN_DEFS, TILE, tilePlacements } = loadTs("components/avatar/pattern-art.ts");
  for (const d of PATTERN_DEFS) {
    const all = tilePlacements(d);
    assert.ok(all.length >= 4, d.id);
    const inside = all.filter((t) => t.x >= 0 && t.x < TILE && t.y >= 0 && t.y < TILE);
    for (const t of inside) {
      const half = t.size * 0.62;
      const copies = all.filter((o) => o.glyph === t.glyph && o.size === t.size && o.rotate === t.rotate);
      assert.ok(copies.some((o) => t.x - half < 0 ? o.x === t.x + TILE : t.x + half > TILE ? o.x === t.x - TILE : true), `${d.id}: no copy for ${t.glyph} at ${t.x}`);
    }
    for (const t of all) assert.ok(t.size >= 16 && t.size <= 40, `${d.id}: size ${t.size}`);
  }
});

test("every picture is flat: solid fills and round strokes, inside its 24 box, strokes readable", () => {
  const { PATTERN_GLYPHS } = loadTs("components/avatar/pattern-art.ts");
  for (const [id, shapes] of Object.entries(PATTERN_GLYPHS)) {
    assert.ok(shapes.length >= 1, id);
    for (const s of shapes) {
      assert.ok(["p", "l", "c", "r"].includes(s.t), `${id}: ${s.t}`);
      if (s.t === "p" || s.t === "l") assert.ok(/^M/.test(s.d) && !s.d.includes("url("), id);
      if (s.t === "l" || s.t === "r") assert.ok(s.w >= 1.7 && s.w <= 4.8, `${id}: stroke ${s.w}`);
      if (s.t === "c") assert.ok(s.cx - s.r >= 0 && s.cx + s.r <= 24 && s.cy - s.r >= 0 && s.cy + s.r <= 24, `${id}: circle out of the box`);
    }
  }
});

test("an avatar saved before patterns existed reads with no pattern, and a pattern round-trips", () => {
  const old = 'avatar:v1:{"skin":"deep","background":"mint"}';
  const read = normalizeAvatar(old);
  assert.equal(read.pattern, "none");
  assert.equal(read.background, "mint");
  const patterned = { ...DEFAULT_AVATAR, pattern: "atomlab" };
  assert.deepEqual(normalizeAvatar(serializeAvatar(patterned)), patterned);
  assert.equal(normalizeAvatar('avatar:v1:{"pattern":"p999"}').pattern, "none");
  // An avatar saved with one of the old picture tiles (p000 to p083) reads as no pattern
  assert.equal(normalizeAvatar('avatar:v1:{"pattern":"p042","background":"mint"}').pattern, "none");
  assert.equal(normalizeAvatar('avatar:v1:{"pattern":"atomlab","background":"mint"}').pattern, "atomlab");
});
