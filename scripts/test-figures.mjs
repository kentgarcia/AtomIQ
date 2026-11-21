/**
 * The figure library (docs/features/CONTENT_SOURCE_PHASE5_SPEC.md section 2): every figure draws a valid scene with alt
 * text, ids are pinned (they only grow), a bad reference never throws, hydrate and the content rules read a `ref`, and
 * every figure stored as an id in the master draws exactly the shapes it stored before it was converted.
 *
 * Run: npm run test:figures
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { checkScene } from "../content/visual-blocks.ts";
import { isArtId } from "../components/lesson/visual/object-art.ts";
import { FIGURES, expandFigure, figureId, figureIds, resolveFigure, withDrawnFigure } from "../components/lesson/visual/figures/index.ts";
import { mapCard, mapItem } from "../content/curriculum/hydrate.ts";
import { openDb } from "./lib/content-tables.mjs";
import { makePaths } from "./lib/content-paths.mjs";
import { sameScene, sceneHash } from "./lib/figure-hash.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IDS_FILE = path.join(HERE, "..", "components", "lesson", "visual", "figures", "figure-ids.json");
const SHIPPED = path.join(HERE, "golden", "figures-shipped.json");
const paths = makePaths();
const haveMaster = fs.existsSync(paths.master);

/** A figure whose function needs arguments must have a sample here (so a new one cannot be forgotten). */
const SAMPLE_ARGS = { "atom-model": [2, 2, 2] };

