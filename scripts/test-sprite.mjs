/**
 * Sprite sheet playback maths (components/ui/sprite-core.ts) and the chest sheets' bookkeeping.
 *
 * Run: npm run test:sprite
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { cellOffset, frameIndex, sheetDuration } = loadTs("components/ui/sprite-core.ts");

test("a clock shows the frame it is on, looping or holding the last", () => {
  assert.equal(frameIndex(0, 25, 38, false), 0);
  assert.equal(frameIndex(39, 25, 38, false), 0);
  assert.equal(frameIndex(40, 25, 38, false), 1);
  assert.equal(frameIndex(1519, 25, 38, false), 37);
  assert.equal(frameIndex(5000, 25, 38, false), 37, "holds the last frame");
  assert.equal(frameIndex(1520, 25, 38, true), 0, "loops back to the first");
  assert.equal(frameIndex(1560, 25, 38, true), 1);
  assert.equal(frameIndex(-5, 25, 38, true), 0);
  assert.equal(frameIndex(Number.NaN, 25, 38, true), 0);
  assert.equal(frameIndex(100, 25, 1, true), 0);
  assert.equal(frameIndex(100, 0, 10, true), 0);
});

test("frames sit in a grid, left to right and top to bottom", () => {
  assert.deepEqual(cellOffset(0, 8, 96), { x: -0, y: -0 });
  assert.deepEqual(cellOffset(7, 8, 96), { x: -672, y: -0 });
  assert.deepEqual(cellOffset(8, 8, 96), { x: -0, y: -96 });
  assert.deepEqual(cellOffset(37, 8, 96), { x: -480, y: -384 });
});

test("a sheet lasts count / fps", () => {
  assert.equal(sheetDuration(38, 25), 1520);
  assert.equal(sheetDuration(104, 25), 4160);
});

test("the chest sheets declare the frames that were baked", () => {
  const src = fs.readFileSync("components/quests/chest-sheets.ts", "utf8");
  const frames = [...src.matchAll(/frames:\s*(\d+)/g)].map((m) => Number(m[1]));
  assert.deepEqual(frames, [38, 104]);
  for (const f of ["assets/images/chest/chest-open.webp", "assets/images/chest/chest-loop.webp"]) assert.ok(fs.existsSync(f), f);
});
