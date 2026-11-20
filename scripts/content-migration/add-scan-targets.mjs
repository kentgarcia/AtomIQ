#!/usr/bin/env node
/**
 * Atom Scanner migration (docs/features/PHONE_SPEC.md §8, §7.1). Idempotent and additive:
 *
 *   1. Creates `scan_targets` and `scan_target_references` (the `phone` block of schema.sql) when they are missing.
 *   2. Adds the sources the targets stand on to `content_references` (only the missing ones) and seeds the targets.
 *   3. Rows that already exist are left alone, so later edits in Content Studio survive a re-run; pass `--overwrite`
 *      to reset the seeded rows to this file's text.
 *
 * Every claim below was checked against the page it cites on 2026-11-20 by reading the page, and every source is left
 * `verified = 0`: a person still has to open each one and confirm what it supports (the publish gate blocks until
 * they do). Composition names which elements are there, main ones first, and never says how much.
 *
 * The seed is checked with the validator's rules before anything is written. Takes a backup first. Does not publish
 * or run sync-content.
 *
 *   node --no-warnings scripts/content-migration/add-scan-targets.mjs [--dry-run] [--overwrite] [--db path]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";
import { validateScanData } from "../lib/scan-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

const ACCESSED = "2026-11-20";
const NOTE = "Opened and read on 2026-11-20 to write the scanner results; a person still has to confirm what it supports.";

// New sources (existing ones, such as ref-iupac-table, are only linked)
const REFERENCES = [
  { id: "ref-openstax-chem-2-4", kind: "textbook", publisher: "OpenStax", title: "Chemistry 2e, section 2.4: Chemical Formulas", year: "2019", url: "https://openstax.org/books/chemistry-2e/pages/2-4-chemical-formulas" },
  { id: "ref-openstax-chem-10-5", kind: "textbook", publisher: "OpenStax", title: "Chemistry 2e, section 10.5: The Solid State of Matter", year: "2019", url: "https://openstax.org/books/chemistry-2e/pages/10-5-the-solid-state-of-matter" },
  { id: "ref-openstax-bio-carbs", kind: "textbook", publisher: "OpenStax", title: "Biology 2e, section 3.2: Carbohydrates", year: "2018", url: "https://openstax.org/books/biology-2e/pages/3-2-carbohydrates" },
  { id: "ref-openstax-bio-photosynthesis", kind: "textbook", publisher: "OpenStax", title: "Biology 2e, section 8.1: Overview of Photosynthesis", year: "2018", url: "https://openstax.org/books/biology-2e/pages/8-1-overview-of-photosynthesis" },
  { id: "ref-openstax-ap-elements", kind: "textbook", publisher: "OpenStax", title: "Anatomy and Physiology 2e, section 2.1: Elements and Atoms", year: "2022", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/2-1-elements-and-atoms-the-building-blocks-of-matter" },
  { id: "ref-openstax-ap-organic", kind: "textbook", publisher: "OpenStax", title: "Anatomy and Physiology 2e, section 2.5: Organic Compounds Essential to Human Functioning", year: "2022", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/2-5-organic-compounds-essential-to-human-functioning" },
  { id: "ref-openstax-ap-erythrocytes", kind: "textbook", publisher: "OpenStax", title: "Anatomy and Physiology 2e, section 18.3: Erythrocytes", year: "2022", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/18-3-erythrocytes" },
  { id: "ref-openstax-ap-hair", kind: "textbook", publisher: "OpenStax", title: "Anatomy and Physiology 2e, section 5.2: Accessory Structures of the Skin", year: "2022", url: "https://openstax.org/books/anatomy-and-physiology-2e/pages/5-2-accessory-structures-of-the-skin" },
  { id: "ref-nasa-sun-facts", kind: "official", publisher: "NASA", title: "Sun Facts", year: "", url: "https://science.nasa.gov/sun/facts/" },
  { id: "ref-noaa-atmosphere", kind: "official", publisher: "NOAA National Weather Service", title: "JetStream: The Atmosphere", year: "", url: "https://www.noaa.gov/jetstream/atmosphere" },
  { id: "ref-epa-radiation-sources", kind: "official", publisher: "U.S. Environmental Protection Agency", title: "Radiation Sources and Doses", year: "", url: "https://www.epa.gov/radiation/radiation-sources-and-doses" },
  { id: "ref-medlineplus-potassium", kind: "official", publisher: "MedlinePlus, U.S. National Library of Medicine", title: "Potassium in diet", year: "", url: "https://medlineplus.gov/ency/article/002413.htm" },
];

const el = (symbol, note) => (note ? { symbol, note } : { symbol });

const TARGETS = [
  // Kitchen
  { id: "scan-water", scene: "kitchen", object: "water", name: "A glass of water", blurb: "Every drop is made of the same tiny molecules.",
    composition: [el("H", "two atoms in each molecule"), el("O", "one atom in each molecule")],
    fun_fact: "Water is always two hydrogen atoms for every oxygen atom, in a glass, a lake or a cloud.", entry: null, refs: ["ref-openstax-chem-2-4"] },
  { id: "scan-salt", scene: "kitchen", object: "salt", name: "Table salt", blurb: "A shake of salt from the kitchen.",
    composition: [el("Na", "joined to chlorine as ions"), el("Cl", "joined to sodium as ions")],
    fun_fact: "Sodium and chlorine can react to form table salt. Joined together they are nothing like what they were on their own.", entry: "ion", refs: ["ref-openstax-chem-2-4"] },
  { id: "scan-banana", scene: "kitchen", object: "banana", name: "A banana", blurb: "Sweet, soft and a good source of potassium.",
    composition: [el("O"), el("C", "in sugars and starch"), el("H"), el("K", "a mineral found in many foods")],
    fun_fact: "A tiny part of all natural potassium is radioactive potassium-40, so food with potassium holds a trace of it. So does your own body.", entry: "potassium-40", refs: ["ref-medlineplus-potassium", "ref-epa-radiation-sources"] },
  { id: "scan-rice", scene: "kitchen", object: "rice", name: "A grain of rice", blurb: "Mostly starch, a long chain of sugar molecules.",
    composition: [el("O"), el("C", "in the sugar chains of starch"), el("H")],
    fun_fact: "Glucose, a sugar your body uses for fuel, is made of just carbon, hydrogen and oxygen. Starch is glucose joined in long chains.", entry: null, refs: ["ref-openstax-ap-elements", "ref-openstax-bio-carbs"] },
  // Outside
  { id: "scan-grass", scene: "outside", object: "grass", name: "A blade of grass", blurb: "Grass makes its own food from sunlight, air and water.",
    composition: [el("O", "from water and carbon dioxide"), el("C", "from carbon dioxide in the air"), el("H", "from water")],
    fun_fact: "A plant builds sugar out of carbon dioxide and water. Much of the carbon in a blade of grass was once part of the air.", entry: null, refs: ["ref-openstax-bio-photosynthesis"] },
  { id: "scan-sun", scene: "outside", object: "sun", name: "The Sun", blurb: "A hot, glowing ball of gas: our nearest star.",
    composition: [el("H", "fused into helium in the core"), el("He", "made from hydrogen in the core")],
    fun_fact: "In the Sun's core, hydrogen is fused into helium. Those nuclear reactions power its heat and light.", entry: "nuclear-fusion", refs: ["ref-nasa-sun-facts"] },
  { id: "scan-air", scene: "outside", object: "air", name: "Air", blurb: "Invisible, but made of atoms and molecules.",
    composition: [el("N", "by far the most common gas"), el("O", "the gas you breathe"), el("Ar", "a noble gas"), el("C", "in carbon dioxide")],
    fun_fact: "Most of the air is nitrogen, not oxygen. Nitrogen also dilutes oxygen, which slows burning.", entry: null, refs: ["ref-noaa-atmosphere"] },
  // Body
  { id: "scan-hand", scene: "body", object: "hand", name: "Your hand", blurb: "Your body is made of the same elements as everything else.",
    composition: [el("O"), el("C"), el("H"), el("N")],
    fun_fact: "Oxygen, carbon, hydrogen and nitrogen are the four most abundant elements in the human body.", entry: "element", refs: ["ref-openstax-ap-elements"] },
  { id: "scan-hair", scene: "body", object: "hair", name: "A strand of hair", blurb: "Hair is a filament of keratin, a protein.",
    composition: [el("C"), el("O"), el("N", "in every protein"), el("H"), el("S", "found in many proteins")],
    fun_fact: "Every protein contains nitrogen, and many contain sulfur, together with carbon, hydrogen and oxygen. Keratin is a protein.", entry: null, refs: ["ref-openstax-ap-organic", "ref-openstax-ap-hair"] },
  { id: "scan-red-blood-cell", scene: "body", object: "rbc", name: "A red blood cell", blurb: "A cell that carries oxygen around your body.",
    composition: [el("O", "the gas it carries"), el("C"), el("H"), el("N"), el("Fe", "in hemoglobin")],
    fun_fact: "Hemoglobin, the molecule that carries oxygen in your blood, is made of proteins and iron.", entry: null, refs: ["ref-openstax-ap-erythrocytes", "ref-openstax-ap-organic"] },
  // Treasure
  { id: "scan-gold", scene: "treasure", object: "gold", name: "A gold bar", blurb: "Pure gold is just one kind of atom.",
    composition: [el("Au", "the only element in pure gold")],
    fun_fact: "Gold is an element, so it cannot be broken down into anything simpler. A bar of pure gold holds nothing but gold atoms.", entry: "element", refs: ["ref-openstax-ap-elements", "ref-iupac-table"] },
  { id: "scan-diamond", scene: "treasure", object: "diamond", name: "A diamond", blurb: "A crystal made of carbon atoms.",
    composition: [el("C", "the only element in a diamond")],
    fun_fact: "In a diamond, every carbon atom is bonded to its neighbours in one giant network. Chemists call that a covalent network solid.", entry: null, refs: ["ref-openstax-chem-10-5"] },
];

// ---------------------------------------------------------------------------

const sql = fs.readFileSync(path.join(ROOT, "scripts/content-migration/schema.sql"), "utf8");
const a = sql.indexOf("-- BEGIN phone");
const b = sql.indexOf("-- END phone");
if (a < 0 || b < 0) throw new Error("schema.sql is missing the phone markers");
const ddl = sql.slice(a, b);

if (!dryRun) backupBeforeScript("add-scan-targets", dbPath);
const db = new DatabaseSync(dryRun ? ":memory:" : dbPath);
db.exec("PRAGMA foreign_keys = ON");
if (dryRun) {
  db.exec("CREATE TABLE npcs (id TEXT PRIMARY KEY)");
  db.exec("CREATE TABLE encyclopedia_entries (id TEXT PRIMARY KEY)");
  for (const id of ["ion", "potassium-40", "nuclear-fusion", "element"]) db.prepare("INSERT INTO encyclopedia_entries (id) VALUES (?)").run(id);
  db.exec(`CREATE TABLE content_references (id TEXT PRIMARY KEY, kind TEXT NOT NULL, publisher TEXT NOT NULL, title TEXT NOT NULL, authors TEXT NOT NULL DEFAULT '', year TEXT NOT NULL DEFAULT '', url TEXT NOT NULL DEFAULT '', accessed TEXT NOT NULL DEFAULT '', verified INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '')`);
  db.prepare("INSERT INTO content_references (id, kind, publisher, title) VALUES ('ref-iupac-table','official','IUPAC','Periodic Table')").run();
}
db.exec(ddl);

const verb = overwrite ? "INSERT OR REPLACE" : "INSERT OR IGNORE";
const insRef = db.prepare("INSERT OR IGNORE INTO content_references (id, kind, publisher, title, year, url, accessed, verified, note) VALUES (?,?,?,?,?,?,?,0,?)");
let refsAdded = 0;
for (const r of REFERENCES) refsAdded += Number(insRef.run(r.id, r.kind, r.publisher, r.title, r.year, r.url, ACCESSED, NOTE).changes);

// Check the seed with the validator's rules, against what the database holds
const refRows = db.prepare("SELECT id, verified FROM content_references").all();
const entryIds = db.prepare("SELECT id FROM encyclopedia_entries").all().map((r) => r.id);
const findings = validateScanData({
  targets: TARGETS.map((t, i) => ({ id: t.id, name: t.name, scene: t.scene, object: t.object, blurb: t.blurb, composition: t.composition, fun_fact: t.fun_fact, atomdex_entry_id: t.entry, position: i })),
  references: refRows,
  links: TARGETS.flatMap((t) => t.refs.map((r) => ({ target_id: t.id, reference_id: r }))),
  entryIds,
}).findings.filter((f) => f.severity === "error" || f.rule !== "scan-reference-unverified");
if (findings.length) {
  for (const f of findings) console.error(`${f.severity}: ${f.id} (${f.rule}) ${f.message}`);
  if (findings.some((f) => f.severity === "error")) {
    console.error("The seed has errors; nothing was written.");
    process.exit(1);
  }
}

const position = new Map();
const insTarget = db.prepare(`${verb} INTO scan_targets (id, name, scene, object, blurb, composition, fun_fact, atomdex_entry_id, position) VALUES (?,?,?,?,?,?,?,?,?)`);
const insLink = db.prepare("INSERT OR IGNORE INTO scan_target_references (target_id, reference_id) VALUES (?,?)");
let added = 0;
for (const t of TARGETS) {
  const p = position.get(t.scene) ?? 0;
  position.set(t.scene, p + 1);
  added += Number(insTarget.run(t.id, t.name, t.scene, t.object, t.blurb, JSON.stringify(t.composition), t.fun_fact, t.entry, p).changes);
  for (const r of t.refs) insLink.run(t.id, r);
}

console.log(`${dryRun ? "(dry run) " : ""}scan_targets: ${added} written, ${TARGETS.length - added} already there; ${refsAdded} new source(s), all unverified.`);
db.close();
