#!/usr/bin/env node
/**
 * Periodic table data tests.
 *
 * Loads the bundled TypeScript data module directly (Node strips the types)
 * and verifies it, plus that linked lesson / encyclopedia ids exist in the
 * content database (read-only) and that category chip colors pass WCAG AA in
 * both light and dark modes.
 *
 * Run: npm run test:periodic
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const data = await import(
  pathToFileURL(path.join(REPO, "content", "periodic-table", "elements.ts")).href
);
const { ELEMENTS, CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_BLURBS, F_BLOCK_MARKERS, GRID_COLS, GRID_ROWS } = data;

/** Independent reference: symbols in atomic-number order (IUPAC). */
const SYMBOLS = (
  "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr " +
  "Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu " +
  "Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr " +
  "Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og"
).split(/\s+/);

const bySymbol = (s) => ELEMENTS.find((e) => e.symbol === s);

test("reference list has 118 symbols", () => {
  assert.equal(SYMBOLS.length, 118);
});

test("118 elements with unique, contiguous atomic numbers 1..118", () => {
  assert.equal(ELEMENTS.length, 118);
  const numbers = ELEMENTS.map((e) => e.atomicNumber);
  assert.equal(new Set(numbers).size, 118);
  numbers.forEach((n, i) => assert.equal(n, i + 1));
});

test("symbols are unique and match the IUPAC reference by atomic number", () => {
  assert.equal(new Set(ELEMENTS.map((e) => e.symbol)).size, 118);
  ELEMENTS.forEach((e) => assert.equal(e.symbol, SYMBOLS[e.atomicNumber - 1], `Z=${e.atomicNumber}`));
  ELEMENTS.forEach((e) => assert.match(e.symbol, /^[A-Z][a-z]?$/));
});

test("names are unique and non-empty", () => {
  assert.equal(new Set(ELEMENTS.map((e) => e.name.toLowerCase())).size, 118);
  ELEMENTS.forEach((e) => assert.ok(e.name.length >= 3));
  // spot checks of tricky names
  assert.equal(bySymbol("W").name, "Tungsten");
  assert.equal(bySymbol("Hg").name, "Mercury");
  assert.equal(bySymbol("Fe").name, "Iron");
  assert.equal(bySymbol("Au").name, "Gold");
  assert.equal(bySymbol("Og").name, "Oganesson");
});

test("every category is valid, labelled and used; all ten categories are present", () => {
  assert.equal(CATEGORY_ORDER.length, 10);
  for (const e of ELEMENTS) assert.ok(CATEGORY_ORDER.includes(e.category), e.symbol);
  for (const c of CATEGORY_ORDER) {
    assert.ok(CATEGORY_LABELS[c], c);
    assert.ok(CATEGORY_BLURBS[c], c);
    assert.ok(ELEMENTS.some((e) => e.category === c), `unused category ${c}`);
  }
});

test("category membership matches the standard scheme", () => {
  const set = (cat) => ELEMENTS.filter((e) => e.category === cat).map((e) => e.symbol);
  assert.deepEqual(set("alkali-metal"), ["Li", "Na", "K", "Rb", "Cs", "Fr"]);
  assert.deepEqual(set("alkaline-earth-metal"), ["Be", "Mg", "Ca", "Sr", "Ba", "Ra"]);
  assert.deepEqual(set("noble-gas"), ["He", "Ne", "Ar", "Kr", "Xe", "Rn"]);
  assert.deepEqual(set("metalloid"), ["B", "Si", "Ge", "As", "Sb", "Te", "At"]);
  assert.deepEqual(set("post-transition-metal"), ["Al", "Ga", "In", "Sn", "Tl", "Pb", "Bi", "Po"]);
  assert.deepEqual(set("reactive-nonmetal"), ["H", "C", "N", "O", "F", "P", "S", "Cl", "Se", "Br", "I"]);
  assert.deepEqual(set("unknown").length, 10);
  for (const e of ELEMENTS) {
    assert.equal(e.category === "lanthanide", e.atomicNumber >= 57 && e.atomicNumber <= 71, e.symbol);
    assert.equal(e.category === "actinide", e.atomicNumber >= 89 && e.atomicNumber <= 103, e.symbol);
    assert.equal(e.category === "unknown", e.atomicNumber >= 109, e.symbol);
  }
});

