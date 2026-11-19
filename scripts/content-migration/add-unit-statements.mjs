#!/usr/bin/env node
/**
 * Unit statements migration (Myth Buster, Quick Play). Idempotent and additive:
 *
 *   1. Creates `unit_statements` (the `unit-statements` block of schema.sql).
 *   2. Seeds a first draft of 10 myth-or-fact statements for each unit that has none. Existing rows are left
 *      alone, so edits made in Content Studio survive a re-run. The wording follows each unit's lessons, but it is a
 *      DRAFT: review it in Content Studio (MythBuster → Unit statements) before you publish.
 *
 * Takes a backup first. Does not publish or run sync-content; the release step does.
 *
 *   node --no-warnings scripts/content-migration/add-unit-statements.mjs [--dry-run] [--db path]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

/** [verdict, statement, explanation] per unit, in the order they are asked. */
export const DRAFT_STATEMENTS = {
  "inside-the-atom": [
    ["fact", "Everything you can touch, and the air around you, is made of atoms.", "Solids, liquids and gases are all made of atoms. Even air is."],
    ["myth", "Light and heat are made of atoms, just like a rock is.", "Light and heat are not matter. They are not made of atoms."],
    ["fact", "Every atom has a tiny centre called the nucleus, with electrons around it.", "The nucleus sits in the middle and the electrons are around it."],
    ["myth", "Neutrons have a negative charge.", "Neutrons have no charge. Electrons are the negative ones."],
    ["fact", "Protons are positive, electrons are negative, and neutrons have no charge.", "These three charges are what each particle of an atom is like."],
    ["myth", "If an atom gains a neutron, it becomes a different element.", "The number of protons decides the element. A different number of neutrons only makes a different isotope."],
    ["fact", "The number of protons in an atom tells you which element it is.", "Every carbon atom has 6 protons and every oxygen atom has 8."],
    ["myth", "An isotope is always radioactive.", "Many isotopes are perfectly stable. An isotope is not automatically radioactive."],
    ["fact", "Isotopes of one element have the same number of protons but different numbers of neutrons.", "Same protons means same element. Different neutrons means a different isotope."],
    ["myth", "Every nucleus is unstable and will change one day.", "Some nuclei stay the same for ever. Only unstable ones can change."],
  ],
  radioactivity: [
    ["myth", "Radioactivity is something people invented in the last hundred years.", "Radioactivity was here long before people. It is a natural process."],
    ["fact", "Rocks, air, food and even your own body contain a little natural radioactivity.", "Natural radioactivity is all around us, and inside us."],
    ["myth", "Radioactive always means dangerous.", "It depends on the kind and the amount. Radioactive does not automatically mean dangerous."],
    ["fact", "An unstable nucleus changes all by itself, and nobody can say exactly when one nucleus will change.", "The change is natural and unpredictable for a single nucleus."],
    ["myth", "An unstable nucleus has to be hit by something before it can decay.", "Natural decay needs no push. The nucleus changes on its own."],
    ["fact", "Alpha, beta and gamma are three different kinds of radiation.", "They come out of a changing nucleus, but they are three different things."],
    ["myth", "Alpha, beta and gamma are just three names for the same thing.", "They are different from each other. That is why they have different names."],
    ["fact", "Half-life is about a crowd of nuclei, not a timer inside each atom.", "In a big group, half of the unstable nuclei change in one half-life. You cannot say which ones."],
    ["myth", "After one half-life, all the radioactive nuclei in a sample are gone.", "After one half-life, half of them are left, not none."],
    ["fact", "In a decay chain, every change makes a different nucleus, and nothing simply vanishes.", "One decay is not always the end. The new nucleus can change again."],
  ],
};

const sql = fs.readFileSync(path.join(ROOT, "scripts/content-migration/schema.sql"), "utf8");
const a = sql.indexOf("-- BEGIN unit-statements");
const b = sql.indexOf("-- END unit-statements");
if (a < 0 || b < 0) throw new Error("schema.sql is missing the unit-statements markers");
const ddl = sql.slice(a, b);

if (!dryRun) backupBeforeScript("add-unit-statements", dbPath); // safety net: scripts/lib/backup.mjs
const db = new DatabaseSync(dryRun ? ":memory:" : dbPath);
db.exec("PRAGMA foreign_keys = ON");
if (dryRun) {
  db.exec("CREATE TABLE units (id TEXT PRIMARY KEY)");
  for (const id of Object.keys(DRAFT_STATEMENTS)) db.prepare("INSERT INTO units (id) VALUES (?)").run(id);
}

db.exec(ddl);

const ins = db.prepare("INSERT OR IGNORE INTO unit_statements (id, unit_id, position, statement, verdict, explanation) VALUES (?,?,?,?,?,?)");
let added = 0;
for (const [unitId, rows] of Object.entries(DRAFT_STATEMENTS)) {
  if (!db.prepare("SELECT 1 FROM units WHERE id = ?").get(unitId)) continue;
  // Only a unit with no statements yet is seeded, so a unit trimmed or reordered in Studio is not refilled
  if (db.prepare("SELECT COUNT(*) AS n FROM unit_statements WHERE unit_id = ?").get(unitId).n > 0) continue;
  rows.forEach(([verdict, statement, explanation], i) => {
    added += Number(ins.run(`${unitId}-s${String(i + 1).padStart(2, "0")}`, unitId, i, statement, verdict, explanation).changes);
  });
}
db.close();
console.log(`${dryRun ? "[dry run] " : ""}unit_statements: ${added} draft statement(s) added. Review them in Content Studio, then publish.`);
