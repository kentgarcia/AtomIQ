#!/usr/bin/env node
/**
 * NPC teachers migration (docs/features/NPC_TEACHERS_SPEC.md §7.1). Idempotent and additive:
 *
 *   1. Creates `npcs` and `npc_lines` (the `npcs` block of schema.sql) and adds `units.teacher_npc_id`.
 *   2. Seeds the cast and the voice lines from components/npc/npc-roster.ts. Existing rows are left
 *      alone, so later edits in Content Studio survive a re-run; only missing rows are inserted.
 *   3. Points each existing unit at its teacher (only when the unit has none yet).
 *
 * Takes a backup first. Does not publish or run sync-content; the release step does.
 *
 *   node --no-warnings scripts/content-migration/legacy/add-npcs.mjs [--dry-run] [--db path]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";

/**
 * RETIRED (content source files). The rows this script writes (characters) are written in content/source and built with
 * `npm run content:sync`; running this would overwrite them behind the files' back. Kept only as history.
 * Do not run it. Edit the files (docs/features/CONTENT_SOURCE_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("add-npcs.mjs is retired: characters live in content/source and are built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

const { NPC_ROSTER, NPC_LINES } = await import(pathToFileURL(path.join(ROOT, "components/npc/npc-roster.ts")).href);

const sql = fs.readFileSync(path.join(ROOT, "scripts/content-migration/schema.sql"), "utf8");
const a = sql.indexOf("-- BEGIN npcs");
const b = sql.indexOf("-- END npcs");
if (a < 0 || b < 0) throw new Error("schema.sql is missing the npcs markers");
const ddl = sql.slice(a, b);

if (!dryRun) backupBeforeScript("add-npcs", dbPath); // safety net: scripts/lib/backup.mjs
const db = new DatabaseSync(dryRun ? ":memory:" : dbPath);
db.exec("PRAGMA foreign_keys = ON");

if (dryRun) {
  // A dry run only proves the DDL and the seed rows are valid, against an empty database.
  db.exec("CREATE TABLE lessons (id TEXT PRIMARY KEY)");
  db.exec("CREATE TABLE units (id TEXT PRIMARY KEY, teacher_npc_id TEXT)");
  for (const l of NPC_LINES) if (l.lessonId) db.prepare("INSERT OR IGNORE INTO lessons (id) VALUES (?)").run(l.lessonId);
}

db.exec(ddl);
const unitCols = db.prepare("PRAGMA table_info(units)").all().map((c) => c.name);
if (!unitCols.includes("teacher_npc_id")) db.exec("ALTER TABLE units ADD COLUMN teacher_npc_id TEXT REFERENCES npcs(id)");

const insNpc = db.prepare("INSERT OR IGNORE INTO npcs (id, name, title, field, bio, spec, position) VALUES (?,?,?,?,?,?,?)");
let npcs = 0;
for (const n of NPC_ROSTER) npcs += Number(insNpc.run(n.id, n.name, n.title, n.field, n.bio, JSON.stringify(n.spec), n.position).changes);

const lessonIds = new Set(db.prepare("SELECT id FROM lessons").all().map((r) => r.id));
const insLine = db.prepare("INSERT OR IGNORE INTO npc_lines (id, npc_id, kind, lesson_id, journey_id, text, pose) VALUES (?,?,?,?,?,?,?)");
let lines = 0;
let skipped = 0;
for (const l of NPC_LINES) {
  // A lesson line is only seeded once its lesson exists.
  if (l.lessonId && !lessonIds.has(l.lessonId) && !dryRun) {
    skipped++;
    continue;
  }
  lines += Number(insLine.run(l.id, l.npcId, l.kind, l.lessonId ?? null, l.journeyId ?? null, l.text, l.pose).changes);
}

let linked = 0;
for (const n of NPC_ROSTER) {
  linked += Number(db.prepare("UPDATE units SET teacher_npc_id = ? WHERE id = ? AND teacher_npc_id IS NULL").run(n.id, n.unitId).changes);
}

// Story cards are told by the unit's teacher (rule R5): set the speaker where missing.
let spoken = 0;
if (!dryRun) {
  const stories = db.prepare("SELECT c.lesson_id, c.id, c.data, u.teacher_npc_id AS teacher FROM lesson_cards c JOIN lessons l ON l.id = c.lesson_id JOIN units u ON u.id = l.unit_id WHERE c.type = 'story'").all();
  const upd = db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = ? AND id = ?");
  for (const s of stories) {
    const data = JSON.parse(s.data);
    if (s.teacher && data.speaker === undefined) {
      upd.run(JSON.stringify({ ...data, speaker: s.teacher }), s.lesson_id, s.id);
      spoken++;
    }
  }
}
db.close();
console.log(`${dryRun ? "[dry run] " : ""}npcs +${npcs}, lines +${lines}${skipped ? ` (${skipped} waiting for their lessons)` : ""}, units linked ${linked}, story speakers set ${spoken}`);