test("transition metal count is 34 (Sc-Zn, Y-Cd, Hf-Hg, Rf-Hs)", () => {
  const tm = ELEMENTS.filter((e) => e.category === "transition-metal").map((e) => e.atomicNumber);
  const expected = [
    ...Array.from({ length: 10 }, (_, i) => 21 + i),
    ...Array.from({ length: 10 }, (_, i) => 39 + i),
    ...Array.from({ length: 9 }, (_, i) => 72 + i),
    ...Array.from({ length: 5 }, (_, i) => 104 + i),
  ];
  assert.deepEqual(tm, expected);
});

test("group and period are consistent with known anchors", () => {
  const anchors = {
    H: [1, 1], He: [18, 1], Li: [1, 2], Be: [2, 2], B: [13, 2], Ne: [18, 2],
    Na: [1, 3], Al: [13, 3], Cl: [17, 3], Ar: [18, 3], K: [1, 4], Sc: [3, 4],
    Fe: [8, 4], Zn: [12, 4], Ga: [13, 4], Kr: [18, 4], Y: [3, 5], Ag: [11, 5],
    Xe: [18, 5], Cs: [1, 6], Ba: [2, 6], Hf: [4, 6], Au: [11, 6], Rn: [18, 6],
    Fr: [1, 7], Ra: [2, 7], Rf: [4, 7], Og: [18, 7], Nh: [13, 7],
  };
  for (const [s, [group, period]] of Object.entries(anchors)) {
    const e = bySymbol(s);
    assert.equal(e.group, group, `${s} group`);
    assert.equal(e.period, period, `${s} period`);
  }
  for (const e of ELEMENTS) {
    const fBlock = (e.atomicNumber >= 57 && e.atomicNumber <= 71) || (e.atomicNumber >= 89 && e.atomicNumber <= 103);
    assert.equal(e.group === null, fBlock, `${e.symbol} f-block group null`);
    assert.ok(e.period >= 1 && e.period <= 7);
  }
  // period lengths 2, 8, 8, 18, 18, 32, 32
  const lengths = [2, 8, 8, 18, 18, 32, 32];
  lengths.forEach((len, i) => assert.equal(ELEMENTS.filter((e) => e.period === i + 1).length, len, `period ${i + 1}`));
});

test("grid positions are valid, unique and do not collide with markers", () => {
  const seen = new Map();
  for (const e of ELEMENTS) {
    assert.ok(Number.isInteger(e.gridRow) && e.gridRow >= 1 && e.gridRow <= GRID_ROWS, e.symbol);
    assert.ok(Number.isInteger(e.gridCol) && e.gridCol >= 1 && e.gridCol <= GRID_COLS, e.symbol);
    assert.notEqual(e.gridRow, 8, `${e.symbol} must not use the gap row`);
    const key = `${e.gridRow},${e.gridCol}`;
    assert.ok(!seen.has(key), `${e.symbol} collides with ${seen.get(key)} at ${key}`);
    seen.set(key, e.symbol);
  }
  for (const m of F_BLOCK_MARKERS) {
    assert.ok(!seen.has(`${m.row},${m.col}`), `marker ${m.label} collides`);
    assert.equal(m.to - m.from + 1, 15);
  }
  // f-block rows hold exactly the lanthanides / actinides in columns 3..17
  for (const e of ELEMENTS) {
    if (e.gridRow === 9) assert.equal(e.category, "lanthanide");
    if (e.gridRow === 10) assert.equal(e.category, "actinide");
    if (e.category === "lanthanide") { assert.equal(e.gridRow, 9); assert.equal(e.gridCol, e.atomicNumber - 54); }
    if (e.category === "actinide") { assert.equal(e.gridRow, 10); assert.equal(e.gridCol, e.atomicNumber - 86); }
  }
  assert.equal(bySymbol("La").gridCol, 3);
  assert.equal(bySymbol("Lu").gridCol, 17);
  assert.equal(bySymbol("Ac").gridCol, 3);
  assert.equal(bySymbol("Lr").gridCol, 17);
  // main-table cell = (period, group)
  for (const e of ELEMENTS) {
    if (e.group !== null) {
      assert.equal(e.gridRow, e.period, e.symbol);
      assert.equal(e.gridCol, e.group, e.symbol);
    }
  }
});

