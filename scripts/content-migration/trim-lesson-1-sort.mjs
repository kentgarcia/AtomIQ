#!/usr/bin/env node
/**
 * Repeatable content migration: the lesson 1 sort question ("Which of these are made of atoms?")
 * keeps four things (a phone, an apple, light, heat) so it lays out as two columns of two. Water and air
 * are taught on their own cards. Idempotent; draft edit of the master db.
 *
 *   node --no-warnings scripts/content-migration/trim-lesson-1-sort.mjs [--dry-run]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");
const ITEM = "u1-l1-sort-matter";
const DROP = new Set(["water", "air"]);
const EXPLANATION = "Phones and apples are matter, and matter is made of atoms. Light and heat are forms of energy, not matter.";

if (!dryRun) backupBeforeScript("trim-lesson-1-sort", dbPath);
const db = new DatabaseSync(dbPath);
const row = db.prepare("SELECT data FROM items WHERE id = ?").get(ITEM);
if (!row) throw new Error(`no item ${ITEM}`);
const data = JSON.parse(row.data);
const before = JSON.stringify(data);
data.items = data.items.filter((i) => !DROP.has(i.id)).map((i) => (i.id === "cat" ? { ...i, id: "apple", label: "An apple", art: "apple" } : i));
data.explanation = EXPLANATION;
const changed = JSON.stringify(data) !== before;
console.log(`${changed ? "edit" : "ok  "} ${ITEM}: ${data.items.map((i) => i.id).join(", ")}`);
if (changed && !dryRun) db.prepare("UPDATE items SET data = ?, updated_at = strftime('%s','now') WHERE id = ?").run(JSON.stringify(data), ITEM);
db.close();
