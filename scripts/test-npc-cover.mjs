import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { COVER_H, COVER_W, DEFAULT_COVER_GLYPHS, GLYPHS, NPC_COVER_GLYPHS, coverColors, coverLayout, coverTones, coverViewBox, glyphsFor } from "../components/npc/npc-cover-art.ts";
import { NPC_ROSTER } from "../components/npc/npc-roster.ts";

const HEX = /^#[0-9A-F]{6}$/i;

describe("teacher profile covers", () => {
  it("gives every teacher in the roster their own set of at least six pictures", () => {
    const seen = new Set();
    for (const npc of NPC_ROSTER) {
      const set = NPC_COVER_GLYPHS[npc.id];
      assert.ok(set && set.length >= 6, `${npc.id} has no cover set`);
      assert.equal(new Set(set).size, set.length, `${npc.id} repeats a picture`);
      for (const g of set) {
        assert.ok(GLYPHS[g], `${npc.id}: unknown picture ${g}`);
        assert.ok(!seen.has(g) || g === "sparkle", `${g} is shared between teachers`);
        seen.add(g);
      }
    }
  });

  it("falls back to a default set for a teacher it does not know", () => {
    assert.deepEqual(glyphsFor("npc-nobody"), DEFAULT_COVER_GLYPHS);
    assert.deepEqual(glyphsFor(null), DEFAULT_COVER_GLYPHS);
    assert.deepEqual(glyphsFor("npc-ada"), NPC_COVER_GLYPHS["npc-ada"]);
    for (const g of DEFAULT_COVER_GLYPHS) assert.ok(GLYPHS[g], g);
  });

  it("draws pictures from flat shapes: solid fills and round strokes, readable stroke widths", () => {
    for (const [id, shapes] of Object.entries(GLYPHS)) {
      assert.ok(shapes.length >= 1 && shapes.length <= 14, id);
      for (const s of shapes) {
        assert.ok(["p", "l", "c", "r"].includes(s.t), `${id}: ${s.t}`);
        if (s.t === "p" || s.t === "l") assert.ok(!s.d.includes("url(") && /^M/.test(s.d), id);
        if (s.t === "l" || s.t === "r") assert.ok(s.w >= 1.7 && s.w <= 4.6, `${id}: stroke ${s.w}`);
        if (s.t === "c") assert.ok(s.cx - s.r >= 0 && s.cx + s.r <= 24 && s.cy - s.r >= 0 && s.cy + s.r <= 24, `${id}: circle out of the 24 box`);
        if (s.t === "r") assert.ok(s.cx - s.r - s.w / 2 >= -0.5 && s.cx + s.r + s.w / 2 <= 24.5, `${id}: ring out of the 24 box`);
      }
    }
  });

  it("lays the glyphs out on a staggered grid that stays in the frame and never repeats beside itself", () => {
    for (const set of Object.values(NPC_COVER_GLYPHS)) {
      const { glyphs, dots } = coverLayout(set);
      assert.equal(glyphs.length, 24);
      assert.equal(dots.length, 24);
      for (const g of glyphs) {
        assert.ok(g.size >= 24 && g.size <= 40, `size ${g.size}`);
        assert.ok(g.y >= -4 && g.y + g.size <= COVER_H + 4, `row out of the frame: ${g.y}`);
        assert.ok(set.includes(g.glyph));
      }
      for (let i = 0; i < glyphs.length - 1; i++) if (i % 8 !== 7) assert.notEqual(glyphs[i].glyph, glyphs[i + 1].glyph, `neighbours at ${i}`);
      assert.ok(glyphs.some((g) => g.tone === "shade") && glyphs.some((g) => g.tone === "light"));
    }
  });

  it("uses every picture of a set somewhere on the cover", () => {
    for (const set of Object.values(NPC_COVER_GLYPHS)) {
      const used = new Set(coverLayout(set).glyphs.map((g) => g.glyph));
      for (const g of set) assert.ok(used.has(g), `${g} never appears`);
    }
  });

  it("takes both tones from the cover colour (the outfit's unless the teacher has their own): the colour, a lighter tint, and the shade", () => {
    for (const npc of NPC_ROSTER) {
      const t = coverTones(coverColors(npc.spec));
      const source = npc.spec.cover ?? npc.spec.outfit;
      for (const v of Object.values(t)) assert.match(v, HEX);
      assert.equal(t.base, source.color);
      assert.equal(t.shade, source.shade);
      assert.notEqual(t.light, t.base);
    }
  });

  it("crops to the box: all of it when wide, a window round the middle when narrow", () => {
    assert.deepEqual(coverViewBox(COVER_W / COVER_H), { x: 0, y: 0, w: COVER_W, h: COVER_H });
    const wide = coverViewBox(6);
    assert.equal(wide.w, COVER_W);
    assert.ok(wide.h < COVER_H);
    const narrow = coverViewBox(2);
    assert.equal(narrow.h, COVER_H);
    assert.ok(Math.abs(narrow.x - (COVER_W - narrow.w) / 2) < 1e-9);
    assert.deepEqual(coverViewBox(NaN), { x: 0, y: 0, w: COVER_W, h: COVER_H });
  });
});
