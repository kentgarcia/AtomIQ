/**
 * The speech bubble's side tail (components/npc/speech-tail-core.ts): it always fits the straight
 * part of the card's edge (a one-line bubble used to get a tail so tall its corners poked out over
 * the curved corner and into the bottom border), keeps full size on a tall bubble, and its two
 * shapes nest (the face-coloured one inside the outline).
 *
 * Run: npm run test:speech-tail
 */
import assert from "node:assert/strict";
import test from "node:test";

import { loadTs } from "./lib/ts-require.mjs";

const { TAIL, tailHeightFor, sideTailGeometry } = loadTs("components/npc/speech-tail-core.ts");

const RADIUS = 20; // radius.xl, the card's corner
const BORDER = 2; // controls.border
const numbers = (d) => [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
const box = (d) => {
  const n = numbers(d);
  const xs = n.filter((_, i) => i % 2 === 0);
  const ys = n.filter((_, i) => i % 2 === 1);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
};

test("a one-line bubble (about 62 dp of face) gets a tail that fits its straight edge", () => {
  for (const face of [58, 60, 62, 64]) {
    const h = tailHeightFor(face, RADIUS);
    const straight = face - 2 * RADIUS;
    assert.ok(h <= straight + TAIL.slack + 1, `face ${face}: tail ${h} is no taller than the straight edge ${straight} plus the slack`);
    assert.ok(h >= TAIL.minHeight && h < TAIL.maxHeight, `face ${face}: smaller than full size (${h})`);
  }
});

test("a tall bubble keeps the full-size tail, and a tiny one never goes below the minimum", () => {
  assert.equal(tailHeightFor(120, RADIUS), TAIL.maxHeight);
  assert.equal(tailHeightFor(400, RADIUS), TAIL.maxHeight);
  assert.equal(tailHeightFor(30, RADIUS), TAIL.minHeight);
});

test("the tail never shrinks as the bubble grows, and is a whole even number", () => {
  let last = 0;
  for (let face = 40; face <= 200; face++) {
    const h = tailHeightFor(face, RADIUS);
    assert.ok(h >= last, `face ${face}`);
    assert.equal(h % 2, 0, `face ${face} gives an even height`);
    last = h;
  }
});

test("the base is flush with the border's inner edge and square, so nothing sticks into the face", () => {
  for (const h of [18, 22, 26, 30]) {
    const g = sideTailGeometry(h, BORDER);
    const outer = box(g.outer);
    assert.equal(outer.x1, g.w, "the outline ends at the base");
    assert.equal(outer.y0, 0);
    assert.equal(outer.y1, h);
    assert.equal(g.protrude, g.w - BORDER, "the tip sticks out by the base width less the border it grows from");
    // Square base corners: the path starts and ends on the base line at the full height
    assert.match(g.outer, new RegExp(`^M${g.w} 0L`));
    assert.match(g.outer, new RegExp(`L${g.w} ${h}Z$`));
  }
});

test("the face-coloured shape sits inside the outline, a border's thickness in, and runs 1 dp into the face", () => {
  for (const h of [18, 22, 26, 30]) {
    const g = sideTailGeometry(h, BORDER);
    const outer = box(g.outer);
    const inner = box(g.inner);
    assert.ok(inner.y0 > outer.y0 && inner.y1 < outer.y1, `h ${h}: inner is narrower than the outline`);
    assert.ok(inner.x0 > outer.x0, `h ${h}: the inner tip is behind the outer tip`);
    assert.ok(inner.x0 >= BORDER - 0.01, `h ${h}: the outline is at least a border thick at the tip (${inner.x0})`);
    assert.equal(inner.x1, g.w + 1, "it runs one dp past the base");
    assert.equal(g.drawW, g.w + 1);
    // The opening it makes in the border is centred on the tail
    assert.ok(Math.abs(inner.y0 + inner.y1 - h) < 0.05, `h ${h}: centred`);
  }
});

test("the outline is kept even: the opening's edge is a border from the outline's edge across the slant", () => {
  const g = sideTailGeometry(30, BORDER);
  const half = g.h / 2;
  const slope = half / g.w;
  // Outer edge line: y = half - x * slope (upper edge). Inner base corner at x = w + 1.
  const inner = box(g.inner);
  const y = inner.y0;
  const outerY = half - (g.w + 1) * slope;
  const across = (y - outerY) * Math.cos(Math.atan(slope));
  assert.ok(Math.abs(across - BORDER) < 0.1, `distance across the slant ${across}`);
});
