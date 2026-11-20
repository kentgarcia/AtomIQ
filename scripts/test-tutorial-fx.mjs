import assert from "node:assert/strict";
import test from "node:test";
import { pathToFileURL } from "node:url";
import path from "node:path";

const fx = await import(pathToFileURL(path.resolve("components/tutorial/tutorial-fx-core.ts")).href);
const { TUTORIAL_FX } = fx;
const screen = { w: 400, h: 800 };

test("a hole is padded, and its radius never passes half the short side", () => {
  const h = fx.holeFor({ x: 100, y: 200, w: 60, h: 60 }, { radius: 999 });
  assert.deepEqual([h.x, h.y, h.w, h.h], [100 - fx.HOLE_PAD, 200 - fx.HOLE_PAD, 60 + fx.HOLE_PAD * 2, 60 + fx.HOLE_PAD * 2]);
  assert.equal(h.r, h.w / 2);
  assert.equal(fx.holeFor({ x: 0, y: 0, w: 100, h: 40 }, { radius: "round" }).r, (40 + fx.HOLE_PAD * 2) / 2);
  assert.equal(fx.holeFor({ x: 0, y: 0, w: 100, h: 40 }, { radius: -4 }).r, 0);
});

test("the border trick: the View's inner edge is exactly the hole, and the rim is off screen", () => {
  const hole = { x: 150, y: 600, w: 80, h: 56, r: 12 };
  const b = fx.borderHole(hole, screen);
  // The inner (content) box is the View minus the border on every side
  assert.equal(b.left + b.borderWidth, hole.x);
  assert.equal(b.top + b.borderWidth, hole.y);
  assert.equal(b.width - 2 * b.borderWidth, hole.w);
  assert.equal(b.height - 2 * b.borderWidth, hole.h);
  // The inner radius is the outer minus the border
  assert.equal(b.borderRadius - b.borderWidth, hole.r);
  // The border is wide enough that the View covers the whole screen from any hole on it
  assert.ok(b.left <= 0 && b.top <= 0 && b.left + b.width >= screen.w && b.top + b.height >= screen.h);
  // ...and the radius fits RN's clamp (half the short side) for any hole, so the corner is not flattened
  assert.ok(b.borderRadius <= Math.min(b.width, b.height) / 2);
});

test("the four strips and the hole tile the screen with no gap and no overlap", () => {
  for (const hole of [
    { x: 150, y: 600, w: 80, h: 56 },
    { x: -10, y: -10, w: 60, h: 60 }, // partly off screen
    { x: 380, y: 780, w: 60, h: 60 },
  ]) {
    const s = fx.strips(hole, screen);
    const area = (r) => Math.max(0, r.w) * Math.max(0, r.h);
    const x0 = Math.max(0, hole.x), y0 = Math.max(0, hole.y);
    const x1 = Math.min(screen.w, hole.x + hole.w), y1 = Math.min(screen.h, hole.y + hole.h);
    const holeArea = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
    assert.equal(area(s.top) + area(s.bottom) + area(s.left) + area(s.right) + holeArea, screen.w * screen.h);
  }
  const s = fx.strips({ x: 100, y: 100, w: 50, h: 50 }, screen);
  assert.deepEqual(s.left, { x: 0, y: 100, w: 100, h: 50 });
  assert.deepEqual(s.right, { x: 150, y: 100, w: 250, h: 50 });
});

test("the glide is monotonic, eased out, and lands exactly", () => {
  const a = { x: 0, y: 0, w: 50, h: 50, r: 8 };
  const b = { x: 200, y: 400, w: 100, h: 60, r: 16 };
  assert.deepEqual(fx.glide(a, b, 0), a);
  assert.deepEqual(fx.glide(a, b, 1), b);
  let last = -1;
  for (let p = 0; p <= 1.0001; p += 0.05) {
    const x = fx.glide(a, b, p).x;
    assert.ok(x >= last);
    last = x;
  }
  assert.ok(fx.glide(a, b, 0.5).x > 100, "ease-out is past the middle at half time");
  assert.ok(TUTORIAL_FX.glideMs <= 300, "interface moves stay under 300 ms");
});

test("the ring and the hand loop and start from rest", () => {
  assert.equal(fx.ringFrame(0).scale, 1);
  assert.equal(fx.ringFrame(0).opacity, 1);
  assert.ok(Math.abs(fx.ringFrame(TUTORIAL_FX.ringMs).scale - 1) < 1e-9);
  const peak = fx.ringFrame(TUTORIAL_FX.ringMs / 2);
  assert.ok(peak.scale > 1 && peak.scale <= 1.06 + 1e-9 && peak.opacity < 1);
  assert.equal(fx.handFrame(0).travel, 0);
  assert.ok(Math.abs(fx.handFrame(TUTORIAL_FX.handMs / 2).travel - TUTORIAL_FX.handTravel) < 1e-9);
  assert.equal(fx.handFrame(TUTORIAL_FX.handMs).travel < 1e-9, true);
});

