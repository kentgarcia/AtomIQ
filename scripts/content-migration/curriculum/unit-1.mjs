/**
 * Unit 1 — Inside the Atom. Authored content for the curriculum cutover
 * (docs/features/LESSON_RESTRUCTURE_SPEC.md §12).
 *
 * Deliberately simple: one core idea per lesson, in short plain sentences.
 *   L1  Ordinary matter is made of atoms. Air is matter too. Atoms are far too small to see.
 *   L2  An atom has a tiny nucleus with electrons around it. Proton +, neutron 0, electron -.
 *   L3  The number of protons tells you the element. Change it and the element changes.
 *   L4  Same protons, same element. Different neutrons, different isotope. Not always radioactive.
 *   L5  Some nuclei are stable, some are unstable. An unstable nucleus can change and give off radiation.
 * (The Becquerel story moved to Unit 2 lesson 5, so each unit tells it once.)
 * Harder ideas (the periodic table, mass number, the strong force, Rutherford, electron clouds) are
 * optional "go deeper" cards that are never required and never scored.
 *
 * Every fact below must be confirmed against its reference before publish
 * (references are marked unverified until a person opens and checks them).
 * Correct answers are option ids; teaching text is at most 60 words per card.
 */

import {
  airBalloons,
  atomHotspot,
  atomModel,
  changeProtons,
  decayFigure,
  elementsByProtons,
  electronCloud,
  forceBalance,
  goldFoil,
  halving,
  isotopePair,
  isotopeRuleBanner,
  isotopeStability,
  massNumber,
  matterVsEnergy,
  naturalSources,
  particleCards,
  stableVsUnstable,
  stadiumMarble,
  tableCell,
  zoomChain,
} from "./scenes.mjs";

const UNIT_ID = "inside-the-atom";

// ---------------------------------------------------------------------------
// Unit, objectives, references
// ---------------------------------------------------------------------------

export const unit = {
  id: UNIT_ID,
  position: 1,
  title: "Inside the Atom",
  subtitle: "What everything is made of",
  description:
    "Start with the smallest pieces of matter. See what atoms are made of, what makes one element different from another, and why some nuclei stay the same while others change.",
  goal: "Describe what an atom is made of, tell elements and isotopes apart, and explain in plain words why some nuclei can change.",
  guidebook: {
    summary:
      "Everything you can touch, and the air too, is made of atoms. Atoms are far too small to see. An atom has a tiny nucleus of protons and neutrons, with electrons around it. The number of protons tells you the element. Atoms of one element can have different numbers of neutrons: those are isotopes, and most are not radioactive. Some nuclei are stable. An unstable nucleus can change and give off radiation, and this happens in nature too.",
    termIds: ["atom", "matter", "proton", "neutron", "electron", "nucleus", "element", "isotope", "radioactivity"],
  },
  icon: "Atom",
  tone: "accent",
};

export const objectives = [
  { id: "u1-matter-is-atoms", statement: "Know that ordinary matter, including air, is made of atoms, and that light and heat are not.", misconception: "Air is nothing, so only solid things are made of atoms." },
  { id: "u1-atom-scale", statement: "Know that atoms are far too small to see, even with an ordinary microscope.", misconception: "A good microscope can show an atom." },
  { id: "u1-particles", statement: "Name the three particles of an atom and say whether each is positive, negative or has no charge.", misconception: "Every atom is made of its own kind of stuff." },
  { id: "u1-nucleus", statement: "Know that the tiny nucleus at the centre holds almost all of an atom's mass, and that the rest of the atom is mostly empty space.", misconception: "An atom is a solid ball." },
  { id: "u1-atomic-number", statement: "Know that the number of protons tells you which element an atom is.", misconception: "Elements are made of different kinds of stuff." },
  { id: "u1-change-protons", statement: "Know that changing the number of protons changes the element.", misconception: "An atom stays the same element when it gains or loses a proton." },
  { id: "u1-isotope-definition", statement: "Know that atoms of one element have the same protons but can have different neutrons, and that these are called isotopes.", misconception: "Atoms of one element are all identical." },
  { id: "u1-isotope-not-radioactive", statement: "Know that an isotope is not automatically radioactive: most of the atoms around us are stable isotopes.", misconception: "Isotope means radioactive or man-made." },
  { id: "u1-stable-unstable", statement: "Know that some combinations of protons and neutrons make a stable nucleus and others make an unstable one.", misconception: "Every atom stays the same for ever." },
  { id: "u1-unstable-changes", statement: "Know that an unstable nucleus can change and give off radiation, and that this happens naturally.", misconception: "Radioactivity is something people create, and anything nuclear is dangerous." },
].map((o, i) => ({ ...o, unitId: UNIT_ID, position: i }));

/** Candidates: every one is unverified until opened and checked by a person. */
export const references = [
  { id: "ref-openstax-chem-ch1", kind: "textbook", publisher: "OpenStax", title: "Chemistry 2e, section 1.2: Phases and Classification of Matter", authors: "Flowers, Theopold, Langley, Robinson", year: "2019", url: "https://openstax.org/books/chemistry-2e/pages/1-2-phases-and-classification-of-matter", note: "Matter has mass and takes up space; gases such as air are matter." },
  { id: "ref-openstax-chem-ch2", kind: "textbook", publisher: "OpenStax", title: "Chemistry 2e, chapter 2: Atoms, Molecules, and Ions", authors: "Flowers, Theopold, Langley, Robinson", year: "2019", url: "https://openstax.org/books/chemistry-2e/pages/2-introduction", note: "Atomic structure, atomic number, isotopes, the periodic table, atom sizes." },
  { id: "ref-openstax-up3-ch10", kind: "textbook", publisher: "OpenStax", title: "University Physics Volume 3, chapter 10: Nuclear Physics", authors: "Ling, Sanny, Moebs", year: "2016", url: "https://openstax.org/books/university-physics-volume-3/pages/10-introduction", note: "Nuclear size, nuclear forces, stability, radioactivity." },
  { id: "ref-iaea-isotopes", kind: "official", publisher: "IAEA", title: "Explainer on isotopes (stable and radioactive)", authors: "", year: "", url: "", note: "Candidate. Open the IAEA page, record its exact title and URL, then mark verified." },
  { id: "ref-rutherford-1911", kind: "research", publisher: "Philosophical Magazine", title: "The scattering of alpha and beta particles by matter and the structure of the atom", authors: "E. Rutherford", year: "1911", url: "https://doi.org/10.1080/14786440508637080", note: "Gold-foil interpretation: a small dense nucleus, and an atom that is mostly empty space." },
  { id: "ref-iupac-table", kind: "official", publisher: "IUPAC", title: "Periodic Table of the Elements", authors: "", year: "", url: "https://iupac.org/what-we-do/periodic-table-of-elements/", note: "Element names and atomic numbers." },
  { id: "ref-becquerel-1896", kind: "research", publisher: "Comptes Rendus de l'Academie des Sciences", title: "Sur les radiations emises par phosphorescence", authors: "H. Becquerel", year: "1896", url: "", note: "Discovery that uranium salts darken photographic plates." },
  { id: "ref-potassium-40", kind: "official", publisher: "To be identified", title: "Source for natural radioactive potassium-40 in food and the body", authors: "", year: "", url: "", note: "Candidate. A regulator or health-physics society page; open and record before marking verified." },
];

