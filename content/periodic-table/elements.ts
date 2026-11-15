/**
 * Periodic table core data — bundled, offline, and independent of the content
 * database. This module intentionally uses no enums, path aliases or React
 * Native imports so Node tests (`scripts/test-periodic-table.mjs`) can load it
 * directly.
 *
 * Layout model (18 columns):
 *   rows 1-7   main table (period = row, group = column)
 *   row 8      visual gap
 *   row 9      lanthanides La-Lu in columns 3-17
 *   row 10     actinides Ac-Lr in columns 3-17
 *   (6,3) and (7,3) hold the "57-71" / "89-103" placeholder markers.
 *
 * Atomic masses are IUPAC abridged standard atomic weights. For elements with
 * no stable isotope the mass is the mass number of the longest-lived known
 * isotope and `massIsMassNumber` is true (conventionally shown in brackets).
 * Category follows the common 10-color beginner scheme; elements 109-118 are
 * "unknown" because their chemistry has not been measured.
 */

export type ElementCategory =
  | "alkali-metal"
  | "alkaline-earth-metal"
  | "transition-metal"
  | "post-transition-metal"
  | "metalloid"
  | "reactive-nonmetal"
  | "noble-gas"
  | "lanthanide"
  | "actinide"
  | "unknown";

export interface PeriodicElement {
  atomicNumber: number;
  symbol: string;
  name: string;
  category: ElementCategory;
  /** IUPAC group 1-18, or null for the f-block (lanthanides/actinides). */
  group: number | null;
  /** Period (row of the periodic table) 1-7. */
  period: number;
  /** Standard atomic mass (u) or mass number of the longest-lived isotope. */
  atomicMass: number;
  /** True when `atomicMass` is a mass number (no stable isotope). */
  massIsMassNumber: boolean;
  /** True when every known isotope is radioactive (Tc, Pm and Z >= 84). */
  noStableIsotope: boolean;
  /** 1-based grid row (see layout model above). */
  gridRow: number;
  /** 1-based grid column (1-18). */
  gridCol: number;
  /** One or two beginner-friendly sentences. */
  fact: string;
  /** Short "nuclear connection" blurb, only where genuinely relevant. */
  nuclearConnection?: string;
  /** Lesson ids that exist in the content database. */
  relatedLessonIds: string[];
  /** Encyclopedia entry ids that exist in the content database. */
  relatedTerms: string[];
}

export const CATEGORY_ORDER: ElementCategory[] = [
  "alkali-metal",
  "alkaline-earth-metal",
  "transition-metal",
  "post-transition-metal",
  "metalloid",
  "reactive-nonmetal",
  "noble-gas",
  "lanthanide",
  "actinide",
  "unknown",
];

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  "alkali-metal": "Alkali metal",
  "alkaline-earth-metal": "Alkaline earth metal",
  "transition-metal": "Transition metal",
  "post-transition-metal": "Post-transition metal",
  metalloid: "Metalloid",
  "reactive-nonmetal": "Reactive nonmetal",
  "noble-gas": "Noble gas",
  lanthanide: "Lanthanide",
  actinide: "Actinide",
  unknown: "Unknown properties",
};

/** One-line beginner description of each category. */
export const CATEGORY_BLURBS: Record<ElementCategory, string> = {
  "alkali-metal": "Soft, shiny, very reactive metals in group 1 (hydrogen sits there too but is not a metal).",
  "alkaline-earth-metal": "Silvery metals in group 2 that are reactive, though less than group 1.",
  "transition-metal": "Hard, dense metals in the middle block; many make colorful compounds.",
  "post-transition-metal": "Softer, lower-melting metals found after the transition metals.",
  metalloid: "Elements with in-between properties: some metal-like, some nonmetal-like.",
  "reactive-nonmetal": "Nonmetals (including the halogens) that readily form compounds.",
  "noble-gas": "Gases in group 18 that almost never react.",
  lanthanide: "The 15 'rare earth' metals La-Lu, shown in the row below the main table.",
  actinide: "The 15 heavy, radioactive elements Ac-Lr, shown in the bottom row.",
  unknown: "Superheavy elements made in labs a few atoms at a time; their chemistry is not well measured.",
};

/** Beginner explainer: element vs isotope vs ion. */
export interface ConceptExplainer {
  term: string;
  summary: string;
  example: string;
}

