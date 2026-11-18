#!/usr/bin/env node
/**
 * Curriculum v2 cutover (docs/LESSON_RESTRUCTURE_SPEC.md §10.4).
 *
 * Replaces the old lessons / lesson_steps / quizzes / quiz_questions with the v2
 * curriculum tables and loads the authored units. Repeatable: units already
 * authored are rewritten from the source files, so run it again after editing
 * scripts/content-migration/curriculum/unit-*.mjs.
 *
 *   node scripts/content-migration/curriculum-cutover.mjs [--db <path>] [--dry-run]
 *
 * --dry-run works on a temporary copy and prints the validation report; nothing
 * is written. Without it the script takes a pre-script backup first.
 *
 * Before the old tables are dropped, their content is saved to
 * scripts/content-migration/legacy/ (reviewed visual blocks and the old lessons
 * and quizzes) so later units can reuse what is still good.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";
import { validateDatabase } from "../lib/content-validate.mjs";
import { curriculumDdl, insertUnit, loadUnitModules } from "../lib/curriculum-load.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");
const LEGACY_DIR = path.join(HERE, "legacy");

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const dbArg = argv.indexOf("--db");
const masterPath = path.resolve(REPO, dbArg >= 0 ? argv[dbArg + 1] : "content/database/content.db");

const OLD_TABLES = ["lesson_steps", "lessons", "quiz_questions", "quizzes"];
const NEW_TABLES = [
  "content_translations",
  "lesson_references",
  "unit_references",
  "content_references",
  "lesson_cards",
  "items",
  "path_nodes",
  "lessons",
  "objectives",
  "units",
];


const tableExists = (db, name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
const isV2 = (db) => tableExists(db, "lesson_cards");

/** Save what is about to be dropped. Skipped when the database is already v2. */
function saveLegacy(db) {
  if (isV2(db) || !tableExists(db, "lesson_steps")) return;
  fs.mkdirSync(LEGACY_DIR, { recursive: true });
  const parse = (v) => {
    try {
      return JSON.parse(v);
    } catch {
      return v;
    }
  };
  const lessons = db.prepare("SELECT * FROM lessons ORDER BY id").all().map((l) => ({
    ...l,
    prerequisites: parse(l.prerequisites),
    tags: parse(l.tags),
    steps: db.prepare("SELECT id, step_type, position, data FROM lesson_steps WHERE lesson_id = ? ORDER BY position").all(l.id).map((s) => ({ ...s, data: parse(s.data) })),
  }));
  const quizzes = tableExists(db, "quizzes")
    ? db.prepare("SELECT * FROM quizzes ORDER BY id").all().map((q) => ({
        ...q,
        metadata: parse(q.metadata),
        tags: parse(q.tags),
        questions: db.prepare("SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY position").all(q.id).map((x) => ({ ...x, options: parse(x.options), correct_answer: parse(x.correct_answer) })),
      }))
    : [];
  const blocks = [];
  for (const l of lessons) for (const s of l.steps) for (const v of s.data?.visuals ?? []) blocks.push({ lessonId: l.id, stepId: s.id, block: v });
  const write = (name, data) => fs.writeFileSync(path.join(LEGACY_DIR, name), `${JSON.stringify(data, null, 2)}\n`);
  write("lessons.json", lessons);
  write("quizzes.json", quizzes);
  write("visual-blocks.json", blocks);
  console.log(`[legacy] saved ${lessons.length} lessons, ${quizzes.length} quizzes, ${blocks.length} visual blocks to ${path.relative(REPO, LEGACY_DIR)}`);
}

function dropOld(db) {
  if (isV2(db)) return;
  for (const t of OLD_TABLES) db.exec(`DROP TABLE IF EXISTS ${t}`);
}

function clearNew(db) {
  for (const t of NEW_TABLES) db.exec(`DELETE FROM ${t}`);
}

/** Other content pointed at old lesson ids; those links no longer resolve. */
function clearOldLinks(db) {
  let cleared = 0;
  for (const table of ["myths"]) {
    if (!tableExists(db, table)) continue;
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes("related_lessons")) continue;
    const res = db.prepare(`UPDATE ${table} SET related_lessons = '[]' WHERE related_lessons != '[]'`).run();
    cleared += Number(res.changes);
  }
  if (cleared) console.log(`[links] cleared related_lessons on ${cleared} row(s); re-link per unit as lessons are authored`);
}

async function run(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  try {
    saveLegacyIfReal(db);
    db.exec("BEGIN");
    try {
      dropOld(db);
      db.exec(curriculumDdl());
      clearNew(db);
      for (const mod of await loadUnitModules()) insertUnit(db, mod);
      clearOldLinks(db);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
    const result = validateDatabase(db, { strictReview: false });
    return result;
  } finally {
    db.close();
  }
}

let writeLegacy = true;
function saveLegacyIfReal(db) {
  if (writeLegacy) saveLegacy(db);
}

async function main() {
  if (!fs.existsSync(masterPath)) throw new Error(`No database at ${masterPath}`);
  let target = masterPath;
  if (dryRun) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atomiq-cutover-"));
    target = path.join(dir, "content.db");
    const src = new DatabaseSync(masterPath, { readOnly: true });
    src.exec(`VACUUM INTO '${target.replace(/'/g, "''")}'`);
    src.close();
    writeLegacy = false;
    console.log(`[dry-run] working on a copy: ${target}`);
  } else {
    backupBeforeScript("curriculum-cutover", masterPath);
  }

  const result = await run(target);
  const errors = result.errors.filter((f) => /^(units|objectives|lessons|lesson_cards|items|path_nodes|content_references|unit_references|lesson_references|myths|articles|posts)$/.test(f.table));
  const warnings = result.warnings.filter((f) => /^(units|objectives|lessons|lesson_cards|items|path_nodes|content_references)$/.test(f.table));
  console.log(`checked: ${Object.entries(result.checked).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  for (const f of errors) console.log(`ERROR ${f.table} ${f.id} :: ${f.field} :: ${f.rule}\n      ${f.message}${f.text ? `\n      > ${String(f.text).slice(0, 120)}` : ""}`);
  for (const f of warnings.slice(0, 40)) console.log(`warn  ${f.table} ${f.id} :: ${f.field} :: ${f.rule}\n      ${f.message}`);
  if (warnings.length > 40) console.log(`... ${warnings.length - 40} more warning(s)`);
  console.log(errors.length ? `FAIL: ${errors.length} error(s)` : `OK: curriculum content is valid (${warnings.length} warning(s))`);
  if (dryRun) fs.rmSync(path.dirname(target), { recursive: true, force: true });
  process.exit(errors.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
