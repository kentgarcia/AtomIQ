/**
 * Unit tests for the content rule engine (scripts/lib/content-rules.mjs).
 * No database needed — every case is a plain fixture string.
 *
 *   npm run test:content
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { DatabaseSync } from "node:sqlite";

import {
  checkOptions,
  checkPlaceholders,
  checkPunctuation,
  checkQuestion,
  checkStatement,
  checkStem,
  findConflictingDuplicates,
  normalize,
} from "./lib/content-rules.mjs";
import { validateFeed, validateFeedData } from "./lib/feed-rules.mjs";
import {
  BLOCK_TYPES,
  FEED_TEXT_MAX,
  FEED_TRIGGER_KEYS,
  TEMPLATE_TRIGGER_KEYS,
  blogWordCount,
  placeholdersIn,
  readingMinutes,
  renderFeedText,
} from "./lib/feed-vocab.mjs";

const rules = (findings) => findings.map((f) => f.rule);
const errorRules = (findings) => findings.filter((f) => f.severity === "error").map((f) => f.rule);
const stem = (text, kind = "multiple_choice", extra = {}) => checkStem(text, { kind, ...extra });

// ---------------------------------------------------------------------------
// Stems: fragments
// ---------------------------------------------------------------------------

test("fragment stems are flagged", () => {
  const fragments = [
    "Nuclear fusion involves:", // dangling colon, depends on options
    "Alpha particles can be stopped by:",
    "Safeguards primarily aim to:",
    "Compared to fission, fusion produces:",
    "and which particle has a positive charge?", // lowercase continuation
    "which particle has a positive charge?", // lowercase start
    "But what does a moderator do?", // continuation word
    "Because neutrons have no charge?",
    "What are the three principles of radiation protection...", // ellipsis
    "What does half-life measure -", // trailing dash
    "Which particle has a positive charge,", // trailing comma
    "Which particle has a positive charge", // no terminal punctuation
    "What does ALARA stand for in the", // truncated on article
  ];
  for (const text of fragments) {
    assert.ok(stem(text).some((f) => ["stem-fragment", "truncated", "not-a-question"].includes(f.rule) && f.severity === "error"), `expected fragment: ${text}`);
  }
});

test("complete questions and instructions pass", () => {
  const good = [
    "Which type of radiation can be stopped by a sheet of paper?",
    "What does ALARA stand for in radiation protection?",
    "Select the location with the highest natural radiation exposure.",
    "Choose the correct statement:", // imperative with colon is a complete instruction
    "Carbon-14 is used in carbon dating. Why does it work?", // antecedent in earlier sentence
    "If a radioactive isotope has a half-life of 5 years, what fraction remains after 15 years?",
    "In radiation safety, what is shielding?",
    "How do prompt neutrons differ from delayed neutrons?",
    "Who discovered radioactivity?",
  ];
  for (const text of good) {
    assert.deepEqual(errorRules(stem(text)), [], `expected clean: ${text}`);
  }
});

test("conditions without a question are flagged", () => {
  assert.ok(rules(stem("If half-life is 5 years, remaining after 15 years?")).includes("stem-fragment"));
});

test("shorthand like vs / w/ is flagged", () => {
  assert.ok(rules(stem("What is prompt vs delayed neutrons?")).includes("stem-fragment"));
  assert.ok(!rules(stem("How do prompt neutrons differ from delayed neutrons?")).includes("stem-fragment"));
});

test("too-short stems fail except for fill_blank", () => {
  assert.ok(rules(stem("Atomic number?")).includes("stem-too-short"));
  assert.ok(!rules(stem("What is ___?", "fill_blank")).includes("stem-too-short"));
});

test("true/false statements are judged without the 'True or False:' prefix", () => {
  assert.deepEqual(errorRules(stem("True or False: Distance reduces radiation exposure.", "true_false")), []);
  assert.ok(errorRules(stem("True or False: and it is safe.", "true_false")).includes("stem-fragment"));
  assert.deepEqual(errorRules(stem("Smoke detectors often use a tiny radioactive source to sense smoke.", "true_false")), []);
});

// ---------------------------------------------------------------------------
// Stems: missing subject / context
// ---------------------------------------------------------------------------

test("stems with no subject are flagged as missing context", () => {
  for (const text of ["Which of these?", "What about it?", "Which of the following is correct?", "Which statement is true?", "What is this?"]) {
    assert.ok(rules(stem(text)).includes("missing-context"), `expected missing-context: ${text}`);
  }
});

test("pronoun-only stems are flagged, antecedent-bearing stems are not", () => {
  assert.ok(rules(stem("It decays slowly, so why is that important?")).includes("missing-context"));
  assert.ok(rules(stem("Why does it work?")).includes("missing-context"));
  assert.ok(!rules(stem("Carbon-14 is used in dating. Why does it work?")).includes("missing-context"));
  assert.ok(!rules(stem("Which of these materials is best for shielding gamma radiation?")).includes("missing-context"));
  assert.ok(!rules(stem("Which of these is a natural source of radiation?")).includes("missing-context"));
});

test("references to a previous step or an absent visual are flagged", () => {
  for (const text of [
    "Based on what you just learned, why is lead used?",
    "In the previous question, which particle was positive?",
    "Which element is shown in the diagram above?",
    "Look at the image and identify the decay type.",
    "What does the chart below show about half-life?",
  ]) {
    assert.ok(
      rules(stem(text)).some((r) => r === "depends-on-previous-step" || r === "missing-visual"),
      `expected context-reference flag: ${text}`,
    );
  }
  // With a visual attached, a diagram reference is fine.
  assert.ok(!rules(stem("Which element is shown in the diagram above?", "multiple_choice", { hasVisual: true })).includes("missing-visual"));
});

// ---------------------------------------------------------------------------
// Placeholders and punctuation
// ---------------------------------------------------------------------------

test("placeholders are flagged", () => {
  const bad = [
    "TODO write this question",
    "TBD",
    "Lorem ipsum dolor sit amet",
    "What is {{element}} used for?",
    "What is [ ] used for?",
    "[insert name] discovered radioactivity",
    "The value is undefined",
    "N/A",
    "[object Object]",
    "null",
  ];
  for (const text of bad) {
    assert.ok(checkPlaceholders(text, "q").length > 0, `expected placeholder: ${text}`);
  }
});

test("blank underscores only allowed in fill_blank", () => {
  assert.ok(checkPlaceholders("The nucleus contains ___ and neutrons.", "q").length > 0);
  assert.equal(checkPlaceholders("The nucleus contains ___ and neutrons.", "q", { allowBlank: true }).length, 0);
  assert.equal(checkPlaceholders("Normal healthy text about null hypotheses is fine.", "q").length, 0);
});

test("dangling and unbalanced punctuation is flagged", () => {
  const bad = ["What is this (maybe?", "What is the \"nucleus?", "What is a nucleus,?", ", what is a nucleus?", "What is a nucleus ?", "What??"];
  for (const text of bad) {
    assert.ok(checkPunctuation(text, "q").length > 0, `expected punctuation flag: ${text}`);
  }
  for (const text of ["What does “stable nucleus” mean?", "Which isotope (Carbon-14) is used for dating?"]) {
    assert.equal(checkPunctuation(text, "q").length, 0, `expected clean: ${text}`);
  }
});

// ---------------------------------------------------------------------------
// Options and answers
// ---------------------------------------------------------------------------

test("option shape problems are flagged", () => {
  assert.ok(rules(checkOptions(["Only one"], "Which one?", { kind: "multiple_choice" })).includes("options-shape"));
  assert.ok(rules(checkOptions(["Alpha", "alpha."], "Which one?", { kind: "multiple_choice" })).includes("duplicate-option"));
  assert.ok(rules(checkOptions(["Alpha", "  "], "Which one?", { kind: "multiple_choice" })).includes("empty-option"));
  assert.ok(rules(checkOptions(["A. Alpha", "B. Beta"], "Which one?", { kind: "multiple_choice" })).includes("option-letter-prefix"));
  assert.ok(rules(checkOptions(["Gamma", "Beta"], "Gamma", { kind: "multiple_choice" })).includes("question-equals-option"));
  assert.ok(rules(checkOptions(["Alpha", "Beta..."], "Which one?", { kind: "multiple_choice" })).includes("truncated"));
});

test("position-dependent options: errors when shuffled, warnings otherwise", () => {
  const shuffled = checkOptions(["Heat", "Steam", "Both B and C"], "Why?", { kind: "multiple_choice", shuffled: true });
  assert.ok(errorRules(shuffled).includes("position-dependent-option"));
  const lettered = checkOptions(["Heat", "Steam", "Both B and C"], "Why?", { kind: "multiple_choice", shuffled: false });
  assert.ok(errorRules(lettered).includes("position-dependent-option")); // letter refs always error
  const allAbove = (shuffledFlag) => checkOptions(["Heat", "Steam", "All of the above"], "Why?", { kind: "multiple_choice", shuffled: shuffledFlag });
  assert.ok(errorRules(allAbove(true)).includes("position-dependent-option"));
  assert.deepEqual(errorRules(allAbove(false)), []);
  assert.ok(allAbove(false).some((f) => f.severity === "warn"));
  // The recommended wording is accepted.
  assert.deepEqual(errorRules(checkOptions(["Heat", "Steam", "All of these"], "Why?", { kind: "multiple_choice", shuffled: true })), []);
});

test("answer index, type and true/false shape", () => {
  const mc = (correct) => checkQuestion({ kind: "multiple_choice", text: "Which particle is positively charged?", options: ["Electron", "Proton", "Neutron"], correct, explanation: "Protons carry a positive electric charge." });
  assert.deepEqual(errorRules(mc(1)), []);
  assert.ok(errorRules(mc(3)).includes("answer-range"));
  assert.ok(errorRules(mc(-1)).includes("answer-range"));
  assert.ok(errorRules(mc("1")).includes("answer-type"));
  assert.ok(errorRules(mc(true)).includes("answer-type"));

  const tf = (options, correct) => checkQuestion({ kind: "true_false", text: "True or False: Distance reduces radiation exposure.", options, correct, explanation: "True! Intensity falls with distance." });
  assert.deepEqual(errorRules(tf(["True", "False"], 0)), []);
  assert.deepEqual(errorRules(tf(["True", "False"], true)), []);
  assert.ok(errorRules(tf(["Yes", "No"], 0)).includes("true-false-shape"));
  assert.ok(errorRules(tf(["True", "False", "Maybe"], 0)).includes("true-false-shape"));
  assert.ok(errorRules(tf(["True", "False"], 2)).includes("answer-type"));
});

test("lab answers must reference an option id", () => {
  const lab = (correct) =>
    checkQuestion({
      kind: "lab",
      text: "Select the most effective shield against gamma radiation.",
      textField: "task",
      options: [{ id: "paper", label: "Paper" }, { id: "lead", label: "Lead" }],
      correct,
      explanation: "Lead is dense, so it absorbs gamma rays well.",
    });
  assert.deepEqual(errorRules(lab("lead")), []);
  assert.ok(errorRules(lab("steel")).includes("answer-range"));
});

test("a 'name one' stem cannot offer an 'All of these' option", () => {
  const f = checkQuestion({
    kind: "multiple_choice",
    text: "Name one application of radioactive decay in medicine.",
    options: ["PET scans", "Sterilization", "All of these"],
    correct: 2,
    explanation: "Radioactivity has many medical applications, including both.",
  });
  assert.ok(rules(f).includes("stem-option-mismatch"));
});

// ---------------------------------------------------------------------------
// Explanations
// ---------------------------------------------------------------------------

test("explanations that only restate the answer are flagged", () => {
  const base = { kind: "multiple_choice", text: "What is a radionuclide?", options: ["Stable atom", "Radioactive atom"], correct: 1 };
  assert.ok(rules(checkQuestion({ ...base, explanation: "Correct answer: Radioactive atom." })).includes("explanation-restates-answer"));
  assert.ok(rules(checkQuestion({ ...base, explanation: "Radioactive atom." })).includes("explanation-restates-answer"));
  assert.deepEqual(errorRules(checkQuestion({ ...base, explanation: "A radionuclide is an unstable atom whose nucleus decays and emits radiation." })), []);
});

test("missing explanations are flagged", () => {
  const f = checkQuestion({ kind: "multiple_choice", text: "What is a radionuclide?", options: ["A", "B"], correct: 1, explanation: "" });
  assert.ok(rules(f).includes("explanation-missing"));
});

test("explanation polarity must match a true/false answer", () => {
  const q = (correct, explanation) => checkQuestion({ kind: "true_false", text: "True or False: Gamma decay changes the element.", options: ["True", "False"], correct, explanation });
  assert.deepEqual(errorRules(q(1, "False! Gamma decay only releases energy and leaves the element unchanged.")), []);
  assert.ok(errorRules(q(0, "False! Gamma decay only releases energy and leaves the element unchanged.")).includes("explanation-contradicts-answer"));
  assert.ok(errorRules(q(1, "True! Gamma decay changes the element completely each time.")).includes("explanation-contradicts-answer"));
});

test("truncated explanations are flagged", () => {
  const f = checkQuestion({ kind: "multiple_choice", text: "What is a radionuclide?", options: ["A", "B"], correct: 1, explanation: "A radionuclide is an unstable atom that emits..." });
  assert.ok(rules(f).includes("truncated"));
});

// ---------------------------------------------------------------------------
// Other surfaces
// ---------------------------------------------------------------------------

test("scramble questions only need a valid answer and no placeholders", () => {
  assert.deepEqual(rules(checkQuestion({ kind: "scramble", text: "The center of an atom:", correct: "NUCLEUS" })), []);
  assert.ok(rules(checkQuestion({ kind: "scramble", text: "The center of an atom:", correct: "NU CLEUS" })).includes("answer-type"));
  assert.ok(rules(checkQuestion({ kind: "scramble", text: "TODO clue", correct: "NUCLEUS" })).includes("placeholder"));
});

test("myth/fact statements are judged as claims", () => {
  assert.deepEqual(errorRules(checkStatement("Nuclear power plants can explode like nuclear bombs", "myth")), []);
  assert.deepEqual(errorRules(checkStatement("While high doses are harmful, controlled use of isotopes is safe", "reality")), []);
  assert.ok(errorRules(checkStatement("and it is dangerous", "myth")).includes("stem-fragment"));
  assert.ok(errorRules(checkStatement("Radiation is...", "myth")).includes("truncated"));
  assert.ok(errorRules(checkStatement("TODO", "myth")).length > 0);
});

test("contradicting duplicates across pools are detected", () => {
  const a = { id: "a", text: "What makes an isotope unstable?", options: ["Too many electrons", "Imbalanced ratio"], correct: 1 };
  const same = { id: "b", text: "What makes an isotope unstable?", options: ["Imbalanced ratio", "Too many protons"], correct: 0 };
  const reworded = { id: "c", text: "What makes an isotope unstable?", options: ["Wrong neutron count", "Too many electrons"], correct: 0 };
  const contradiction = { id: "d", text: "What makes an isotope unstable?", options: ["Imbalanced ratio", "Too many electrons"], correct: 1 };
  assert.equal(findConflictingDuplicates([a, same, reworded]).length, 0);
  assert.ok(findConflictingDuplicates([a, contradiction]).length > 0);
});

test("normalize strips punctuation and case", () => {
  assert.equal(normalize("  “Half-Life”, now!  "), "half life now");
});

// ---------------------------------------------------------------------------
// NPC feed and mini blog (docs/NPC_FEED_SPEC.md §6): scripts/lib/feed-rules.mjs, feed-vocab.mjs
// ---------------------------------------------------------------------------

const NPC_IDS = ["npc-ada", "npc-hal", "npc-ray", "npc-mina", "npc-kofi", "npc-tess"];
const words = (n) => `${Array(n).fill("atom").join(" ")}.`;
const piece = (n) => [{ t: "p", text: words(n) }, { t: "next", label: "Keep going", lessonId: "l1" }];

const goodTemplate = (over = {}) => ({
  id: "ft-test",
  npc_id: "npc-ada",
  poster_pool: [],
  kind: "celebrate",
  trigger: "lesson_complete",
  condition: { unitId: "u1" },
  text: "You finished “{lesson}”. Well done.",
  chip: "lesson",
  reactors: [],
  weight: 1,
  ...over,
});

const COVERAGE_CONDITION = {
  lesson_complete: { unitId: "u1" },
  checkpoint_pass: { unitId: "u1" },
  unit_complete: { unitId: "u1" },
  testout_pass: { unitId: "u1" },
  streak: { days: 3 },
  chest_opened: {},
  first_lesson: {},
  comeback: {},
  daily_quests_done: {},
  rank_change: {},
};

/** One valid template for every template trigger: the coverage rules pass on this set. */
const coverage = () =>
  TEMPLATE_TRIGGER_KEYS.map((trigger) => goodTemplate({ id: `ft-${trigger}`, trigger, condition: COVERAGE_CONDITION[trigger], text: "A short valid line.", chip: null }));

