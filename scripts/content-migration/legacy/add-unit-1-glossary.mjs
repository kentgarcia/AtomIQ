#!/usr/bin/env node
/**
 * Repeatable content migration: encyclopedia entries for the terms unit 1 links to with
 * [[term|shown]] markers and that the encyclopedia did not have yet: matter, element, periodic
 * table, mass number, ion, strong force, electric force, radioactivity, nuclear stability and the
 * electron cloud. Written in plain words for beginners. Missing entries are added; an existing
 * entry is never overwritten. Sources are textbook sections and encyclopedias, to be opened and
 * checked by a person before publish. Draft edit of the master db; publish to ship.
 *
 *   node --no-warnings scripts/content-migration/add-unit-1-glossary.mjs [--dry-run] [--db <path>]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";

/**
 * RETIRED (content source files). The rows this script writes (the unit 1 AtomDex entries) are written in content/source/reference/encyclopedia and built with
 * `npm run content:sync`; running this would overwrite them behind the files' back. Kept only as history.
 * Do not run it. Edit the files (docs/features/CONTENT_SOURCE_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("add-unit-1-glossary.mjs is retired: the unit 1 AtomDex entries live in content/source/reference/encyclopedia and are built by `npm run content:sync`.");
  process.exit(1);
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const dbArg = argv.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? argv[dbArg + 1] : "content/database/content.db");

const OPENSTAX = "OpenStax";
const chem = (slug, title) => ({ organization: OPENSTAX, title: `Chemistry 2e: ${title}`, url: `https://openstax.org/books/chemistry-2e/pages/${slug}` });
const phys3 = (slug, title) => ({ organization: OPENSTAX, title: `University Physics Volume 3: ${title}`, url: `https://openstax.org/books/university-physics-volume-3/pages/${slug}` });

const ENTRIES = [
  {
    id: "matter",
    term: "Matter",
    definition: "Anything that has mass and takes up space. Solids, liquids and gases are all matter, and so is air. All matter is made of atoms. Light and heat are not matter: they are forms of energy. Sound is not matter either, but a wave that travels through matter.",
    category: "science",
    related_terms: ["atom", "element", "proton"],
    quick_facts: ["Matter has mass and takes up space", "Solids, liquids and gases are all matter", "Air is matter: a pumped-up ball weighs more than a flat one", "Light and heat are energy, not matter", "All matter is made of atoms"],
    sources: [chem("1-2-phases-and-classification-of-matter", "Phases and Classification of Matter")],
    debunking_snippet: "“Air is nothing.” Air is matter. It is made of atoms joined in tiny groups, it has mass, and it takes up space.",
  },
  {
    id: "element",
    term: "Element",
    definition: "A pure substance made of only one kind of atom: every atom of an element has the same number of protons. Hydrogen, carbon, oxygen and gold are elements. About 118 elements are known, and the periodic table lists them in order of atomic number.",
    category: "science",
    related_terms: ["atom", "atomic-number", "periodic-table", "isotope", "proton"],
    quick_facts: ["Every atom of an element has the same number of protons", "About 118 elements are known", "The periodic table lists them in order of atomic number", "Atoms of one element can differ in neutrons: those are isotopes", "Change the number of protons and you change the element"],
    sources: [chem("2-5-the-periodic-table", "The Periodic Table")],
    debunking_snippet: "“Elements are made of different kinds of stuff.” Every atom is built from the same three particles. Only the number of protons is different.",
  },
  {
    id: "periodic-table",
    term: "Periodic Table",
    definition: "A chart of all the known elements, in order of atomic number. Each box shows an element's atomic number, its symbol and its name. To use it, start with the number of protons and find that box: it names the element. Elements in the same column behave in similar ways, which is where the name comes from.",
    category: "science",
    related_terms: ["element", "atomic-number", "proton", "isotope"],
    quick_facts: ["Elements are listed in order of atomic number", "The big number in a box is the atomic number: the number of protons", "The letters are a short symbol, such as C for carbon", "Elements in the same column behave alike", "Dmitri Mendeleev published an early version in 1869"],
    sources: [{ organization: "IUPAC", title: "Periodic Table of Elements", url: "https://iupac.org/what-we-do/periodic-table-of-elements/" }, chem("2-5-the-periodic-table", "The Periodic Table")],
    debunking_snippet: null,
  },
  {
    id: "mass-number",
    term: "Mass Number",
    definition: "The total number of protons and neutrons in a nucleus. It is the number written after an element's name: carbon-14 has a mass number of 14. To find the neutrons, take away the protons. Carbon has 6 protons, so carbon-14 has 8 neutrons. The mass number is not the same as the atomic number, which counts only protons.",
    category: "science",
    related_terms: ["isotope", "atomic-number", "proton", "neutron", "nucleus"],
    quick_facts: ["Mass number = protons + neutrons", "It is written after the name, as in uranium-235", "Neutrons = mass number minus atomic number", "Isotopes of one element have different mass numbers", "Electrons weigh so little that they are not counted"],
    sources: [chem("2-3-atomic-structure-and-symbolism", "Atomic Structure and Symbolism")],
    debunking_snippet: "“The number in carbon-14 is the number of neutrons.” It counts protons and neutrons together. Carbon always has 6 protons, so carbon-14 has 8 neutrons.",
  },
  {
    id: "ion",
    term: "Ion",
    definition: "An atom, or a group of atoms, that has gained or lost electrons, so it carries an electric charge. Losing an electron makes a positive ion and gaining one makes a negative ion. The element does not change, because the number of protons stays the same. Table salt is made of sodium ions and chloride ions.",
    category: "science",
    related_terms: ["atom", "electron", "proton", "ionizing-radiation"],
    quick_facts: ["An ion has a charge because its protons and electrons no longer match", "Losing electrons makes a positive ion", "Gaining electrons makes a negative ion", "The element stays the same: only electrons moved", "Ionizing radiation can knock electrons off atoms and make ions"],
    sources: [chem("2-6-molecular-and-ionic-compounds", "Molecular and Ionic Compounds")],
    debunking_snippet: "“Gaining or losing electrons changes the element.” Protons decide the element, so an ion is still the same element.",
  },
  {
    id: "strong-force",
    term: "Strong Force",
    definition: "The force that holds the protons and neutrons together inside a nucleus. It is much stronger than the electric push between protons, but it only works over a very short distance, about the size of a nucleus. In a stable nucleus the strong force wins over the push. If the balance is wrong, the nucleus is unstable.",
    category: "science",
    related_terms: ["nucleus", "proton", "neutron", "electric-force", "nuclear-stability", "binding-energy"],
    quick_facts: ["It holds the nucleus together", "It is much stronger than the electric push between protons", "It only works over about the size of a nucleus", "Neutrons feel it too, but they have no charge, so they do not push", "It is one of the four basic forces of nature"],
    sources: [phys3("10-2-nuclear-binding-energy", "Nuclear Binding Energy")],
    debunking_snippet: "“Neutrons are just glue.” Neutrons feel the strong force and have no charge, so they change the balance in a nucleus. But the balance depends on the whole mix of protons and neutrons, not on neutrons alone.",
  },
  {
    id: "electric-force",
    term: "Electric Force",
    definition: "The force between electric charges. Opposite charges pull together and like charges push apart. In an atom it pulls the electrons toward the nucleus. Inside the nucleus it pushes the positive protons away from each other, and the strong force has to hold them together.",
    category: "science",
    related_terms: ["proton", "electron", "strong-force", "atom"],
    quick_facts: ["Like charges push apart and opposite charges pull together", "It keeps electrons around the nucleus", "It pushes the protons in a nucleus apart", "Between particles it is far stronger than gravity", "It is also called the Coulomb force"],
    sources: [{ organization: OPENSTAX, title: "University Physics Volume 2: Electric Charge", url: "https://openstax.org/books/university-physics-volume-2/pages/5-1-electric-charge" }],
    debunking_snippet: null,
  },
  {
    id: "radioactivity",
    term: "Radioactivity",
    definition: "What happens when an unstable nucleus changes into a steadier one and gives off radiation. It happens by itself, and heating a material or changing it chemically hardly affects it. Radioactivity is natural: it is found in rocks, in the air, in food, in space and in your own body. Henri Becquerel discovered it in 1896 in a uranium mineral.",
    category: "science",
    related_terms: ["radiation", "decay", "radionuclide", "background-radiation", "henri-becquerel", "isotope", "nuclear-stability"],
    quick_facts: ["It comes from an unstable nucleus", "It happens on its own, without anyone starting it", "Natural sources: rocks, air, food, space and the human body", "Henri Becquerel discovered it in 1896", "People can make radioactive atoms, but most radioactivity is natural"],
    sources: [{ organization: "IAEA", title: "What is Radiation?", url: "https://www.iaea.org/topics/radiation" }, phys3("10-3-radioactive-decay", "Radioactive Decay")],
    debunking_snippet: "“Radioactivity is something humans created.” It is as old as the Earth. People only learned to find it, measure it and use it.",
  },
  {
    id: "nuclear-stability",
    term: "Nuclear Stability",
    definition: "Whether a nucleus stays as it is or will change one day. A nucleus is stable when the strong force that holds it together balances the electric push between its protons. Stability depends on the mix of protons and neutrons: each element has only a few neutron counts that give a stable nucleus. Most atoms around us are stable. The others are unstable, which means radioactive.",
    category: "science",
    related_terms: ["nucleus", "strong-force", "electric-force", "radioactivity", "radionuclide", "isotope"],
    quick_facts: ["Stable: the nucleus stays as it is", "Unstable: the nucleus will change and give off radiation", "It depends on the mix of protons and neutrons", "Carbon-12 and carbon-13 are stable, but carbon-14 is not", "Most atoms around us are stable"],
    sources: [phys3("10-2-nuclear-binding-energy", "Nuclear Binding Energy")],
    debunking_snippet: "“More neutrons always make a nucleus safer.” Too many neutrons can unbalance a nucleus too, as in carbon-14.",
  },
  {
    id: "electron-cloud",
    term: "Electron Cloud",
    definition: "A picture of where the electrons of an atom are found. Instead of racing around the nucleus on neat rings, the electrons are somewhere in a fuzzy region around it. The cloud is darker where an electron is more likely to be. The cloud is huge compared with the nucleus, so most of an atom is empty space.",
    category: "science",
    related_terms: ["electron", "atom", "nucleus"],
    quick_facts: ["It replaces the old picture of electrons as tiny planets", "Darker parts show where an electron is more likely to be", "The cloud is about 100,000 times wider than the nucleus", "Each shape of cloud is called an orbital"],
    sources: [{ organization: "Britannica", title: "Electron", url: "https://www.britannica.com/science/electron" }],
    debunking_snippet: "“Electrons circle the nucleus like planets.” They have no fixed path. The cloud shows where they are likely to be.",
  },
];

if (!dryRun) backupBeforeScript("add-unit-1-glossary", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("BEGIN IMMEDIATE");
try {
  const known = new Set(db.prepare("SELECT id FROM encyclopedia_entries").all().map((r) => r.id));
  let added = 0;
  for (const e of ENTRIES) {
    if (known.has(e.id)) {
      console.log(`ok   ${e.id} (already there)`);
      continue;
    }
    for (const rel of e.related_terms) if (!known.has(rel) && !ENTRIES.some((x) => x.id === rel)) throw new Error(`${e.id}: related term "${rel}" is not an encyclopedia entry`);
    console.log(`add  ${e.id}`);
    added++;
    db.prepare(
      "INSERT INTO encyclopedia_entries (id, term, definition, category, related_terms, quick_facts, sources, image, debunking_snippet, related_myths, related_articles, difficulty) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
    ).run(e.id, e.term, e.definition, e.category, JSON.stringify(e.related_terms), JSON.stringify(e.quick_facts), JSON.stringify(e.sources), null, e.debunking_snippet, "[]", "[]", "beginner");
  }
  db.exec(dryRun ? "ROLLBACK" : "COMMIT");
  console.log(added ? `${dryRun ? "would add" : "added"} ${added} entr${added === 1 ? "y" : "ies"}` : "no change");
} catch (err) {
  db.exec("ROLLBACK");
  throw err;
} finally {
  db.close();
}
