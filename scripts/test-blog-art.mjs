import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BLOG_SCENE_IDS, BLOG_SCENES, SCENE_H, SCENE_W, isBlogSceneId, viewBoxFor } from "../components/feed/blog-art.ts";
import { ART_IDS, isArtId } from "../components/lesson/visual/object-art.ts";

const HEX = /^#[0-9A-F]{6}$/;

describe("blog illustrations", () => {
  it("has a scene for every id the blog content covers and figures use", () => {
    for (const id of ["atom", "radiation", "banana", "diamond", "hand", "rock", "dial", "headline"]) assert.ok(isBlogSceneId(id), id);
    assert.ok(!isBlogSceneId("unicorn"));
    assert.ok(!isBlogSceneId("toString"));
    assert.ok(!isBlogSceneId(undefined));
  });

  it("describes every scene and keeps its focus inside the frame", () => {
    for (const id of BLOG_SCENE_IDS) {
      const s = BLOG_SCENES[id];
      assert.ok(s.name.length > 10, id);
      assert.ok(s.focusX >= 0 && s.focusX <= SCENE_W, id);
    }
  });

  it("is built only from flat shapes with hex colours (no gradients, no outlines)", () => {
    for (const id of BLOG_SCENE_IDS) {
      const shapes = BLOG_SCENES[id].shapes;
      assert.ok(shapes.length >= 30, `${id}: ${shapes.length} shapes is not a scene`);
      for (const s of shapes) {
        assert.ok(["rect", "circle", "path", "line", "art"].includes(s.t), `${id}: ${s.t}`);
        if (s.t === "art") {
          assert.ok(ART_IDS.includes(s.id) && isArtId(s.id), `${id}: unknown object ${s.id}`);
          assert.ok(s.size >= 8, `${id}: ${s.id} is too small`);
          continue;
        }
        const colour = s.t === "line" ? s.stroke : s.fill;
        assert.match(colour, HEX, `${id}: ${colour}`);
        if (s.opacity !== undefined) assert.ok(s.opacity > 0 && s.opacity <= 1, `${id}: opacity ${s.opacity}`);
        if (s.t === "path") assert.ok(!s.d.includes("url("), id);
        if (s.t === "line") assert.ok(s.width >= 2.4, `${id}: stroke ${s.width} is too thin`);
        if (s.t === "rect") assert.ok(s.r >= 1.5 || s.w >= SCENE_W || s.r * 2 >= Math.min(s.w, s.h) - 1e-9, `${id}: sharp rect at ${s.x},${s.y}`);
      }
    }
  });

  it("starts with a backdrop that fills the frame, and stays inside it", () => {
    for (const id of BLOG_SCENE_IDS) {
      const [bg, ...rest] = BLOG_SCENES[id].shapes;
      assert.equal(bg.t, "rect", id);
      assert.deepEqual([bg.x, bg.y, bg.w, bg.h], [0, 0, SCENE_W, SCENE_H], id);
      for (const s of rest) {
        if (s.t === "rect") assert.ok(s.x >= -0.01 && s.y >= -0.01 && s.x + s.w <= SCENE_W + 0.01 && s.y + s.h <= SCENE_H + 0.01, `${id}: rect ${s.x},${s.y}`);
        if (s.t === "art") assert.ok(s.x >= -20 && s.y >= -20 && s.x + s.size <= SCENE_W + 20 && s.y + s.size <= SCENE_H + 20, `${id}: ${s.id} is out of the frame`);
      }
    }
  });
});

describe("viewBoxFor", () => {
  it("shows the whole scene in a box of the scene's own shape", () => {
    assert.deepEqual(viewBoxFor(SCENE_W / SCENE_H, 100), { x: 0, y: 0, w: SCENE_W, h: SCENE_H });
  });

  it("trims the top and bottom evenly in a wider box", () => {
    const vb = viewBoxFor(2.5, 100);
    assert.equal(vb.w, SCENE_W);
    assert.ok(vb.h < SCENE_H);
    assert.ok(Math.abs(vb.y - (SCENE_H - vb.h) / 2) < 1e-9);
  });

  it("takes a window of the full height round the focus in a narrower box", () => {
    const vb = viewBoxFor(1, 130);
    assert.deepEqual(vb, { x: 70, y: 0, w: SCENE_H, h: SCENE_H });
  });

  it("never leaves the frame, whatever the focus, and survives a bad aspect", () => {
    for (const focus of [-50, 0, 10, 190, 400]) {
      const vb = viewBoxFor(0.5, focus);
      assert.ok(vb.x >= 0 && vb.x + vb.w <= SCENE_W + 1e-9, `focus ${focus}`);
    }
    assert.deepEqual(viewBoxFor(NaN, 100), { x: 0, y: 0, w: SCENE_W, h: SCENE_H });
    assert.deepEqual(viewBoxFor(0, 100), { x: 0, y: 0, w: SCENE_W, h: SCENE_H });
  });
});
