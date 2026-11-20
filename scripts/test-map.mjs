import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const imp = (p) => import(pathToFileURL(path.resolve(p)).href);
const core = await imp("components/map/map-core.ts");
const { WORLD_MAP, project } = await imp("components/map/world-art.ts");
const vocab = await imp("scripts/lib/map-vocab.mjs");
const { validateMapData, validateMap } = await imp("scripts/lib/map-rules.mjs");

const W = 360;
const H = 700;

test("the app's kinds and names match the content vocabulary and every kind has a colour", () => {
  assert.deepEqual([...core.MAP_KINDS], vocab.MAP_KINDS);
  assert.deepEqual(core.MAP_KIND_NAMES, vocab.MAP_KIND_NAMES);
  for (const k of core.MAP_KINDS) {
    assert.ok(core.MAP_KIND_COLORS[k].face && core.MAP_KIND_COLORS[k].lip, k);
    assert.notEqual(core.MAP_KIND_COLORS[k].face, core.MAP_KIND_COLORS[k].lip);
  }
  assert.equal(core.kindOf("accident"), "accident");
  assert.equal(core.kindOf("something new"), "history");
});

test("a pin sits where the projection puts the place, inside the map", () => {
  const paris = core.sitePoint({ lat: 48.86, lon: 2.35 });
  assert.deepEqual(paris, project(2.35, 48.86));
  const tokyo = core.sitePoint({ lat: 35.7, lon: 139.7 });
  assert.ok(tokyo.x > paris.x);
  for (const p of [paris, tokyo]) assert.ok(p.x >= 0 && p.x <= WORLD_MAP.width && p.y >= 0 && p.y <= WORLD_MAP.height);
});

test("at zoom 1 the world is centred in the screen; pan and zoom stay over the world", () => {
  const v = core.clampView({ k: 1, cx: 0, cy: 0 }, W, H);
  assert.deepEqual(v, { k: 1, cx: WORLD_MAP.width / 2, cy: WORLD_MAP.height / 2 });
  const zoomed = core.clampView({ k: 99, cx: -500, cy: 9999 }, W, H);
  assert.equal(zoomed.k, core.MAX_ZOOM);
  const s = core.scaleOf(zoomed.k, W);
  assert.ok(zoomed.cx >= W / (2 * s) - 1e-9 && zoomed.cx <= WORLD_MAP.width - W / (2 * s) + 1e-9);
  assert.ok(zoomed.cy >= H / (2 * s) - 1e-9 && zoomed.cy <= WORLD_MAP.height - H / (2 * s) + 1e-9 || WORLD_MAP.height <= H / s);
  assert.equal(core.clampView({ k: 0.2, cx: 1, cy: 1 }, W, H).k, core.MIN_ZOOM);
});

test("zooming about a point keeps the map point under it where it was", () => {
  const from = core.clampView({ k: 6, cx: 500, cy: 213 }, W, H);
  const fx = 120;
  const fy = 330;
  const wx = from.cx + (fx - W / 2) / core.scaleOf(from.k, W);
  const wy = from.cy + (fy - H / 2) / core.scaleOf(from.k, W);
  const after = core.zoomedView(from, 1.2, fx, fy, W, H);
  assert.ok(Math.abs(after.k - 7.2) < 1e-9);
  const back = core.toScreen(after, W, H, wx, wy);
  assert.ok(Math.abs(back.x - fx) < 1e-6 && Math.abs(back.y - fy) < 1e-6, "the point under the fingers stays");
});

test("panning moves the map with the finger", () => {
  const from = core.clampView({ k: 4, cx: 500, cy: 213 }, W, H);
  const moved = core.pannedView(from, 60, 0, W, H);
  assert.ok(moved.cx < from.cx, "dragging right shows what is to the left");
  assert.equal(moved.k, from.k);
});

test("focusing a site puts it on the screen", () => {
  const site = { lat: 51.39, lon: 30.1 };
  const v = core.focusOnSite(site, W, H, 3);
  const at = core.toScreen(v, W, H, ...Object.values(core.sitePoint(site)));
  assert.ok(at.x > 0 && at.x < W && at.y > 0 && at.y < H);
});

test("counting by kind and switching kinds off", () => {
  const sites = [{ kind: "accident" }, { kind: "reactor" }, { kind: "accident" }, { kind: "weird" }];
  const counts = core.countByKind(sites);
  assert.equal(counts.accident, 2);
  assert.equal(counts.history, 1);
  assert.deepEqual(core.visibleSites(sites, new Set(["accident"])).map((s) => s.kind), ["reactor", "weird"]);
  assert.equal(core.placeCountText(1), "1 place");
  assert.equal(core.placeCountText(18), "18 places");
});

// ---- the rules ----------------------------------------------------------------------------

const row = (over = {}) => ({ id: "s1", name: "Name", place: "Place, Country", kind: "history", year: "1945", lat: 10, lon: 20, blurb: "One line.", fact: "A fact.", entry_id: null, ...over });
const world = (sites, over = {}) => ({ sites, references: [{ id: "r1", verified: 1 }, { id: "r2", verified: 0 }], links: sites.map((s) => ({ site_id: s.id, reference_id: "r1" })), entryIds: ["meltdown"], ...over });
const rules = (s, over, opts) => validateMapData(world([s], over), opts).findings.map((f) => `${f.severity}:${f.rule}`);

test("a good site passes; a bad kind, coordinates, missing text and unknown entry fail", () => {
  assert.deepEqual(rules(row()), []);
  assert.deepEqual(rules(row({ kind: "x" })), ["error:map-kind"]);
  assert.deepEqual(rules(row({ lat: 95 })), ["error:map-coordinates"]);
  assert.deepEqual(rules(row({ lon: -181 })), ["error:map-coordinates"]);
  assert.deepEqual(rules(row({ lat: "10" })), ["error:map-coordinates"]);
  assert.deepEqual(rules(row({ fact: "" })), ["error:map-fact"]);
  assert.deepEqual(rules(row({ entry_id: "nope" })), ["error:map-entry"]);
  assert.deepEqual(rules(row({ entry_id: "meltdown" })), []);
});

test("a site needs a source; an unchecked source is a warning, and an error at the publish gate", () => {
  assert.ok(validateMapData(world([row()], { links: [] })).findings.some((f) => f.rule === "map-reference" && f.severity === "error"));
  const unchecked = { links: [{ site_id: "s1", reference_id: "r2" }] };
  assert.deepEqual(rules(row(), unchecked), ["warning:map-reference-unverified"]);
  assert.deepEqual(rules(row(), unchecked, { strictReview: true }), ["error:map-reference-unverified"]);
});

test("the seeded sites pass the rules, are sourced, spread out and inside the map", () => {
  const db = new DatabaseSync("content/database/content.db", { readOnly: true });
  const result = validateMap(db);
  assert.deepEqual(result.findings.filter((f) => f.severity === "error"), []);
  assert.ok(result.checked.map_sites >= 16);
  const sites = db.prepare("SELECT id, lat, lon, kind FROM map_sites").all();
  for (const s of sites) {
    const p = core.sitePoint(s);
    assert.ok(p.x >= 0 && p.x <= WORLD_MAP.width && p.y >= 0 && p.y <= WORLD_MAP.height, `${s.id} is inside the map`);
    assert.ok(vocab.MAP_KINDS.includes(s.kind), s.id);
  }
  assert.equal(db.prepare("SELECT COUNT(DISTINCT site_id) n FROM map_site_references").get().n, result.checked.map_sites);
});
