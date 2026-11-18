/**
 * Unit 2 simulation cores: decay wait, decay chain and radiation id
 * (docs/UNIT_2_RADIOACTIVITY_SPEC.md §8).
 *
 * Run: npm run test:decay-sims
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HALF_LIFE_SPREAD, checkDecayWaitData, countText, createDecayWait, goalMet as waitGoalMet, halfLifeBounds, press, pressText, remaining, spreadFor } from "../content/curriculum/decay-wait-core.ts";
import { FINISHED, NOT_FINISHED, checkDecayChainData, createChain, currentNode, goalMet as chainGoalMet, step } from "../content/curriculum/decay-chain-core.ts";
import { checkRadiationIdData, caseAt, createRadiationId, goalMet as idGoalMet, guess, next } from "../content/curriculum/radiation-id-core.ts";

describe("decay-wait: single mode (genuinely random)", () => {
  it("starts with every nucleus unchanged", () => {
    const s = createDecayWait({ mode: "single", count: 20, seed: 1 });
    assert.equal(remaining(s), 20);
    assert.equal(s.presses, 0);
  });

  it("each press changes some nuclei and leaves some, and never un-changes one", () => {
    for (let seed = 1; seed <= 300; seed++) {
      let s = createDecayWait({ mode: "single", count: 20, seed });
      for (let i = 0; i < 3; i++) {
        const before = remaining(s);
        const after = press(s);
        assert.ok(after.lastChanged.length >= 1, "something changes");
        assert.ok(remaining(after) >= 1, "something stays");
        assert.equal(remaining(after), before - after.lastChanged.length);
        for (const k of after.lastChanged) assert.equal(s.alive[k], true, "only a nucleus that was unchanged can change");
        s = after;
      }
    }
  });

  it("is a pure function of the seed", () => {
    const run = (seed) => {
      let s = createDecayWait({ mode: "single", count: 20, seed });
      for (let i = 0; i < 3; i++) s = press(s);
      return JSON.stringify(s.alive);
    };
    assert.equal(run(42), run(42));
  });

  it("differs from seed to seed: the learner cannot call the next one", () => {
    const firsts = new Set();
    for (let seed = 1; seed <= 60; seed++) firsts.add(press(createDecayWait({ mode: "single", count: 20, seed })).lastChanged.join(","));
    assert.ok(firsts.size > 30, `only ${firsts.size} distinct outcomes in 60 runs`);
  });

  it("every nucleus is about equally likely to be the first to change", () => {
    const hits = Array(20).fill(0);
    for (let seed = 1; seed <= 4000; seed++) for (const i of press(createDecayWait({ mode: "single", count: 20, seed })).lastChanged) hits[i]++;
    const mean = hits.reduce((a, b) => a + b, 0) / 20;
    for (const h of hits) assert.ok(Math.abs(h - mean) / mean < 0.2, `a nucleus changed ${h} times against a mean of ${mean}`);
  });

  it("the last nucleus eventually changes and the press then does nothing more", () => {
    let s = createDecayWait({ mode: "single", count: 4, seed: 7 });
    for (let i = 0; i < 40; i++) s = press(s);
    assert.equal(remaining(s), 0);
    assert.equal(press(s).lastChanged.length, 0);
  });

  it("reports the count as text, with no 'about'", () => {
    const s = press(createDecayWait({ mode: "single", count: 20, seed: 3 }));
    assert.match(countText(s), /^\d+ of 20 nuclei have not changed yet$/);
    assert.match(pressText(s), /changed\./);
  });
});

describe("decay-wait: half-life mode (guided random)", () => {
  it("the number that change stays inside its clamp over many seeded runs", () => {
    for (let seed = 1; seed <= 2000; seed++) {
      let s = createDecayWait({ mode: "half-life", count: 100, seed });
      for (let i = 0; i < 4; i++) {
        const left = remaining(s);
        const { min, max } = halfLifeBounds(left);
        s = press(s);
        const n = s.lastChanged.length;
        assert.ok(n >= min && n <= max, `seed ${seed}, press ${i + 1}: ${n} changed of ${left}, allowed ${min} to ${max}`);
        assert.ok(Math.abs(n - left / 2) <= spreadFor(left) + 0.5, "within the spread of half");
      }
    }
  });

  it("the spread never exceeds three", () => {
    assert.equal(HALF_LIFE_SPREAD, 3);
    for (let n = 2; n <= 100; n++) assert.ok(spreadFor(n) <= 3 && spreadFor(n) >= 1);
  });

  it("starting from 100, the first press leaves 47 to 53 and three presses leave about an eighth", () => {
    for (let seed = 1; seed <= 500; seed++) {
      let s = createDecayWait({ mode: "half-life", count: 100, seed });
      s = press(s);
      assert.ok(remaining(s) >= 47 && remaining(s) <= 53);
      s = press(press(s));
      // The pattern is 100, 50, 25, 12: allow a little drift from three clamped presses.
      assert.ok(remaining(s) >= 6 && remaining(s) <= 19, `seed ${seed}: ${remaining(s)} left`);
    }
  });

  it("which nuclei change is random, not the first ones in the grid", () => {
    const firsts = new Set();
    for (let seed = 1; seed <= 40; seed++) firsts.add(press(createDecayWait({ mode: "half-life", count: 100, seed })).lastChanged.slice(0, 5).join(","));
    assert.ok(firsts.size > 30);
  });

  it("always says 'about' when it reports the count", () => {
    let s = createDecayWait({ mode: "half-life", count: 100, seed: 9 });
    s = press(s);
    assert.match(countText(s), /^About \d+ of 100 nuclei have not changed yet$/);
    assert.match(pressText(s), /about half/);
  });

  it("is a pure function of the seed", () => {
    const run = (seed) => {
      let s = createDecayWait({ mode: "half-life", count: 100, seed });
      for (let i = 0; i < 3; i++) s = press(s);
      return JSON.stringify(s.alive);
    };
    assert.equal(run(5), run(5));
    assert.notEqual(run(5), run(6));
  });

  it("completes after the goal number of presses", () => {
    let s = createDecayWait({ mode: "half-life", count: 100, seed: 2 });
    assert.equal(waitGoalMet(s, { presses: 3 }), false);
    for (let i = 0; i < 3; i++) s = press(s);
    assert.equal(waitGoalMet(s, { presses: 3 }), true);
  });
});

describe("decay-wait data", () => {
  const good = { mode: "half-life", task: "Wait.", count: 100, goal: { presses: 3 } };
  it("accepts good data and rejects broken data", () => {
    assert.deepEqual(checkDecayWaitData(good), []);
    assert.deepEqual(checkDecayWaitData({ mode: "single", task: "Wait.", count: 20, goal: { presses: 3 } }), []);
    assert.ok(checkDecayWaitData({ ...good, mode: "fast" }).length);
    assert.ok(checkDecayWaitData({ ...good, task: "" }).length);
    assert.ok(checkDecayWaitData({ ...good, count: 3 }).length);
    assert.ok(checkDecayWaitData({ ...good, count: 30 }).length, "a half-life grid must halve evenly");
    assert.ok(checkDecayWaitData({ ...good, goal: {} }).length);
    assert.ok(checkDecayWaitData({ ...good, count: 8, goal: { presses: 5 } }).length, "too few nuclei for that many presses");
    assert.ok(checkDecayWaitData(null).length);
  });
});

describe("decay-chain", () => {
  const nodes = [
    { id: "a", label: "Parent", state: "unstable" },
    { id: "b", label: "Daughter", state: "unstable" },
    { id: "c", label: "Next generation", state: "unstable" },
    { id: "d", label: "Stable", state: "stable" },
  ];
  const goal = { reach: "d" };

  it("walks the chain and says it is not finished until the stable end", () => {
    let s = createChain();
    assert.equal(currentNode(nodes, s).id, "a");
    s = step(nodes, s);
    assert.equal(currentNode(nodes, s).id, "b");
    assert.equal(s.message, NOT_FINISHED);
    s = step(nodes, s);
    assert.equal(s.message, NOT_FINISHED);
    assert.equal(chainGoalMet(nodes, s, goal), false);
    s = step(nodes, s);
    assert.equal(currentNode(nodes, s).id, "d");
    assert.equal(s.message, FINISHED);
    assert.equal(chainGoalMet(nodes, s, goal), true);
  });

  it("a stable nucleus does not change any more", () => {
    let s = createChain();
    for (let i = 0; i < 10; i++) s = step(nodes, s);
    assert.equal(currentNode(nodes, s).id, "d");
    assert.equal(step(nodes, s), s);
  });

  it("validates the chain: it must be a path that ends in stable", () => {
    assert.deepEqual(checkDecayChainData({ task: "Tap.", nodes, goal }), []);
    assert.ok(checkDecayChainData({ task: "Tap.", nodes: nodes.slice(0, 2), goal: { reach: "b" } }).length, "too short");
    assert.ok(checkDecayChainData({ task: "Tap.", nodes: nodes.map((n) => ({ ...n, state: "unstable" })), goal }).length, "no stable end");
    assert.ok(checkDecayChainData({ task: "Tap.", nodes: nodes.map((n, i) => (i === 1 ? { ...n, state: "stable" } : n)), goal }).length, "stable in the middle");
    assert.ok(checkDecayChainData({ task: "Tap.", nodes: [...nodes.slice(0, 3), { ...nodes[3], id: "a" }], goal: { reach: "a" } }).length, "duplicate ids");
    assert.ok(checkDecayChainData({ task: "Tap.", nodes, goal: { reach: "b" } }).length, "goal is not the end");
    assert.ok(checkDecayChainData({ task: "", nodes, goal }).length);
  });
});

describe("radiation-id", () => {
  const cases = [
    { id: "one", answer: "alpha", clue: "A chunk of 2 protons and 2 neutrons leaves." },
    { id: "two", answer: "beta", clue: "A fast electron leaves." },
    { id: "three", answer: "gamma", clue: "High-energy electromagnetic radiation leaves." },
  ];

  it("a wrong guess is allowed and re-tried; a right one solves the case", () => {
    let s = createRadiationId();
    assert.equal(caseAt(cases, s).id, "one");
    s = guess(cases, s, "beta");
    assert.equal(s.last.correct, false);
    assert.deepEqual(s.solved, []);
    assert.equal(s.misses.one, 1);
    s = guess(cases, s, "alpha");
    assert.equal(s.last.correct, true);
    assert.deepEqual(s.solved, ["one"]);
  });

  it("moves on case by case and is complete only when all three are identified", () => {
    let s = createRadiationId();
    for (const c of cases) {
      assert.equal(idGoalMet(cases, s), false);
      s = guess(cases, s, c.answer);
      s = next(cases, s);
    }
    assert.equal(idGoalMet(cases, s), true);
  });

  it("guessing a solved case changes nothing", () => {
    let s = guess(cases, createRadiationId(), "alpha");
    assert.equal(guess(cases, s, "gamma"), s);
  });

  it("validates the data", () => {
    const good = { task: "Name it.", cases, goal: { all: true } };
    assert.deepEqual(checkRadiationIdData(good), []);
    assert.ok(checkRadiationIdData({ ...good, cases: cases.slice(0, 1) }).length);
    assert.ok(checkRadiationIdData({ ...good, cases: [...cases.slice(0, 2), { ...cases[2], answer: "delta" }] }).length);
    assert.ok(checkRadiationIdData({ ...good, cases: [cases[0], { ...cases[1], id: "one" }] }).length);
    assert.ok(checkRadiationIdData({ ...good, goal: {} }).length);
  });
});
