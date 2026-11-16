#!/usr/bin/env node
/**
 * Repeatable content migration: make every learner-facing question a complete,
 * standalone thought (spec §4.3). Every change is listed explicitly below as
 * (id, old -> new). The script:
 *
 *   - opens ONLY the master db (content/database/content.db) unless --db is given;
 *   - verifies each "old" value still matches before touching a row (so it is
 *     idempotent and never clobbers someone else's later edit);
 *   - re-checks that the stored correct answer still points at the same option
 *     after any option edit;
 *   - applies everything in ONE short IMMEDIATE transaction;
 *   - prints a before/after log. Use --dry-run to preview.
 *
 *   node --no-warnings scripts/content-migration/fix-question-context.mjs [--dry-run] [--db path]
 *
 * It does NOT run sync-content; the release step does that.
 */

import { DatabaseSync } from "node:sqlite";
import { backupBeforeScript } from "../lib/backup.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

// ---------------------------------------------------------------------------
// Change list
// ---------------------------------------------------------------------------
// Shape: { table, id, question?|task?: [old, new], options?: { index: [old, new] },
//          explanation?: [old, new], answer?: expectedCorrectAnswer }
// `answer` is the stored correct index/id that must be unchanged by the edit.

const changes = [];
const add = (table, id, spec) => changes.push({ table, id, ...spec });

// --- quiz_questions: sentence fragments that ended in a colon -----------------
add("quiz_questions", "radiation-types-quiz/q1", {
  question: ["Alpha particles can be stopped by:", "Which barrier is enough to stop alpha particles?"],
  answer: 0,
});
add("quiz_questions", "radiation-types-quiz/q2", {
  question: ["Beta particles are best shielded with:", "Which material is best for shielding beta particles?"],
  answer: 2,
});
add("quiz_questions", "safety-security-quiz/q5", {
  question: ["Safeguards primarily aim to:", "What is the main aim of nuclear safeguards?"],
  answer: 1,
});
add("quiz_questions", "sustainability-quiz/q5", {
  question: [
    "Which pairing best shows nuclear’s role in clean grids?",
    "Which description best fits the role nuclear power plays in a clean electricity grid?",
  ],
  answer: 1,
});
add("quiz_questions", "everyday-nuclear-quiz/q3", {
  question: [
    "Which industry use relies on gauging thickness with radiation?",
    "Which industrial use relies on radiation to gauge the thickness of a material?",
  ],
  answer: 1,
});

// --- lesson_steps ---------------------------------------------------------------
add("lesson_steps", "background-radiation/lab", {
  task: [
    "Select the location with highest natural radiation exposure",
    "Select the location with the highest natural radiation exposure.",
  ],
  answer: "basement",
});
add("lesson_steps", "radiation-shielding/lab", {
  task: [
    "Select the most effective shield against gamma radiation",
    "Select the most effective shield against gamma radiation.",
  ],
  answer: "lead",
});
add("lesson_steps", "nuclear-fusion/lab", {
  task: [
    "Compared to fission, fusion produces:",
    "Compared with fission, how much energy does fusion release for the same mass of fuel?",
  ],
  answer: "more",
});
add("lesson_steps", "nuclear-fusion/assessment", {
  question: ["Nuclear fusion involves:", "What does nuclear fusion involve?"],
  answer: 1,
});
add("lesson_steps", "radiation-biological-effects/assessment", {
  question: [
    "Which exposure is long-term, low-dose?",
    "Which term describes radiation exposure that is long-term and low-dose?",
  ],
  answer: 1,
});
add("lesson_steps", "radioactive-decay/assessment-3", {
  question: [
    "Name one application of radioactive decay in medicine.",
    "Which of these is a medical application of radioactivity?",
  ],
  options: { 3: ["All of the above", "All of these"] },
  explanation: ["All of the above! Radioactive decay", "All of these! Radioactive decay"],
  answer: 3,
});
add("lesson_steps", "nuclear-energy-explained/assessment-2", {
  question: [
    "True or False: Nuclear energy in power plants is the same as in bombs.",
    "True or False: Nuclear power plants and nuclear bombs both get their energy from atomic nuclei.",
  ],
  answer: 0,
});

