#!/usr/bin/env node
/**
 * Repeatable content migration: Hal's lesson_intro lines become short introductions of what the
 * lesson teaches (shown in the speech bubble on the lesson preview). 20 words or fewer, no fact
 * that is not in the lesson. Each row is checked against its old text first (idempotent, never
 * clobbers a later edit). Draft edit of the master db; publish to ship.
 *
 *   node --no-warnings scripts/content-migration/rewrite-lesson-intro-lines.mjs [--dry-run]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");

const CHANGES = [
  ["line-hal-intro-atoms-are-everywhere", "Look around you. Everything you see is made of atoms. Ready?", "Today you'll see what everything around you is made of, and how small an atom really is."],
  ["line-hal-intro-protons-neutrons-electrons", "Three tiny particles build every atom. Let's meet them.", "We'll open up an atom and meet its three particles. You'll learn what each one does."],
  ["line-hal-intro-elements-and-the-periodic-table", "What makes one element different from another? Let's find out.", "You'll learn the one number that decides an element, then find it on the periodic table."],
  ["line-hal-intro-isotopes", "Same element, different weights. Let's see how that works.", "Atoms of one element can differ a little. You'll learn what isotopes are and how to read them."],
  ["line-hal-intro-stable-and-unstable-nuclei", "Some nuclei stay calm and some do not. Let's see why.", "You'll see what holds a nucleus together, and why some nuclei still change over time."],
];

if (!dryRun) backupBeforeScript("rewrite-lesson-intro-lines", dbPath);
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
