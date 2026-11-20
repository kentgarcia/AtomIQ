import assert from "node:assert/strict";
import test from "node:test";

import { POPOVER, placePopover, statInfo } from "../components/layout/header-stat-core.ts";

const A = (x, width = 60) => ({ x, y: 50, width, height: 36 });

test("the card centres under a stat in the middle of the screen", () => {
  const p = placePopover(A(150), 400);
  assert.equal(p.width, POPOVER.width);
  assert.equal(p.left, 180 - POPOVER.width / 2);
  assert.equal(p.arrowLeft, POPOVER.width / 2);
  assert.equal(p.top, 50 + 36 + POPOVER.gap);
});

test("the card stays on screen and the pointer still aims at the stat", () => {
  const right = placePopover(A(340), 400);
  assert.equal(right.left + right.width, 400 - POPOVER.edge);
  assert.equal(right.left + right.arrowLeft, 400 - POPOVER.edge - (POPOVER.arrow + 12));
  const left = placePopover(A(0, 40), 400);
  assert.equal(left.left, POPOVER.edge);
  assert.equal(left.left + left.arrowLeft, POPOVER.edge + left.arrowLeft);
  assert.ok(left.arrowLeft >= POPOVER.arrow);
});

test("a narrow screen narrows the card", () => {
  const p = placePopover(A(100), 240);
  assert.equal(p.width, 240 - POPOVER.edge * 2);
  assert.ok(p.left >= POPOVER.edge);
});

test("what each popover says", () => {
  assert.equal(statInfo("lessons", 0).lines.length, 1);
  assert.equal(statInfo("lessons", 12).value, "12");
  const xp = statInfo("xp", 250);
  assert.equal(xp.value, "250 XP");
  assert.deepEqual(xp.lines, ["Level 3", "50 XP to level 4"]);
  assert.equal(xp.progress, 0.5);
  assert.equal(statInfo("xp", 100).progress, 0);
  assert.equal(statInfo("diamonds", 7).progress, null);
  assert.equal(statInfo("diamonds", Number.NaN).value, "0");
});
