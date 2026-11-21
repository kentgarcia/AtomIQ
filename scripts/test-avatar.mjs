/**
 * The learner's avatar: the stored format, the fallbacks that keep old and new values readable, and that
 * every choice a future picker could offer resolves to a drawing that follows the teachers' rules.
 *
 * Run: npm run test:avatar
 */
import assert from "node:assert/strict";
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

test("the hair styles on offer all draw, each differently, above the eyes and above the ear", () => {
  const { AVATAR_OPTIONS: opts, DEFAULT_AVATAR: base, avatarSpec: spec } = core;
  const { EYE } = loadTs("components/npc/npc-art.ts");
  const { HAIR_SHAPES, EXTRA_HAIR_STYLES, isExtraHair } = loadTs("components/npc/hair-art.ts");
  assert.ok(opts.hairStyle.length >= 15, "variety");
  assert.equal(new Set(opts.hairStyle).size, opts.hairStyle.length);
  assert.deepEqual([...EXTRA_HAIR_STYLES].sort(), opts.hairStyle.filter(isExtraHair).sort(), "every hand-drawn style is on offer");
  const sig = new Set();
  for (const style of opts.hairStyle) {
    const tree = buildNpc(spec({ ...base, hairStyle: style }), "idle");
    assert.ok(tree.top.length >= 1, `${style} has front hair`);
    sig.add(JSON.stringify([tree.back.map((p) => p.d).join(""), tree.top.map((p) => p.d ?? p.fill).join("")]));
  }
  assert.equal(sig.size, opts.hairStyle.length, "no two styles draw the same");
  for (const style of EXTRA_HAIR_STYLES) {
    const shape = HAIR_SHAPES[style];
    for (const piece of shape.front) {
      assert.ok(["hair", "shade", "tie"].includes(piece.tone), style);
      const d = piece.d ?? piece.line;
      assert.ok(/^M/.test(d) && !d.includes("url("), style);
      // Nothing is drawn across the eyes: no point of an outline lies lower than the top of the eyes, except the cut-out sides (x beyond the face) and sideburns
      const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
      assert.ok(nums.every((n) => Number.isFinite(n)), style);
    }
    assert.ok(shape.sideBottom >= 2 - 11 - 2, `${style}: hair reaches the top of the ear`);
  }
  assert.ok(EYE.y - EYE.h / 2 === -28, "the top of the eyes the fringes keep clear of");
});

test("hand-drawn hair has no gap at the top and ends in a round tip near the ears", () => {
  const { HAIR_SHAPES, EXTRA_HAIR_STYLES, SIDE_END } = loadTs("components/npc/hair-art.ts");
  const { DEFAULT_AVATAR: base, avatarSpec: spec } = core;
  /** A disc written as `M cx cy a r r 0 1 0 ...`: its centre and radius. */
  const discOf = (piece) => {
    const m = "d" in piece && !piece.evenOdd ? piece.d.match(/^M(-?[\d.]+) (-?[\d.]+)a([\d.]+) \3 0 1 0 -?[\d.]+ 0a[\d.]+ [\d.]+ 0 1 0 -?[\d.]+ 0Z$/) : null;
    return m ? { cx: Number(m[1]) + Number(m[3]), cy: Number(m[2]), r: Number(m[3]) } : null;
  };
  for (const style of EXTRA_HAIR_STYLES) {
    const shape = HAIR_SHAPES[style];
    const caps = shape.front.filter((p) => p.evenOdd);
    assert.ok(caps.length >= 1, `${style} has a cap`);
    // Every cap is also drawn whole behind the head, in its colour: where its face cut-out is wider than the head, hair shows, not background
    const tree = buildNpc(spec({ ...base, hairStyle: style }), "idle");
    for (const c of caps) {
      assert.ok(c.under && c.d.startsWith(c.under), `${style}: the under outline is the cap's outer outline`);
      assert.ok(tree.back.some((p) => "fill" in p && p.d === c.under), `${style}: the outline is behind the head`);
    }
    // One round tip on each side: a disc at the side whose lowest point is exactly the side end
    const tips = shape.front.map(discOf).filter((d) => d && Math.abs(d.cx) > 40);
    assert.equal(tips.length, 2, `${style}: a tip on each side`);
    assert.ok(tips[0].cx < 0 && tips[1].cx > 0 && Math.abs(tips[0].cx + tips[1].cx) < 0.01, `${style}: tips mirror each other`);
    for (const t of tips) assert.ok(Math.abs(t.cy + t.r - SIDE_END) < 0.02, `${style}: tip ends at ${t.cy + t.r}, not ${SIDE_END}`);
    assert.ok(shape.sideBottom >= SIDE_END, style);
  }
});