export const ELEMENT_ISOTOPE_ION: ConceptExplainer[] = [
  {
    term: "Element",
    summary: "All atoms with the same number of protons. That number is the atomic number, and it decides which element an atom is.",
    example: "Every carbon atom has 6 protons. An atom with 7 protons is nitrogen, never carbon.",
  },
  {
    term: "Isotope",
    summary: "Atoms of the same element with different numbers of neutrons. They act almost the same chemically but have different masses, and some are radioactive.",
    example: "Carbon-12 has 6 protons and 6 neutrons and is stable. Carbon-14 has 6 protons and 8 neutrons and is radioactive.",
  },
  {
    term: "Ion",
    summary: "An atom that has gained or lost electrons, so it carries an electric charge. The protons do not change, so it is still the same element.",
    example: "A sodium atom (Na) has 11 electrons. If it loses one it becomes Na⁺ with 10 electrons, still sodium.",
  },
];

type CategoryCode = "A" | "E" | "T" | "P" | "M" | "R" | "N" | "L" | "C" | "U";

const CATEGORY_BY_CODE: Record<CategoryCode, ElementCategory> = {
  A: "alkali-metal",
  E: "alkaline-earth-metal",
  T: "transition-metal",
  P: "post-transition-metal",
  M: "metalloid",
  R: "reactive-nonmetal",
  N: "noble-gas",
  L: "lanthanide",
  C: "actinide",
  U: "unknown",
};

/** [atomic number, symbol, name, category, mass, fact] */
type Row = [number, string, string, CategoryCode, number, string];