const goodPost = (over = {}) => ({
  id: "b1",
  npc_id: "npc-ada",
  unit_id: "u1",
  lesson_id: "l1",
  position: 0,
  title: "The smallest thing",
  hook: "You have never seen one.",
  cover: "atom",
  read_min: readingMinutes(140),
  unlock: { trigger: "none" },
  blocks: piece(140),
  reactors: [],
  ...over,
});
const goodComment = (over = {}) => ({ id: "c1", blog_id: "b1", npc_id: "npc-hal", position: 0, text: "Plain words: a small extra detail.", chip: null, ...over });

const feedData = ({ extraUnits = [], ...over } = {}) => ({
  units: [{ id: "u1" }, ...extraUnits],
  lessons: [{ id: "l1", unit_id: "u1" }, { id: "l2", unit_id: "u1" }, { id: "x1", unit_id: "u2" }],
  npcs: NPC_IDS.map((id) => ({ id })),
  references: [{ id: "r-ok", verified: 1 }, { id: "r-open", verified: 0 }],
  entryIds: ["atom"],
  templates: coverage(),
  posts: [goodPost(), goodPost({ id: "b2", position: 1, unlock: { trigger: "unit_complete", unitId: "u1" } })],
  comments: [],
  blogRefs: [{ blog_id: "b1", reference_id: "r-ok" }, { blog_id: "b2", reference_id: "r-ok" }],
  ...over,
});

