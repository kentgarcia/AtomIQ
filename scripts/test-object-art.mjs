import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkScene } from "../content/visual-blocks.ts";
import { ART_IDS, ART_NAMES, OBJECT_ART, isArtId } from "../components/lesson/visual/object-art.ts";

const HEX = /^#[0-9A-F]{6}$/;

describe("lesson object art", () => {
  it("has a name for every picture, and no stray names", () => {
    assert.deepEqual(Object.keys(ART_NAMES).sort(), [...ART_IDS].sort());
    for (const id of ART_IDS) assert.ok(ART_NAMES[id].length > 2, id);
  });

  it("knows its ids", () => {
    assert.ok(isArtId("atom"));
    assert.ok(!isArtId("unicorn"));
    assert.ok(!isArtId(undefined));
    assert.ok(!isArtId("toString"));
  });

  it("is built only from flat shapes with hex colours (no gradients, no outlines)", () => {
    for (const id of ART_IDS) {
      const shapes = OBJECT_ART[id];
      assert.ok(shapes.length >= 3 && shapes.length <= 14, `${id}: ${shapes.length} shapes`);
      for (const s of shapes) {
        assert.ok(["rect", "circle", "path", "line"].includes(s.t), `${id}: ${s.t}`);
        const colour = s.t === "line" ? s.stroke : s.fill;
        assert.match(colour, HEX, `${id}: ${colour}`);
        if (s.opacity !== undefined) assert.ok(s.opacity > 0 && s.opacity <= 1, `${id}: opacity ${s.opacity}`);
        if (s.t === "path") assert.ok(!s.d.includes("url("), id);
      }
    }
  });

  it("stays inside its 100 x 100 frame and keeps strokes readable at 48 px", () => {
    for (const id of ART_IDS) {
      for (const s of OBJECT_ART[id]) {
        if (s.t === "rect") assert.ok(s.x >= 0 && s.y >= 0 && s.x + s.w <= 100 && s.y + s.h <= 100, `${id}: rect ${s.x},${s.y}`);
        if (s.t === "circle") assert.ok(s.cx - s.r >= 0 && s.cy - s.r >= 0 && s.cx + s.r <= 100 && s.cy + s.r <= 100, `${id}: circle ${s.cx},${s.cy}`);
        if (s.t === "line") assert.ok(s.width >= 2.4, `${id}: stroke ${s.width} is too thin`);
        if (s.t === "rect" || s.t === "circle") assert.ok((s.t === "rect" ? Math.min(s.w, s.h) : s.r * 2) >= 2.4 || s.t === "rect", `${id}: tiny shape`);
      }
    }
  });

  it("rounds every rectangle at least a little (nothing is a sharp box)", () => {
    for (const id of ART_IDS) for (const s of OBJECT_ART[id]) if (s.t === "rect") assert.ok(s.r >= 1.5, `${id}: rect radius ${s.r}`);
  });
});

describe("art in scene figures", () => {
  const scene = (shape) => ({ height: 44, shapes: [shape] });
  const errors = (shape) => {
    const out = [];
    checkScene(scene(shape), "scene", out);
    return out;
  };

  it("accepts a picture placed in a scene", () => {
    assert.deepEqual(errors({ t: "art", id: "atom", x: 50, y: 20, size: 16 }), []);
  });

  it("rejects a missing id, a missing size and a size outside 4 to 100", () => {
    assert.ok(errors({ t: "art", x: 50, y: 20, size: 16 }).some((m) => m.includes("id")));
    assert.ok(errors({ t: "art", id: "atom", x: 50, y: 20 }).some((m) => m.includes("size")));
    assert.ok(errors({ t: "art", id: "atom", x: 50, y: 20, size: 2 }).some((m) => m.includes("size")));
    assert.ok(errors({ t: "art", id: "atom", x: 50, y: 20, size: 200 }).some((m) => m.includes("size")));
  });

  it("still keeps a picture's centre inside the scene", () => {
    assert.ok(errors({ t: "art", id: "atom", x: 150, y: 20, size: 16 }).some((m) => m.includes("outside")));
  });
});
