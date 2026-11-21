import assert from "node:assert/strict";
import { test } from "node:test";

import { pathToFileURL } from "node:url";
import path from "node:path";

const load = (file) => import(pathToFileURL(path.join(process.cwd(), file)).href);
const core = await load("components/motion/motion-level-core.ts");
const device = await load("services/device-profile-core.ts");

test("only the three known levels are accepted, anything else is not a choice", () => {
  assert.deepEqual(core.MOTION_LEVELS, ["max", "reduced", "off"]);
  for (const l of core.MOTION_LEVELS) assert.equal(core.normalizeLevel(l), l);
  for (const bad of [null, undefined, "", "MAX", "none", "disabled", 1, {}]) assert.equal(core.normalizeLevel(bad), null);
  for (const l of core.MOTION_LEVELS) assert.ok(core.MOTION_LEVEL_LABEL[l] && core.MOTION_LEVEL_NOTE[l]);
  assert.equal(core.MOTION_LEVEL_LABEL.off, "Disabled");
});

test("a learner who has not chosen gets max, except on a slow phone, which gets reduced", () => {
  assert.equal(core.defaultLevelFor("high"), "max");
  assert.equal(core.defaultLevelFor("mid"), "max");
  assert.equal(core.defaultLevelFor("low"), "reduced");
  assert.equal(core.effectiveLevel(null, "low"), "reduced");
  assert.equal(core.effectiveLevel("max", "low"), "max", "a choice always wins over the default");
  assert.equal(core.effectiveLevel("off", "high"), "off");
});

test("all motion is off at 'off' or when the system asks, never at max or reduced alone", () => {
  assert.equal(core.allMotionOff("max", false), false);
  assert.equal(core.allMotionOff("reduced", false), false);
  assert.equal(core.allMotionOff("off", false), true);
  for (const l of core.MOTION_LEVELS) assert.equal(core.allMotionOff(l, true), true, "the system setting wins");
});

test("idle motion runs only at max, and never when the system asks for reduced motion", () => {
  assert.equal(core.idleOff("max", false), false);
  assert.equal(core.idleOff("reduced", false), true);
  assert.equal(core.idleOff("off", false), true);
  assert.equal(core.idleOff("max", true), true);
});

test("max leaves the device budget exactly as it was; reduced holds idle loops still and halves bursts, never raising anything", () => {
  for (const tier of ["high", "mid", "low"]) {
    const b = device.budgetFor(tier);
    assert.deepEqual(core.budgetForLevel(b, "max"), b);
    const r = core.budgetForLevel(b, "reduced");
    assert.equal(r.idleFps, 0);
    assert.ok(r.particleShare <= 0.5 && r.particleShare <= b.particleShare);
    assert.equal(r.playerCap, b.playerCap, "sound is not part of the animation level");
  }
});