/** Rules fired at a severity; `only` limits findings to one table. */
const feedRules = (data, severity = "error", opts) =>
  validateFeedData(data, opts).findings.filter((f) => f.severity === severity).map((f) => f.rule);
/** The valid set with one template swapped in for the one that covers the same trigger. */
const withTemplate = (over) => feedData({ templates: [...coverage().filter((t) => t.trigger !== (over.trigger ?? "lesson_complete")), goodTemplate(over)] });
/** The valid set with one blog piece (and its source) swapped in; coverage hints are warnings, so they are ignored here. */
const withPost = (over, extra = {}) => feedData({ posts: [goodPost(over)], blogRefs: [{ blog_id: "b1", reference_id: "r-ok" }], ...extra });

test("feed: a complete, valid set has no findings", () => {
  const r = validateFeedData(feedData());
  assert.deepEqual(r.findings, []);
  assert.deepEqual(r.checked, { feed_templates: coverage().length, blog_posts: 2, blog_comments: 0 });
});

test("feed vocab: the §5.1 triggers, the §6 block types and the placeholder helpers", () => {
  assert.deepEqual(FEED_TRIGGER_KEYS, ["lesson_complete", "checkpoint_pass", "unit_complete", "testout_pass", "streak", "chest_opened", "first_lesson", "comeback", "daily_quests_done", "blog_unlocked", "rank_change"]);
  assert.ok(!TEMPLATE_TRIGGER_KEYS.includes("blog_unlocked"));
  assert.deepEqual(BLOCK_TYPES, ["p", "h", "quote", "fact", "figure", "list", "next"]);
  assert.deepEqual(placeholdersIn("Hi {name}, {lesson} and {name}"), ["name", "lesson", "name"]);
  assert.equal(renderFeedText("{rival} passed {name}", { rival: "Mina", name: "Alex" }), "Mina passed Alex");
  assert.throws(() => renderFeedText("Hello {bogus}", { bogus: "x" }), /unknown placeholder/);
  assert.throws(() => renderFeedText("Hello {rival}", {}), /no value for \{rival\}/);
});

