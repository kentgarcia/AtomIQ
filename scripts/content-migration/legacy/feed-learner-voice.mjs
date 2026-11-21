#!/usr/bin/env node
/**
 * Streak posts in the learner's own voice, and warmer comeback posts. Repeatable data fix:
 *
 *   - `streak` templates for 3, 7, 14, 30, 60 and 100 days become first person ("I kept a 7 day
 *     streak"): poster pool `["learner"]`, a friend that always reacts. 14, 60 and 100 are new.
 *   - `comeback` templates become a teacher welcoming the learner back by {name}; more wordings added.
 *
 * Only the rows listed in `scripts/content-migration/feed-content.mjs` for those two triggers are
 * written (INSERT OR REPLACE), so every other template, and any edit made to it in Studio, stays.
 * Takes a backup first. Does not publish or run sync-content.
 *
 *   node --no-warnings scripts/content-migration/legacy/feed-learner-voice.mjs [--dry-run] [--db path]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";
import { LEARNER_POSTER } from "../../lib/feed-vocab.mjs";
import { validateFeed } from "../../lib/feed-rules.mjs";
import { buildTemplates } from "./feed-content.mjs";

/**
 * RETIRED (content source files). The rows this script writes (feed) are written in content/source and built with
 * `npm run content:sync`; running this would overwrite them behind the files' back. Kept only as history.
 * Do not run it. Edit the files (docs/features/CONTENT_SOURCE_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("feed-learner-voice.mjs is retired: feed live in content/source and are built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

if (!dryRun) backupBeforeScript("feed-learner-voice", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN");
try {
  const ids = (table) => new Set(db.prepare(`SELECT id FROM ${table}`).all().map((r) => r.id));
  const npcIds = ids("npcs");
  const rows = buildTemplates(ids("units"), ids("lessons")).filter((t) => t.trigger === "streak" || t.trigger === "comeback");
  const put = db.prepare(
    "INSERT OR REPLACE INTO feed_templates (id, npc_id, poster_pool, kind, trigger, condition, text, chip, reactors, weight) VALUES (?,?,?,?,?,?,?,?,?,?)",
  );
  for (const t of rows) {
    for (const n of [t.npc, ...t.pool, ...t.reactors].filter((x) => x && x !== LEARNER_POSTER)) if (!npcIds.has(n)) throw new Error(`${t.id}: unknown NPC ${n}`);
    put.run(t.id, t.npc, JSON.stringify(t.pool), t.kind, t.trigger, JSON.stringify(t.condition), t.text, t.chip, JSON.stringify(t.reactors), t.weight);
  }
  const { findings } = validateFeed(db);
  const errors = findings.filter((f) => f.severity === "error");
  for (const f of errors) console.log(`  ERROR ${f.table} ${f.id} :: ${f.field} :: ${f.rule}: ${f.message}`);
  if (errors.length) throw new Error("the feed content does not validate");
  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
  console.log(`${dryRun ? "[dry run] " : ""}wrote ${rows.length} streak and comeback templates`);
} catch (error) {
  try {
    db.exec("ROLLBACK");
  } catch {
    /* nothing open */
  }
  throw error;
} finally {
  db.close();
}
