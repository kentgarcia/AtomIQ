import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const imp = (p) => import(pathToFileURL(path.resolve(p)).href);
const core = await imp("components/scanner/scanner-core.ts");
const scenes = await imp("components/scanner/scan-scenes.ts");
const vignettes = await imp("components/scanner/scan-vignettes.ts");
const { validateScanData, validateScan } = await imp("scripts/lib/scan-rules.mjs");
const vocab = await imp("scripts/lib/scan-vocab.mjs");
const { OBJECT_ART } = await imp("components/lesson/visual/object-art.ts");
const { ELEMENTS } = await imp("content/periodic-table/elements.ts");

// ---- the reticle and the pan -------------------------------------------------------

const VW = 380; // a phone viewport

test("the point under the reticle stays inside the scene, but can reach near its edge", () => {
  assert.deepEqual(core.clampPan({ x: -50, y: -5 }), { x: core.EDGE, y: core.EDGE });
  assert.deepEqual(core.clampPan({ x: 9999, y: 9999 }), { x: core.WORLD.w - core.EDGE, y: core.WORLD.h - core.EDGE });
  assert.deepEqual(core.clampPan({ x: 160, y: 100 }), { x: 160, y: 100 });
  // the view never shows past the bleed a backdrop is drawn with
  assert.ok(core.BLEED >= core.VIEW_UNITS_WIDE / 2 - core.EDGE);
  // and the tallest view (a 300 dp viewport on the narrowest phone) too
  assert.ok(core.BLEED >= 300 / core.scaleFor(300) / 2 - core.EDGE);
  // the full-screen viewfinder: a tall phone's viewfinder never looks past the bleed
  for (const w of [320, 360, 412, 800]) {
    const h = core.maxViewHeight(w);
    assert.ok(h / core.scaleFor(w) / 2 <= core.EDGE + core.BLEED + 1e-9);
    assert.ok(h >= 600, `${w} wide: room for a tall viewfinder`);
  }
});

test("a drag moves the scene with the finger, so the point under the reticle moves the other way", () => {
  const k = core.scaleFor(VW);
  const from = { x: 160, y: 100 };
  const after = core.panAfterDrag(from, 38, 0, VW);
  assert.equal(Math.round((from.x - after.x) * k), 38);
  assert.equal(core.panAfterDrag(from, -100000, 0, VW).x, core.WORLD.w - core.EDGE);
  assert.equal(core.panAfterDrag(from, 0, 100000, VW).y, core.EDGE);
});

const places = [
  { id: "a", x: 20, y: 50, w: 60, h: 60 },
  { id: "b", x: 76, y: 50, w: 60, h: 60 },
  { id: "far", x: 250, y: 50, w: 60, h: 60 },
];

test("lock-on: the box the reticle is in, with a margin, the nearest centre winning", () => {
  assert.equal(core.lockOn(places, { x: 50, y: 80 }), "a");
  assert.equal(core.lockOn(places, { x: 280, y: 80 }), "far");
  assert.equal(core.lockOn(places, { x: 200, y: 80 }), null);
  // in the margin outside a box still counts
  assert.equal(core.lockOn(places, { x: 20 - core.LOCK_MARGIN + 1, y: 80 }), "a");
  assert.equal(core.lockOn(places, { x: 20 - core.LOCK_MARGIN - 1, y: 80 }), null);
  // where two boxes overlap (a and b share 76 to 80), the nearer centre wins
  assert.equal(core.lockOn(places, { x: 79, y: 80 }), "b");
  assert.equal(core.lockOn(places, { x: 70, y: 80 }), "a");
  assert.equal(core.lockOn([], { x: 1, y: 1 }), null);
});

test("a scene starts with the reticle on its first thing", () => {
  const p = core.startPan(places);
  assert.equal(core.lockOn(places, p), "a");
  assert.deepEqual(core.startPan([]), { x: core.WORLD.w / 2, y: core.WORLD.h / 2 });
});

// ---- the scan --------------------------------------------------------------------------

test("a scan takes 1.2 s (300 ms with reduced motion) and its ring fills from 0 to 1", () => {
  assert.equal(core.scanMs(false), 1200);
  assert.equal(core.scanMs(true), 300);
  assert.equal(core.scanFrame(0).ring, 0);
  assert.equal(core.scanFrame(600).ring, 0.5);
  assert.equal(core.scanFrame(1200).done, true);
  assert.equal(core.scanFrame(1199).done, false);
  assert.equal(core.scanFrame(5000).ring, 1);
  assert.equal(core.scanFrame(150, true).ring, 0.5);
  assert.equal(core.scanFrame(150, true).sweep, 0);
});

test("the sweep goes down and comes back, staying between 0 and 1", () => {
  for (let t = 0; t <= 1200; t += 40) {
    const s = core.scanFrame(t).sweep;
    assert.ok(s >= 0 && s <= 1, `${t}: ${s}`);
  }
  assert.ok(core.scanFrame(300).sweep > 0.5);
  assert.ok(core.scanFrame(600).sweep > 0.95);
});

