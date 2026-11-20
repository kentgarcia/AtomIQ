/**
 * NPC teachers: the Duolingo character skill's measurable rules, the cast's variety, the muted
 * version and the roster data (docs/features/NPC_TEACHERS_SPEC.md §9).
 *
 * Run: npm run test:npc
 * Whether the characters LOOK good is a person looking at `node scripts/render-npcs.mjs <dir>`.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const art = loadTs("components/npc/npc-art.ts");
const { ALLOWED_COLORS, FORBIDDEN_NAMES, MUTE_DARK, MUTE_LIGHT } = loadTs("components/npc/npc-palette.ts");
const { NPC_ROSTER, NPC_LINES } = loadTs("components/npc/npc-roster.ts");
const { contrastRatio } = loadTs("theme/contrast.ts");
const { POP_CIRCLE, popClipPath, popLayout, ARM, BUST_BOTTOM, BUST_MOODS, NPC_MOOD_FADE, EYE, FINGER_W, HEAD, NECK, NPC_BLINKS, NPC_IDLE_PERIODS, NPC_LOOP_MS, NPC_POSES, NPC_VIEWBOX, POSES, SHOULDER, TORSO, buildNpc, hairSideBottom, mutedSpec, armPoints } = art;

const HEX = /^#[0-9A-Fa-f]{6}$/;
const partsOf = (tree) => [...tree.back, ...tree.face, ...tree.top, ...tree.front, ...tree.lids];
const colorsOf = (tree) => partsOf(tree).map((p) => ("fill" in p ? p.fill : p.stroke));
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const lightness = (hex) => { const [r, g, b] = rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ── shape language ──────────────────────────────────────────────────────────

test("every part is a flat colour: no gradients, no alpha, no outlines on fills", () => {
  for (const n of NPC_ROSTER) {
    for (const pose of NPC_POSES) {
      for (const p of partsOf(buildNpc(n.spec, pose))) {
        const c = "fill" in p ? p.fill : p.stroke;
        assert.match(c, HEX, `${n.name}/${pose}: ${c}`);
        assert.ok(!("fill" in p && "stroke" in p), "a part is a fill or a stroke, never both (no outlines)");
        assert.ok(!/gradient|url\(/i.test(p.d), "no paint servers");
      }
    }
  }
});

test("strokes are capsules: arms, fingers, glasses and closed eyes only", () => {
  const allowed = new Set([ARM.w, 17, 14, FINGER_W, 4.6, 5, 7, 3.4, 4, 2.4]);
  for (const n of NPC_ROSTER) for (const pose of NPC_POSES) for (const p of partsOf(buildNpc(n.spec, pose))) if ("stroke" in p) assert.ok(allowed.has(p.sw), `unexpected stroke width ${p.sw}`);
});

// ── proportions (head = 100) ────────────────────────────────────────────────

test("arm thickness is about the neck's width and at most 0.42 of the head", () => {
  assert.ok(Math.abs(ARM.w - NECK.w) / NECK.w <= 0.4, "about the neck");
  assert.ok(Math.abs(ARM.w - 38) <= 1);
  assert.ok(ARM.w / HEAD.width <= 0.42);
});

test("a hand is a circle about half the head wide; fingers are a third of the hand", () => {
  assert.ok(Math.abs((2 * ARM.hand) / HEAD.width - 0.5) <= 0.05);
  assert.ok(Math.abs(FINGER_W - (2 * ARM.hand) / 3) / ((2 * ARM.hand) / 3) <= 0.1);
});

test("the arm's round shoulder end sits fully inside the torso (no ball on the shoulder)", () => {
  const r = ARM.w / 2;
  const R = TORSO.width / 2;
  const cy = TORSO.top + R; // centre of the half-circle top
  for (const side of [-1, 1]) {
    for (let a = 0; a < 360; a += 15) {
      const x = side * SHOULDER.x + r * Math.cos((a * Math.PI) / 180);
      const y = SHOULDER.y + r * Math.sin((a * Math.PI) / 180);
      assert.ok(Math.abs(x) <= R, `x ${x}`);
      if (y < cy) assert.ok(Math.hypot(x, y - cy) <= R, `outside the shoulder curve at ${x},${y}`);
    }
  }
});

test("arms behind the torso are drawn before the neck and torso", () => {
  for (const n of NPC_ROSTER) {
    const back = buildNpc(n.spec, "cheer").back;
    const neck = back.findIndex((p) => "fill" in p && p.d.startsWith("M-8 40H8"));
    assert.ok(neck > 0);
    const sleeves = back.map((p, i) => ("stroke" in p && p.sw === ARM.w ? i : -1)).filter((i) => i >= 0);
    assert.ok(sleeves.length >= 2 && sleeves.every((i) => i < neck), `${n.name}: arms must be behind`);
  }
});

test("a bent arm is two segments within 25% of each other; no arm has more than one bend", () => {
  for (const pose of NPC_POSES) {
    for (const a of POSES[pose].arms) {
      assert.ok(armPoints(a).points.length <= 3, "at most one elbow");
      if (!a.elbow) continue;
      const upper = dist(a.from, a.elbow);
      const fore = dist(a.elbow, a.to);
      assert.ok(Math.abs(upper - fore) / Math.max(upper, fore) <= 0.25, `${pose}: ${upper.toFixed(0)} vs ${fore.toFixed(0)}`);
    }
  }
});

test("a hand on the face is one skin shade darker (skin on skin)", () => {
  for (const pose of NPC_POSES) {
    for (const a of POSES[pose].arms) {
      const onFace = Math.abs(a.to[0]) <= 75 && a.to[1] <= 70;
      if (onFace) assert.equal(a.shadeHand, true, `${pose}: hand at ${a.to}`);
    }
  }
});

test("hands never land in the middle of the chest as a stray dot", () => {
  for (const pose of NPC_POSES) for (const a of POSES[pose].arms) assert.ok(!(Math.abs(a.to[0]) < 30 && a.to[1] > 80 && a.to[1] < 200), `${pose}: ${a.to}`);
});

test("a wave is four fingers at most; every gesture uses at most four digits", () => {
  for (const n of NPC_ROSTER) {
    const front = buildNpc(n.spec, "greet").back.filter((p) => "stroke" in p && p.sw === 17);
    assert.ok(front.length <= 4);
  }
});

// ── face ────────────────────────────────────────────────────────────────────

test("eyes are standing pills with the pupil in the upper half; the teachers have no eyebrows (only an avatar can choose them)", () => {
  assert.ok(EYE.h > EYE.w, "taller than wide");
  const pupilCentre = EYE.y - EYE.h / 2 + 7 + 20 / 2;
  assert.ok(pupilCentre < EYE.y, "upper half");
  assert.ok(Math.abs(2 * EYE.x - 39) <= 1, "close together");
  // A spec that does not ask for brows (every teacher) draws exactly what "none" draws
  const teacher = NPC_ROSTER[0].spec;
  const bare = buildNpc(teacher, "idle");
  assert.deepEqual(buildNpc({ ...teacher, brows: "none" }, "idle"), bare);
  assert.notDeepEqual(buildNpc({ ...teacher, brows: "arched" }, "idle").face, bare.face, "a brow style does draw something");
});

test("every hair style reaches the top of the ear (hair above the ear)", () => {
  const earTop = 2 - 11;
  for (const style of ["bob", "curls", "crop", "bun", "wrap", "buzzcut", "classic", "messy", "sidepart", "curtain", "bowl", "spiky", "wavy", "longer", "undercut", "longstraight", "shortbob", "medium", "highpony", "lowpony", "twintails", "bigbun", "halfup", "longwavy", "curtainbangs"]) assert.ok(hairSideBottom(style) >= earTop - 2, style);
});

/** Highest y (largest value) any command of an absolute path ends on. Enough for the flat bottoms of our shapes. */
function maxY(d) {
  let y = 0;
  let max = -Infinity;
  for (const [, cmd, rest] of d.matchAll(/([MLHVAQZ])([^MLHVAQZ]*)/g)) {
    const n = (rest.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (cmd === "V") y = n[0];
    else if (cmd === "A") y = n[6];
    else if (cmd === "Q") y = n[3];
    else if (cmd === "M" || cmd === "L") y = n[1];
    max = Math.max(max, y);
  }
  return max;
}

test("a fringe's cut-out ends where its cap ends, so no band of hair crosses the eyes", () => {
  for (const n of NPC_ROSTER) {
    for (const p of buildNpc(n.spec, "idle").top) {
      if (!("fill" in p) || !p.evenOdd) continue;
      const subs = p.d.split("M").filter(Boolean).map((x) => `M${x}`);
      assert.equal(subs.length, 2, "an outer cap and an inner cut-out");
      assert.ok(Math.abs(maxY(subs[0]) - maxY(subs[1])) < 0.01, `${n.name}: cap bottom ${maxY(subs[0])} vs cut-out bottom ${maxY(subs[1])}`);
    }
  }
});

// ── cast ────────────────────────────────────────────────────────────────────

test("the cast has seven teachers with distinct names, ids and owned units", () => {
  assert.equal(NPC_ROSTER.length, 7);
  for (const key of ["id", "name", "unitId", "position"]) assert.equal(new Set(NPC_ROSTER.map((n) => n[key])).size, 7, key);
});

test("names are not Duolingo's characters", () => {
  for (const n of NPC_ROSTER) assert.ok(!FORBIDDEN_NAMES.includes(n.name.toLowerCase()), n.name);
});

test("every pair of teachers differs in at least four attributes; outfit colours are distinct", () => {
  const attrs = (s) => [s.skin.base, s.head, s.eyes, s.nose, s.hair.style, s.hair.color, s.outfit.kind, s.outfit.color, s.accent.kind];
  for (let i = 0; i < NPC_ROSTER.length; i++) {
    for (let j = i + 1; j < NPC_ROSTER.length; j++) {
      const a = attrs(NPC_ROSTER[i].spec);
      const b = attrs(NPC_ROSTER[j].spec);
      const differ = a.filter((v, k) => v !== b[k]).length;
      assert.ok(differ >= 4, `${NPC_ROSTER[i].name} and ${NPC_ROSTER[j].name} differ in only ${differ}`);
      assert.notEqual(NPC_ROSTER[i].spec.outfit.color, NPC_ROSTER[j].spec.outfit.color);
    }
  }
});

test("every colour in a spec is #RRGGBB from the official palette or the documented custom list", () => {
  for (const n of NPC_ROSTER) {
    const s = n.spec;
    const all = [s.skin.base, s.skin.shade, s.skin.feature, s.hair.color, s.hair.shade, s.outfit.color, s.outfit.shade, ...(s.outfit.collar ? [s.outfit.collar] : []), s.accent.color, s.accent.shade];
    for (const c of all) assert.ok(HEX.test(c) && ALLOWED_COLORS.has(c.toUpperCase()), `${n.name}: ${c}`);
  }
});

test("a teacher is visible against both page backgrounds (outfit vs white and the dark surface)", () => {
  for (const n of NPC_ROSTER) {
    assert.ok(contrastRatio(n.spec.outfit.color, "#FFFFFF") >= 1.4, `${n.name} on light ${contrastRatio(n.spec.outfit.color, "#FFFFFF").toFixed(2)}`);
    assert.ok(contrastRatio(n.spec.outfit.color, "#131F24") >= 3, `${n.name} on dark ${contrastRatio(n.spec.outfit.color, "#131F24").toFixed(2)}`);
  }
});

test("a sleeve never matches the page: a vest's shirt is not white", () => {
  for (const n of NPC_ROSTER) if (n.spec.outfit.kind === "vest") assert.notEqual((n.spec.outfit.collar ?? "#FFFFFF").toUpperCase(), "#FFFFFF");
});

// ── muted (locked) version ──────────────────────────────────────────────────

test("the muted version is never grey; eye whites and teeth stay white; hands stay visible against clothes", () => {
  for (const n of NPC_ROSTER) {
    const tree = buildNpc(mutedSpec(n.spec), "explain");
    for (const c of colorsOf(tree)) {
      if (c.toUpperCase() === "#FFFFFF") continue; // eye whites, teeth, a white prop face
      const [r, g, b] = rgb(c);
      assert.ok(Math.max(r, g, b) - Math.min(r, g, b) >= 20, `${n.name}: ${c} is grey`);
    }
    const m = mutedSpec(n.spec);
    // Skin and clothes must not share a lightness, or the hands in front of the clothes vanish.
    assert.ok(Math.abs(lightness(m.outfit.color) - lightness(m.skin.base)) >= 0.08, `${n.name}: clothes ${m.outfit.color} vs skin ${m.skin.base}`);
  }
});

test("the muted ramp stays inside the cool pastel range", () => {
  for (const n of NPC_ROSTER) {
    const m = mutedSpec(n.spec);
    for (const c of [m.skin.base, m.hair.color, m.outfit.color]) {
      const [r, g, b] = rgb(c);
      for (let i = 0; i < 3; i++) assert.ok([r, g, b][i] >= MUTE_DARK[i] - 1 && [r, g, b][i] <= MUTE_LIGHT[i] + 1, `${c}`);
    }
  }
});

// ── motion and size ─────────────────────────────────────────────────────────

test("idle periods and blinks fit the loop, so it closes without a jump", () => {
  for (const period of Object.values(NPC_IDLE_PERIODS)) assert.equal(NPC_LOOP_MS % period, 0);
  for (const t of NPC_BLINKS) assert.ok(t > 0 && t + 300 < NPC_LOOP_MS);
});

test("at the smallest ship sizes the hands and pupils still read", () => {
  const scale = (form, heightDp) => heightDp / NPC_VIEWBOX[form].h;
  assert.ok(2 * ARM.hand * scale("hero", 150) >= 18, "hand at hero size");
  assert.ok(13 * scale("head", 80) >= 2, "pupil at banner size");
  assert.ok(13 * scale("head", 48) >= 2, "pupil at chip size");
});

test("the bust is the head form's shape, closer in, with no arms and a shirt that ends at the bottom edge", () => {
  const bust = NPC_VIEWBOX.bust;
  const head = NPC_VIEWBOX.head;
  assert.ok(Math.abs(bust.w / bust.h - head.w / head.h) < 1e-9, "same shape as the head form, so it drops in where it was");
  assert.ok(bust.w < head.w, "closer in");
  assert.ok(BUST_BOTTOM > TORSO.top + 20, "some shirt shows");
  for (const n of NPC_ROSTER) {
    const tree = buildNpc(n.spec, "idle", "bust");
    const full = buildNpc(n.spec, "idle");
    assert.ok(tree.back.length < full.back.length, `${n.name}: no arms in the bust`);
    // the shirt body ends exactly at the crop's bottom edge, with rounded corners (an arc, not a straight cut)
    const shirt = tree.back.find((p) => "fill" in p && p.d.includes("H") && p.d.includes("Q") && p.d.includes(`${Math.round(BUST_BOTTOM * 100) / 100}`));
    assert.ok(shirt, `${n.name}: shirt ends at the bottom edge`);
    assert.equal((shirt.d.match(/Q/g) ?? []).length, 2, `${n.name}: both bottom corners are rounded`);
  }
});

test("the bust only plays expressions: they stay clear of the blinks and close the loop", () => {
  for (const m of BUST_MOODS) {
    assert.ok(m.from > 0 && m.to > m.from && m.to + NPC_MOOD_FADE < NPC_LOOP_MS);
    for (const b of NPC_BLINKS) assert.ok(m.to + NPC_MOOD_FADE < b || m.from > b + 300, `mood ${m.from} overlaps a blink at ${b}`);
  }
  for (let i = 1; i < BUST_MOODS.length; i++) assert.ok(BUST_MOODS[i].from > BUST_MOODS[i - 1].to + NPC_MOOD_FADE, "moods do not overlap");
  const n = NPC_ROSTER[0];
  assert.equal(buildNpc(n.spec, "idle", "bust").moods.length, BUST_MOODS.length);
  assert.equal(buildNpc(n.spec, "idle").moods, undefined, "other forms have none");
});

// ── lines ───────────────────────────────────────────────────────────────────

test("lines are plain text of 20 words or fewer from a known teacher", () => {
  const ids = new Set(NPC_ROSTER.map((n) => n.id));
  for (const l of NPC_LINES) {
    assert.ok(ids.has(l.npcId));
    assert.ok(l.text.trim().split(/\s+/).length <= 20, l.id);
    assert.ok(!/\[\[|<|>/.test(l.text), `${l.id} must be plain text`);
    assert.ok(NPC_POSES.includes(l.pose), `${l.id}: pose ${l.pose}`);
  }
  assert.equal(new Set(NPC_LINES.map((l) => l.id)).size, NPC_LINES.length);
});

// ── pop-out avatars ─────────────────────────────────────────────────────────

test("a pop-out avatar: the circle fits the crop, the head tops it, only the lower half is clipped", () => {
  const vb = NPC_VIEWBOX.pop;
  const { cx, cy, r } = POP_CIRCLE;
  assert.ok(cx - r >= vb.x && cx + r <= vb.x + vb.w, "the circle fits the crop sideways");
  assert.ok(cy + r <= vb.y + vb.h, "and at the bottom");
  assert.ok(HEAD.top < cy - r, "the top of the head rises past the circle's edge");
  assert.ok(cy - r > vb.y, "with room above the circle in the crop");
  assert.ok(!/NaN|undefined/.test(popClipPath()));
  assert.ok(popClipPath().startsWith(`M${vb.x} ${vb.y}`), "the clip starts at the crop's top corner: nothing is cut above the circle's middle");
  // layout for a 100 dp circle: the figure box is 100/(2r) times the crop, its top above the circle, centred on it
  const L = popLayout(100);
  const k = 100 / (2 * r);
  assert.ok(Math.abs(L.height - vb.h * k) < 1e-9 && Math.abs(L.width - vb.w * k) < 1e-9);
  assert.ok(L.top < 0 && Math.abs(L.left + L.width / 2 - 50) < 1e-9);
});
