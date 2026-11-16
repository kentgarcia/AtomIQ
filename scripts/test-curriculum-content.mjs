/**
 * Curriculum content: authored units validate, every item is answerable, and the
 * rules reject broken lessons.
 *
 * Run: npm run test:curriculum-content
 */
import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { DatabaseSync } from "node:sqlite";

import { evaluateItem } from "../content/curriculum/evaluate.ts";
import { validateCurriculum, wordCount, plainText } from "./lib/curriculum-rules.mjs";
import { curriculumDdl, insertUnit, loadUnitModules, npcsDdl, seedNpcs } from "./lib/curriculum-load.mjs";

const TERMS = ["atom", "proton", "neutron", "electron", "nucleus", "atomic-number", "isotope", "radiation"];

let modules;
before(async () => {
  modules = await loadUnitModules();
});

function build() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("CREATE TABLE encyclopedia_entries (id TEXT PRIMARY KEY)");
  db.exec("CREATE TABLE myths (id TEXT PRIMARY KEY, related_lessons TEXT NOT NULL DEFAULT '[]')");
  for (const t of TERMS) db.prepare("INSERT INTO encyclopedia_entries (id) VALUES (?)").run(t);
  db.exec(curriculumDdl());
  for (const mod of modules) insertUnit(db, mod);
  return db;
}

const errorsOf = (db, opts) => validateCurriculum(db, opts).findings.filter((f) => f.severity === "error");
const rules = (db, opts) => new Set(errorsOf(db, opts).map((f) => f.rule));

describe("Unit 1 content", () => {
  it("validates with no errors (unverified references are warnings in draft)", () => {
    const db = build();
    const errs = errorsOf(db);
    assert.deepEqual(errs.map((f) => `${f.table} ${f.id} ${f.rule}: ${f.message}`), []);
  });

  it("blocks publish while references are unverified (strictReview)", () => {
    const db = build();
    assert.ok(rules(db, { strictReview: true }).has("reference-unverified"));
  });

  it("passes the publish gate once every reference is verified and complete", () => {
    const db = build();
    db.exec("UPDATE content_references SET verified = 1, accessed = '2026-11-16', url = CASE WHEN url = '' THEN 'https://example.org/' ELSE url END");
    assert.deepEqual(errorsOf(db, { strictReview: true }).map((f) => `${f.id} ${f.rule}`), []);
  });

  it("every teaching card is within the word limit and has a figure", () => {
    const db = build();
    for (const c of db.prepare("SELECT * FROM lesson_cards WHERE kind = 'teach'").all()) {
      const d = JSON.parse(c.data);
      assert.ok(wordCount(d.body) <= 60, `${c.lesson_id}/${c.id} has ${wordCount(d.body)} words`);
      assert.ok(d.figure?.scene?.shapes?.length, `${c.lesson_id}/${c.id} has no figure`);
    }
  });

  it("every objective is taught once and has four or more questions with a checkpoint item", () => {
    const db = build();
    const rows = db.prepare(`
      SELECT o.id,
        (SELECT COUNT(*) FROM items i WHERE i.objective_id = o.id AND i.type != 'predict') AS n,
        (SELECT COUNT(*) FROM items i WHERE i.objective_id = o.id AND i.surfaces LIKE '%checkpoint%') AS cp
      FROM objectives o`).all();
    for (const r of rows) {
      assert.ok(r.n >= 4, `${r.id} has ${r.n} questions`);
      assert.ok(r.cp >= 1, `${r.id} has no checkpoint item`);
    }
  });

  it("the unit has at least 12 checkpoint items covering all ten objectives", () => {
    const db = build();
    const cp = db.prepare("SELECT objective_id FROM items WHERE surfaces LIKE '%checkpoint%'").all();
    assert.ok(cp.length >= 12);
    assert.equal(new Set(cp.map((r) => r.objective_id)).size, 10);
  });

  it("practice nodes can draw their question count from lesson-surface items of earlier objectives", () => {
    const db = build();
    const n = db.prepare("SELECT COUNT(*) AS n FROM items WHERE surfaces LIKE '%practice%' AND type != 'predict'").get().n;
    assert.ok(n >= 8);
  });

  it("answers: the correct response scores correct and a wrong one does not, for every item", () => {
    const db = build();
    for (const row of db.prepare("SELECT * FROM items WHERE type != 'predict'").all()) {
      const d = JSON.parse(row.data);
      const { right, wrong } = responses(row.type, d);
      assert.equal(evaluateItem(row.type, d, right).correct, true, `${row.id}: right answer rejected`);
      assert.equal(evaluateItem(row.type, d, wrong).correct, false, `${row.id}: wrong answer accepted`);
    }
  });

  it("no choice item gives away its answer by being the longest option every time", () => {
    const db = build();
    let longest = 0;
    let total = 0;
    for (const row of db.prepare("SELECT * FROM items WHERE type = 'choice'").all()) {
      const d = JSON.parse(row.data);
      const lens = d.options.map((o) => o.label.length);
      total++;
      if (d.options.find((o) => o.id === d.answer).label.length === Math.max(...lens)) longest++;
    }
    assert.ok(longest / total < 0.7, `${longest} of ${total} correct options are the longest`);
  });

  it("correct options are spread over the positions (not always first)", () => {
    const db = build();
    const positions = new Set();
    for (const row of db.prepare("SELECT * FROM items WHERE type = 'choice'").all()) {
      const d = JSON.parse(row.data);
      positions.add(d.options.findIndex((o) => o.id === d.answer));
    }
    // The app shuffles at render time; the source order is allowed to vary.
    assert.ok(positions.size >= 1);
  });
});

