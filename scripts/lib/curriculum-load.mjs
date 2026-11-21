/**
 * Loading the curriculum into a throwaway database for the content tests: the DDL of the lesson tables, the cast, and the
 * rows that the source files in content/source describe (the authoring modules unit-N.mjs are retired).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { makePaths } from "./content-paths.mjs";
import { readFiles } from "./content-source/pipeline.mjs";
import { readSourceFiles } from "./content-source/files.mjs";
import { FRIENDLY_ADAPTERS } from "./content-source/registry.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const MIGRATION_DIR = path.resolve(HERE, "..", "content-migration");

const json = (v) => JSON.stringify(v);

export function curriculumDdl() {
  const sql = fs.readFileSync(path.join(MIGRATION_DIR, "schema.sql"), "utf8");
  const a = sql.indexOf("-- BEGIN curriculum-v2");
  const b = sql.indexOf("-- END curriculum-v2");
  if (a < 0 || b < 0) throw new Error("schema.sql is missing the curriculum-v2 markers");
  return sql.slice(a, b);
}

/** The `npcs` block of schema.sql (teachers and their lines). */
export function npcsDdl() {
  const sql = fs.readFileSync(path.join(MIGRATION_DIR, "schema.sql"), "utf8");
  const a = sql.indexOf("-- BEGIN npcs");
  const b = sql.indexOf("-- END npcs");
  if (a < 0 || b < 0) throw new Error("schema.sql is missing the npcs markers");
  return sql.slice(a, b);
}

/** Seed the cast from components/npc/npc-roster.ts and point each existing unit at its teacher. */
export async function seedNpcs(db) {
  const { NPC_ROSTER, NPC_LINES } = await import(pathToFileURL(path.resolve(HERE, "..", "..", "components", "npc", "npc-roster.ts")).href);
  for (const n of NPC_ROSTER) db.prepare("INSERT INTO npcs (id, name, title, field, bio, spec, position) VALUES (?,?,?,?,?,?,?)").run(n.id, n.name, n.title, n.field, n.bio, JSON.stringify(n.spec), n.position);
  const lessons = new Set(db.prepare("SELECT id FROM lessons").all().map((r) => r.id));
  for (const l of NPC_LINES) if (!l.lessonId || lessons.has(l.lessonId)) db.prepare("INSERT INTO npc_lines (id, npc_id, kind, lesson_id, journey_id, text, pose) VALUES (?,?,?,?,?,?,?)").run(l.id, l.npcId, l.kind, l.lessonId ?? null, l.journeyId ?? null, l.text, l.pose);
  for (const n of NPC_ROSTER) db.prepare("UPDATE units SET teacher_npc_id = ? WHERE id = ?").run(n.id, n.unitId);
}

/** The rows of the lesson tables (and the sources they cite) as the source files in content/source describe them. */
export function loadSourceRows(paths = makePaths()) {
  const rows = {};
  for (const name of ["references", "curriculum"]) {
    const adapter = FRIENDLY_ADAPTERS.get(name);
    Object.assign(rows, readFiles(adapter, readSourceFiles(paths.sourceDir, adapter.owns)).rows);
  }
  return rows;
}

const INSERT_ORDER = ["content_references", "units", "unit_references", "objectives", "items", "lessons", "lesson_references", "lesson_cards", "path_nodes"];

/**
 * Insert rows into a database that has the curriculum tables (a test's in-memory copy). Columns the target table does not
 * have are skipped, and `skip` names columns to leave out (a unit's teacher, whose cast the test seeds separately).
 */
export function insertRows(db, rows, { skip = [] } = {}) {
  for (const table of INSERT_ORDER) {
    const have = new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((c) => c.name));
    for (const row of rows[table] ?? []) {
      const cols = Object.keys(row).filter((c) => have.has(c) && !skip.includes(c));
      const values = cols.map((c) => (row[c] !== null && typeof row[c] === "object" ? json(row[c]) : row[c]));
      db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`).run(...values);
    }
  }
}
