#!/usr/bin/env node
/**
 * Repeatable content migration: copy one authored unit onto the master database.
 *
 * The authoring source (scripts/content-migration/curriculum/unit-N.mjs and scenes.mjs) is the one
 * place a unit's content is written. This script is modelled on unit-1-concept-pass.mjs and
 * generalised so it takes a unit source path and also creates what is missing (the unit, its
 * lessons and its path nodes), which the cutover script does destructively for every unit.
 * It leaves everything else alone: other units, the NPC cast, other content. Items, cards and
 * objectives that are no longer in the source are removed from this unit only (nothing here is
 * published until a release, so no shipped id is retired by a draft edit). References are added and
 * edited but never deleted, and their verified flag is never touched. The unit's teacher and the
 * teacher's missing voice lines are added from components/npc/npc-roster.ts; a line that was edited
 * in the database since is left alone.
 *
 * Idempotent: a second run reports no change. Draft edit of the master db; publish to ship.
 *
 *   node --no-warnings scripts/content-migration/sync-unit.mjs <unit-file> [--dry-run] [--db <path>]
 *   e.g. node --no-warnings scripts/content-migration/sync-unit.mjs unit-2.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CURRICULUM_DIR = path.join(ROOT, "scripts/content-migration/curriculum");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const dbArg = argv.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? argv[dbArg + 1] : "content/database/content.db");
const positional = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--db");
if (positional.length !== 1) {
  console.error("usage: sync-unit.mjs <unit-file> [--dry-run] [--db <path>]   (for example: unit-2.mjs)");
  process.exit(2);
}
const sourcePath = fs.existsSync(path.resolve(positional[0])) ? path.resolve(positional[0]) : path.join(CURRICULUM_DIR, positional[0]);
if (!fs.existsSync(sourcePath)) {
  console.error(`no unit source at ${sourcePath}`);
  process.exit(2);
}
const unit = await import(pathToFileURL(sourcePath).href);
const { NPC_ROSTER, NPC_LINES } = await import(pathToFileURL(path.join(ROOT, "components/npc/npc-roster.ts")).href);

const json = (v) => JSON.stringify(v);
const now = "strftime('%s','now')";
let changes = 0;
const note = (verb, what) => {
  changes++;
  console.log(`${verb.padEnd(6)} ${what}`);
};

if (!dryRun) backupBeforeScript(`sync-${path.basename(sourcePath, ".mjs")}`, dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN IMMEDIATE");
try {
  const get = (sql, ...p) => db.prepare(sql).get(...p);
  const all = (sql, ...p) => db.prepare(sql).all(...p);
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const same = (row, want) => Object.entries(want).every(([k, v]) => row[k] === v);
  const has = (name) => !!get("SELECT 1 AS x FROM sqlite_master WHERE type='table' AND name=?", name);

  // --- unit ---------------------------------------------------------------------------------
  const u = unit.unit;
  const wantUnit = { position: u.position, title: u.title, subtitle: u.subtitle, description: u.description, goal: u.goal, guidebook: json(u.guidebook), icon: u.icon, tone: u.tone };
  const unitRow = get("SELECT * FROM units WHERE id = ?", u.id);
  if (!unitRow) {
    note("add", `unit ${u.id}`);
    run("INSERT INTO units (id, position, title, subtitle, description, goal, guidebook, icon, tone) VALUES (?,?,?,?,?,?,?,?,?)", u.id, wantUnit.position, wantUnit.title, wantUnit.subtitle, wantUnit.description, wantUnit.goal, wantUnit.guidebook, wantUnit.icon, wantUnit.tone);
  } else if (!same(unitRow, wantUnit)) {
    note("edit", `unit ${u.id}`);
    run(`UPDATE units SET position=?, title=?, subtitle=?, description=?, goal=?, guidebook=?, icon=?, tone=?, updated_at=${now} WHERE id=?`, wantUnit.position, wantUnit.title, wantUnit.subtitle, wantUnit.description, wantUnit.goal, wantUnit.guidebook, wantUnit.icon, wantUnit.tone, u.id);
  }

  // --- references (before anything that points at them). verified and accessed are never touched ----
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
  // Every reference the unit points at must exist (some belong to an earlier unit).
  const used = new Set([...unit.unitReferenceIds, ...unit.lessons.flatMap((l) => l.references.map((r) => r.referenceId)), ...unit.itemBank.flatMap((i) => i.referenceIds)]);
  for (const id of used) if (!get("SELECT 1 AS x FROM content_references WHERE id = ?", id)) throw new Error(`reference ${id} is not in the database: add it to ${path.basename(sourcePath)} or run the earlier unit's sync first`);

  // --- unit references ----------------------------------------------------------------------
  {
    const want = unit.unitReferenceIds.map((id, i) => json([id, i]));
    const have = all("SELECT * FROM unit_references WHERE unit_id = ? ORDER BY position", u.id).map((r) => json([r.reference_id, r.position]));
    if (json(want) !== json(have)) {
      note("edit", `references of unit ${u.id}`);
      run("DELETE FROM unit_references WHERE unit_id = ?", u.id);
      unit.unitReferenceIds.forEach((id, i) => run("INSERT INTO unit_references (unit_id, reference_id, position) VALUES (?,?,?)", u.id, id, i));
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
    if (!row) {
      note("add", `lesson ${L.id}`);
      run("INSERT INTO lessons (id, unit_id, title, description, estimated_minutes, xp_reward, teaches, relies_on) VALUES (?,?,?,?,?,?,?,?)", L.id, L.unitId, want.title, want.description, want.estimated_minutes, want.xp_reward, want.teaches, want.relies_on);
    } else if (!same(row, want)) {
      note("edit", `lesson ${L.id}`);
      run(`UPDATE lessons SET title=?, description=?, estimated_minutes=?, xp_reward=?, teaches=?, relies_on=?, updated_at=${now} WHERE id=?`, want.title, want.description, want.estimated_minutes, want.xp_reward, want.teaches, want.relies_on, L.id);
    }
  }

  // --- path nodes ----------------------------------------------------------------------------
  {
    const wantIds = new Set(unit.pathNodes.map((n) => n.id));
    for (const row of all("SELECT * FROM path_nodes WHERE unit_id = ?", u.id)) {
      if (!wantIds.has(row.id)) {
        note("drop", `path node ${row.id}`);
        run("DELETE FROM path_nodes WHERE id = ?", row.id);
      }
    }
    for (const n of unit.pathNodes) {
      const want = { unit_id: n.unitId, position: n.position, kind: n.kind, lesson_id: n.lessonId ?? null, config: json(n.config) };
      const row = get("SELECT * FROM path_nodes WHERE id = ?", n.id);
      if (!row) {
        note("add", `path node ${n.id}`);
        run("INSERT INTO path_nodes (id, unit_id, position, kind, lesson_id, config) VALUES (?,?,?,?,?,?)", n.id, n.unitId, n.position, n.kind, want.lesson_id, want.config);
      } else if (!same(row, want)) {
        note("edit", `path node ${n.id}`);
        run(`UPDATE path_nodes SET position=?, kind=?, lesson_id=?, config=?, updated_at=${now} WHERE id=?`, n.position, n.kind, want.lesson_id, want.config, n.id);
      }
    }
  }

  // --- cards out first (they point at items), then items, then cards back in -----------------
  const lessonIds = unit.lessons.map((l) => l.lesson.id);
  const marks = lessonIds.map(() => "?").join(",");
  const cardKey = (lessonId, c, position) => json([lessonId, c.id, position, c.kind, c.type, c.tier, c.itemId ?? null, c.scored ? 1 : 0, json(c.data)]);
  const wantCards = new Map();
  for (const l of unit.lessons) l.cards.forEach((c, i) => wantCards.set(`${l.lesson.id}/${c.id}`, cardKey(l.lesson.id, c, i)));
  const haveCards = new Map(all(`SELECT * FROM lesson_cards WHERE lesson_id IN (${marks})`, ...lessonIds).map((r) => [`${r.lesson_id}/${r.id}`, json([r.lesson_id, r.id, r.position, r.kind, r.type, r.tier, r.item_id, r.scored, r.data])]));
  const cardsChanged = wantCards.size !== haveCards.size || [...wantCards].some(([k, v]) => haveCards.get(k) !== v);

  const wantItems = new Map(unit.itemBank.map((i) => [i.id, i]));
  const unitObjectiveIds = all("SELECT id FROM objectives WHERE unit_id = ?", u.id).map((o) => o.id);
  const haveItems = new Map(
    unitObjectiveIds.length ? all(`SELECT * FROM items WHERE objective_id IN (${unitObjectiveIds.map(() => "?").join(",")})`, ...unitObjectiveIds).map((r) => [r.id, r]) : [],
  );

  if (cardsChanged) {
    for (const k of haveCards.keys()) if (!wantCards.has(k)) note("drop", `card ${k}`);
    run(`DELETE FROM lesson_cards WHERE lesson_id IN (${marks})`, ...lessonIds);
  }
  for (const id of haveItems.keys()) {
    if (!wantItems.has(id)) {
      note("drop", `item ${id}`);
      run("DELETE FROM items WHERE id = ?", id);
    }
  }
  for (const i of unit.itemBank) {
    const want = { objective_id: i.objectiveId, type: i.type, data: json(i.data), difficulty: i.difficulty, surfaces: json(i.surfaces), reference_ids: json(i.referenceIds) };
    const row = haveItems.get(i.id) ?? get("SELECT * FROM items WHERE id = ?", i.id);
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
  for (const o of all("SELECT id FROM objectives WHERE unit_id = ?", u.id)) {
    if (wantObjectives.has(o.id)) continue;
    if (get("SELECT 1 AS x FROM items WHERE objective_id = ?", o.id)) throw new Error(`objective ${o.id} is not in ${path.basename(sourcePath)} but items still point at it`);
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

  // --- the unit's teacher and their missing voice lines ----------------------------------------
  const teacher = NPC_ROSTER.find((n) => n.unitId === u.id);
  if (teacher && has("npcs") && has("npc_lines")) {
    if (!get("SELECT 1 AS x FROM npcs WHERE id = ?", teacher.id)) {
      throw new Error(`teacher ${teacher.id} is not in the npcs table: run add-npcs.mjs first`);
    }
    if (get("SELECT teacher_npc_id AS t FROM units WHERE id = ?", u.id).t !== teacher.id) {
      note("edit", `teacher of unit ${u.id}: ${teacher.id}`);
      run(`UPDATE units SET teacher_npc_id = ?, updated_at=${now} WHERE id = ?`, teacher.id, u.id);
    }
    const lessonSet = new Set(lessonIds);
    for (const l of NPC_LINES.filter((x) => x.npcId === teacher.id && (!x.lessonId || lessonSet.has(x.lessonId)))) {
      const row = get("SELECT * FROM npc_lines WHERE id = ?", l.id);
      if (!row) {
        note("add", `line ${l.id}`);
        run("INSERT INTO npc_lines (id, npc_id, kind, lesson_id, journey_id, text, pose) VALUES (?,?,?,?,?,?,?)", l.id, l.npcId, l.kind, l.lessonId ?? null, l.journeyId ?? null, l.text, l.pose);
      } else if (row.text !== l.text || row.pose !== l.pose) {
        console.log(`skip   line ${l.id}: differs from the roster (edited since); left alone`);
      }
    }
  }

  // --- references nobody uses (reported, never deleted: another unit may own them) ---------------
  for (const r of unit.references) {
    const inUse = get("SELECT 1 AS x FROM lesson_references WHERE reference_id = ? UNION SELECT 1 FROM unit_references WHERE reference_id = ?", r.id, r.id) || all("SELECT id FROM items WHERE reference_ids LIKE ?", `%"${r.id}"%`).length > 0;
    if (!inUse) console.log(`note   reference ${r.id} is not used by any lesson, unit or item`);
  }

  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
  console.log(changes ? `${dryRun ? "would change" : "changed"} ${changes} row group(s)` : `no change: the master database already matches ${path.basename(sourcePath)}`);
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
} finally {
  db.close();
}
