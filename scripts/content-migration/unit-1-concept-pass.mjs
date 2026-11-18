#!/usr/bin/env node
/**
 * Repeatable content migration: the unit 1 concept pass.
 *   - more pictures on teaching cards, especially for abstract ideas (balance of forces, empty
 *     space, isotopes, natural radioactivity), plus misconception handling (air is not nothing,
 *     atoms are mostly empty space, changing protons changes the element, isotopes are not
 *     automatically radioactive, radioactivity is natural),
 *   - lesson 1 uses one meaningful size comparison (the apple and the Earth),
 *   - lesson 2 keeps Rutherford as a short story that shows how we know,
 *   - lesson 3 uses the periodic table to go from an atomic number to an element,
 *   - lesson 4 says again and again: same protons, same element; different neutrons, different isotope,
 *   - lesson 5 explains stability as a balance of forces, not as neutron glue,
 *   - the last questions of each lesson ask the learner to use the idea,
 *   - plainer language throughout.
 *
 * The authoring source (curriculum/unit-1.mjs and scenes.mjs) is the one place the content is
 * written. This script copies it onto the master database, leaving everything else alone (the unit's
 * teacher, the NPC lines, other content). Items and cards that are no longer in the source are
 * removed; nothing in unit 1 has been published yet, so no shipped id is retired.
 * Objectives that are no longer in the source are removed too.
 * Idempotent: a second run reports no change. Draft edit of the master db; publish to ship.
 *
 *   node --no-warnings scripts/content-migration/unit-1-concept-pass.mjs [--dry-run] [--db <path>]
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const dbArg = argv.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? argv[dbArg + 1] : "content/database/content.db");
const unit = await import(pathToFileURL(path.join(ROOT, "scripts/content-migration/curriculum/unit-1.mjs")).href);

const json = (v) => JSON.stringify(v);
const now = "strftime('%s','now')";
let changes = 0;
const note = (verb, what) => {
  changes++;
  console.log(`${verb.padEnd(6)} ${what}`);
};

if (!dryRun) backupBeforeScript("unit-1-concept-pass", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN IMMEDIATE");
try {
  const get = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const same = (row, want) => Object.entries(want).every(([k, v]) => row[k] === v);

  // --- unit ---------------------------------------------------------------------------------
  const u = unit.unit;
  const wantUnit = { title: u.title, subtitle: u.subtitle, description: u.description, goal: u.goal, guidebook: json(u.guidebook), icon: u.icon, tone: u.tone };
  const unitRow = get("SELECT * FROM units WHERE id = ?", u.id);
  if (!unitRow) throw new Error(`unit ${u.id} is not in the database: run curriculum-cutover.mjs first`);
  if (!same(unitRow, wantUnit)) {
    note("edit", `unit ${u.id}`);
    run(`UPDATE units SET title=?, subtitle=?, description=?, goal=?, guidebook=?, icon=?, tone=?, updated_at=${now} WHERE id=?`, wantUnit.title, wantUnit.subtitle, wantUnit.description, wantUnit.goal, wantUnit.guidebook, wantUnit.icon, wantUnit.tone, u.id);
  }

  // --- references (before anything that points at them) --------------------------------------
  for (const r of unit.references) {
    const want = { kind: r.kind, publisher: r.publisher, title: r.title, authors: r.authors ?? "", year: r.year ?? "", url: r.url ?? "", note: r.note ?? "" };
    const row = get("SELECT * FROM content_references WHERE id = ?", r.id);
    if (!row) {
      note("add", `reference ${r.id}`);
      run("INSERT INTO content_references (id, kind, publisher, title, authors, year, url, accessed, verified, note) VALUES (?,?,?,?,?,?,?,?,?,?)", r.id, r.kind, r.publisher, r.title, want.authors, want.year, want.url, r.accessed ?? "", r.verified ? 1 : 0, want.note);
    } else if (!same(row, want)) {
      note("edit", `reference ${r.id}`);
      run(`UPDATE content_references SET kind=?, publisher=?, title=?, authors=?, year=?, url=?, note=?, updated_at=${now} WHERE id=?`, want.kind, want.publisher, want.title, want.authors, want.year, want.url, want.note, r.id);
    }
  }

  // --- objectives ----------------------------------------------------------------------------
  for (const o of unit.objectives) {
    const want = { unit_id: o.unitId, position: o.position, statement: o.statement, misconception: o.misconception ?? null };
    const row = get("SELECT * FROM objectives WHERE id = ?", o.id);
    if (!row) {
      note("add", `objective ${o.id}`);
      run("INSERT INTO objectives (id, unit_id, position, statement, misconception) VALUES (?,?,?,?,?)", o.id, o.unitId, o.position, o.statement, want.misconception);
    } else if (!same(row, want)) {
      note("edit", `objective ${o.id}`);
      run(`UPDATE objectives SET position=?, statement=?, misconception=?, updated_at=${now} WHERE id=?`, o.position, o.statement, want.misconception, o.id);
    }
  }

  // --- lessons -------------------------------------------------------------------------------
  for (const l of unit.lessons) {
    const L = l.lesson;
    const want = { title: L.title, description: L.description, estimated_minutes: L.estimatedMinutes, xp_reward: L.xpReward, teaches: json(L.teaches), relies_on: json(L.reliesOn) };
    const row = get("SELECT * FROM lessons WHERE id = ?", L.id);
    if (!row) throw new Error(`lesson ${L.id} is not in the database: run curriculum-cutover.mjs first`);
    if (!same(row, want)) {
      note("edit", `lesson ${L.id}`);
      run(`UPDATE lessons SET title=?, description=?, estimated_minutes=?, xp_reward=?, teaches=?, relies_on=?, updated_at=${now} WHERE id=?`, want.title, want.description, want.estimated_minutes, want.xp_reward, want.teaches, want.relies_on, L.id);
    }
  }

  // --- cards out first (they point at items), then items, then cards back in -----------------
  const lessonIds = unit.lessons.map((l) => l.lesson.id);
  const cardKey = (lessonId, c, position) => json([lessonId, c.id, position, c.kind, c.type, c.tier, c.itemId ?? null, c.scored ? 1 : 0, json(c.data)]);
  const wantCards = new Map();
  for (const l of unit.lessons) l.cards.forEach((c, i) => wantCards.set(`${l.lesson.id}/${c.id}`, cardKey(l.lesson.id, c, i)));
  const haveCards = new Map(all(`SELECT * FROM lesson_cards WHERE lesson_id IN (${lessonIds.map(() => "?").join(",")})`, ...lessonIds).map((r) => [`${r.lesson_id}/${r.id}`, json([r.lesson_id, r.id, r.position, r.kind, r.type, r.tier, r.item_id, r.scored, r.data])]));
  const cardsChanged = wantCards.size !== haveCards.size || [...wantCards].some(([k, v]) => haveCards.get(k) !== v);

  const wantItems = new Map(unit.itemBank.map((i) => [i.id, i]));
  const haveItems = new Map(all("SELECT * FROM items WHERE id LIKE 'u1-%'").map((r) => [r.id, r]));

  if (cardsChanged) {
    for (const k of haveCards.keys()) if (!wantCards.has(k)) note("drop", `card ${k}`);
    run(`DELETE FROM lesson_cards WHERE lesson_id IN (${lessonIds.map(() => "?").join(",")})`, ...lessonIds);
  }
  for (const id of haveItems.keys()) {
    if (!wantItems.has(id)) {
      note("drop", `item ${id}`);
      run("DELETE FROM items WHERE id = ?", id);
    }
  }
  for (const i of unit.itemBank) {
    const want = { objective_id: i.objectiveId, type: i.type, data: json(i.data), difficulty: i.difficulty, surfaces: json(i.surfaces), reference_ids: json(i.referenceIds) };
    const row = haveItems.get(i.id);
    if (!row) {
      note("add", `item ${i.id}`);
      run("INSERT INTO items (id, objective_id, type, data, difficulty, surfaces, reference_ids) VALUES (?,?,?,?,?,?,?)", i.id, i.objectiveId, i.type, want.data, i.difficulty, want.surfaces, want.reference_ids);
    } else if (!same(row, want)) {
      note("edit", `item ${i.id}`);
      run(`UPDATE items SET objective_id=?, type=?, data=?, difficulty=?, surfaces=?, reference_ids=?, updated_at=${now} WHERE id=?`, want.objective_id, want.type, want.data, i.difficulty, want.surfaces, want.reference_ids, i.id);
    }
  }
  if (cardsChanged) {
    for (const l of unit.lessons) {
      l.cards.forEach((c, position) => {
        const k = `${l.lesson.id}/${c.id}`;
        if (!haveCards.has(k)) note("add", `card ${k}`);
        else if (haveCards.get(k) !== wantCards.get(k)) note("edit", `card ${k}`);
        run("INSERT INTO lesson_cards (lesson_id, id, position, kind, type, tier, item_id, scored, data) VALUES (?,?,?,?,?,?,?,?,?)", l.lesson.id, c.id, position, c.kind, c.type, c.tier, c.itemId ?? null, c.scored ? 1 : 0, json(c.data));
      });
    }
  }

  // --- objectives that are no longer taught (their items are gone by now) ----------------------
  const wantObjectives = new Set(unit.objectives.map((o) => o.id));
  for (const o of all("SELECT id FROM objectives WHERE unit_id = ?", unit.unit.id)) {
    if (wantObjectives.has(o.id)) continue;
    const inUse = get("SELECT 1 AS x FROM items WHERE objective_id = ?", o.id);
    if (inUse) throw new Error(`objective ${o.id} is not in unit-1.mjs but items still point at it`);
    note("drop", `objective ${o.id}`);
    run("DELETE FROM objectives WHERE id = ?", o.id);
  }

  // --- lesson references ---------------------------------------------------------------------
  for (const l of unit.lessons) {
    const want = l.references.map((r, i) => json([r.referenceId, r.supports, i]));
    const have = all("SELECT * FROM lesson_references WHERE lesson_id = ? ORDER BY position", l.lesson.id).map((r) => json([r.reference_id, r.supports, r.position]));
    if (json(want) !== json(have)) {
      note("edit", `references of lesson ${l.lesson.id}`);
      run("DELETE FROM lesson_references WHERE lesson_id = ?", l.lesson.id);
      l.references.forEach((r, i) => run("INSERT INTO lesson_references (lesson_id, reference_id, supports, position) VALUES (?,?,?,?)", l.lesson.id, r.referenceId, r.supports, i));
    }
  }

  // --- references nobody uses any more -------------------------------------------------------
  const keep = new Set(unit.references.map((r) => r.id));
  for (const r of all("SELECT id FROM content_references")) {
    if (keep.has(r.id)) continue;
    const used = get("SELECT 1 AS x FROM lesson_references WHERE reference_id = ? UNION SELECT 1 FROM unit_references WHERE reference_id = ?", r.id, r.id);
    const inItems = all("SELECT id FROM items WHERE reference_ids LIKE ?", `%"${r.id}"%`);
    if (!used && inItems.length === 0) {
      note("drop", `reference ${r.id}`);
      run("DELETE FROM content_references WHERE id = ?", r.id);
    }
  }

  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
  console.log(changes ? `${dryRun ? "would change" : "changed"} ${changes} row group(s)` : "no change: the master database already matches unit-1.mjs");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
} finally {
  db.close();
}
