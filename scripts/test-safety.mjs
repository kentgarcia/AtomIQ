import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const imp = (p) => import(pathToFileURL(path.resolve(p)).href);
const core = await imp("components/safety/safety-core.ts");
const vocab = await imp("scripts/lib/safety-vocab.mjs");
const { validateSafetyData, validateSafety } = await imp("scripts/lib/safety-rules.mjs");

test("the app's sections and words match the content vocabulary", () => {
  assert.deepEqual([...core.SAFETY_SECTIONS], vocab.SAFETY_SECTIONS);
  assert.deepEqual(core.SAFETY_SECTION_TITLES, vocab.SAFETY_SECTION_TITLES);
});

const card = (over = {}) => ({ id: "c1", section: "basics", title: "Title", summary: "One line.", steps: ["One.", "Two."], icon: "ShieldTick", entryId: null, position: 0, sources: [], ...over });

test("cards are grouped in the three sections in reading order, empty sections left out", () => {
  const groups = core.groupCards([card({ id: "m1", section: "myths" }), card({ id: "b2", position: 2 }), card({ id: "b1", position: 1 }), card({ id: "x", section: "other" })]);
  assert.deepEqual(groups.map((g) => g.section), ["basics", "myths"]);
  assert.deepEqual(groups[0].cards.map((c) => c.id), ["b1", "b2"]);
  assert.equal(groups[0].title, "Radiation basics");
});

test("the disclaimer says what this is and is not", () => {
  assert.match(core.SAFETY_DISCLAIMER, /not an emergency service/);
  assert.match(core.SAFETY_DISCLAIMER, /local emergency number/);
  assert.match(core.SAFETY_FOOT, /emergency number/);
});

test("a card with no lines or no title is not shown, a myth line splits into its label", () => {
  assert.equal(core.isShowable(card()), true);
  assert.equal(core.isShowable(card({ steps: [] })), false);
  assert.equal(core.isShowable(card({ title: "  " })), false);
  assert.deepEqual(core.splitLabel("Myth: a thing."), { label: "Myth", text: "a thing." });
  assert.deepEqual(core.splitLabel("What is true: a fact."), { label: "What is true", text: "a fact." });
  assert.deepEqual(core.splitLabel("Plain line."), { label: null, text: "Plain line." });
  assert.equal(core.cardCountText(1), "1 card");
  assert.equal(core.cardCountText(14), "14 cards");
});

// ---- the rules ----------------------------------------------------------------------------

const row = (over = {}) => ({ id: "c1", section: "basics", title: "Title", summary: "One line.", steps: ["One.", "Two."], icon: "ShieldTick", entry_id: null, ...over });
const world = (cards, over = {}) => ({ cards, references: [{ id: "r1", verified: 1 }, { id: "r2", verified: 0 }], links: cards.map((c) => ({ card_id: c.id, reference_id: "r1" })), entryIds: ["shielding"], ...over });
const rules = (c, over, opts) => validateSafetyData(world([c], over), opts).findings.map((f) => `${f.severity}:${f.rule}`);

test("a good card passes; a bad section, empty lines, too many lines and a missing entry fail", () => {
  assert.deepEqual(rules(row()), []);
  assert.deepEqual(rules(row({ section: "x" })), ["error:safety-section"]);
  assert.deepEqual(rules(row({ steps: [] })), ["error:safety-steps"]);
  assert.deepEqual(rules(row({ steps: ["a", "b", "c", "d", "e", "f"] })), ["error:safety-steps"]);
  assert.deepEqual(rules(row({ steps: ["a", " "] })), ["error:safety-step"]);
  assert.deepEqual(rules(row({ entry_id: "nope" })), ["error:safety-entry"]);
  assert.deepEqual(rules(row({ entry_id: "shielding" })), []);
  assert.ok(rules(row({ title: "t".repeat(60) })).includes("warning:safety-title"));
});

test("a card needs a source; an unchecked source is a warning, and an error at the publish gate", () => {
  assert.ok(validateSafetyData(world([row()], { links: [] })).findings.some((f) => f.rule === "safety-reference" && f.severity === "error"));
  const unchecked = { links: [{ card_id: "c1", reference_id: "r2" }] };
  assert.deepEqual(rules(row(), unchecked), ["warning:safety-reference-unverified"]);
  assert.deepEqual(rules(row(), unchecked, { strictReview: true }), ["error:safety-reference-unverified"]);
  assert.deepEqual(rules(row(), { links: [{ card_id: "c1", reference_id: "ghost" }] }), ["error:safety-reference"]);
});

test("the seeded cards pass the rules, all have sources and 2 to 5 lines", () => {
  const db = new DatabaseSync("content/database/content.db", { readOnly: true });
  const result = validateSafety(db);
  assert.deepEqual(result.findings.filter((f) => f.severity === "error"), []);
  assert.ok(result.checked.safety_cards >= 12);
  const rows = db.prepare("SELECT id, section, steps FROM safety_cards").all();
  for (const r of rows) {
    const n = JSON.parse(r.steps).length;
    assert.ok(n >= 2 && n <= 5, `${r.id} has ${n} lines`);
  }
  assert.deepEqual([...new Set(rows.map((r) => r.section))].sort(), [...vocab.SAFETY_SECTIONS].sort());
  const linked = db.prepare("SELECT COUNT(DISTINCT card_id) n FROM safety_card_references").get().n;
  assert.equal(linked, result.checked.safety_cards);
});
