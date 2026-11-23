/**
 * Lesson-map nodes: every glyph is a flat path picture inside its box, every node of the real
 * curriculum gets a glyph, and the node and ring geometry stays consistent.
 *
 * Run: npm run test:path-nodes
 * Whether the glyphs LOOK good is a person looking at `node scripts/render-node-glyphs.mjs <dir>`.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { loadTs } from "./lib/ts-require.mjs";

const { GLYPHS, GLYPH_IDS, GLYPH_VIEWBOX, glyphForNode } = loadTs("components/path/node-glyphs.ts");
const { NODE, DISC_LEFT, FIREFLY_AREA, FACE_SQUASH, PUCK_CENTER_Y, arcPath, clampProgress, ringGeometry, swirlArcs } = loadTs("components/path/node-geometry.ts");

const { BLINK_PERIODS, DRIFT_PERIODS, FIREFLY_LOOP_MS, fireflyCount, fireflyFrame, fireflySpec, shadeColor } = loadTs("components/path/firefly-core.ts");

const { BUBBLE_FX, PREVIEW_FX, bandFrame, launchFrame, particleFrame, popFrame, pressScale, previewInFrame, previewOutFrame, twinkleFrame } = loadTs("components/path/bubble-motion-core.ts");
const { UNIT_PALETTE_COUNT, unitPalette, teacherPalette } = loadTs("components/path/unit-theme.ts");
const { NPC_ROSTER } = loadTs("components/npc/npc-roster.ts");
const { coverColors } = loadTs("components/npc/npc-cover-art.ts");
const { contrastBetween } = loadTs("components/lesson/visual/color-math.ts");
const { WINDOW_BAND, nodeInWindow, windowBand, windowMargin } = loadTs("components/path/map-window-core.ts");
const { BUBBLE, bubbleCopy, bubbleHeight, bubblePlacement, chooseBubbleSide } = loadTs("components/path/node-bubble-core.ts");

const numbersIn = (d) => (d.match(/-?\d*\.?\d+(?:e-?\d+)?/g) ?? []).map(Number);

test("every glyph is data: path strings, no paint servers, no NaN", () => {
  assert.ok(GLYPH_IDS.length >= 12);
  for (const id of GLYPH_IDS) {
    const glyph = GLYPHS[id];
    assert.ok(glyph.shapes.length > 0, id);
    for (const s of glyph.shapes) {
      assert.match(s.d, /^M/, `${id}: a path starts with a move`);
      assert.ok(!/url\(|gradient/i.test(s.d), id);
      assert.ok(!/NaN|undefined|Infinity/.test(s.d), `${id}: bad number in ${s.d}`);
      assert.ok(numbersIn(s.d).every(Number.isFinite), id);
      if (s.sw !== undefined) assert.ok(s.sw > 0 && s.sw <= 6, `${id}: stroke ${s.sw}`);
    }
  }
});

test("every glyph stays inside its 48 grid, with room for the stroke", () => {
  for (const id of GLYPH_IDS) {
    for (const s of GLYPHS[id].shapes) {
      // Arc commands carry radii and flags that are not coordinates: only check the plain coordinates
      if (/A/.test(s.d)) continue;
      const nums = numbersIn(s.d);
      for (const v of nums) assert.ok(v >= 0 && v <= GLYPH_VIEWBOX, `${id}: ${v} outside the grid`);
    }
  }
});

test("a glyph that is only a stroke has a stroke width", () => {
  for (const id of GLYPH_IDS) {
    for (const s of GLYPHS[id].shapes) {
      if (s.fill === false) assert.ok(s.sw, `${id}: stroked shape without width`);
    }
  }
});

test("kind decides practice and checkpoint, topic decides lessons", () => {
  assert.equal(glyphForNode({ kind: "practice" }), "dumbbell");
  assert.equal(glyphForNode({ kind: "checkpoint" }), "trophy");
  const topics = {
    "atoms-are-everywhere": "atom",
    "protons-neutrons-electrons": "nucleus",
    "elements-and-the-periodic-table": "table",
    isotopes: "isotope",
    "stable-and-unstable-nuclei": "burst",
    "why-nuclei-decay": "trefoil",
    "alpha-beta-gamma": "rays",
    "half-life": "clock",
    "decay-chains": "chain",
    "radioactivity-is-natural": "mountain",
  };
  for (const [lessonId, glyph] of Object.entries(topics)) {
    assert.equal(glyphForNode({ kind: "lesson", lessonId }), glyph, lessonId);
  }
  assert.equal(glyphForNode({ kind: "lesson", lessonId: "x", title: "Radioactive decay and radiation" }), "trefoil");
  assert.equal(glyphForNode({ kind: "lesson", lessonId: "x", title: "Half-life" }), "clock");
  assert.equal(glyphForNode({ kind: "lesson", lessonId: "x", title: "Nuclear power plants" }), "bolt");
  assert.equal(glyphForNode({ kind: "lesson", lessonId: "mystery", title: "Something new" }), "star");
});

test("every glyph id a node can get exists", () => {
  for (const id of ["dumbbell", "trophy", "star", "atom", "nucleus", "table", "isotope", "burst", "trefoil", "rays", "clock", "chain", "mountain", "shield", "pulse", "bolt", "flask", "gauge", "cell", "hourglass", "distance", "scales"]) {
    assert.ok(id in GLYPHS, id);
  }
});

test("each node of the authored curriculum gets a glyph, and lessons with different topics differ", () => {
  const db = new DatabaseSync("content/database/content.db", { readOnly: true });
  const rows = db
    .prepare("select n.kind as kind, n.lesson_id as lessonId, l.title as title from path_nodes n left join lessons l on l.id = n.lesson_id order by n.unit_id, n.position")
    .all();
  assert.ok(rows.length > 0);
  const lessonGlyphs = [];
  for (const row of rows) {
    const id = glyphForNode(row);
    assert.ok(id in GLYPHS, `${row.lessonId ?? row.kind}: ${id}`);
    if (row.kind === "lesson") lessonGlyphs.push(id);
  }
  assert.ok(!lessonGlyphs.includes("star"), `a lesson fell back to the star: ${lessonGlyphs}`);
  assert.equal(new Set(lessonGlyphs).size, lessonGlyphs.length, "no two lessons share a picture");
});

test("node geometry: the side shows below the face, the face is centred, the box holds both", () => {
  assert.ok(NODE.faceH + NODE.lip <= NODE.box);
  assert.equal(DISC_LEFT * 2 + NODE.disc, NODE.box);
  assert.ok(NODE.press < NODE.lip, "pressed, a sliver of side still shows");
  assert.ok(NODE.glyph < NODE.disc * 0.62 && NODE.glyph * FACE_SQUASH < NODE.faceH * 0.7, "the glyph leaves a rim of face around it");
});

test("swirl lines sit on the face and stay clear of the glyph", () => {
  const c = NODE.disc / 2;
  for (const { d, sw } of swirlArcs()) {
    assert.ok(sw > 0);
    const nums = numbersIn(d);
    for (let i = 0; i < nums.length; i++) assert.ok(Number.isFinite(nums[i]));
    const [x, y] = nums;
    const r = Math.hypot(x - c, y - c);
    assert.ok(r > NODE.glyph / 2 + sw, `swirl at radius ${r} runs into the glyph`);
    assert.ok(r + sw / 2 < NODE.disc / 2, "swirl stays inside the face");
  }
});

test("arcPath: a quarter turn and a long way round pick the right arc flag", () => {
  assert.match(arcPath(50, 50, 10, 0, 90), /A10 10 0 0 1 /);
  assert.match(arcPath(50, 50, 10, 0, 270), /A10 10 0 1 1 /);
  assert.match(arcPath(50, 50, 10, 350, 10), /A10 10 0 0 1 /, "wraps past 360");
});

test("progress is pulled into 0 to 1", () => {
  assert.equal(clampProgress(0.4), 0.4);
  assert.equal(clampProgress(-3), 0);
  assert.equal(clampProgress(7), 1);
  assert.equal(clampProgress(Number.NaN), 0);
});

test("ring: the arc starts at 12 o'clock and ends where the progress says", () => {
  const { box, radius } = NODE.ring;
  const empty = ringGeometry(0);
  assert.equal(empty.dash[0], 0);
  assert.deepEqual(empty.start, [box / 2, box / 2 - radius]);
  assert.deepEqual(empty.end, empty.start);

  const half = ringGeometry(0.5);
  assert.ok(Math.abs(half.dash[0] - half.circumference / 2) < 0.02);
  assert.ok(Math.abs(half.end[0] - box / 2) < 0.02 && Math.abs(half.end[1] - (box / 2 + radius)) < 0.02, "half way is 6 o'clock");

  const quarter = ringGeometry(0.25);
  assert.ok(Math.abs(quarter.end[0] - (box / 2 + radius)) < 0.02 && Math.abs(quarter.end[1] - box / 2) < 0.02, "a quarter is 3 o'clock");

  const full = ringGeometry(1);
  assert.ok(Math.abs(full.dash[0] - full.circumference) < 0.02);
});

test("the ring clears the node: it sits outside the face and lip, inside its own box", () => {
  const { radius, stroke, box } = NODE.ring;
  assert.ok(radius - stroke / 2 > NODE.disc / 2 + 4, "inner edge outside the puck's width");
  assert.ok(radius + stroke / 2 <= box / 2, "outer edge inside the ring box");
  // The ring is a full circle round the puck: it clears the side band below and the face's top
  assert.ok(PUCK_CENTER_Y + radius - stroke / 2 > NODE.faceH + NODE.lip, "ring clears the side band");
  assert.ok(PUCK_CENTER_Y - (radius - stroke / 2) < 0, "ring clears the top of the face");
});

test("fireflies: every period divides the loop, so the clock wraps without a jump", () => {
  for (const p of [...DRIFT_PERIODS, ...BLINK_PERIODS]) assert.equal(FIREFLY_LOOP_MS % p, 0, `${p} ms`);
  for (let i = 0; i < 40; i++) {
    const spec = fireflySpec(i);
    const a = fireflyFrame(spec, 0);
    const b = fireflyFrame(spec, FIREFLY_LOOP_MS);
    assert.ok(Math.abs(a.dx - b.dx) < 1e-6 && Math.abs(a.dy - b.dy) < 1e-6 && Math.abs(a.opacity - b.opacity) < 1e-6, `firefly ${i} jumps at the seam`);
  }
});

test("fireflies: the same every render, varied from one to the next, small and gentle", () => {
  assert.deepEqual(fireflySpec(3), fireflySpec(3));
  const radii = new Set(Array.from({ length: 20 }, (_, i) => fireflySpec(i).radius.toFixed(2)));
  assert.ok(radii.size > 10, "sizes vary");
  for (let i = 0; i < 40; i++) {
    const s = fireflySpec(i);
    assert.ok(s.fx >= 0 && s.fx < 1 && s.fy >= 0 && s.fy < 1);
    assert.ok(s.radius >= 1.5 && s.radius <= 3.5, "small lights");
    assert.ok(s.driftX <= 24 && s.driftY <= 18, "gentle drift");
    for (let t = 0; t < FIREFLY_LOOP_MS; t += 997) {
      const f = fireflyFrame(s, t);
      assert.ok(f.opacity >= 0 && f.opacity <= 1, `opacity ${f.opacity}`);
      assert.ok(Math.abs(f.dx) <= s.driftX + 1e-6 && Math.abs(f.dy) <= s.driftY + 1e-6);
    }
  }
});

test("fireflies: they blink out completely, nobody glows all the time, and frame 0 has some lit", () => {
  let lit0 = 0;
  for (let i = 0; i < 20; i++) {
    const s = fireflySpec(i);
    let min = 1;
    let max = 0;
    for (let t = 0; t < FIREFLY_LOOP_MS; t += 250) {
      const o = fireflyFrame(s, t).opacity;
      min = Math.min(min, o);
      max = Math.max(max, o);
    }
    assert.ok(min < 0.02, `firefly ${i} never goes dark`);
    assert.ok(max > 0.45, `firefly ${i} never glows`);
    if (fireflyFrame(s, 0).opacity > 0.15) lit0++;
  }
  assert.ok(lit0 >= 4, `only ${lit0} of 20 are lit at frame 0 (reduced motion shows this frame)`);
});

test("fireflies: a unit gets ample lights, more for a longer unit", () => {
  assert.equal(fireflyCount(0), 0);
  assert.equal(fireflyCount(Number.NaN), 0);
  assert.ok(fireflyCount(100) >= 4);
  assert.ok(fireflyCount(648) >= 12, "a six-node unit has plenty");
  assert.ok(fireflyCount(1200) > fireflyCount(600));
});

test("2.5D puck: a squashed face over a side band, inside the box", () => {
  assert.ok(FACE_SQUASH < 1 && FACE_SQUASH > 0.7, "squashed, but still a disc");
  assert.ok(NODE.faceH + NODE.lip <= NODE.box);
  assert.equal(PUCK_CENTER_Y, (NODE.faceH + NODE.lip) / 2);
});

test("fireflies belong to the current node: a tight patch around its ring, with ample lights", () => {
  assert.ok(FIREFLY_AREA.width >= NODE.ring.box && FIREFLY_AREA.height >= NODE.ring.box);
  assert.ok(FIREFLY_AREA.width <= NODE.ring.box * 1.5 && FIREFLY_AREA.height <= NODE.ring.box * 1.5, "focused on the node, not spread over the map");
  assert.ok(FIREFLY_AREA.count >= 8);
});

test("fireflies take the ring's colour in different lightness", () => {
  const base = "#FABF24";
  assert.equal(shadeColor(base, 0), "#fabf24");
  assert.equal(shadeColor("not a colour", 0.3), "not a colour");
  const light = shadeColor(base, 0.5);
  const dark = shadeColor(base, -0.18);
  const lum = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).reduce((a, b) => a + b, 0);
  assert.ok(lum(light) > lum(base) && lum(dark) < lum(base));
  // The hue stays: red is still the strongest channel and blue the weakest, lighter or darker
  for (const h of [light, dark]) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    assert.ok(r >= g && g >= b, h);
  }
  const shades = new Set(Array.from({ length: 9 }, (_, i) => shadeColor(base, fireflySpec(i).shade)));
  assert.ok(shades.size >= 6, "the nine dots differ in lightness");
  for (let i = 0; i < 40; i++) assert.ok(fireflySpec(i).shade >= -0.2 && fireflySpec(i).shade <= 0.5);
});

test("bubble: sits under the node, inside the map, pointing at it", () => {
  for (const mapWidth of [320, 360, 412, 700]) {
    for (const x of [mapWidth / 2 - 80, mapWidth / 2, mapWidth / 2 + 80, 40, mapWidth - 40]) {
      const p = bubblePlacement({ x, y: 300, mapWidth, current: false });
      assert.ok(p.width <= BUBBLE.maxWidth && p.width <= mapWidth - BUBBLE.margin * 2, `width ${p.width} at ${mapWidth}`);
      assert.ok(p.left >= BUBBLE.margin - 1e-9 && p.left + p.width <= mapWidth - BUBBLE.margin + 1e-9, "inside the map");
      assert.ok(p.top > 300 + NODE.faceH / 2, "under the node");
      const tip = p.left + p.arrowLeft + BUBBLE.arrow / 2;
      assert.ok(p.arrowLeft >= BUBBLE.arrowInset - 1e-9 && p.arrowLeft + BUBBLE.arrow <= p.width - BUBBLE.arrowInset + 1e-9, "pointer clear of the corners");
      if (x >= p.left + BUBBLE.arrowInset + BUBBLE.arrow / 2 && x <= p.left + p.width - BUBBLE.arrowInset - BUBBLE.arrow / 2) assert.ok(Math.abs(tip - x) < 1e-9, "aimed at the node");
    }
  }
});

test("bubble: the current node's ring pushes its bubble lower", () => {
  const a = bubblePlacement({ x: 180, y: 300, mapWidth: 360, current: false });
  const b = bubblePlacement({ x: 180, y: 300, mapWidth: 360, current: true });
  assert.ok(b.top > a.top);
  assert.ok(b.top >= 300 - NODE.box / 2 + PUCK_CENTER_Y + NODE.ring.radius + NODE.ring.stroke / 2 + BUBBLE.gap - 1e-9, "clears the ring");
});

test("bubble: above its node it sits clear of the node (or its ring), pointing down at it", () => {
  for (const current of [false, true]) {
    const p = bubblePlacement({ x: 180, y: 400, mapWidth: 360, current });
    const nodeTop = current ? 400 - NODE.box / 2 + PUCK_CENTER_Y - NODE.ring.radius - NODE.ring.stroke / 2 : 400 - NODE.box / 2;
    assert.ok(Math.abs(p.bottomEdge - (nodeTop - BUBBLE.gap)) < 1e-9, `lower edge ${p.bottomEdge} (current ${current})`);
    assert.ok(p.bottomEdge < 400 - NODE.faceH / 2 + 1, "above the node's face");
  }
});

test("bubble side: below when it fits, above near the navbar, scrolled when neither fits", () => {
  const band = { bandTop: 200, bandBottom: 700 };
  const h = 150;
  // Plenty of room under the node
  assert.deepEqual(chooseBubbleSide({ y: 300, current: false, height: h, ...band }), { side: "below", scrollBy: 0 });
  // Low on the screen (by the navbar): above
  assert.deepEqual(chooseBubbleSide({ y: 640, current: false, height: h, ...band }), { side: "above", scrollBy: 0 });
  // The current node's ring takes room too
  assert.equal(chooseBubbleSide({ y: 600, current: true, height: h, ...band }).side, "above");
  // Under the lesson card at the top: the bubble opens below, away from it
  assert.equal(chooseBubbleSide({ y: 230, current: false, height: h, ...band }).side, "below");
  // A band too short for either side: the smaller scroll, and it is the right way round
  const tight = { bandTop: 200, bandBottom: 420 };
  for (const y of [260, 300, 340, 380]) {
    const c = chooseBubbleSide({ y, current: false, height: h, ...tight });
    assert.notEqual(c.scrollBy, 0, `y ${y}`);
    // Applying the scroll puts the bubble inside the band
    const p = bubblePlacement({ x: 0, y: y - c.scrollBy, mapWidth: 1000, current: false });
    const top = c.side === "below" ? p.top : p.bottomEdge - h;
    const bottom = c.side === "below" ? p.top + h : p.bottomEdge;
    assert.ok(top >= tight.bandTop - 1e-9 && bottom <= tight.bandBottom + 1e-9, `y ${y}: ${c.side} ${c.scrollBy}`);
  }
});

test("bubble height: a longer title or a locked hint makes it taller, and it errs tall", () => {
  const short = bubbleHeight({ title: "Atoms", width: 260, locked: false });
  const long = bubbleHeight({ title: "What is inside a nucleus and why does it matter", width: 260, locked: false });
  assert.ok(long > short);
  assert.ok(bubbleHeight({ title: "Atoms", width: 260, locked: true }) !== short);
  assert.ok(short >= 130 && short <= 190, `one-line bubble about ${short}px`);
  assert.ok(bubbleHeight({ title: "x".repeat(500), width: 260, locked: false }) < 260, "the title lines are capped");
});

test("bubble copy: action for each kind of node, and no status line", () => {
  const locked = bubbleCopy({ kind: "lesson", status: "locked", index: 4, total: 6 });
  assert.equal(locked.actionLabel, null);
  assert.ok(locked.hint && locked.hint.length > 10);
  const now = bubbleCopy({ kind: "lesson", status: "current", index: 0, total: 6 });
  assert.equal(now.actionLabel, "Start");
  assert.equal(now.eyebrow, "Lesson · 1 of 6");
  assert.equal(now.hint, null);
  assert.equal(bubbleCopy({ kind: "lesson", status: "completed", index: 1, total: 6 }).actionLabel, "Review");
  assert.equal(bubbleCopy({ kind: "practice", status: "completed", index: 3, total: 6 }).actionLabel, "Practice again");
  assert.equal(bubbleCopy({ kind: "checkpoint", status: "current", index: 5, total: 6 }).eyebrow, "Checkpoint · 6 of 6");
  assert.equal(bubbleCopy({ kind: "lesson", status: "current", index: 99, total: 3 }).eyebrow, "Lesson · 3 of 3", "index is kept in range");
});

// -- unit palettes ----------------------------------------------------------------------------

const COLORS = {
  lessonHeader: "#FABF24", lessonCardLip: "#D9981A", lessonHeaderText: "#FFFFFF",
  guideLip: "#1899D6", successDark: "#46A302",
  sky: "#7F5AC2", skyLip: "#5F42A0", error: "#EF4444", dangerDark: "#DC2626",
};

test("each of the first units has its own colour, and unit 1 keeps the lesson yellow", () => {
  const faces = [1, 2, 3, 4, 5].map((n) => unitPalette(COLORS, n, false).face);
  assert.equal(new Set(faces).size, UNIT_PALETTE_COUNT);
  assert.equal(unitPalette(COLORS, 1, false).face, COLORS.lessonHeader);
  assert.equal(unitPalette(COLORS, 1, false).ink, COLORS.lessonHeaderText);
});

test("the palettes repeat after the last one, and a bad position still gives a palette", () => {
  assert.deepEqual(unitPalette(COLORS, 1 + UNIT_PALETTE_COUNT, false), unitPalette(COLORS, 1, false));
  for (const n of [0, -3, 2.4]) assert.ok(unitPalette(COLORS, n, false).face);
});

test("every unit's text is the same white, and it reads on the faces after the yellow", () => {
  for (let n = 1; n <= UNIT_PALETTE_COUNT; n++) assert.equal(unitPalette(COLORS, n, false).ink, "#FFFFFF", `unit ${n}`);
  for (let n = 2; n <= UNIT_PALETTE_COUNT; n++) {
    const p = unitPalette(COLORS, n, false);
    assert.ok(contrastBetween(p.face, p.ink) >= 3, `unit ${n}: white on the face is ${contrastBetween(p.face, p.ink).toFixed(2)}:1`);
  }
});

test("a unit with a teacher wears the teacher's cover colour (face), its shade (lip) and the same white text", () => {
  for (const npc of NPC_ROSTER) {
    const brand = coverColors(npc.spec);
    const light = teacherPalette(brand, COLORS.lessonHeaderText, false);
    assert.equal(light.face, brand.color, npc.name);
    assert.equal(light.lip, brand.shade, npc.name);
    assert.equal(light.ink, "#FFFFFF");
    // The plain-button text is darker than the face in light mode, and the face itself in dark mode
    assert.ok(contrastBetween("#FFFFFF", light.accent) > contrastBetween("#FFFFFF", light.face), npc.name);
    assert.equal(teacherPalette(brand, COLORS.lessonHeaderText, true).accent, brand.color);
  }
  // The first two units are Hal's yellow (Unit 1) and Ada's pink (Unit 2), and no two teachers share a face
  assert.equal(coverColors(NPC_ROSTER[0].spec).color, "#FFC800");
  assert.equal(coverColors(NPC_ROSTER[1].spec).color, "#FFAADE");
  assert.equal(new Set(NPC_ROSTER.map((n) => coverColors(n.spec).color)).size, NPC_ROSTER.length);
});

test("the plain-button text is darker than the face in light mode and the face itself in dark mode", () => {
  for (let n = 1; n <= UNIT_PALETTE_COUNT; n++) {
    const p = unitPalette(COLORS, n, false);
    assert.ok(contrastBetween("#FFFFFF", p.accent) > contrastBetween("#FFFFFF", p.face), `unit ${n}`);
    assert.equal(unitPalette(COLORS, n, true).accent, p.face);
  }
});

// -- bubble motion (measured from the reference clip) -----------------------------------------------

test("the pop grows from about a third to full size with no overshoot, fading in over the first frames", () => {
  assert.equal(popFrame(0).scale, BUBBLE_FX.popFrom);
  assert.equal(popFrame(0).opacity, 0);
  assert.equal(popFrame(BUBBLE_FX.popMs).scale, 1);
  let last = 0;
  for (let t = 0; t <= BUBBLE_FX.popMs + 100; t += 5) {
    const s = popFrame(t).scale;
    assert.ok(s >= last - 1e-9 && s <= 1, `t=${t}`);
    last = s;
  }
  // Frames 6 and 8 of the clip (1 and 3 frames after it appears): about 55% and 75% of full width (the clip's 0.55 and 0.75)
  assert.ok(Math.abs(popFrame(1000 / 60).scale - 0.55) < 0.12);
  assert.ok(Math.abs(popFrame(3000 / 60).scale - 0.75) < 0.1);
  assert.equal(popFrame(BUBBLE_FX.popFadeMs).opacity, 1);
});

test("the band of light crosses the whole button, slowly at first, then is gone", () => {
  assert.equal(bandFrame(0).opacity, 0);
  assert.equal(bandFrame(BUBBLE_FX.sweepEnd).opacity, 0);
  const mid = (BUBBLE_FX.sweepStart + BUBBLE_FX.sweepEnd) / 2;
  assert.equal(bandFrame(mid).opacity, 1);
  assert.ok(bandFrame(BUBBLE_FX.sweepStart).left < 0, "starts off the left edge");
  assert.ok(bandFrame(BUBBLE_FX.sweepEnd - 1).left > 1, "ends off the right edge");
  // Accelerating: the second half covers more than the first
  const a = bandFrame(mid).left - bandFrame(BUBBLE_FX.sweepStart).left;
  const b = bandFrame(BUBBLE_FX.sweepEnd - 1).left - bandFrame(mid).left;
  assert.ok(b > a);
});

test("the corner sparkles twinkle and are gone by the end of the band", () => {
  for (const i of [0, 1]) {
    assert.equal(twinkleFrame(i, 0).size, 0);
    let peak = 0;
    for (let t = 0; t < 1200; t += 10) peak = Math.max(peak, twinkleFrame(i, t).size);
    assert.ok(peak > 0.5, `sparkle ${i} shows`);
    assert.equal(twinkleFrame(i, 1200).size, 0);
  }
});

test("pressing sinks the bubble to 92%", () => {
  assert.equal(pressScale(0), 1);
  assert.equal(pressScale(1), BUBBLE_FX.pressScale);
  assert.equal(BUBBLE_FX.pressScale, 0.92);
});

test("the launch starts at the pressed size, accelerates up to about 145% and goes see-through, title first", () => {
  const f0 = launchFrame(0);
  assert.equal(f0.scale, BUBBLE_FX.pressScale);
  assert.equal(f0.opacity, 1);
  assert.equal(f0.titleOpacity, 1);
  assert.equal(launchFrame(BUBBLE_FX.titleGoneMs).titleOpacity, 0);
  assert.ok(launchFrame(BUBBLE_FX.launchMs - 1).scale > 1.4);
  // The zoom is done at launchMs, and the bubble has dissolved completely by launchTotalMs
  assert.ok(launchFrame(BUBBLE_FX.launchMs).opacity > 0.3);
  assert.equal(launchFrame(BUBBLE_FX.launchTotalMs).opacity, 0);
  assert.ok(launchFrame(BUBBLE_FX.launchTotalMs).scale > launchFrame(BUBBLE_FX.launchMs).scale);
  // The clip's frames 81..84 (1..4 frames in): 0.94 0.97 1.03 1.10 of the settled width
  const frames = [0.94, 0.97, 1.03, 1.1];
  frames.forEach((want, k) => assert.ok(Math.abs(launchFrame(((k + 1) * 1000) / 60).scale - want) < 0.06, `frame +${k + 1}`));
  // It speeds up
  let last = 0;
  let lastStep = 0;
  for (let t = 0; t < BUBBLE_FX.launchMs; t += 10) {
    const s = launchFrame(t).scale;
    if (t > 0) {
      const step = s - last;
      assert.ok(step >= lastStep - 1e-9, `t=${t}`);
      lastStep = step;
    }
    last = s;
  }
  assert.ok(BUBBLE_FX.launchTotalMs < 300, "interface moves stay under 300 ms");
  // The bubble never gets more see-through as time goes backwards, i.e. it only fades out
  let o = 1;
  for (let t = 0; t <= BUBBLE_FX.launchTotalMs; t += 5) {
    const op = launchFrame(t).opacity;
    assert.ok(op <= o + 1e-9, `t=${t}`);
    o = op;
  }
});

test("the launch burst flies outward from nothing and has dots and sparkles", () => {
  const kinds = new Set();
  for (let i = 0; i < BUBBLE_FX.particleCount; i++) {
    const start = particleFrame(i, 0);
    assert.equal(start.opacity, 0);
    const end = particleFrame(i, BUBBLE_FX.launchMs);
    assert.ok(Math.hypot(end.x, end.y) > 30, `particle ${i} travels`);
    assert.equal(end.opacity, 0);
    kinds.add(end.kind);
  }
  assert.deepEqual([...kinds].sort(), ["dot", "star"]);
});

test("the preview fades in over the dissolving bubble, settling from slightly zoomed, and is solid when the launch ends", () => {
  assert.equal(previewInFrame(0).opacity, 0, "not yet at the start");
  assert.equal(previewInFrame(PREVIEW_FX.delay).opacity, 0);
  assert.ok(previewInFrame(PREVIEW_FX.delay + 10).opacity > 0, "starts while the bubble is still zooming");
  assert.equal(previewInFrame(PREVIEW_FX.delay + PREVIEW_FX.inMs).opacity, 1);
  assert.equal(previewInFrame(PREVIEW_FX.delay + PREVIEW_FX.inMs).scale, 1);
  assert.equal(previewInFrame(PREVIEW_FX.delay).scale, PREVIEW_FX.fromScale);
  assert.ok(PREVIEW_FX.delay + PREVIEW_FX.inMs <= BUBBLE_FX.launchTotalMs, "the page is solid by the time the bubble is gone");
  assert.ok(PREVIEW_FX.delay < BUBBLE_FX.launchMs, "it begins during the zoom");
});

test("the preview leaves by fading and shrinking a little, in under 300 ms", () => {
  assert.equal(previewOutFrame(0).opacity, 1);
  assert.equal(previewOutFrame(0).scale, 1);
  assert.equal(previewOutFrame(PREVIEW_FX.outMs).opacity, 0);
  assert.equal(previewOutFrame(PREVIEW_FX.outMs).scale, PREVIEW_FX.outScale);
  assert.ok(PREVIEW_FX.outMs < 300);
});

test("the map window: steps of scrolling, and a node is drawn when it is near the screen", () => {
  assert.equal(windowBand(0), 0);
  assert.equal(windowBand(WINDOW_BAND - 1), 0);
  assert.equal(windowBand(WINDOW_BAND), 1);
  assert.equal(windowBand(-50), 0, "an over-scroll at the top is step 0");
  assert.equal(windowBand(NaN), 0);
  const view = 700;
  const box = NODE.box;
  // wherever in step 0 the offset is (0 .. WINDOW_BAND-1), every node on the screen is inside the window
  for (const scrollY of [0, 100, WINDOW_BAND - 1]) {
    for (let y = scrollY - box + 1; y < scrollY + view; y += 20) assert.ok(nodeInWindow(y, box, windowBand(scrollY), view), `y ${y} at ${scrollY}`);
  }
  // and so is a screen and a half past it, so a fling does not reach an empty map before the next step
  assert.ok(nodeInWindow(WINDOW_BAND + view + windowMargin(view) - 1, box, 0, view));
  // a node far below or far above is not drawn
  assert.equal(nodeInWindow(5000, box, 0, view), false);
  assert.equal(nodeInWindow(-5000, box, 10, view), false);
  // a long map draws a bounded number of nodes, however many units there are
  const rowGap = 100;
  const nodes = 400;
  const drawn = Array.from({ length: nodes }, (_, i) => 88 + i * rowGap).filter((y) => nodeInWindow(y, box, windowBand(8000), view)).length;
  assert.ok(drawn < 40, `${drawn} of ${nodes} nodes drawn`);
  assert.ok(drawn >= 8, "the screen and its margins are never empty");
});