const ROWS: Row[] = [
  [1, "H", "Hydrogen", "R", 1.008, "The lightest and most common element in the universe. Its simplest atom is just one proton and one electron."],
  [2, "He", "Helium", "N", 4.0026, "A very light gas that does not react. It lifts party balloons and cools the magnets in MRI scanners."],
  [3, "Li", "Lithium", "A", 6.94, "The lightest metal. It stores energy in the rechargeable batteries of phones and electric cars."],
  [4, "Be", "Beryllium", "E", 9.0122, "A light but very stiff metal used in aircraft and spacecraft parts. Its dust is toxic, so it is handled with care."],
  [5, "B", "Boron", "M", 10.81, "A hard metalloid found in borax and heat-resistant glass. Plants need a little of it to grow."],
  [6, "C", "Carbon", "R", 12.011, "The backbone of life: every living thing is built on carbon. It also forms diamond, graphite and soot."],
  [7, "N", "Nitrogen", "R", 14.007, "Makes up about 78% of the air you breathe. Your proteins and DNA both contain it."],
  [8, "O", "Oxygen", "R", 15.999, "About 21% of the air, and the gas your cells use to release energy from food. It is also needed for fire."],
  [9, "F", "Fluorine", "R", 18.998, "The most reactive of all elements. Tiny amounts of fluoride in toothpaste help protect teeth."],
  [10, "Ne", "Neon", "N", 20.18, "A noble gas that glows red-orange when electricity passes through it, as in neon signs."],
  [11, "Na", "Sodium", "A", 22.99, "A soft metal that reacts fiercely with water. Combined with chlorine it becomes everyday table salt."],
  [12, "Mg", "Magnesium", "E", 24.305, "A light metal that burns with a bright white flame. It sits at the center of chlorophyll in green plants."],
  [13, "Al", "Aluminum", "P", 26.982, "A light, rust-resistant metal used in drink cans, bikes and aircraft. It is the most abundant metal in Earth's crust."],
  [14, "Si", "Silicon", "M", 28.085, "Found in sand and rock, and the key material in computer chips and solar cells."],
  [15, "P", "Phosphorus", "R", 30.974, "Essential for DNA, bones and the energy molecule ATP. It is also a key ingredient in fertilizer."],
  [16, "S", "Sulfur", "R", 32.06, "A yellow solid found near volcanoes. It is used to make sulfuric acid and to harden rubber."],
  [17, "Cl", "Chlorine", "R", 35.45, "A greenish gas that kills germs, so it is used to disinfect pools and drinking water."],
  [18, "Ar", "Argon", "N", 39.95, "An unreactive gas that makes up almost 1% of air. It fills light bulbs and shields metal during welding."],
  [19, "K", "Potassium", "A", 39.098, "A soft, reactive metal. Your nerves and muscles need potassium, which is found in bananas and potatoes."],
  [20, "Ca", "Calcium", "E", 40.078, "Builds strong bones and teeth. It is also the main metal in limestone, chalk and marble."],
  [21, "Sc", "Scandium", "T", 44.956, "A rare, light metal mixed into aluminum to make strong, light sports gear."],
  [22, "Ti", "Titanium", "T", 47.867, "Strong, light and corrosion-proof. It is used in jet engines, bicycles and medical implants."],
  [23, "V", "Vanadium", "T", 50.942, "Mixed into steel to make tough tools and springs."],
  [24, "Cr", "Chromium", "T", 51.996, "Gives stainless steel its shine and rust resistance, and makes chrome plating."],
  [25, "Mn", "Manganese", "T", 54.938, "Added to steel to make it strong and hard-wearing. It is also used in some batteries."],
  [26, "Fe", "Iron", "T", 55.845, "The main metal in steel and in Earth's core. The hemoglobin in your blood uses iron to carry oxygen."],
  [27, "Co", "Cobalt", "T", 58.933, "Gives glass and pottery a deep blue color and is used in batteries and strong magnets."],
  [28, "Ni", "Nickel", "T", 58.693, "A shiny, rust-resistant metal used in coins, stainless steel and rechargeable batteries."],
  [29, "Cu", "Copper", "T", 63.546, "A reddish metal that carries electricity very well, so it is used in wires and pipes."],
  [30, "Zn", "Zinc", "T", 65.38, "Coats steel to stop it rusting. Your immune system needs a little zinc."],
  [31, "Ga", "Gallium", "P", 69.723, "A metal that melts at about 30 °C, so it can melt in your hand. It is used in LEDs and chips."],
  [32, "Ge", "Germanium", "M", 72.63, "A metalloid used in fiber-optic cables and infrared lenses, and in some of the first transistors."],
  [33, "As", "Arsenic", "M", 74.922, "A metalloid famous as a poison, but also used in some semiconductors."],
  [34, "Se", "Selenium", "R", 78.971, "A nonmetal your body needs in tiny amounts. It is also used in glass and some solar cells."],
  [35, "Br", "Bromine", "R", 79.904, "One of only two elements that are liquid at room temperature (the other is mercury). It gives off reddish-brown fumes."],
  [36, "Kr", "Krypton", "N", 83.798, "A noble gas used in some high-speed photo flashes and special lighting."],
  [37, "Rb", "Rubidium", "A", 85.468, "A soft, very reactive metal used in some atomic clocks and research."],
  [38, "Sr", "Strontium", "E", 87.62, "Burns bright red, which is why it is used in fireworks and emergency flares."],
  [39, "Y", "Yttrium", "T", 88.906, "Used in the phosphors that make some LEDs and lasers glow."],
  [40, "Zr", "Zirconium", "T", 91.224, "A very corrosion-resistant metal. Its crystal form, cubic zirconia, is used as an imitation diamond."],
  [41, "Nb", "Niobium", "T", 92.906, "Used in the superconducting magnets of MRI machines and in special steels."],
  [42, "Mo", "Molybdenum", "T", 95.95, "Strengthens steel for pipelines and tools. Some of your enzymes need a trace of it."],
  [43, "Tc", "Technetium", "T", 98, "The first element made artificially, and it has no stable isotopes. Almost none exists naturally on Earth."],
  [44, "Ru", "Ruthenium", "T", 101.07, "A hard, rare metal from the platinum family used in electrical contacts."],
  [45, "Rh", "Rhodium", "T", 102.91, "A rare, shiny metal used in car catalytic converters and to plate jewelry."],
  [46, "Pd", "Palladium", "T", 106.42, "A rare metal that cleans exhaust gases in catalytic converters and soaks up hydrogen."],
  [47, "Ag", "Silver", "T", 107.87, "The best electrical conductor of all the elements. It is used in jewelry, mirrors and electronics."],
  [48, "Cd", "Cadmium", "T", 112.41, "A soft metal once common in rechargeable batteries. It is toxic, so its use is now limited."],
  [49, "In", "Indium", "P", 114.82, "A soft metal used in touchscreens: indium tin oxide is see-through and conducts electricity."],
  [50, "Sn", "Tin", "P", 118.71, "A soft metal used to coat steel cans and in solder. Mixed with copper it makes bronze."],
  [51, "Sb", "Antimony", "M", 121.76, "A metalloid used in flame retardants and to harden lead in batteries."],
  [52, "Te", "Tellurium", "M", 127.6, "A rare metalloid used in some thin-film solar panels."],
  [53, "I", "Iodine", "R", 126.9, "Your thyroid gland needs it to make hormones, which is why table salt is often iodized. It forms purple vapor when heated."],
  [54, "Xe", "Xenon", "N", 131.29, "A heavy noble gas used in bright car headlights, camera flashes and spacecraft ion engines."],
  [55, "Cs", "Cesium", "A", 132.91, "A soft golden metal that explodes in water. Cesium atoms in atomic clocks define the length of one second."],
  [56, "Ba", "Barium", "E", 137.33, "A heavy metal that burns green in fireworks. A barium drink makes your digestive system show up on X-rays."],
  [57, "La", "Lanthanum", "L", 138.91, "The first of the lanthanides. It is used in camera lenses and some rechargeable batteries."],
  [58, "Ce", "Cerium", "L", 140.12, "The most common rare earth metal. It is used in lighter flints and in catalytic converters."],
  [59, "Pr", "Praseodymium", "L", 140.91, "Gives glass and ceramics a yellow-green tint and is used in strong magnets."],
  [60, "Nd", "Neodymium", "L", 144.24, "Makes the strongest everyday magnets, found in headphones, hard drives and wind turbines."],
  [61, "Pm", "Promethium", "L", 145, "A radioactive lanthanide with no stable isotopes. It is extremely rare in nature."],
  [62, "Sm", "Samarium", "L", 150.36, "Used in powerful magnets that keep their strength at high temperatures."],
  [63, "Eu", "Europium", "L", 151.96, "Makes the red glow in older TV screens, and glows under UV light in euro banknote security ink."],
  [64, "Gd", "Gadolinium", "L", 157.25, "Used as a contrast agent that makes some MRI scans clearer."],
  [65, "Tb", "Terbium", "L", 158.93, "Gives off a green glow and is used in some lighting and display phosphors."],
  [66, "Dy", "Dysprosium", "L", 162.5, "Added to magnets in electric motors and wind turbines to keep them strong when hot."],
  [67, "Ho", "Holmium", "L", 164.93, "Has one of the strongest magnetic responses of any element and is used in some medical lasers."],
  [68, "Er", "Erbium", "L", 167.26, "Gives glass a pink tint and amplifies light signals in fiber-optic cables."],
  [69, "Tm", "Thulium", "L", 168.93, "One of the least abundant rare earth metals, used in some lasers."],
  [70, "Yb", "Ytterbium", "L", 173.05, "Used in very precise atomic clocks and some lasers."],
  [71, "Lu", "Lutetium", "L", 174.97, "The densest and hardest lanthanide. It is used in some PET scanner detectors and in medicine."],
  [72, "Hf", "Hafnium", "T", 178.49, "A dense metal used in computer chips and in the tips of plasma cutting torches."],
  [73, "Ta", "Tantalum", "T", 180.95, "A very corrosion-resistant metal used in the tiny capacitors inside phones and laptops."],
  [74, "W", "Tungsten", "T", 183.84, "Has the highest melting point of any metal (about 3,400 °C), which made it ideal for old light-bulb filaments."],
  [75, "Re", "Rhenium", "T", 186.21, "One of the rarest elements in Earth's crust. It is used in jet-engine parts that stay strong when very hot."],
  [76, "Os", "Osmium", "T", 190.23, "The densest naturally occurring element, used for hard-wearing pen tips and contacts."],
  [77, "Ir", "Iridium", "T", 192.22, "Extremely corrosion-resistant. A thin layer of iridium in rock marks the asteroid impact that helped end the dinosaurs."],
  [78, "Pt", "Platinum", "T", 195.08, "A precious metal that does not tarnish, used in jewelry and in catalytic converters."],
  [79, "Au", "Gold", "T", 196.97, "A soft, yellow metal that never tarnishes. It is used in jewelry and in reliable electrical contacts."],
  [80, "Hg", "Mercury", "T", 200.59, "The only metal that is liquid at room temperature. It is toxic, so it is being phased out of thermometers."],
  [81, "Tl", "Thallium", "P", 204.38, "A soft metal whose compounds are highly poisonous. It has a few specialized uses in electronics."],
  [82, "Pb", "Lead", "P", 207.2, "A heavy, soft metal once used in pipes and paint. It is toxic, but its density makes it useful for shielding."],
  [83, "Bi", "Bismuth", "P", 208.98, "A pinkish metal used in some stomach medicines. It is the heaviest element that is practically stable."],
  [84, "Po", "Polonium", "P", 209, "A rare, intensely radioactive metal discovered by Marie and Pierre Curie in 1898. They named it after Marie's homeland, Poland."],
  [85, "At", "Astatine", "M", 210, "One of the rarest elements on Earth, and all of its isotopes are radioactive. It is classed as a metalloid, but little is known about its properties."],
  [86, "Rn", "Radon", "N", 222, "A radioactive, invisible noble gas that seeps out of the ground and is the heaviest of the noble gases."],
  [87, "Fr", "Francium", "A", 223, "Extremely rare and unstable. Its longest-lived isotope lasts only about 22 minutes."],
  [88, "Ra", "Radium", "E", 226, "Discovered by Marie and Pierre Curie in 1898. It glows faintly, and was once used in glow-in-the-dark paint."],
  [89, "Ac", "Actinium", "C", 227, "The first of the actinides. Its intense radioactivity makes it glow with a pale blue light in the dark."],
  [90, "Th", "Thorium", "C", 232.04, "A weakly radioactive metal that is about three times more common in Earth's crust than uranium."],
  [91, "Pa", "Protactinium", "C", 231.04, "A rare, radioactive metal found in tiny amounts in uranium ores."],
  [92, "U", "Uranium", "C", 238.03, "The heaviest element found in nature in large amounts. It is slightly radioactive and is the main fuel of nuclear power plants."],
  [93, "Np", "Neptunium", "C", 237, "The first element heavier than uranium to be made, in 1940. It was named after the planet Neptune."],
  [94, "Pu", "Plutonium", "C", 244, "A heavy, radioactive metal made in nuclear reactors. It was named after the dwarf planet Pluto."],
  [95, "Am", "Americium", "C", 243, "A man-made radioactive metal. A tiny amount of it is used in many household smoke detectors."],
  [96, "Cm", "Curium", "C", 247, "A man-made radioactive metal named in honor of Marie and Pierre Curie."],
  [97, "Bk", "Berkelium", "C", 247, "A man-made radioactive metal first made in Berkeley, California, in 1949."],
  [98, "Cf", "Californium", "C", 251, "A man-made radioactive metal named after California, where it was first made."],
  [99, "Es", "Einsteinium", "C", 252, "A man-made element named after Albert Einstein. It was first found in the debris of the 1952 hydrogen bomb test."],
  [100, "Fm", "Fermium", "C", 257, "A man-made element named after physicist Enrico Fermi. Like einsteinium, it was first found in 1952 test debris."],
  [101, "Md", "Mendelevium", "C", 258, "A man-made element named after Dmitri Mendeleev, who devised the periodic table. It has only ever been made a few atoms at a time."],
  [102, "No", "Nobelium", "C", 259, "A man-made element named after Alfred Nobel, who founded the Nobel Prizes."],
  [103, "Lr", "Lawrencium", "C", 266, "A man-made element named after Ernest Lawrence, inventor of the cyclotron. It is the last of the actinides."],
  [104, "Rf", "Rutherfordium", "T", 267, "A superheavy, man-made element named after Ernest Rutherford, who discovered the atomic nucleus."],
  [105, "Db", "Dubnium", "T", 268, "A superheavy, man-made element named after Dubna, the Russian research town where it was made."],
  [106, "Sg", "Seaborgium", "T", 269, "A superheavy element named after Glenn Seaborg. It was the first element named after a living person."],
  [107, "Bh", "Bohrium", "T", 270, "A superheavy, man-made element named after atomic pioneer Niels Bohr."],
  [108, "Hs", "Hassium", "T", 277, "A superheavy, man-made element named after Hesse, the German state where it was made."],
  [109, "Mt", "Meitnerium", "U", 278, "A superheavy, man-made element named after physicist Lise Meitner, who helped explain nuclear fission."],
  [110, "Ds", "Darmstadtium", "U", 281, "A superheavy, man-made element named after Darmstadt, Germany, where it was made."],
  [111, "Rg", "Roentgenium", "U", 282, "A superheavy, man-made element named after Wilhelm Röntgen, who discovered X-rays."],
  [112, "Cn", "Copernicium", "U", 285, "A superheavy, man-made element named after astronomer Nicolaus Copernicus."],
  [113, "Nh", "Nihonium", "U", 286, "A superheavy, man-made element named after Nihon, a Japanese name for Japan. It was the first element discovered in Asia."],
  [114, "Fl", "Flerovium", "U", 289, "A superheavy, man-made element named after the Flerov Laboratory in Russia."],
  [115, "Mc", "Moscovium", "U", 290, "A superheavy, man-made element named after the Moscow region of Russia."],
  [116, "Lv", "Livermorium", "U", 293, "A superheavy, man-made element named after Lawrence Livermore National Laboratory in California."],
  [117, "Ts", "Tennessine", "U", 294, "A superheavy, man-made element named after the US state of Tennessee."],
  [118, "Og", "Oganesson", "U", 294, "The heaviest element known so far. It is named after physicist Yuri Oganessian."],
];