test("the chips fly out one after another, the first early and the last before the end", () => {
  const n = 4;
  assert.equal(core.chipFrame(0, n, 0).opacity, 0);
  let lastStart = -1;
  for (let i = 0; i < n; i++) {
    let start = 0;
    while (start < 1200 && core.chipFrame(i, n, start).opacity === 0) start += 10;
    assert.ok(start > lastStart, `chip ${i} leaves after chip ${i - 1}`);
    lastStart = start;
    assert.equal(core.chipFrame(i, n, 1200).fly, 1, `chip ${i} has landed by the end`);
  }
  assert.deepEqual(core.chipFrame(0, 1, 1200), { fly: 1, opacity: 1 });
  assert.deepEqual(core.chipFrame(2, 4, 0, true), { fly: 1, opacity: 1 });
});

// ---- the result -----------------------------------------------------------------------

const banana = { id: "scan-banana", name: "A banana", scene: "kitchen", object: "banana", blurb: "Sweet.", composition: [{ symbol: "O" }, { symbol: "K", note: "a mineral" }, { symbol: "Xx" }], funFact: "Fact.", atomdexEntryId: "potassium-40", position: 2 };

test("the result joins the composition with the periodic table and leaves out an unknown symbol", () => {
  const r = core.assembleResult(banana);
  assert.deepEqual(r.chips.map((c) => [c.symbol, c.name, c.note]), [["O", "Oxygen", ""], ["K", "Potassium", "a mineral"]]);
  assert.equal(r.chips[0].category, ELEMENTS.find((e) => e.symbol === "O").category);
  assert.equal(r.entryId, "potassium-40");
  assert.equal(core.assembleResult({ ...banana, atomdexEntryId: null }).entryId, null);
});

test("the collection counter and a chip's spoken label", () => {
  assert.equal(core.collectionText(5, 14), "5 of 14 scanned");
  assert.equal(core.collectionText(20, 14), "14 of 14 scanned");
  assert.match(core.chipLabel({ symbol: "K", name: "Potassium", category: "alkali-metal", note: "a mineral" }), /Potassium, K, a mineral/);
});

// ---- the scenes against the content ---------------------------------------------------

