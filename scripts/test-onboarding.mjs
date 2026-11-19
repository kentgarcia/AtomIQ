/**
 * Onboarding (services/onboarding-core.ts, components/onboarding/onboarding-fx-core.ts): the order
 * of the steps and where Back goes, when Continue is on, the pitch written from the answers, what
 * is stored, the build moment's timeline, and that the two taste questions are still in the bank.
 *
 * Run: npm run test:onboarding
 */
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("services/onboarding-core.ts");
const fx = loadTs("components/onboarding/onboarding-fx-core.ts");
const { PLAN_FX, planBarFrame, planLineFrame, planTickFrame } = fx;
const {
  STEPS, BAR_STEPS, REASONS, LEVELS, GOALS, PROMPTS, TASTE_ITEM_IDS, EMPTY_ANSWERS,
  stepProgress, hasBar, nextStep, previousStep, canContinue, rowsFor, planLines, recapFor, shrodiLine, choicesFor,
  serializeAnswers, parseAnswers,
} = core;

const state = (over = {}) => ({ answers: { ...EMPTY_ANSWERS }, name: "", agreed: false, ...over });

test("the steps run hello to welcome, and next walks them in order", () => {
  assert.equal(STEPS[0], "hello");
  assert.equal(STEPS.at(-1), "welcome");
  for (let i = 0; i < STEPS.length - 1; i++) assert.equal(nextStep(STEPS[i]), STEPS[i + 1]);
  assert.equal(nextStep("welcome"), null);
});

test("the taste is skipped over when its questions could not be loaded", () => {
  assert.equal(nextStep("plan", { skipTaste: true }), "profile");
  assert.equal(nextStep("plan"), "taste");
  assert.equal(nextStep("goal", { skipTaste: true }), "plan");
});

test("back goes one step, never into the plan, and nowhere from hello, plan or welcome", () => {
  assert.equal(previousStep("why"), "hello");
  assert.equal(previousStep("goal"), "how");
  assert.equal(previousStep("taste"), "goal");
  assert.equal(previousStep("profile"), "taste");
  for (const s of ["hello", "plan", "welcome"]) assert.equal(previousStep(s), null);
  for (const s of STEPS) assert.notEqual(previousStep(s), "plan", "nothing goes back to the plan");
});

test("the bar is empty at hello, never empty or full on a question, only grows, and is full at welcome", () => {
  assert.equal(stepProgress("hello"), 0);
  assert.equal(stepProgress("welcome"), 1);
  let last = 0;
  for (const s of BAR_STEPS) {
    const p = stepProgress(s);
    assert.ok(p > last && p < 1, `${s} fills past the one before it and stays under 1`);
    last = p;
  }
  assert.equal(stepProgress("plan"), stepProgress("goal"), "the plan holds the goal's fill");
  assert.equal(hasBar("plan"), false);
  assert.equal(hasBar("hello"), false);
  assert.equal(hasBar("welcome"), false);
  assert.equal(hasBar("why"), true);
});

test("Continue is off until a choice is made, and the name and consent are both needed", () => {
  const a = (patch) => state({ answers: { ...EMPTY_ANSWERS, ...patch } });
  assert.equal(canContinue("why", a({})), false);
  assert.equal(canContinue("why", a({ reason: "fun" })), true);
  assert.equal(canContinue("level", a({})), false);
  assert.equal(canContinue("level", a({ level: "new" })), true);
  assert.equal(canContinue("goal", a({})), false);
  assert.equal(canContinue("goal", a({ goalMinutes: 5 })), true);
  assert.equal(canContinue("profile", state({ name: "Ada", agreed: false })), false);
  assert.equal(canContinue("profile", state({ name: "   ", agreed: true })), false);
  assert.equal(canContinue("profile", state({ name: " Ada ", agreed: true })), true);
  for (const s of ["hello", "how", "plan", "taste", "welcome"]) assert.equal(canContinue(s, state()), true);
});

test("every question has choices with a label, an icon and a reply, and unique ids", () => {
  for (const [name, list] of [["reasons", REASONS], ["levels", LEVELS], ["goals", GOALS]]) {
    assert.ok(list.length >= 3, name);
    assert.equal(new Set(list.map((c) => c.id)).size, list.length, `${name} ids are unique`);
    for (const c of list) {
      assert.ok(c.label && c.icon && c.reply, `${name}:${c.id}`);
      assert.ok(c.label.length <= 34, `${c.id} label fits a row`);
      assert.ok(c.reply.length <= 70, `${c.id} reply fits a bubble`);
    }
  }
  assert.deepEqual(GOALS.map((g) => g.id), [5, 10, 15, 20]);
});

test("Shrodi says his hint until something is picked, then the reply of that choice", () => {
  for (const step of Object.keys(PROMPTS)) {
    assert.equal(shrodiLine(step, null), PROMPTS[step].hint);
    for (const c of choicesFor(step)) assert.equal(shrodiLine(step, c.id), c.reply);
    assert.equal(shrodiLine(step, "nonsense"), PROMPTS[step].hint, "an unknown pick falls back to the hint");
  }
});