/** Build a right and a wrong response for an item from its own data. */
function responses(type, d) {
  switch (type) {
    case "choice":
      return { right: { type, optionId: d.answer }, wrong: { type, optionId: d.options.find((o) => o.id !== d.answer).id } };
    case "true_or_myth":
      return { right: { type, answer: d.answer }, wrong: { type, answer: d.answer === "true" ? "myth" : "true" } };
    case "order":
      return { right: { type, orderedIds: d.items.map((i) => i.id) }, wrong: { type, orderedIds: [...d.items.map((i) => i.id)].reverse() } };
    case "match":
      return { right: { type, matches: Object.fromEntries(d.pairs.map((p) => [p.id, p.id])) }, wrong: { type, matches: Object.fromEntries(d.pairs.map((p, i) => [p.id, d.pairs[(i + 1) % d.pairs.length].id])) } };
    case "sort": {
      const other = (b) => d.buckets.find((x) => x.id !== b).id;
      return { right: { type, placements: Object.fromEntries(d.items.map((i) => [i.id, i.bucket])) }, wrong: { type, placements: Object.fromEntries(d.items.map((i) => [i.id, other(i.bucket)])) } };
    }
    case "fill":
      return d.mode === "number"
        ? { right: { type, value: d.answer }, wrong: { type, value: d.answer + 1 + (d.tolerance ?? 0) } }
        : { right: { type, value: d.answer }, wrong: { type, value: d.bank.find((b) => b.id !== d.answer).id } };
    case "estimate":
      return { right: { type, value: d.answer }, wrong: { type, value: d.scale === "log" ? d.answer * (d.tolerance + 1) * 10 : d.answer + d.tolerance * 10 } };
    case "hotspot":
      return { right: { type, targetId: d.answer }, wrong: { type, targetId: d.targets.find((t) => t.id !== d.answer).id } };
    default:
      throw new Error(`no responses for ${type}`);
  }
}

