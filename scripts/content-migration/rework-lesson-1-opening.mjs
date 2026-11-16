#!/usr/bin/env node
/**
 * Repeatable content migration: lesson 1 ("Atoms are everywhere") opens with teaching instead of the
 * hair slider.
 *   - removes the "guess the atoms across a hair" prediction (card c01 and its item),
 *   - "Everything is made of atoms" (c02) gets more detail and explanation,
 *   - adds "What counts as matter?" (c12) right before the sort question,
 *   - the reveal card (c06), which answered the guess, becomes a plain explain card about a hair's width.
 * Idempotent: each step checks the current state first. Draft edit of the master db; publish to ship.
 *
 *   node --no-warnings scripts/content-migration/rework-lesson-1-opening.mjs [--dry-run]
 *
 * The authoring source (curriculum/unit-1.mjs, scenes.mjs) carries the same content.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");
const { zoomChain, matterExamples, hairVsAtom } = await import(pathToFileURL(path.join(ROOT, "scripts/content-migration/curriculum/scenes.mjs")).href);

const LESSON = "atoms-are-everywhere";
const PREDICT_ITEM = "u1-l1-predict-hair";
const ORDER = ["c02", "c12", "c03", "c04", "c05", "c06", "c07", "c08", "c09", "c10", "c11"];

const C02 = {
  title: "Everything is made of atoms",
  body: "Your hand, the table and the water you drink are all made of [[atom|atoms]]. Zoom in far enough on anything you can touch and you reach these tiny building blocks. Different things are just different atoms, joined in different ways. A skin cell, a drop of water and a grain of salt all come down to atoms.",
  figure: zoomChain(),
};
const C12 = {
  title: "What counts as matter?",
  body: "Matter is anything that has mass and takes up space. A phone, an apple and a glass of water all do. So does air: it has mass, and it fills a balloon. Everything made of matter is made of atoms. Light and heat are different. They are energy, not matter.",
  figure: matterExamples(),
};
const C06 = {
  title: "How wide is a hair?",
  body: "Across one hair you could line up roughly a few hundred thousand atoms. A hair looks thin, yet it is hundreds of thousands of atoms wide.",
  figure: hairVsAtom(),
};

if (!dryRun) backupBeforeScript("rework-lesson-1-opening", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN IMMEDIATE");
const run = (sql, ...args) => (dryRun ? undefined : db.prepare(sql).run(...args));
const card = (id) => db.prepare("SELECT * FROM lesson_cards WHERE lesson_id = ? AND id = ?").get(LESSON, id);
try {
  if (card("c01")) {
    console.log("edit remove c01 (the hair prediction)");
    run("DELETE FROM lesson_cards WHERE lesson_id = ? AND id = 'c01'", LESSON);
  } else console.log("ok   c01 already removed");
  if (db.prepare("SELECT 1 FROM items WHERE id = ?").get(PREDICT_ITEM)) {
    console.log(`edit remove item ${PREDICT_ITEM}`);
    run("DELETE FROM items WHERE id = ?", PREDICT_ITEM);
  } else console.log(`ok   item ${PREDICT_ITEM} already removed`);

  const setData = (id, data, type) => {
    const row = card(id);
    const json = JSON.stringify(data);
    if (row.data === json && row.type === type) return console.log(`ok   ${id}`);
    console.log(`edit ${id}`);
    run("UPDATE lesson_cards SET data = ?, type = ?, updated_at = strftime('%s','now') WHERE lesson_id = ? AND id = ?", json, type, LESSON, id);
  };
  setData("c02", C02, "explain");
  setData("c06", C06, "explain");
  if (!card("c12")) {
    console.log("edit add c12 (what counts as matter)");
    run("INSERT INTO lesson_cards (lesson_id, id, position, kind, type, tier, item_id, scored, data) VALUES (?, 'c12', 100, 'teach', 'explain', 'core', NULL, 0, ?)", LESSON, JSON.stringify(C12));
  } else setData("c12", C12, "explain");

  // Positions are unique per lesson: park every card out of the way, then number them in order.
  const have = db.prepare("SELECT id FROM lesson_cards WHERE lesson_id = ?").all(LESSON).map((r) => r.id);
  if (!dryRun) {
    for (const id of ORDER) if (!have.includes(id)) throw new Error(`card ${id} is missing`);
    run("UPDATE lesson_cards SET position = position + 1000 WHERE lesson_id = ?", LESSON);
    ORDER.forEach((id, i) => run("UPDATE lesson_cards SET position = ? WHERE lesson_id = ? AND id = ?", i, LESSON, id));
  }
  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