// --- maze_rooms: position-dependent option (options are shuffled at runtime) ----
add("maze_rooms", "reactor-tech-maze/room-4", {
  mazeQuestion: 0,
  options: { 3: ["Both B and C", "Both to remove heat and to create steam"] },
  answer: 3,
});

// --- mythbuster_questions: stems (also the Atom Maze boss + endless pool) --------
const mb = (id, from, to, extra = {}) => add("mythbuster_questions", id, { question: [from, to], ...extra });

mb("mb-easy-q24", "What is shielding?", "In radiation safety, what is shielding?");
mb("mb-easy-q29", "What is contamination?", "In radiation safety, what is contamination?");
mb("mb-easy-q30", "What is exposure?", "In radiation safety, what is radiation exposure?");
mb("mb-easy-q31", "What is ALARA principle?", "What does the ALARA principle mean in radiation safety?");
mb("mb-easy-q32", "What protects workers from radiation?", "What protects workers from radiation?", {
  options: { 3: ["All of the above", "All of these"] },
});
mb("mb-easy-q35", "Which industry uses radiation gauges?", "Which industry uses radiation gauges?", {
  options: { 3: ["All of the above", "All of these"] },
});
mb("mb-easy-q38", "What is sterilization using radiation?", "What does sterilization using radiation do?");
mb("mb-easy-q43", "What is a chain reaction?", "What is a nuclear chain reaction?");
mb("mb-easy-q48", "What is a risk of radiation?", "What is a risk of high radiation exposure?");

mb("mb-hard-q4", "What happens if a moderator is removed?", "What happens to the reaction if a moderator is removed from a reactor?");
mb("mb-hard-q7", "What occurs in subcritical condition?", "What happens to the chain reaction when a reactor is subcritical?");
mb("mb-hard-q10", "What does a high LET radiation imply?", "What does high LET (linear energy transfer) radiation imply?");
mb("mb-hard-q11", "Which radiation has the highest LET?", "Which radiation has the highest linear energy transfer (LET)?");
mb("mb-hard-q13", "What is stochastic effect?", "What is a stochastic effect of radiation?");
mb("mb-hard-q14", "What is deterministic effect?", "What is a deterministic effect of radiation?");
mb("mb-hard-q18", "What is radioactive decay constant?", "What does the radioactive decay constant describe?");
mb("mb-hard-q23", "What is the inverse square law?", "What does the inverse square law say about radiation intensity?");
mb("mb-hard-q25", "What is reactor scram?", "What is a reactor scram?");
mb("mb-hard-q26", "If half-life is 5 years, remaining after 15 years?", "If a radioactive isotope has a half-life of 5 years, what fraction of it remains after 15 years?");
mb("mb-hard-q27", "What increases probability of fission?", "What increases the probability of fission?");
mb("mb-hard-q30", "What is the main risk in reactor meltdown?", "What is the main risk in a reactor meltdown?");
mb("mb-hard-q32", "What is radiation weighting factor?", "What does the radiation weighting factor represent?");
mb("mb-hard-q36", "What is decay series?", "What is a decay series?");
mb("mb-hard-q37", "What is radioisotope production method?", "Which method is commonly used to produce radioisotopes?");
mb("mb-hard-q38", "What is nuclear cross-section?", "What is a nuclear cross-section?");
mb("mb-hard-q39", "Why are fast reactors used?", "What distinguishes a fast reactor from most other reactors?", {
  options: {
    0: ["Reduce neutrons", "It reduces the number of neutrons"],
    1: ["Use fast neutrons", "It uses fast neutrons to sustain the chain reaction"],
    2: ["Stop reactions", "It stops fission reactions"],
    3: ["Reduce energy", "It reduces energy output"],
  },
  answer: 1,
});
mb("mb-hard-q40", "What is breeder reactor?", "What is a breeder reactor?");
mb("mb-hard-q46", "What is attenuation?", "In radiation shielding, what is attenuation?");
mb("mb-hard-q47", "What is radioactive contamination vs exposure difference?", "How does radioactive contamination differ from radiation exposure?", {
  options: {
    0: ["Same", "They are the same thing"],
    1: ["Material vs energy", "Contamination is radioactive material; exposure is energy received"],
    2: ["Energy vs material", "Contamination is energy received; exposure is radioactive material"],
    3: ["None", "There is no difference"],
  },
  answer: 1,
});
mb("mb-hard-q49", "What is prompt vs delayed neutrons?", "How do prompt neutrons differ from delayed neutrons?", {
  options: {
    0: ["Time of emission", "When they are emitted after fission"],
    1: ["Energy", "Their electric charge"],
    2: ["Mass", "Their mass"],
    3: ["Charge", "Which element they come from"],
  },
  answer: 0,
});
mb("mb-medium-q1", "Which subatomic particle determines the mass number of an atom?", "Which subatomic particles determine the mass number of an atom?");
mb("mb-medium-q41", "What type of radiation is used in X-rays?", "What type of radiation is used in X-rays?", {
  options: { 2: ["Gamma-like electromagnetic", "Electromagnetic waves (like gamma rays)"] },
  answer: 2,
});
mb("mb-medium-q48", "Which factor does NOT affect half-life?", "Which of these factors changes a radioactive isotope's half-life?", {
  options: { 3: ["None", "None of these"] },
  answer: 3,
});