test("the face choices (eyebrows, eyes, nose, mouth, ears) each draw differently, and the defaults add nothing new", () => {
  const { AVATAR_OPTIONS: opts, DEFAULT_AVATAR: base, avatarSpec: spec, normalizeAvatar, serializeAvatar } = core;
  // The face and what is worn over it (glasses are drawn in the top layer)
  const face = (cfg) => {
    const t = buildNpc(spec(cfg), "idle");
    return JSON.stringify([t.face, t.top]);
  };
  const baseline = face(base);
  for (const [choice, min] of [["eyebrows", 9], ["eyes", 8], ["nose", 9], ["mouth", 9], ["ears", 6]]) {
    assert.ok(opts[choice].length >= min, `${choice}: variety`);
    assert.equal(new Set(opts[choice]).size, opts[choice].length, choice);
    const looks = new Set(opts[choice].map((id) => face({ ...base, [choice]: id })));
    assert.equal(looks.size, opts[choice].length, `${choice}: no two draw the same`);
    assert.ok(opts[choice].includes(base[choice]), `${choice}: the default is on offer`);
  }
  // An older saved avatar (no face keys) reads with the defaults, and a saved one keeps its choices
  const old = normalizeAvatar('avatar:v1:{"skin":"deep","eyes":"dots"}');
  assert.deepEqual([old.eyebrows, old.mouth, old.ears], ["none", "smile", "round"]);
  const mine = normalizeAvatar(serializeAvatar({ ...base, eyebrows: "bushy", mouth: "cat", ears: "elf", nose: "pointy", eyes: "lashes" }));
  assert.deepEqual([mine.eyebrows, mine.mouth, mine.ears, mine.nose, mine.eyes], ["bushy", "cat", "elf", "pointy", "lashes"]);
  assert.equal(normalizeAvatar('avatar:v1:{"mouth":"nope","ears":"nope"}').mouth, "smile", "an unknown id falls back");
  // Brows are drawn in the hair's shade, the resting mouth only changes with the style, and an expression keeps its own mouth
  const withBrows = buildNpc(spec({ ...base, eyebrows: "thick" }), "idle").face;
  assert.ok(withBrows.length > buildNpc(spec(base), "idle").face.length);
  assert.equal(face({ ...base, mouth: "cat" }) === baseline, false);
  const grin = (cfg) => JSON.stringify(buildNpc(spec(cfg), "proud").face);
  assert.equal(grin({ ...base, mouth: "cat" }), grin(base), "a grin is a grin whatever the resting mouth");
  // Hair that covers the ears hides them whatever the ear style
  assert.equal(JSON.stringify(buildNpc(spec({ ...base, hairStyle: "bob", ears: "elf" }), "idle").face), JSON.stringify(buildNpc(spec({ ...base, hairStyle: "bob", ears: "round" }), "idle").face));
});