export const unitReferenceIds = ["ref-openstax-chem-ch2", "ref-openstax-up3-ch10", "ref-iaea-isotopes"];

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

// ---------------------------------------------------------------------------
// L1 — Atoms are everywhere
// Ordinary matter is made of atoms. Air is matter too. Atoms are far too small to see.
// ---------------------------------------------------------------------------

const L1 = "atoms-are-everywhere";

addItem("u1-l1-sort-matter", "u1-matter-is-atoms", "sort", {
  prompt: "Which of these are made of atoms? Sort each one.",
  buckets: [{ id: "atoms", label: "Made of atoms", icon: "AqAtom" }, { id: "not", label: "Not made of atoms", icon: "AqAtomOff" }],
  items: [
    { id: "phone", label: "Your phone", bucket: "atoms", art: "phone" },
    { id: "apple", label: "An apple", bucket: "atoms", art: "apple" },
    { id: "light", label: "Light", bucket: "not", art: "sun" },
    { id: "heat", label: "Heat", bucket: "not", art: "flame" },
  ],
  explanation: "Phones and apples are matter, and all matter is made of atoms. Light and heat are energy, not matter.",
}, { referenceIds: ["ref-openstax-chem-ch1"] });

addItem("u1-l1-tom-air-empty", "u1-matter-is-atoms", "true_or_myth", {
  statement: "A bottle with only air in it is empty.",
  answer: "myth",
  explanation: "Myth. Air is matter, so the bottle is full of atoms. Only a vacuum, where the air has been pumped out, comes close to empty.",
}, { referenceIds: ["ref-openstax-chem-ch1"] });

addItem("u1-l1-choice-made-of", "u1-matter-is-atoms", "choice", {
  prompt: "Which of these is made of atoms?",
  options: opts(
    ["light", "The light from a lamp", "Light is energy, not matter.", "lamp"],
    ["shadow", "A shadow", "A shadow is just a place where light is blocked.", "shadow"],
    ["air", "The air in a room", undefined, "air"],
    ["sound", "A sound", "Sound is a wave moving through matter. It is not matter itself.", "sound"],
  ),
  answer: "air",
  explanation: "Air is matter, so it is made of atoms. Light, shadows and sounds are not matter.",
}, { referenceIds: ["ref-openstax-chem-ch1"] });

addItem("u1-l1-fill-air", "u1-matter-is-atoms", "fill", {
  mode: "bank", prompt: "A pumped-up ball weighs more than a flat one because air is made of ___.",
  bank: [{ id: "atoms", label: "atoms" }, { id: "nothing", label: "nothing" }, { id: "energy", label: "energy" }],
  answer: "atoms",
  explanation: "Air is matter, and atoms have weight. More air inside the ball means more atoms, so it weighs more.",
}, { surfaces: BANK_SURFACES, referenceIds: ["ref-openstax-chem-ch1"] });

