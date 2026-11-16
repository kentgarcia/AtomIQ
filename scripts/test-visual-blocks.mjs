// Visual lesson block tests (docs/completed/VISUAL_LESSON_BLOCKS.md).  Run: npm run test:visuals
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = process.env.ATOMIQ_DB
  ? path.resolve(process.env.ATOMIQ_DB)
  : path.join(REPO, "content", "database", "content.db");
const mod = await import(pathToFileURL(path.join(REPO, "content", "visual-blocks.ts")).href);
const colorMath = await import(pathToFileURL(path.join(REPO, "components", "lesson", "visual", "color-math.ts")).href);
const { validateVisualBlock, getStepVisuals, barFraction, checkScene, SCENE_LOOP_MS, VISUAL_BLOCK_KINDS, SOURCE_REQUIRED_KINDS } = mod;

// ---- read every authored block -------------------------------------------
// Blocks live in two places since curriculum v2: teaching cards in the content db
// (`data.visual`) and the legacy lessons saved by the cutover, kept for reuse.
const db = new DatabaseSync(DB_PATH, { readOnly: true });
const cardRows = db.prepare("SELECT lesson_id, id, data FROM lesson_cards ORDER BY lesson_id, position").all();
db.close();
const legacyFile = path.join(REPO, "scripts", "content-migration", "legacy", "lessons.json");
const legacyLessons = fs.existsSync(legacyFile) ? JSON.parse(fs.readFileSync(legacyFile, "utf8")) : [];
const blocks = [];
for (const row of cardRows) {
  const data = JSON.parse(row.data);
  if (data.visual) blocks.push({ where: `${row.lesson_id}/${row.id}`, stepType: "card", block: data.visual });
}
for (const lesson of legacyLessons) {
  for (const step of lesson.steps) {
    for (const block of getStepVisuals(step.data)) {
      blocks.push({ where: `legacy ${lesson.id}/${step.id}`, stepType: step.step_type, block });
    }
  }
}

test("there are at least 7 authored visual blocks (cards plus the saved legacy lessons)", () => {
  assert.ok(blocks.length >= 7, `found ${blocks.length}`);
});

test("every block in the content db validates", () => {
  const failures = [];
  for (const { where, block } of blocks) {
    const v = validateVisualBlock(block);
    if (!v.ok) failures.push(`${where} ${block?.id}: ${v.errors.join("; ")}`);
  }
  assert.deepEqual(failures, []);
});

test("block ids are unique", () => {
  const seen = new Map();
  for (const { where, block } of blocks) {
    assert.ok(!seen.has(block.id), `${block.id} duplicated in ${where} and ${seen.get(block.id)}`);
    seen.set(block.id, where);
  }
});

test("visuals are only attached to teaching cards or legacy micro_learn steps", () => {
  for (const { where, stepType } of blocks) assert.ok(stepType === "micro_learn" || stepType === "card", where);
});

test("required metadata is present and meaningful on every block", () => {
  for (const { where, block } of blocks) {
    for (const k of ["learningObjective", "title", "explanation", "altText", "plainText"]) {
      assert.ok(typeof block[k] === "string" && block[k].trim(), `${where} ${block.id}: ${k}`);
    }
    assert.notEqual(block.altText.trim().toLowerCase(), block.title.trim().toLowerCase(), `${block.id}: altText equals title`);
    assert.ok(block.source, `${block.id}: source`);
  }
});

test("every kind that depends on external facts carries a source", () => {
  for (const { block } of blocks) {
    if (SOURCE_REQUIRED_KINDS.includes(block.kind)) assert.ok(block.source, block.id);
  }
});

test("authored content covers the initial candidate kinds", () => {
  const kinds = new Set(blocks.map((b) => b.block.kind));
  for (const k of ["diagram", "process_flow", "model", "comparison_cards", "real_life_example"]) {
    assert.ok(kinds.has(k), `missing kind ${k}`);
  }
});

