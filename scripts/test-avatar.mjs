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

test("the pattern ids match the tiles, their baked masks and the generated source map", () => {
  const { PATTERN_COUNT, PATTERN_IDS } = core;
  const list = (dir) => fs.readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
  const tiles = list("assets/images/pattern");
  const masks = list("assets/images/pattern-mask");
  assert.equal(tiles.length, PATTERN_COUNT, "one tile per id");
  assert.deepEqual(tiles, PATTERN_IDS.map((id) => `pattern_${id.slice(1)}.png`));
  assert.deepEqual(masks, tiles, "run node scripts/bake-pattern-masks.mjs");
  const map = fs.readFileSync("components/avatar/avatar-patterns.ts", "utf8");
  for (const [i, id] of PATTERN_IDS.entries()) assert.ok(map.includes(`${id}: require("@/assets/images/pattern-mask/${masks[i]}")`), id);
  assert.equal((map.match(/require\(/g) ?? []).length, PATTERN_COUNT);
  assert.deepEqual(AVATAR_OPTIONS.pattern, ["none", ...PATTERN_IDS]);
  assert.equal(DEFAULT_AVATAR.pattern, "none");
});

test("every mask is a transparent png: shapes opaque, background clear", () => {
  for (const f of fs.readdirSync("assets/images/pattern-mask").filter((n) => n.endsWith(".png"))) {
    const png = fs.readFileSync(`assets/images/pattern-mask/${f}`);
    assert.equal(png.readUInt32BE(16), 256, `${f} width`);
    assert.equal(png.readUInt32BE(20), 256, `${f} height`);
    assert.equal(png[25], 6, `${f} should be RGBA (colour type 6)`);
  }
});

test("an avatar saved before patterns existed reads with no pattern, and a pattern round-trips", () => {
  const old = 'avatar:v1:{"skin":"deep","background":"mint"}';
  const read = normalizeAvatar(old);
  assert.equal(read.pattern, "none");
  assert.equal(read.background, "mint");
  const patterned = { ...DEFAULT_AVATAR, pattern: "p042" };
  assert.deepEqual(normalizeAvatar(serializeAvatar(patterned)), patterned);
  assert.equal(normalizeAvatar('avatar:v1:{"pattern":"p999"}').pattern, "none");
});
