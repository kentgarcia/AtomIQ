#!/usr/bin/env node
/**
 * Adds six beginner-friendly, original educational summaries to `articles`
 * (spec §5.4). Idempotent: an article id that already exists is left untouched.
 *
 * Authoring rules followed here (see docs/ARTICLE_PIPELINE.md):
 *   - The body is AtomIQ's own wording, a short summary, never pasted source text.
 *   - The source is cited as metadata (name, URL, type, note), not inside the body.
 *   - Every item starts as review_status = 'needs-review': the drafts were written
 *     from well-established facts and the source links were reachability-checked,
 *     but nobody has compared the text line by line against the source yet.
 *
 *   node --no-warnings scripts/content-migration/add-beginner-articles.mjs [--dry-run] [--db path]
 *
 * Requires scripts/content-migration/add-article-pipeline.mjs to have run first.
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

const DATE = "2026-11-14";
const AUTHOR = { name: "AtomIQ Editorial Team", avatar: "@/assets/images/mascot/profile.png", title: "Educational summary" };
const LINK_CHECKED = `Source link responded with HTTP 200 on ${DATE}.`;
const DRAFT_NOTE = "Drafted by the AtomIQ editorial team from well-established facts; claims have not yet been checked line by line against the source. Check the numbers, then set review_status to reviewed with a reviewer name.";

const articles = [
  {
    id: "radiation-basics-explained",
    type: "guide",
    category: "science",
    difficulty: "beginner",
    title: "Radiation Basics: What It Is and Where It Comes From",
    subtitle: "A plain-language tour of ionizing and non-ionizing radiation",
    excerpt: "Radiation is energy that travels from a source. Learn the difference between ionizing and non-ionizing radiation and where everyday exposure comes from.",
    image: "@/assets/nuclear/feed-2.webp",
    tags: ["radiation", "basics", "ionizing-radiation", "background-radiation"],
    source: "US Environmental Protection Agency (EPA)",
    source_url: "https://www.epa.gov/radiation/radiation-basics",
    source_type: "government-agency",
    source_note: "The EPA's \"Radiation Basics\" page is a short government explainer on radiation types and sources. This article restates the core ideas in AtomIQ's own words and adds lesson links.",
    review_notes: `${LINK_CHECKED} ${DRAFT_NOTE}`,
    related_lessons: ["types-of-radiation", "background-radiation", "measuring-radiation"],
    related_concepts: ["radiation", "ionizing-radiation", "alpha-particle", "beta-particle", "gamma-ray", "x-ray", "background-radiation"],
    related_myths: ["myths-facts-05", "myths-facts-06"],
    related_elements: ["Rn", "U"],
    content: `# Radiation Basics

**Radiation** is energy that moves from a source out into space or through a material. Light from a lamp, heat from a campfire and the signal from a radio tower are all radiation. Only some kinds are strong enough to be a health concern.

## Two families

- **Non-ionizing radiation** has too little energy to knock electrons out of atoms. Radio waves, microwaves, visible light and most of the heat you feel from the Sun belong here.
- **Ionizing radiation** carries enough energy to strip electrons from atoms and molecules. That can damage living cells, which is why it is handled carefully.

## Three common types of ionizing radiation

- **Alpha particles** are heavy and slow. A sheet of paper or the outer layer of your skin stops them, but an alpha emitter that is swallowed or inhaled can harm tissue from the inside.
- **Beta particles** are fast electrons. A thin sheet of plastic or aluminum stops them.
- **Gamma rays and X-rays** are high-energy waves. They pass through a lot of material, so dense shielding such as lead or thick concrete is used.

## Where everyday exposure comes from

Radiation is part of the natural world. Most of the radiation people receive comes from:

- **Radon**, a gas that seeps out of rock and soil and can build up indoors
- **Cosmic rays** arriving from space, which are stronger at higher altitude
- **Rocks and soil**, and even our own bodies, which contain tiny amounts of radioactive elements such as potassium-40
- **Medical imaging**, the largest human-made source for most people

## The three safety habits

Radiation workers rely on **time, distance and shielding**: spend less time near a source, stay farther away, and put the right material in between. The guiding idea is **ALARA**: keep doses as low as reasonably achievable.

## Key takeaways

- Not all radiation is dangerous, and not all of it is man-made.
- What matters most is the type of radiation and the dose received.
- Instruments such as Geiger counters and dosimeters make an invisible hazard measurable.`,
  },
  {
    id: "half-life-explained",
    type: "guide",
    category: "science",
    difficulty: "beginner",
    title: "Half-Life Explained: Why Some Atoms Fade Fast and Others Last",
    subtitle: "How scientists measure the pace of radioactive decay",
    excerpt: "A half-life is the time it takes for half of a radioactive sample to decay. See why it ranges from seconds to billions of years and why that matters.",
    image: "@/assets/nuclear/feed-3.webp",
    tags: ["half-life", "radioactive-decay", "isotopes", "basics"],
    source: "US Environmental Protection Agency (EPA)",
    source_url: "https://www.epa.gov/radiation/radioactive-decay",
    source_type: "government-agency",
    source_note: "The EPA's \"Radioactive Decay\" page defines decay, decay chains and half-life. This article builds a beginner-level explanation and worked example around those definitions.",
    review_notes: `${LINK_CHECKED} ${DRAFT_NOTE} Verify the example half-lives against a nuclear data table.`,
    related_lessons: ["radioactive-decay", "what-is-isotope"],
    related_concepts: ["half-life", "decay", "radionuclide", "becquerel", "isotope"],
    related_myths: ["myths-facts-18"],
    related_elements: ["C", "I", "Tc", "U"],
    content: `# Half-Life Explained

An unstable atom, called a **radionuclide**, eventually changes into a different atom and gives off radiation. You cannot predict when one particular atom will decay, but for a large group of identical atoms the pace is very regular. The **half-life** is the time it takes for half of them to decay.

## How it works

Say you start with 100 atoms of a radionuclide whose half-life is one day:

- After 1 day, about 50 atoms are left.
- After 2 days, about 25 are left.
- After 3 days, about 12 or 13 are left.
- After 4 days, about 6 are left.

Each half-life cuts what remains in half. The amount never jumps to zero. It just keeps shrinking.

## A huge range

Different radionuclides have very different half-lives:

- **Technetium-99m**, used in medical scans, has a half-life of about 6 hours.
- **Iodine-131**, used to treat thyroid conditions, has a half-life of about 8 days.
- **Carbon-14**, used to date ancient remains, has a half-life of about 5,730 years.
- **Uranium-238** has a half-life of roughly 4.5 billion years.

## Why it matters

- **Medicine:** short half-lives mean a tracer does its job and then fades quickly.
- **Dating:** measuring how much carbon-14 is left in a bone or piece of wood reveals how long ago the organism died.
- **Waste:** materials with short half-lives become much less radioactive within days or years, while long-lived ones need to be isolated for a very long time.

## A common mix-up

A long half-life does not mean "more dangerous". A material that decays slowly gives off radiation slowly. A material that decays quickly gives off a lot of radiation in a short time but is soon gone. Risk depends on the type of radiation, the amount, and how a person is exposed.

## Key takeaways

- Half-life is the time for half of a sample to decay.
- It is a fixed property of each radionuclide. Heat, pressure and chemistry do not change it.
- After about 10 half-lives, less than one thousandth of the original amount remains.`,
  },
  {
    id: "how-nuclear-plants-stay-safe",
    type: "guide",
    category: "safety",
    difficulty: "beginner",
    title: "How Nuclear Power Plants Are Designed to Stay Safe",
    subtitle: "Layers of protection, from fuel pellets to containment",
    excerpt: "Reactor safety relies on defense in depth: several independent barriers and backup systems. See how they work and what past accidents taught the industry.",
    image: "@/assets/nuclear/feed-4.webp",
    tags: ["safety", "defense-in-depth", "reactors", "containment"],
    source: "World Nuclear Association",
    source_url: "https://world-nuclear.org/information-library/safety-and-security/safety-of-plants/safety-of-nuclear-power-reactors",
    source_type: "industry-association",
    source_note: "The World Nuclear Association's \"Safety of Nuclear Power Reactors\" page covers reactor safety design. The WNA represents the nuclear industry, so check its claims against a regulator or the IAEA. This article is an independent beginner summary.",
    review_notes: `${LINK_CHECKED} ${DRAFT_NOTE} Cross-check with an IAEA or national regulator page because the source is an industry body.`,
    related_lessons: ["nuclear-safety-systems", "nuclear-policy", "nuclear-fission"],
    related_concepts: ["defense-in-depth", "containment-building", "control-rods", "meltdown", "nuclear-reactor"],
    related_myths: ["nuclear-plants-explode", "fukushima-was-nuclear-explosion", "myths-facts-03", "myths-facts-14"],
    related_elements: ["U"],
    content: `# How Nuclear Power Plants Are Designed to Stay Safe

A reactor makes heat by splitting uranium atoms, and that heat boils water to turn a turbine. Reactor designers assume things can go wrong, so they build in several layers of protection.

## Defense in depth

The core idea is **defense in depth**: no single barrier or system is trusted to do everything. Several independent layers back each other up.

- **The fuel itself:** uranium is formed into hard ceramic pellets that trap most radioactive by-products.
- **Fuel cladding:** the pellets sit inside sealed metal tubes.
- **The reactor vessel and cooling loop:** thick steel holds the core and the coolant.
- **The containment building:** a strong, sealed structure, often steel and reinforced concrete, around the reactor.

## Controlling the reaction

**Control rods** soak up neutrons. Pushing them into the core slows the chain reaction, and they can be dropped in quickly to shut the reactor down. This emergency shutdown is called a **scram**.

## Keeping the core cool

Even after shutdown, fuel keeps producing some heat for a while, so cooling must continue. Plants have several cooling systems and backup power. Many newer designs add **passive safety features** that rely on gravity, natural circulation or pressure differences, so they keep working without pumps or electricity.

## People and oversight

Safety is not only hardware. Operators train on simulators, plants are inspected by independent national regulators, and international groups such as the IAEA run peer reviews so countries can share lessons.

## What accidents taught

Three accidents shaped modern practice: Three Mile Island in 1979, Chernobyl in 1986 and Fukushima Daiichi in 2011. The Fukushima accident started when an earthquake and tsunami cut power and cooling. After each event, designs, procedures and regulation were reviewed and strengthened.

## Can a reactor explode like a bomb?

No. Reactor fuel is only slightly enriched, while a bomb needs highly enriched material in a very special arrangement. Reactors can still have serious accidents, such as overheating or hydrogen explosions, which is exactly why the layers above exist.

## Key takeaways

- Safety comes from many independent layers, not one perfect part.
- Cooling the fuel after shutdown is as important as stopping the reaction.
- Accidents are rare but taken seriously, and each one has led to changes.`,
  },
  {
    id: "medical-isotopes-in-health",
    type: "guide",
    category: "health",
    difficulty: "beginner",
    title: "Medical Isotopes: How Radioactivity Helps Doctors See and Heal",
    subtitle: "Tracers for diagnosis, targeted radiation for treatment",
    excerpt: "Hospitals use small amounts of radioactive isotopes to image organs and to treat disease. Find out how they are made, used and kept safe.",
    image: "@/assets/nuclear/feed-5.webp",
    tags: ["medicine", "isotopes", "nuclear-medicine", "imaging", "radiotherapy"],
    source: "World Nuclear Association",
    source_url: "https://world-nuclear.org/information-library/non-power-nuclear-applications/radioisotopes-research/radioisotopes-in-medicine",
    source_type: "industry-association",
    source_note: "The World Nuclear Association's \"Radioisotopes in Medicine\" page surveys diagnostic and therapeutic uses. This article gives a beginner-level overview in AtomIQ's words. The WNA is an industry body, so confirm clinical statements with a medical or regulatory source.",
    review_notes: `${LINK_CHECKED} ${DRAFT_NOTE} Have a clinician or medical physicist confirm the clinical wording.`,
    related_lessons: ["medical-applications", "what-is-isotope", "radioactive-decay"],
    related_concepts: ["radionuclide", "cyclotron", "half-life", "x-ray", "isotope"],
    related_myths: ["myths-facts-07", "myths-facts-29"],
    related_elements: ["Tc", "Mo", "F", "I", "Co"],
    content: `# Medical Isotopes

Some atoms are radioactive on purpose. In **nuclear medicine**, doctors use small amounts of radioactive isotopes, called **radioisotopes**, to look inside the body and to treat disease.

## Seeing inside the body: tracers

A **tracer** is a radioactive substance attached to a molecule the body naturally uses. It is given to the patient, travels to certain organs or tissues, and the radiation it gives off is picked up by a special camera.

- **Technetium-99m** is the most widely used diagnostic isotope. With a half-life of about 6 hours, it lets doctors image the heart, bones and other organs and then fades quickly.
- **Fluorine-18**, attached to a sugar-like molecule, is used in **PET scans**. Active tissue such as many tumors takes up more sugar, so it shows up brightly. Its half-life is under two hours.

## Treating disease

- **Iodine-131** collects in the thyroid gland, so it is used to treat an overactive thyroid and some thyroid cancers.
- **Radiotherapy** aims beams of high-energy radiation at a tumor to damage its cells. Some machines use gamma rays from cobalt-60, and others use X-rays made by accelerators.

## Where isotopes come from

- **Research reactors** make neutron-rich isotopes. Molybdenum-99 is produced this way and then decays into technetium-99m.
- **Cyclotrons**, a kind of particle accelerator, make proton-rich isotopes such as fluorine-18.

Because many medical isotopes have short half-lives, they must be made close to where they will be used and delivered quickly.

## Is it safe?

The doses are carefully chosen to be as low as reasonably achievable while still giving a clear image or an effective treatment. Short half-lives mean the radioactivity leaves the body within hours or days. A patient who has had a nuclear medicine scan may be given simple precautions for a short time.

## X-rays versus nuclear medicine

A standard X-ray sends radiation through your body from a machine and does not make you radioactive. Nuclear medicine puts a radioactive substance inside the body, which is why it is handled and timed so carefully.

## Key takeaways

- Tracers show how organs work, and some isotopes treat disease.
- Short half-lives keep exposure low and brief.
- Reactors and cyclotrons produce the isotopes hospitals rely on.`,
  },
  {
    id: "food-irradiation-explained",
    type: "guide",
    category: "technology",
    difficulty: "beginner",
    title: "Food Irradiation: Safer Food Without Making It Radioactive",
    subtitle: "What the process does, how it is labeled, and what it cannot do",
    excerpt: "Irradiation exposes food to controlled radiation to kill germs and pests and extend shelf life. It does not make food radioactive. Here is how it works.",
    image: "@/assets/nuclear/feed-6.webp",
    tags: ["food-safety", "irradiation", "agriculture", "technology"],
    source: "US Food and Drug Administration (FDA)",
    source_url: "https://www.fda.gov/food/irradiation-food-packaging/food-irradiation-what-you-need-know",
    source_type: "government-agency",
    source_note: "The FDA's consumer page \"Food Irradiation: What You Need to Know\" explains the process, safety review and labeling in the United States. This article is an independent beginner summary. Rules differ between countries.",
    review_notes: `Automated link checking is blocked by the FDA website (HTTP 401 for scripts) on ${DATE}, but the page appears in web search results. Open it manually to confirm. ${DRAFT_NOTE}`,
    related_lessons: ["industrial-agricultural-uses"],
    related_concepts: ["ionizing-radiation", "gamma-ray", "x-ray"],
    related_myths: ["myths-facts-15"],
    related_elements: ["Co", "Cs"],
    content: `# Food Irradiation

**Food irradiation** means passing food through a controlled beam of ionizing radiation, much like a package passing through an airport scanner, but with more energy and a specific purpose.

## What it does

The radiation damages the genetic material of germs and pests, so they cannot survive or multiply. Depending on the dose, irradiation can:

- kill harmful bacteria such as Salmonella and E. coli
- destroy insects and parasites, which helps when fruit and spices are shipped long distances
- slow sprouting in potatoes and onions and delay ripening in fruit
- extend shelf life by reducing spoilage organisms
- sterilize food for patients with very weak immune systems

## What it uses

Approved sources are gamma rays from a sealed source such as cobalt-60, electron beams, and X-rays. The food never touches the radioactive source.

## Does it make food radioactive?

No. The food is exposed to radiation, but it is not contaminated by radioactive material, and the energy used is too low to turn atoms in food radioactive. Think of a suitcase passing through an X-ray scanner: it comes out the same and is not radioactive.

## Does it change the food?

Cooking, canning and freezing also change food. Irradiation can slightly reduce some vitamins, in about the same way heat does, and at the doses used it causes little change in taste, texture or appearance.

## How to spot it

In many countries, irradiated food has to be labeled, often with a green **Radura** symbol and a statement such as "treated with radiation". Ingredients inside multi-ingredient products may not always be labeled.

## What it cannot do

Irradiation is not a substitute for clean handling. Food can still be contaminated after treatment, so refrigeration, washing hands and proper cooking still matter.

## Key takeaways

- Irradiation reduces germs and pests, and it does not make food radioactive.
- It is one tool among many for food safety and shelf life.
- Labels and rules vary by country, so check local guidance.`,
  },
  {
    id: "used-nuclear-fuel-explained",
    type: "guide",
    category: "environment",
    difficulty: "intermediate",
    title: "What Happens to Used Nuclear Fuel?",
    subtitle: "From the reactor core to pools, dry casks and long-term disposal",
    excerpt: "Used nuclear fuel is a solid that is cooled, stored in strong containers and monitored. Learn the steps from reactor to storage and the options for the future.",
    image: "@/assets/nuclear/feed-1.webp",
    tags: ["waste", "spent-fuel", "storage", "environment"],
    source: "US Department of Energy, Office of Nuclear Energy",
    source_url: "https://www.energy.gov/ne/articles/5-fast-facts-about-spent-nuclear-fuel",
    source_type: "government-agency",
    source_note: "The DOE Office of Nuclear Energy article \"5 Fast Facts about Spent Nuclear Fuel\" gives US-focused facts on form, storage, transport and recycling. This article generalizes the ideas for beginners and avoids copying its text. Policies differ by country.",
    review_notes: `${LINK_CHECKED} ${DRAFT_NOTE} Statements about other countries (reprocessing, repositories) should be checked against an IAEA or national source.`,
    related_lessons: ["environmental-protection", "nuclear-policy"],
    related_concepts: ["spent-fuel", "radioactive-waste", "low-level-waste", "vitrification", "half-life"],
    related_myths: ["nuclear-waste-forever", "myths-facts-11", "myths-facts-18"],
    related_elements: ["U", "Pu"],
    content: `# What Happens to Used Nuclear Fuel?

After several years in a reactor, nuclear fuel can no longer power the chain reaction efficiently and is removed. This **used**, or **spent**, fuel is still radioactive and still gives off heat, so it is handled with care.

## It is a solid

Reactor fuel is made of small ceramic pellets sealed inside long metal tubes. It goes into the reactor as a solid and comes out as a solid. It is not a liquid or a glowing green goo.

## Step 1: cool it in a pool

Used fuel is first stored for several years in deep pools of water at the plant. The water cools the fuel and blocks radiation.

## Step 2: move it to dry storage

Once it has cooled enough, fuel can be sealed inside steel containers surrounded by thick concrete or steel. These **dry casks** need no pumps and no electricity to stay safe, and they are monitored.

## How much is there?

The amount is small compared with the energy it helped produce. According to the US Department of Energy, the yearly output of the whole US nuclear fleet would take up less than half the volume of an Olympic swimming pool.

## Recycle or dispose?

- **Recycling:** much of the energy in used fuel is still unused. Some countries, such as France, separate and reuse part of it. Others store it without recycling.
- **Long-term disposal:** many countries plan **deep geological repositories**, tunnels built deep underground in stable rock where engineered barriers and the rock itself keep the waste isolated.
- **Vitrification:** some high-level liquid waste is mixed into glass so that it hardens into a durable solid.

## Does waste stay dangerous forever?

Radioactivity falls over time because isotopes decay. Short-lived isotopes fade within days or years, and the most hazardous radiation drops steeply in the first decades. A few isotopes last for thousands of years, which is why long-term isolation plans exist.

## Key takeaways

- Used fuel is a solid that is cooled, sealed and monitored.
- Dry cask storage is safe for decades while permanent solutions are built.
- Disposal and recycling choices differ by country and are still being developed.`,
  },
];

// ---------------------------------------------------------------------------

const wordCount = (text) => text.trim().split(/\s+/).length;
const readTime = (text) => Math.max(1, Math.round(wordCount(text) / 200));
const json = (v) => JSON.stringify(v ?? []);

if (!dryRun) backupBeforeScript("add-beginner-articles", dbPath); // safety net: scripts/lib/backup.mjs

const db = new DatabaseSync(dbPath);
db.exec("PRAGMA busy_timeout = 10000");
const cols = new Set(db.prepare("PRAGMA table_info(articles)").all().map((c) => c.name));
if (!cols.has("source_type")) {
  console.error("articles table lacks the pipeline columns. Run add-article-pipeline.mjs first.");
  process.exit(1);
}

const insert = db.prepare(`
  INSERT OR IGNORE INTO articles
    (id, type, category, title, subtitle, content, excerpt, author, published_date, read_time, image, tags,
     source, source_url, related_myths, related_facts, featured, difficulty,
     source_type, source_note, source_published_date, review_status, last_reviewed, reviewed_by, review_notes,
     summary_origin, related_lessons, related_concepts, related_elements)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 0, ?, ?, ?, NULL, 'needs-review', ?, NULL, ?, 'original', ?, ?, ?)`);

db.exec("BEGIN IMMEDIATE");
try {
  for (const a of articles) {
    const r = insert.run(
      a.id, a.type, a.category, a.title, a.subtitle, a.content.trim(), a.excerpt, JSON.stringify(AUTHOR), DATE,
      readTime(a.content), a.image, json(a.tags), a.source, a.source_url, json(a.related_myths), a.difficulty,
      a.source_type, a.source_note, DATE, a.review_notes, json(a.related_lessons), json(a.related_concepts), json(a.related_elements),
    );
    console.log(`${r.changes ? "+" : "="} articles/${a.id} (${wordCount(a.content)} words, ${readTime(a.content)} min)`);
  }
  if (dryRun) db.exec("ROLLBACK");
  else db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  console.error(`Aborted, nothing written: ${error.message}`);
  process.exit(1);
}
console.log(`\n${dryRun ? "[dry-run] " : ""}done (${dbPath}).`);
