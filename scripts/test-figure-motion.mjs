/**
 * The idle motion of lesson figures: the clock's steps, and which figure on a page plays.
 *
 * Run: npm run test:figure-motion
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { advanceFigureClock, createFigureRegistry, figureQuantumMs } from "../components/lesson/visual/figure-motion-core.ts";

const LOOP = 60000;

describe("the clock's step follows the device budget", () => {
  it("steps at 30 a second on a fast phone, 15 on a mid one, and holds frame 0 on a slow one", () => {
    assert.ok(Math.abs(figureQuantumMs(60) - 33.333) < 0.01);
    assert.ok(Math.abs(figureQuantumMs(30) - 66.666) < 0.01);
    assert.equal(figureQuantumMs(0), 0);
  });
});

describe("advanceFigureClock", () => {
  it("does not move between steps, and carries the time it has not used", () => {
    let [t, carry] = [0, 0];
    [t, carry] = advanceFigureClock(t, carry, 16, 66, LOOP);
    assert.deepEqual([t, carry], [0, 16]);
    [t, carry] = advanceFigureClock(t, carry, 16, 66, LOOP);
    [t, carry] = advanceFigureClock(t, carry, 16, 66, LOOP);
    assert.deepEqual([t, carry], [0, 48]);
    [t, carry] = advanceFigureClock(t, carry, 20, 66, LOOP);
    assert.deepEqual([t, carry], [66, 2]);
  });

  it("keeps the speed exact: a second of 60 Hz frames is a second of clock", () => {
    let [t, carry] = [0, 0];
    for (let i = 0; i < 60; i++) [t, carry] = advanceFigureClock(t, carry, 1000 / 60, 1000 / 15, LOOP);
    assert.ok(Math.abs(t + carry - 1000) < 0.001, `${t} + ${carry}`);
  });

  it("only ever lands on a multiple of the step, so its readers see no change in between", () => {
    const q = 1000 / 30;
    let [t, carry] = [0, 0];
    for (let i = 0; i < 500; i++) {
      [t, carry] = advanceFigureClock(t, carry, 13 + (i % 7), q, LOOP);
      assert.ok(Math.abs(t / q - Math.round(t / q)) < 1e-6);
    }
  });

  it("takes several steps at once after a stall, and wraps at the loop", () => {
    assert.deepEqual(advanceFigureClock(0, 0, 250, 50, LOOP), [250, 0]);
    assert.deepEqual(advanceFigureClock(LOOP - 50, 0, 120, 50, LOOP), [50, 20]);
  });

  it("ignores a missing or negative frame time, and a step of 0 passes the time through untouched", () => {
    assert.deepEqual(advanceFigureClock(100, 5, 0, 50, LOOP), [100, 5]);
    assert.deepEqual(advanceFigureClock(100, 5, -30, 50, LOOP), [100, 5]);
    assert.deepEqual(advanceFigureClock(100, 0, 16, 0, LOOP), [100, 16]);
  });
});

describe("the newest moving figure on a page plays", () => {
  it("is the one that joined last, and an earlier one plays again when it leaves", () => {
    const reg = createFigureRegistry();
    const a = {};
    const b = {};
    const leaveA = reg.join(a);
    assert.equal(reg.isNewest(a), true);
    const leaveB = reg.join(b);
    assert.equal(reg.isNewest(a), false);
    assert.equal(reg.isNewest(b), true);
    leaveB();
    assert.equal(reg.isNewest(a), true);
    leaveA();
    assert.equal(reg.isNewest(a), false);
  });

  it("lets a figure in the middle leave without moving the newest", () => {
    const reg = createFigureRegistry();
    const [a, b, c] = [{}, {}, {}];
    reg.join(a);
    const leaveB = reg.join(b);
    reg.join(c);
    leaveB();
    assert.equal(reg.isNewest(c), true);
    assert.equal(reg.isNewest(a), false);
  });

  it("tells subscribers on every join and leave, and not after they unsubscribe", () => {
    const reg = createFigureRegistry();
    let calls = 0;
    const off = reg.subscribe(() => calls++);
    const leave = reg.join({});
    leave();
    assert.equal(calls, 2);
    off();
    reg.join({});
    assert.equal(calls, 2);
  });

  it("leaving twice is harmless", () => {
    const reg = createFigureRegistry();
    const a = {};
    const leave = reg.join(a);
    leave();
    leave();
    assert.equal(reg.isNewest(a), false);
  });
});