test("feed vocab: word count covers p, quote, fact and list only; reading time is ceil(words / 200)", () => {
  const blocks = [
    { t: "p", text: "one two three" },
    { t: "h", text: "not counted at all" },
    { t: "quote", text: "four five" },
    { t: "fact", text: "six" },
    { t: "figure", ref: "atom", caption: "not counted either" },
    { t: "list", items: ["seven eight", "nine"] },
    { t: "next", label: "not counted", lessonId: "l1" },
  ];
  assert.equal(blogWordCount(blocks), 9);
  assert.deepEqual([0, 1, 200, 201, 350].map(readingMinutes), [1, 1, 1, 2, 2]);
});

test("feed templates: trigger keys", () => {
  assert.deepEqual(feedRules(withTemplate({ trigger: "lesson_complete" })), []);
  assert.ok(feedRules(withTemplate({ trigger: "daily_login" })).includes("feed-trigger"));
  assert.ok(feedRules(withTemplate({ trigger: "blog_unlocked", condition: { blogId: "b1" }, text: "A piece.", chip: null })).includes("feed-trigger"));
});

test("feed templates: condition fields and values", () => {
  const ok = (trigger, condition) => feedRules(withTemplate({ trigger, condition, text: "A short line.", chip: null }));
  assert.deepEqual(ok("lesson_complete", { unitId: "u1", lessonId: "l1", perfect: true }), []);
  assert.deepEqual(ok("streak", { days: 14 }), []);
  assert.deepEqual(ok("chest_opened", { period: "weekly" }), []);
  assert.deepEqual(ok("comeback", { minDays: 3 }), []);
  assert.deepEqual(ok("rank_change", { direction: "passed_by", npcId: "npc-ray" }), []);
  assert.ok(ok("lesson_complete", { unitId: "u1", color: "red" }).includes("feed-condition"), "unknown field");
  assert.ok(ok("lesson_complete", {}).includes("feed-condition"), "unitId is required");
  assert.ok(ok("lesson_complete", { unitId: "nope" }).includes("feed-condition"), "unit must exist");
  assert.ok(ok("lesson_complete", { unitId: "u1", lessonId: "x1" }).includes("feed-condition"), "lesson must be in the unit");
  assert.ok(ok("lesson_complete", { unitId: "u1", perfect: "yes" }).includes("feed-condition"));
  assert.ok(ok("streak", { days: 5 }).includes("feed-condition"), "only 3, 7, 14, 30, 60, 100");
  assert.ok(ok("streak", {}).includes("feed-condition"), "days is required");
  assert.ok(ok("chest_opened", { period: "monthly" }).includes("feed-condition"));
  assert.ok(ok("comeback", { minDays: 2 }).includes("feed-condition"));
  assert.ok(ok("rank_change", { direction: "sideways" }).includes("feed-condition"));
  assert.ok(ok("rank_change", { npcId: "npc-nobody" }).includes("feed-condition"));
  assert.ok(feedRules(withTemplate({ condition: "not an object" })).includes("feed-condition"));
});

