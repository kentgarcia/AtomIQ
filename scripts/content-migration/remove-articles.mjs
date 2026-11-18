#!/usr/bin/env node
/**
 * Removes the Articles / Posts feature from the content database. Idempotent:
 *
 *   1. Drops the `articles` and `posts` tables and their indexes.
 *   2. Drops `encyclopedia_entries.related_articles` (the encyclopedia itself stays).
 *
 * Takes a backup first. A database that is already clean is left untouched (no
 * backup, no write). Does not publish or run sync-content; the release step does.
 *
 *   node --no-warnings scripts/content-migration/remove-articles.mjs [--dry-run] [--db path]
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

const TABLES = ["articles", "posts"];
const INDEXES = ["idx_articles_category", "idx_articles_featured", "idx_articles_published", "idx_posts_category", "idx_posts_published"];

function plan(db) {
  const has = (type, name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?").get(type, name);
  const cols = db.prepare("PRAGMA table_info(encyclopedia_entries)").all().map((c) => c.name);
  return {
    tables: TABLES.filter((t) => has("table", t)),
    indexes: INDEXES.filter((i) => has("index", i)),
    column: cols.includes("related_articles"),
  };
}

const probe = new DatabaseSync(dbPath, { readOnly: true });
const todo = plan(probe);
probe.close();

if (!todo.tables.length && !todo.indexes.length && !todo.column) {
  console.log("remove-articles: nothing to do (already applied).");
  process.exit(0);
}
console.log(`remove-articles: dropping tables [${todo.tables.join(", ")}], indexes [${todo.indexes.join(", ")}]${todo.column ? ", encyclopedia_entries.related_articles" : ""}`);
if (dryRun) process.exit(0);

backupBeforeScript("remove-articles", dbPath); // safety net: scripts/lib/backup.mjs
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN");
try {
  for (const i of todo.indexes) db.exec(`DROP INDEX IF EXISTS ${i}`);
  for (const t of todo.tables) db.exec(`DROP TABLE IF EXISTS ${t}`);
  if (todo.column) db.exec("ALTER TABLE encyclopedia_entries DROP COLUMN related_articles");
  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
db.close();
console.log("remove-articles: done.");