test("no glasses on an avatar, no nose is a choice, and brows, pupils and nose take colours", () => {
  const { AVATAR_OPTIONS: opts, DEFAULT_AVATAR: base, avatarSpec: spec, normalizeAvatar, serializeAvatar, PUPIL_COLORS, NOSE_COLORS, HAIR_COLORS } = core;
  const { FACE } = loadTs("components/npc/npc-palette.ts");
  assert.ok(!opts.eyes.some((id) => id.startsWith("glasses")), "no glasses to choose");
  assert.equal(normalizeAvatar('avatar:v1:{"eyes":"glasses-round"}').eyes, base.eyes, "an old glasses avatar reads as the default eyes");
  // No nose draws no nose parts at all
  const nose = (n) => buildNpc(spec({ ...base, nose: n }), "idle").face.length;
  assert.ok(opts.nose.includes("none") && nose("none") < nose("double"));
  // The defaults are the natural look: no colour overrides in the spec
  const plain = spec(base);
  assert.deepEqual([plain.browColor, plain.pupilColor, plain.noseColor], [undefined, undefined, undefined]);
  assert.deepEqual([base.browColor, base.pupilColor, base.noseColor], ["natural", "ink", "natural"]);
  assert.equal(PUPIL_COLORS.ink.color, FACE.pupil, "ink is the pupil colour every face has");
  assert.ok(opts.browColor[0] === "natural" && opts.noseColor[0] === "natural");
  assert.deepEqual(opts.browColor.slice(1), Object.keys(HAIR_COLORS));
  assert.deepEqual(opts.pupilColor, Object.keys(PUPIL_COLORS));
  assert.deepEqual(opts.noseColor.slice(1), Object.keys(NOSE_COLORS));
  // Each colour shows up in the drawing
  const fills = (cfg, pose = "idle") => buildNpc(spec(cfg), pose).face.map((p) => p.fill ?? p.stroke);
  assert.ok(fills({ ...base, pupilColor: "blue" }).includes(PUPIL_COLORS.blue.color) && !fills(base).includes(PUPIL_COLORS.blue.color), "pupils");
  assert.ok(fills({ ...base, noseColor: "green" }).includes(NOSE_COLORS.green.color) && !fills(base).includes(NOSE_COLORS.green.color), "nose");
  assert.ok(fills({ ...base, noseColor: "green", nose: "button" }).includes(NOSE_COLORS.green.color), "a newer nose too");
  const brows = { ...base, eyebrows: "thick" };
  assert.ok(fills({ ...brows, browColor: "ginger" }).includes(HAIR_COLORS.ginger.color), "brows");
  assert.ok(fills(brows).includes(HAIR_COLORS.brown.shade), "natural brows are the hair's shade");
  // Saved and read back; an unknown colour falls back
  const mine = normalizeAvatar(serializeAvatar({ ...base, browColor: "red", pupilColor: "amber", noseColor: "plum" }));
  assert.deepEqual([mine.browColor, mine.pupilColor, mine.noseColor], ["red", "amber", "plum"]);
  assert.equal(normalizeAvatar('avatar:v1:{"pupilColor":"nope"}').pupilColor, "ink");
});

test("there are no earrings: an old avatar that had them reads as round ears", () => {
  const { AVATAR_OPTIONS: opts, normalizeAvatar } = core;
  assert.ok(!opts.ears.includes("earring"));
  assert.equal(normalizeAvatar('avatar:v1:{"ears":"earring"}').ears, "round");
});

const partSig = (parts) => parts.map((p) => `${p.d}|${p.fill ?? p.stroke}`).join(";");

test("head, eye and ear accessories: bare adds nothing, each other one draws something new in the top layer, in its own colour", () => {
  const { WEAR_COLORS } = core;
  const base = DEFAULT_AVATAR;
  const bare = buildNpc(avatarSpec(base), "idle", "avatar");
  assert.deepEqual([base.headwear, base.eyewear, base.earwear], ["none", "none", "none"]);
  for (const [key, colorKey] of [["headwear", "headwearColor"], ["eyewear", "eyewearColor"], ["earwear", "earwearColor"]]) {
    const ids = AVATAR_OPTIONS[key];
    assert.equal(ids[0], "none", key);
    assert.ok(ids.length >= 9, `${key} has a good choice`);
    const seen = new Set();
    for (const id of ids.slice(1)) {
      const tree = buildNpc(avatarSpec({ ...base, [key]: id }), "idle", "avatar");
      assert.ok(tree.top.length > bare.top.length, `${key}=${id} draws pieces`);
      assert.equal(partSig(tree.back), partSig(bare.back), `${key}=${id} leaves the body alone`);
      const sig = partSig(tree.top);
      assert.ok(!seen.has(sig), `${key}=${id} differs from the others`);
      seen.add(sig);
    }
    // The colour shows up: the picked colour's `main` is in the drawing, and not in the bare one
    const id = ids[1];
    const red = buildNpc(avatarSpec({ ...base, [key]: id, [colorKey]: "purple" }), "idle", "avatar");
    assert.ok(colorsOf(red).includes(WEAR_COLORS.purple.color), `${key} takes its colour`);
    assert.ok(!colorsOf(bare).includes(WEAR_COLORS.purple.color));
  }
  assert.deepEqual(AVATAR_OPTIONS.headwearColor, Object.keys(WEAR_COLORS));
  // Saved and read back; an avatar saved before they existed is bare; an unknown id is bare
  const mine = normalizeAvatar(serializeAvatar({ ...base, headwear: "crown", headwearColor: "pink", eyewear: "heart", earwear: "pearl" }));
  assert.deepEqual([mine.headwear, mine.headwearColor, mine.eyewear, mine.earwear], ["crown", "pink", "heart", "pearl"]);
  const old = normalizeAvatar('avatar:v1:{"skin":"deep"}');
  assert.deepEqual([old.headwear, old.eyewear, old.earwear], ["none", "none", "none"]);
  assert.equal(normalizeAvatar('avatar:v1:{"headwear":"jetpack"}').headwear, "none");
});