test("feed templates: placeholders only the trigger supplies", () => {
  const t = (trigger, text, condition = { unitId: "u1" }) => feedRules(withTemplate({ trigger, text, condition, chip: null }));
  assert.deepEqual(t("lesson_complete", "Done: {lesson} in {unit}, {name}."), []);
  assert.ok(t("lesson_complete", "{rival} passed you.").includes("feed-placeholder"));
  assert.ok(t("lesson_complete", "{days} days.").includes("feed-placeholder"));
  assert.ok(t("rank_change", "{lesson} is done.", {}).includes("feed-placeholder"));
  assert.deepEqual(t("rank_change", "{rival} passed {name}.", {}), []);
  assert.ok(t("streak", "{unit} again.", { days: 3 }).includes("feed-placeholder"));
  assert.ok(t("lesson_complete", "Done: {lesson.").includes("feed-placeholder"), "unbalanced brace");
});

test("feed templates: text length and exclamation runs", () => {
  const t = (text) => feedRules(withTemplate({ text, chip: null }));
  assert.deepEqual(t("a".repeat(FEED_TEXT_MAX)), []);
  assert.ok(t("a".repeat(FEED_TEXT_MAX + 1)).includes("feed-text"));
  assert.ok(t("").includes("feed-text"));
  assert.deepEqual(t("Well done!"), []);
  assert.ok(t("Well done!!").includes("feed-text"));
  assert.ok(t("Yes! Great! Done!").includes("feed-text"), "three exclamation marks read as shouting");
});