const SUPERHEAVY_NUCLEAR =
  "Superheavy elements are made a few atoms at a time by smashing lighter nuclei together in particle accelerators. The atoms decay quickly, lasting anywhere from a tiny fraction of a second to a few hours.";

/**
 * Nuclear connections, keyed by symbol. Each statement is a well-established
 * fact; half-lives are rounded.
 */
const NUCLEAR: Record<string, string> = {
  H: "Hydrogen's heavy isotopes, deuterium and tritium, are the fuel for nuclear fusion, the process that powers the Sun.",
  He: "The alpha particles given off in radioactive decay are helium-4 nuclei: two protons and two neutrons.",
  Li: "Fusion reactor designs plan to make tritium fuel from lithium by bombarding it with neutrons.",
  B: "Boron soaks up neutrons very well, so it is used in reactor control rods and in neutron shielding.",
  C: "Carbon-12 is stable, but carbon-14 is radioactive (half-life about 5,730 years). Scientists use it to date ancient bones, wood and cloth.",
  N: "Cosmic-ray neutrons turn nitrogen-14 in the upper atmosphere into carbon-14, which keeps a little radiocarbon forming all the time.",
  F: "Fluorine-18 is a short-lived radioactive isotope (half-life about 110 minutes) used to make PET scan images.",
  K: "Potassium-40 is a naturally radioactive isotope (half-life about 1.25 billion years). It is one reason your body is very slightly radioactive.",
  Co: "Cobalt-60 gives off strong gamma rays (half-life about 5 years). It is used in cancer radiotherapy, to sterilize medical equipment and to irradiate food.",
  Zr: "Zirconium absorbs very few neutrons, so it is used to make the metal tubes that hold nuclear reactor fuel.",
  Sr: "Strontium-90 is a fission product with a half-life of about 29 years. The body treats it like calcium, so it can collect in bones if swallowed.",
  Mo: "Molybdenum-99 decays into technetium-99m, the most widely used isotope in medical imaging.",
  Tc: "Technetium-99m (half-life about 6 hours) is used in tens of millions of medical imaging scans every year.",
  Cd: "Cadmium absorbs neutrons strongly, so it has been used in nuclear reactor control rods.",
  I: "Iodine-131 (half-life about 8 days) is used to diagnose and treat thyroid problems. It is also a fission product, and the thyroid absorbs iodine, which matters in emergency planning.",
  Xe: "Xenon-135 is a fission product that absorbs neutrons so strongly that reactor operators must account for it.",
  Cs: "Cesium-137 is a fission product with a half-life of about 30 years and is used in some medical and industrial gauges.",
  Ba: "Barium is among the leftover pieces when uranium splits. Finding it in 1938 was the clue that led Otto Hahn and Fritz Strassmann to discover nuclear fission.",
  Gd: "Gadolinium absorbs neutrons extremely well and is used in some reactor fuel as a built-in neutron absorber.",
  Lu: "Lutetium-177 is a radioactive isotope used to deliver radiation directly to some cancer cells.",
  Hf: "Hafnium absorbs neutrons strongly and is used in nuclear reactor control rods.",
  Ir: "Iridium-192 is a gamma-ray source used in industrial radiography to look inside welds and pipes.",
  Pb: "Lead's density makes it a classic radiation shield. Stable lead is also where the uranium and thorium decay chains end.",
  Bi: "Bismuth-209 was long thought to be stable, but it decays with a half-life far longer than the age of the universe.",
  Po: "Polonium-210 is an alpha emitter with a half-life of about 138 days.",
  At: "Astatine-211 is being studied for targeted alpha therapy against cancer.",
  Rn: "Radon-222 is a gas made when uranium in rocks decays. It can build up in buildings and is a major part of natural background radiation.",
  Ra: "Radium-226 (half-life about 1,600 years) is part of the uranium decay chain and decays into radon gas.",
  Ac: "Actinium-225 is being studied for targeted alpha therapy against cancer.",
  Th: "Thorium-232 has a half-life of about 14 billion years. In a reactor it can be turned into fissile uranium-233, so it is studied as an alternative fuel.",
  U: "Uranium-235 can split in a chain reaction and fuels most nuclear reactors. Natural uranium is about 99.3% uranium-238 and only about 0.7% uranium-235.",
  Np: "Neptunium-237 is a long-lived by-product found in used reactor fuel.",
  Pu: "Plutonium-239 forms inside reactors when uranium-238 absorbs a neutron. It can fission, and some countries recycle it as reactor fuel.",
  Am: "Americium-241 (half-life about 432 years) gives off alpha particles that ionize the air inside smoke detectors.",
  Cf: "Californium-252 spontaneously gives off neutrons and is used as a portable neutron source, for example to start up reactors.",
  Md: "Mendelevium was first made in 1955 by bombarding einsteinium with alpha particles.",
};