// ---- validator unit tests ---------------------------------------------------
const good = () => ({
  id: "t-1",
  kind: "process_flow",
  learningObjective: "Order the steps.",
  title: "Steps",
  explanation: "Teaching text.",
  altText: "Two boxes joined by an arrow, first A then B.",
  plainText: "Step A comes first, then step B follows it, and nothing else happens.",
  source: { type: "original", note: "test" },
  steps: [{ label: "Step A" }, { label: "step B" }],
});

test("validator accepts a good block", () => {
  const v = validateVisualBlock(good());
  assert.deepEqual(v.errors, []);
  assert.equal(v.ok, true);
});

test("validator never throws on garbage", () => {
  for (const input of [null, undefined, 5, "x", [], {}, { kind: "diagram" }, { kind: "diagram", scene: 3, callouts: "no" }]) {
    assert.equal(validateVisualBlock(input).ok, false);
  }
});

test("validator rejects missing required fields", () => {
  for (const key of ["id", "learningObjective", "title", "explanation", "altText", "plainText"]) {
    const b = good();
    delete b[key];
    assert.equal(validateVisualBlock(b).ok, false, key);
    const e = good();
    e[key] = "   ";
    assert.equal(validateVisualBlock(e).ok, false, `${key} blank`);
  }
});

test("validator rejects alt text that repeats the title or is too short", () => {
  const b = good();
  b.altText = "  STEPS ";
  assert.match(validateVisualBlock(b).errors.join("|"), /altText/);
  b.altText = "short";
  assert.match(validateVisualBlock(b).errors.join("|"), /altText/);
});

test("validator requires plain text to mention every step label", () => {
  const b = good();
  b.plainText = "Only the first one is described here, and the second is missing entirely.";
  assert.match(validateVisualBlock(b).errors.join("|"), /plainText does not mention step/);
});

test("validator requires a source for comparison cards and original notes", () => {
  const cards = {
    ...good(),
    kind: "comparison_cards",
    steps: undefined,
    plainText: "Item one is small and item two is big, which is the whole comparison.",
    items: [
      { label: "Item one", value: "1" },
      { label: "Item two", value: "2" },
    ],
  };
  delete cards.source;
  assert.match(validateVisualBlock(cards).errors.join("|"), /source is required/);
  cards.source = { type: "original" };
  assert.match(validateVisualBlock(cards).errors.join("|"), /source.note/);
  cards.source = { type: "original", note: "ok" };
  assert.equal(validateVisualBlock(cards).ok, true);
});

test("validator checks scene bounds and callouts", () => {
  const diagram = {
    ...good(),
    kind: "diagram",
    steps: undefined,
    plainText: "A box labelled Alpha and a box labelled Beta are drawn side by side.",
    scene: { height: 40, shapes: [{ t: "rect", x: 10, y: 10, w: 5, h: 5 }] },
    callouts: [
      { id: "1", label: "Alpha", detail: "first", x: 10, y: 10 },
      { id: "2", label: "Beta", detail: "second", x: 20, y: 10 },
    ],
  };
  assert.deepEqual(validateVisualBlock(diagram).errors, []);
  diagram.callouts[1].x = 140;
  assert.match(validateVisualBlock(diagram).errors.join("|"), /callouts\[1\]\.x/);
  diagram.callouts[1].x = 20;
  diagram.scene.shapes.push({ t: "circle", x: 500, y: 5, r: 2 });
  assert.match(validateVisualBlock(diagram).errors.join("|"), /outside/);
  diagram.scene.shapes[1] = { t: "blob" };
  assert.match(validateVisualBlock(diagram).errors.join("|"), /\.t must be/);
});

test("all declared kinds are known to the validator", () => {
  assert.deepEqual([...VISUAL_BLOCK_KINDS].sort(), [
    "annotated_illustration", "comparison_cards", "diagram", "model", "process_flow", "real_life_example",
  ]);
});