test("feed templates: chips depend on the trigger", () => {
  assert.deepEqual(feedRules(withTemplate({ chip: "lesson" })), []);
  assert.deepEqual(feedRules(withTemplate({ chip: null })), []);
  assert.ok(feedRules(withTemplate({ chip: "ranks" })).includes("feed-chip"), "a lesson post cannot open the ranking");
  assert.ok(feedRules(withTemplate({ chip: "phone" })).includes("feed-chip"));
});

test("feed templates: poster, pool and reactors must be NPCs", () => {
  assert.deepEqual(feedRules(withTemplate({ npc_id: null, poster_pool: ["npc-ray", "npc-mina"] })), []);
  assert.ok(feedRules(withTemplate({ npc_id: null, poster_pool: [] })).includes("feed-poster"), "needs a poster or a pool");
  assert.ok(feedRules(withTemplate({ npc_id: "npc-nobody" })).includes("feed-poster"));
  assert.ok(!feedRules(withTemplate({ npc_id: null, poster_pool: ["learner"] })).includes("feed-poster"), "the learner's own voice is a valid poster");
  assert.ok(feedRules(withTemplate({ npc_id: null, poster_pool: ["learner", "npc-ada"] })).includes("feed-poster"), "the learner cannot share a pool");
  assert.ok(feedRules(withTemplate({ npc_id: null, poster_pool: ["npc-nobody"] })).includes("feed-poster"));
  assert.deepEqual(feedRules(withTemplate({ reactors: ["npc-hal"] })), []);
  assert.ok(feedRules(withTemplate({ reactors: ["npc-nobody"] })).includes("feed-reactors"));
  assert.ok(feedRules(withTemplate({ reactors: ["npc-ada"] })).includes("feed-reactors"), "the poster cannot react to its own post");
});

test("feed templates: kind and weight", () => {
  assert.ok(feedRules(withTemplate({ kind: "gossip" })).includes("feed-kind"));
  assert.ok(feedRules(withTemplate({ weight: 0 })).includes("feed-weight"));
  assert.ok(feedRules(withTemplate({ weight: 1.5 })).includes("feed-weight"));
  assert.deepEqual(feedRules(withTemplate({ kind: "tease", weight: 3 })), []);
});

test("feed coverage: every unit has lesson_complete and unit_complete, every trigger has a template", () => {
  assert.deepEqual(feedRules(feedData()), []);
  const second = feedData({ extraUnits: [{ id: "u2" }] });
  const gaps = validateFeedData(second).findings.filter((f) => f.rule === "feed-coverage");
  assert.deepEqual(gaps.map((f) => `${f.table}:${f.id}`).sort(), ["units:u2", "units:u2"]);
  for (const trigger of TEMPLATE_TRIGGER_KEYS) {
    const missing = feedData({ templates: coverage().filter((t) => t.trigger !== trigger) });
    const found = validateFeedData(missing).findings.filter((f) => f.rule === "feed-coverage");
    assert.ok(found.some((f) => f.field === "trigger" || f.table === "units"), `${trigger} has no template`);
  }
  // blog_unlocked needs none.
  assert.ok(!feedRules(feedData()).includes("feed-coverage"));
});

test("blog: word count 120 to 350 over p, quote, fact and list blocks", () => {
  const at = (n, extra = []) => withPost({ blocks: [...piece(n).slice(0, -1), ...extra, piece(n).at(-1)], read_min: readingMinutes(n) });
  assert.deepEqual(feedRules(at(120)), []);
  assert.deepEqual(feedRules(at(350)), []);
  assert.ok(feedRules(at(119)).includes("blog-words"));
  assert.ok(feedRules(at(351)).includes("blog-words"));
  // headings, captions and the next label are not counted
  assert.ok(feedRules(at(100, [{ t: "h", text: words(80) }])).includes("blog-words"));
  assert.deepEqual(feedRules(at(100, [{ t: "list", items: [words(20), words(5)] }])), []);
});

test("blog: read_min is computed from the words", () => {
  assert.deepEqual(feedRules(withPost({ blocks: piece(250), read_min: 2 })), []);
  assert.ok(feedRules(withPost({ blocks: piece(250), read_min: 1 })).includes("blog-read-min"));
  assert.ok(feedRules(withPost({ read_min: "2 min" })).includes("blog-read-min"));
});

test("blog: hook up to 120 characters, title and author", () => {
  assert.deepEqual(feedRules(withPost({ hook: "h".repeat(120) })), []);
  assert.ok(feedRules(withPost({ hook: "h".repeat(121) })).includes("blog-hook"));
  assert.ok(feedRules(withPost({ hook: "" })).includes("blog-hook"));
  assert.ok(feedRules(withPost({ title: "" })).includes("blog-meta"));
  assert.ok(feedRules(withPost({ npc_id: "npc-nobody" })).includes("blog-meta"));
});

