#!/usr/bin/env node
/**
 * Content validation for the master content database.
 *
 *   npm run validate:content                # validates content/database/content.db
 *   node --no-warnings scripts/validate-content.mjs --db assets/database/content.db
 *   node --no-warnings scripts/validate-content.mjs --warnings   # also print warnings
 *   node --no-warnings scripts/validate-content.mjs --json       # machine-readable output
 *   node --no-warnings scripts/validate-content.mjs --strict-review  # release gate: unverified references become errors
 *
 * Read-only. Exits 1 when any error-severity finding exists.
 *
 * Surfaces covered (every learner-facing question):
 *   items + lesson_cards (curriculum v2: item bank, card text, scenes, references; rules in
 *   scripts/lib/curriculum-rules.mjs), mythbuster_questions and myths (Myth-or-Fact statements).
 *
 * Rules live in scripts/lib/content-rules.mjs; see docs/CONTENT_QUESTION_QUALITY.md.
 */

import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateDatabase } from "./lib/content-validate.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const dbPath = path.resolve(ROOT, option("--db", "content/database/content.db"));
const showWarnings = flag("--warnings");
const asJson = flag("--json");
const strictReview = flag("--strict-review"); // release gate: every content reference must be verified

const db = new DatabaseSync(dbPath, { readOnly: true });
const { checked, errors, warnings } = validateDatabase(db, { strictReview });

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

if (asJson) {
  console.log(JSON.stringify({ db: dbPath, checked, errors, warnings }, null, 2));
  process.exit(errors.length > 0 ? 1 : 0);
}

const rel = path.relative(ROOT, dbPath);
console.log(`Content validation — ${rel}`);
console.log(
  Object.entries(checked).map(([k, v]) => `${k}: ${v}`).join("  |  "),
);
console.log("");

function printGroup(label, list) {
  if (list.length === 0) return;
  console.log(`${label} (${list.length})`);
  for (const f of list) {
    const tag = f.severity === "error" ? "ERROR" : "warn ";
    console.log(`  ${tag} ${f.table} ${f.id} :: ${f.field} :: ${f.rule}`);
    console.log(`        ${f.message}`);
    if (f.text) console.log(`        > ${String(f.text).replace(/\s+/g, " ").slice(0, 140)}`);
  }
  console.log("");
}

printGroup("ERRORS", errors);
if (showWarnings) printGroup("WARNINGS", warnings);

const byRule = new Map();
for (const f of errors) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
if (byRule.size > 0) {
  console.log("Errors by rule: " + [...byRule.entries()].map(([k, v]) => `${k}=${v}`).join(", "));
}
const itemsWithErrors = new Set(errors.map((f) => `${f.table}:${f.id}`)).size;
console.log(
  errors.length === 0
    ? `PASS — 0 errors${warnings.length ? `, ${warnings.length} warning(s) (run with --warnings)` : ""}.`
    : `FAIL — ${errors.length} error(s) in ${itemsWithErrors} item(s)${warnings.length ? `, ${warnings.length} warning(s)` : ""}.`,
);
process.exit(errors.length > 0 ? 1 : 0);