test("atomic masses are positive, increase (allowing known inversions) and flag mass numbers", () => {
  for (const e of ELEMENTS) {
    assert.ok(e.atomicMass > 0, e.symbol);
    assert.ok(e.atomicMass >= e.atomicNumber, `${e.symbol} mass below atomic number`);
  }
  // Standard-weight neighbours that are out of order: Ar/K, Co/Ni, Te/I, Th/Pa.
  const knownInversions = new Set(["Ar", "K", "Co", "Ni", "Te", "I", "Th", "Pa"]);
  for (let i = 1; i < ELEMENTS.length; i++) {
    const prev = ELEMENTS[i - 1];
    const cur = ELEMENTS[i];
    // Mass numbers of longest-lived isotopes (brackets) need not be monotonic.
    if (cur.massIsMassNumber || prev.massIsMassNumber) continue;
    if (cur.atomicMass < prev.atomicMass) {
      assert.ok(
        knownInversions.has(cur.symbol) || knownInversions.has(prev.symbol),
        `unexpected mass inversion ${prev.symbol}->${cur.symbol}`,
      );
    }
  }
  // spot checks (IUPAC abridged values)
  const mass = { H: 1.008, C: 12.011, O: 15.999, Fe: 55.845, Au: 196.97, Pb: 207.2, U: 238.03 };
  for (const [s, m] of Object.entries(mass)) assert.equal(bySymbol(s).atomicMass, m, s);
  assert.equal(bySymbol("Tc").massIsMassNumber, true);
  assert.equal(bySymbol("Pu").massIsMassNumber, true);
  assert.equal(bySymbol("U").massIsMassNumber, false);
  assert.equal(bySymbol("C").massIsMassNumber, false);
  for (const e of ELEMENTS) {
    if (e.massIsMassNumber) {
      assert.ok(Number.isInteger(e.atomicMass), `${e.symbol} mass number must be an integer`);
      assert.ok(e.noStableIsotope, e.symbol);
    }
  }
});

test("noStableIsotope: Tc, Pm and every element from Po upward", () => {
  const flagged = ELEMENTS.filter((e) => e.noStableIsotope).map((e) => e.atomicNumber);
  const expected = [43, 61, ...Array.from({ length: 118 - 84 + 1 }, (_, i) => 84 + i)];
  assert.deepEqual(flagged, expected);
});

test("every element has a beginner-friendly fact (1-2 sentences)", () => {
  for (const e of ELEMENTS) {
    assert.ok(e.fact.length >= 30 && e.fact.length <= 260, `${e.symbol} fact length ${e.fact.length}`);
    const sentences = e.fact.match(/[.!?](\s|$)/g) ?? [];
    assert.ok(sentences.length >= 1 && sentences.length <= 3, `${e.symbol} has ${sentences.length} sentences`);
  }
});

test("nuclear connection exists for the key nuclear-relevant elements", () => {
  const required = ["H", "He", "Li", "B", "C", "N", "K", "Co", "Sr", "Tc", "I", "Xe", "Cs", "Cd", "Rn", "Ra", "Th", "U", "Pu", "Am"];
  for (const s of required) {
    const e = bySymbol(s);
    assert.ok(e.nuclearConnection && e.nuclearConnection.length > 30, `${s} needs a nuclear connection`);
  }
  for (const e of ELEMENTS) {
    if (e.nuclearConnection !== undefined) assert.ok(e.nuclearConnection.length <= 320, `${e.symbol} too long`);
  }
  for (const e of ELEMENTS.filter((x) => x.atomicNumber >= 104)) {
    assert.ok(e.nuclearConnection, `${e.symbol} superheavy blurb`);
  }
});

test("explainer covers element, isotope and ion with concrete examples", () => {
  const terms = data.ELEMENT_ISOTOPE_ION.map((x) => x.term);
  assert.deepEqual(terms, ["Element", "Isotope", "Ion"]);
  const text = JSON.stringify(data.ELEMENT_ISOTOPE_ION);
  assert.ok(text.includes("Carbon-12") && text.includes("Carbon-14"));
  assert.ok(text.includes("Na"));
});

/* ---------------- links into the content database ------------------- */

const dbPath = path.join(REPO, "content", "database", "content.db");

function openDb() {
  assert.ok(fs.existsSync(dbPath), `missing ${dbPath}`);
  return new DatabaseSync(dbPath, { readOnly: true });
}