test("blog: the cover must be a picture in the lesson art", () => {
  assert.deepEqual(feedRules(withPost({ cover: "banana" })), []);
  assert.ok(feedRules(withPost({ cover: "unicorn" })).includes("blog-cover"));
});

test("blog: unlock points at a real lesson or unit", () => {
  assert.deepEqual(feedRules(withPost({ unlock: { trigger: "lesson_complete", lessonId: "l2" } })), []);
  assert.deepEqual(feedRules(withPost({ unlock: { trigger: "unit_complete", unitId: "u1" } })), []);
  assert.deepEqual(feedRules(withPost({ unlock: { trigger: "streak", days: 7 } })), []);
  assert.ok(feedRules(withPost({ unlock: { trigger: "lesson_complete", lessonId: "nope" } })).includes("blog-unlock"));
  assert.ok(feedRules(withPost({ unlock: { trigger: "unit_complete", unitId: "nope" } })).includes("blog-unlock"));
  assert.ok(feedRules(withPost({ unlock: { trigger: "streak", days: 5 } })).includes("blog-unlock"));
  assert.ok(feedRules(withPost({ unlock: { trigger: "chest_opened" } })).includes("blog-unlock"));
  assert.ok(feedRules(withPost({ unlock: null })).includes("blog-unlock"));
});

test("blog: closes with exactly one next block that points at a lesson or unit", () => {
  const body = piece(140).slice(0, -1);
  assert.deepEqual(feedRules(withPost({ blocks: [...body, { t: "next", label: "Go", unitId: "u1" }] })), []);
  assert.ok(feedRules(withPost({ blocks: body })).includes("blog-next"), "no closing block");
  assert.ok(feedRules(withPost({ blocks: [{ t: "next", label: "Go", lessonId: "l1" }, ...body] })).includes("blog-next"), "next must be last");
  assert.ok(feedRules(withPost({ blocks: [...body, { t: "next", label: "Go", lessonId: "l1", unitId: "u1" }] })).includes("blog-blocks"), "one target only");
  assert.ok(feedRules(withPost({ blocks: [...body, { t: "next", label: "Go", lessonId: "nope" }] })).includes("blog-blocks"));
  assert.ok(feedRules(withPost({ blocks: [...body, { t: "next", label: "", lessonId: "l1" }] })).includes("blog-blocks"));
});

test("blog: block types and their fields", () => {
  const body = piece(140);
  const withBlock = (b) => withPost({ blocks: [b, ...body] });
  assert.deepEqual(feedRules(withBlock({ t: "figure", ref: "atom", caption: "An atom." })), []);
  assert.deepEqual(feedRules(withBlock({ t: "list", items: ["a", "b"] })), []);
  assert.deepEqual(feedRules(withBlock({ t: "h", text: "A heading" })), []);
  assert.ok(feedRules(withBlock({ t: "video", src: "x" })).includes("blog-blocks"), "not in the vocabulary");
  assert.ok(feedRules(withBlock({ t: "figure", ref: "unicorn", caption: "x" })).includes("blog-blocks"));
  assert.ok(feedRules(withBlock({ t: "figure", ref: "atom" })).includes("blog-blocks"), "caption required");
  assert.ok(feedRules(withBlock({ t: "list", items: [] })).includes("blog-blocks"));
  assert.ok(feedRules(withBlock({ t: "p" })).includes("blog-blocks"), "text required");
  assert.ok(feedRules(withPost({ blocks: [] })).includes("blog-blocks"));
  assert.ok(feedRules(withBlock({ t: "p", text: "TODO write this" })).includes("placeholder"));
});

test("blog: sources are warnings in a draft and errors at the publish gate", () => {
  const refs = (list) => withPost({}, { blogRefs: list.map((reference_id) => ({ blog_id: "b1", reference_id })) });
  assert.deepEqual(feedRules(refs(["r-ok"]), "error", { strictReview: true }), [], "a verified source passes the gate");
  assert.deepEqual(feedRules(refs(["r-ok", "r-open"]), "error", { strictReview: true }), [], "one verified source is enough");
  for (const list of [["r-open"], []]) {
    assert.deepEqual(feedRules(refs(list), "error"), [], "draft: not an error");
    assert.ok(feedRules(refs(list), "warning").includes("blog-source"), "draft: a warning");
    assert.ok(feedRules(refs(list), "error", { strictReview: true }).includes("blog-source"), "publish gate: an error");
  }
});

