#!/usr/bin/env node
/**
 * Repeatable content migration: lesson descriptions of "Inside the atom" become two or three
 * sentences, for the lesson preview screen. Each row is checked against its old text first, so the
 * script is idempotent and never overwrites a later edit. Edits the master db as a draft only.
 *
 *   node --no-warnings scripts/content-migration/expand-lesson-descriptions.mjs [--dry-run]
 *
 * The authoring source (curriculum/unit-1.mjs) carries the same text. Publish to ship it.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");

const CHANGES = [
  ["atoms-are-everywhere", "Everything you can touch is made of atoms. See just how small they are.", "Everything you can touch, from your phone to your own hand, is built from atoms. They are far too small to see, so you will use comparisons to get a feel for just how tiny they are. You will also learn what counts as matter and what does not."],
  ["protons-neutrons-electrons", "Open an atom and meet the three particles inside.", "Every atom is built from three kinds of particles: protons, neutrons and electrons. You will open one up to see what each particle carries and where it sits. You will also find out why the tiny nucleus holds nearly all of the atom's mass."],
  ["elements-and-the-periodic-table", "One number decides what an atom is.", "One number decides which element an atom is: how many protons it has. You will learn how that atomic number works. Then you will practise finding an element's symbol and number on the periodic table."],
  ["isotopes", "Same element, different neutrons.", "Atoms of one element always have the same number of protons, but they can have different numbers of neutrons. Those versions are called isotopes. You will work out the particles in an isotope and name it from its numbers."],
  ["stable-and-unstable-nuclei", "Why most atoms last, and why some change.", "A nucleus packs positive protons close together, so something has to stop them from flying apart. You will see how the electric push and the strong force compete. Then you will learn why most nuclei are stable and what happens when one is not."],
];

if (!dryRun) backupBeforeScript("expand-lesson-descriptions", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("BEGIN IMMEDIATE");
try {
  for (const [id, before, after] of CHANGES) {
    const row = db.prepare("SELECT description FROM lessons WHERE id = ?").get(id);
    if (!row) { console.log(`skip ${id}: no such lesson`); continue; }
    if (row.description === after) { console.log(`ok   ${id}: already updated`); continue; }
    if (row.description !== before) { console.log(`skip ${id}: description was edited since; left alone`); continue; }
    console.log(`edit ${id}`);
    if (!dryRun) db.prepare("UPDATE lessons SET description = ?, updated_at = strftime('%s','now') WHERE id = ?").run(after, id);
  }
  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
