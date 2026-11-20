#!/usr/bin/env node
/**
 * Safety Guide and Nuclear Map migration (docs/features/PHONE_SPEC.md §5.8, §5.9, §7.1). Idempotent and additive:
 *
 *   1. Creates `safety_cards`, `safety_card_references`, `map_sites` and `map_site_references` (the `phone` block of schema.sql) when they are missing.
 *   2. Adds the sources the cards and sites stand on to `content_references` (only the missing ones), then seeds the cards and sites from
 *      `data/safety-cards-data.mjs` and `data/map-sites-data.mjs`.
 *   3. Rows that already exist are left alone, so later edits in Content Studio survive a re-run; pass `--overwrite` to reset the seeded rows to the data files.
 *
 * Every page the data cites was opened and read on 2026-11-20 when the text was written, and every source is left `verified = 0`: a person still has to
 * open each one and confirm what it supports (the publish gate blocks until they do). This is SAFETY advice (the cards) and sensitive history (the sites):
 * review the wording against the pages before publishing.
 *
 * The seed is checked with the validators' rules inside a transaction and rolled back on an error. Takes a backup first. Does not publish or run sync-content.
 *
 *   node --no-warnings scripts/content-migration/add-safety-and-map.mjs [--overwrite] [--db path]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";
import { validateMap } from "../lib/map-rules.mjs";
import { validateSafety } from "../lib/safety-rules.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const args = process.argv.slice(2);
const overwrite = args.includes("--overwrite");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

const safety = await import(pathToFileURL(path.join(HERE, "data/safety-cards-data.mjs")).href);
const sites = await import(pathToFileURL(path.join(HERE, "data/map-sites-data.mjs")).href);

const NOTE = "Opened and read on 2026-11-20 to write the content; a person still has to confirm what it supports.";

const sql = fs.readFileSync(path.join(ROOT, "scripts/content-migration/schema.sql"), "utf8");
const a = sql.indexOf("-- BEGIN phone");
const b = sql.indexOf("-- END phone");
if (a < 0 || b < 0) throw new Error("schema.sql is missing the phone markers");
const ddl = sql.slice(a, b);

backupBeforeScript("add-safety-and-map", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec(ddl);

const verb = overwrite ? "INSERT OR REPLACE" : "INSERT OR IGNORE";
const insRef = db.prepare("INSERT OR IGNORE INTO content_references (id, kind, publisher, title, year, url, accessed, verified, note) VALUES (?,?,?,?,?,?,?,0,?)");
const insCard = db.prepare(`${verb} INTO safety_cards (id, section, title, summary, steps, icon, entry_id, position) VALUES (?,?,?,?,?,?,?,?)`);
const insCardLink = db.prepare("INSERT OR IGNORE INTO safety_card_references (card_id, reference_id) VALUES (?,?)");
const insSite = db.prepare(`${verb} INTO map_sites (id, name, place, kind, year, lat, lon, blurb, fact, entry_id, position) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
const insSiteLink = db.prepare("INSERT OR IGNORE INTO map_site_references (site_id, reference_id) VALUES (?,?)");

db.exec("BEGIN");
try {
  let refsAdded = 0;
  for (const r of [...safety.REFERENCES, ...sites.REFERENCES]) refsAdded += Number(insRef.run(r.id, r.kind, r.publisher, r.title, r.year, r.url, safety.ACCESSED, NOTE).changes);

  const perSection = new Map();
  let cardsAdded = 0;
  for (const c of safety.CARDS) {
    const p = perSection.get(c.section) ?? 0;
    perSection.set(c.section, p + 1);
    cardsAdded += Number(insCard.run(c.id, c.section, c.title, c.summary, JSON.stringify(c.steps), c.icon, c.entry ?? null, p).changes);
    for (const r of c.refs) insCardLink.run(c.id, r);
  }

  let sitesAdded = 0;
  sites.SITES.forEach((s, i) => {
    sitesAdded += Number(insSite.run(s.id, s.name, s.place, s.kind, s.year, s.lat, s.lon, s.blurb, s.fact, s.entry ?? null, i).changes);
    for (const r of s.refs) insSiteLink.run(s.id, r);
  });

  // Check what is now in the database with the validators' rules; a real error undoes everything
  const findings = [...validateSafety(db).findings, ...validateMap(db).findings].filter((f) => f.severity === "error" || !/-unverified$/.test(f.rule));
  for (const f of findings) console.error(`${f.severity}: ${f.table} ${f.id} (${f.rule}) ${f.message}`);
  if (findings.some((f) => f.severity === "error")) throw new Error("The seed has errors; nothing was written.");

  db.exec("COMMIT");
  console.log(`safety_cards: ${cardsAdded} written, ${safety.CARDS.length - cardsAdded} already there; map_sites: ${sitesAdded} written, ${sites.SITES.length - sitesAdded} already there; ${refsAdded} new source(s), all unverified.`);
} catch (error) {
  db.exec("ROLLBACK");
  console.error(String(error.message ?? error));
  process.exit(1);
}
db.close();
