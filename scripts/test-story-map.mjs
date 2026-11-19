#!/usr/bin/env node
/**
 * The Atom Maze level map: where the stops sit, the road between them, stars, scenery and scrolling.
 * Run: npm run test:story-map
 */

import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const m = loadTs("components/platformer/story-map-core.ts");
const { STORY_WORLDS, STORY_LEVELS } = loadTs("components/platformer/story-levels.ts");

const rec = (levelId, stars) => ({ levelId, stars, bestScore: 100, bestTime: 30 });
const ids = STORY_LEVELS.map((l) => l.id);

test("stops wind down the map: inside it, apart, and never the same x twice in a row", () => {
  for (const width of [320, 360, 412, 600, 900]) {
    let last = -1;
    for (let i = 0; i < 5; i++) {
      const x = m.stopX(i, width);
      assert.ok(x - 40 >= 0 && x + 40 <= width, `stop ${i} fits a ${width} map`);
      assert.notEqual(x, last, "the road bends");
      last = x;
    }
  }
  assert.deepEqual([0, 1, 2, 3].map(m.stopY), [0, 1, 2, 3].map((i) => m.MAP.top + i * m.MAP.row));
});

test("stops are far enough apart that their stars and names do not touch the next stop", () => {
  assert.ok(m.MAP.row >= 80 + 22 + 20 + 14, "a stop, its stars, its name and a gap");
});

test("heights add up: banner, gap, path; worlds stack with a gap", () => {
  assert.equal(m.pathHeight(5), m.stopY(4) + m.MAP.bottom);
  assert.equal(m.worldHeight(5), m.MAP.bannerH + m.MAP.bannerGap + m.pathHeight(5));
  assert.equal(m.worldTop([5, 5], 0), 0);
  assert.equal(m.worldTop([5, 5], 1), m.worldHeight(5) + m.MAP.worldGap);
  assert.equal(m.contentHeight([5, 5]), 2 * m.worldHeight(5) + m.MAP.worldGap);
  assert.equal(m.contentHeight([]), 0);
});

test("a stop is done after a win, open when the one before is done, shut otherwise", () => {
  assert.deepEqual([0, 1, 2].map((i) => m.stopStatus(i, ids, [])), ["current", "locked", "locked"]);
  const one = [rec(ids[0], 2)];
  assert.deepEqual([0, 1, 2].map((i) => m.stopStatus(i, ids, one)), ["completed", "current", "locked"]);
  assert.equal(m.stopStatus(0, ids, [rec(ids[0], 0)]), "current", "played but not won");
  const all = ids.map((id) => rec(id, 1));
  assert.ok(ids.every((_, i) => m.stopStatus(i, ids, all) === "completed"));
});

test("a world's stars: what is earned out of three a level, and how many levels are won", () => {
  const w = STORY_WORLDS[0].levelIds;
  assert.deepEqual(m.worldStars(w, []), { earned: 0, total: 15, won: 0 });
  assert.deepEqual(m.worldStars(w, [rec(w[0], 3), rec(w[1], 1), rec("other", 3)]), { earned: 4, total: 15, won: 2 });
  assert.equal(m.worldStars(w, [rec(w[0], 9)]).earned, 3, "never more than three");
  assert.equal(m.worldOpen(0, ids, []), true);
  assert.equal(m.worldOpen(5, ids, []), false, "the unit waits for the tutorial's last level");
  assert.equal(m.worldOpen(5, ids, [rec(ids[4], 1)]), true);
});

test("the road has a piece between each pair of stops and lights up past a won stop", () => {
  const segs = m.roadSegments(360, ["completed", "completed", "current", "locked", "locked"]);
  assert.equal(segs.length, 4);
  assert.deepEqual(segs.map((s) => s.lit), [true, true, false, false]);
  for (const s of segs) assert.match(s.d, /^M-?\d+ [\d.]+C/);
  assert.deepEqual(m.roadSegments(360, ["current"]), []);
});

test("scenery is repeatable, stays inside the map, keeps off the stops and uses its biome's pieces", () => {
  const biomes = ["trees", "trees", "trees", "trees", "trees"];
  const a = m.decorFor(biomes, 360, 7);
  assert.deepEqual(a, m.decorFor(biomes, 360, 7), "same seed, same map");
  assert.notDeepEqual(a, m.decorFor(biomes, 360, 8), "another seed, another map");
  assert.ok(a.length >= 5);
  for (const d of a) {
    assert.ok(d.x - d.size / 2 >= 0 && d.x + d.size / 2 <= 360, "inside the map");
    assert.ok(m.BIOME_DECOR.trees.includes(d.kind));
    assert.ok(d.size >= 34 && d.size <= 52);
    for (let i = 0; i < 5; i++) {
      const dx = Math.abs(d.x - m.stopX(i, 360));
      const dy = Math.abs(d.y - d.size / 2 - m.stopY(i));
      assert.ok(dx > 40 + d.size / 2 || dy > 40 + d.size / 2, `scenery clear of stop ${i}`);
    }
  }
  for (const biome of ["hills", "trees", "desert", "mushrooms"]) assert.ok(m.BIOME_DECOR[biome].length > 0);
  const r = m.seeded(1);
  const values = Array.from({ length: 200 }, r);
  assert.ok(values.every((v) => v >= 0 && v < 1));
});

test("the map opens scrolled to the next level, never before the top or past the end", () => {
  const counts = [5, 5];
  const args = { counts, viewportH: 640, pad: 16 };
  assert.equal(m.scrollTarget({ ...args, worldIndex: 0, levelPosition: 0 }), 0, "the first level is at the top");
  const second = m.scrollTarget({ ...args, worldIndex: 1, levelPosition: 2 });
  assert.ok(second > m.worldHeight(5));
  assert.ok(second <= 16 + m.contentHeight(counts) - 640, "not past the end");
  assert.ok(m.scrollTarget({ ...args, worldIndex: 1, levelPosition: 4 }) > second);
  assert.equal(m.scrollTarget({ counts: [1], worldIndex: 0, levelPosition: 0, viewportH: 2000, pad: 0 }), 0, "short content does not scroll");
});

test("the next stop is found across worlds", () => {
  assert.deepEqual(m.nextStop(STORY_WORLDS, []), { worldIndex: 0, position: 0, globalIndex: 0 });
  assert.deepEqual(m.nextStop(STORY_WORLDS, ids.slice(0, 5).map((id) => rec(id, 1))), { worldIndex: 1, position: 0, globalIndex: 5 });
  assert.deepEqual(m.nextStop(STORY_WORLDS, ids.slice(0, 7).map((id) => rec(id, 1))), { worldIndex: 1, position: 2, globalIndex: 7 });
  assert.deepEqual(m.nextStop(STORY_WORLDS, ids.map((id) => rec(id, 3))), { worldIndex: 2, position: 4, globalIndex: 14 }, "all done: the last");
  assert.deepEqual(m.nextStop(STORY_WORLDS, ids.slice(0, 10).map((id) => rec(id, 1))), { worldIndex: 2, position: 0, globalIndex: 10 }, "Unit 2 opens after Unit 1's boss");
});
