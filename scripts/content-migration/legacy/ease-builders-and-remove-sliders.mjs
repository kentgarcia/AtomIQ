#!/usr/bin/env node
/**
 * Repeatable content migration: easier building steps and no slider questions.
 *   - removes every estimate (slider) question: the lesson 2 card and both items,
 *   - lessons 3 and 4 teach first and then build (the atom builder moves after its teaching card),
 *   - the builder tasks and hints say exactly what to tap,
 *   - lesson 4 (isotopes): the sort has four atoms, the fill questions pick from a short list of
 *     numbers instead of typing, the hydrogen match (subtraction) becomes a carbon match (addition)
 *     and the uranium fill becomes a carbon-13 fill. All of them easy (difficulty 1).
 * Idempotent: each step checks the current state first. Draft edit of the master db.
 *
 *   node --no-warnings scripts/content-migration/ease-builders-and-remove-sliders.mjs [--dry-run]
 *
 * The authoring source (curriculum/unit-1.mjs) carries the same content.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";

/**
 * RETIRED (content source files, phase 5): the lesson tables (units, objectives, lessons, path nodes, items, cards and their sources) are written in content/source/units and built with `npm run content:sync`; the authoring modules unit-N.mjs are retired too.
 * Running this would overwrite them behind the files' back. Kept only as history. Do not run it. Edit the files
 * (docs/features/CONTENT_SOURCE_SPEC.md, docs/features/CONTENT_SOURCE_PHASE5_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("ease-builders-and-remove-sliders.mjs is retired: the curriculum lives in content/source/units and is built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");

if (!dryRun) backupBeforeScript("ease-builders-and-remove-sliders", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN IMMEDIATE");
const log = (verb, what) => console.log(`${verb.padEnd(4)} ${what}`);
const run = (sql, ...args) => (dryRun ? undefined : db.prepare(sql).run(...args));
const item = (id) => db.prepare("SELECT * FROM items WHERE id = ?").get(id);
const card = (lesson, id) => db.prepare("SELECT * FROM lesson_cards WHERE lesson_id = ? AND id = ?").get(lesson, id);
const order = (lesson) => db.prepare("SELECT id FROM lesson_cards WHERE lesson_id = ? ORDER BY position").all(lesson).map((r) => r.id);

/** Numbers the cards 0, 1, 2 ... in the given order (positions are unique, so park them first). */
function repack(lesson, ids) {
  if (dryRun) return;
  run("UPDATE lesson_cards SET position = position + 1000 WHERE lesson_id = ?", lesson);
  ids.forEach((id, i) => run("UPDATE lesson_cards SET position = ? WHERE lesson_id = ? AND id = ?", i, lesson, id));
}
function patchCard(lesson, id, patch) {
  const row = card(lesson, id);
  const data = JSON.parse(row.data);
  const next = { ...data, ...patch };
  if (JSON.stringify(next) === row.data) return log("ok", `${lesson}/${id}`);
  log("edit", `${lesson}/${id}`);
  run("UPDATE lesson_cards SET data = ?, updated_at = strftime('%s','now') WHERE lesson_id = ? AND id = ?", JSON.stringify(next), lesson, id);
}
function setItem(id, data, difficulty = 1) {
  const row = item(id);
  if (!row) return log("skip", `item ${id}: missing`);
  const json = JSON.stringify(data);
  if (row.data === json && row.difficulty === difficulty) return log("ok", `item ${id}`);
  log("edit", `item ${id}`);
  run("UPDATE items SET data = ?, difficulty = ?, updated_at = strftime('%s','now') WHERE id = ?", json, difficulty, id);
}
/** Replaces an item by a new one (new id) and points its card at it. */
function replaceItem(oldId, newId, lesson, cardId, data) {
  const old = item(oldId);
  if (!old) return setItem(newId, data);
  log("edit", `item ${oldId} -> ${newId}`);
  run("INSERT INTO items (id, objective_id, type, data, difficulty, surfaces, reference_ids) VALUES (?, ?, ?, ?, 1, ?, ?)", newId, old.objective_id, old.type, JSON.stringify(data), old.surfaces, old.reference_ids);
  run("UPDATE lesson_cards SET item_id = ? WHERE lesson_id = ? AND id = ?", newId, lesson, cardId);
  run("DELETE FROM items WHERE id = ?", oldId);
}
/** Moves card `id` to just after card `after` unless it is already later. */
function moveAfter(lesson, id, after) {
  const ids = order(lesson);
  if (ids.indexOf(id) > ids.indexOf(after)) return log("ok", `${lesson}: ${id} already after ${after}`);
  log("edit", `${lesson}: ${id} moves after ${after}`);
  const rest = ids.filter((x) => x !== id);
  rest.splice(rest.indexOf(after) + 1, 0, id);
  repack(lesson, rest);
}