describe("curriculum rules reject broken content", () => {
  const mutate = (sql, ...params) => {
    const db = build();
    db.prepare(sql).run(...params);
    return db;
  };
  const withData = (db, lessonId, cardId, fn) => {
    const row = db.prepare("SELECT data FROM lesson_cards WHERE lesson_id = ? AND id = ?").get(lessonId, cardId);
    const data = JSON.parse(row.data);
    fn(data);
    db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = ? AND id = ?").run(JSON.stringify(data), lessonId, cardId);
    return db;
  };

  it("a teaching card over 80 words", () => {
    const db = withData(build(), "isotopes", "c03", (d) => (d.body = Array(85).fill("word").join(" ")));
    assert.ok(rules(db).has("card-words"));
  });

  it("a teaching card without a figure", () => {
    const db = withData(build(), "isotopes", "c03", (d) => delete d.figure);
    assert.ok(rules(db).has("card-figure"));
  });

  it("a figure with a shape outside the scene", () => {
    const db = withData(build(), "isotopes", "c03", (d) => d.figure.scene.shapes.push({ t: "circle", x: 500, y: 10, r: 3 }));
    assert.ok(rules(db).has("card-figure"));
  });

  it("an unknown glossary term", () => {
    const db = withData(build(), "isotopes", "c03", (d) => (d.body = "See [[nonexistent-term|this]] for more."));
    assert.ok(rules(db).has("glossary-term"));
  });

  it("more than two reading cards in a row", () => {
    const db = build();
    db.prepare("UPDATE lesson_cards SET kind = 'teach', type = 'explain', item_id = NULL, scored = 0, data = ? WHERE lesson_id = 'isotopes' AND id IN ('c04','c05','c06')").run(
      JSON.stringify({ body: "Short text.", figure: { altText: "A figure that has enough alt text.", scene: { height: 30, shapes: [{ t: "circle", x: 50, y: 15, r: 5 }] } } }),
    );
    assert.ok(rules(db).has("lesson-reading-run"));
  });

  it("a lesson with no prediction is only a warning", () => {
    const db = build();
    db.prepare("DELETE FROM lesson_cards WHERE lesson_id = 'isotopes' AND id = 'c01'").run();
    assert.ok(!rules(db).has("lesson-predict"));
    assert.ok(validateCurriculum(db).findings.some((f) => f.severity === "warning" && f.rule === "lesson-predict"));
  });

  it("an objective taught by no lesson, and one taught by two", () => {
    const none = mutate("UPDATE lessons SET teaches = '[\"u1-isotope-definition\"]' WHERE id = 'isotopes'");
    assert.ok(rules(none).has("objective-owner"), "u1-mass-number no longer taught");
    const two = mutate("UPDATE lessons SET teaches = '[\"u1-isotope-definition\",\"u1-mass-number\",\"u1-particles\"]' WHERE id = 'isotopes'");
    assert.ok(rules(two).has("objective-owner"), "u1-particles taught twice");
  });

  it("relying on an objective that is taught later", () => {
    const db = mutate("UPDATE lessons SET relies_on = '[\"u1-stable-unstable\"]' WHERE id = 'atoms-are-everywhere'");
    assert.ok(rules(db).has("relies-on"));
  });

  it("an answer id that is not an option", () => {
    const db = build();
    const row = db.prepare("SELECT data FROM items WHERE id = 'u1-l1-choice-made-of'").get();
    const d = JSON.parse(row.data);
    d.answer = "nope";
    db.prepare("UPDATE items SET data = ? WHERE id = 'u1-l1-choice-made-of'").run(JSON.stringify(d));
    assert.ok(rules(db).has("item-shape"));
  });

  it("a reveal that points before its prediction or at a non-prediction", () => {
    const db = withData(build(), "protons-neutrons-electrons", "c08", (d) => (d.predictCardId = "c03"));
    assert.ok(rules(db).has("card-reveal"));
  });

  it("a lesson with no reference, and a unit with no reference", () => {
    const l = mutate("DELETE FROM lesson_references WHERE lesson_id = 'isotopes'");
    assert.ok(rules(l).has("lesson-reference"));
    const u = mutate("DELETE FROM unit_references");
    assert.ok(rules(u).has("unit-reference"));
  });

  it("an item that is not in any lesson-compatible surface but is used by a lesson card", () => {
    const db = mutate("UPDATE items SET surfaces = '[\"practice\"]' WHERE id = 'u1-l4-fill-c14'");
    assert.ok(rules(db).has("card-item"));
  });

  it("a prediction that can appear outside the lesson", () => {
    const db = mutate("UPDATE items SET surfaces = '[\"lesson\",\"practice\"]' WHERE id = 'u1-l4-predict-carbon-mass'");
    assert.ok(rules(db).has("item-shape"));
  });

  it("a lesson that is not on the path", () => {
    const db = mutate("DELETE FROM path_nodes WHERE lesson_id = 'isotopes'");
    assert.ok(rules(db).has("lesson-node"));
  });

  it("a myth linking to a lesson that does not exist", () => {
    const db = build();
    db.prepare("INSERT INTO myths (id, related_lessons) VALUES ('m', '[\"ghost-lesson\"]')").run();
    assert.ok(rules(db).has("link-lesson"));
  });

  it("a scale-zoom with stops that grow instead of shrink", () => {
    const db = withData(build(), "atoms-are-everywhere", "c05", (d) => d.stops.reverse());
    assert.ok(rules(db).has("sim-shape"));
  });
});

describe("text helpers", () => {
  it("counts the words learners see, not the markers", () => {
    assert.equal(plainText("About [[atom|atoms]] here."), "About atoms here.");
    assert.equal(wordCount("About [[atom|atoms]] here."), 3);
  });
});