test("blog: related lesson is in its unit, reactors exclude the author, units get a start and an end piece", () => {
  assert.deepEqual(feedRules(withPost({ lesson_id: "l2" })), []);
  assert.ok(feedRules(withPost({ lesson_id: "x1" })).includes("blog-unit"));
  assert.ok(feedRules(withPost({ lesson_id: "nope" })).includes("blog-unit"));
  assert.ok(feedRules(withPost({ unit_id: "nope", lesson_id: null })).includes("blog-unit"));
  assert.deepEqual(feedRules(withPost({ reactors: ["npc-hal"] })), []);
  assert.ok(feedRules(withPost({ reactors: ["npc-ada"] })).includes("blog-reactors"), "the author cannot react");
  assert.ok(feedRules(withPost({ reactors: ["npc-nobody"] })).includes("blog-reactors"));
  // a unit with a piece at its start and one at its end is covered; with only one of them it warns
  assert.deepEqual(feedRules(feedData(), "warning"), []);
  assert.ok(feedRules(withPost({}), "warning").includes("blog-coverage"), "nothing closes the unit");
  assert.ok(feedRules(withPost({ unlock: { trigger: "unit_complete", unitId: "u1" } }), "warning").includes("blog-coverage"), "nothing opens the unit");
  assert.deepEqual(feedRules(withPost({ unlock: { trigger: "lesson_complete", lessonId: "l1" } }, { posts: [goodPost({ unlock: { trigger: "lesson_complete", lessonId: "l1" } }), goodPost({ id: "b2", unlock: { trigger: "unit_complete", unitId: "u1" } })], blogRefs: [{ blog_id: "b1", reference_id: "r-ok" }, { blog_id: "b2", reference_id: "r-ok" }] }), "warning"), [], "a first-lesson piece opens the unit");
});

test("blog comments: up to 4, never the author, one each, 200 characters, real chip targets", () => {
  const some = (comments) => feedData({ comments });
  assert.deepEqual(feedRules(some([goodComment()])), []);
  assert.deepEqual(feedRules(some([])), [], "a piece may have none");
  assert.deepEqual(feedRules(some([goodComment({ id: "a", npc_id: "npc-hal" }), goodComment({ id: "b", npc_id: "npc-ray" }), goodComment({ id: "c", npc_id: "npc-mina" }), goodComment({ id: "d", npc_id: "npc-kofi" })])), [], "four is the limit");
  assert.ok(feedRules(some([goodComment({ id: "a", npc_id: "npc-hal" }), goodComment({ id: "b", npc_id: "npc-ray" }), goodComment({ id: "c", npc_id: "npc-mina" }), goodComment({ id: "d", npc_id: "npc-kofi" }), goodComment({ id: "e", npc_id: "npc-tess" })])).includes("blog-comment-count"));
  assert.ok(feedRules(some([goodComment({ npc_id: "npc-ada" })])).includes("blog-comment-author"));
  assert.ok(feedRules(some([goodComment({ id: "a" }), goodComment({ id: "b" })])).includes("blog-comment-dup"));
  assert.deepEqual(feedRules(some([goodComment({ text: "c".repeat(200) })])), []);
  assert.ok(feedRules(some([goodComment({ text: "c".repeat(201) })])).includes("blog-comment-length"));
  assert.ok(feedRules(some([goodComment({ text: "" })])).includes("blog-comment"));
  assert.ok(feedRules(some([goodComment({ npc_id: "npc-nobody" })])).includes("blog-comment"));
  assert.deepEqual(feedRules(some([goodComment({ chip: { lessonId: "l2" } })])), []);
  assert.deepEqual(feedRules(some([goodComment({ chip: { entryId: "atom" } })])), []);
  assert.ok(feedRules(some([goodComment({ chip: { lessonId: "nope" } })])).includes("blog-comment-chip"));
  assert.ok(feedRules(some([goodComment({ chip: { entryId: "nope" } })])).includes("blog-comment-chip"));
  assert.ok(feedRules(some([goodComment({ chip: { lessonId: "l1", entryId: "atom" } })])).includes("blog-comment-chip"));
  assert.ok(feedRules(some([goodComment({ chip: { url: "https://example.org" } })])).includes("blog-comment-chip"));
  assert.ok(feedRules(some([goodComment({ blog_id: "ghost" })])).includes("blog-comment"));
});

test("feed findings carry the ids Studio matches to an entity", () => {
  const f = validateFeedData(feedData({ comments: [goodComment({ npc_id: "npc-ada" })] })).findings.find((x) => x.rule === "blog-comment-author");
  assert.equal(f.table, "blog_comments");
  assert.equal(f.id, "b1/c1", "comment findings are <blog id>/<comment id>");
});

test("the seeded master database validates and covers every unit", () => {
  const db = new DatabaseSync(new URL("../content/database/content.db", import.meta.url).pathname, { readOnly: true });
  try {
    const r = validateFeed(db);
    assert.deepEqual(r.findings.filter((f) => f.severity === "error").map((f) => `${f.table} ${f.id} ${f.rule}`), []);
    assert.ok(r.checked.feed_templates >= 40 && r.checked.blog_posts >= 4);
    // the publish gate only objects to the sources nobody has opened yet
    const gate = validateFeed(db, { strictReview: true }).findings.filter((f) => f.severity === "error");
    assert.ok(gate.every((f) => f.rule === "blog-source"));
  } finally {
    db.close();
  }
});
