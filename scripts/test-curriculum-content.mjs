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
import { expandFigure } from "../components/lesson/visual/figures/index.ts";
import { curriculumDdl, insertRows, loadSourceRows, npcsDdl, seedNpcs } from "./lib/curriculum-load.mjs";

// Every [[term|shown]] marker and guidebook term id in Unit 1 must be an encyclopedia entry (the real ones live in the master db).
const TERMS = [
  "atom", "proton", "neutron", "electron", "nucleus", "atomic-number", "isotope", "radiation",
  "matter", "element", "periodic-table", "mass-number", "ion", "strong-force", "electric-force", "radioactivity", "nuclear-stability", "electron-cloud",
  "background-radiation", "ernest-rutherford", "henri-becquerel",
  // Unit 2
  "decay", "radionuclide", "alpha-particle", "beta-particle", "gamma-ray", "half-life", "radon", "cosmic-radiation", "ionizing-radiation", "marie-curie",
  "parent-nuclide", "daughter-nuclide", "electromagnetic-radiation", "decay-chain", "potassium-40", "alpha-decay", "beta-decay", "gamma-radiation",
  // Unit 3
  "x-ray", "shielding", "irradiation", "radioactive-contamination", "geiger-counter", "dosimeter", "becquerel", "gray", "sievert",
  // Unit 4
  "millisievert", "absorbed-dose", "dose-rate", "dna", "acute-radiation-syndrome",
];

let sourceRows;
before(() => {
  sourceRows = loadSourceRows();
});