test("relatedLessonIds reference real lessons in the content database", () => {
  const db = openDb();
  try {
    const ids = new Set(db.prepare("SELECT id FROM lessons").all().map((r) => r.id));
    assert.ok(ids.size >= 5);
    for (const e of ELEMENTS) {
      assert.equal(new Set(e.relatedLessonIds).size, e.relatedLessonIds.length, `${e.symbol} duplicate lesson links`);
      for (const id of e.relatedLessonIds) assert.ok(ids.has(id), `${e.symbol}: unknown lesson id "${id}"`);
    }
    assert.ok(ids.has("isotopes"), "detail screen links the isotopes lesson");
  } finally {
    db.close();
  }
});

test("relatedTerms reference real encyclopedia entries in the content database", () => {
  const db = openDb();
  try {
    const ids = new Set(db.prepare("SELECT id FROM encyclopedia_entries").all().map((r) => r.id));
    assert.ok(ids.size > 50);
    for (const e of ELEMENTS) {
      assert.equal(new Set(e.relatedTerms).size, e.relatedTerms.length, `${e.symbol} duplicate term links`);
      for (const id of e.relatedTerms) assert.ok(ids.has(id), `${e.symbol}: unknown encyclopedia id "${id}"`);
    }
    for (const id of ["isotope", "atomic-number"]) assert.ok(ids.has(id), `detail screen links ${id}`);
  } finally {
    db.close();
  }
});

/* ---------------- contrast ------------------------------------------ */

test("category chip colors meet WCAG AA in light and dark", async () => {
  const { computeContrast, summarize, TEXT_TARGET, NON_TEXT_TARGET } = await import(
    pathToFileURL(path.join(HERE, "check-periodic-contrast.mjs")).href
  );
  const rows = await computeContrast();
  assert.equal(rows.length, 20);
  const s = summarize(rows);
  assert.ok(s.minText >= TEXT_TARGET, `text ${s.minText}`);
  assert.ok(s.minSecondary >= TEXT_TARGET, `secondary text ${s.minSecondary}`);
  assert.ok(s.minAccent >= NON_TEXT_TARGET, `accent ${s.minAccent}`);
});

/* ---------------- search --------------------------------------------- */

const search = await import(pathToFileURL(path.join(REPO, "content", "periodic-table", "search.ts")).href);
const find = (query, category = null) => search.filterElementList(ELEMENTS, { query, category }).map((e) => e.symbol);

test("search: a short query is a prefix, not a substring", () => {
  // Names or symbols that start with "n", in atomic-number order. Silicon, Tin and the rest merely contain one.
  assert.deepEqual(find("n"), ["N", "Ne", "Na", "Ni", "Nb", "Nd", "Np", "No", "Nh"]);
  assert.deepEqual(find("fe"), ["Fe", "Fm"]);
});

test("search: three letters or more may match inside a name", () => {
  assert.ok(find("oxy").includes("O"));
  assert.ok(find("ium").includes("Li"));
  assert.ok(!find("ium").includes("Fe"));
});

test("search: number, name, case and category work together", () => {
  assert.deepEqual(find("26"), ["Fe"]);
  assert.deepEqual(find("  URANIUM "), ["U"]);
  assert.deepEqual(find("", "noble-gas"), ["He", "Ne", "Ar", "Kr", "Xe", "Rn"]);
  assert.deepEqual(find("ne", "noble-gas"), ["Ne"]);
  assert.deepEqual(find("u", "noble-gas"), []);
  assert.equal(find("").length, 118);
});

test("search: alternate spellings find their element", () => {
  assert.deepEqual(find("aluminium"), ["Al"]);
  assert.deepEqual(find("sulphur"), ["S"]);
  assert.deepEqual(find("caesium"), ["Cs"]);
  assert.deepEqual(find("deut"), ["H"]);
  assert.deepEqual(find("zzz"), []);
});

test("route param: a malformed link does not throw", () => {
  assert.equal(search.symbolFromParam("Fe"), "Fe");
  assert.equal(search.symbolFromParam("%46e"), "Fe");
  assert.equal(search.symbolFromParam(["Au", "x"]), "Au");
  assert.equal(search.symbolFromParam("%E0%A4%A"), "%E0%A4%A");
  assert.equal(search.symbolFromParam(undefined), undefined);
  assert.equal(search.symbolFromParam(""), undefined);
});
