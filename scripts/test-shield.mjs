/**
 * The Radiation Shield Lab (components/lab/shield-core.ts): the physics keeps its numbers, the
 * run's picture agrees with the reading (exactly that many particles get through), a stopped
 * particle stops inside the shield, the detector ends on the true reading, and nothing is drawn
 * before the run starts.
 *
 * Run: npm run test:shield
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { BEAM, RADIATIONS, MATERIALS, THICKNESS, detectorReading, planBeam, particleFrame, arrivedAt, readingAt, needleReadingAt, needleAngle, detectorPulse, sourceGlow, shieldWidth, arcPath } =
  loadTs("components/lab/shield-core.ts");

const FRAME = 1000 / 60;
const frames = (to) => Array.from({ length: Math.ceil(to / FRAME) + 2 }, (_, i) => i * FRAME);

test("the detector keeps the lab's numbers", () => {
  assert.equal(detectorReading("gamma", "paper", 5), 66);
  assert.equal(detectorReading("alpha", "paper", 5), 19);
  assert.equal(detectorReading("gamma", "lead", 20), 1);
  assert.ok(detectorReading("gamma", "lead", 10) < 20 && detectorReading("gamma", "paper", 10) > 20);
});

test("more shield, denser shield and easier radiation all read lower or higher the right way", () => {
  for (const r of RADIATIONS) for (const m of MATERIALS) for (let t = THICKNESS.min; t < THICKNESS.max; t++) assert.ok(detectorReading(r.key, m.key, t + 1) <= detectorReading(r.key, m.key, t));
  assert.ok(detectorReading("alpha", "paper", 3) < detectorReading("beta", "paper", 3));
  assert.ok(detectorReading("beta", "paper", 3) < detectorReading("gamma", "paper", 3));
});

test("exactly as many particles pass as the reading says", () => {
  for (const r of RADIATIONS) for (const m of MATERIALS) for (const t of [1, 4, 9, 20]) {
    const plan = planBeam(r.key, m.key, t);
    assert.equal(plan.particles.length, BEAM.count);
    assert.equal(plan.particles.filter((p) => p.survives).length, plan.survivors);
    assert.equal(plan.survivors, Math.round((plan.reading / 100) * BEAM.count));
  }
});

test("a plan is the same every time", () => {
  assert.deepEqual(planBeam("beta", "aluminum", 6), planBeam("beta", "aluminum", 6));
});

test("nothing is drawn before the run starts", () => {
  const plan = planBeam("gamma", "paper", 5);
  for (const p of plan.particles) assert.equal(particleFrame(p, 0, plan.travelMs, 0.4, 0.6).opacity, 0);
  assert.equal(readingAt(plan, 0), 0);
  assert.equal(detectorPulse(plan, 0), 0);
  assert.equal(sourceGlow(0), 1);
});

test("a stopped particle halts inside the shield and fades there", () => {
  const plan = planBeam("gamma", "lead", 8);
  const a = 0.4, b = 0.6;
  const stopped = plan.particles.filter((p) => !p.survives);
  assert.ok(stopped.length > 0);
  for (const p of stopped) {
    for (const t of frames(plan.total)) {
      const f = particleFrame(p, t, plan.travelMs, a, b);
      assert.ok(f.f <= b + 1e-9, `particle past the back face at ${t}`);
      assert.ok(Number.isFinite(f.opacity) && Number.isFinite(f.scale));
    }
    assert.equal(particleFrame(p, plan.total, plan.travelMs, a, b).opacity, 0);
  }
});

test("a survivor crosses the whole track and is gone by the end", () => {
  const plan = planBeam("gamma", "paper", 2);
  const p = plan.particles.find((x) => x.survives);
  assert.ok(p);
  assert.equal(particleFrame(p, p.emitAt + plan.travelMs + 1, plan.travelMs, 0.4, 0.6).f, 1);
  assert.equal(particleFrame(p, plan.total, plan.travelMs, 0.4, 0.6).opacity, 0);
});

test("the reading only grows during a run and ends on the true reading", () => {
  for (const [r, m, t] of [["gamma", "paper", 5], ["beta", "aluminum", 3], ["alpha", "paper", 1], ["gamma", "lead", 20]]) {
    const plan = planBeam(r, m, t);
    let last = -1;
    for (const x of frames(plan.total)) {
      const v = readingAt(plan, x);
      assert.ok(v >= last, `reading fell at ${x}`);
      assert.ok(v <= plan.reading);
      last = v;
    }
    assert.equal(readingAt(plan, plan.total), plan.reading);
    assert.equal(needleReadingAt(plan, plan.total), plan.reading);
  }
});

test("every survivor has arrived by the last arrival plus its ease-in", () => {
  const plan = planBeam("gamma", "paper", 4);
  assert.ok(Math.abs(arrivedAt(plan, plan.total) - plan.survivors) < 1e-6);
});

test("the needle sweeps from -80 to 80 degrees", () => {
  assert.equal(needleAngle(0), -80);
  assert.equal(needleAngle(100), 80);
  assert.equal(needleAngle(500), 80);
});

test("the shield's width grows with its thickness", () => {
  assert.ok(shieldWidth(1, 100) < shieldWidth(10, 100));
  assert.equal(shieldWidth(20, 100), 100);
});

test("an arc is a path from one point to another", () => {
  const d = arcPath(32, 34, 30, 0, 0.5);
  assert.match(d, /^M[\d. -]+ A30 30 0 0 1 [\d. -]+$/);
});

test("a run's sounds match its picture: one hit per stopped particle, one click per survivor", () => {
  const { beamCues, shieldSpan } = loadTs("components/lab/shield-core.ts");
  for (const [r, m, t] of [["gamma", "paper", 5], ["alpha", "lead", 8], ["beta", "aluminum", 3]]) {
    const plan = planBeam(r, m, t);
    const { a, b } = shieldSpan(190, t, 96);
    const cues = beamCues(plan, a, b);
    const count = (k) => cues.filter((c) => c.kind === k).length;
    assert.equal(count("launch"), 1);
    assert.equal(count("done"), 1);
    assert.equal(count("emit"), BEAM.count);
    assert.equal(count("arrive"), plan.survivors);
    assert.equal(count("hit"), BEAM.count - plan.survivors);
    assert.deepEqual(cues.map((c) => c.at), [...cues.map((c) => c.at)].sort((x, y) => x - y));
    assert.equal(cues.at(-1).kind, "done");
    assert.ok(cues.every((c) => c.at >= 0 && c.at <= plan.total));
  }
});

test("the shield sits in the middle of the track and widens with thickness", () => {
  const { shieldSpan } = loadTs("components/lab/shield-core.ts");
  const thin = shieldSpan(200, 1, 96), thick = shieldSpan(200, 20, 96);
  assert.ok(Math.abs((thin.a + thin.b) / 2 - 0.5) < 1e-9);
  assert.ok(thick.b - thick.a > thin.b - thin.a);
});