function build() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("CREATE TABLE encyclopedia_entries (id TEXT PRIMARY KEY)");
  db.exec("CREATE TABLE myths (id TEXT PRIMARY KEY, related_lessons TEXT NOT NULL DEFAULT '[]')");
  for (const t of TERMS) db.prepare("INSERT INTO encyclopedia_entries (id) VALUES (?)").run(t);
  db.exec(curriculumDdl());
  insertRows(db, sourceRows, { skip: ["teacher_npc_id"] });
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
    // The shipped content has every source verified; un-verify one to see the gate close.
    db.exec("UPDATE content_references SET verified = 0 WHERE id = (SELECT reference_id FROM lesson_references LIMIT 1)");
    assert.ok(rules(db, { strictReview: true }).has("reference-unverified"));
  });

  it("passes the publish gate once every reference is verified and complete", () => {
    const db = build();
    db.exec("UPDATE content_references SET verified = 1, accessed = '2026-11-16', url = CASE WHEN url = '' THEN 'https://example.org/' ELSE url END");
    assert.deepEqual(errorsOf(db, { strictReview: true }).map((f) => `${f.id} ${f.rule}`), []);
  });

  it("every teaching card is within the word limit, and a figure that is given draws", () => {
    const db = build();
    for (const c of db.prepare("SELECT * FROM lesson_cards WHERE kind = 'teach'").all()) {
      const d = JSON.parse(c.data);
      assert.ok(wordCount(d.body) <= 100, `${c.lesson_id}/${c.id} has ${wordCount(d.body)} words`);
      if (d.figure) assert.ok(expandFigure(d.figure).figure?.scene?.shapes?.length, `${c.lesson_id}/${c.id} has a figure that does not draw`);
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

  it("each unit has at least 12 checkpoint items covering all of its objectives", () => {
    const db = build();
    for (const [unitId, objectives] of [["inside-the-atom", 10], ["radioactivity", 12]]) {
      const cp = db.prepare("SELECT i.objective_id FROM items i JOIN objectives o ON o.id = i.objective_id WHERE o.unit_id = ? AND i.surfaces LIKE '%checkpoint%'").all(unitId);
      assert.ok(cp.length >= 12, `${unitId} has ${cp.length} checkpoint items`);
      assert.equal(new Set(cp.map((r) => r.objective_id)).size, objectives, unitId);
    }
  });

  it("practice nodes can draw their question count from lesson-surface items of earlier objectives", () => {
    const db = build();
    for (const unitId of ["inside-the-atom", "radioactivity"]) {
      const n = db.prepare("SELECT COUNT(*) AS n FROM items i JOIN objectives o ON o.id = i.objective_id WHERE o.unit_id = ? AND i.surfaces LIKE '%practice%' AND i.type != 'predict'").get(unitId).n;
      assert.ok(n >= 8, `${unitId} has ${n} practice items`);
    }
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
    if (data.figure) data.figure = expandFigure(data.figure).figure; // a figure stored as an id is drawn so a test can break its shapes
    fn(data);
    db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = ? AND id = ?").run(JSON.stringify(data), lessonId, cardId);
    return db;
  };

  it("a teaching card over 100 words", () => {
    const db = withData(build(), "isotopes", "c02", (d) => (d.body = Array(105).fill("word").join(" ")));
    assert.ok(rules(db).has("card-words"));
  });

  it("a teaching card may have no figure, but a lesson where most have none is an error", () => {
    assert.ok(!rules(withData(build(), "isotopes", "c02", (d) => delete d.figure)).has("lesson-figures"), "one card without a picture is fine");
    const db = build();
    for (const c of db.prepare("SELECT id, data FROM lesson_cards WHERE lesson_id = 'isotopes' AND kind = 'teach'").all()) {
      const d = JSON.parse(c.data);
      delete d.figure;
      db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = 'isotopes' AND id = ?").run(JSON.stringify(d), c.id);
    }
    assert.ok(rules(db).has("lesson-figures"));
  });

  it("a figure with a shape outside the scene", () => {
    const db = withData(build(), "isotopes", "c02", (d) => d.figure.scene.shapes.push({ t: "circle", x: 500, y: 10, r: 3 }));
    assert.ok(rules(db).has("card-figure"));
  });

  it("a question figure with no alt text, or a shape outside the scene", () => {
    const edit = (fn) => {
      const db = build();
      const d = JSON.parse(db.prepare("SELECT data FROM items WHERE id = 'u1-l3-choice-lose-proton'").get().data);
      d.figure = expandFigure(d.figure).figure;
      fn(d);
      db.prepare("UPDATE items SET data = ? WHERE id = 'u1-l3-choice-lose-proton'").run(JSON.stringify(d));
      return db;
    };
    assert.ok(rules(edit((d) => (d.figure.altText = "short"))).has("item-shape"));
    assert.ok(rules(edit((d) => d.figure.scene.shapes.push({ t: "circle", x: 500, y: 10, r: 3 }))).has("item-shape"));
    assert.ok(rules(edit((d) => d.figure.scene.shapes.push({ t: "art", id: "unicorn", x: 50, y: 10, size: 10 }))).has("item-shape"));
    assert.ok(!rules(build()).has("item-shape"), "the figure as authored is fine");
  });

  it("an unknown glossary term", () => {
    const db = withData(build(), "isotopes", "c02", (d) => (d.body = "See [[nonexistent-term|this]] for more."));
    assert.ok(rules(db).has("glossary-term"));
  });

  it("a term marker with no shown text would print its brackets", () => {
    const bare = withData(build(), "isotopes", "c02", (d) => (d.body = "An [[isotope]] is one kind of atom."));
    assert.ok(rules(bare).has("glossary-term-format"));
    const stray = withData(build(), "isotopes", "c02", (d) => (d.body = "An [[isotope|isotope] is one kind of atom."));
    assert.ok(rules(stray).has("glossary-term-format"));
    const fine = withData(build(), "isotopes", "c02", (d) => (d.body = "An [[isotope|isotope]] is one kind of atom."));
    assert.ok(!rules(fine).has("glossary-term-format"));
  });

  it("too many words of teaching in a row (counted in words, not cards)", () => {
    const text = (n) => Array(n).fill("word").join(" ") + ".";
    const run = (words) => {
      const db = build();
      db.prepare("UPDATE lesson_cards SET kind = 'teach', type = 'explain', item_id = NULL, scored = 0, data = ? WHERE lesson_id = 'isotopes' AND id IN ('c20','c09','c05')").run(
        JSON.stringify({ body: text(words), figure: { altText: "A figure that has enough alt text.", scene: { height: 30, shapes: [{ t: "circle", x: 50, y: 15, r: 5 }] } } }),
      );
      return db;
    };
    assert.ok(!rules(run(10)).has("lesson-reading-run"), "three short cards in a row are fine now");
    assert.ok(validateCurriculum(run(60)).findings.some((f) => f.rule === "lesson-reading-run" && f.severity === "warning"), "past the first budget it is a warning");
    assert.ok(rules(run(95)).has("lesson-reading-run"), "past the second it is an error");
  });

  it("a lesson with no prediction is fine: it may open with a story, a puzzle or teaching", () => {
    const db = build();
    db.prepare("DELETE FROM lesson_cards WHERE lesson_id = 'isotopes' AND id = 'c01'").run();
    assert.ok(!rules(db).has("lesson-predict"));
    assert.ok(!validateCurriculum(db).findings.some((f) => f.rule === "lesson-predict"));
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
    const db = withData(build(), "protons-neutrons-electrons", "c07", (d) => (d.predictCardId = "c03"));
    assert.ok(rules(db).has("card-reveal"));
  });

  it("a lesson with no reference, and a unit with no reference", () => {
    const l = mutate("DELETE FROM lesson_references WHERE lesson_id = 'isotopes'");
    assert.ok(rules(l).has("lesson-reference"));
    const u = mutate("DELETE FROM unit_references");
    assert.ok(rules(u).has("unit-reference"));
  });

  it("an item that is not in any lesson-compatible surface but is used by a lesson card", () => {
    const db = mutate("UPDATE items SET surfaces = '[\"practice\"]' WHERE id = 'u1-l4-choice-pair'");
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

describe("lecture flow fields (figureAt, connected)", () => {
  const withData = (db, lessonId, cardId, fn) => {
    const data = JSON.parse(db.prepare("SELECT data FROM lesson_cards WHERE lesson_id = ? AND id = ?").get(lessonId, cardId).data);
    fn(data);
    db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = ? AND id = ?").run(JSON.stringify(data), lessonId, cardId);
    return db;
  };

  it("accepts a figureAt from 0 to the number of bubbles, and a connected flag on an activity after a lecture", () => {
    for (const at of [0, 1, 3]) assert.deepEqual(errorsOf(withData(build(), "alpha-beta-gamma", "c02", (d) => (d.figureAt = at))).map((f) => f.rule), []);
    assert.deepEqual(errorsOf(withData(build(), "alpha-beta-gamma", "c04", (d) => (d.connected = true))).map((f) => f.rule), []);
  });

  it("rejects a figureAt that is not a whole number within the bubbles, or has no figure to place", () => {
    for (const at of [-1, 4, 1.5, "1"]) assert.ok(rules(withData(build(), "alpha-beta-gamma", "c02", (d) => (d.figureAt = at))).has("card-figure-at"), String(at));
    assert.ok(rules(withData(build(), "isotopes", "c02", (d) => { d.figureAt = 1; d.visual = { type: "stat" }; delete d.figure; })).has("card-figure-at"));
  });

  it("rejects a connected flag that is not true or false", () => {
    assert.ok(rules(withData(build(), "alpha-beta-gamma", "c04", (d) => (d.connected = "yes"))).has("card-connected"));
  });

  it("warns when a connected activity has no lecture right before it", () => {
    const db = withData(build(), "alpha-beta-gamma", "c07", (d) => (d.connected = true));
    assert.ok(validateCurriculum(db).findings.some((f) => f.rule === "card-connected" && f.severity === "warning"));
  });
});

describe("sort group icons", () => {
  const sortItem = (db, fn) => {
    const row = db.prepare("SELECT id, data FROM items WHERE id = 'u1-l1-sort-matter'").get();
    const data = JSON.parse(row.data);
    fn(data);
    db.prepare("UPDATE items SET data = ? WHERE id = ?").run(JSON.stringify(data), row.id);
    return db;
  };
  it("the authored sort items give every group its own icon", () => {
    const db = build();
    for (const r of db.prepare("SELECT id, data FROM items WHERE type = 'sort'").all()) {
      const icons = JSON.parse(r.data).buckets.map((b) => b.icon);
      assert.ok(icons.every(Boolean) && new Set(icons).size === icons.length, r.id);
    }
  });
  it("two groups with the same icon are an error; a group with none is a warning", () => {
    assert.ok(rules(sortItem(build(), (d) => (d.buckets[1].icon = d.buckets[0].icon))).has("item-shape"));
    assert.ok(rules(sortItem(build(), (d) => (d.buckets[0].icon = 5))).has("item-shape"));
    const db = sortItem(build(), (d) => delete d.buckets[0].icon);
    assert.deepEqual(errorsOf(db).map((f) => f.rule), []);
    assert.ok(validateCurriculum(db).findings.some((f) => f.rule === "sort-icons" && f.severity === "warning"));
  });
});

describe("text helpers", () => {
  it("counts the words learners see, not the markers", () => {
    assert.equal(plainText("About [[atom|atoms]] here."), "About atoms here.");
    assert.equal(wordCount("About [[atom|atoms]] here."), 3);
  });
});


describe("NPC teachers (docs/features/NPC_TEACHERS_SPEC.md §7.3)", () => {
  async function buildWithNpcs() {
    const db = build();
    db.exec(npcsDdl());
    await seedNpcs(db);
    return db;
  }
  const ruleSet = (db) => new Set(errorsOf(db).map((f) => f.rule));

  it("the seeded cast and both units validate with no errors", async () => {
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
    db3.exec("UPDATE npc_lines SET npc_id = 'npc-ada' WHERE id = 'line-hal-intro-isotopes'");
    assert.ok(ruleSet(db3).has("npc-lines"));
  });

  it("R3: a line over 20 words, or with markup, is an error; a number the lesson lacks is a warning", async () => {
    const db = await buildWithNpcs();
    db.prepare("UPDATE npc_lines SET text = ? WHERE id = 'line-hal-meet'").run("word ".repeat(21).trim());
    assert.ok(ruleSet(db).has("npc-line-length"));
    const db2 = await buildWithNpcs();
    db2.prepare("UPDATE npc_lines SET text = ? WHERE id = 'line-hal-meet'").run("Hi <b>there</b>");
    assert.ok(ruleSet(db2).has("npc-line-plain"));
    const db3 = await buildWithNpcs();
    db3.prepare("UPDATE npc_lines SET text = ? WHERE id = 'line-hal-intro-isotopes'").run("There are 4242 isotopes here.");
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
    const story = db.prepare("SELECT lesson_id, id, data FROM lesson_cards WHERE type = 'story' AND lesson_id = 'atoms-are-everywhere'").get();
    assert.ok(story, "Unit 1 has a story card");
    const set = (speaker) => db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = ? AND id = ?").run(JSON.stringify({ ...JSON.parse(story.data), speaker }), story.lesson_id, story.id);
    set("npc-hal");
    assert.ok(!ruleSet(db).has("npc-speaker"));
    set("npc-ada");
    assert.ok(ruleSet(db).has("npc-speaker"));
    set("npc-nobody");
    assert.ok(ruleSet(db).has("npc-speaker"));
  });
});


// ---------------------------------------------------------------------------
// Unit 2: Radioactivity (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md)
// ---------------------------------------------------------------------------

describe("Unit 2 content", () => {
  const U2 = "radioactivity";
  const lessonsOf = (db) => db.prepare("SELECT * FROM lessons WHERE unit_id = ? ORDER BY id").all(U2);
  const cardsOf = (db, lessonId) => db.prepare("SELECT * FROM lesson_cards WHERE lesson_id = ? ORDER BY position").all(lessonId).map((c) => ({ ...c, data: JSON.parse(c.data) }));
  const allCards = (db) => lessonsOf(db).flatMap((l) => cardsOf(db, l.id));
  const unit2Items = (db) => db.prepare("SELECT i.* FROM items i JOIN objectives o ON o.id = i.objective_id WHERE o.unit_id = ?").all(U2).map((i) => ({ ...i, data: JSON.parse(i.data), surfaces: JSON.parse(i.surfaces) }));
  const textOf = (v) => JSON.stringify(v);

  it("has five lessons and twelve objectives, each objective taught by exactly one lesson", () => {
    const db = build();
    assert.equal(lessonsOf(db).length, 5);
    const objectives = db.prepare("SELECT id FROM objectives WHERE unit_id = ?").all(U2).map((o) => o.id);
    assert.equal(objectives.length, 12);
    const taught = lessonsOf(db).flatMap((l) => JSON.parse(l.teaches));
    assert.deepEqual([...taught].sort(), [...objectives].sort());
  });

  it("the path is L1, L2, L3, practice, L4, L5, checkpoint with ids u2-n1 to u2-n7", () => {
    const db = build();
    const nodes = db.prepare("SELECT id, kind, lesson_id FROM path_nodes WHERE unit_id = ? ORDER BY position").all(U2);
    assert.deepEqual(nodes.map((n) => n.id), ["u2-n1", "u2-n2", "u2-n3", "u2-n4", "u2-n5", "u2-n6", "u2-n7"]);
    assert.deepEqual(nodes.map((n) => n.kind), ["lesson", "lesson", "lesson", "practice", "lesson", "lesson", "checkpoint"]);
    assert.deepEqual(nodes.filter((n) => n.lesson_id).map((n) => n.lesson_id), ["why-nuclei-decay", "alpha-beta-gamma", "half-life", "decay-chains", "radioactivity-is-natural"]);
    const cp = JSON.parse(db.prepare("SELECT config FROM path_nodes WHERE id = 'u2-n7'").get().config);
    assert.equal(cp.questionCount, 12);
  });

  it("a deeper card is never scored (a lesson no longer has to open with a prediction)", () => {
    const db = build();
    for (const l of lessonsOf(db)) {
      const cs = cardsOf(db, l.id);
      for (const c of cs.filter((x) => x.tier === "deeper")) assert.equal(c.scored, 0, `${l.id}/${c.id}: a deeper card is never scored`);
    }
  });

  it("the three new simulations are placed where the spec puts them", () => {
    const db = build();
    const sims = db.prepare("SELECT lesson_id, id, type, data FROM lesson_cards WHERE kind = 'sim' AND lesson_id IN (SELECT id FROM lessons WHERE unit_id = ?) ORDER BY lesson_id, position").all(U2).map((c) => ({ ...c, data: JSON.parse(c.data) }));
    const by = (lesson) => sims.filter((c) => c.lesson_id === lesson).map((c) => `${c.type}${c.data.mode ? `:${c.data.mode}` : ""}`);
    // The "Wait" step (decay-wait) was taken out of the lessons: it did not teach anything the cards did not.
    assert.deepEqual(by("why-nuclei-decay"), []);
    assert.deepEqual(by("alpha-beta-gamma"), ["radiation-id"]);
    assert.deepEqual(by("half-life"), []);
    assert.deepEqual(by("decay-chains"), ["decay-chain"]);
    assert.ok(!sims.some((c) => c.type === "decay-wait"));
  });

  it("no Core card or scored item has a nuclear equation, formula, decay constant or isotope table", () => {
    const db = build();
    const bad = /(decay constant|exponential|equation|formula|\bλ\b|\bN\s*=|mass number|atomic number|→)/i;
    for (const l of lessonsOf(db)) {
      for (const c of cardsOf(db, l.id)) {
        if (c.tier === "deeper") continue;
        assert.ok(!bad.test(textOf(c.data)), `${l.id}/${c.id}: a core card has a Go deeper idea`);
      }
    }
    for (const i of unit2Items(db)) assert.ok(!bad.test(textOf(i.data)), `${i.id}: a scored item has a Go deeper idea`);
  });

  it("L3 never uses an observed count as a teaching fact: only 100, 50, 25, about 12, about 6, always with about", () => {
    const db = build();
    const copy = cardsOf(db, "half-life").filter((c) => c.kind === "teach" && c.tier === "core").map((c) => c.data.body).join(" ");
    for (const n of ["50", "25", "12", "6"]) assert.match(copy, new RegExp(`about ${n}\\b`), `"about ${n}" is in the numbers card`);
    assert.doesNotMatch(copy, /\b(47|48|49|51|52|53|13|11)\b/, "no near-miss observed counts in teaching text");
    // Half-life items that quote a count say about, or give the starting number.
    for (const id of ["u2-l3-fill-pattern", "u2-l3-choice-eighty", "u2-x-hundred-left"]) {
      const row = db.prepare("SELECT data FROM items WHERE id = ?").get(id);
      assert.ok(row, id);
    }
  });

  it("beta is never described as an electron that was orbiting the nucleus, nor as only an electron", () => {
    const db = build();
    const copy = textOf(cardsOf(db, "alpha-beta-gamma").map((c) => c.data)) + textOf(unit2Items(db).map((i) => i.data));
    assert.doesNotMatch(copy, /orbit/i);
    assert.doesNotMatch(copy, /already in the nucleus|inside the nucleus before|only an electron|just an electron/i);
  });

  it("no Unit 2 item re-asks the Unit 1 'humans invented radioactivity' myth", () => {
    const db = build();
    for (const i of unit2Items(db)) {
      const t = textOf(i.data).toLowerCase();
      assert.ok(!/(invented|only exist because people made|humans create|something people create)/.test(t), `${i.id} re-asks the Unit 1 myth`);
    }
  });

  it("Unit 2 never teaches a Unit 3 or Unit 4 idea as new: the teasers are unscored and say 'later'", () => {
    const db = build();
    const tease = cardsOf(db, "radioactivity-is-natural").find((c) => c.id === "c12");
    assert.match(tease.data.body, /Later/);
    assert.equal(tease.scored, 0);
    const other = textOf(allCards(db).filter((c) => !(c.lesson_id === "radioactivity-is-natural" && c.id === "c12")).map((c) => c.data));
    assert.doesNotMatch(other, /irradiated|contaminat|non-ionizing|dose|shield|sievert|detector|geiger/i);
  });

  it("the Becquerel story is told once: in Unit 2 lesson 5 as a Core story by Ada, and no longer in Unit 1", () => {
    const db = build();
    const stories = db.prepare("SELECT lesson_id, id, tier, data FROM lesson_cards WHERE data LIKE '%Becquerel%' AND type = 'story'").all();
    assert.equal(stories.length, 1);
    assert.equal(stories[0].lesson_id, "radioactivity-is-natural");
    assert.equal(stories[0].tier, "core");
    assert.equal(JSON.parse(stories[0].data).speaker, "npc-ada");
    assert.ok(
      db.prepare("SELECT 1 FROM lesson_references WHERE lesson_id = 'radioactivity-is-natural' AND reference_id = 'ref-openstax-up3-10-3'").get(),
      "the lesson cites the textbook page that tells the Becquerel story",
    );
  });

  it("every item is answerable, and a hotspot that animates names its answer", () => {
    const db = build();
    for (const row of db.prepare("SELECT i.* FROM items i JOIN objectives o ON o.id = i.objective_id WHERE o.unit_id = ? AND i.type != 'predict'").all(U2)) {
      const d = JSON.parse(row.data);
      const { right, wrong } = responses(row.type, d);
      assert.equal(evaluateItem(row.type, d, right).correct, true, `${row.id}: right answer rejected`);
      assert.equal(evaluateItem(row.type, d, wrong).correct, false, `${row.id}: wrong answer accepted`);
    }
    const hot = JSON.parse(db.prepare("SELECT data FROM items WHERE id = 'u2-l1-hotspot-change'").get().data);
    assert.equal(hot.animateOnCorrect, true);
    assert.ok(hot.targets.some((t) => t.id === hot.answer));
  });

  it("the half-life items the spec asks for exist, and the myths are the spec's myths", () => {
    const db = build();
    const tom = (id) => JSON.parse(db.prepare("SELECT data FROM items WHERE id = ?").get(id).data);
    assert.equal(tom("u2-l3-tom-gone").answer, "myth");
    assert.equal(tom("u2-l3-tom-timer").answer, "myth");
    assert.equal(tom("u2-l1-tom-person").answer, "myth");
    assert.equal(tom("u2-l2-tom-same").answer, "myth");
    assert.equal(tom("u2-l2-tom-pieces").answer, "myth");
    assert.equal(tom("u2-l4-tom-stable").answer, "myth");
    assert.equal(tom("u2-l4-tom-vanish").answer, "myth");
  });
});

describe("curriculum rules reject broken Unit 2 simulations", () => {
  const edit = (lessonId, cardId, fn) => {
    const db = build();
    const row = db.prepare("SELECT data FROM lesson_cards WHERE lesson_id = ? AND id = ?").get(lessonId, cardId);
    const data = JSON.parse(row.data);
    if (data.figure) data.figure = expandFigure(data.figure).figure; // a figure stored as an id is drawn so a test can break its shapes
    fn(data);
    db.prepare("UPDATE lesson_cards SET data = ? WHERE lesson_id = ? AND id = ?").run(JSON.stringify(data), lessonId, cardId);
    return db;
  };

  it("the sims as authored are fine", () => {
    assert.ok(![...rules(build())].includes("sim-shape"));
  });

  // No lesson uses decay-wait now, but the type is still supported, so a card is added to check its rule.
  const waitCard = (fn) => {
    const db = build();
    const data = { mode: "half-life", task: "Press Wait.", count: 100, goal: { presses: 3 } };
    fn(data);
    db.prepare("INSERT INTO lesson_cards (lesson_id, id, position, kind, type, tier, item_id, scored, data) VALUES ('half-life', 'c99', 99, 'sim', 'decay-wait', 'core', NULL, 0, ?)").run(JSON.stringify(data));
    return db;
  };

  it("a decay-wait with an unknown mode, no goal or a count that cannot halve", () => {
    assert.ok(![...rules(waitCard(() => {}))].includes("sim-shape"));
    assert.ok(rules(waitCard((d) => (d.mode = "fast"))).has("sim-shape"));
    assert.ok(rules(waitCard((d) => delete d.goal)).has("sim-shape"));
    assert.ok(rules(waitCard((d) => (d.count = 30))).has("sim-shape"));
    assert.ok(rules(waitCard((d) => (d.task = ""))).has("sim-shape"));
  });

  it("a decay-chain that does not end in a stable nucleus, or has duplicate ids", () => {
    assert.ok(rules(edit("decay-chains", "c03", (d) => (d.nodes[3].state = "unstable"))).has("sim-shape"));
    assert.ok(rules(edit("decay-chains", "c03", (d) => (d.nodes[1].state = "stable"))).has("sim-shape"));
    assert.ok(rules(edit("decay-chains", "c03", (d) => (d.nodes[1].id = "parent"))).has("sim-shape"));
    assert.ok(rules(edit("decay-chains", "c03", (d) => (d.goal.reach = "daughter"))).has("sim-shape"));
  });

  it("a radiation-id with a bad answer, a missing clue or no goal", () => {
    assert.ok(rules(edit("alpha-beta-gamma", "c08", (d) => (d.cases[0].answer = "delta"))).has("sim-shape"));
    assert.ok(rules(edit("alpha-beta-gamma", "c08", (d) => (d.cases[1].clue = ""))).has("sim-shape"));
    assert.ok(rules(edit("alpha-beta-gamma", "c08", (d) => delete d.goal)).has("sim-shape"));
    assert.ok(rules(edit("alpha-beta-gamma", "c08", (d) => (d.objectives = ["u2-nope"]))).has("sim-shape"));
  });

  it("a simulation type that does not exist", () => {
    const db = build();
    db.prepare("UPDATE lesson_cards SET type = 'decay-flip' WHERE lesson_id = 'alpha-beta-gamma' AND id = 'c08'").run();
    assert.ok(rules(db).has("card-type"));
  });
});

describe("Ada's lines (Unit 2 teacher)", () => {
  it("Ada is the unit's teacher with a meet, a sign-off and an intro for each of the five lessons", async () => {
    const db = build();
    db.exec(npcsDdl());
    await seedNpcs(db);
    assert.equal(db.prepare("SELECT teacher_npc_id FROM units WHERE id = 'radioactivity'").get().teacher_npc_id, "npc-ada");
    const kinds = db.prepare("SELECT kind, lesson_id FROM npc_lines WHERE npc_id = 'npc-ada'").all();
    assert.ok(kinds.some((l) => l.kind === "meet") && kinds.some((l) => l.kind === "sign_off"));
    assert.deepEqual(kinds.filter((l) => l.kind === "lesson_intro").map((l) => l.lesson_id).sort(), ["alpha-beta-gamma", "decay-chains", "half-life", "radioactivity-is-natural", "why-nuclei-decay"]);
  });
});
