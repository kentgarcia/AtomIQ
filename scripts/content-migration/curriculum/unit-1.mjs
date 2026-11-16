/**
 * Unit 1 — Inside the Atom. Authored content for the curriculum cutover
 * (docs/LESSON_RESTRUCTURE_SPEC.md §12).
 *
 * Every fact below must be confirmed against its reference before publish
 * (references are marked unverified until a person opens and checks them).
 * Correct answers are option ids; teaching text is at most 60 words per card.
 */

import {
  atomHotspot,
  atomModel,
  becquerelPlate,
  decayFigure,
  elementPictures,
  electronCloud,
  firstTenGrid,
  goldFoil,
  halving,
  hairVsAtom,
  matterExamples,
  ionPair,
  isotopePair,
  massNumber,
  matterVsEnergy,
  neutronGlue,
  nuclearForces,
  particleCards,
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
    "Start with the smallest pieces of matter. See what atoms are made of, what makes one element different from another, and why some nuclei are stable and others are not.",
  goal: "Describe the structure of an atom, tell elements and isotopes apart, and explain in plain words why some nuclei change.",
  guidebook: {
    summary:
      "Everything you can touch is made of atoms. Each atom has a tiny nucleus of protons and neutrons with electrons around it. The number of protons decides the element. Atoms of one element can differ in neutrons: those are isotopes. Some nuclei are stable; others are unstable and change, giving off radiation.",
    termIds: ["atom", "proton", "neutron", "electron", "nucleus", "atomic-number", "isotope"],
  },
  icon: "Atom",
  tone: "accent",
};

export const objectives = [
  { id: "u1-matter-is-atoms", statement: "Recognise that all ordinary matter is made of atoms, and that light and heat are not.", misconception: "Air is nothing; atoms are just very small specks." },
  { id: "u1-atom-scale", statement: "Describe how small atoms are using a comparison.", misconception: "Atoms are small enough to see with a good microscope." },
  { id: "u1-particles", statement: "Name the three particles of an atom, their charges and where they are.", misconception: "An atom is a solid ball." },
  { id: "u1-nucleus", statement: "Explain that the nucleus is tiny but holds nearly all the mass.", misconception: "Electrons circle the nucleus like planets, so an atom is mostly nucleus." },
  { id: "u1-atomic-number", statement: "State that the number of protons decides which element an atom is.", misconception: "Elements differ because their atoms are made of different stuff." },
  { id: "u1-read-the-table", statement: "Find an element's symbol and atomic number on the periodic table." },
  { id: "u1-isotope-definition", statement: "Explain that isotopes of an element have the same protons and different neutrons.", misconception: "Isotope means radioactive or man-made." },
  { id: "u1-mass-number", statement: "Work out protons, neutrons and the name of an isotope from its numbers." },
  { id: "u1-forces-in-nucleus", statement: "Describe the two competing forces in a nucleus: electric push and the strong force." },
  { id: "u1-stable-unstable", statement: "Explain that most nuclei around us are stable, some are unstable, and unstable nuclei change and give off radiation.", misconception: "Anything nuclear is dangerous; radioactivity is something people do to atoms." },
].map((o, i) => ({ ...o, unitId: UNIT_ID, position: i }));