test("getStepVisuals tolerates absent or malformed visuals", () => {
  assert.deepEqual(getStepVisuals({}), []);
  assert.deepEqual(getStepVisuals({ visuals: "no" }), []);
  assert.deepEqual(getStepVisuals(null), []);
  assert.equal(getStepVisuals({ visuals: [1, 2] }).length, 2);
});

test("barFraction is monotonic and bounded on a log scale", () => {
  const values = [0.0001, 0.005, 0.1, 5];
  const fr = values.map((v) => barFraction(v, values, "log"));
  for (let i = 1; i < fr.length; i++) assert.ok(fr[i] > fr[i - 1]);
  assert.ok(fr[0] >= 0.04 && fr[fr.length - 1] <= 1);
});

// ---- contrast of the theme roles the renderer uses for labels --------------
function lum(hex) {
  const h = hex.replace("#", "");
  const c = [0, 2, 4].map((i) => {
    const s = parseInt(h.slice(i, i + 2), 16) / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test("figure label roles meet 4.5:1 in light and dark", () => {
  const tokens = fs.readFileSync(path.join(REPO, "theme", "tokens.ts"), "utf8");
  const themes = fs.readFileSync(path.join(REPO, "theme", "themes.ts"), "utf8");
  const grab = (mode, key) => {
    const block = tokens.slice(tokens.indexOf(`  ${mode}: {`), tokens.indexOf("},", tokens.indexOf(`  ${mode}: {`)));
    const m = block.match(new RegExp(`${key}:\\s*"(#[0-9A-Fa-f]{6})"`));
    assert.ok(m, `${mode}.${key}`);
    return m[1];
  };
  const secondary = themes.match(/textSecondary:\s*isLight\s*\?\s*"(#[0-9A-Fa-f]{6})"\s*:\s*"(#[0-9A-Fa-f]{6})"/);
  assert.ok(secondary, "textSecondary");
  for (const [mode, sec] of [["light", secondary[1]], ["dark", secondary[2]]]) {
    const text = grab(mode, "text");
    const surfaces = [grab(mode, "surface"), grab(mode, "surfaceSoft"), grab(mode, "background")];
    for (const bg of surfaces) {
      assert.ok(ratio(text, bg) >= 4.5, `${mode} text on ${bg}: ${ratio(text, bg).toFixed(2)}`);
      assert.ok(ratio(sec, bg) >= 4.5, `${mode} textSecondary on ${bg}: ${ratio(sec, bg).toFixed(2)}`);
    }
    assert.ok(
      ratio(grab(mode, "inverseText"), grab(mode, "inverseSurface")) >= 4.5,
      `${mode} inverse marker label`,
    );
  }
});

// ---- scene motion (idle life as data) -------------------------------------

const sceneWith = (shape) => ({ height: 50, shapes: [shape] });
const motionErrors = (shape) => {
  const errors = [];
  checkScene(sceneWith(shape), "scene", errors);
  return errors;
};
const dot = (motion) => ({ t: "circle", x: 60, y: 25, r: 2, tone: "info", motion });

test("a scene without motion is unchanged", () => {
  assert.deepEqual(motionErrors({ t: "circle", x: 60, y: 25, r: 2, tone: "info" }), []);
});

test("valid orbit, pulse and float pass", () => {
  assert.deepEqual(motionErrors(dot({ kind: "orbit", cx: 50, cy: 25, period: 6000 })), []);
  assert.deepEqual(motionErrors(dot({ kind: "pulse", period: 4000, amount: 0.08, phase: 0.25 })), []);
  assert.deepEqual(motionErrors({ t: "rect", x: 10, y: 10, w: 20, h: 10, motion: { kind: "float", period: 5000, dy: 1.5 } }), []);
});

test("a period must divide the shared loop so it closes without a jump", () => {
  assert.equal(SCENE_LOOP_MS, 60000);
  assert.ok(motionErrors(dot({ kind: "pulse", period: 7000 })).some((e) => /divide/.test(e)));
  assert.ok(motionErrors(dot({ kind: "pulse", period: 1000 })).some((e) => /at least/.test(e)), "too fast to read");
  assert.deepEqual(motionErrors(dot({ kind: "pulse", period: 7500 })), []);
});

test("motion limits keep it small and calm", () => {
  assert.ok(motionErrors(dot({ kind: "pulse", period: 4000, amount: 0.5 })).length > 0);
  assert.ok(motionErrors(dot({ kind: "float", period: 4000, dy: 6 })).length > 0);
  assert.ok(motionErrors(dot({ kind: "spin", period: 4000 })).length > 0);
});

test("orbit is circles only, needs its centre, and has no phase", () => {
  assert.ok(motionErrors({ t: "rect", x: 10, y: 10, w: 8, h: 8, motion: { kind: "orbit", cx: 50, cy: 25, period: 6000 } }).length > 0);
  assert.ok(motionErrors(dot({ kind: "orbit", period: 6000 })).length > 0);
  assert.ok(motionErrors(dot({ kind: "orbit", cx: 50, cy: 25, period: 6000, phase: 0.5 })).some((e) => /phase/.test(e)));
});

test("motion is not allowed on lines or text", () => {
  assert.ok(motionErrors({ t: "text", x: 10, y: 10, text: "hi", motion: { kind: "pulse", period: 4000 } }).some((e) => /circle or rect/.test(e)));
});

// ---- Duolingo-style figure palette (EX-11): a face over a darker lip per tone ------------

test("every tone has a face and a darker lip; the lip stays visible on the card in light, the face in dark", async () => {
  const palette = await import(pathToFileURL(path.join(REPO, "components", "lesson", "visual", "duo-palette.ts")).href);
  const surfaces = { light: "#FFFFFF", dark: "#1F2C33" };
  for (const mode of ["light", "dark"]) {
    for (const tone of palette.DUO_TONES) {
      const { face, lip } = palette.duoShade(tone, mode);
      assert.ok(colorMath.luminanceOf(lip) < colorMath.luminanceOf(face), `${mode}/${tone}: the lip is darker than the face`);
      const need = mode === "light" ? colorMath.contrastBetween(lip, surfaces.light) : colorMath.contrastBetween(face, surfaces.dark);
      assert.ok(need >= (mode === "light" ? 2 : 3), `${mode}/${tone}: ${need.toFixed(2)}:1`);
    }
  }
});

test("the palette is flat hex colour only (no gradients, no alpha)", async () => {
  const src = fs.readFileSync(path.join(REPO, "components", "lesson", "visual", "duo-palette.ts"), "utf8");
  assert.ok(!/gradient|rgba?\(/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")));
  for (const m of src.matchAll(/"(#[0-9A-Fa-f]+)"/g)) assert.match(m[1], /^#[0-9A-Fa-f]{6}$/);
});

test("darken moves toward black and leaves non-hex colours alone", () => {
  assert.equal(colorMath.darken("#FFFFFF", 0.5), "#808080");
  assert.equal(colorMath.darken("#000000", 0.5), "#000000");
  assert.equal(colorMath.darken("transparent", 0.5), "transparent");
});

// ---- lesson redesign (docs/LESSON_VISUAL_SPEC.md) --------------------------
test("lesson, mascot and NPC code never draw SVG gradients or animate an SVG transform string", () => {
  const roots = ["components/lesson", "components/mascot", "components/npc"];
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(path.join(REPO, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (/\.(tsx?|mjs)$/.test(e.name)) files.push(rel);
    }
  };
  roots.forEach(walk);
  const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
  for (const f of files) {
    const src = strip(fs.readFileSync(path.join(REPO, f), "utf8"));
    assert.ok(!/<(Linear|Radial)Gradient\b|<Stop\b/.test(src), `${f}: SVG gradient`);
    assert.ok(!/import[^;]*\b(LinearGradient|RadialGradient|Stop)\b[^;]*from "react-native-svg"/.test(src), `${f}: imports an SVG gradient`);
    assert.ok(!/useAnimatedProps[\s\S]{0,400}\btransform\s*:\s*`/.test(src), `${f}: animated SVG transform string`);
  }
});
