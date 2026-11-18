/**
 * Ranked achievements (services/achievements-core.ts): thresholds, levels, progress and level-ups,
 * and that every level has a badge picture on disk.
 *
 * Run: npm run test:achievements
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("services/achievements-core.ts");
const { ACHIEVEMENTS, achievementById, achievementValue, levelFromXp, levelFor, progressFor, levelsFromProfile, levelUps, mergeLevels } = core;

test("ids are unique and tiers strictly ascend", () => {
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.id)).size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) {
    assert.ok(a.tiers.length > 0);
    for (let i = 1; i < a.tiers.length; i++) assert.ok(a.tiers[i] > a.tiers[i - 1], `${a.title} tier ${i}`);
  }
});

test("every level has a badge picture and no stray files", () => {
  for (const a of ACHIEVEMENTS) {
    const dir = `assets/images/badge/${a.badgeDir}`;
    for (let n = 1; n <= a.tiers.length; n++) assert.ok(existsSync(`${dir}/${n}.png`), `${dir}/${n}.png`);
    assert.ok(readdirSync(dir).every((f) => f.endsWith(".png")), `${dir} holds only png files`);
  }
});

test("lessons: 1 / 3 / 5 / 10 / 15 levels", () => {
  const lessons = achievementById(1);
  assert.deepEqual([0, 1, 2, 3, 4, 5, 9, 10, 14, 15].map((v) => levelFor(lessons, v)), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5]);
});

test("progress: next threshold, ratio, top level", () => {
  const lessons = achievementById(1);
  const p = progressFor(lessons, 4);
  assert.equal(p.level, 2);
  assert.equal(p.next, 5);
  assert.equal(p.ratio, 0.8);
  assert.equal(p.badgeLevel, 2);
  const none = progressFor(lessons, 0);
  assert.equal(none.earned, false);
  assert.equal(none.badgeLevel, 1);
  assert.equal(none.next, 1);
  const top = progressFor(lessons, 99999);
  assert.equal(top.maxed, true);
  assert.equal(top.next, null);
  assert.equal(top.ratio, 1);
  assert.equal(top.level, lessons.tiers.length);
  assert.equal(progressFor(lessons, NaN).level, 0);
  assert.equal(progressFor(lessons, -5).level, 0);
});

test("requirement wording", () => {
  assert.equal(achievementById(1).requirement(1), "Complete 1 lesson");
  assert.equal(achievementById(1).requirement(5), "Complete 5 lessons");
  assert.equal(achievementById(3).requirement(7), "Reach a 7 day streak");
  assert.equal(achievementById(4).requirement(1000), "Earn 1,000 XP");
});

test("level-ups compare saved to now and never go down", () => {
  const now = levelsFromProfile({ lessons_completed: 5, myths_busted: 0, longest_streak: 3, total_xp: 120, quests_claimed: 4 });
  assert.deepEqual(now, { 1: 3, 2: 0, 3: 2, 4: 2, 5: 2, 6: 1 });
  assert.deepEqual(levelUps({ 1: 1, 2: 0, 3: 2, 4: 2, 5: 2, 6: 1 }, now), [{ id: 1, from: 1, to: 3 }]);
  assert.deepEqual(levelUps(now, now), []);
  assert.deepEqual(levelUps({}, { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }), [{ id: 1, from: 0, to: 1 }]);
  assert.deepEqual(mergeLevels({ 1: 4 }, { 1: 3, 2: 1 }), { 1: 4, 2: 1 });
});

test("level reached follows XP (100 per level) and quests read the counter", () => {
  assert.equal(levelFromXp(0), 1);
  assert.equal(levelFromXp(99), 1);
  assert.equal(levelFromXp(100), 2);
  const level = achievementById(6);
  assert.equal(achievementValue(level, { total_xp: 450 }), 5);
  assert.equal(levelFor(level, 1), 0);
  assert.equal(levelFor(level, 2), 1);
  assert.equal(achievementValue(achievementById(5), { quests_claimed: 7 }), 7);
  assert.equal(achievementValue(achievementById(5), null), 0);
});