/** Lesson and encyclopedia links, keyed by symbol. Validated by the tests. */
const LINKS: Record<string, { lessons?: string[]; terms?: string[] }> = {
  H: { lessons: ["nuclear-fusion", "meet-the-atom"], terms: ["tritium", "heavy-water", "nuclear-fusion"] },
  He: { lessons: ["radioactive-decay"], terms: ["alpha-particle", "nuclear-fusion"] },
  Li: { lessons: ["nuclear-fusion"], terms: ["tritium", "nuclear-fusion"] },
  B: { lessons: ["nuclear-fission"], terms: ["control-rods", "shielding"] },
  C: { lessons: ["what-is-isotope", "radioactive-decay", "background-radiation"], terms: ["isotope", "radionuclide", "half-life"] },
  N: { lessons: ["background-radiation"], terms: ["cosmic-radiation", "isotope"] },
  F: { lessons: ["medical-applications"], terms: ["radionuclide"] },
  K: { lessons: ["background-radiation"], terms: ["background-radiation", "half-life"] },
  Co: { lessons: ["medical-applications", "industrial-agricultural-uses"], terms: ["gamma-ray", "radionuclide"] },
  Zr: { lessons: ["nuclear-fission"], terms: ["fuel-rods"] },
  Sr: { lessons: ["radioactive-decay"], terms: ["half-life", "radioactive-waste"] },
  Mo: { lessons: ["medical-applications"], terms: ["radionuclide", "decay"] },
  Tc: { lessons: ["medical-applications"], terms: ["radionuclide", "half-life"] },
  Cd: { lessons: ["nuclear-fission"], terms: ["control-rods"] },
  I: { lessons: ["medical-applications"], terms: ["radionuclide", "half-life"] },
  Xe: { lessons: ["nuclear-fission"], terms: ["neutron", "nuclear-fission"] },
  Cs: { lessons: ["radioactive-decay"], terms: ["half-life", "radioactive-waste"] },
  Ba: { lessons: ["nuclear-fission", "history-of-nuclear-science"], terms: ["nuclear-fission", "otto-hahn", "lise-meitner"] },
  Gd: { lessons: ["nuclear-fission"], terms: ["neutron", "control-rods"] },
  Lu: { lessons: ["medical-applications"], terms: ["radionuclide"] },
  Hf: { lessons: ["nuclear-fission"], terms: ["control-rods"] },
  Ir: { lessons: ["industrial-agricultural-uses"], terms: ["gamma-ray", "radionuclide"] },
  Pb: { lessons: ["radiation-shielding", "radioactive-decay"], terms: ["shielding", "decay"] },
  Bi: { lessons: ["radioactive-decay"], terms: ["half-life"] },
  Po: { lessons: ["history-of-nuclear-science"], terms: ["marie-curie", "alpha-particle"] },
  At: { lessons: ["medical-applications"], terms: ["alpha-particle"] },
  Rn: { lessons: ["background-radiation"], terms: ["radon", "background-radiation"] },
  Ra: { lessons: ["history-of-nuclear-science"], terms: ["marie-curie", "alpha-particle", "decay"] },
  Ac: { lessons: ["medical-applications"], terms: ["alpha-particle"] },
  Th: { lessons: ["radioactive-decay"], terms: ["decay", "half-life"] },
  U: { lessons: ["nuclear-fission", "nuclear-energy-explained", "what-is-isotope"], terms: ["uranium-235", "uranium-238", "enrichment", "nuclear-fission"] },
  Np: { lessons: ["nuclear-fission"], terms: ["glenn-seaborg-transuranium", "transmutation"] },
  Pu: { lessons: ["nuclear-fission", "radioactive-decay"], terms: ["plutonium-239", "transmutation", "glenn-seaborg-transuranium"] },
  Am: { lessons: ["industrial-agricultural-uses"], terms: ["alpha-particle", "becquerel", "glenn-seaborg"] },
  Cm: { lessons: ["history-of-nuclear-science"], terms: ["marie-curie", "pierre-curie", "glenn-seaborg-transuranium"] },
  Cf: { lessons: ["nuclear-fission"], terms: ["neutron", "glenn-seaborg-transuranium"] },
  Fm: { terms: ["enrico-fermi", "glenn-seaborg-transuranium"] },
  Md: { terms: ["glenn-seaborg-transuranium", "cyclotron"] },
  Lr: { terms: ["ernest-lawrence", "cyclotron"] },
  Rf: { terms: ["ernest-rutherford"] },
  Sg: { terms: ["glenn-seaborg"] },
  Bh: { terms: ["niels-bohr"] },
  Mt: { terms: ["lise-meitner"] },
  Rg: { terms: ["x-ray"] },
};