test("the four rows are always the same four, ordered and worded by the reason", () => {
  const ids = (r) => rowsFor(r).map((x) => x.id).sort().join();
  for (const r of [null, ...REASONS.map((x) => x.id)]) assert.equal(ids(r), "ask,keep,learn,play", String(r));
  assert.equal(rowsFor("fun")[0].id, "play");
  assert.equal(rowsFor("news")[0].id, "play");
  assert.equal(rowsFor("school")[0].id, "learn");
  assert.equal(rowsFor("curious")[0].id, "learn");
  assert.notEqual(rowsFor("news")[0].body, rowsFor("fun")[0].body, "news words Myth Buster its own way");
  assert.notEqual(rowsFor("school")[0].body, rowsFor("curious")[0].body);
});

test("the plan repeats the answers back, in three lines, with defaults for a missing answer", () => {
  const lines = planLines({ reason: "news", level: "basics", goalMinutes: 15 });
  assert.equal(lines.length, PLAN_FX.ticks.length, "one line per tick");
  assert.equal(lines.length, PLAN_FX.lines.length);
  assert.match(lines[1].text, /15 minutes/);
  assert.match(lines[0].text, /refresher/);
  assert.match(lines[2].text, /Myth Buster/);
  assert.equal(planLines(EMPTY_ANSWERS).length, 3);
  for (const l of planLines(EMPTY_ANSWERS)) assert.ok(l.text && l.icon);
});

test("the recap has a goal tile that follows the answer, a first-day streak and the starting unit", () => {
  const [goal, streak, unit] = recapFor({ reason: null, level: null, goalMinutes: 20 });
  assert.equal(goal.value, 20);
  assert.equal(streak.value, 1);
  assert.equal(unit.value, 1);
  assert.equal(recapFor(EMPTY_ANSWERS)[0].value, 10, "the default goal is 10");
});

test("answers survive a round trip, and anything unknown is dropped, never thrown on", () => {
  const raw = serializeAnswers({ reason: "career", level: "solid", goalMinutes: 15 }, 1234);
  assert.deepEqual(parseAnswers(raw), { v: 1, reason: "career", level: "solid", goalMinutes: 15, at: 1234 });
  assert.deepEqual(parseAnswers(JSON.stringify({ v: 1, reason: "nope", level: 3, goalMinutes: 7, at: "x" })), { v: 1, reason: null, level: null, goalMinutes: null, at: 0 });
  for (const bad of [null, undefined, "", "{", "[]", "42", JSON.stringify({ v: 2, reason: "fun" }), 5, {}]) assert.equal(parseAnswers(bad), null, String(bad));
  assert.equal(parseAnswers({ v: 1, reason: "fun", level: null, goalMinutes: 5, at: 9 }).reason, "fun", "an object works as well as JSON");
});

/* ---- the build moment ---------------------------------------------------------------------------- */

const steps = (end, step = 1000 / 60) => Array.from({ length: Math.ceil(end / step) + 1 }, (_, i) => i * step);

test("frame 0 is nothing yet: empty bar, lines invisible, ticks absent", () => {
  assert.equal(planBarFrame(0), 0);
  for (let i = 0; i < 3; i++) {
    assert.equal(planLineFrame(0, i).opacity, 0);
    assert.equal(planTickFrame(0, i).opacity, 0);
    assert.equal(planTickFrame(0, i).ringOpacity, 0);
  }
});

test("the last frame is the plain finished checklist and stays so", () => {
  for (const t of [PLAN_FX.total, PLAN_FX.total + 500]) {
    assert.equal(planBarFrame(t), 1);
    for (let i = 0; i < 3; i++) {
      assert.deepEqual(planLineFrame(t, i), { opacity: 1, y: 0 });
      const k = planTickFrame(t, i);
      assert.equal(k.scale, 1);
      assert.equal(k.opacity, 1);
      assert.equal(k.ringOpacity, 0, "no ring is left behind");
    }
  }
});

test("the bar only fills, and is full when the burst goes off", () => {
  let last = -1;
  for (const t of steps(PLAN_FX.total)) {
    const v = planBarFrame(t);
    assert.ok(v >= last - 1e-9, "never shrinks");
    last = v;
  }
  assert.equal(planBarFrame(PLAN_FX.burst), 1);
});

test("each line appears before its tick pops, and line n+1 comes after tick n", () => {
  for (let i = 0; i < 3; i++) {
    assert.ok(PLAN_FX.lines[i] + PLAN_FX.lineMs <= PLAN_FX.ticks[i], `line ${i} is readable before it is ticked`);
    if (i > 0) assert.ok(PLAN_FX.lines[i] >= PLAN_FX.ticks[i - 1], `line ${i} starts after tick ${i - 1} lands`);
  }
  assert.ok(PLAN_FX.burst >= PLAN_FX.ticks[2], "the burst comes after the last tick has started");
  assert.ok(PLAN_FX.total >= PLAN_FX.burst, "the screen waits for the burst");
});

