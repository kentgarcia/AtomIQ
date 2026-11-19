/**
 * The Radioactive Decay Lab (components/lab/decay-core.ts): the sample follows the half-life law
 * at every moment, the same plan every time, a dot's flash and spark start and end cleanly,
 * scrubbing back restores the dots, and the sounds match the picture.
 *
 * Run: npm run test:decay
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { ISOTOPES, DOTS, MAX_H, MS_PER_HALF_LIFE, PREDICT, CHALLENGE, DISCOVERIES, remainingAtoms, inChallengeRange, planDecay, dotsLeft, atomFrame, formatCount, formatTime, percentLeft, decayCues, curvePath, graphX, graphY } =
  loadTs("components/lab/decay-core.ts");

test("the lab keeps its numbers: 1,000 atoms, 250 after two half-lives, 800 down to about 200", () => {
  assert.equal(remainingAtoms(PREDICT.initial, 1), 500);
  assert.equal(remainingAtoms(PREDICT.initial, 2), PREDICT.answer);
  assert.ok(PREDICT.options.includes(PREDICT.answer));
  assert.equal(remainingAtoms(CHALLENGE.initial, 2), 200);
  assert.ok(inChallengeRange(200) && inChallengeRange(150) && inChallengeRange(250));
  assert.ok(!inChallengeRange(149) && !inChallengeRange(251));
  assert.equal(DISCOVERIES.filter((d) => d.right).length, 1);
});

test("the three isotopes keep their half-lives", () => {
  assert.deepEqual(ISOTOPES.map((i) => [i.label, i.halfLife, i.unit]), [["Carbon-14", 5730, "years"], ["Iodine-131", 8, "days"], ["Technetium-99m", 6, "hours"]]);
});

test("the dots left follow the half-life law to within one dot, at every moment", () => {
  const plan = planDecay();
  assert.equal(plan.length, DOTS);
  for (let h = 0; h <= MAX_H; h += 0.05) {
    const expected = DOTS * Math.pow(0.5, h);
    assert.ok(Math.abs(dotsLeft(plan, h) - expected) <= 1.01, `h=${h}: ${dotsLeft(plan, h)} vs ${expected}`);
  }
  assert.equal(dotsLeft(plan, 0), DOTS);
  assert.equal(dotsLeft(plan, 1), 50);
  assert.equal(dotsLeft(plan, 2), 25);
});

test("the plan is the same every time and the dots do not decay in a tidy order", () => {
  assert.deepEqual(planDecay(), planDecay());
  const plan = planDecay();
  assert.ok(plan.some((a, i) => i > 0 && a.decayAt < plan[i - 1].decayAt));
});

test("a dot is whole until it decays, flashes out, and leaves a finished frame", () => {
  const a = { decayAt: 1, angle: 0 };
  assert.deepEqual(atomFrame(a, 0.5), { scale: 1, opacity: 1, sparkP: 0, sparkOpacity: 0 });
  const peak = Math.max(...Array.from({ length: 13 }, (_, i) => atomFrame(a, 1 + i * 0.01).scale));
  assert.ok(peak > 1.2);
  const end = atomFrame(a, 3);
  assert.equal(end.opacity, 0);
  assert.equal(end.sparkOpacity, 0);
  assert.ok(atomFrame(a, 1.1).sparkOpacity > 0);
});

test("scrubbing back brings a decayed dot back", () => {
  const a = { decayAt: 1, angle: 0 };
  assert.equal(atomFrame(a, 2).opacity, 0);
  assert.equal(atomFrame(a, 0.9).opacity, 1);
});

test("labels read well", () => {
  assert.equal(formatCount(1000), "1,000");
  assert.equal(formatTime(2, ISOTOPES[0]), "11,460 years");
  assert.equal(formatTime(0.5, ISOTOPES[1]), "4 days");
  assert.equal(formatTime(1.5, ISOTOPES[2]), "9 hours");
  assert.equal(percentLeft(1), 50);
  assert.equal(percentLeft(2), 25);
  assert.equal(percentLeft(3), 13);
});

test("the sounds match the picture: one click per dot that decays within the watch, one thud per half-life", () => {
  const plan = planDecay();
  const cues = decayCues(plan);
  assert.equal(cues.filter((c) => c.kind === "click").length, plan.filter((a) => a.decayAt <= MAX_H).length);
  assert.deepEqual(cues.filter((c) => c.kind === "half-life").map((c) => c.n), [1, 2, 3, 4]);
  assert.deepEqual(cues.map((c) => c.at), [...cues.map((c) => c.at)].sort((x, y) => x - y));
  assert.ok(cues.every((c) => c.at >= 0 && c.at <= MAX_H * MS_PER_HALF_LIFE));
});

test("the curve starts at the top left and ends low on the right", () => {
  assert.match(curvePath(300, 120, 14), /^M 14\.0 14\.0 L /);
  assert.equal(graphX(0, 300, 14), 14);
  assert.equal(graphX(MAX_H, 300, 14), 286);
  assert.equal(graphY(0, 120, 14), 14);
  assert.ok(graphY(MAX_H, 120, 14) > graphY(1, 120, 14));
});