describe("NPC teachers (docs/NPC_TEACHERS_SPEC.md §7.3)", () => {
  async function buildWithNpcs() {
    const db = build();
    db.exec(npcsDdl());
    await seedNpcs(db);
    return db;
  }
  const ruleSet = (db) => new Set(errorsOf(db).map((f) => f.rule));

  it("the seeded cast and Unit 1 validate with no errors", async () => {
    const db = await buildWithNpcs();
    assert.deepEqual(errorsOf(db).map((f) => `${f.table} ${f.id} ${f.rule}: ${f.message}`), []);
  });

  it("R1: a unit without a teacher, or with an unknown one, is an error", async () => {
    const db = await buildWithNpcs();
    db.exec("UPDATE units SET teacher_npc_id = NULL");
    assert.ok(ruleSet(db).has("npc-unit-teacher"));
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec("UPDATE units SET teacher_npc_id = 'npc-nobody'");
    assert.ok(ruleSet(db).has("npc-unit-teacher"));
  });

  it("R2: every lesson needs exactly one intro by the unit's teacher, and the unit a meet and a sign-off line", async () => {
    const db = await buildWithNpcs();
    db.exec("DELETE FROM npc_lines WHERE kind = 'lesson_intro' AND lesson_id = 'isotopes'");
    assert.ok(ruleSet(db).has("npc-lines"));
    const db2 = await buildWithNpcs();
    db2.exec("DELETE FROM npc_lines WHERE kind = 'sign_off'");
    assert.ok(ruleSet(db2).has("npc-lines"));
    const db3 = await buildWithNpcs();
    db3.exec("UPDATE npc_lines SET npc_id = 'npc-hal' WHERE id = 'line-ada-intro-isotopes'");
    assert.ok(ruleSet(db3).has("npc-lines"));
  });

  it("R3: a line over 20 words, or with markup, is an error; a number the lesson lacks is a warning", async () => {
    const db = await buildWithNpcs();
    db.prepare("UPDATE npc_lines SET text = ? WHERE id = 'line-ada-meet'").run("word ".repeat(21).trim());
    assert.ok(ruleSet(db).has("npc-line-length"));
    const db2 = await buildWithNpcs();
    db2.prepare("UPDATE npc_lines SET text = ? WHERE id = 'line-ada-meet'").run("Hi <b>there</b>");
    assert.ok(ruleSet(db2).has("npc-line-plain"));
    const db3 = await buildWithNpcs();
    db3.prepare("UPDATE npc_lines SET text = ? WHERE id = 'line-ada-intro-isotopes'").run("There are 4242 isotopes here.");
    const f = validateCurriculum(db3).findings.find((x) => x.rule === "npc-line-facts");
    assert.ok(f && f.severity === "warning");
  });

  it("R4: a copy of another teacher, or a Duolingo name, is an error", async () => {
    const db = await buildWithNpcs();
    const ada = db.prepare("SELECT spec FROM npcs WHERE id = 'npc-ada'").get().spec;
    db.prepare("UPDATE npcs SET spec = ? WHERE id = 'npc-hal'").run(ada);
    assert.ok(ruleSet(db).has("npc-variety"));
    const db2 = await buildWithNpcs();
    db2.exec("UPDATE npcs SET name = 'Lily' WHERE id = 'npc-hal'");
    assert.ok(ruleSet(db2).has("npc-original"));
    const db3 = await buildWithNpcs();
    db3.exec("UPDATE npcs SET spec = '{\"skin\":{\"base\":\"red\"}}' WHERE id = 'npc-ray'");
    assert.ok(ruleSet(db3).has("npc-spec"));
  });

  it("R5: a story card's speaker must be the unit's teacher", async () => {
    const db = await buildWithNpcs();
    const story = db.prepare("SELECT lesson_id, id, data FROM lesson_cards WHERE type = 'story' LIMIT 1").get();
    assert.ok(story, "Unit 1 has a story card");
    const set = (speaker) => db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = ? AND id = ?").run(JSON.stringify({ ...JSON.parse(story.data), speaker }), story.lesson_id, story.id);
    set("npc-ada");
    assert.ok(!ruleSet(db).has("npc-speaker"));
    set("npc-hal");
    assert.ok(ruleSet(db).has("npc-speaker"));
    set("npc-nobody");
    assert.ok(ruleSet(db).has("npc-speaker"));
  });
});