const PERIOD_STARTS = [1, 3, 11, 19, 37, 55, 87, 119];

const periodOf = (z: number): number => {
  for (let p = 0; p < 7; p++) {
    if (z >= PERIOD_STARTS[p] && z < PERIOD_STARTS[p + 1]) return p + 1;
  }
  throw new Error(`Atomic number out of range: ${z}`);
};

/** Returns [group | null, gridRow, gridCol] for an atomic number. */
const positionOf = (z: number): [number | null, number, number] => {
  const period = periodOf(z);
  const offset = z - PERIOD_STARTS[period - 1];
  if (period === 1) {
    const group = offset === 0 ? 1 : 18;
    return [group, 1, group];
  }
  if (period <= 3) {
    const group = offset < 2 ? offset + 1 : offset + 11;
    return [group, period, group];
  }
  if (period <= 5) {
    const group = offset + 1;
    return [group, period, group];
  }
  // Periods 6 and 7: 2 s-block, 15 f-block, then groups 4-18.
  if (offset < 2) {
    return [offset + 1, period, offset + 1];
  }
  if (offset < 17) {
    return [null, period === 6 ? 9 : 10, offset + 1];
  }
  const group = offset - 13;
  return [group, period, group];
};

export const ELEMENTS: readonly PeriodicElement[] = ROWS.map(
  ([atomicNumber, symbol, name, code, atomicMass, fact]) => {
    const [group, gridRow, gridCol] = positionOf(atomicNumber);
    const links = LINKS[symbol];
    const noStableIsotope =
      atomicNumber === 43 || atomicNumber === 61 || atomicNumber >= 84;
    const nuclearConnection =
      NUCLEAR[symbol] ?? (atomicNumber >= 104 ? SUPERHEAVY_NUCLEAR : undefined);
    const element: PeriodicElement = {
      atomicNumber,
      symbol,
      name,
      category: CATEGORY_BY_CODE[code],
      group,
      period: periodOf(atomicNumber),
      atomicMass,
      massIsMassNumber: noStableIsotope && !(atomicNumber === 90 || atomicNumber === 91 || atomicNumber === 92),
      noStableIsotope,
      gridRow,
      gridCol,
      fact,
      relatedLessonIds: links?.lessons ?? [],
      relatedTerms: links?.terms ?? [],
    };
    if (nuclearConnection) element.nuclearConnection = nuclearConnection;
    return element;
  },
);

/** Grid placeholders shown in the main table for the f-block rows. */
export const F_BLOCK_MARKERS = [
  { category: "lanthanide" as const, label: "57–71", row: 6, col: 3, from: 57, to: 71 },
  { category: "actinide" as const, label: "89–103", row: 7, col: 3, from: 89, to: 103 },
];

export const GRID_ROWS = 10;
export const GRID_COLS = 18;