// --- mythbuster_questions: explanations that only said "Correct answer: X." -------
const explanations = {
  // hard
  "mb-hard-q1": "The fission products have slightly less total mass than the original nucleus. That missing mass (the mass defect) is converted into energy, as described by E = mc².",
  "mb-hard-q2": "Binding energy is the energy equivalent of the mass defect (E = mc²), so a larger mass defect means a larger binding energy. The two are directly proportional.",
  "mb-hard-q3": "Fast neutrons are less likely to interact with uranium-235 nuclei than slow (thermal) neutrons, so fewer of them cause new fissions. This is why most reactors slow neutrons down with a moderator.",
  "mb-hard-q4": "Without a moderator, neutrons stay fast and are less likely to cause fission in uranium-235, so the chain reaction weakens and the reaction decreases.",
  "mb-hard-q5": "A fissile nucleus can be split by slow neutrons. Uranium-235 easily absorbs a neutron and splits, releasing energy and more neutrons that can keep a chain reaction going.",
  "mb-hard-q6": "Critical mass is the smallest amount of fissile material that can sustain a chain reaction on its own. Below it, too many neutrons escape or are lost.",
  "mb-hard-q7": "In a subcritical condition each fission causes, on average, fewer than one further fission, so the chain reaction dies away and the reaction decreases.",
  "mb-hard-q8": "Atomic nuclei are positively charged and repel each other (Coulomb repulsion). Fusion needs extreme temperature and pressure to push nuclei close enough for the nuclear force to take over.",
  "mb-hard-q9": "Fusion produces much less long-lived radioactive waste than fission, because its main product, helium, is not radioactive.",
  "mb-hard-q10": "LET (linear energy transfer) is how much energy radiation deposits per distance traveled. High-LET radiation, such as alpha particles, deposits a lot of energy along a short path, which can damage nearby cells more.",
  "mb-hard-q11": "Alpha particles are heavy and carry a double positive charge, so they deposit their energy over a very short distance. That gives them the highest LET of these options.",
  "mb-hard-q12": "Alpha particles cannot get through skin, but if an alpha emitter is inhaled or swallowed, its strong ionization damages nearby cells directly.",
  "mb-hard-q13": "Stochastic effects, such as cancer risk, happen by chance. A higher dose raises the probability of the effect, not how severe it is.",
  "mb-hard-q14": "Deterministic effects, such as skin burns, only occur above a threshold dose, and they get more severe as the dose rises.",
  "mb-hard-q15": "Boron absorbs neutrons very well, so it is used in control rods and, dissolved in the coolant of some reactors, to help control the chain reaction.",
  "mb-hard-q16": "Neutron flux is the number of neutrons passing through a given area each second. It shows how intense the neutron population is inside the reactor core.",
  "mb-hard-q17": "Each layer of shielding removes a fraction of the radiation, so the intensity falls exponentially as the shield gets thicker.",
  "mb-hard-q18": "The decay constant is the probability per unit time that a nucleus will decay. A larger value means faster decay and a shorter half-life.",
  "mb-hard-q19": "In secular equilibrium a very long-lived parent decays so slowly that its short-lived daughter settles at the same activity as the parent.",
  "mb-hard-q20": "Plutonium-239 is fissile: it splits when it absorbs neutrons. It forms inside reactors from uranium-238 and contributes to the energy a reactor produces.",
  "mb-hard-q21": "In neutron capture a nucleus absorbs a neutron and becomes a heavier isotope. This is how control rods absorb neutrons and how some radioisotopes are made.",
  "mb-hard-q22": "Bremsstrahlung is German for \"braking radiation\": X-rays emitted when fast charged particles, such as electrons, slow down near atomic nuclei.",
  "mb-hard-q23": "Intensity falls with the square of the distance (1/d²). Doubling the distance from a source cuts the intensity to one quarter.",
  "mb-hard-q24": "Inserting control rods absorbs neutrons, which stops the chain reaction and shuts the reactor down.",
  "mb-hard-q25": "A scram is an emergency shutdown in which the control rods are inserted quickly to stop the chain reaction.",
  "mb-hard-q26": "15 years is three half-lives (15 ÷ 5 = 3). Each half-life halves the amount: 1/2, then 1/4, then 1/8.",
  "mb-hard-q27": "Slow (thermal) neutrons are much more likely to be captured by uranium-235 and cause fission than fast neutrons.",
  "mb-hard-q28": "Dense, thick materials have more atoms in the way to absorb or scatter radiation, so density and thickness decide how well a shield works. Color and shape do not matter.",
  "mb-hard-q29": "Water absorbs a lot of heat per kilogram (high heat capacity), is cheap and plentiful, and in many reactors also acts as the moderator.",
  "mb-hard-q30": "In a meltdown the fuel overheats and the reactor core is damaged. The main risk is that radioactive material could escape if the other barriers also fail.",
  "mb-hard-q31": "Neutron moderation slows fast neutrons down, using materials such as water or graphite, so they are more likely to cause fission.",
  "mb-hard-q32": "The radiation weighting factor adjusts absorbed dose for how biologically damaging each type of radiation is. For the same energy, alpha particles get a higher factor than gamma rays.",
  "mb-hard-q33": "Effective dose measures the overall biological risk from radiation and is given in sieverts (Sv). The gray (Gy) measures absorbed energy, and the becquerel (Bq) counts decays per second.",
  "mb-hard-q34": "Linear energy transfer is the amount of energy radiation deposits per unit of distance it travels through a material.",
  "mb-hard-q35": "Gamma rays are photons with no mass and no electric charge, so they interact only rarely with matter and can travel far through materials.",
  "mb-hard-q36": "A decay series (or decay chain) is a sequence of successive decays in which each radioactive product decays again until a stable isotope is reached.",
  "mb-hard-q37": "In neutron activation, stable atoms are placed in a stream of neutrons (often in a research reactor), absorb neutrons, and become radioactive isotopes.",
  "mb-hard-q38": "A nuclear cross-section measures the probability that a particular interaction, such as neutron capture or fission, will happen.",
  "mb-hard-q39": "Fast reactors have no moderator, so fast neutrons sustain the chain reaction. This lets them use uranium more efficiently and potentially consume some long-lived waste.",
  "mb-hard-q40": "A breeder reactor produces more fissile material, such as plutonium-239, than it consumes by converting non-fissile uranium-238.",
  "mb-hard-q41": "Spent fuel is nuclear fuel that has been used in a reactor. It is still radioactive and hot, so it is cooled and stored carefully.",
  "mb-hard-q42": "Vitrification mixes high-level radioactive waste into molten glass, which hardens into a durable solid that locks the radioactive material inside.",
  "mb-hard-q43": "Nuclear proliferation is the spread of nuclear weapons to more countries. Treaties such as the NPT and IAEA safeguards aim to prevent it.",
  "mb-hard-q44": "Dose rate is how much dose is received per unit of time, for example microsieverts per hour. A given dose delivered slowly is generally less harmful than the same dose delivered all at once.",
  "mb-hard-q45": "The right shield depends on the type and energy of the radiation: paper stops alpha, plastic or aluminum stops beta, and dense lead or concrete is needed for gamma rays.",
  "mb-hard-q46": "Attenuation is the reduction in radiation intensity as it passes through a material.",
  "mb-hard-q47": "Contamination means radioactive material is on or in something, such as skin or a surface. Exposure means receiving radiation. You can be exposed without being contaminated, for example during a medical X-ray.",
  "mb-hard-q48": "Neutron economy is the balance between neutrons produced by fission and neutrons lost to absorption or escape. A reactor stays critical only while that balance holds.",
  "mb-hard-q49": "Prompt neutrons are released almost instantly during fission, while delayed neutrons are emitted seconds to minutes later by decaying fission products. The delayed ones make reactors much easier to control.",
  "mb-hard-q50": "Some radioactive isotopes in waste have very long half-lives, so they stay radioactive for thousands of years and must be isolated for a very long time.",
  // medium
  "mb-medium-q1": "The mass number is the total number of protons and neutrons in the nucleus. Electrons are so light that they add almost no mass.",
  "mb-medium-q2": "Losing a negatively charged electron leaves more protons than electrons, so the atom becomes a positively charged ion.",
  "mb-medium-q3": "Alpha particles are large and heavy, so even a sheet of paper or the outer layer of skin stops them.",
  "mb-medium-q4": "A moderator, such as water or graphite, slows neutrons down so they are more likely to cause fission.",
  "mb-medium-q5": "Radio waves do not carry enough energy to knock electrons out of atoms, so they are non-ionizing. Alpha, beta and gamma radiation are ionizing.",
  "mb-medium-q6": "The mass number is protons plus neutrons: 6 + 7 = 13.",
  "mb-medium-q7": "Chemical bonds form when atoms share or transfer electrons, so electrons, especially the outer ones, are responsible for bonding.",
  "mb-medium-q8": "Ionizing radiation can damage cells and their DNA, which is the main health hazard at high doses.",
  "mb-medium-q9": "In beta-minus decay a neutron turns into a proton and releases an electron (the beta particle), so the atomic number goes up by one.",
  "mb-medium-q10": "Beta particles are stopped by light materials such as plastic or a thin sheet of aluminum. Paper is too thin, and dense materials like lead can produce secondary X-rays.",
  "mb-medium-q11": "Coolant carries heat away from the reactor core so the fuel does not overheat. That heat is then used to make steam.",
  "mb-medium-q12": "A stable nucleus has a balanced mix of protons and neutrons, so it does not decay or emit radiation.",
  "mb-medium-q13": "Beta decay emits a high-speed electron, called a beta particle, from the nucleus.",
  "mb-medium-q14": "A radionuclide is an unstable atom whose nucleus decays and emits radiation.",
  "mb-medium-q15": "Iodine-131 is taken up by the thyroid gland, so doctors use it to treat thyroid conditions such as an overactive thyroid and thyroid cancer.",
  "mb-medium-q16": "Radiation protection relies on time, distance and shielding. Spending less time near a source lowers the dose, while less distance or less shielding would raise it.",
  "mb-medium-q17": "Control rods contain neutron-absorbing materials such as boron or cadmium. Inserting them absorbs neutrons and slows the chain reaction.",
  "mb-medium-q18": "Alpha particles are stopped by skin, but if an alpha emitter is swallowed or inhaled it deposits all its energy in nearby tissue, which makes it the most dangerous of these inside the body.",
  "mb-medium-q19": "Nuclear binding energy is the energy that holds the protons and neutrons together in the nucleus.",
  "mb-medium-q20": "Transmutation is a nuclear change that turns one element into another by changing the number of protons, for example through radioactive decay or neutron capture.",
  "mb-medium-q21": "Reactor fuel rods are metal tubes filled with small ceramic pellets of uranium dioxide.",
  "mb-medium-q22": "A containment structure is a strong, sealed building around the reactor that is designed to stop radioactive material from escaping into the environment during an accident.",
  "mb-medium-q23": "A tracer is a small amount of radioactive substance given to a patient. Detectors follow its radiation to show how organs are working.",
  "mb-medium-q24": "Radioactive equilibrium is reached when a radioactive parent and its daughter decay at the same rate, so the amount of daughter stays steady.",
  "mb-medium-q25": "The gray (Gy) measures absorbed dose, the energy absorbed per kilogram of material. The sievert measures biological effect, and the becquerel counts decays per second.",
  "mb-medium-q26": "20 years is two half-lives (20 ÷ 10 = 2). The sample halves twice, leaving 1/2 × 1/2 = 1/4.",
  "mb-medium-q27": "Radiation intensity falls quickly as you move away from a source (the inverse square law), so distance changes it the most. Color, shape and temperature have no effect.",
  "mb-medium-q28": "Lead is very dense, so it packs many atoms into a small volume to absorb gamma rays and X-rays.",
  "mb-medium-q29": "Nuclear power plants use fission, splitting heavy nuclei such as uranium-235 to release heat. Fusion is not yet used commercially, and combustion and chemical reactions are not nuclear.",
  "mb-medium-q30": "Control rods absorb neutrons. With them completely removed, more neutrons cause fission and the chain reaction can increase rapidly. That is why rods are withdrawn slowly and safety systems can insert them again quickly.",
  "mb-medium-q31": "A tiny amount of mass is lost in each fission and converted into energy (E = mc²), which is the main source of the energy released.",
  "mb-medium-q32": "Gamma rays are very penetrating, so they need thick, dense shielding such as lead or concrete. Alpha and beta radiation are stopped by much thinner materials.",
  "mb-medium-q33": "A Geiger counter detects ionizing radiation and clicks or shows a count rate when radiation passes through it.",
  "mb-medium-q34": "In gamma decay the nucleus releases extra energy as a gamma ray, without changing its number of protons or neutrons.",
  "mb-medium-q35": "A neutron strikes a uranium-235 nucleus and makes it split, which initiates fission. The split releases more neutrons that cause further fissions.",
  "mb-medium-q36": "Cobalt-60 emits strong gamma rays, which are used in radiotherapy to destroy cancer cells.",
  "mb-medium-q37": "In a nuclear chain reaction, neutrons released by one fission cause further fissions, so the reactions repeat.",
  "mb-medium-q38": "Nuclear fuel holds a huge amount of energy for its mass, so a small amount of fuel can produce a lot of electricity. This is called high energy density.",
  "mb-medium-q39": "Radiation sickness (acute radiation syndrome) is caused by a high dose of radiation received in a short time, not by low exposure.",
  "mb-medium-q40": "A dosimeter measures how much radiation a person has been exposed to, which is why radiation workers wear one.",
  "mb-medium-q41": "X-rays are electromagnetic waves like gamma rays, but they are produced by machines instead of by atomic nuclei.",
  "mb-medium-q42": "In neutron activation, a stable nucleus absorbs a neutron and becomes a radioactive isotope.",
  "mb-medium-q43": "Radioactive dating measures how much of a radioactive isotope, such as carbon-14, is left in a sample to work out how old it is.",
  "mb-medium-q44": "Carbon-14 decays at a known rate (half-life about 5,730 years), so the amount left shows how long ago an organism died.",
  "mb-medium-q45": "More shielding absorbs more radiation, so exposure decreases.",
  "mb-medium-q46": "Nuclear safeguards, such as IAEA inspections and material accounting, help make sure nuclear material and technology are not misused for weapons.",
  "mb-medium-q47": "The main hazard of nuclear waste is its radiation, which is why it is shielded and isolated.",
  "mb-medium-q48": "Half-life is a property of the nucleus. Ordinary changes in temperature, pressure or chemical state do not change it, so none of these factors affect it.",
  "mb-medium-q49": "Induced radioactivity is created by bombarding stable atoms with particles, such as neutrons, to make them radioactive. It is artificial, not natural.",
  "mb-medium-q50": "Nuclear medicine uses small amounts of radioactive tracers to show how organs work, which allows precise diagnosis of many conditions.",
};
for (const [id, text] of Object.entries(explanations)) {
  add("mythbuster_questions", id, { explanationFromAnswerStub: true, explanation: [null, text] });
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

if (!dryRun) backupBeforeScript("fix-question-context", dbPath); // safety net: scripts/lib/backup.mjs

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA busy_timeout = 10000");
db.exec("PRAGMA foreign_keys = ON");

const log = [];
const warn = (msg) => log.push(`  SKIP  ${msg}`);
const parse = (raw) => JSON.parse(raw);
let applied = 0;
let skipped = 0;

function recordChange(label, field, from, to) {
  log.push(`  ${label}  ${field}\n      - ${from}\n      + ${to}`);
}

function applyOptionEdits(options, edits, label) {
  const next = [...options];
  for (const [index, [from, to]] of Object.entries(edits)) {
    if (next[index] === to) continue; // already applied
    if (next[index] !== from) throw new Error(`${label}: options[${index}] is ${JSON.stringify(next[index])}, expected ${JSON.stringify(from)}`);
    next[index] = to;
  }
  return next;
}

function applyTextEdit(current, [from, to], label, field) {
  if (current === to || (from !== null && from !== current && current.startsWith(to))) return null; // already applied
  if (from !== null && !current.startsWith(from)) {
    throw new Error(`${label}: ${field} is ${JSON.stringify(current)}, expected ${JSON.stringify(from)}`);
  }
  if (from === null && !/^Correct answer:/i.test(current)) {
    throw new Error(`${label}: ${field} is not a "Correct answer:" stub: ${JSON.stringify(current)}`);
  }
  return from !== null && from !== current ? current.replace(from, to) : to;
}

db.exec("BEGIN IMMEDIATE");
try {
  const now = Math.floor(Date.now() / 1000);
  for (const change of changes) {
    const label = `${change.table} ${change.id}`;
    const edit = (field, fromTo, current) => {
      const next = applyTextEdit(current, fromTo, label, field);
      if (next === null) return null;
      recordChange(label, field, current, next);
      return next;
    };
    let touched = false;

    if (change.table === "quiz_questions" || change.table === "mythbuster_questions") {
      const sel =
        change.table === "quiz_questions"
          ? db.prepare("SELECT * FROM quiz_questions WHERE quiz_id = ? AND id = ?").get(...change.id.split("/"))
          : db.prepare("SELECT * FROM mythbuster_questions WHERE id = ?").get(change.id);
      if (!sel) throw new Error(`${label}: row not found`);
      const beforeAnswer = parse(sel.correct_answer);
      if (change.answer !== undefined && beforeAnswer !== change.answer) {
        throw new Error(`${label}: stored answer ${beforeAnswer} != expected ${change.answer}`);
      }
      let question = sel.question;
      let options = parse(sel.options);
      let explanation = sel.explanation;
      if (change.question) {
        const next = edit("question", change.question, question);
        if (next !== null) { question = next; touched = true; }
      }
      if (change.options) {
        const before = JSON.stringify(options);
        options = applyOptionEdits(options, change.options, label);
        if (JSON.stringify(options) !== before) {
          recordChange(label, "options", before, JSON.stringify(options));
          touched = true;
        }
      }
      if (change.explanation) {
        const next = edit("explanation", change.explanation, explanation);
        if (next !== null) { explanation = next; touched = true; }
      }
      if (touched) {
        const key = change.table === "quiz_questions" ? ["quiz_id = ? AND id = ?", ...change.id.split("/")] : ["id = ?", change.id];
        db.prepare(
          `UPDATE ${change.table} SET question = ?, options = ?, explanation = ?, updated_at = ? WHERE ${key[0]}`,
        ).run(question, JSON.stringify(options), explanation, now, ...key.slice(1));
        // answer index untouched by design; re-read to prove it
        const after = change.table === "quiz_questions"
          ? db.prepare("SELECT correct_answer FROM quiz_questions WHERE quiz_id = ? AND id = ?").get(...change.id.split("/"))
          : db.prepare("SELECT correct_answer FROM mythbuster_questions WHERE id = ?").get(change.id);
        if (parse(after.correct_answer) !== beforeAnswer) throw new Error(`${label}: correct answer changed unexpectedly`);
      }
    } else if (change.table === "lesson_steps") {
      const [lessonId, stepId] = change.id.split("/");
      const sel = db.prepare("SELECT data FROM lesson_steps WHERE lesson_id = ? AND id = ?").get(lessonId, stepId);
      if (!sel) throw new Error(`${label}: row not found`);
      const data = parse(sel.data);
      const answer = data.correctIndex ?? data.correctAnswer;
      if (change.answer !== undefined && answer !== change.answer) {
        throw new Error(`${label}: stored answer ${JSON.stringify(answer)} != expected ${JSON.stringify(change.answer)}`);
      }
      for (const field of ["question", "task", "explanation"]) {
        if (change[field]) {
          const next = edit(field, change[field], data[field]);
          if (next !== null) { data[field] = next; touched = true; }
        }
      }
      if (change.options) {
        const before = JSON.stringify(data.options);
        data.options = applyOptionEdits(data.options, change.options, label);
        if (JSON.stringify(data.options) !== before) {
          recordChange(label, "options", before, JSON.stringify(data.options));
          touched = true;
        }
      }
      if (touched) {
        db.prepare("UPDATE lesson_steps SET data = ?, updated_at = ? WHERE lesson_id = ? AND id = ?").run(JSON.stringify(data), now, lessonId, stepId);
      }
    } else if (change.table === "maze_rooms") {
      const [mazeId, roomId] = change.id.split("/");
      const sel = db.prepare("SELECT questions FROM maze_rooms WHERE maze_id = ? AND id = ?").get(mazeId, roomId);
      if (!sel) throw new Error(`${label}: row not found`);
      const questions = parse(sel.questions);
      const q = questions[change.mazeQuestion];
      if (change.answer !== undefined && q.correctAnswer !== change.answer) {
        throw new Error(`${label}: stored answer ${q.correctAnswer} != expected ${change.answer}`);
      }
      if (change.options) {
        const before = JSON.stringify(q.options);
        q.options = applyOptionEdits(q.options, change.options, label);
        if (JSON.stringify(q.options) !== before) {
          recordChange(label, `questions[${change.mazeQuestion}].options`, before, JSON.stringify(q.options));
          touched = true;
        }
      }
      if (touched) {
        db.prepare("UPDATE maze_rooms SET questions = ?, updated_at = ? WHERE maze_id = ? AND id = ?").run(JSON.stringify(questions), now, mazeId, roomId);
      }
    } else {
      throw new Error(`${label}: unsupported table`);
    }

    if (touched) applied++;
    else {
      skipped++;
      warn(`${label} (already up to date)`);
    }
  }

  if (dryRun) {
    db.exec("ROLLBACK");
  } else {
    db.exec("COMMIT");
  }
} catch (error) {
  db.exec("ROLLBACK");
  console.error(log.join("\n"));
  console.error(`\nMigration aborted, nothing written: ${error.message}`);
  process.exit(1);
}

console.log(log.filter((l) => !l.startsWith("  SKIP")).join("\n"));
console.log(
  `\n${dryRun ? "[dry-run] " : ""}${applied} row(s) changed, ${skipped} already up to date, of ${changes.length} listed changes (${dbPath}).`,
);
