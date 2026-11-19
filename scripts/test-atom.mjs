/**
 * The Build an Atom lab (components/lab/atom-core.ts): the challenge list and verdicts keep their
 * meaning, nucleus slots never move a particle that is already there, and the drawing maths stays
 * inside the picture.
 *
 * Run: npm run test:atom
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("components/lab/atom-core.ts");
const { ATOM_CHALLENGES, checkAtom, addParticle, removeParticle, countSlots, slotPosition, electronPosition, electronShells, popScale, POP_MS, chargeText, readout, shellAngle, SHELL_RADII, LIMITS } = core;

test("every challenge is a real atom the builder can reach", () => {
  assert.equal(ATOM_CHALLENGES.length, 10);
  for (const t of ATOM_CHALLENGES) {
    assert.ok(t.protons <= LIMITS.protons && t.neutrons <= LIMITS.neutrons && t.electrons <= LIMITS.electrons, t.label);
    assert.ok(t.protons >= 1);
  }
  assert.equal(chargeText(ATOM_CHALLENGES[7].protons, ATOM_CHALLENGES[7].electrons), "+1");
  assert.equal(chargeText(ATOM_CHALLENGES[8].protons, ATOM_CHALLENGES[8].electrons), "−1");
  assert.equal(chargeText(6, 6), "0");
});

test("the verdict names the part that is off, protons first", () => {
  const target = { protons: 6, neutrons: 8, electrons: 6 };
  assert.equal(checkAtom(target, { protons: 6, neutrons: 8, electrons: 6 }).ok, true);
  assert.match(checkAtom(target, { protons: 5, neutrons: 8, electrons: 6 }).hint, /protons/);
  assert.match(checkAtom(target, { protons: 6, neutrons: 6, electrons: 6 }).hint, /neutron/);
  assert.match(checkAtom(target, { protons: 6, neutrons: 8, electrons: 5 }).hint, /Electrons/);
  assert.match(checkAtom(target, { protons: 0, neutrons: 0, electrons: 0 }).hint, /protons/);
});

test("slots: adding fills the lowest free slot and nothing already there moves", () => {
  let s = [];
  for (const k of ["protons", "neutrons", "protons", "neutrons"]) s = addParticle(s, k);
  assert.deepEqual(s, ["protons", "neutrons", "protons", "neutrons"]);
  const before = s.slice();
  s = removeParticle(s, "protons");
  assert.deepEqual(s, ["protons", "neutrons", null, "neutrons"]);
  s = addParticle(s, "neutrons");
  assert.deepEqual(s, ["protons", "neutrons", "neutrons", "neutrons"]);
  assert.equal(before[0], s[0]);
});

test("slots: removing takes the newest of its kind and trims empty ends", () => {
  let s = ["protons", "neutrons", "protons"];
  s = removeParticle(s, "protons");
  assert.deepEqual(s, ["protons", "neutrons"]);
  s = removeParticle(s, "neutrons");
  assert.deepEqual(s, ["protons"]);
  assert.equal(removeParticle(s, "neutrons"), s);
  assert.equal(countSlots(["protons", null, "neutrons", "protons"], "protons"), 2);
});

test("however many particles there are, the scaled nucleus stays inside the first shell", () => {
  const { nucleusFit, TOKEN_R } = core;
  assert.equal(nucleusFit(1), 1);
  assert.equal(nucleusFit(6), 1);
  for (let n = 1; n <= LIMITS.protons + LIMITS.neutrons; n++) {
    const fit = nucleusFit(n);
    assert.ok(fit > 0 && fit <= 1);
    for (let i = 0; i < n; i++) {
      const p = slotPosition(i);
      assert.ok((Math.hypot(p.x - 50, p.y - 50) + TOKEN_R) * fit < SHELL_RADII[0], `slot ${i} of ${n}`);
    }
  }
  assert.ok(nucleusFit(35) < nucleusFit(12));
});

test("electrons sit on their shell's circle and fill 2, 8, 8, 2", () => {
  assert.deepEqual(electronShells(18), [2, 8, 8]);
  assert.deepEqual(electronShells(20), [2, 8, 8, 2]);
  assert.deepEqual(electronShells(0), []);
  const p = electronPosition(1, 3, 8);
  assert.ok(Math.abs(Math.hypot(p.x - 50, p.y - 50) - SHELL_RADII[1]) < 1e-9);
});

test("a new particle pops past its size and settles on it", () => {
  assert.equal(popScale(0), 0);
  assert.ok(Math.max(...Array.from({ length: 27 }, (_, i) => popScale(i * 10))) > 1.15);
  assert.ok(Math.abs(popScale(POP_MS) - 1) < 1e-9);
  assert.equal(popScale(POP_MS + 500), 1);
});

test("the shells turn in alternate directions", () => {
  assert.ok(shellAngle(0, 1000) > 0);
  assert.ok(shellAngle(1, 1000) < 0);
});

test("the readout names the element and the isotope", () => {
  const r = readout({ protons: 6, neutrons: 8, electrons: 6 });
  assert.equal(r.symbol, "C");
  assert.equal(r.isotope, "Carbon-14");
  assert.equal(r.stable, false);
  assert.equal(r.massNumber, 14);
  assert.equal(readout({ protons: 0, neutrons: 0, electrons: 0 }).symbol, "?");
});

test("the demo builds exactly the target, one particle at a time, and says what each kind does", () => {
  const { demoPlan, DEMO } = core;
  for (const t of ATOM_CHALLENGES) {
    const plan = demoPlan(t);
    const n = (k) => plan.steps.filter((s) => s.kind === k).length;
    assert.equal(n("protons"), t.protons, t.label);
    assert.equal(n("neutrons"), t.neutrons, t.label);
    assert.equal(n("electrons"), t.electrons, t.label);
    assert.deepEqual(plan.steps.map((s) => s.at), [...plan.steps.map((s) => s.at)].sort((a, b) => a - b));
    // Protons first, then neutrons, then electrons
    const order = plan.steps.map((s) => s.kind);
    assert.ok(order.lastIndexOf("protons") < Math.max(order.indexOf("electrons"), 0) || n("electrons") === 0);
    assert.ok(plan.captions.some((c) => c.kind === "protons"));
    assert.equal(plan.captions.some((c) => c.kind === "neutrons"), t.neutrons > 0);
    assert.equal(plan.captions.at(-1).kind, "end");
    assert.ok(plan.built > plan.steps.at(-1).at && plan.end === plan.built + DEMO.hold);
    // Every part is on screen long enough to read: from its caption to the next one
    for (let i = 0; i < plan.captions.length - 1; i++) assert.ok(plan.captions[i + 1].at - plan.captions[i].at >= DEMO.dwell, `${t.label} part ${i}`);
  }
});
