#!/usr/bin/env node
/**
 * Repeatable content migration: the unit 1 intro lines of lessons 3 to 5 match the simplified lessons
 * (elements by protons, isotopes by neutrons, stable and unstable nuclei). 20 words or fewer. Each row is checked against its old text first (idempotent, never
 * clobbers a later edit). Draft edit of the master db; publish to ship.
 *
 *   node --no-warnings scripts/content-migration/simplify-unit-1-intro-lines.mjs [--dry-run]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");

const CHANGES = [
  ["line-ada-intro-elements-and-the-periodic-table", "You'll learn the one number that decides an element, then find it on the periodic table.", "The number of protons tells you which element an atom is. Let's build some."],
  ["line-ada-intro-isotopes", "Atoms of one element can differ a little. You'll learn what isotopes are and how to read them.", "Atoms of one element can differ a little. You'll learn what isotopes are."],
  ["line-ada-intro-stable-and-unstable-nuclei", "You'll see what holds a nucleus together, and why some nuclei still change over time.", "Some nuclei stay the same and some can change. You'll see why that matters."],
];

const db = new DatabaseSync(dbPath);
db.exec("BEGIN IMMEDIATE");
try {
  for (const [id, before, after] of CHANGES) {
    const row = db.prepare("SELECT text FROM npc_lines WHERE id = ?").get(id);
    if (!row) { console.log(`skip ${id}: no such line`); continue; }
    if (row.text === after) { console.log(`ok   ${id}: already updated`); continue; }
    if (row.text !== before) { console.log(`skip ${id}: edited since; left alone`); continue; }
    console.log(`edit ${id}`);
    if (!dryRun) db.prepare("UPDATE npc_lines SET text = ? WHERE id = ?").run(after, id);
  }
  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
