/**
 * What repeatable things pay in XP: full the first time, a very small share after, Myth Buster
 * smallest of all with no first-time reward, Endless scaling with its score.
 *
 * Run: npm run test:xp
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const xp = loadTs("services/xp-core.ts");
const { repeatXp, atomMazeXp, mythBusterXp, ATOM_MAZE_FIRST_XP, MYTHBUSTER_MAX_XP, ENDLESS_FULL_SCORE } = xp;

test("a repeat pays a small share of the first time, never nothing, and nothing for nothing", () => {
  assert.equal(repeatXp(50), 5);
  assert.equal(repeatXp(20), 2);
  assert.equal(repeatXp(60), 6);
  assert.equal(repeatXp(3), 1, "a tiny reward still pays at least 1");
  assert.equal(repeatXp(0), 0);
  assert.equal(repeatXp(-5), 0);
  for (const first of [20, 40, 50, 60]) assert.ok(repeatXp(first) <= first / 5, "very small");
});

test("Atom Maze: full XP on the first win, a small repeat after, nothing for a loss", () => {
  assert.deepEqual(atomMazeXp(true, true), { xp: ATOM_MAZE_FIRST_XP, first: true });
  const again = atomMazeXp(true, false);
  assert.equal(again.first, false);
  assert.equal(again.xp, repeatXp(ATOM_MAZE_FIRST_XP));
  assert.ok(again.xp > 0 && again.xp < ATOM_MAZE_FIRST_XP);
  assert.deepEqual(atomMazeXp(false, true), { xp: 0, first: false });
  assert.deepEqual(atomMazeXp(false, false), { xp: 0, first: false });
});

test("Myth Buster pays the smallest repeat XP of anything, a fifth of a lesson's at the most in Quick Play", () => {
  assert.equal(MYTHBUSTER_MAX_XP.quick, 1);
  assert.equal(MYTHBUSTER_MAX_XP.quick * 5, repeatXp(50));
  const smallest = Math.min(repeatXp(20), repeatXp(50), repeatXp(60), repeatXp(ATOM_MAZE_FIRST_XP));
  assert.ok(MYTHBUSTER_MAX_XP.quick <= smallest);
  assert.ok(MYTHBUSTER_MAX_XP.quick <= MYTHBUSTER_MAX_XP.challenge);
});

test("Myth Buster Quick Play and Challenge scale with the share answered right", () => {
  assert.equal(mythBusterXp({ mode: "quick", correct: 10, rounds: 10, score: 100 }), 1);
  assert.equal(mythBusterXp({ mode: "quick", correct: 2, rounds: 10, score: 20 }), 0);
  assert.equal(mythBusterXp({ mode: "challenge", correct: 15, rounds: 15, score: 400 }), 2);
  assert.equal(mythBusterXp({ mode: "challenge", correct: 8, rounds: 15, score: 150 }), 1);
  assert.equal(mythBusterXp({ mode: "challenge", correct: 0, rounds: 15, score: 0 }), 0);
  assert.equal(mythBusterXp({ mode: "quick", correct: 3, rounds: 0, score: 0 }), 0, "no deck, no XP");
  assert.equal(mythBusterXp({ mode: "quick", correct: 99, rounds: 10, score: 0 }), 1, "never above the maximum");
});

test("Endless has the highest maximum and it depends on the score", () => {
  assert.ok(MYTHBUSTER_MAX_XP.endless > MYTHBUSTER_MAX_XP.quick);
  assert.ok(MYTHBUSTER_MAX_XP.endless > MYTHBUSTER_MAX_XP.challenge);
  const endless = (score) => mythBusterXp({ mode: "endless", correct: 0, rounds: 999, score });
  assert.equal(endless(0), 0);
  assert.equal(endless(10), 1, "any score pays at least 1");
  assert.equal(endless(ENDLESS_FULL_SCORE), MYTHBUSTER_MAX_XP.endless);
  assert.equal(endless(ENDLESS_FULL_SCORE * 10), MYTHBUSTER_MAX_XP.endless, "capped");
  let last = 0;
  for (let score = 0; score <= ENDLESS_FULL_SCORE * 2; score += 25) {
    const v = endless(score);
    assert.ok(v >= last, `not decreasing at ${score}`);
    last = v;
  }
});
