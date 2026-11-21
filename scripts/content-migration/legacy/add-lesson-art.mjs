#!/usr/bin/env node
/**
 * Repeatable content migration: pictures for lesson 1 ("Atoms are everywhere"). Adds an `art` id
 * (components/lesson/visual/object-art.ts) to the sort, order and choice items and to the zoom stops,
 * and redraws the card figures that used plain circles and boxes (hand, cell, atom; matter and
 * energy) with pictures. Idempotent: a row already carrying the same value is left alone, and nothing
 * else in a row changes. Draft edit of the master db; publish to ship.
 *
 *   node --no-warnings scripts/content-migration/add-lesson-art.mjs [--dry-run]
 *
 * The authoring source (curriculum/unit-1.mjs, scenes.mjs) carries the same values.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";

/**
 * RETIRED (content source files, phase 5): the lesson tables (units, objectives, lessons, path nodes, items, cards and their sources) are written in content/source/units and built with `npm run content:sync`; the authoring modules unit-N.mjs are retired too.
 * Running this would overwrite them behind the files' back. Kept only as history. Do not run it. Edit the files
 * (docs/features/CONTENT_SOURCE_SPEC.md, docs/features/CONTENT_SOURCE_PHASE5_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("add-lesson-art.mjs is retired: the curriculum lives in content/source/units and is built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");
const { zoomChain, matterVsEnergy } = await import(pathToFileURL(path.join(ROOT, "scripts/content-migration/legacy/curriculum/scenes.mjs")).href);
const { isArtId } = await import(pathToFileURL(path.join(ROOT, "components/lesson/visual/object-art.ts")).href);

/** item id -> { list: where the entries are, art: entry id -> art id } */
const ITEM_ART = {
  "u1-l1-sort-matter": { list: "items", art: { water: "water", air: "air", phone: "phone", apple: "apple", light: "sun", heat: "flame" } },
  "u1-l1-order-sizes": { list: "items", art: { atom: "atom", rbc: "rbc", hair: "hair", rice: "rice" } },
  "u1-l1-choice-made-of": { list: "options", art: { light: "lamp", shadow: "shadow", salt: "salt", sound: "sound" } },
};
const STOP_ART = { hand: "hand", cell: "cell", virus: "virus", atom: "atom" };
const LESSON = "atoms-are-everywhere";
// c06 became the hair-width card and is owned by rework-lesson-1-opening.mjs.
const FIGURES = { c02: zoomChain(), c04: matterVsEnergy() };

for (const map of [...Object.values(ITEM_ART).map((m) => m.art), STOP_ART]) for (const id of Object.values(map)) if (!isArtId(id)) throw new Error(`unknown art id: ${id}`);

if (!dryRun) backupBeforeScript("add-lesson-art", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("BEGIN IMMEDIATE");
try {
  for (const [itemId, spec] of Object.entries(ITEM_ART)) {
    const row = db.prepare("SELECT data FROM items WHERE id = ?").get(itemId);
    if (!row) { console.log(`skip ${itemId}: no such item`); continue; }
    const data = JSON.parse(row.data);
    let changed = false;
    for (const entry of data[spec.list] ?? []) {
      const art = spec.art[entry.id];
      if (art && entry.art !== art) { entry.art = art; changed = true; }
    }
    console.log(`${changed ? "edit" : "ok  "} ${itemId}`);
    if (changed && !dryRun) db.prepare("UPDATE items SET data = ?, updated_at = strftime('%s','now') WHERE id = ?").run(JSON.stringify(data), itemId);
  }

  const sim = db.prepare("SELECT data FROM lesson_cards WHERE lesson_id = ? AND id = 'c05'").get(LESSON);
  if (sim) {
    const data = JSON.parse(sim.data);
    let changed = false;
    for (const stop of data.stops ?? []) {
      const art = STOP_ART[stop.id];
      if (art && stop.art !== art) { stop.art = art; changed = true; }
    }
    console.log(`${changed ? "edit" : "ok  "} ${LESSON}/c05 (zoom stops)`);
    if (changed && !dryRun) db.prepare("UPDATE lesson_cards SET data = ?, updated_at = strftime('%s','now') WHERE lesson_id = ? AND id = 'c05'").run(JSON.stringify(data), LESSON);
  }

  for (const [cardId, figure] of Object.entries(FIGURES)) {
    const row = db.prepare("SELECT data FROM lesson_cards WHERE lesson_id = ? AND id = ?").get(LESSON, cardId);
    if (!row) { console.log(`skip ${LESSON}/${cardId}: no such card`); continue; }
    const data = JSON.parse(row.data);
    const next = { ...data, figure: { ...(data.figure ?? {}), scene: figure.scene, altText: figure.altText } };
    const changed = JSON.stringify(next.figure) !== JSON.stringify(data.figure);
    console.log(`${changed ? "edit" : "ok  "} ${LESSON}/${cardId} (figure)`);
    if (changed && !dryRun) db.prepare("UPDATE lesson_cards SET data = ?, updated_at = strftime('%s','now') WHERE lesson_id = ? AND id = ?").run(JSON.stringify(next), LESSON, cardId);
  }
  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
