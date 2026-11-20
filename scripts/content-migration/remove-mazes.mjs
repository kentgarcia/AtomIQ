#!/usr/bin/env node
/**
 * Removes the old room-by-room Atom Maze from the content database. Idempotent:
 *
 *   1. Drops the `maze_rooms` and `mazes` tables and the `idx_maze_rooms_maze` index.
 *
 * The platformer's story mode (Atom Maze today) takes its questions from the item bank, so nothing
 * reads these tables any more. Takes a backup first. A database that is already clean is left
 * untouched (no backup, no write). Does not publish or run sync-content; the release step does.
 * No maze id was ever shipped (no release exists yet), so no retire reason is needed.
 *
 *   node --no-warnings scripts/content-migration/remove-mazes.mjs [--dry-run] [--db path]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

// Children first: maze_rooms references mazes.
const TABLES = ["maze_rooms", "mazes"];
const INDEXES = ["idx_maze_rooms_maze"];

const probe = new DatabaseSync(dbPath, { readOnly: true });
const has = (type, name) => !!probe.prepare("SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?").get(type, name);
const tables = TABLES.filter((t) => has("table", t));
const indexes = INDEXES.filter((i) => has("index", i));
const counts = Object.fromEntries(tables.map((t) => [t, probe.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n]));
probe.close();

if (!tables.length && !indexes.length) {
  console.log("remove-mazes: nothing to do (already applied).");
  process.exit(0);
}
console.log(
  `remove-mazes: dropping tables [${tables.map((t) => `${t} (${counts[t]} rows)`).join(", ")}], indexes [${indexes.join(", ")}]`,
);
if (dryRun) process.exit(0);

backupBeforeScript("remove-mazes", dbPath); // safety net: scripts/lib/backup.mjs
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN");
try {
  for (const i of indexes) db.exec(`DROP INDEX IF EXISTS ${i}`);
  for (const t of tables) db.exec(`DROP TABLE IF EXISTS ${t}`);
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
db.close();
console.log("remove-mazes: done.");