try {
  // 1. No sliders.
  const L2 = "protons-neutrons-electrons";
  if (card(L2, "c09")?.item_id === "u1-l2-estimate-ratio") {
    log("edit", `${L2}/c09 removed (the estimate slider)`);
    run("DELETE FROM lesson_cards WHERE lesson_id = ? AND id = 'c09'", L2);
    repack(L2, order(L2));
  } else log("ok", `${L2}/c09 already removed`);
  for (const id of ["u1-l2-estimate-ratio", "u1-x-hair-estimate"]) {
    if (item(id)) {
      log("edit", `item ${id} removed`);
      run("DELETE FROM items WHERE id = ?", id);
    } else log("ok", `item ${id} already removed`);
  }

  // The slider question was one of four for "how small are atoms": a pick-one question takes its place.
  const HAIR = {
    prompt: "About how many atoms would fit side by side across the width of one human hair?",
    options: [
      { id: "hundreds", label: "A few hundred", note: "That is far too few. Atoms are much smaller than that." },
      { id: "thousands", label: "A few thousand", note: "Still too few: a hair is far wider than a few thousand atoms." },
      { id: "hundredk", label: "A few hundred thousand" },
      { id: "billions", label: "A few billion", note: "That is too many. A hair is wide, but not that wide." },
    ],
    answer: "hundredk",
    explanation: "A hair is about 0.07 mm wide and an atom a few tenths of a nanometre, so a few hundred thousand atoms fit across it.",
  };
  if (!item("u1-x-hair-choice")) {
    log("edit", "item u1-x-hair-choice added");
    run("INSERT INTO items (id, objective_id, type, data, difficulty, surfaces, reference_ids) VALUES ('u1-x-hair-choice', 'u1-atom-scale', 'choice', ?, 2, ?, ?)", JSON.stringify(HAIR), JSON.stringify(["practice", "checkpoint", "review"]), JSON.stringify(["ref-atom-hair-scale"]));
  } else log("ok", "item u1-x-hair-choice");

  // 2. Lesson 3: teach, then build.
  const L3 = "elements-and-the-periodic-table";
  moveAfter(L3, "c02", "c03");
  patchCard(L3, "c02", {
    task: "Build an atom of oxygen. Oxygen has 8 protons, so tap + until it says so.",
    hint: "Oxygen is element number 8. Watch the name change as you add protons.",
  });

  // 3. Lesson 4: teach, then build; easier questions.
  const L4 = "isotopes";
  moveAfter(L4, "c02", "c03");
  patchCard(L4, "c02", {
    task: "Make carbon-14 from carbon-12 by adding 2 neutrons.",
    hint: "Carbon-12 has 6 neutrons. Tap + two times to reach 8. It is still carbon.",
  });
  setItem("u1-l4-sort-carbon", {
    prompt: "Carbon always has 6 protons. Which of these atoms are carbon? Sort each one.",
    buckets: [{ id: "carbon", label: "Carbon" }, { id: "other", label: "Not carbon" }],
    items: [
      { id: "a", label: "6 protons, 6 neutrons", bucket: "carbon" },
      { id: "b", label: "6 protons, 8 neutrons", bucket: "carbon" },
      { id: "c", label: "7 protons, 7 neutrons", bucket: "other" },
      { id: "d", label: "8 protons, 8 neutrons", bucket: "other" },
    ],
    explanation: "Only the number of protons matters for the element. Any atom with 6 protons is carbon, whatever its neutrons. Those carbon atoms are isotopes of carbon.",
  });
  setItem("u1-l4-fill-c14", {
    mode: "bank", prompt: "Carbon-14 has 6 protons and ___ neutrons.",
    bank: [{ id: "n8", label: "8" }, { id: "n6", label: "6" }, { id: "n14", label: "14" }, { id: "n20", label: "20" }], answer: "n8",
    explanation: "The 14 is the mass number: protons plus neutrons. Carbon has 6 protons, so 14 - 6 = 8 neutrons.",
  });
  replaceItem("u1-l4-match-hydrogen", "u1-l4-match-carbon", L4, "c07", {
    prompt: "Match each carbon atom to its name. The number in the name is protons plus neutrons.",
    pairs: [
      { id: "c12", left: "6 protons, 6 neutrons", right: "Carbon-12" },
      { id: "c13", left: "6 protons, 7 neutrons", right: "Carbon-13" },
      { id: "c14", left: "6 protons, 8 neutrons", right: "Carbon-14" },
    ],
    explanation: "Add them up: 6 + 6 = 12, 6 + 7 = 13 and 6 + 8 = 14.",
  });
  replaceItem("u1-l4-fill-u238", "u1-l4-fill-c13", L4, "c11", {
    mode: "bank", prompt: "A carbon atom with 6 protons and 7 neutrons is called carbon-___.",
    bank: [{ id: "n13", label: "13" }, { id: "n12", label: "12" }, { id: "n7", label: "7" }, { id: "n1", label: "1" }], answer: "n13",
    explanation: "Add the protons and neutrons: 6 + 7 = 13. So this is carbon-13.",
  });

  // 4. Lesson 5: say how to get to stable.
  patchCard("stable-and-unstable-nuclei", "c04", { hint: "Stable carbon has 6 or 7 neutrons. Tap - until the badge says Stable." });

  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