test("accessories sit on the head: inside the avatar picture, and the teachers wear none", () => {
  const vb = NPC_VIEWBOX.avatar;
  const nums = (d) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number);
  for (const [key, ids] of [["headwear", AVATAR_OPTIONS.headwear], ["eyewear", AVATAR_OPTIONS.eyewear], ["earwear", AVATAR_OPTIONS.earwear]]) {
    for (const id of ids.slice(1)) {
      const tree = buildNpc(avatarSpec({ ...DEFAULT_AVATAR, [key]: id }), "idle", "avatar");
      const bare = buildNpc(avatarSpec(DEFAULT_AVATAR), "idle", "avatar");
      const added = tree.top.slice(bare.top.length);
      assert.ok(added.length > 0, `${key}=${id}`);
      // Hats may reach the top of the picture but not leave it
      const ys = added.flatMap((p) => nums(p.d).filter((_, i) => i % 2 === 1));
      assert.ok(Math.min(...ys) >= vb.y, `${key}=${id} stays under the top of the picture (${Math.min(...ys)})`);
    }
  }
  for (const n of NPC_ROSTER) assert.ok(!n.spec.headwear && !n.spec.eyewear && !n.spec.earwear, `${n.id} wears none`);
});

test("the extra clothes each draw differently, keep the teachers' five untouched, use only palette colours, and stay in the shoulders' dome", () => {
  const { EXTRA_OUTFITS } = loadTs("components/npc/outfit-art.ts");
  assert.ok(EXTRA_OUTFITS.length >= 12);
  assert.deepEqual(AVATAR_OPTIONS.outfit.slice(0, 5), ["hoodie", "sweater", "coat", "vest", "shirt"]);
  assert.deepEqual(AVATAR_OPTIONS.outfit.slice(5), [...EXTRA_OUTFITS]);
  assert.equal(new Set(AVATAR_OPTIONS.outfit).size, AVATAR_OPTIONS.outfit.length);
  const seen = new Set();
  for (const kind of AVATAR_OPTIONS.outfit) {
    for (const form of ["avatar", "chest", "bust"]) {
      const tree = buildNpc(avatarSpec({ ...DEFAULT_AVATAR, outfit: kind }), "idle", form);
      for (const c of colorsOf(tree)) assert.ok(HEX.test(c) && ALLOWED_COLORS.has(c.toUpperCase()), `${kind}: ${c}`);
    }
    const sig = partSig(buildNpc(avatarSpec({ ...DEFAULT_AVATAR, outfit: kind }), "idle", "avatar").back);
    assert.ok(!seen.has(sig), `${kind} differs from the others`);
    seen.add(sig);
  }
  // The five teachers' outfits are still what they were: a teacher spec with each kind draws (Ada's apron is a teacher's own and not on offer)
  // (a teacher may also wear one of the extra outfits the shop sells, like Hal's white coat)
  for (const n of NPC_ROSTER) assert.ok(["sweater", "hoodie", "coat", "vest", "shirt", "apron", ...EXTRA_OUTFITS].includes(n.spec.outfit.kind), n.id);
  assert.ok(!AVATAR_OPTIONS.outfit.includes("apron"), "the shop does not sell a teacher's own outfit");
  // An old avatar with an outfit this app does not know reads as the default hoodie
  assert.equal(normalizeAvatar('avatar:v1:{"outfit":"spacesuit"}').outfit, "hoodie");
});