test("the scenes are well formed: real pictures, boxes inside the scene, nothing overlapping", () => {
  assert.deepEqual(scenes.SCAN_SCENES.map((s) => s.id), vocab.SCAN_SCENES);
  const seen = new Set();
  for (const s of scenes.SCAN_SCENES) {
    assert.ok(s.places.length >= 2 && s.places.length <= 4, s.id);
    for (const p of s.places) {
      assert.ok(OBJECT_ART[p.object], `${p.id} uses a real picture`);
      assert.ok(vignettes.VIGNETTES[p.object]?.length >= 3, `${p.id} has a little scene of its own`);
      assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= core.WORLD.w && p.y + p.h <= core.WORLD.h, `${p.id} is inside the scene`);
      assert.ok(!seen.has(p.id), `${p.id} is placed once`);
      seen.add(p.id);
    }
    for (const a of s.places) for (const b of s.places) {
      if (a.id < b.id) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${a.id} and ${b.id} do not overlap`);
    }
    // every thing can be locked on from where it stands, even after the pan is clamped (the first one at the scene's left edge)
    for (const p of s.places) assert.equal(core.lockOn(s.places, core.clampPan({ x: p.x + p.w / 2, y: p.y + p.h / 2 })), p.id);
  }
});

test("every scan target in the content has a place, in its scene, with its picture; every place has a target", () => {
  const db = new DatabaseSync("content/database/content.db", { readOnly: true });
  const rows = db.prepare("SELECT id, scene, object FROM scan_targets").all();
  assert.ok(rows.length >= 12, "twelve or more targets");
  const places = new Map(scenes.ALL_PLACES.map((p) => [p.place.id, p]));
  for (const r of rows) {
    const p = places.get(r.id);
    assert.ok(p, `${r.id} has a place in a scene`);
    assert.equal(p.sceneId, r.scene, `${r.id} is in the scene its row names`);
    assert.equal(p.place.object, r.object, `${r.id} is drawn as its row says`);
  }
  const ids = new Set(rows.map((r) => r.id));
  for (const id of places.keys()) assert.ok(ids.has(id), `${id} has a row`);
});

test("the seeded targets pass the rules and are all sourced", () => {
  const db = new DatabaseSync("content/database/content.db", { readOnly: true });
  const result = validateScan(db);
  assert.deepEqual(result.findings.filter((f) => f.severity === "error"), []);
  const linked = db.prepare("SELECT COUNT(DISTINCT target_id) n FROM scan_target_references").get().n;
  assert.equal(linked, result.checked.scan_targets);
  // no amounts anywhere in what a learner reads
  for (const r of db.prepare("SELECT blurb, fun_fact, composition FROM scan_targets").all()) assert.equal(vocab.hasAmount(`${r.blurb} ${r.fun_fact} ${r.composition}`), false);
});

// ---- the rules ---------------------------------------------------------------------------

const target = (over = {}) => ({ id: "t1", name: "Salt", scene: "kitchen", object: "salt", blurb: "A shake.", composition: [{ symbol: "Na" }, { symbol: "Cl", note: "joined to sodium" }], fun_fact: "A fact.", atomdex_entry_id: null, position: 0, ...over });
const world = (targets, over = {}) => ({ targets, references: [{ id: "r1", verified: 1 }, { id: "r2", verified: 0 }], links: targets.map((t) => ({ target_id: t.id, reference_id: "r1" })), entryIds: ["ion"], ...over });
const rules = (t, over, opts) => validateScanData(world([t], over), opts).findings.map((f) => `${f.severity}:${f.rule}`);

test("a good target has no findings", () => {
  assert.deepEqual(rules(target()), []);
});

test("elements must exist, be listed once and carry no amounts", () => {
  assert.ok(rules(target({ composition: [{ symbol: "Zz" }] })).includes("error:scan-symbol"));
  assert.ok(rules(target({ composition: [{ symbol: "Na" }, { symbol: "Na" }] })).includes("error:scan-symbol"));
  assert.ok(rules(target({ composition: [] })).includes("error:scan-composition"));
  assert.ok(rules(target({ composition: [{ symbol: "O", note: "about 65% of it" }] })).includes("error:scan-amount"));
  assert.ok(rules(target({ composition: [{ symbol: "O", note: "65 percent" }] })).includes("error:scan-amount"));
  assert.ok(rules(target({ fun_fact: "It is 78% nitrogen." })).includes("error:scan-amount"));
  assert.ok(!rules(target({ fun_fact: "Two hydrogens for each oxygen." })).includes("error:scan-amount"));
  assert.ok(rules(target({ composition: Array.from({ length: 7 }, (_, i) => ({ symbol: ELEMENTS[i].symbol })) })).includes("warning:scan-composition"));
});

test("a target is sourced: at least one real source, and checked by a person at the publish gate", () => {
  const noLinks = validateScanData(world([target()], { links: [] })).findings.map((f) => `${f.severity}:${f.rule}`);
  assert.ok(noLinks.includes("error:scan-reference"));
  const ghost = validateScanData(world([target()], { links: [{ target_id: "t1", reference_id: "nope" }] })).findings.map((f) => `${f.severity}:${f.rule}`);
  assert.ok(ghost.includes("error:scan-reference"));
  const unchecked = { links: [{ target_id: "t1", reference_id: "r2" }] };
  assert.ok(rules(target(), unchecked).includes("warning:scan-reference-unverified"));
  assert.ok(rules(target(), unchecked, { strictReview: true }).includes("error:scan-reference-unverified"));
});

test("the scene, the picture, the entry and the text are checked", () => {
  assert.ok(rules(target({ scene: "moon" })).includes("error:scan-scene"));
  assert.ok(rules(target({ object: "unicorn" })).includes("error:scan-object"));
  assert.ok(rules(target({ atomdex_entry_id: "nope" })).includes("error:scan-entry"));
  assert.deepEqual(rules(target({ atomdex_entry_id: "ion" })), []);
  assert.ok(rules(target({ name: "" })).includes("error:scan-name"));
  assert.ok(rules(target({ blurb: "" })).includes("error:scan-blurb"));
  assert.ok(rules(target({ fun_fact: "" })).includes("error:scan-fun-fact"));
  assert.ok(rules(target({ blurb: "x".repeat(200) })).includes("warning:scan-blurb"));
});

// ---- what has been scanned (the SQL) ------------------------------------------------------

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE scans (target_id TEXT PRIMARY KEY, first_at INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0,
    synced_at INTEGER, is_dirty INTEGER DEFAULT 1, deleted_at INTEGER, version INTEGER DEFAULT 1)`);
  return {
    async runAsync(sql, params = []) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
    async getAllAsync(sql, params = []) { return db.prepare(sql).all(...params); },
  };
}

test("the first scan of a target is new; repeats count", async () => {
  const db = memoryDb();
  const store = core.createScanStore(() => db);
  assert.deepEqual(await store.record("scan-salt", 100), { first: true, count: 1 });
  assert.deepEqual(await store.record("scan-salt", 200), { first: false, count: 2 });
  assert.deepEqual(await store.record("scan-salt", 300), { first: false, count: 3 });
  assert.deepEqual(await store.record("scan-sun", 400), { first: true, count: 1 });
  assert.deepEqual(await store.list(), [{ targetId: "scan-salt", firstAt: 100, count: 3 }, { targetId: "scan-sun", firstAt: 400, count: 1 }]);
});