test("the nudge ends at rest", () => {
  assert.equal(fx.nudgeX(0), 0);
  assert.equal(fx.nudgeX(TUTORIAL_FX.nudgeMs), 0);
  assert.ok(Math.abs(fx.nudgeX(TUTORIAL_FX.nudgeMs * 0.12)) > 1);
});

test("the bubble goes below, else above, else in the middle, and stays on screen", () => {
  const opts = { top: 50, bottom: 90 };
  assert.equal(fx.bubbleSide({ x: 10, y: 100, w: 50, h: 50 }, screen, 120, opts), "below");
  assert.equal(fx.bubbleSide({ x: 10, y: 600, w: 50, h: 50 }, screen, 120, opts), "above");
  assert.equal(fx.bubbleSide({ x: 10, y: 120, w: 380, h: 560 }, screen, 120, opts), "center");
  assert.equal(fx.bubbleSide(null, screen, 120, opts), "center");
  for (const hole of [{ x: 10, y: 100, w: 50, h: 50 }, { x: 10, y: 700, w: 50, h: 50 }, null]) {
    const side = fx.bubbleSide(hole, screen, 120, opts);
    const top = fx.bubbleTop(side, hole, screen, 120, opts);
    assert.ok(top >= opts.top && top + 120 <= screen.h - opts.bottom);
  }
});

test("a rectangle must hold still before the hole goes to it", () => {
  const r = { x: 10, y: 10, w: 50, h: 50 };
  assert.equal(fx.isSettled([[0, r]]), false);
  assert.equal(fx.isSettled([[0, r], [100, r]]), false, "not long enough");
  assert.equal(fx.isSettled([[0, r], [100, r], [200, r]]), true);
  assert.equal(fx.isSettled([[0, { ...r, x: 40 }], [100, r], [200, r]]), false, "it was still moving");
});

test("a missing target waits, then a stable beat falls back and a transient one steps back", () => {
  assert.equal(fx.missingAction(500, true), "wait");
  assert.equal(fx.missingAction(500, false), "wait");
  assert.equal(fx.missingAction(TUTORIAL_FX.missingMs, true), "fallback");
  assert.equal(fx.missingAction(TUTORIAL_FX.missingMs, false), "step-back");
});

test("the overlay only draws when nothing is busy and it is on the beat's screen and host", () => {
  const ok = { busy: 0, sinceBusyClearedMs: 1000, onScreen: true, hostMatches: true, enabled: true };
  assert.equal(fx.mayShow(ok), true);
  assert.equal(fx.mayShow({ ...ok, busy: 1 }), false);
  assert.equal(fx.mayShow({ ...ok, sinceBusyClearedMs: 100 }), false);
  assert.equal(fx.mayShow({ ...ok, onScreen: false }), false);
  assert.equal(fx.mayShow({ ...ok, hostMatches: false }), false);
  assert.equal(fx.mayShow({ ...ok, enabled: false }), false);
});

test("a press on a locked thing under the dim opens its dialog, and only a locked one", async () => {
  const hits = await import(pathToFileURL(path.resolve("components/tutorial/lock-hits.ts")).href);
  const opened = [];
  let locked = true;
  const off = hits.registerLockHit("tab:quests", { rect: async () => ({ x: 100, y: 700, w: 60, h: 60 }), open: () => opened.push("quests"), active: () => locked });
  const off2 = hits.registerLockHit("tab:gone", { rect: async () => null, open: () => opened.push("gone"), active: () => true });
  assert.equal(await hits.openLockedAt(120, 720), true);
  assert.deepEqual(opened, ["quests"]);
  assert.equal(await hits.openLockedAt(10, 10), false, "a tap elsewhere is a nudge");
  locked = false;
  assert.equal(await hits.openLockedAt(120, 720), false, "an open tab is not a lock hit");
  assert.equal(hits.containsPoint({ x: 0, y: 0, w: 10, h: 10 }, 10, 10), true);
  assert.equal(hits.containsPoint({ x: 0, y: 0, w: 10, h: 10 }, 11, 5), false);
  off();
  off2();
  assert.equal(await hits.openLockedAt(120, 720), false);
});

test("the move between holes is a crossfade: the new dim is in before the old one leaves, and the ends are clean", () => {
  const { dimOpacities } = fx;
  assert.deepEqual(dimOpacities(0), { prev: 1, next: 0 });
  assert.deepEqual(dimOpacities(1), { prev: 0, next: 1 });
  assert.deepEqual(dimOpacities(0.5), { prev: 1, next: 1 });
  for (let i = 0; i <= 20; i++) {
    const o = dimOpacities(i / 20);
    assert.ok(o.prev >= 0 && o.prev <= 1 && o.next >= 0 && o.next <= 1);
    assert.ok(Math.max(o.prev, o.next) === 1, "the scrim is never lighter than itself in between");
  }
  assert.deepEqual(dimOpacities(-3), { prev: 1, next: 0 });
  assert.deepEqual(dimOpacities(9), { prev: 0, next: 1 });
});
