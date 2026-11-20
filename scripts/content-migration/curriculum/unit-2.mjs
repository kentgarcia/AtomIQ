/**
 * Unit 2: Radioactivity. Authored content (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md).
 *
 * One core idea per lesson, in short plain sentences:
 *   L1  An unstable nucleus can change by itself. When one particular nucleus changes cannot be predicted.
 *   L2  A decay can release alpha, beta or gamma. Alpha and beta are particles. Gamma is electromagnetic radiation.
 *   L3  Half-life describes how quickly a group of radioactive nuclei decreases. A group, not a timer.
 *   L4  The new nucleus can be unstable too and decay again: a decay chain.
 *   L5  Radioactivity and radiation exist in rocks, air, food, bodies and space. Radioactive is not automatically dangerous.
 * Harder ideas (the mechanism of beta decay, the decay curve, real decay series) are optional "go deeper"
 * cards that are never required and never scored.
 *
 * Unit 1 already teaches stable and unstable nuclei and that radioactivity is natural; this unit builds
 * on that and never re-asks the Unit 1 "humans invented radioactivity" myth (spec section 3).
 * Exposure is not activation, ionizing versus non-ionizing and the dose scale belong to Units 3 and 4:
 * they appear here only as teaser lines.
 *
 * Every fact below must be confirmed against its reference before publish (references are marked
 * unverified until a person opens and checks them). The half-life examples and the end points of the
 * two decay series in particular are candidates to verify (spec section 9).
 * Correct answers are option ids; teaching text is at most 60 words per card.
 */

import {
  alphaFigure,
  betaFigure,
  changeHotspot,
  chainFigure,
  chainZoomOut,
  cosmicRays,
  daughterUnstable,
  decayCurve,
  exposedLater,
  flameAndIce,
  foodBody,
  gammaFigure,
  groupNotTimer,
  halfLifeBars,
  halfLifeGrid,
  halfLifeLadder,
  notAlwaysDangerous,
  parentDaughter,
  radonChain,
  radonHouse,
  randomOne,
  realChains,
  rocksSoil,
  simpleStableUnstable,
  threeKinds,
  whatChanges,
  becquerelPlate,
} from "./scenes.mjs";

const UNIT_ID = "radioactivity";

// ---------------------------------------------------------------------------
// Unit, objectives, references
// ---------------------------------------------------------------------------

export const unit = {
  id: UNIT_ID,
  position: 2,
  title: "Radioactivity",
  subtitle: "How unstable nuclei change",
  description:
    "Find out why some nuclei change all by themselves. See what comes out, why nobody can say when one nucleus will change, how a big group follows a pattern, and why radioactivity is a natural part of the world.",
  goal: "Explain in your own words that radioactivity is a natural process in which an unstable nucleus changes into a more stable state and releases radiation.",
  guidebook: {
    summary:
      "Radioactivity is a natural process in which an unstable nucleus changes into a more stable state and releases radiation. It happens by itself, and you cannot predict when one particular nucleus will change. What comes out can be alpha particles, beta particles or gamma rays: three different things. A big group of nuclei follows a pattern called half-life. A new nucleus can be unstable too, which makes a decay chain. Radioactivity is found in rocks, air, food, the body and space, and radioactive does not automatically mean dangerous.",
    termIds: ["radioactivity", "decay", "alpha-particle", "beta-particle", "gamma-ray", "half-life", "decay-chain", "radon", "background-radiation"],
  },
  icon: "Radar",
  tone: "warning",
};

export const objectives = [
  { id: "u2-spontaneous", statement: "Know that an unstable nucleus changes by itself: nobody has to trigger it.", misconception: "Decay can be switched on and off, or a person has to make an atom decay." },
  { id: "u2-random-single", statement: "Know that you cannot predict when one particular nucleus will decay, although a large group follows a pattern.", misconception: "If you watch a nucleus closely you can tell when it will change." },
  { id: "u2-parent-daughter", statement: "Name the nucleus that decays (parent) and the nucleus it becomes (daughter).", misconception: "" },
  { id: "u2-particle-or-wave", statement: "Know that alpha and beta are particles and gamma is electromagnetic radiation, so the three are different.", misconception: "Alpha, beta and gamma are the same thing, and gamma is made of tiny pieces of the nucleus." },
  { id: "u2-recognise-radiation", statement: "Say what each one is: alpha is 2 protons and 2 neutrons, beta is a fast electron, gamma is high-energy electromagnetic radiation.", misconception: "The electron of a beta particle was orbiting the nucleus." },
  { id: "u2-half-life-meaning", statement: "Know that half-life is the time for about half of a large group of radioactive nuclei to decay.", misconception: "A radioactive atom is half gone after one half-life." },
  { id: "u2-half-life-pattern", statement: "Read the pattern 100, 50, 25, 12 and know that radioactivity fades but is not gone after one half-life.", misconception: "After one half-life the radioactivity is gone, and radioactive material stays radioactive for ever." },
  { id: "u2-half-life-group", statement: "Know that half-life describes a group, not a timer in each nucleus.", misconception: "A radioactive atom waits exactly one half-life before it decays." },
  { id: "u2-decay-chain", statement: "Know that a daughter can be unstable and decay again, until a stable nucleus is reached (a decay chain).", misconception: "Every decay makes a stable atom." },
  { id: "u2-decay-changes-not-vanishes", statement: "Know that a decay changes a nucleus into a different one; nothing simply vanishes.", misconception: "Decay means the atom disappears." },
  { id: "u2-natural-sources", statement: "Name natural places radioactivity and radiation come from: rocks and soil, radon in air, food and the body, space.", misconception: "Radioactivity is something humans created, and it only exists in nuclear facilities." },
  { id: "u2-not-always-dangerous", statement: "Know that radioactive does not automatically mean dangerous; it depends on the type, the amount and how it reaches the body.", misconception: "Radioactive means automatically dangerous." },
].map((o, i) => ({ ...o, misconception: o.misconception || undefined, unitId: UNIT_ID, position: i }));

/**
 * Candidates: every one is unverified until opened and checked by a person.
 * Three references the lessons also use are owned by unit 1 (ref-openstax-up3-ch10, ref-becquerel-1896,
 * ref-potassium-40, ref-iaea-isotopes) and are not listed again here.
 */
export const references = [
  { id: "ref-iaea-decay", kind: "official", publisher: "IAEA", title: "IAEA material on radioactive decay and half-life", authors: "", year: "", url: "", note: "Candidate. Definition of radioactive decay and half-life; alpha as two protons and two neutrons. The spec names IAEA-TECDOC-1363 (te_1363_web.pdf) but that came from a search summary: open it, confirm it covers radioactive decay, record the exact title and URL, then mark verified." },
  { id: "ref-iaea-glossary", kind: "official", publisher: "IAEA", title: "IAEA Nuclear Safety and Security Glossary", authors: "", year: "", url: "", note: "Candidate. Definitions of beta-minus, gamma and radionuclide. Open the glossary, record the entries used and the URL, then mark verified." },
  { id: "ref-iaea-radiation-types", kind: "official", publisher: "IAEA", title: "IAEA material on alpha, beta and gamma radiation", authors: "", year: "", url: "", note: "Candidate. Particulate versus electromagnetic radiation. Open the page, record its exact title and URL, then mark verified." },
  { id: "ref-nrc-decay-series", kind: "official", publisher: "U.S. Nuclear Regulatory Commission", title: "NRC material on natural decay series and natural radionuclides", authors: "", year: "", url: "", note: "Candidate. The spec names NUREG/SR-1501 (number from a search summary). Check that the uranium-238 series ends in lead-206, the thorium-232 series in lead-208, and that potassium-40 is a natural radionuclide." },
  { id: "ref-background-radiation", kind: "official", publisher: "IAEA and UNSCEAR", title: "Background radiation explainers (IAEA, UNSCEAR)", authors: "", year: "", url: "", note: "Candidate. Natural radionuclides, cosmic radiation and radon. The spec also lists INIS record 111v8-1e515. Open each, record titles and URLs, then mark verified." },
];