/** Candidates: every one is unverified until opened and checked by a person. */
export const references = [
  { id: "ref-openstax-chem-ch2", kind: "textbook", publisher: "OpenStax", title: "Chemistry 2e, chapter 2: Atoms, Molecules, and Ions", authors: "Flowers, Theopold, Langley, Robinson", year: "2019", url: "https://openstax.org/books/chemistry-2e/pages/2-introduction", note: "Atomic structure, atomic number, isotopes, the periodic table, atom sizes." },
  { id: "ref-openstax-up3-ch10", kind: "textbook", publisher: "OpenStax", title: "University Physics Volume 3, chapter 10: Nuclear Physics", authors: "Ling, Sanny, Moebs", year: "2016", url: "https://openstax.org/books/university-physics-volume-3/pages/10-introduction", note: "Nuclear size, nuclear forces, stability, radioactivity." },
  { id: "ref-iaea-isotopes", kind: "official", publisher: "IAEA", title: "Explainer on isotopes (stable and radioactive)", authors: "", year: "", url: "", note: "Candidate. Open the IAEA page, record its exact title and URL, then mark verified." },
  { id: "ref-rutherford-1911", kind: "research", publisher: "Philosophical Magazine", title: "The scattering of alpha and beta particles by matter and the structure of the atom", authors: "E. Rutherford", year: "1911", url: "https://doi.org/10.1080/14786440508637080", note: "Gold-foil interpretation: a small dense nucleus." },
  { id: "ref-iupac-table", kind: "official", publisher: "IUPAC", title: "Periodic Table of the Elements", authors: "", year: "", url: "https://iupac.org/what-we-do/periodic-table-of-elements/", note: "Element symbols, names and atomic numbers." },
  { id: "ref-becquerel-1896", kind: "research", publisher: "Comptes Rendus de l'Academie des Sciences", title: "Sur les radiations emises par phosphorescence", authors: "H. Becquerel", year: "1896", url: "", note: "Discovery that uranium salts darken photographic plates." },
  { id: "ref-potassium-40", kind: "official", publisher: "To be identified", title: "Source for natural radioactive potassium-40 in food and the body", authors: "", year: "", url: "", note: "Candidate. A regulator or health-physics society page; open and record before marking verified." },
  { id: "ref-atom-hair-scale", kind: "textbook", publisher: "To be identified", title: "Source for the width of a human hair and of a typical atom", authors: "", year: "", url: "", note: "Hair about 0.07 mm; atom a few tenths of a nanometre. Confirm in a measurement reference." },
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
// ---------------------------------------------------------------------------

const L1 = "atoms-are-everywhere";

addItem("u1-l1-sort-matter", "u1-matter-is-atoms", "sort", {
  prompt: "Which of these are made of atoms? Sort each one.",
  buckets: [{ id: "atoms", label: "Made of atoms" }, { id: "not", label: "Not made of atoms" }],
  items: [
    { id: "phone", label: "Your phone", bucket: "atoms", art: "phone" },
    { id: "apple", label: "An apple", bucket: "atoms", art: "apple" },
    { id: "light", label: "Light", bucket: "not", art: "sun" },
    { id: "heat", label: "Heat", bucket: "not", art: "flame" },
  ],
  explanation: "Phones and apples are matter, and matter is made of atoms. Light and heat are forms of energy, not matter.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l1-order-sizes", "u1-atom-scale", "order", {
  prompt: "Put these in order from smallest to largest.",
  items: [
    { id: "atom", label: "An atom", art: "atom" },
    { id: "rbc", label: "A red blood cell", art: "rbc" },
    { id: "hair", label: "The width of a human hair", art: "hair" },
    { id: "rice", label: "A grain of rice", art: "rice" },
  ],
  explanation: "An atom is far smaller than even a single cell. A red blood cell is a few thousandths of a millimetre across, a hair is about 0.07 mm wide and a grain of rice is a few millimetres long.",
}, { difficulty: 2, referenceIds: ["ref-atom-hair-scale"] });

addItem("u1-l1-tom-microscope", "u1-atom-scale", "true_or_myth", {
  statement: "Atoms are too small to be seen with an ordinary light microscope.",
  answer: "true",
  explanation: "True. An ordinary microscope uses visible light, whose waves are far longer than an atom is wide. Special instruments can image atoms, but a classroom microscope cannot.",
}, { referenceIds: ["ref-atom-hair-scale"] });

addItem("u1-l1-choice-made-of", "u1-matter-is-atoms", "choice", {
  prompt: "Which of these is made of atoms?",
  options: opts(
    ["light", "The light from a lamp", "Light is energy, not matter.", "lamp"],
    ["shadow", "A shadow", "A shadow is just a place where light is blocked.", "shadow"],
    ["salt", "A grain of salt", undefined, "salt"],
    ["sound", "A sound", "Sound is a wave moving through matter; it is not matter itself.", "sound"],
  ),
  answer: "salt",
  explanation: "A grain of salt is matter, so it is made of atoms. Light, shadows and sounds are not matter.",
});

addItem("u1-l1-fill-touch", "u1-matter-is-atoms", "fill", {
  mode: "bank", prompt: "Everything you can touch is made of ___.",
  bank: [{ id: "atoms", label: "atoms" }, { id: "energy", label: "energy" }, { id: "light", label: "light" }],
  answer: "atoms",
  explanation: "Everything you can touch is made of atoms.",
});

const lesson1 = {
  lesson: { id: L1, unitId: UNIT_ID, title: "Atoms are everywhere", description: "Everything you can touch, from your phone to your own hand, is built from atoms. They are far too small to see, so you will use comparisons to get a feel for just how tiny they are. You will also learn what counts as matter and what does not.", estimatedMinutes: 4, xpReward: 40, teaches: ["u1-matter-is-atoms", "u1-atom-scale"], reliesOn: [] },
  references: [
    { referenceId: "ref-openstax-chem-ch2", supports: "Matter is made of atoms; light and heat are not matter." },
    { referenceId: "ref-atom-hair-scale", supports: "Sizes of a hair, a cell and an atom." },
  ],
  cards: [
    teach("c02", "explain", { title: "Everything is made of atoms", body: "Your hand, the table and the water you drink are all made of [[atom|atoms]]. Zoom in far enough on anything you can touch and you reach these tiny building blocks. Different things are just different atoms, joined in different ways. A skin cell, a drop of water and a grain of salt all come down to atoms.", ...fig(zoomChain()) }),
    teach("c12", "explain", { title: "What counts as matter?", body: "Matter is anything that has mass and takes up space. A phone, an apple and a glass of water all do. So does air: it has mass, and it fills a balloon. Everything made of matter is made of atoms. Light and heat are different. They are energy, not matter.", ...fig(matterExamples()) }),
    itemCard("c03", "u1-l1-sort-matter"),
    teach("c04", "explain", { title: "Even air, but not light", body: "Air is made of atoms too, joined into tiny groups. But light and heat are not matter at all. They are forms of energy, so they are not made of atoms.", ...fig(matterVsEnergy()) }),
    sim("c05", "scale-zoom", {
      task: "Zoom in from your hand down to a single atom. Tap each stop.",
      stops: [
        { id: "hand", label: "A hand", meters: 0.1, sizeLabel: "about 10 cm", note: "You can see and hold this.", icon: "Pointer", art: "hand" },
        { id: "cell", label: "A skin cell", meters: 0.00003, sizeLabel: "about 0.03 mm", note: "Too small to see without a microscope.", icon: "Microscope", art: "cell" },
        { id: "virus", label: "A virus", meters: 1e-7, sizeLabel: "about 100 nm", note: "About 300 times smaller than the cell. It takes a strong microscope to see one.", icon: "Health", art: "virus" },
        { id: "atom", label: "An atom", meters: 3e-10, sizeLabel: "a few tenths of a nm", note: "About 300 times smaller again than a virus.", icon: "Atom", art: "atom" },
      ],
    }),
    teach("c06", "explain", { title: "How wide is a hair?", body: "Across one hair you could line up roughly a few hundred thousand atoms. A hair looks thin, yet it is hundreds of thousands of atoms wide.", ...fig(hairVsAtom()) }),
    itemCard("c07", "u1-l1-order-sizes"),
    itemCard("c08", "u1-l1-tom-microscope"),
    teach("c09", "story", { speaker: "npc-ada", title: "An idea before the proof", tag: "Ancient Greece", body: "About 2,400 years ago the Greek thinker Democritus asked what would happen if you kept cutting something in half. He imagined a smallest piece that could not be cut, and called it atomos. Seeing atoms took far longer.", ...fig(halving()) }, "deeper"),
    itemCard("c10", "u1-l1-choice-made-of"),
    itemCard("c11", "u1-l1-fill-touch"),
  ],
};

// ---------------------------------------------------------------------------
// L2 — Protons, neutrons, electrons
// ---------------------------------------------------------------------------

const L2 = "protons-neutrons-electrons";

addItem("u1-l2-predict-stadium", "u1-nucleus", "predict", {
  input: "choice", prompt: "Imagine an atom blown up to the size of a football stadium. How big would its nucleus be?",
  options: opts(["marble", "A marble in the middle", undefined, "marble"], ["car", "A car in the middle", undefined, "car"], ["pitch", "The whole pitch", undefined, "stadium"], ["grass", "A blade of grass", undefined, "grass"]),
  answer: "marble",
  explanation: "Your guess is not scored. The reveal comes later in the lesson.",
}, { surfaces: ["lesson"] });

const atomHot = atomHotspot();
addItem("u1-l2-hotspot-nucleus", "u1-particles", "hotspot", {
  prompt: "Tap the nucleus of the atom.", scene: atomHot.scene, targets: atomHot.targets, answer: "nucleus",
  explanation: "The nucleus is the tiny centre of the atom. Protons and neutrons live there. The electrons are outside it.",
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

addItem("u1-l2-tom-volume", "u1-nucleus", "true_or_myth", {
  statement: "The nucleus takes up most of the space in an atom.",
  answer: "myth",
  explanation: "Myth. The nucleus is a tiny speck at the centre. Nearly all of the atom's size is the region where its electrons are found.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

addItem("u1-l2-choice-mass", "u1-nucleus", "choice", {
  prompt: "Where is almost all of an atom's mass?",
  options: opts(
    ["nucleus", "In the nucleus"],
    ["electrons", "In the electrons", "Electrons are incredibly light: a proton is about 1,800 times heavier."],
    ["even", "Spread evenly through the atom", "The mass is not spread out: it is packed into the nucleus."],
    ["none", "An atom has hardly any mass", "Atoms are tiny, but they do have mass, and nearly all of it is in the nucleus."],
  ),
  answer: "nucleus",
  explanation: "The nucleus holds almost all of the mass. A proton or neutron is about 1,800 times heavier than an electron.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

addItem("u1-l2-sort-location", "u1-particles", "sort", {
  prompt: "Where is each particle? Sort them.",
  buckets: [{ id: "in", label: "In the nucleus" }, { id: "out", label: "Outside the nucleus" }],
  items: [
    { id: "proton", label: "Proton", bucket: "in" },
    { id: "neutron", label: "Neutron", bucket: "in" },
    { id: "electron", label: "Electron", bucket: "out" },
  ],
  explanation: "Protons and neutrons are in the nucleus. Electrons are outside it.",
});

const lesson2 = {
  lesson: { id: L2, unitId: UNIT_ID, title: "Protons, neutrons, electrons", description: "Every atom is built from three kinds of particles: protons, neutrons and electrons. You will open one up to see what each particle carries and where it sits. You will also find out why the tiny nucleus holds nearly all of the atom's mass.", estimatedMinutes: 5, xpReward: 50, teaches: ["u1-particles", "u1-nucleus"], reliesOn: ["u1-matter-is-atoms"] },
  references: [
    { referenceId: "ref-openstax-chem-ch2", supports: "The three particles, their charges and positions." },
    { referenceId: "ref-openstax-up3-ch10", supports: "The size of the nucleus compared with the atom, and where the mass is." },
    { referenceId: "ref-rutherford-1911", supports: "The gold-foil experiment and the discovery of the nucleus." },
  ],
  cards: [
    itemCard("c01", "u1-l2-predict-stadium", { scored: false }),
    teach("c02", "explain", { title: "A centre and electrons", body: "Every atom has a tiny centre called the [[nucleus]]. Around it are [[electron|electrons]]. Almost everything about an atom, including nearly all its mass, comes from that small centre.", ...fig(atomModel(2, 2, 2)) }),
    itemCard("c03", "u1-l2-hotspot-nucleus"),
    teach("c04", "explain", { title: "Three particles", body: "The nucleus holds [[proton|protons]], which are positive, and [[neutron|neutrons]], which have no charge. Electrons are negative and sit outside the nucleus.", ...fig(particleCards()) }),
    itemCard("c05", "u1-l2-match-particles"),
    sim("c06", "atom-builder", {
      mode: "build", task: "Build a helium atom: 2 protons, 2 neutrons and 2 electrons.",
      goal: { protons: 2, neutrons: 2, electrons: 2 }, maxProtons: 6, maxNeutrons: 6,
      hint: "Add particles with the plus buttons. Helium has two of each.", objectives: ["u1-particles"],
    }),
    teach("c07", "story", { speaker: "npc-ada", title: "The gold foil surprise", tag: "1909-1911", body: "Ernest Rutherford's team fired tiny particles at thin gold foil. Most went straight through, but a few bounced back. That could only happen if each atom had a tiny, dense centre: the nucleus.", ...fig(goldFoil()) }, "deeper"),
    teach("c08", "reveal", { predictCardId: "c01", title: "The stadium, answered", body: "If an atom were a football stadium, its nucleus would be about the size of a marble in the middle. Yet that marble holds nearly all of the stadium's mass.", ...fig(stadiumMarble()) }),
    itemCard("c10", "u1-l2-tom-volume"),
    teach("c11", "explain", { title: "Not tiny planets", body: "Pictures often show electrons on neat rings, like planets. A better picture is a cloud: electrons are found in a region around the nucleus, and the cloud is where they are likely to be.", ...fig(electronCloud()) }, "deeper"),
    itemCard("c12", "u1-l2-choice-mass"),
    itemCard("c13", "u1-l2-sort-location"),
  ],
};

// ---------------------------------------------------------------------------
// L3 — Elements and the periodic table
// ---------------------------------------------------------------------------

const L3 = "elements-and-the-periodic-table";

addItem("u1-l3-predict-gold-oxygen", "u1-atomic-number", "predict", {
  input: "choice", prompt: "What is the real difference between an atom of gold and an atom of oxygen?",
  options: opts(["protons", "They have different numbers of protons"], ["stuff", "They are made of different kinds of stuff"], ["size", "Gold atoms are solid balls and oxygen atoms are hollow"], ["colour", "Gold atoms are yellow"]),
  answer: "protons",
  explanation: "Your guess is not scored. Find out as you build.",
}, { surfaces: ["lesson"] });

addItem("u1-l3-fill-six", "u1-atomic-number", "fill", {
  mode: "bank", prompt: "An atom with 6 protons is always ___.",
  bank: [{ id: "carbon", label: "carbon" }, { id: "oxygen", label: "oxygen" }, { id: "helium", label: "helium" }, { id: "gold", label: "gold" }],
  answer: "carbon",
  explanation: "Carbon is the element with 6 protons. Its atomic number is 6.",
}, { referenceIds: ["ref-openstax-chem-ch2", "ref-iupac-table"] });

const firstTen = firstTenGrid();
addItem("u1-l3-hotspot-oxygen", "u1-read-the-table", "hotspot", {
  prompt: "Tap element number 8.", scene: firstTen.scene, targets: firstTen.targets, answer: "el-o",
  explanation: "Element 8 is oxygen (symbol O). Its atomic number is 8, so every oxygen atom has 8 protons.",
}, { referenceIds: ["ref-iupac-table"] });

addItem("u1-l3-match-symbols", "u1-read-the-table", "match", {
  prompt: "Match each symbol to its element.",
  pairs: [
    { id: "c", left: "C", right: "Carbon" },
    { id: "o", left: "O", right: "Oxygen" },
    { id: "h", left: "H", right: "Hydrogen" },
    { id: "he", left: "He", right: "Helium" },
  ],
  explanation: "Symbols are short names for elements, usually the first one or two letters of the name: C for carbon, O for oxygen, H for hydrogen and He for helium.",
}, { referenceIds: ["ref-iupac-table"] });

addItem("u1-l3-tom-change-protons", "u1-atomic-number", "true_or_myth", {
  statement: "If you changed the number of protons in an atom, it would become a different element.",
  answer: "true",
  explanation: "True. The number of protons is the atomic number, and it alone decides which element an atom is.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l3-order-atomic-number", "u1-read-the-table", "order", {
  prompt: "Put these elements in order of atomic number, lowest first.",
  items: [
    { id: "hydrogen", label: "Hydrogen" },
    { id: "carbon", label: "Carbon" },
    { id: "oxygen", label: "Oxygen" },
  ],
  explanation: "Hydrogen is 1, carbon is 6 and oxygen is 8. The periodic table lists the elements in this order.",
}, { referenceIds: ["ref-iupac-table"] });

addItem("u1-l3-choice-gold-oxygen", "u1-atomic-number", "choice", {
  prompt: "What makes an atom of gold different from an atom of oxygen?",
  options: opts(
    ["protons", "They have different numbers of protons"],
    ["stuff", "They are made of different kinds of stuff", "Every atom is built from the same three particles. Only the numbers differ."],
    ["solid", "Gold atoms are solid and oxygen atoms are hollow", "Atoms of every element are mostly empty space around a tiny nucleus."],
    ["colour", "Gold atoms are yellow", "Single atoms do not have a colour in this sense. The difference is the proton count."],
  ),
  answer: "protons",
  explanation: "Gold atoms have 79 protons and oxygen atoms have 8. The particles are the same kinds; the number of protons is what differs.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

const lesson3 = {
  lesson: { id: L3, unitId: UNIT_ID, title: "Elements and the periodic table", description: "One number decides which element an atom is: how many protons it has. You will learn how that atomic number works. Then you will practise finding an element's symbol and number on the periodic table.", estimatedMinutes: 5, xpReward: 50, teaches: ["u1-atomic-number", "u1-read-the-table"], reliesOn: ["u1-particles"] },
  references: [
    { referenceId: "ref-openstax-chem-ch2", supports: "Atomic number decides the element." },
    { referenceId: "ref-iupac-table", supports: "Element names, symbols and atomic numbers." },
  ],
  cards: [
    itemCard("c01", "u1-l3-predict-gold-oxygen", { scored: false }),
    teach("c03", "explain", { title: "Protons decide the element", body: "The number of protons in an atom is its [[atomic-number|atomic number]]. One proton is always hydrogen. Two is always helium. Change the proton count and you have a different element.", ...fig(elementPictures()) }),
    sim("c02", "atom-builder", {
      mode: "element", task: "Build an atom of oxygen. Oxygen has 8 protons, so tap + until it says so.",
      goal: { protons: 8 }, maxProtons: 10, hint: "Oxygen is element number 8. Watch the name change as you add protons.", objectives: ["u1-atomic-number"],
    }),
    itemCard("c04", "u1-l3-fill-six"),
    teach("c05", "explain", { title: "The periodic table", body: "The periodic table lists every element in order of atomic number. Each box shows the atomic number, the symbol and the name. Carbon, for example, is element 6 with the symbol C.", ...fig(tableCell()) }),
    itemCard("c06", "u1-l3-hotspot-oxygen"),
    itemCard("c07", "u1-l3-match-symbols"),
    itemCard("c08", "u1-l3-tom-change-protons"),
    teach("c09", "explain", { title: "Atoms and ions", body: "A neutral atom has as many electrons as protons. If an atom gains or loses electrons it becomes an ion with an electric charge. Its element does not change, because its protons did not change.", ...fig(ionPair()) }, "deeper"),
    itemCard("c10", "u1-l3-order-atomic-number"),
    itemCard("c11", "u1-l3-choice-gold-oxygen"),
  ],
};

// ---------------------------------------------------------------------------
// L4 — Isotopes
// ---------------------------------------------------------------------------

const L4 = "isotopes";

addItem("u1-l4-predict-carbon-mass", "u1-isotope-definition", "predict", {
  input: "choice", prompt: "Two atoms are both carbon. Can one be heavier than the other?",
  options: opts(["yes", "Yes, they can have different masses"], ["no", "No, all carbon atoms are identical"]),
  answer: "yes",
  explanation: "Your guess is not scored. Build a heavier carbon atom in the next card.",
}, { surfaces: ["lesson"] });

addItem("u1-l4-sort-carbon", "u1-isotope-definition", "sort", {
  prompt: "Carbon always has 6 protons. Which of these atoms are carbon? Sort each one.",
  buckets: [{ id: "carbon", label: "Carbon" }, { id: "other", label: "Not carbon" }],
  items: [
    { id: "a", label: "6 protons, 6 neutrons", bucket: "carbon" },
    { id: "b", label: "6 protons, 8 neutrons", bucket: "carbon" },
    { id: "c", label: "7 protons, 7 neutrons", bucket: "other" },
    { id: "d", label: "8 protons, 8 neutrons", bucket: "other" },
  ],
  explanation: "Only the number of protons matters for the element. Any atom with 6 protons is carbon, whatever its neutrons. Those carbon atoms are isotopes of carbon.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l4-fill-c14", "u1-mass-number", "fill", {
  mode: "bank", prompt: "Carbon-14 has 6 protons and ___ neutrons.",
  bank: [{ id: "n8", label: "8" }, { id: "n6", label: "6" }, { id: "n14", label: "14" }, { id: "n20", label: "20" }], answer: "n8",
  explanation: "The 14 is the mass number: protons plus neutrons. Carbon has 6 protons, so 14 - 6 = 8 neutrons.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l4-match-carbon", "u1-mass-number", "match", {
  prompt: "Match each carbon atom to its name. The number in the name is protons plus neutrons.",
  pairs: [
    { id: "c12", left: "6 protons, 6 neutrons", right: "Carbon-12" },
    { id: "c13", left: "6 protons, 7 neutrons", right: "Carbon-13" },
    { id: "c14", left: "6 protons, 8 neutrons", right: "Carbon-14" },
  ],
  explanation: "Add them up: 6 + 6 = 12, 6 + 7 = 13 and 6 + 8 = 14.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

addItem("u1-l4-tom-all-radioactive", "u1-isotope-definition", "true_or_myth", {
  statement: "All isotopes are radioactive.",
  answer: "myth",
  explanation: "Myth. Isotope just means a version of an element with a certain number of neutrons. Most of the atoms around you, including carbon-12, are stable isotopes. Only some isotopes are radioactive.",
}, { referenceIds: ["ref-iaea-isotopes"] });

addItem("u1-l4-choice-share", "u1-isotope-definition", "choice", {
  prompt: "What do isotopes of the same element share?",
  options: opts(
    ["protons", "The same number of protons"],
    ["neutrons", "The same number of neutrons", "Different neutron counts are exactly what makes them different isotopes."],
    ["mass", "The same mass", "Different neutron counts give different masses."],
    ["nothing", "Nothing: they are different elements", "Isotopes of one element are the same element. They share their proton count."],
  ),
  answer: "protons",
  explanation: "Isotopes of an element all have the same number of protons, which is why they are the same element. They differ in neutrons.",
}, { referenceIds: ["ref-iaea-isotopes"] });

addItem("u1-l4-fill-c13", "u1-mass-number", "fill", {
  mode: "bank", prompt: "A carbon atom with 6 protons and 7 neutrons is called carbon-___.",
  bank: [{ id: "n13", label: "13" }, { id: "n12", label: "12" }, { id: "n7", label: "7" }, { id: "n1", label: "1" }], answer: "n13",
  explanation: "Add the protons and neutrons: 6 + 7 = 13. So this is carbon-13.",
}, { referenceIds: ["ref-openstax-chem-ch2"] });

const lesson4 = {
  lesson: { id: L4, unitId: UNIT_ID, title: "Isotopes", description: "Atoms of one element always have the same number of protons, but they can have different numbers of neutrons. Those versions are called isotopes. You will work out the particles in an isotope and name it from its numbers.", estimatedMinutes: 5, xpReward: 50, teaches: ["u1-isotope-definition", "u1-mass-number"], reliesOn: ["u1-particles", "u1-atomic-number"] },
  references: [
    { referenceId: "ref-openstax-chem-ch2", supports: "Isotope definition and mass number." },
    { referenceId: "ref-iaea-isotopes", supports: "Isotopes can be stable or radioactive." },
  ],
  cards: [
    itemCard("c01", "u1-l4-predict-carbon-mass", { scored: false }),
    teach("c03", "explain", { title: "Same element, different neutrons", body: "Atoms of one element can have different numbers of neutrons. These versions are called [[isotope|isotopes]]. Carbon-12 and carbon-14 are both carbon, because both have 6 protons.", ...fig(isotopePair()) }),
    sim("c02", "atom-builder", {
      mode: "isotope", task: "Make carbon-14 from carbon-12 by adding 2 neutrons.",
      goal: { neutrons: 8 }, start: { protons: 6, neutrons: 6, electrons: 6 }, lock: { protons: true, electrons: true }, maxNeutrons: 12,
      hint: "Carbon-12 has 6 neutrons. Tap + two times to reach 8. It is still carbon.", objectives: ["u1-isotope-definition", "u1-mass-number"],
    }),
    itemCard("c04", "u1-l4-sort-carbon"),
    teach("c05", "explain", { title: "Reading the name", body: "The number after the name is the mass number: protons plus neutrons. Carbon has 6 protons, so carbon-14 has 14 - 6 = 8 neutrons.", ...fig(massNumber()) }),
    itemCard("c06", "u1-l4-fill-c14"),
    itemCard("c07", "u1-l4-match-carbon"),
    itemCard("c08", "u1-l4-tom-all-radioactive"),
    teach("c09", "explain", { title: "Why your body can't tell", body: "Chemistry is run by electrons, and isotopes of an element have the same electrons. So they behave almost identically in chemical reactions. That is why scientists can use a rare isotope as a tracer.", ...fig(isotopePair({ same: true })) }, "deeper"),
    itemCard("c10", "u1-l4-choice-share"),
    itemCard("c11", "u1-l4-fill-c13"),
  ],
};

// ---------------------------------------------------------------------------
// L5 — Stable and unstable nuclei
// ---------------------------------------------------------------------------

const L5 = "stable-and-unstable-nuclei";

addItem("u1-l5-predict-strong", "u1-forces-in-nucleus", "predict", {
  input: "choice", prompt: "Protons all carry positive charge, and like charges push apart. So why doesn't the nucleus fly apart?",
  options: opts(["strong", "Another, stronger force holds the particles together"], ["electrons", "The electrons glue it together"], ["gravity", "Gravity holds it together"], ["apart", "Nuclei do fly apart all the time"]),
  answer: "strong",
  explanation: "Your guess is not scored. The next card shows what holds a nucleus together.",
}, { surfaces: ["lesson"] });

addItem("u1-l5-choice-push", "u1-forces-in-nucleus", "choice", {
  prompt: "Which force pushes the protons in a nucleus apart?",
  options: opts(
    ["electric", "Electric push", undefined, "bolt"],
    ["strong", "Strong force", "The strong force pulls particles together, not apart.", "magnet"],
    ["gravity", "Gravity", "Gravity is far too weak to matter between particles this small.", "apple"],
  ),
  answer: "electric",
  explanation: "Positive charges push each other apart. The strong force pulls neighbouring particles together and, over the tiny distances inside a nucleus, it wins when the nucleus is stable.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

addItem("u1-l5-sort-stable", "u1-stable-unstable", "sort", {
  prompt: "Which of these atoms are stable? Sort each one.",
  buckets: [{ id: "stable", label: "Stable" }, { id: "unstable", label: "Unstable" }],
  items: [
    { id: "c12", label: "Carbon-12", bucket: "stable" },
    { id: "c14", label: "Carbon-14", bucket: "unstable" },
    { id: "o16", label: "Oxygen-16", bucket: "stable" },
    { id: "u238", label: "Uranium-238", bucket: "unstable" },
  ],
  explanation: "Carbon-12 and oxygen-16 are stable. Carbon-14 and uranium-238 are unstable, which means radioactive.",
}, { referenceIds: ["ref-iaea-isotopes"] });

addItem("u1-l5-tom-human-made", "u1-stable-unstable", "true_or_myth", {
  statement: "Unstable atoms only exist where humans have made them.",
  answer: "myth",
  explanation: "Myth. Unstable atoms occur in nature. Potassium-40 is in bananas and in your own body, and carbon-14 is made in the upper atmosphere.",
}, { referenceIds: ["ref-potassium-40"] });

addItem("u1-l5-tom-body-stable", "u1-stable-unstable", "true_or_myth", {
  statement: "Most of the atoms in your body are stable.",
  answer: "true",
  explanation: "True. Almost all of your atoms are stable isotopes of hydrogen, oxygen, carbon and nitrogen. A tiny number are naturally unstable, such as potassium-40.",
}, { referenceIds: ["ref-potassium-40"] });

addItem("u1-l5-choice-unstable-does", "u1-stable-unstable", "choice", {
  prompt: "What does an unstable nucleus do over time?",
  options: opts(
    ["change", "It changes into a more stable nucleus and gives off radiation"],
    ["grow", "It slowly grows heavier", "Unstable nuclei change by giving something off, they do not keep growing."],
    ["nothing", "Nothing: unstable just means rare", "Unstable means the nucleus will eventually change."],
    ["vanish", "It disappears completely", "The nucleus changes into a different nucleus. Nothing vanishes."],
  ),
  answer: "change",
  explanation: "An unstable nucleus eventually changes into a more stable one and gives off radiation. That process is radioactivity.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

addItem("u1-l5-match-forces", "u1-forces-in-nucleus", "match", {
  prompt: "Match each to its effect in the nucleus.",
  pairs: [
    { id: "electric", left: "Electric push", right: "Pushes protons apart" },
    { id: "strong", left: "Strong force", right: "Holds neighbouring particles together" },
    { id: "neutrons", left: "Extra neutrons", right: "Add pull without adding push" },
  ],
  explanation: "Protons push each other apart. The strong force holds particles together over very short distances. Neutrons feel the strong force but have no charge, so they add glue without adding push.",
}, { referenceIds: ["ref-openstax-up3-ch10"] });

const lesson5 = {
  lesson: { id: L5, unitId: UNIT_ID, title: "Stable and unstable nuclei", description: "A nucleus packs positive protons close together, so something has to stop them from flying apart. You will see how the electric push and the strong force compete. Then you will learn why most nuclei are stable and what happens when one is not.", estimatedMinutes: 5, xpReward: 50, teaches: ["u1-forces-in-nucleus", "u1-stable-unstable"], reliesOn: ["u1-nucleus", "u1-isotope-definition"] },
  references: [
    { referenceId: "ref-openstax-up3-ch10", supports: "Nuclear forces and nuclear stability." },
    { referenceId: "ref-iaea-isotopes", supports: "Stable and unstable isotopes." },
    { referenceId: "ref-potassium-40", supports: "Natural unstable isotopes in food and the body." },
    { referenceId: "ref-becquerel-1896", supports: "The discovery of radioactivity in a natural mineral." },
  ],
  cards: [
    itemCard("c01", "u1-l5-predict-strong", { scored: false }),
    teach("c02", "explain", { title: "A tug of war inside the nucleus", body: "Protons push each other apart with an electric force. A stronger force, the strong force, pulls neighbouring particles together, but only at very short range. A nucleus lasts when the pull wins.", ...fig(nuclearForces()) }),
    itemCard("c03", "u1-l5-choice-push"),
    sim("c04", "atom-builder", {
      mode: "stability", task: "Carbon-14 is unstable. Change the neutrons until the carbon atom is stable.",
      goal: { stable: true }, start: { protons: 6, neutrons: 8, electrons: 6 }, lock: { protons: true, electrons: true }, maxNeutrons: 12,
      hint: "Stable carbon has 6 or 7 neutrons. Tap - until the badge says Stable.", objectives: ["u1-stable-unstable"],
    }),
    teach("c05", "explain", { title: "Neutrons are glue", body: "Neutrons add pull from the strong force without adding any electric push. So a nucleus needs the right mix of protons and neutrons. Too few or too many neutrons and the nucleus is unstable.", ...fig(neutronGlue()) }),
    itemCard("c06", "u1-l5-sort-stable"),
    teach("c07", "explain", { title: "Unstable means it will change", body: "An unstable nucleus does not last forever. At some moment it changes into a more stable nucleus and gives off [[radiation]]. A nucleus that does this is called radioactive.", ...fig(decayFigure()) }),
    itemCard("c08", "u1-l5-tom-human-made"),
    itemCard("c09", "u1-l5-tom-body-stable"),
    teach("c10", "story", { speaker: "npc-ada", title: "Found in a rock", tag: "1896", body: "Henri Becquerel left a uranium mineral on a wrapped photographic plate and found it fogged, even with no light. Radioactivity was discovered in a natural mineral, long before people made any nuclear technology.", ...fig(becquerelPlate()) }, "deeper"),
    itemCard("c11", "u1-l5-choice-unstable-does"),
    itemCard("c12", "u1-l5-match-forces"),
  ],
};

// ---------------------------------------------------------------------------
// Extra bank items (practice, checkpoint, review): fresh wording, same objectives
// ---------------------------------------------------------------------------

const X = (id, objectiveId, type, data, difficulty = 1, referenceIds = []) =>
  addItem(id, objectiveId, type, data, { difficulty, surfaces: BANK_SURFACES, referenceIds });

X("u1-x-water-atoms", "u1-matter-is-atoms", "true_or_myth", { statement: "A glass of water is made of atoms.", answer: "true", explanation: "True. Water is matter, and all matter is made of atoms (joined together as molecules of water)." }, 1, ["ref-openstax-chem-ch2"]);
X("u1-x-not-atoms", "u1-matter-is-atoms", "choice", {
  prompt: "Which of these is NOT made of atoms?",
  options: opts(["wood", "The wood in a campfire", "Wood is matter, so it is made of atoms."], ["air", "The air around the fire", "Air is matter, so it is made of atoms."], ["ash", "The ash left behind", "Ash is matter, so it is made of atoms."], ["heat", "The heat you feel from the fire"]),
  answer: "heat",
  explanation: "Heat is energy, not matter, so it is not made of atoms. The wood, the air and the ash are all matter.",
}, 2, ["ref-openstax-chem-ch2"]);
X("u1-x-hair-choice", "u1-atom-scale", "choice", {
  prompt: "About how many atoms would fit side by side across the width of one human hair?",
  options: opts(["hundreds", "A few hundred", "That is far too few. Atoms are much smaller than that."], ["thousands", "A few thousand", "Still too few: a hair is far wider than a few thousand atoms."], ["hundredk", "A few hundred thousand"], ["billions", "A few billion", "That is too many. A hair is wide, but not that wide."]),
  answer: "hundredk",
  explanation: "A hair is about 0.07 mm wide and an atom a few tenths of a nanometre, so a few hundred thousand atoms fit across it.",
}, 2, ["ref-atom-hair-scale"]);
X("u1-x-atom-width", "u1-atom-scale", "choice", {
  prompt: "Roughly how wide is a single atom?",
  options: opts(["nm", "A few tenths of a nanometre"], ["um", "A few tenths of a micrometre", "That is about the size of a bacterium, thousands of atoms across."], ["mm", "A few tenths of a millimetre", "That is about the width of a hair, hundreds of thousands of atoms across."], ["m", "A few tenths of a metre", "That is about the size of a loaf of bread."]),
  answer: "nm",
  explanation: "An atom is about a few tenths of a nanometre across: a nanometre is a billionth of a metre.",
}, 2, ["ref-atom-hair-scale"]);

X("u1-x-negative", "u1-particles", "choice", {
  prompt: "Which particle has a negative electric charge?",
  options: opts(["electron", "The electron"], ["proton", "The proton", "Protons are positive."], ["neutron", "The neutron", "Neutrons have no charge."]),
  answer: "electron",
  explanation: "Electrons are negative. Protons are positive and neutrons have no charge.",
}, 1, ["ref-openstax-chem-ch2"]);
X("u1-x-neutron-charge", "u1-particles", "true_or_myth", { statement: "Neutrons have no electric charge.", answer: "true", explanation: "True. That is why they are called neutrons." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-nucleus-size", "u1-nucleus", "choice", {
  prompt: "Compared with the whole atom, how big is the nucleus?",
  options: opts(["tiny", "Tiny: a speck at the centre"], ["half", "About half the width of the atom", "The nucleus is vastly smaller than that."], ["same", "About the same size as the atom", "The atom is many thousands of times wider than its nucleus."]),
  answer: "tiny",
  explanation: "The nucleus is a tiny speck. The atom is roughly a hundred thousand times wider.",
}, 1, ["ref-openstax-up3-ch10"]);
X("u1-x-electrons-inside", "u1-nucleus", "true_or_myth", { statement: "The electrons of an atom are packed inside the nucleus.", answer: "myth", explanation: "Myth. The nucleus holds the protons and neutrons. Electrons are found outside it, in a region far larger than the nucleus." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-oxygen-protons", "u1-atomic-number", "choice", {
  prompt: "How many protons does every oxygen atom have?",
  options: opts(["8", "8"], ["6", "6", "Six protons would make it carbon."], ["16", "16", "16 is oxygen-16's mass number, not its proton count."], ["2", "2", "Two protons would make it helium."]),
  answer: "8",
  explanation: "Oxygen is element 8, so every oxygen atom has 8 protons.",
}, 2, ["ref-iupac-table"]);
X("u1-x-same-element", "u1-atomic-number", "true_or_myth", { statement: "Two atoms with different numbers of protons can be the same element.", answer: "myth", explanation: "Myth. The number of protons decides the element. Different proton counts mean different elements." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-corner-number", "u1-read-the-table", "choice", {
  prompt: "On the periodic table, what is the whole number in the corner of an element's box?",
  options: opts(["z", "The atomic number, which is the number of protons"], ["mass", "Number of neutrons", "The corner number counts protons, not neutrons."], ["year", "Year of discovery", "That is not shown on the table."]),
  answer: "z",
  explanation: "The number in the corner is the atomic number: how many protons each atom of that element has.",
}, 1, ["ref-iupac-table"]);
const ten2 = firstTenGrid();
X("u1-x-find-carbon", "u1-read-the-table", "hotspot", { prompt: "Tap carbon (symbol C).", scene: ten2.scene, targets: ten2.targets, answer: "el-c", explanation: "Carbon is element 6, with the symbol C." }, 1, ["ref-iupac-table"]);

X("u1-x-isotopes-of", "u1-isotope-definition", "choice", {
  prompt: "What are carbon-12 and carbon-14?",
  options: opts(["iso", "Isotopes of the same element"], ["diff", "Two different elements", "Both have 6 protons, so both are carbon."], ["ions", "Ions of carbon", "Ions differ in electrons. These differ in neutrons."]),
  answer: "iso",
  explanation: "They are isotopes of carbon: the same number of protons, different numbers of neutrons.",
}, 1, ["ref-openstax-chem-ch2"]);
X("u1-x-isotope-neutrons", "u1-isotope-definition", "true_or_myth", { statement: "Isotopes of one element have different numbers of neutrons.", answer: "true", explanation: "True. That is what makes them different isotopes of the same element." }, 1, ["ref-openstax-chem-ch2"]);

X("u1-x-oxygen-17", "u1-mass-number", "fill", { mode: "number", prompt: "Oxygen-17 has 8 protons and ___ neutrons.", answer: 9, tolerance: 0, explanation: "The mass number 17 is protons plus neutrons. 17 - 8 = 9 neutrons." }, 2, ["ref-openstax-chem-ch2"]);
X("u1-x-u235", "u1-mass-number", "choice", {
  prompt: "In the name uranium-235, what does 235 tell you?",
  options: opts(["sum", "The number of protons plus neutrons"], ["protons", "The number of protons", "Uranium always has 92 protons. The 235 counts protons and neutrons together."], ["neutrons", "The number of neutrons", "235 is protons plus neutrons. Uranium-235 has 143 neutrons."]),
  answer: "sum",
  explanation: "The number is the mass number, protons plus neutrons. Uranium has 92 protons, so uranium-235 has 143 neutrons.",
}, 2, ["ref-openstax-chem-ch2"]);

X("u1-x-strong-does", "u1-forces-in-nucleus", "choice", {
  prompt: "What does the strong force do in a nucleus?",
  options: opts(["hold", "Holds neighbouring protons and neutrons together"], ["push", "Pushes protons apart", "That is the electric force between positive charges."], ["spin", "Spins the electrons", "The strong force acts inside the nucleus, not on electrons."]),
  answer: "hold",
  explanation: "The strong force pulls neighbouring protons and neutrons together, but only over very short distances.",
}, 1, ["ref-openstax-up3-ch10"]);
X("u1-x-strong-range", "u1-forces-in-nucleus", "true_or_myth", { statement: "The strong force reaches across long distances, like gravity.", answer: "myth", explanation: "Myth. The strong force only works over a very short range, about the size of a nucleus. Beyond that it drops to almost nothing." }, 2, ["ref-openstax-up3-ch10"]);

X("u1-x-unstable-which", "u1-stable-unstable", "choice", {
  prompt: "Which of these atoms is unstable?",
  options: opts(["c14", "Carbon-14"], ["c12", "Carbon-12", "Carbon-12 is stable."], ["h1", "Hydrogen-1", "Hydrogen-1 is stable."], ["o16", "Oxygen-16", "Oxygen-16 is stable."]),
  answer: "c14",
  explanation: "Carbon-14 has too many neutrons for a stable nucleus, so it is radioactive.",
}, 1, ["ref-iaea-isotopes"]);
X("u1-x-potassium", "u1-stable-unstable", "true_or_myth", { statement: "Natural potassium, like the potassium in a banana, includes a small amount of a radioactive isotope.", answer: "true", explanation: "True. Roughly 1 in every 10,000 potassium atoms is potassium-40, which is radioactive." }, 2, ["ref-potassium-40"]);

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