describe("the library", () => {
  it("figure ids are the kebab-case of the function names", () => {
    assert.equal(figureId("halfLifeBars"), "half-life-bars");
    assert.equal(figureId("atomModel"), "atom-model");
    assert.ok(figureIds().length >= 50, "the library lost figures");
    for (const id of figureIds()) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("every figure draws a valid scene with alt text, the same every time", () => {
    for (const id of figureIds()) {
      const fn = FIGURES[id];
      if (fn.length > 0) assert.ok(SAMPLE_ARGS[id], `${id} takes arguments: add a sample to SAMPLE_ARGS`);
      const r = resolveFigure(id, SAMPLE_ARGS[id]);
      assert.ok(r, `${id} does not draw`);
      const errs = [];
      checkScene(r.scene, "scene", errs);
      assert.deepEqual(errs, [], `${id}: ${errs.join("; ")}`);
      assert.ok(r.altText.trim().length >= 20, `${id}: alt text is too short`);
      for (const sh of r.scene.shapes) if (sh.t === "art") assert.ok(isArtId(sh.id), `${id}: "${sh.id}" is not in the lesson object art`);
      assert.ok(sameScene(r.scene, resolveFigure(id, SAMPLE_ARGS[id]).scene), `${id} is not deterministic`);
    }
  });

  it("ids are pinned: a shipped id never disappears, and a new one is written down", () => {
    const pinned = JSON.parse(fs.readFileSync(IDS_FILE, "utf8"));
    const now = figureIds();
    const gone = pinned.filter((id) => !now.includes(id));
    assert.deepEqual(gone, [], `shipped figure ids were removed or renamed: ${gone.join(", ")}`);
    const added = now.filter((id) => !pinned.includes(id));
    assert.deepEqual(added, [], `new figure ids must be added to ${path.relative(process.cwd(), IDS_FILE)}: ${added.join(", ")}`);
  });
});

describe("a bad reference never throws", () => {
  it("unknown ids, odd arguments and names from Object.prototype give null", () => {
    for (const ref of ["nope", "", "__proto__", "constructor", "toString", 7, null, undefined, {}]) assert.equal(resolveFigure(ref), null, String(ref));
    assert.equal(resolveFigure("half-life-bars", "not a list"), null);
    assert.equal(resolveFigure("half-life-bars", { same: true }), null);
    assert.doesNotThrow(() => resolveFigure("atom-model", [null, null, null]));
    assert.doesNotThrow(() => resolveFigure("isotope-pair", [null]));
  });

  it("expandFigure draws a ref, leaves an inline scene alone and names the problem otherwise", () => {
    const drawn = expandFigure({ ref: "half-life-bars", caption: "A caption." }).figure;
    assert.ok(drawn.scene.shapes.length > 0 && drawn.altText.length > 20 && drawn.caption === "A caption.");
    assert.ok(!("ref" in drawn));
    assert.equal(expandFigure({ ref: "half-life-bars", altText: "My own alt text for this picture." }).figure.altText, "My own alt text for this picture.");
    const inline = { scene: { height: 20, shapes: [] }, altText: "x".repeat(25) };
    assert.equal(expandFigure(inline).figure, inline);
    assert.match(expandFigure({ ref: "nope" }).problem, /not in the figure library/);
    assert.match(expandFigure({ ref: "half-life-bars", scene: inline.scene }).problem, /never both/);
    assert.equal(expandFigure(undefined).figure, undefined);
  });

  it("hydrate draws the figure of a card and an item, and drops an unknown one so the card still plays", () => {
    const card = (data) => mapCard({ lesson_id: "l", id: "c1", position: 0, kind: "teach", type: "explain", tier: "core", item_id: null, scored: 0, data: JSON.stringify(data) });
    const ok = card({ title: "t", body: "b", figure: { ref: "half-life-bars" } });
    assert.ok(ok.data.figure.scene.shapes.length > 0);
    const orig = console.warn;
    const warned = [];
    console.warn = (m) => warned.push(m);
    try {
      const bad = card({ title: "t", body: "b", figure: { ref: "nope" } });
      assert.equal(bad.data.figure, undefined);
      assert.equal(bad.data.title, "t");
      card({ title: "t", body: "b", figure: { ref: "nope" } });
    } finally {
      console.warn = orig;
    }
    assert.equal(warned.length, 1, "an unknown figure is logged once");
    const item = mapItem({ id: "i", objective_id: "o", type: "choice", data: JSON.stringify({ prompt: "p", figure: { ref: "half-life-bars" } }), difficulty: 1, surfaces: "[]", reference_ids: "[]" });
    assert.ok(item.data.figure.scene);
    assert.deepEqual(withDrawnFigure({ a: 1 }), { a: 1 });
  });
});

describe("the master", { skip: !haveMaster }, () => {
  const db = haveMaster ? openDb(paths.master, { readOnly: true }) : null;
  const stored = () => [
    ...db.prepare("SELECT lesson_id, id, data FROM lesson_cards").all().map((r) => ({ key: `card ${r.lesson_id}/${r.id}`, data: JSON.parse(r.data) })),
    ...db.prepare("SELECT id, data FROM items").all().map((r) => ({ key: `item ${r.id}`, data: JSON.parse(r.data) })),
  ];

  it("every figure stored as an id is in the library, and has no scene beside it", () => {
    let refs = 0;
    for (const { key, data } of stored()) {
      if (!data.figure || !("ref" in data.figure)) continue;
      refs++;
      assert.ok(!("scene" in data.figure), `${key} has a ref and a scene`);
      const r = resolveFigure(data.figure.ref, data.figure.args);
      assert.ok(r, `${key}: figure "${data.figure.ref}" does not draw`);
    }
    assert.ok(refs >= 40, `only ${refs} figures are stored as ids`);
  });

  it("every converted figure draws exactly the shapes it stored before (pinned hashes)", () => {
    const pinned = JSON.parse(fs.readFileSync(SHIPPED, "utf8"));
    const byKey = new Map(stored().map((x) => [x.key, x.data]));
    for (const [key, hash] of Object.entries(pinned)) {
      const data = byKey.get(key);
      assert.ok(data, `${key} is gone`);
      const figure = expandFigure(data.figure).figure;
      assert.ok(figure?.scene, `${key} no longer draws`);
      assert.equal(sceneHash(figure.scene), hash, `${key} draws something else than it did before it became an id (a visual fix: update scripts/golden/figures-shipped.json in the same change)`);
    }
  });

  it("no figure is left expanded except the ones that carry tap targets", () => {
    const inline = stored().filter(({ data }) => data.figure?.scene).map((x) => x.key);
    assert.deepEqual(inline, [], `figures stored as shapes: ${inline.join(", ")}`);
  });
});