export const unitReferenceIds = ["ref-openstax-up3-ch10", "ref-iaea-decay", "ref-iaea-glossary"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LESSON_SURFACES = ["lesson", "practice", "review"];
const BANK_SURFACES = ["practice", "checkpoint", "review"];

const opts = (...pairs) => pairs.map(([id, label, note, art]) => ({ id, label, ...(note ? { note } : {}), ...(art ? { art } : {}) }));

/** Items collected while building lessons plus the extra bank items. */
const items = [];
const addItem = (id, objectiveId, type, data, { difficulty = 1, surfaces = LESSON_SURFACES, referenceIds = [] } = {}) => {
  items.push({ id, objectiveId, type, data, difficulty, surfaces, referenceIds });
  return id;
};

const teach = (id, type, data, tier = "core") => ({ id, kind: "teach", type, tier, scored: false, data });
const itemCard = (id, itemId, { scored = true, tier = "core" } = {}) => ({ id, kind: "item", type: "item", tier, scored, itemId, data: {} });
const sim = (id, type, data) => ({ id, kind: "sim", type, tier: "core", scored: false, data });

const fig = (f, caption) => ({ figure: { ...f, ...(caption ? { caption } : {}) } });

const PREDICT_NOTE = "Your guess is not scored. The answer comes later in the lesson.";

const DECAY = ["ref-iaea-decay"];
const RADIATION = ["ref-iaea-radiation-types"];
const NATURAL = ["ref-background-radiation"];

// ---------------------------------------------------------------------------
// L1: Why do nuclei decay?
// An unstable nucleus changes by itself. When one particular nucleus changes cannot be predicted.
// ---------------------------------------------------------------------------

const L1 = "why-nuclei-decay";

addItem("u2-l1-predict-alone", "u2-spontaneous", "predict", {
  input: "choice", prompt: "An unstable nucleus is left alone for a very long time. What happens?",
  options: opts(["same", "It stays the same for ever"], ["itself", "It can change by itself"], ["trigger", "Someone has to trigger it"], ["gone", "It disappears at once"]),
  answer: "itself",
  explanation: PREDICT_NOTE,
}, { surfaces: ["lesson"] });

const changeHot = changeHotspot();
addItem("u2-l1-hotspot-change", "u2-spontaneous", "hotspot", {
  prompt: "Which nucleus can change by itself? Tap it.", scene: changeHot.scene, targets: changeHot.targets, answer: "c14", animateOnCorrect: true,
  explanation: "Carbon-14 is unstable, so it can change by itself. Carbon-12 and oxygen-16 are stable and stay as they are.",
}, { referenceIds: DECAY });

addItem("u2-l1-tom-person", "u2-spontaneous", "true_or_myth", {
  statement: "A radioactive atom needs a person to make it decay.",
  answer: "myth",
  explanation: "Myth. Nobody has to make an unstable nucleus change. It changes by itself.",
}, { referenceIds: DECAY });

addItem("u2-l1-tom-chance", "u2-random-single", "true_or_myth", {
  statement: "You can say how likely a nucleus is to change, but not exactly when it will.",
  answer: "true",
  explanation: "True. An unstable nucleus has a chance of changing, but when one particular nucleus changes cannot be predicted.",
}, { referenceIds: DECAY });

addItem("u2-l1-choice-next", "u2-random-single", "choice", {
  prompt: "Look at a group of unstable nuclei. Could you tell in advance which one will change next?",
  options: opts(
    ["no", "No: it is random for each nucleus"],
    ["first", "Yes: the one at the front always goes first", "Position does not matter. Each unstable nucleus has the same chance."],
    ["oldest", "Yes: the oldest one goes first", "A nucleus does not get older or due. It has the same chance every time."],
  ),
  answer: "no",
  explanation: "No. When one particular nucleus changes cannot be predicted. Each unstable nucleus has the same chance, so you cannot call the next one.",
}, { referenceIds: DECAY });

addItem("u2-l1-fill-parent", "u2-parent-daughter", "fill", {
  mode: "bank", prompt: "The nucleus that decays is the ___.",
  bank: [{ id: "parent", label: "parent" }, { id: "daughter", label: "daughter" }, { id: "radiation", label: "radiation" }],
  answer: "parent",
  explanation: "The nucleus that decays is the parent. The nucleus it becomes is the daughter.",
}, { referenceIds: DECAY });

addItem("u2-l1-match-names", "u2-parent-daughter", "match", {
  prompt: "Match each name to what it means.",
  pairs: [
    { id: "parent", left: "Parent", right: "The nucleus that decays" },
    { id: "daughter", left: "Daughter", right: "The nucleus it becomes" },
    { id: "radiation", left: "Radiation", right: "What comes out when it changes" },
  ],
  explanation: "The parent is the nucleus that decays. The daughter is the nucleus it becomes. Radiation is what comes out.",
}, { referenceIds: DECAY });

addItem("u2-l1-choice-why", "u2-spontaneous", "choice", {
  prompt: "Why can a radioactive nucleus change even when nobody does anything to it?",
  options: opts(
    ["unstable", "It is unstable, so it can change on its own"],
    ["trigger", "Someone must trigger it", "Nobody has to trigger it. Unstable nuclei change by themselves."],
    ["heat", "It needs heat first", "Heating and cooling hardly affect radioactive decay."],
    ["used", "It is being used up", "Nothing is used up. The nucleus changes into another nucleus."],
  ),
  answer: "unstable",
  explanation: "An unstable nucleus can change on its own. That is what radioactive means.",
}, { referenceIds: DECAY });

const lesson1 = {
  lesson: { id: L1, unitId: UNIT_ID, title: "Why do nuclei decay?", description: "Some nuclei change all by themselves, and nobody can say when. You will meet the parent and the daughter, and find out why this is a natural process.", estimatedMinutes: 5, xpReward: 50, teaches: ["u2-spontaneous", "u2-random-single", "u2-parent-daughter"], reliesOn: ["u1-stable-unstable", "u1-unstable-changes"] },
  references: [
    { referenceId: "ref-iaea-decay", supports: "Radioactive decay is spontaneous; parent and daughter nuclides." },
    { referenceId: "ref-iaea-glossary", supports: "Radionuclide; what radioactive means." },
    { referenceId: "ref-openstax-up3-ch10", supports: "Radioactive decay is random for one nucleus and regular for many." },
  ],
  cards: [
    itemCard("c01", "u2-l1-predict-alone", { scored: false }),
    teach("c02", "explain", { title: "Stable and unstable", body: "A stable nucleus can stay as it is. An unstable nucleus can change into another state. A nucleus that can change like this is called [[radioactivity|radioactive]].", ...fig(simpleStableUnstable()) }),
    teach("c03", "explain", { title: "It changes by itself", body: "An unstable nucleus can change all by itself. Nobody has to push it. The nucleus that changes is the [[parent-nuclide|parent]]. The nucleus it becomes is the [[daughter-nuclide|daughter]]. The change gives off [[radiation]].", ...fig(parentDaughter()) }),
    itemCard("c04", "u2-l1-hotspot-change"),
    itemCard("c05", "u2-l1-tom-person"),
    teach("c06", "reveal", { predictCardId: "c01", title: "Left alone, it can still change", body: "An unstable nucleus can change all by itself, even when nobody does anything to it. It does not vanish. It turns into a different nucleus and gives off radiation.", ...fig(parentDaughter()) }),
    teach("c07", "explain", { title: "Random for one, regular for many", body: "You can know that a nucleus has a chance of changing. You cannot say when. Look at one nucleus and its moment is a surprise. A whole group is different, and you will see how in a later lesson.", ...fig(randomOne()) }),
    itemCard("c09", "u2-l1-choice-next"),
    itemCard("c10", "u2-l1-tom-chance"),
    itemCard("c11", "u2-l1-fill-parent"),
    itemCard("c12", "u2-l1-match-names"),
    itemCard("c13", "u2-l1-choice-why"),
    teach("c14", "explain", { title: "Go deeper: what can change it?", body: "An unstable nucleus is called a [[radionuclide]]. When it changes, a different nuclide can result, and energy leaves as particles or electromagnetic radiation. Heating, cooling and chemistry hardly change how fast this happens. In a flame or in ice, it is still unstable.", ...fig(flameAndIce()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L2: Alpha, beta and gamma
// Alpha and beta are particles. Gamma is electromagnetic radiation. Three different things.
// ---------------------------------------------------------------------------

const L2 = "alpha-beta-gamma";

addItem("u2-l2-predict-release", "u2-recognise-radiation", "predict", {
  input: "choice", prompt: "When a radioactive nucleus changes, what can it release?",
  options: opts(["particle", "Only a particle"], ["energy", "Only energy"], ["both", "A particle, energy, or both"], ["nothing", "Nothing at all"]),
  answer: "both",
  explanation: PREDICT_NOTE,
}, { surfaces: ["lesson"] });

addItem("u2-l2-choice-alpha", "u2-recognise-radiation", "choice", {
  prompt: "Which kind of radiation is made of 2 protons and 2 neutrons?",
  options: opts(
    ["alpha", "Alpha"],
    ["beta", "Beta", "A beta particle is a fast electron."],
    ["gamma", "Gamma", "Gamma is electromagnetic radiation. It is not made of protons and neutrons."],
  ),
  answer: "alpha",
  explanation: "An alpha particle is 2 protons and 2 neutrons stuck together, the nucleus of a helium atom.",
}, { referenceIds: RADIATION });

addItem("u2-l2-match-kinds", "u2-recognise-radiation", "match", {
  prompt: "Match each kind of radiation to what it is.",
  pairs: [
    { id: "alpha", left: "Alpha", right: "2 protons and 2 neutrons" },
    { id: "beta", left: "Beta", right: "A fast electron" },
    { id: "gamma", left: "Gamma", right: "High-energy electromagnetic radiation" },
  ],
  explanation: "Alpha is 2 protons and 2 neutrons. Beta is a fast electron. Gamma is high-energy electromagnetic radiation.",
}, { referenceIds: RADIATION });

addItem("u2-l2-tom-same", "u2-particle-or-wave", "true_or_myth", {
  statement: "Alpha, beta and gamma are three versions of the same thing.",
  answer: "myth",
  explanation: "Myth. Alpha and beta are different particles, and gamma is electromagnetic radiation, not a particle. They are three different things.",
}, { referenceIds: RADIATION });

addItem("u2-l2-tom-pieces", "u2-particle-or-wave", "true_or_myth", {
  statement: "Gamma radiation is made of tiny pieces of the nucleus.",
  answer: "myth",
  explanation: "Myth. Gamma is electromagnetic radiation, like light but far more energetic. It is not made of pieces of the nucleus.",
}, { referenceIds: RADIATION });

addItem("u2-l2-tom-light", "u2-particle-or-wave", "true_or_myth", {
  statement: "Visible light is electromagnetic radiation, just like gamma rays.",
  answer: "true",
  explanation: "True. Light and gamma rays are both electromagnetic radiation. Gamma rays carry far more energy.",
}, { referenceIds: RADIATION });

addItem("u2-l2-sort-kind", "u2-particle-or-wave", "sort", {
  prompt: "Is it a particle, or electromagnetic radiation? Sort each one.",
  buckets: [{ id: "particle", label: "A particle", icon: "AqParticle" }, { id: "em", label: "Electromagnetic radiation", icon: "AqWave" }],
  items: [
    { id: "alpha", label: "Alpha", bucket: "particle" },
    { id: "beta", label: "Beta", bucket: "particle" },
    { id: "gamma", label: "Gamma", bucket: "em" },
    { id: "light", label: "Visible light", bucket: "em" },
  ],
  explanation: "Alpha and beta are particles. Gamma and visible light are electromagnetic radiation, and gamma carries far more energy.",
}, { referenceIds: RADIATION });

addItem("u2-l2-choice-electron", "u2-recognise-radiation", "choice", {
  prompt: "A fast electron is released from a nucleus. What is this radiation called?",
  options: opts(
    ["beta", "Beta"],
    ["alpha", "Alpha", "Alpha is 2 protons and 2 neutrons, not an electron."],
    ["gamma", "Gamma", "Gamma is electromagnetic radiation, not a particle."],
  ),
  answer: "beta",
  explanation: "A fast electron released from a nucleus is a beta particle.",
}, { referenceIds: RADIATION });

addItem("u2-l2-choice-gamma-element", "u2-particle-or-wave", "choice", {
  prompt: "A gamma ray leaves a nucleus. Does the nucleus turn into a different element?",
  options: opts(
    ["no", "No: a gamma ray is not a particle, so no protons leave"],
    ["yes-protons", "Yes: it loses protons", "Gamma is electromagnetic radiation. No protons or neutrons leave."],
    ["yes-always", "Yes: every decay changes the element", "Gamma carries energy away and does not change the number of protons."],
  ),
  answer: "no",
  explanation: "No. Gamma is electromagnetic radiation, not a particle, so no protons or neutrons leave. The nucleus stays the same element.",
}, { difficulty: 2, referenceIds: RADIATION });

const lesson2 = {
  lesson: { id: L2, unitId: UNIT_ID, title: "Alpha, beta and gamma", description: "When a nucleus changes, something comes out. You will meet the three kinds, alpha, beta and gamma, and learn that they are three different things.", estimatedMinutes: 5, xpReward: 50, teaches: ["u2-particle-or-wave", "u2-recognise-radiation"], reliesOn: ["u2-parent-daughter"] },
  references: [
    { referenceId: "ref-iaea-radiation-types", supports: "Alpha and beta are particles; gamma is electromagnetic radiation." },
    { referenceId: "ref-iaea-glossary", supports: "Definitions of beta-minus and gamma." },
    { referenceId: "ref-iaea-decay", supports: "Alpha as two protons and two neutrons." },
  ],
  cards: [
    itemCard("c01", "u2-l2-predict-release", { scored: false }),
    teach("c02", "explain", { title: "Three things can come out", body: "When a nucleus changes, it can release [[alpha-particle|alpha]] particles, [[beta-particle|beta]] particles or [[gamma-ray|gamma]] rays. They are three different things. Alpha and beta are particles. Gamma is not.", ...fig(threeKinds()) }),
    teach("c03", "explain", { title: "Alpha: a chunk", body: "An alpha particle is made of 2 protons and 2 neutrons stuck together. It is the nucleus of a helium atom, with no electrons. It is a big, chunky particle.", ...fig(alphaFigure()) }),
    itemCard("c04", "u2-l2-choice-alpha"),
    teach("c05", "explain", { title: "Beta: a fast electron", body: "A beta particle is a fast-moving particle released in some decays. In the basic picture, it is a fast electron. It is far lighter than an alpha particle.", ...fig(betaFigure()) }),
    teach("c06", "explain", { title: "Gamma: not a particle", body: "Gamma radiation is not a particle. It is [[electromagnetic-radiation|electromagnetic radiation]], like light but far more energetic. Light is electromagnetic radiation too.", ...fig(gammaFigure()) }),
    itemCard("c07", "u2-l2-match-kinds"),
    sim("c08", "radiation-id", {
      task: "Read each clue and pick the kind of radiation. Then watch it leave.",
      cases: [
        { id: "one", answer: "alpha", clue: "A chunk of 2 protons and 2 neutrons leaves the nucleus." },
        { id: "two", answer: "beta", clue: "A fast electron leaves the nucleus." },
        { id: "three", answer: "gamma", clue: "High-energy electromagnetic radiation leaves the nucleus." },
      ],
      goal: { all: true }, hint: "Think about what each kind is made of.", objectives: ["u2-recognise-radiation"],
    }),
    itemCard("c09", "u2-l2-tom-same"),
    itemCard("c10", "u2-l2-tom-pieces"),
    itemCard("c11", "u2-l2-tom-light"),
    itemCard("c12", "u2-l2-sort-kind"),
    itemCard("c13", "u2-l2-choice-electron"),
    itemCard("c14", "u2-l2-choice-gamma-element"),
    teach("c15", "explain", { title: "Go deeper: what changes", body: "Alpha and beta change the make-up of the nucleus, so a different nucleus is left. In beta decay a neutron changes into a proton and an electron is emitted, along with a tiny particle left out here. Gamma releases extra energy and changes neither the protons nor the neutrons.", ...fig(whatChanges()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L3: Half-life
// Half-life describes a group, not a timer in each nucleus. 100, 50, 25, 12, always "about".
// ---------------------------------------------------------------------------

const L3 = "half-life";

addItem("u2-l3-predict-hundred", "u2-half-life-meaning", "predict", {
  input: "choice", prompt: "There are 100 radioactive nuclei. After one half-life, what happens?",
  options: opts(
    ["one", "One nucleus disappears"],
    ["half", "Every atom becomes half as radioactive"],
    ["about-half", "About half of the nuclei have decayed"],
    ["gone", "All the radioactivity is gone"],
  ),
  answer: "about-half",
  explanation: PREDICT_NOTE,
}, { surfaces: ["lesson"] });

addItem("u2-l3-choice-meaning", "u2-half-life-meaning", "choice", {
  prompt: "What does half-life mean?",
  options: opts(
    ["group", "The time for about half of a large group of nuclei to decay"],
    ["one", "The time for one atom to decay", "Half-life describes a group, not one atom."],
    ["half", "The time for each atom to lose half of itself", "Atoms are not cut in half. About half of the nuclei have decayed."],
    ["gone", "The time until the sample is no longer radioactive", "Some radioactivity is still there after one half-life."],
  ),
  answer: "group",
  explanation: "Half-life is the time for about half of a large group of radioactive nuclei to decay.",
}, { referenceIds: DECAY });

addItem("u2-l3-fill-pattern", "u2-half-life-pattern", "fill", {
  mode: "bank", prompt: "The pattern is 100, 50, 25, and then about ___.",
  bank: [{ id: "12", label: "12" }, { id: "20", label: "20" }, { id: "0", label: "0" }],
  answer: "12",
  explanation: "Each half-life takes about half of what is left. Half of 25 is about 12.",
}, { referenceIds: DECAY });

addItem("u2-l3-match-halves", "u2-half-life-pattern", "match", {
  prompt: "Start with 100 nuclei. Match the number of half-lives to about how many are left.",
  pairs: [
    { id: "one", left: "1 half-life", right: "About 50" },
    { id: "two", left: "2 half-lives", right: "About 25" },
    { id: "three", left: "3 half-lives", right: "About 12" },
  ],
  explanation: "Each half-life takes about half of what is left: about 50, then about 25, then about 12.",
}, { referenceIds: DECAY });

addItem("u2-l3-tom-gone", "u2-half-life-pattern", "true_or_myth", {
  statement: "After one half-life, the radioactivity is gone.",
  answer: "myth",
  explanation: "Myth. After one half-life, about half of the nuclei are still unstable. 100 becomes about 50, then about 25, and so on. It fades, but it is not gone after one half-life.",
}, { referenceIds: DECAY });

addItem("u2-l3-tom-timer", "u2-half-life-group", "true_or_myth", {
  statement: "A radioactive atom always waits exactly one half-life before it decays.",
  answer: "myth",
  explanation: "Myth. Half-life describes a group, not a timer in each atom. One nucleus might change soon or much later. Only the group follows the pattern.",
}, { referenceIds: DECAY });

addItem("u2-l3-tom-crowd", "u2-half-life-group", "true_or_myth", {
  statement: "In a large group of nuclei, you can predict that about half will change in one half-life.",
  answer: "true",
  explanation: "True. One nucleus is unpredictable, but a large group follows a pattern.",
}, { referenceIds: DECAY });

addItem("u2-l3-choice-left", "u2-half-life-meaning", "choice", {
  prompt: "A sample has gone through one half-life. Which statement is true?",
  options: opts(
    ["about", "About half of the nuclei have decayed, and the rest were not cut in half"],
    ["each", "Every nucleus has lost half of itself", "Nuclei are not cut in half. About half of them have decayed and the others have not changed."],
    ["weaker", "Every nucleus is now half as radioactive", "Each nucleus is either still unstable or has already changed."],
  ),
  answer: "about",
  explanation: "About half of the nuclei have decayed. The rest were not cut in half.",
}, { referenceIds: DECAY });

addItem("u2-l3-choice-eighty", "u2-half-life-pattern", "choice", {
  prompt: "A sample starts with 80 nuclei. After two half-lives, about how many have not changed?",
  options: opts(["10", "About 10", "Two half-lives is two halvings: 80, 40, 20."], ["20", "About 20"], ["40", "About 40", "About 40 are left after one half-life, not two."], ["60", "About 60", "That is far more than half of 80 after even one half-life."]),
  answer: "20",
  explanation: "80 becomes about 40 after one half-life and about 20 after two.",
}, { difficulty: 2, referenceIds: DECAY });

addItem("u2-l3-choice-buster", "u2-half-life-group", "choice", {
  prompt: "Which statement about half-life is true?",
  options: opts(
    ["group", "It describes how a group of nuclei decreases over time"],
    ["timer", "It is a timer that runs inside each atom", "Half-life describes a group, not a timer in each atom."],
    ["gone", "After one half-life the radioactivity is completely gone", "About half of the nuclei are still unstable."],
    ["forever", "A radioactive material stays radioactive for ever", "Each radioactive material fades. Some do it fast and some very slowly."],
  ),
  answer: "group",
  explanation: "Half-life describes how quickly a group of radioactive nuclei decreases. It is not a timer in each atom, and the radioactivity fades without being gone after one half-life.",
}, { difficulty: 2, referenceIds: DECAY });

const lesson3 = {
  lesson: { id: L3, unitId: UNIT_ID, title: "Half-life", description: "How fast does a group of radioactive nuclei fade? You will look at 100 unstable nuclei, find the pattern, and see why half-life is about a crowd and not a timer inside each atom.", estimatedMinutes: 6, xpReward: 60, teaches: ["u2-half-life-meaning", "u2-half-life-pattern", "u2-half-life-group"], reliesOn: ["u2-random-single"] },
  references: [
    { referenceId: "ref-iaea-decay", supports: "Definition of half-life." },
    { referenceId: "ref-openstax-up3-ch10", supports: "Half-life and exponential decay; half-lives vary enormously." },
    { referenceId: "ref-iaea-glossary", supports: "Radionuclide and half-life examples (candidates to verify)." },
  ],
  cards: [
    itemCard("c01", "u2-l3-predict-hundred", { scored: false }),
    teach("c03", "reveal", { predictCardId: "c01", title: "About half have changed", body: "After one half-life, about half of the nuclei have decayed. The rest were not cut in half. The time it takes for a group to fall to about half is its [[half-life]].", ...fig(halfLifeGrid()) }),
    itemCard("c04", "u2-l3-choice-meaning"),
    itemCard("c05", "u2-l3-fill-pattern"),
    teach("c06", "explain", { title: "The numbers are a pattern", body: "Start with 100. After one half-life, about 50 are left. After two, about 25. Then about 12, then about 6. It says about every time, because each count is a pattern and not an exact number.", ...fig(halfLifeBars()) }),
    itemCard("c16", "u2-l3-match-halves"),
    itemCard("c07", "u2-l3-tom-gone"),
    teach("c08", "explain", { title: "A group, not a timer", body: "Remember the first lesson: you cannot say when one nucleus will change. A big group is different, because it follows a pattern. Half-life describes the whole group. It is not a timer inside each atom.", ...fig(groupNotTimer()) }),
    itemCard("c09", "u2-l3-tom-timer"),
    itemCard("c10", "u2-l3-tom-crowd"),
    itemCard("c11", "u2-l3-choice-left"),
    teach("c12", "explain", { title: "Some fade fast, some very slowly", body: "Half-lives are very different. Some are a fraction of a second. Others are billions of years. So some radioactive materials fade quickly and others take a very long time. You do not need to memorise these.", ...fig(halfLifeLadder()) }),
    itemCard("c13", "u2-l3-choice-eighty"),
    itemCard("c14", "u2-l3-choice-buster"),
    teach("c15", "explain", { title: "Go deeper: the decay curve", body: "Plot the nuclei left against time and you get a curve that halves every half-life. It gets close to zero without a sharp end. This is called exponential decay. Each material has its own decay constant, a number for how fast it decays.", ...fig(decayCurve()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L4: Decay chains
// The daughter can be unstable too. A decay changes a nucleus into a different one; nothing vanishes.
// ---------------------------------------------------------------------------

const L4 = "decay-chains";

addItem("u2-l4-predict-daughter", "u2-decay-chain", "predict", {
  input: "choice", prompt: "A nucleus decays into a daughter. Is the daughter always stable?",
  options: opts(["yes", "Yes, every time"], ["no", "No, sometimes it can be unstable too"]),
  answer: "no",
  explanation: PREDICT_NOTE,
}, { surfaces: ["lesson"] });

addItem("u2-l4-tom-stable", "u2-decay-chain", "true_or_myth", {
  statement: "Every radioactive decay immediately creates a stable atom.",
  answer: "myth",
  explanation: "Myth. The daughter can be unstable too, and then it decays again. A chain only ends at a stable nucleus.",
}, { referenceIds: DECAY });

addItem("u2-l4-tom-vanish", "u2-decay-changes-not-vanishes", "true_or_myth", {
  statement: "Radioactive decay means the atom just disappears.",
  answer: "myth",
  explanation: "Myth. The nucleus changes into a different nucleus. Nothing simply vanishes.",
}, { referenceIds: DECAY });

addItem("u2-l4-tom-different", "u2-decay-changes-not-vanishes", "true_or_myth", {
  statement: "When a nucleus decays, it changes into a different nucleus.",
  answer: "true",
  explanation: "True. The parent changes into a daughter, which is a different nucleus.",
}, { referenceIds: DECAY });

addItem("u2-l4-order-chain", "u2-decay-chain", "order", {
  prompt: "Put the chain in order, from the start to the end.",
  items: [{ id: "parent", label: "Parent" }, { id: "daughter", label: "Daughter" }, { id: "next", label: "Next generation" }, { id: "stable", label: "Stable" }],
  explanation: "A chain starts with the parent, goes through the daughter and the next generation, and ends at a stable nucleus.",
}, { referenceIds: DECAY });

addItem("u2-l4-choice-next", "u2-decay-chain", "choice", {
  prompt: "A chain goes Parent, then Daughter. What comes next if the daughter is unstable?",
  options: opts(
    ["next", "The next generation, another nucleus"],
    ["stable", "Always a stable nucleus", "The next nucleus can be unstable too. The chain only ends at a stable one."],
    ["parent", "The parent again", "A decay does not run backwards."],
  ),
  answer: "next",
  explanation: "An unstable daughter decays again into the next generation. The chain goes on until a stable nucleus is reached.",
}, { referenceIds: DECAY });

addItem("u2-l4-choice-finished", "u2-decay-chain", "choice", {
  prompt: "A sample has a nucleus whose daughter is also unstable. After the first decay, is the sample finished changing?",
  options: opts(
    ["no", "No: the daughter can decay too"],
    ["yes-stable", "Yes: a decay always ends in a stable nucleus", "The daughter is unstable, so it can decay again."],
    ["yes-gone", "Yes: the atom has disappeared", "Nothing vanishes. The nucleus changed into another nucleus."],
  ),
  answer: "no",
  explanation: "No. The daughter is unstable, so the sample can keep changing along the chain.",
}, { difficulty: 2, referenceIds: DECAY });

const lesson4 = {
  lesson: { id: L4, unitId: UNIT_ID, title: "Decay chains", description: "One decay is not always the end. You will follow a nucleus that changes again and again, and see that every change makes a different nucleus and nothing simply vanishes.", estimatedMinutes: 4, xpReward: 50, teaches: ["u2-decay-chain", "u2-decay-changes-not-vanishes"], reliesOn: ["u2-parent-daughter"] },
  references: [
    { referenceId: "ref-iaea-decay", supports: "A daughter nuclide can be radioactive and decay in turn." },
    { referenceId: "ref-nrc-decay-series", supports: "Uranium-238 and thorium-232 decay series (optional card)." },
  ],
  cards: [
    itemCard("c01", "u2-l4-predict-daughter", { scored: false }),
    teach("c02", "explain", { title: "Not always finished", body: "A nucleus decays into a daughter. The daughter can be unstable too. Then it decays again. The parent is the nucleus that decays. The daughter is the nucleus it becomes. Not every daughter is the end.", ...fig(daughterUnstable()) }),
    sim("c03", "decay-chain", {
      task: "Tap the unstable nucleus to make it change. Keep going until it is stable.",
      nodes: [
        { id: "parent", label: "Parent", state: "unstable" },
        { id: "daughter", label: "Daughter", state: "unstable" },
        { id: "next", label: "Next generation", state: "unstable" },
        { id: "stable", label: "Stable", state: "stable" },
      ],
      goal: { reach: "stable" }, hint: "If the app says it isn't finished yet, tap again.", objectives: ["u2-decay-chain"],
    }),
    teach("c04", "reveal", { predictCardId: "c01", title: "A decay chain", body: "A daughter can be unstable too. A [[decay-chain|decay chain]] is a sequence of radioactive decays in which one nucleus changes into another, which may decay again. It ends at a stable nucleus.", ...fig(chainFigure()) }),
    itemCard("c05", "u2-l4-tom-stable"),
    itemCard("c06", "u2-l4-tom-vanish"),
    itemCard("c07", "u2-l4-tom-different"),
    itemCard("c08", "u2-l4-order-chain"),
    itemCard("c09", "u2-l4-choice-next"),
    teach("c10", "explain", { title: "A whole chain", body: "Zoom out. One unstable nucleus can be the start of a whole chain of decays. Each step makes a new nucleus. The chain stops only when a stable nucleus is reached.", ...fig(chainZoomOut()) }),
    itemCard("c11", "u2-l4-choice-finished"),
    teach("c12", "explain", { title: "Go deeper: real chains", body: "Real decay chains exist in nature. The uranium-238 chain ends in stable lead-206. The thorium-232 chain ends in stable lead-208. Some steps can branch in more than one way. There is nothing to memorise.", ...fig(realChains()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L5: Radioactivity is natural
// Rocks, air, food, the body and space. Radioactive is not automatically dangerous.
// ---------------------------------------------------------------------------

const L5 = "radioactivity-is-natural";

addItem("u2-l5-predict-where", "u2-natural-sources", "predict", {
  input: "choice", prompt: "Which of these can have radioactive material in it?",
  options: opts(["plant", "A nuclear power plant"], ["hospital", "A hospital"], ["rocks", "Rocks and food"], ["body", "Your own body"], ["all", "All of these"]),
  answer: "all",
  explanation: PREDICT_NOTE,
}, { surfaces: ["lesson"] });

addItem("u2-l5-choice-radon", "u2-natural-sources", "choice", {
  prompt: "Where does radon come from?",
  options: opts(
    ["ground", "From radioactive materials in the ground"],
    ["plants", "Only from nuclear power plants", "Radon is made naturally in the ground. It is in the air everywhere."],
    ["people", "From a gas that people make and sell", "Radon is natural. It comes from decay in rocks and soil."],
  ),
  answer: "ground",
  explanation: "Radioactive materials in the ground, such as uranium and thorium, produce radon. It is natural.",
}, { referenceIds: NATURAL });

addItem("u2-l5-choice-space", "u2-natural-sources", "choice", {
  prompt: "Which of these arrives on Earth from space?",
  options: opts(
    ["cosmic", "Cosmic radiation"],
    ["radon", "Radon gas", "Radon comes from the ground."],
    ["k40", "Potassium-40 in food", "Potassium-40 is in food and in the body."],
  ),
  answer: "cosmic",
  explanation: "Cosmic radiation arrives from space all the time.",
}, { referenceIds: NATURAL });

addItem("u2-l5-tom-facilities", "u2-natural-sources", "true_or_myth", {
  statement: "Radioactive materials are only found in nuclear facilities.",
  answer: "myth",
  explanation: "Myth. Radioactive materials are in rocks, soil, air, food and your own body. Nuclear facilities are only one place.",
}, { referenceIds: NATURAL });

addItem("u2-l5-order-first", "u2-natural-sources", "order", {
  prompt: "Put these in order, from first to last.",
  items: [
    { id: "nature", label: "Radioactive materials are in the ground" },
    { id: "found", label: "Becquerel notices a fogged photographic plate" },
    { id: "made", label: "People learn to make radioactive materials" },
  ],
  explanation: "Radioactivity was in nature first. Becquerel found it in 1896, and only later did people learn to make radioactive materials.",
}, { difficulty: 2, referenceIds: ["ref-becquerel-1896", "ref-iaea-decay"] });

addItem("u2-l5-choice-dangerous", "u2-not-always-dangerous", "choice", {
  prompt: "If something is radioactive, is it automatically dangerous?",
  options: opts(
    ["not", "Not necessarily"],
    ["always", "Yes: anything radioactive is dangerous", "Bananas and your body are radioactive. It depends on the type, the amount and how it reaches the body."],
    ["never", "No: radioactive things are always harmless", "Some radioactive things can be harmful. It depends."],
  ),
  answer: "not",
  explanation: "Radioactive does not automatically mean dangerous. It depends on the type of radiation, the amount and how it reaches the body.",
}, { referenceIds: NATURAL });

addItem("u2-l5-choice-decides", "u2-not-always-dangerous", "choice", {
  prompt: "What helps decide whether radiation matters?",
  options: opts(
    ["three", "The type, the amount and how it reaches the body"],
    ["only-radioactive", "Only whether the material is radioactive", "That is not enough. It depends on more than that."],
    ["only-old", "Only how old the material is", "Age alone does not decide it."],
  ),
  answer: "three",
  explanation: "The type of radiation, how much there is and how it reaches the body all matter. Radioactive alone does not tell you.",
}, { difficulty: 2, referenceIds: NATURAL });

addItem("u2-l5-sort-world", "u2-natural-sources", "sort", {
  prompt: "Which kind is it? Natural radioactivity, cosmic radiation, or made by people? Sort each one.",
  buckets: [{ id: "natural", label: "Natural radioactivity", icon: "AqMountain" }, { id: "cosmic", label: "Cosmic radiation", icon: "AqCosmic" }, { id: "people", label: "Made by people", icon: "AqFlask" }],
  items: [
    { id: "banana", label: "A banana", bucket: "natural" },
    { id: "rock", label: "A rock", bucket: "natural" },
    { id: "body", label: "The human body", bucket: "natural" },
    { id: "plane", label: "An airplane at high altitude", bucket: "cosmic" },
    { id: "reactor", label: "A nuclear reactor", bucket: "people" },
    { id: "hospital", label: "A hospital radiation source", bucket: "people" },
  ],
  explanation: "A banana, a rock and your body hold natural radioactivity. High up, an airplane gets more cosmic radiation. Reactors and hospital sources are made by people. Radiation is part of the world, not only inside nuclear facilities.",
}, { difficulty: 2, referenceIds: NATURAL });

const lesson5 = {
  lesson: { id: L5, unitId: UNIT_ID, title: "Radioactivity is natural", description: "Radioactivity was here long before people. You will find it in rocks, air, food, your own body and space, hear how it was discovered, and see why radioactive does not automatically mean dangerous.", estimatedMinutes: 5, xpReward: 50, teaches: ["u2-natural-sources", "u2-not-always-dangerous"], reliesOn: ["u1-unstable-changes", "u2-decay-chain"] },
  references: [
    { referenceId: "ref-background-radiation", supports: "Natural radionuclides, cosmic radiation and radon." },
    { referenceId: "ref-becquerel-1896", supports: "The discovery of radioactivity in a natural mineral." },
    { referenceId: "ref-potassium-40", supports: "Potassium-40 in food and the body." },
    { referenceId: "ref-nrc-decay-series", supports: "Natural decay series and natural radionuclides (optional card)." },
  ],
  cards: [
    itemCard("c01", "u2-l5-predict-where", { scored: false }),
    teach("c02", "explain", { title: "Rocks and soil", body: "Rocks and soil contain some natural radioactive materials, such as uranium and thorium. This is why the ground gives off a little radiation. It has been this way since long before people.", ...fig(rocksSoil()) }),
    teach("c03", "explain", { title: "In the air", body: "Radioactive materials in the ground can produce [[radon]], a radioactive gas. Radon is in the air outside, and it can get into buildings.", ...fig(radonHouse()) }),
    itemCard("c04", "u2-l5-choice-radon"),
    teach("c05", "explain", { title: "Food and your body", body: "Your body contains a little natural radioactive potassium, called [[potassium-40|potassium-40]]. So do many foods, such as bananas. It is a tiny share of all your potassium.", ...fig(foodBody()) }),
    teach("c06", "explain", { title: "From space", body: "Earth is hit by [[cosmic-radiation|cosmic radiation]] from space all the time. It is one more part of the [[background-radiation|radiation around us]].", ...fig(cosmicRays()) }),
    itemCard("c07", "u2-l5-choice-space"),
    itemCard("c08", "u2-l5-tom-facilities"),
    teach("c09", "story", { speaker: "npc-hal", title: "A discovery that wasn't supposed to happen", tag: "1896", body: "[[henri-becquerel|Henri Becquerel]] left a uranium mineral on a wrapped photographic plate and found it fogged, even with no sunlight. Radioactivity was found in a natural mineral, long before people made any nuclear technology.", ...fig(becquerelPlate()) }),
    itemCard("c10", "u2-l5-order-first"),
    itemCard("c11", "u2-l5-choice-dangerous"),
    teach("c12", "explain", { title: "It depends", body: "Radioactive does not automatically mean dangerous. What matters is the type of radiation, how much there is, and how it reaches the body. A banana and your own body are radioactive, and that is normal.", ...fig(notAlwaysDangerous()) }),
    itemCard("c13", "u2-l5-choice-decides"),
    teach("c14", "explain", { title: "A question for later", body: "Later, you'll learn why being exposed to radiation is not the same as becoming radioactive.", ...fig(exposedLater()) }),
    itemCard("c15", "u2-l5-sort-world"),
    teach("c16", "explain", { title: "Go deeper: radon and chains", body: "Radon is one link in a natural decay chain that starts with uranium in rock. Potassium-40 is another natural radionuclide, found in food and the body. Natural chains like these were running long before people existed.", ...fig(radonChain()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// Extra bank items (practice, checkpoint, review): fresh wording, same simple objectives.
// ---------------------------------------------------------------------------

const X = (id, objectiveId, type, data, difficulty = 1, referenceIds = []) =>
  addItem(id, objectiveId, type, data, { difficulty, surfaces: BANK_SURFACES, referenceIds });

// L1
X("u2-x-tom-by-itself", "u2-spontaneous", "true_or_myth", { statement: "An unstable nucleus changes by itself, without anyone starting it.", answer: "true", explanation: "True. Radioactive decay is spontaneous: nobody has to trigger it." }, 1, DECAY);
X("u2-x-rock-alone", "u2-spontaneous", "choice", {
  prompt: "A rock contains unstable nuclei. Nobody touches it. What happens to those nuclei?",
  options: opts(["some", "Some change on their own, now and then"], ["wait", "Nothing: they wait for someone to trigger them", "Unstable nuclei do not need a trigger."], ["all", "They all change at the same moment", "Each nucleus changes at its own random moment."]),
  answer: "some",
  explanation: "Unstable nuclei change by themselves. Some change now and then, and nobody can say which one is next.",
}, 2, DECAY);
X("u2-x-tom-exact", "u2-random-single", "true_or_myth", { statement: "If you watch one unstable nucleus closely, you can tell the exact second it will change.", answer: "myth", explanation: "Myth. When one particular nucleus changes cannot be predicted." }, 1, DECAY);
X("u2-x-two-nuclei", "u2-random-single", "choice", {
  prompt: "In a sample, one nucleus changed today. What can you say about another unstable nucleus in the same sample?",
  options: opts(["unknown", "It could change today, tomorrow or much later: you cannot tell"], ["tomorrow", "It will change tomorrow", "Nothing fixes the moment for one nucleus."], ["together", "It changes at the same moment as the first", "Each nucleus changes at its own random moment."]),
  answer: "unknown",
  explanation: "You cannot say when another particular nucleus will change. Only a large group follows a pattern.",
}, 2, DECAY);
X("u2-x-daughter-name", "u2-parent-daughter", "choice", {
  prompt: "A nucleus decays into a new nucleus. What is the new nucleus called?",
  options: opts(["daughter", "The daughter"], ["parent", "The parent", "The parent is the nucleus that decays."], ["radiation", "The radiation", "Radiation is what comes out, not the new nucleus."]),
  answer: "daughter",
  explanation: "The new nucleus is the daughter. The one that decayed is the parent.",
}, 1, DECAY);
X("u2-x-fill-daughter", "u2-parent-daughter", "fill", {
  mode: "bank", prompt: "The parent decays, and the nucleus it becomes is the ___.",
  bank: [{ id: "daughter", label: "daughter" }, { id: "parent", label: "parent" }, { id: "stable", label: "stable one" }],
  answer: "daughter",
  explanation: "The nucleus that decays is the parent, and the nucleus it becomes is the daughter.",
}, 1, DECAY);

// L2
X("u2-x-helium-nucleus", "u2-recognise-radiation", "choice", {
  prompt: "Which kind of radiation is the same as the nucleus of a helium atom?",
  options: opts(["alpha", "Alpha"], ["beta", "Beta", "Beta is a fast electron."], ["gamma", "Gamma", "Gamma is electromagnetic radiation."]),
  answer: "alpha",
  explanation: "An alpha particle, 2 protons and 2 neutrons, is the nucleus of a helium atom.",
}, 2, RADIATION);
X("u2-x-em-burst", "u2-recognise-radiation", "choice", {
  prompt: "A burst of high-energy electromagnetic radiation leaves a nucleus. What is it?",
  options: opts(["gamma", "Gamma"], ["alpha", "Alpha", "Alpha is a particle of 2 protons and 2 neutrons."], ["beta", "Beta", "Beta is a fast electron."]),
  answer: "gamma",
  explanation: "High-energy electromagnetic radiation from a nucleus is gamma radiation.",
}, 1, RADIATION);
X("u2-x-tom-particles", "u2-particle-or-wave", "true_or_myth", { statement: "Alpha and beta are particles.", answer: "true", explanation: "True. Alpha is 2 protons and 2 neutrons and beta is a fast electron. Gamma is the one that is not a particle." }, 1, RADIATION);
X("u2-x-not-particle", "u2-particle-or-wave", "choice", {
  prompt: "Which of these is not a particle?",
  options: opts(["gamma", "Gamma radiation"], ["alpha", "An alpha particle", "Alpha is a particle."], ["beta", "A beta particle", "Beta is a particle."]),
  answer: "gamma",
  explanation: "Gamma radiation is electromagnetic radiation, not a particle.",
}, 1, RADIATION);

// L3
X("u2-x-fill-half", "u2-half-life-meaning", "fill", {
  mode: "bank", prompt: "Half-life is the time for about ___ of a large group of nuclei to decay.",
  bank: [{ id: "half", label: "half" }, { id: "all", label: "all" }, { id: "tenth", label: "a tenth" }],
  answer: "half",
  explanation: "Half-life is the time for about half of a large group of radioactive nuclei to decay.",
}, 1, DECAY);
X("u2-x-half-best", "u2-half-life-meaning", "choice", {
  prompt: "Which describes half-life best?",
  options: opts(["fall", "The time for a group to fall to about half"], ["atom", "The time one atom takes to be cut in half", "Atoms are not cut in half."], ["end", "The time until nothing is radioactive", "Some radioactivity is left after one half-life."]),
  answer: "fall",
  explanation: "Half-life is the time it takes for a group of radioactive nuclei to fall to about half.",
}, 1, DECAY);
X("u2-x-hundred-left", "u2-half-life-pattern", "choice", {
  prompt: "A sample has 100 nuclei. After one half-life, about how many have not yet changed?",
  options: opts(["10", "About 10"], ["25", "About 25", "That would be after two half-lives."], ["50", "About 50"], ["90", "About 90", "That is too few to have changed."]),
  answer: "50",
  explanation: "After one half-life, about half of the 100 nuclei are left: about 50.",
}, 1, DECAY);
X("u2-x-three-half-lives", "u2-half-life-pattern", "choice", {
  prompt: "After three half-lives, about how much of the original group is left?",
  options: opts(["half", "About a half", "That is after one half-life."], ["quarter", "About a quarter", "That is after two half-lives."], ["eighth", "About an eighth"], ["none", "None of it", "It keeps halving but is not gone."]),
  answer: "eighth",
  explanation: "Each half-life halves what is left: a half, then a quarter, then about an eighth.",
}, 2, DECAY);
X("u2-x-tom-exact-one", "u2-half-life-group", "true_or_myth", { statement: "Half-life tells you exactly when one particular nucleus will decay.", answer: "myth", explanation: "Myth. Half-life describes a group. It cannot tell you when one nucleus will decay." }, 1, DECAY);
X("u2-x-why-group", "u2-half-life-group", "choice", {
  prompt: "Why can half-life describe a group but not one nucleus?",
  options: opts(["pattern", "Each nucleus changes at a random moment, but a big group follows a pattern"], ["timer", "Each nucleus has its own timer that is set to one half-life", "Half-life is not a timer in each atom."], ["fewer", "A group has fewer nuclei, so it is easier to predict", "A larger group follows the pattern better, not a smaller one."]),
  answer: "pattern",
  explanation: "One nucleus is random, but a large group follows a pattern. That pattern is what half-life describes.",
}, 2, DECAY);

// L4
X("u2-x-chain-end", "u2-decay-chain", "choice", {
  prompt: "What ends a decay chain?",
  options: opts(["stable", "A stable nucleus"], ["first", "The first decay", "A daughter can be unstable and decay again."], ["radiation", "The radiation running out", "The chain ends only when the nucleus is stable."]),
  answer: "stable",
  explanation: "A decay chain ends when a stable nucleus is reached.",
}, 1, DECAY);
X("u2-x-fill-chain", "u2-decay-chain", "fill", {
  mode: "bank", prompt: "A sequence of decays in which one nucleus changes into another is called a decay ___.",
  bank: [{ id: "chain", label: "chain" }, { id: "stop", label: "stop" }, { id: "clock", label: "clock" }],
  answer: "chain",
  explanation: "It is called a decay chain.",
}, 1, DECAY);
X("u2-x-what-happened", "u2-decay-changes-not-vanishes", "choice", {
  prompt: "A nucleus decays. What has happened to it?",
  options: opts(["changed", "It has changed into a different nucleus"], ["vanished", "It has vanished", "Nothing simply vanishes."], ["halved", "It has been cut in half", "A decay does not cut a nucleus in half."]),
  answer: "changed",
  explanation: "The nucleus changed into a different nucleus. Nothing simply vanishes.",
}, 1, DECAY);
X("u2-x-still-there", "u2-decay-changes-not-vanishes", "true_or_myth", { statement: "After a decay there is still a nucleus. It is a different one.", answer: "true", explanation: "True. A decay changes a nucleus into a different nucleus." }, 1, DECAY);

// L5
X("u2-x-natural-source", "u2-natural-sources", "choice", {
  prompt: "Which of these is a natural source of radioactivity?",
  options: opts(["k40", "Potassium-40 in food"], ["reactor", "A radioactive source made in a reactor", "That one is made by people."], ["nowhere", "Nothing: it only comes from nuclear plants", "Radioactivity is in rocks, air, food, bodies and space."]),
  answer: "k40",
  explanation: "Potassium-40 is a natural radioactive material found in food and in the body.",
}, 1, NATURAL);
X("u2-x-tom-radon", "u2-natural-sources", "true_or_myth", { statement: "Radon is a radioactive gas that comes from the ground.", answer: "true", explanation: "True. Radioactive materials in the ground produce radon, a natural radioactive gas." }, 1, NATURAL);
X("u2-x-banana-says", "u2-not-always-dangerous", "choice", {
  prompt: "A banana holds a little radioactive potassium. What does that tell you?",
  options: opts(["not", "Radioactive does not automatically mean dangerous"], ["hazard", "Bananas are a nuclear hazard", "A tiny natural amount is normal."], ["made", "Bananas were made by people", "Potassium-40 is natural."]),
  answer: "not",
  explanation: "Bananas are a little radioactive, and that is normal. Radioactive does not automatically mean dangerous.",
}, 1, NATURAL);
X("u2-x-tom-dangerous", "u2-not-always-dangerous", "true_or_myth", { statement: "Anything radioactive is automatically dangerous.", answer: "myth", explanation: "Myth. It depends on the type of radiation, the amount and how it reaches the body." }, 1, NATURAL);

export const itemBank = items;

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

export const lessons = [lesson1, lesson2, lesson3, lesson4, lesson5];

export const pathNodes = [
  { id: "u2-n1", position: 0, kind: "lesson", lessonId: L1, config: {} },
  { id: "u2-n2", position: 1, kind: "lesson", lessonId: L2, config: {} },
  { id: "u2-n3", position: 2, kind: "lesson", lessonId: L3, config: {} },
  { id: "u2-n4", position: 3, kind: "practice", config: { questionCount: 8, earlierShare: 0 } },
  { id: "u2-n5", position: 4, kind: "lesson", lessonId: L4, config: {} },
  { id: "u2-n6", position: 5, kind: "lesson", lessonId: L5, config: {} },
  { id: "u2-n7", position: 6, kind: "checkpoint", config: { questionCount: 12, earlierShare: 0.15, passMark: 0.8 } },
].map((n) => ({ ...n, unitId: UNIT_ID }));
