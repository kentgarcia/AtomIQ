#!/usr/bin/env node
/**
 * Repeatable content migration: a gentler step from lesson 1 and pictures in lessons 2 to 5.
 *   - lesson 2: the particle match asks for charge only, the volume question is no longer a double
 *     negative, the gold foil story is optional (deeper),
 *   - lesson 3: four symbols to match and three elements to order,
 *   - lesson 5: a four-atom sort with atoms the learner has met, and an easy forces match,
 *   - pictures: stadium prediction options, the stadium and marble reveal, helium / carbon / gold in
 *     lesson 3, the electric and strong force and the radiation sign in lesson 5.
 * The new content is read from the authoring source (curriculum/unit-1.mjs), the single place where
 * it is written, and copied onto the rows below. Idempotent; draft edit of the master db.
 *
 *   node --no-warnings scripts/content-migration/smooth-ramp-and-add-art.mjs [--dry-run]
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");
const unit = await import(pathToFileURL(path.join(ROOT, "scripts/content-migration/curriculum/unit-1.mjs")).href);

const ITEMS = [
  "u1-l2-match-particles",
  "u1-l2-tom-volume",
  "u1-l2-predict-stadium",
  "u1-l3-match-symbols",
  "u1-l3-order-atomic-number",
  "u1-l5-choice-push",
  "u1-l5-sort-stable",
  "u1-l5-match-forces",
];
const CARDS = [
  ["protons-neutrons-electrons", "c07"],
  ["protons-neutrons-electrons", "c08"],
  ["elements-and-the-periodic-table", "c03"],
  ["stable-and-unstable-nuclei", "c02"],
  ["stable-and-unstable-nuclei", "c07"],
];

if (!dryRun) backupBeforeScript("smooth-ramp-and-add-art", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("BEGIN IMMEDIATE");
try {
  for (const id of ITEMS) {
    const src = unit.itemBank.find((i) => i.id === id);
    const row = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
    if (!src || !row) {
      console.log(`skip item ${id}: ${src ? "not in the db" : "not in the source"}`);
      continue;
    }
    const data = JSON.stringify(src.data);
    const refs = JSON.stringify(src.referenceIds);
    if (row.data === data && row.difficulty === src.difficulty && row.reference_ids === refs) {
      console.log(`ok   item ${id}`);
      continue;
    }
    console.log(`edit item ${id}`);
    if (!dryRun) db.prepare("UPDATE items SET data = ?, difficulty = ?, reference_ids = ?, updated_at = strftime('%s','now') WHERE id = ?").run(data, src.difficulty, refs, id);
  }
  for (const [lessonId, cardId] of CARDS) {
    const src = unit.lessons.flatMap((l) => l.cards.map((c) => ({ ...c, lessonId: l.lesson.id }))).find((c) => c.lessonId === lessonId && c.id === cardId);
    const row = db.prepare("SELECT * FROM lesson_cards WHERE lesson_id = ? AND id = ?").get(lessonId, cardId);
    if (!src || !row) {
      console.log(`skip card ${lessonId}/${cardId}: ${src ? "not in the db" : "not in the source"}`);
      continue;
    }
    const data = JSON.stringify(src.data);
    if (row.data === data && row.tier === src.tier) {
      console.log(`ok   card ${lessonId}/${cardId}`);
      continue;
    }
    console.log(`edit card ${lessonId}/${cardId}`);
    if (!dryRun) db.prepare("UPDATE lesson_cards SET data = ?, tier = ?, updated_at = strftime('%s','now') WHERE lesson_id = ? AND id = ?").run(data, src.tier, lessonId, cardId);
  }
  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