addItem("u1-l1-order-sizes", "u1-atom-scale", "order", {
  prompt: "Put these in order from smallest to biggest.",
  items: [
    { id: "atom", label: "An atom", art: "atom" },
    { id: "virus", label: "A virus", art: "virus" },
    { id: "cell", label: "A skin cell", art: "cell" },
    { id: "hand", label: "A hand", art: "hand" },
  ],
  explanation: "An atom is the smallest. A virus is bigger, a skin cell is bigger still, and a hand is the biggest.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l1-tom-microscope", "u1-atom-scale", "true_or_myth", {
  statement: "Atoms are too small to be seen with an ordinary microscope.",
  answer: "true",
  explanation: "True. An ordinary microscope uses light, and light waves are too big to show something as small as an atom. Special instruments can, but a classroom microscope cannot.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l1-tom-see-atoms", "u1-atom-scale", "true_or_myth", {
  statement: "With a good ordinary microscope you can see a single atom.",
  answer: "myth",
  explanation: "Myth. Atoms are far too small. Even the best ordinary microscope cannot show one.",
}, { surfaces: BANK_SURFACES, referenceIds: ["ref-openstax-chem-ch2"] });

const lesson1 = {
  lesson: { id: L1, unitId: UNIT_ID, title: "Atoms are everywhere", description: "Everything you can touch, and the air around you, is made of atoms. You will see what counts as matter and what does not. Then you will feel how small an atom is.", estimatedMinutes: 4, xpReward: 40, teaches: ["u1-matter-is-atoms", "u1-atom-scale"], reliesOn: [] },
  references: [
    { referenceId: "ref-openstax-chem-ch1", supports: "Matter has mass and takes up space; air is matter." },
    { referenceId: "ref-openstax-chem-ch2", supports: "Matter is made of atoms; atoms are too small to see." },
  ],
  cards: [
    teach("c02", "explain", { title: "What is everything made of?", body: "Your hand, your phone and an apple are all [[matter]]. All matter is made of [[atom|atoms]]. Light and heat are different. They are energy, not matter.", ...fig(matterVsEnergy()) }),
    itemCard("c03", "u1-l1-sort-matter"),
    teach("c12", "explain", { title: "Air is matter too", body: "Air feels like nothing, but it is matter too. It is made of atoms. That is why a pumped-up ball weighs more than a flat one.", ...fig(airBalloons()) }),
    itemCard("c13", "u1-l1-tom-air-empty"),
    teach("c06", "explain", { title: "Far too small to see", body: "Atoms are far too small to see, even with an ordinary microscope. You can zoom in on a skin cell. An atom is much, much smaller.", ...fig(zoomChain()) }),
    sim("c05", "scale-zoom", {
      task: "Zoom in from your hand down to a single atom. Tap each stop.",
      stops: [
        { id: "hand", label: "A hand", meters: 0.1, sizeLabel: "about 10 cm", note: "You can see and hold this.", icon: "Pointer", art: "hand" },
        { id: "cell", label: "A skin cell", meters: 0.00003, sizeLabel: "about 0.03 mm", note: "Too small to see without a microscope.", icon: "Microscope", art: "cell" },
        { id: "virus", label: "A virus", meters: 1e-7, sizeLabel: "about 100 nm", note: "About 300 times smaller than the cell. It takes a strong microscope to see one.", icon: "Health", art: "virus" },
        { id: "atom", label: "An atom", meters: 3e-10, sizeLabel: "a few tenths of a nm", note: "About 300 times smaller again than a virus.", icon: "Atom", art: "atom" },
      ],
    }),
    itemCard("c07", "u1-l1-order-sizes"),
    itemCard("c08", "u1-l1-tom-microscope"),
    itemCard("c10", "u1-l1-choice-made-of"),
    teach("c09", "story", { speaker: "npc-ada", title: "An idea before the proof", tag: "Ancient Greece", body: "About 2,400 years ago the Greek thinker Democritus asked what would happen if you kept cutting something in half. He imagined a smallest piece that could not be cut, and called it atomos. Seeing atoms took far longer.", ...fig(halving()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L2 — Meet the atom
// A tiny nucleus with electrons around it. Proton +, neutron 0, electron -. Almost all the mass is in
// the nucleus. Rutherford and the electron cloud are optional.
// ---------------------------------------------------------------------------

const L2 = "protons-neutrons-electrons";

addItem("u1-l2-predict-stadium", "u1-nucleus", "predict", {
  input: "choice", prompt: "Imagine an atom blown up to the size of a football stadium. How big would its nucleus be?",
  options: opts(["marble", "A marble in the middle", undefined, "marble"], ["car", "A car in the middle", undefined, "car"], ["pitch", "The whole pitch", undefined, "stadium"], ["grass", "A blade of grass", undefined, "grass"]),
  answer: "marble",
  explanation: "Your guess is not scored. The answer comes later in the lesson.",
}, { surfaces: ["lesson"] });

const atomHot = atomHotspot();
addItem("u1-l2-hotspot-nucleus", "u1-particles", "hotspot", {
  prompt: "Tap the nucleus of the atom.", scene: atomHot.scene, targets: atomHot.targets, answer: "nucleus",
  explanation: "The nucleus is the tiny centre of the atom. Protons and neutrons are in it. The electrons are outside.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l2-match-particles", "u1-particles", "match", {
  prompt: "Match each particle to its charge.",
  pairs: [
    { id: "proton", left: "Proton", right: "Positive" },
    { id: "neutron", left: "Neutron", right: "No charge" },
    { id: "electron", left: "Electron", right: "Negative" },
  ],
  explanation: "Protons are positive, neutrons have no charge and electrons are negative.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l2-sort-location", "u1-particles", "sort", {
  prompt: "Where is each particle? Sort them.",
  buckets: [{ id: "in", label: "In the nucleus", icon: "AqNucleus" }, { id: "out", label: "Outside the nucleus", icon: "AqOrbit" }],
  items: [
    { id: "proton", label: "Proton", bucket: "in" },
    { id: "neutron", label: "Neutron", bucket: "in" },
    { id: "electron", label: "Electron", bucket: "out" },
  ],
  explanation: "Protons and neutrons are in the nucleus. Electrons are outside it.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l2-tom-solid", "u1-nucleus", "true_or_myth", {
  statement: "An atom is a solid ball, packed full of stuff.",
  answer: "myth",
  explanation: "Myth. An atom is mostly empty space. The nucleus is a tiny speck in the middle, and the electrons are far from it.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

addItem("u1-l2-choice-mass", "u1-nucleus", "choice", {
  prompt: "Where is almost all of an atom's mass?",
  options: opts(
    ["nucleus", "In the tiny nucleus"],
    ["electrons", "In the electrons", "Electrons are very light. Almost all of the mass is in the nucleus."],
    ["even", "Spread evenly through the atom", "The mass is not spread out. It is packed into the nucleus."],
  ),
  answer: "nucleus",
  explanation: "Almost all of an atom's mass is packed into its tiny nucleus.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

addItem("u1-l2-tom-volume", "u1-nucleus", "true_or_myth", {
  statement: "The nucleus takes up most of the space in an atom.",
  answer: "myth",
  explanation: "Myth. The nucleus is a tiny speck at the centre. Most of the atom is empty space around it.",
}, { surfaces: BANK_SURFACES, referenceIds: ["ref-openstax-up3-ch10"] });

const lesson2 = {
  lesson: { id: L2, unitId: UNIT_ID, title: "Meet the atom", description: "Every atom has a tiny centre called the nucleus, with electrons around it. You will meet the three particles of an atom and see which are positive, which are negative and which have no charge.", estimatedMinutes: 4, xpReward: 50, teaches: ["u1-particles", "u1-nucleus"], reliesOn: ["u1-matter-is-atoms"] },
  references: [
    { referenceId: "ref-openstax-chem-ch2", supports: "The three particles, their charges and positions." },
    { referenceId: "ref-openstax-up3-ch10", supports: "The nucleus is tiny and holds almost all of the mass." },
    { referenceId: "ref-rutherford-1911", supports: "The gold-foil experiment (optional story)." },
  ],
  cards: [
    itemCard("c01", "u1-l2-predict-stadium", { scored: false }),
    teach("c02", "explain", { title: "A tiny centre", body: "Every atom has a tiny centre called the [[nucleus]], with [[electron|electrons]] around it. Almost all of an atom's mass is packed into its tiny nucleus.", ...fig(atomModel(2, 2, 2)) }),
    itemCard("c03", "u1-l2-hotspot-nucleus"),
    teach("c04", "explain", { title: "Three particles", body: "The nucleus holds [[proton|protons]], which are positive, and [[neutron|neutrons]], which have no charge. Electrons are negative and are outside the nucleus.", ...fig(particleCards()) }),
    itemCard("c05", "u1-l2-match-particles"),
    sim("c06", "atom-builder", {
      mode: "build", task: "Build a helium atom: 2 protons, 2 neutrons and 2 electrons.",
      goal: { protons: 2, neutrons: 2, electrons: 2 }, maxProtons: 6, maxNeutrons: 6,
      hint: "Add particles with the plus buttons. Helium has two of each.", objectives: ["u1-particles"],
    }),
    teach("c07", "reveal", { predictCardId: "c01", title: "The stadium, answered", body: "If an atom were a football stadium, its nucleus would be a marble in the middle. The electrons would be far out, and the rest is mostly empty space.", ...fig(stadiumMarble()) }),
    itemCard("c08", "u1-l2-tom-solid"),
    itemCard("c09", "u1-l2-choice-mass"),
    itemCard("c10", "u1-l2-sort-location"),
    teach("c11", "story", { speaker: "npc-ada", title: "How do we know?", tag: "Go deeper", body: "[[ernest-rutherford|Ernest Rutherford]]'s team fired tiny particles at thin gold foil. Most went straight through, so atoms must be mostly empty. A few bounced straight back, so each atom must have a tiny, heavy centre.", ...fig(goldFoil()) }, "deeper"),
    teach("c12", "explain", { title: "Not tiny planets", body: "Pictures often show electrons on neat rings, like planets. A better picture is an [[electron-cloud|electron cloud]]: the electrons are somewhere in a fuzzy region around the nucleus.", ...fig(electronCloud()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L3 — Elements
// The number of protons tells you the element. Change it and the element changes. No table to learn,
// no sums: the builder shows it.
// ---------------------------------------------------------------------------

const L3 = "elements-and-the-periodic-table";

addItem("u1-l3-predict-gold-oxygen", "u1-atomic-number", "predict", {
  input: "choice", prompt: "What is the real difference between an atom of gold and an atom of oxygen?",
  options: opts(["protons", "They have different numbers of protons"], ["stuff", "They are made of different kinds of stuff"], ["size", "Gold atoms are solid balls and oxygen atoms are hollow"]),
  answer: "protons",
  explanation: "Your guess is not scored. Find out as you build.",
}, { surfaces: ["lesson"] });

addItem("u1-l3-fill-six", "u1-atomic-number", "fill", {
  mode: "bank", prompt: "An atom with 6 protons is always ___.",
  bank: [{ id: "carbon", label: "carbon" }, { id: "nitrogen", label: "nitrogen" }, { id: "oxygen", label: "oxygen" }],
  answer: "carbon",
  explanation: "6 protons is always carbon. 7 is always nitrogen, and 8 is always oxygen.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l3-choice-gold-oxygen", "u1-atomic-number", "choice", {
  prompt: "What makes an atom of gold different from an atom of oxygen?",
  options: opts(
    ["protons", "They have different numbers of protons"],
    ["stuff", "They are made of different kinds of stuff", "Every atom is built from the same three particles. Only the numbers are different."],
    ["solid", "Gold atoms are solid and oxygen atoms are hollow", "Atoms of every element are mostly empty space."],
  ),
  answer: "protons",
  explanation: "Gold atoms have 79 protons and oxygen atoms have 8. The particles are the same kinds. The number of protons is what is different.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l3-tom-gain-proton", "u1-change-protons", "true_or_myth", {
  statement: "A carbon atom that gains one proton is still carbon.",
  answer: "myth",
  explanation: "Myth. Carbon has 6 protons. With one more it has 7, and 7 protons is nitrogen. Change the protons and you change the element.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l3-choice-lose-proton", "u1-change-protons", "choice", {
  prompt: "An oxygen atom has 8 protons. It loses one proton. What is it now?",
  figure: elementsByProtons(),
  options: opts(
    ["nitrogen", "Nitrogen"],
    ["oxygen", "Still oxygen", "Oxygen has 8 protons. With 7, the atom is a different element."],
    ["carbon", "Carbon", "Carbon has 6 protons. That would mean losing two."],
  ),
  answer: "nitrogen",
  explanation: "8 protons take away 1 is 7 protons, and 7 protons is nitrogen.",
}, { difficulty: 2, referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l3-choice-gain-two", "u1-change-protons", "choice", {
  prompt: "A carbon atom gains 2 protons. What is it now?",
  figure: elementsByProtons(),
  options: opts(
    ["oxygen", "Oxygen"],
    ["carbon", "Still carbon", "Carbon has 6 protons. With 8 it is a different element."],
    ["nitrogen", "Nitrogen", "Nitrogen has 7 protons. That is only one more."],
  ),
  answer: "oxygen",
  explanation: "6 protons plus 2 is 8 protons, and 8 protons is oxygen.",
}, { surfaces: BANK_SURFACES, difficulty: 2, referenceIds: ["ref-openstax-chem-ch2"] });

const lesson3 = {
  lesson: { id: L3, unitId: UNIT_ID, title: "Elements", description: "One number tells you which element an atom is: how many protons it has. You will build atoms and watch what happens to the element when you change that number.", estimatedMinutes: 4, xpReward: 50, teaches: ["u1-atomic-number", "u1-change-protons"], reliesOn: ["u1-particles"] },
  references: [
    { referenceId: "ref-openstax-chem-ch2", supports: "The number of protons decides the element." },
    { referenceId: "ref-iupac-table", supports: "Element names and atomic numbers (optional card)." },
  ],
  cards: [
    itemCard("c01", "u1-l3-predict-gold-oxygen", { scored: false }),
    teach("c02", "explain", { title: "Protons tell you the element", body: "The number of [[proton|protons]] tells you which [[element]] an atom is. An atom with 6 protons is always carbon. 7 protons is always nitrogen. 8 protons is always oxygen.", ...fig(elementsByProtons()) }),
    sim("c03", "atom-builder", {
      mode: "element", task: "This atom has 6 protons, so it is carbon. Add one proton and watch the element.",
      goal: { protons: 7 }, start: { protons: 6, neutrons: 6, electrons: 6 }, lock: { neutrons: true, electrons: true }, maxProtons: 10,
      hint: "Tap + once. 7 protons is nitrogen.", objectives: ["u1-change-protons"],
    }),
    itemCard("c04", "u1-l3-fill-six"),
    teach("c05", "explain", { title: "Change the protons, change the element", body: "Add a proton and you get a different element. 6 protons is carbon, 7 is nitrogen and 8 is oxygen. The neutrons and electrons do not decide the element. The protons do.", ...fig(changeProtons()) }),
    sim("c06", "atom-builder", {
      mode: "element", task: "Now this atom has 7 protons: nitrogen. Add one more to turn it into oxygen.",
      goal: { protons: 8 }, start: { protons: 7, neutrons: 7, electrons: 7 }, lock: { neutrons: true, electrons: true }, maxProtons: 10,
      hint: "Tap + once. 8 protons is oxygen.", objectives: ["u1-change-protons"],
    }),
    itemCard("c07", "u1-l3-tom-gain-proton"),
    itemCard("c08", "u1-l3-choice-lose-proton"),
    itemCard("c09", "u1-l3-choice-gold-oxygen"),
    teach("c10", "explain", { title: "Go deeper: the periodic table", body: "The [[periodic-table|periodic table]] lists every element in order of its number of protons. Each box shows that number, a short symbol and the name. You do not need to memorise it.", ...fig(tableCell()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L4 — Isotopes
// Same protons, same element. Different neutrons, different isotope. Not automatically radioactive.
// Mass number is an optional card.
// ---------------------------------------------------------------------------

const L4 = "isotopes";

addItem("u1-l4-predict-carbon-mass", "u1-isotope-definition", "predict", {
  input: "choice", prompt: "Two atoms are both carbon. Can one be heavier than the other?",
  options: opts(["yes", "Yes, they can have different weights"], ["no", "No, all carbon atoms are identical"]),
  answer: "yes",
  explanation: "Your guess is not scored. Build a heavier carbon atom in the next card.",
}, { surfaces: ["lesson"] });

addItem("u1-l4-sort-carbon", "u1-isotope-definition", "sort", {
  prompt: "Carbon always has 6 protons. Which of these atoms are carbon? Sort each one.",
  buckets: [{ id: "carbon", label: "Carbon", icon: "AqCarbon" }, { id: "other", label: "Not carbon", icon: "AqCarbonOff" }],
  items: [
    { id: "a", label: "6 protons, 6 neutrons", bucket: "carbon" },
    { id: "b", label: "6 protons, 8 neutrons", bucket: "carbon" },
    { id: "c", label: "7 protons, 7 neutrons", bucket: "other" },
    { id: "d", label: "8 protons, 8 neutrons", bucket: "other" },
  ],
  explanation: "Only the protons decide the element. Any atom with 6 protons is carbon, whatever its neutrons. The two carbon atoms with different neutrons are isotopes of carbon.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l4-sort-pairs", "u1-isotope-definition", "sort", {
  prompt: "Each card shows two atoms. Are they isotopes of one element, or different elements?",
  figure: isotopeRuleBanner(),
  buckets: [{ id: "iso", label: "Isotopes of one element", icon: "AqSameElement" }, { id: "diff", label: "Different elements", icon: "AqDiffElement" }],
  items: [
    { id: "a", label: "6 protons, 6 neutrons and 6 protons, 8 neutrons", bucket: "iso" },
    { id: "b", label: "6 protons, 6 neutrons and 7 protons, 6 neutrons", bucket: "diff" },
    { id: "c", label: "1 proton, 0 neutrons and 1 proton, 1 neutron", bucket: "iso" },
    { id: "d", label: "8 protons, 8 neutrons and 7 protons, 8 neutrons", bucket: "diff" },
  ],
  explanation: "Check the protons first. Same protons means the same element, so different neutrons make isotopes. Different protons means different elements.",
}, { difficulty: 2, referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l4-choice-pair", "u1-isotope-definition", "choice", {
  prompt: "Atom X has 17 protons and 18 neutrons. Atom Y has 17 protons and 20 neutrons. What are X and Y?",
  options: opts(
    ["iso", "Isotopes of the same element"],
    ["diff", "Two different elements", "They have the same number of protons, so they are the same element."],
    ["same", "Exactly the same kind of atom", "Their neutrons are different, so they are different isotopes."],
  ),
  answer: "iso",
  explanation: "Same protons (17) means the same element. Different neutrons (18 and 20) mean different isotopes.",
}, { difficulty: 2, referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l4-tom-all-radioactive", "u1-isotope-not-radioactive", "true_or_myth", {
  statement: "All isotopes are radioactive.",
  answer: "myth",
  explanation: "Myth. Isotope just means a version of an element. Most of the atoms around you are stable isotopes. Only some isotopes are radioactive.",
}, { referenceIds: ["ref-iaea-isotopes"] });

addItem("u1-l4-tom-c13-stable", "u1-isotope-not-radioactive", "true_or_myth", {
  statement: "Carbon-13 is an isotope of carbon, and it is not radioactive.",
  answer: "true",
  explanation: "True. Carbon-13 is a stable isotope. Being an isotope does not make an atom radioactive.",
}, { referenceIds: ["ref-iaea-isotopes"] });

addItem("u1-l4-choice-share", "u1-isotope-definition", "choice", {
  prompt: "What do isotopes of the same element share?",
  options: opts(
    ["protons", "The same number of protons"],
    ["neutrons", "The same number of neutrons", "Different neutrons are exactly what makes them different isotopes."],
    ["nothing", "Nothing: they are different elements", "Isotopes of one element are the same element."],
  ),
  answer: "protons",
  explanation: "Isotopes of an element all have the same number of protons, which is why they are the same element. They have different numbers of neutrons.",
}, { surfaces: BANK_SURFACES, referenceIds: ["ref-iaea-isotopes"] });

const lesson4 = {
  lesson: { id: L4, unitId: UNIT_ID, title: "Isotopes", description: "Atoms of one element always have the same number of protons, but they can have different numbers of neutrons. Those versions are called isotopes. You will see that an isotope is not automatically radioactive.", estimatedMinutes: 4, xpReward: 50, teaches: ["u1-isotope-definition", "u1-isotope-not-radioactive"], reliesOn: ["u1-particles", "u1-atomic-number"] },
  references: [
    { referenceId: "ref-openstax-chem-ch2", supports: "Isotope definition and mass number." },
    { referenceId: "ref-iaea-isotopes", supports: "Isotopes can be stable or radioactive." },
  ],
  cards: [
    itemCard("c01", "u1-l4-predict-carbon-mass", { scored: false }),
    teach("c02", "explain", { title: "Same element, different neutrons", body: "Atoms of the same element always have the same number of protons. They can have different numbers of neutrons. These are called [[isotope|isotopes]]. Carbon-12 and carbon-14 are both carbon.", ...fig(isotopePair()) }),
    sim("c03", "atom-builder", {
      mode: "isotope", task: "Make carbon-14 from carbon-12 by adding 2 neutrons.",
      goal: { neutrons: 8 }, start: { protons: 6, neutrons: 6, electrons: 6 }, lock: { protons: true, electrons: true }, maxNeutrons: 12,
      hint: "Carbon-12 has 6 neutrons. Tap + two times. The protons did not change, so it is still carbon.", objectives: ["u1-isotope-definition"],
    }),
    itemCard("c04", "u1-l4-sort-carbon"),
    teach("c05", "explain", { title: "Isotope does not mean radioactive", body: "An isotope is just a version of an element. It does not mean the atom is [[radioactivity|radioactive]]. Carbon-12 and carbon-13 are stable. Carbon-14 is not. Most of the atoms around you are stable isotopes.", ...fig(isotopeStability()) }),
    itemCard("c06", "u1-l4-tom-all-radioactive"),
    itemCard("c07", "u1-l4-tom-c13-stable"),
    itemCard("c08", "u1-l4-sort-pairs"),
    itemCard("c09", "u1-l4-choice-pair"),
    teach("c10", "explain", { title: "Go deeper: reading the name", body: "The number after the name is the [[mass-number|mass number]]: protons plus neutrons. Carbon has 6 protons, so carbon-14 has 14 - 6 = 8 neutrons.", ...fig(massNumber()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// L5 — Stable and unstable nuclei
// Some nuclei are stable, some are unstable. An unstable nucleus can change and give off radiation.
// The strong force is an optional card.
// ---------------------------------------------------------------------------

const L5 = "stable-and-unstable-nuclei";

addItem("u1-l5-predict-stable", "u1-stable-unstable", "predict", {
  input: "choice", prompt: "Does every atom stay exactly the same for ever?",
  options: opts(["yes", "Yes, every atom stays the same"], ["no", "No, some atoms can change"]),
  answer: "no",
  explanation: "Your guess is not scored. Find out in the next cards.",
}, { surfaces: ["lesson"] });

addItem("u1-l5-sort-stable", "u1-stable-unstable", "sort", {
  prompt: "Which of these atoms are stable? Sort each one.",
  buckets: [{ id: "stable", label: "Stable", icon: "AqStable" }, { id: "unstable", label: "Unstable", icon: "AqUnstable" }],
  items: [
    { id: "c12", label: "Carbon-12", bucket: "stable" },
    { id: "c14", label: "Carbon-14", bucket: "unstable" },
    { id: "o16", label: "Oxygen-16", bucket: "stable" },
    { id: "u238", label: "Uranium-238", bucket: "unstable" },
  ],
  explanation: "Carbon-12 and oxygen-16 are stable. Carbon-14 and uranium-238 are unstable, which means radioactive.",
}, { referenceIds: ["ref-iaea-isotopes"] });

addItem("u1-l5-tom-body-stable", "u1-stable-unstable", "true_or_myth", {
  statement: "Most of the atoms in your body are stable.",
  answer: "true",
  explanation: "True. Almost all of your atoms are stable. A tiny number are naturally unstable, such as potassium-40.",
}, { referenceIds: ["ref-potassium-40"] });

addItem("u1-l5-tom-all-stable", "u1-stable-unstable", "true_or_myth", {
  statement: "Every atom stays the same for ever.",
  answer: "myth",
  explanation: "Myth. Most atoms around us do stay the same, but an unstable nucleus can change.",
}, { surfaces: BANK_SURFACES, referenceIds: ["ref-iaea-isotopes"] });

addItem("u1-l5-choice-unstable-does", "u1-unstable-changes", "choice", {
  prompt: "An atom has an unstable nucleus. What can happen to it?",
  options: opts(
    ["change", "The nucleus can change and give off radiation"],
    ["same", "Nothing: it stays exactly as it is for ever", "Unstable means it can change."],
    ["vanish", "The whole atom disappears", "The nucleus changes into a different nucleus. Nothing vanishes."],
  ),
  answer: "change",
  explanation: "An unstable nucleus can change and give off radiation. That is radioactivity.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

addItem("u1-l5-tom-human-made", "u1-unstable-changes", "true_or_myth", {
  statement: "Radioactive atoms only exist because people made them.",
  answer: "myth",
  explanation: "Myth. Radioactive atoms occur in nature. Potassium-40 is in bananas and in your own body, and carbon-14 is made high in the air.",
}, { referenceIds: ["ref-potassium-40"] });

addItem("u1-l5-sort-source", "u1-unstable-changes", "sort", {
  prompt: "Where do these radioactive atoms come from? Sort each one.",
  buckets: [{ id: "nature", label: "Found in nature", icon: "AqLeaf" }, { id: "people", label: "Made by people", icon: "AqFlask" }],
  items: [
    { id: "k40", label: "Potassium-40 in a banana", bucket: "nature" },
    { id: "u", label: "Uranium in a rock", bucket: "nature" },
    { id: "c14", label: "Carbon-14 made high in the air", bucket: "nature" },
    { id: "hosp", label: "An isotope made in a reactor for a hospital", bucket: "people" },
  ],
  explanation: "People can make radioactive atoms, but most radioactivity around us is natural: in rocks, in the air, in food and even in you.",
}, { difficulty: 2, referenceIds: ["ref-potassium-40", "ref-iaea-isotopes"] });

const lesson5 = {
  lesson: { id: L5, unitId: UNIT_ID, title: "Stable and unstable nuclei", description: "Some nuclei stay the same for ever. Others are unstable and can change. You will see the difference, learn what radioactivity is, and find out that it is a natural thing.", estimatedMinutes: 4, xpReward: 50, teaches: ["u1-stable-unstable", "u1-unstable-changes"], reliesOn: ["u1-nucleus", "u1-isotope-definition"] },
  references: [
    { referenceId: "ref-openstax-up3-ch10", supports: "Nuclear stability and radioactivity." },
    { referenceId: "ref-iaea-isotopes", supports: "Stable and unstable isotopes." },
    { referenceId: "ref-potassium-40", supports: "Natural unstable isotopes in food and the body." },
  ],
  cards: [
    itemCard("c01", "u1-l5-predict-stable", { scored: false }),
    teach("c02", "explain", { title: "Stable and unstable", body: "Some combinations of protons and neutrons make a stable nucleus. It stays the same. Others make an unstable nucleus, which can change. Most atoms around you, and in you, are stable.", ...fig(stableVsUnstable()) }),
    sim("c03", "atom-builder", {
      mode: "stability", task: "Carbon-14 is unstable. Change the neutrons until the carbon atom is stable.",
      goal: { stable: true }, start: { protons: 6, neutrons: 8, electrons: 6 }, lock: { protons: true, electrons: true }, maxNeutrons: 12,
      hint: "Stable carbon has 6 or 7 neutrons. Tap - until the badge says Stable.", objectives: ["u1-stable-unstable"],
    }),
    itemCard("c04", "u1-l5-sort-stable"),
    teach("c05", "explain", { title: "Unstable nuclei can change", body: "An unstable nucleus can change. When it does, it gives off [[radiation]]. This is called [[radioactivity]]. An atom that does this is radioactive.", ...fig(decayFigure()) }),
    teach("c06", "explain", { title: "Radioactivity is natural", body: "Nobody had to invent radioactivity. Unstable atoms are in rocks, in the air and in food. Bananas and your own body hold a little natural potassium-40.", ...fig(naturalSources()) }),
    itemCard("c07", "u1-l5-tom-human-made"),
    itemCard("c08", "u1-l5-tom-body-stable"),
    itemCard("c09", "u1-l5-choice-unstable-does"),
    itemCard("c10", "u1-l5-sort-source"),
    teach("c11", "explain", { title: "Go deeper: what holds a nucleus together", body: "Protons are all positive, so they push each other apart. A very strong force inside the nucleus, the [[strong-force|strong force]], helps hold it together. Some nuclei hold together well. Others do not.", ...fig(forceBalance()) }, "deeper"),
  ],
};

// ---------------------------------------------------------------------------
// Extra bank items (practice, checkpoint, review): fresh wording, same simple objectives.
// ---------------------------------------------------------------------------

const X = (id, objectiveId, type, data, difficulty = 1, referenceIds = []) =>
  addItem(id, objectiveId, type, data, { difficulty, surfaces: BANK_SURFACES, referenceIds });

X("u1-x-water-atoms", "u1-matter-is-atoms", "true_or_myth", { statement: "A glass of water is made of atoms.", answer: "true", explanation: "True. Water is matter, and all matter is made of atoms." }, 1, ["ref-openstax-chem-ch1"]);
X("u1-x-not-atoms", "u1-matter-is-atoms", "choice", {
  prompt: "Which of these is NOT made of atoms?",
  options: opts(["wood", "The wood in a campfire", "Wood is matter, so it is made of atoms."], ["air", "The air around the fire", "Air is matter, so it is made of atoms."], ["ash", "The ash left behind", "Ash is matter, so it is made of atoms."], ["heat", "The heat you feel from the fire"]),
  answer: "heat",
  explanation: "Heat is energy, not matter, so it is not made of atoms. The wood, the air and the ash are all matter.",
}, 2, ["ref-openstax-chem-ch1"]);
X("u1-x-balloon-weight", "u1-matter-is-atoms", "choice", {
  prompt: "You pump air into a flat ball and it gets heavier. What does that tell you?",
  options: opts(
    ["matter", "Air is matter, so it has weight"],
    ["nothing", "Air is nothing, so the ball only looks heavier", "If air were nothing, adding it could not change the weight."],
    ["energy", "Air is energy, not matter", "Energy such as light and heat is not made of atoms. Air is."],
  ),
  answer: "matter",
  explanation: "The ball gets heavier because air is made of atoms, and atoms have weight.",
}, 2, ["ref-openstax-chem-ch1"]);

X("u1-x-order-cell", "u1-atom-scale", "choice", {
  prompt: "Which of these is the smallest?",
  options: opts(["atom", "An atom", undefined, "atom"], ["virus", "A virus", "A virus is much bigger than an atom.", "virus"], ["cell", "A skin cell", "A skin cell is far bigger than an atom.", "cell"], ["hand", "A hand", "A hand is the biggest of these.", "hand"]),
  answer: "atom",
  explanation: "An atom is far smaller than a virus, a cell or a hand.",
}, 1, ["ref-openstax-chem-ch2"]);
X("u1-x-see-atom", "u1-atom-scale", "choice", {
  prompt: "Why can't you see atoms with an ordinary microscope?",
  options: opts(
    ["small", "They are far too small"],
    ["few", "There are not enough of them", "There are enormous numbers of atoms in everything."],
    ["energy", "They are made of energy", "Atoms are matter, not energy."],
  ),
  answer: "small",
  explanation: "Atoms are far too small for an ordinary microscope to show.",
}, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-negative", "u1-particles", "choice", {
  prompt: "Which particle has a negative electric charge?",
  options: opts(["electron", "The electron"], ["proton", "The proton", "Protons are positive."], ["neutron", "The neutron", "Neutrons have no charge."]),
  answer: "electron",
  explanation: "Electrons are negative. Protons are positive and neutrons have no charge.",
}, 1, ["ref-openstax-chem-ch2"]);
X("u1-x-neutron-charge", "u1-particles", "true_or_myth", { statement: "Neutrons have no electric charge.", answer: "true", explanation: "True. That is why they are called neutrons." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-nucleus-size", "u1-nucleus", "choice", {
  prompt: "Compared with the whole atom, how big is the nucleus?",
  options: opts(["tiny", "Tiny: a speck at the centre"], ["half", "About half the width of the atom", "The nucleus is much, much smaller than that."], ["same", "About the same size as the atom", "The atom is far bigger than its nucleus."]),
  answer: "tiny",
  explanation: "The nucleus is a tiny speck at the centre of the atom.",
}, 1, ["ref-openstax-up3-ch10"]);
X("u1-x-electrons-inside", "u1-nucleus", "true_or_myth", { statement: "The electrons of an atom are packed inside the nucleus.", answer: "myth", explanation: "Myth. The nucleus holds the protons and neutrons. Electrons are outside it." }, 1, ["ref-openstax-chem-ch2"]);
X("u1-x-empty-space", "u1-nucleus", "choice", {
  prompt: "If you could shrink down and look inside an atom, what would you mostly see?",
  options: opts(["empty", "Empty space"], ["solid", "Solid stuff packed tightly", "An atom is mostly empty space."], ["electrons", "A crowd of electrons", "An atom has only a few electrons, and they are far apart."]),
  answer: "empty",
  explanation: "Most of an atom is empty space. The nucleus is a tiny speck, and the electrons are far from it.",
}, 1, ["ref-openstax-up3-ch10"]);

X("u1-x-oxygen-protons", "u1-atomic-number", "choice", {
  prompt: "How many protons does every oxygen atom have?",
  options: opts(["8", "8"], ["6", "6", "6 protons would make it carbon."], ["7", "7", "7 protons would make it nitrogen."]),
  answer: "8",
  explanation: "Every oxygen atom has 8 protons.",
}, 1, ["ref-iupac-table"]);
X("u1-x-same-element", "u1-atomic-number", "true_or_myth", { statement: "Two atoms with different numbers of protons can be the same element.", answer: "myth", explanation: "Myth. The number of protons tells you the element. Different numbers of protons mean different elements." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-proton-change", "u1-change-protons", "choice", {
  prompt: "A nitrogen atom has 7 protons. It gains one proton. What happens?",
  options: opts(
    ["oxygen", "It becomes oxygen, a different element"],
    ["nitrogen", "It is still nitrogen, just heavier", "The protons decide the element, so adding one changes the element."],
    ["carbon", "It becomes carbon", "Carbon has fewer protons, not more."],
  ),
  answer: "oxygen",
  explanation: "7 protons plus 1 is 8 protons, and 8 protons is oxygen.",
}, 2, ["ref-openstax-chem-ch2"]);
X("u1-x-true-change-protons", "u1-change-protons", "true_or_myth", { statement: "If you change the number of protons in an atom, it becomes a different element.", answer: "true", explanation: "True. The number of protons tells you the element, so changing it changes the element." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-isotopes-of", "u1-isotope-definition", "choice", {
  prompt: "What are carbon-12 and carbon-14?",
  options: opts(["iso", "Isotopes of the same element"], ["diff", "Two different elements", "Both have 6 protons, so both are carbon."]),
  answer: "iso",
  explanation: "They are isotopes of carbon: the same number of protons, different numbers of neutrons.",
}, 1, ["ref-openstax-chem-ch2"]);
X("u1-x-isotope-neutrons", "u1-isotope-definition", "true_or_myth", { statement: "Isotopes of one element have different numbers of neutrons.", answer: "true", explanation: "True. That is what makes them different isotopes of the same element." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-isotope-radioactive", "u1-isotope-not-radioactive", "choice", {
  prompt: "Which statement about isotopes is true?",
  options: opts(
    ["some", "Some are stable and some are radioactive"],
    ["all", "All of them are radioactive", "Most of the atoms around you are stable isotopes."],
    ["none", "None of them are radioactive", "Some isotopes, such as carbon-14, are radioactive."],
  ),
  answer: "some",
  explanation: "Isotopes can be stable or radioactive. Carbon-12 is stable and carbon-14 is radioactive.",
}, 1, ["ref-iaea-isotopes"]);
X("u1-x-isotope-stable-true", "u1-isotope-not-radioactive", "true_or_myth", { statement: "Carbon-12 is an isotope, and it is stable.", answer: "true", explanation: "True. Carbon-12 is a stable isotope of carbon." }, 1, ["ref-iaea-isotopes"]);

X("u1-x-unstable-which", "u1-stable-unstable", "choice", {
  prompt: "Which of these atoms is unstable?",
  options: opts(["c14", "Carbon-14"], ["c12", "Carbon-12", "Carbon-12 is stable."], ["o16", "Oxygen-16", "Oxygen-16 is stable."]),
  answer: "c14",
  explanation: "Carbon-14 is unstable, which means radioactive.",
}, 1, ["ref-iaea-isotopes"]);
X("u1-x-stable-meaning", "u1-stable-unstable", "choice", {
  prompt: "What does it mean for a nucleus to be stable?",
  options: opts(["stays", "It stays the same"], ["changes", "It is likely to change", "That describes an unstable nucleus."], ["gone", "It has no protons", "Every nucleus has protons."]),
  answer: "stays",
  explanation: "A stable nucleus stays the same. An unstable nucleus can change.",
}, 1, ["ref-iaea-isotopes"]);

X("u1-x-potassium", "u1-unstable-changes", "true_or_myth", { statement: "A banana contains a tiny amount of natural radioactive potassium.", answer: "true", explanation: "True. A small share of the potassium in a banana is potassium-40, which is radioactive." }, 2, ["ref-potassium-40"]);
X("u1-x-rock-natural", "u1-unstable-changes", "choice", {
  prompt: "A rock from the ground gives off a little radiation. How can that be?",
  options: opts(
    ["natural", "Some atoms in it are naturally unstable"],
    ["people", "Someone must have made it radioactive", "Radioactivity is natural. Many rocks contain unstable atoms."],
  ),
  answer: "natural",
  explanation: "Some atoms in the rock, such as uranium, are naturally unstable, so it gives off a little radiation.",
}, 2, ["ref-becquerel-1896", "ref-iaea-isotopes"]);

export const itemBank = items;

// ---------------------------------------------------------------------------
// Path
// ---------------------------------------------------------------------------

export const lessons = [lesson1, lesson2, lesson3, lesson4, lesson5];

export const pathNodes = [
  { id: "u1-n1", position: 0, kind: "lesson", lessonId: L1, config: {} },
  { id: "u1-n2", position: 1, kind: "lesson", lessonId: L2, config: {} },
  { id: "u1-n3", position: 2, kind: "lesson", lessonId: L3, config: {} },
  { id: "u1-n4", position: 3, kind: "practice", config: { questionCount: 8, earlierShare: 0 } },
  { id: "u1-n5", position: 4, kind: "lesson", lessonId: L4, config: {} },
  { id: "u1-n6", position: 5, kind: "lesson", lessonId: L5, config: {} },
  { id: "u1-n7", position: 6, kind: "checkpoint", config: { questionCount: 12, earlierShare: 0, passMark: 0.8 } },
].map((n) => ({ ...n, unitId: UNIT_ID }));