test("a tick pops: starts small, overshoots 1 on the way, settles on 1", () => {
  for (let i = 0; i < 3; i++) {
    const at = PLAN_FX.ticks[i];
    assert.ok(planTickFrame(at + 1, i).scale < 0.6, "starts well under size");
    const peak = Math.max(...steps(300).map((d) => planTickFrame(at + d, i).scale));
    assert.ok(peak > 1.05 && peak <= PLAN_FX.tickPeak + 1e-9, `peak ${peak}`);
    assert.equal(planTickFrame(at + 400, i).scale, 1);
  }
});

test("no value jumps between 60 fps frames", () => {
  let lastBar = 0;
  const lastTick = [1, 1, 1];
  const lastLine = [0, 0, 0];
  for (const t of steps(PLAN_FX.total + 100)) {
    const bar = planBarFrame(t);
    assert.ok(Math.abs(bar - lastBar) < 0.06, "bar step");
    lastBar = bar;
    for (let i = 0; i < 3; i++) {
      const k = planTickFrame(t, i);
      if (t > PLAN_FX.ticks[i] + 20) assert.ok(Math.abs(k.scale - lastTick[i]) < 0.25, `tick ${i} step at ${t}`);
      lastTick[i] = k.scale;
      const l = planLineFrame(t, i).opacity;
      assert.ok(Math.abs(l - lastLine[i]) < 0.3, `line ${i} step`);
      lastLine[i] = l;
    }
  }
});

/* ---- the taste: the bank still has the questions -------------------------------------------------- */

test("both taste questions are in the bundled content database and are easy ones", () => {
  const db = new DatabaseSync(new URL("../assets/database/content.db", import.meta.url).pathname, { readOnly: true });
  try {
    for (const id of TASTE_ITEM_IDS) {
      const row = db.prepare("SELECT type, difficulty FROM items WHERE id = ?").get(id);
      assert.ok(row, `${id} exists in the item bank`);
      assert.ok(["choice", "true_or_myth"].includes(row.type), `${id} is a single-tap question (${row.type})`);
      assert.ok(Number(row.difficulty) <= 1, `${id} is difficulty 1`);
    }
  } finally {
    db.close();
  }
  assert.equal(TASTE_ITEM_IDS.length, 2);
});

/* ---- the first screen's cloud edge ------------------------------------------------------------------ */

const hello = loadTs("components/onboarding/hello-core.ts");

test("the cloud is a few big, low humps that run past both sides of the screen", () => {
  for (const width of [320, 360, 411, 600, 840]) {
    const c = hello.cloudShape(width);
    assert.ok(c.cusps[0] < 0, `${width}: starts left of the screen`);
    assert.ok(c.cusps.at(-1) > width, `${width}: ends right of the screen`);
    const humps = c.cusps.length - 1;
    assert.ok(humps >= 4 && humps <= 6, `${width}: ${humps} humps (a few, not a row of small ones)`);
    assert.ok(c.chord > width / 5, `${width}: each hump is wide`);
    assert.ok(Math.abs(c.rise / c.chord - hello.CLOUD.rise) < 1e-9, `${width}: low and round, ${c.rise / c.chord} of its width`);
    assert.ok(c.rise < c.chord / 2, `${width}: less than a semicircle, so the arc never overhangs`);
    // The arc through two cusps `chord` apart with this radius rises exactly `rise`
    const sagitta = c.radius - Math.sqrt(c.radius ** 2 - (c.chord / 2) ** 2);
    assert.ok(Math.abs(sagitta - c.rise) < 1e-9, `${width}: radius ${c.radius} gives the stated rise`);
  }
});

test("the same proportions on every width, so a tablet is a bigger phone, not a different cloud", () => {
  const a = hello.cloudShape(360);
  const b = hello.cloudShape(720);
  assert.ok(Math.abs(b.rise / a.rise - 2) < 1e-9);
  assert.ok(Math.abs(b.height / a.height - 2) < 1e-9);
});

test("two layers share one outline, the front a gap lower, and both close down to the box's bottom", () => {
  const c = hello.cloudShape(390);
  const gap = c.rise * hello.CLOUD.gap;
  assert.ok(Math.abs(c.height - (c.rise + gap)) < 1e-9);
  assert.ok(gap > c.rise * 0.5 && gap < c.rise, "the back layer shows a clear rim");
  const cuspY = (d) => Number(d.match(/^M[-\d.]+ [-\d.]+L[-\d.]+ ([-\d.]+)/)[1]);
  assert.ok(Math.abs(cuspY(c.back) - c.rise) < 0.01, "the back cusps sit one rise below the top");
  assert.ok(Math.abs(cuspY(c.front) - (c.rise + gap)) < 0.01, "the front cusps sit at the bottom of the box");
  for (const d of [c.back, c.front]) {
    assert.match(d, /Z$/);
    assert.equal((d.match(/A/g) ?? []).length, c.cusps.length - 1, "one arc per hump");
  }
});

test("the cloud is the same every time", () => {
  assert.deepEqual(hello.cloudShape(390), hello.cloudShape(390));
});
