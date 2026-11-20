#!/usr/bin/env node
/**
 * Repeatable content migration: encyclopedia entries for the terms unit 2 links to with
 * [[term|shown]] markers and that the encyclopedia did not have yet: parent nuclide, daughter
 * nuclide, alpha decay, beta decay, gamma radiation, decay chain, potassium-40 and electromagnetic
 * radiation. Written in plain words for beginners. Missing entries are added; an existing entry is
 * never overwritten. Sources are textbook sections and agency pages, to be opened and checked by a
 * person before publish (docs/features/UNIT_2_RADIOACTIVITY_SPEC.md section 9). Draft edit of the master db;
 * publish to ship.
 *
 *   node --no-warnings scripts/content-migration/add-unit-2-glossary.mjs [--dry-run] [--db <path>]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const dbArg = argv.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? argv[dbArg + 1] : "content/database/content.db");

const OPENSTAX = "OpenStax";
const phys3 = (slug, title) => ({ organization: OPENSTAX, title: `University Physics Volume 3: ${title}`, url: `https://openstax.org/books/university-physics-volume-3/pages/${slug}` });
const DECAY = phys3("10-3-radioactive-decay", "Radioactive Decay");

const ENTRIES = [
  {
    id: "parent-nuclide",
    term: "Parent Nuclide",
    definition: "The nucleus that decays in a radioactive decay. It is unstable. When it changes, it turns into a different nucleus, called the daughter, and gives off radiation. Nobody has to start the change: the parent changes by itself, at a moment nobody can predict for one nucleus.",
    category: "science",
    related_terms: ["daughter-nuclide", "decay", "radioactivity", "radionuclide", "decay-chain"],
    quick_facts: ["The parent is the nucleus that decays", "It is unstable", "It changes into the daughter and gives off radiation", "It changes by itself", "In a decay chain, each daughter becomes the next parent"],
    sources: [DECAY],
    debunking_snippet: "“A radioactive atom needs a person to make it decay.” The parent changes by itself. Nobody has to trigger it.",
  },
  {
    id: "daughter-nuclide",
    term: "Daughter Nuclide",
    definition: "The nucleus that is left after a radioactive decay. It is a different nucleus from the parent. The daughter can be stable, and then the changing stops, or it can be unstable too, and then it decays again. A run of decays like this is a decay chain.",
    category: "science",
    related_terms: ["parent-nuclide", "decay", "decay-chain", "radioactivity", "radionuclide"],
    quick_facts: ["The daughter is the nucleus the parent becomes", "It is a different nucleus, so nothing simply vanishes", "It can be stable or unstable", "An unstable daughter decays again", "A chain ends at a stable daughter"],
    sources: [DECAY],
    debunking_snippet: "“Every decay makes a stable atom.” The daughter can be unstable too, and then it decays again.",
  },
  {
    id: "alpha-decay",
    term: "Alpha Decay",
    definition: "A kind of radioactive decay in which a nucleus gives off an alpha particle: 2 protons and 2 neutrons stuck together, the nucleus of a helium atom. The nucleus that is left has 2 fewer protons and 2 fewer neutrons, so it is a different element. Alpha decay is common in very heavy nuclei such as uranium.",
    category: "science",
    related_terms: ["alpha-particle", "decay", "radioactivity", "parent-nuclide", "daughter-nuclide"],
    quick_facts: ["An alpha particle is 2 protons and 2 neutrons", "It is the nucleus of a helium atom", "The daughter has 2 fewer protons, so it is a different element", "It is common in very heavy nuclei", "Alpha is a particle, not electromagnetic radiation"],
    sources: [DECAY],
    debunking_snippet: null,
  },
  {
    id: "beta-decay",
    term: "Beta Decay",
    definition: "A kind of radioactive decay in which a nucleus gives off a beta particle, a fast electron. In the usual kind, beta-minus decay, a neutron in the nucleus changes into a proton and an electron is emitted, along with a tiny particle called an antineutrino. The number of protons goes up by one, so the nucleus becomes a different element.",
    category: "science",
    related_terms: ["beta-particle", "decay", "radioactivity", "neutron", "proton", "electron"],
    quick_facts: ["A beta particle is a fast electron", "A neutron changes into a proton and an electron is emitted", "The electron was not orbiting the nucleus before", "A tiny antineutrino comes out too", "The number of protons goes up by one, so the element changes"],
    sources: [DECAY],
    debunking_snippet: "“The beta electron was one of the atom's orbiting electrons.” It is made in the decay itself, when a neutron changes into a proton.",
  },
  {
    id: "gamma-radiation",
    term: "Gamma Radiation",
    definition: "High-energy electromagnetic radiation given off by a nucleus, usually right after an alpha or beta decay leaves it with extra energy. Gamma radiation is not a particle and is not made of pieces of the nucleus. It is like light, but far more energetic. Giving off gamma radiation changes neither the number of protons nor the number of neutrons.",
    category: "science",
    related_terms: ["gamma-ray", "electromagnetic-radiation", "decay", "radioactivity", "radiation"],
    quick_facts: ["It is electromagnetic radiation, not a particle", "It is like light, but far more energetic", "It carries away extra energy from the nucleus", "The nucleus keeps the same protons and neutrons", "It is not made of tiny pieces of the nucleus"],
    sources: [DECAY],
    debunking_snippet: "“Gamma radiation is made of tiny pieces of the nucleus.” It is electromagnetic radiation, like light but far more energetic.",
  },
  {
    id: "decay-chain",
    term: "Decay Chain",
    definition: "A sequence of radioactive decays in which one nucleus changes into another, which may decay again, and so on until a stable nucleus is reached. Every step makes a different nucleus. Nature has several long chains, for example the uranium-238 chain, which ends in stable lead-206, and the thorium-232 chain, which ends in stable lead-208. Radon is one link in the uranium chain.",
    category: "science",
    related_terms: ["decay", "parent-nuclide", "daughter-nuclide", "radon", "radioactivity", "half-life"],
    quick_facts: ["One unstable nucleus can start a whole chain", "Each step makes a different nucleus", "The chain ends at a stable nucleus", "The uranium-238 chain ends in stable lead-206", "The thorium-232 chain ends in stable lead-208"],
    sources: [DECAY, { organization: "U.S. Nuclear Regulatory Commission", title: "Natural decay series (candidate source: open and confirm before publish)", url: "" }],
    debunking_snippet: "“Every decay makes a stable atom.” Many decays only make another unstable nucleus, so the chain goes on.",
  },
  {
    id: "potassium-40",
    term: "Potassium-40",
    definition: "A natural radioactive form of potassium. Only a tiny share of the potassium in nature is potassium-40, but because food and living things contain potassium, a little potassium-40 is in many foods, such as bananas, and in the human body. It has a very long half-life, over a billion years, which is one reason it is still around.",
    category: "science",
    related_terms: ["radioactivity", "radionuclide", "isotope", "half-life", "background-radiation"],
    quick_facts: ["It is a natural radioactive isotope of potassium", "A tiny share of all potassium is potassium-40", "It is in bananas and other foods", "Your own body contains a little", "Its half-life is over a billion years"],
    sources: [{ organization: "U.S. EPA", title: "Radionuclide Basics: Potassium-40 (candidate source: open and confirm before publish)", url: "https://www.epa.gov/radiation/radionuclide-basics-potassium-40" }],
    debunking_snippet: "“Radioactive means dangerous, so bananas are a hazard.” Bananas hold a tiny natural amount, and that is normal. Radioactive does not automatically mean dangerous.",
  },
  {
    id: "electromagnetic-radiation",
    term: "Electromagnetic Radiation",
    definition: "Energy that travels as waves of electric and magnetic fields. It is not made of matter. Radio waves, microwaves, infrared, visible light, ultraviolet, X-rays and gamma rays are all electromagnetic radiation. They differ in how much energy they carry. Gamma rays carry far more energy than visible light.",
    category: "science",
    related_terms: ["gamma-ray", "radiation", "gamma-radiation", "ionizing-radiation"],
    quick_facts: ["Light is electromagnetic radiation", "Gamma rays are electromagnetic radiation too", "It is energy, not matter", "Different kinds carry different amounts of energy", "Alpha and beta are particles, not electromagnetic radiation"],
    sources: [{ organization: OPENSTAX, title: "University Physics Volume 2: Electromagnetic Waves", url: "https://openstax.org/books/university-physics-volume-2/pages/16-introduction" }],
    debunking_snippet: "“Radiation always means nuclear radiation.” Light is radiation too. Only some radiation comes from nuclei.",
  },
];

if (!dryRun) backupBeforeScript("add-unit-2-glossary", dbPath);
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
