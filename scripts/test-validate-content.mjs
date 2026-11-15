/**
 * Unit tests for the content rule engine (scripts/lib/content-rules.mjs).
 * No database needed — every case is a plain fixture string.
 *
 *   npm run test:content
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkArticle,
  checkOptions,
  checkPlaceholders,
  checkPunctuation,
  checkQuestion,
  checkStatement,
  checkStem,
  findConflictingDuplicates,
  normalize,
} from "./lib/content-rules.mjs";

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
// Articles
// ---------------------------------------------------------------------------

const goodArticle = () => ({
  title: "Radiation basics for beginners",
  excerpt: "A short, plain-language summary of what radiation is and where it comes from.",
  category: "science",
  difficulty: "beginner",
  read_time: 4,
  author: { name: "AtomIQ Editorial", title: "Educational summary" },
  published_date: "2026-11-01",
  source: "International Atomic Energy Agency",
  source_url: "https://www.iaea.org/",
  source_type: "international-organization",
  source_note: "Background reading from the IAEA; this page summarizes ideas in original words.",
  review_status: "reviewed",
  reviewed_by: "AtomIQ content team",
  last_reviewed: "2026-11-10",
  content: "# Radiation basics\n\nRadiation is energy that travels from a source.",
  related_lessons: ["types-of-radiation"],
  related_myths: [],
  related_concepts: [],
  related_elements: ["U", "Pu"],
});

test("a complete article passes", () => {
  assert.deepEqual(errorRules(checkArticle(goodArticle(), { today: "2026-11-14" })), []);
});

test("articles missing pipeline metadata fail", () => {
  const cases = [
    ["source_url", { source_url: "" }],
    ["source_url", { source_url: "http://insecure.example.org" }],
    ["source_url", { source_url: "not a url" }],
    ["source_type", { source_type: "" }],
    ["source_type", { source_type: "blog" }],
    ["review_status", { review_status: "maybe" }],
    ["last_reviewed", { last_reviewed: "" }],
    ["last_reviewed", { last_reviewed: "11/10/2026" }],
    ["published_date", { published_date: "" }],
    ["source", { source: "" }],
    ["author", { author: { name: "" } }],
    ["source_note", { source_note: "" }],
    ["reviewed_by", { reviewed_by: "" }],
  ];
  for (const [field, patch] of cases) {
    const findings = checkArticle({ ...goodArticle(), ...patch }, { today: "2026-11-14" });
    assert.ok(findings.some((f) => f.field === field && f.severity === "error"), `expected ${field} error for ${JSON.stringify(patch)}`);
  }
});

test("last_reviewed in the future and bad relations fail", () => {
  assert.ok(checkArticle({ ...goodArticle(), last_reviewed: "2030-01-01" }, { today: "2026-11-14" }).some((f) => f.field === "last_reviewed"));
  const lessonIds = new Set(["types-of-radiation"]);
  assert.ok(checkArticle({ ...goodArticle(), related_lessons: ["nope"] }, { today: "2026-11-14", lessonIds }).some((f) => f.rule === "article-relation"));
  assert.ok(checkArticle({ ...goodArticle(), related_elements: ["Xx"] }, { today: "2026-11-14" }).some((f) => f.rule === "article-relation"));
});

test("source material must stay out of the summary body", () => {
  const withUrl = { ...goodArticle(), content: "Read more at https://www.iaea.org/ for the details." };
  assert.ok(checkArticle(withUrl, { today: "2026-11-14" }).some((f) => f.rule === "source-separation"));
  const copyright = { ...goodArticle(), content: "Text copied here. © 2024 Some Publisher" };
  assert.ok(checkArticle(copyright, { today: "2026-11-14" }).some((f) => f.rule === "source-separation"));
});
