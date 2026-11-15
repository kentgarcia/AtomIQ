#!/usr/bin/env node
/**
 * Adds structured visual lesson blocks (docs/VISUAL_LESSON_BLOCKS.md) to the
 * `micro_learn` steps of the master content database.
 *
 * - Idempotent: a block is matched by `id` inside `data.visuals`; re-running
 *   replaces it in place and never duplicates.
 * - Safe: every block is validated first; all writes happen in one
 *   short transaction on the MASTER db only.
 * - Does NOT run sync-content (that bundles the db into assets/).
 *
 *   node scripts/content-migration/add-visual-blocks.mjs [--db <path>] [--dry-run]
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..", "..");

// ---------------------------------------------------------------------------
// Geometry helpers (authoring-time only; the app stores explicit shapes)
// ---------------------------------------------------------------------------

const round = (n) => Math.round(n * 100) / 100;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));

/** Sunflower packing of `n` particles around (cx, cy). */
function cluster(cx, cy, n, c = 3) {
  return Array.from({ length: n }, (_, i) => {
    const r = c * Math.sqrt(i + 0.5);
    const a = i * GOLDEN;
    return { x: round(cx + r * Math.cos(a)), y: round(cy + r * Math.sin(a)) };
  });
}

/** Point on a circle, angle in degrees (0 = right, 90 = down). */
function onRing(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return { x: round(cx + r * Math.cos(a)), y: round(cy + r * Math.sin(a)) };
}

const circle = (x, y, r, tone, fill = "solid") => ({ t: "circle", x, y, r, tone, fill });
const rect = (x, y, w, h, tone, fill = "solid", rx) => ({ t: "rect", x, y, w, h, tone, fill, ...(rx ? { rx } : {}) });
const line = (x1, y1, x2, y2, tone, extra = {}) => ({ t: "line", x1, y1, x2, y2, tone, ...extra });
const text = (x, y, s, size = 5, extra = {}) => ({ t: "text", x, y, text: s, size, ...extra });

// ---------------------------------------------------------------------------
// Scenes
// ---------------------------------------------------------------------------

function carbon12Scene() {
  const cx = 50;
  const cy = 42;
  const shapes = [
    text(50, 7, "Carbon-12 atom", 5.5),
    circle(cx, cy, 18, undefined, "none"),
    circle(cx, cy, 30, undefined, "none"),
  ];
  cluster(cx, cy, 12).forEach((p, i) =>
    shapes.push(i % 2 === 0 ? circle(p.x, p.y, 2.5, "danger") : circle(p.x, p.y, 2.5, "neutral", "soft")),
  );
  [30, 210].forEach((d) => {
    const p = onRing(cx, cy, 18, d);
    shapes.push(circle(p.x, p.y, 2, "info"));
  });
  [20, 110, 200, 290].forEach((d) => {
    const p = onRing(cx, cy, 30, d);
    shapes.push(circle(p.x, p.y, 2, "info"));
  });
  shapes.push(text(50, 81, "6 protons, 6 neutrons, 6 electrons", 4.6));
  const nucleus = onRing(cx, cy, 15, -90);
  const shell = onRing(cx, cy, 30, 245);
  const electron = onRing(cx, cy, 30, 20);
  return {
    scene: { height: 85, shapes },
    callouts: [
      { id: "1", label: "Nucleus", detail: "The tiny, dense centre. It holds the 6 protons and 6 neutrons and almost all of the atom's mass.", x: nucleus.x, y: nucleus.y },
      { id: "2", label: "Electron shells", detail: "Electrons move around the nucleus in layers called shells: 2 in the inner shell, 4 in the outer shell.", x: shell.x, y: shell.y },
      { id: "3", label: "Electrons", detail: "Very light particles with negative charge. A neutral atom has as many electrons as protons.", x: round(electron.x + 8), y: round(electron.y - 7) },
    ],
  };
}

function isotopeScene() {
  const shapes = [text(27, 8, "Carbon-12", 5.5), text(73, 8, "Carbon-14", 5.5)];
  const left = cluster(27, 30, 12);
  const right = cluster(73, 30, 14);
  left.forEach((p, i) => shapes.push(i % 2 === 0 ? circle(p.x, p.y, 2.5, "danger") : circle(p.x, p.y, 2.5, "neutral", "soft")));
  right.forEach((p, i) => {
    if (i >= 12) shapes.push(circle(p.x, p.y, 2.5, "warning"));
    else shapes.push(i % 2 === 0 ? circle(p.x, p.y, 2.5, "danger") : circle(p.x, p.y, 2.5, "neutral", "soft"));
  });
  shapes.push(text(27, 51, "6 protons", 4.8), text(27, 56.5, "6 neutrons", 4.8), text(73, 51, "6 protons", 4.8), text(73, 56.5, "8 neutrons", 4.8));
  shapes.push(text(27, 64, "stable", 5.4), text(73, 64, "radioactive", 5.4));
  return {
    scene: { height: 69, shapes },
    callouts: [
      { id: "1", label: "Carbon-12", detail: "6 protons and 6 neutrons. Stable: it does not decay. About 99 out of every 100 carbon atoms are carbon-12.", x: 12, y: 20 },
      { id: "2", label: "Carbon-14", detail: "Still 6 protons, so it is still carbon, but with 8 neutrons. The extra neutrons make the nucleus unstable (radioactive).", x: 58, y: 20 },
      { id: "3", label: "Two extra neutrons", detail: "The only difference between the two atoms. Same protons means the same chemistry; different neutrons means a different mass.", x: round(right[13].x + 5), y: round(right[13].y + 5) },
    ],
  };
}

function penetrationScene() {
  const shapes = [
    rect(3, 8, 6, 44, "neutral", "solid", 1),
    text(3, 58.5, "source", 4.6, { anchor: "start" }),
    // barriers
    rect(30, 8, 1.6, 44, "warning", "soft"),
    rect(52, 8, 3.4, 44, "neutral", "solid"),
    rect(74, 8, 8, 44, "primary", "solid"),
    text(29, 6, "paper", 4.6),
    text(55, 6, "aluminium", 4.6),
    text(78, 6, "lead", 4.6),
    // rays
    line(9, 17, 28, 17, "danger", { width: 1.2, arrow: true }),
    line(9, 30, 50.5, 30, "warning", { width: 1.2, arrow: true }),
    line(9, 43, 72, 43, "info", { width: 1.2, arrow: true }),
    line(83, 43, 96, 43, "info", { width: 0.7, dash: true }),
    text(12, 14, "alpha", 4.6, { anchor: "start" }),
    text(12, 27, "beta", 4.6, { anchor: "start" }),
    text(12, 40, "gamma", 4.6, { anchor: "start" }),
  ];
  return {
    scene: { height: 62, shapes },
    callouts: [
      { id: "1", label: "Alpha particles", detail: "Stopped by a sheet of paper or the outer layer of skin. Dangerous mainly if the source gets inside the body.", x: 36, y: 17 },
      { id: "2", label: "Beta particles", detail: "Pass through paper but are stopped by a few millimetres of aluminium or plastic.", x: 61, y: 30 },
      { id: "3", label: "Gamma rays", detail: "Pass through paper and aluminium. Dense lead or thick concrete cuts them down a lot, but never to exactly zero (the dashed line).", x: 90, y: 51 },
    ],
  };
}

function reactorScene() {
  const shapes = [
    rect(4, 6, 62, 70, "neutral", "soft", 5),
    rect(14, 30, 30, 40, "info", "soft", 2),
  ];
  [17, 22.5, 28, 33.5, 39].forEach((x) => shapes.push(rect(x, 44, 2.6, 24, "warning", "solid", 0.5)));
  [20.2, 25.7, 31.2, 36.7].forEach((x) => shapes.push(rect(x, 18, 1.6, 34, "primary", "solid", 0.4)));
  shapes.push(
    // steam generator
    rect(50, 30, 10, 30, "info", "soft", 1.5),
    // coolant loop
    line(44, 38, 50, 38, "danger", { width: 1.2, arrow: true }),
    line(50, 56, 44, 56, "info", { width: 1.2, arrow: true }),
    // steam to turbine
    line(55, 30, 55, 20, "accent", { width: 1.2 }),
    line(55, 20, 88, 20, "accent", { width: 1.2 }),
    line(88, 20, 88, 28, "accent", { width: 1.2, arrow: true }),
    circle(88, 38, 9, "accent", "solid"),
  );
  return {
    scene: { height: 80, shapes },
    callouts: [
      { id: "1", label: "Fuel rods", detail: "Sealed metal tubes packed with small ceramic pellets of enriched uranium. Fission in the fuel makes the heat.", x: 28, y: 73 },
      { id: "2", label: "Control rods", detail: "Rods that soak up neutrons. Lowering them slows the chain reaction; lowering them fully shuts it down.", x: 28, y: 15 },
      { id: "3", label: "Water", detail: "Water around the fuel does two jobs: it slows neutrons down so they cause more fission (moderator) and it carries the heat away (coolant).", x: 9, y: 50 },
      { id: "4", label: "Steam generator", detail: "Hot reactor water passes heat to a separate loop of water, which boils into steam. The two loops never mix.", x: 55, y: 66 },
      { id: "5", label: "Turbine", detail: "Steam spins the turbine, which turns a generator to make electricity.", x: 88, y: 51 },
      { id: "6", label: "Containment building", detail: "A thick concrete and steel shell around the reactor that keeps radioactive material in, even if something goes wrong inside.", x: 61, y: 10 },
    ],
    key: [
      { tone: "danger", label: "Hot water", swatch: "line" },
      { tone: "info", label: "Cooler water", swatch: "line" },
      { tone: "accent", label: "Steam", swatch: "line" },
    ],
  };
}

function radiotherapyScene() {
  return {
    height: 60,
    shapes: [
      circle(50, 30, 25, "neutral", "soft"),
      circle(50, 30, 5, "danger"),
      line(6, 30, 43, 30, "info", { width: 1.4, arrow: true }),
      line(90, 6, 54, 27, "info", { width: 1.4, arrow: true }),
      line(90, 54, 54, 33, "info", { width: 1.4, arrow: true }),
      text(50, 46, "tumour", 4.8),
    ],
  };
}

// ---------------------------------------------------------------------------
// Block definitions
// ---------------------------------------------------------------------------

const ORIGINAL = (note) => ({ type: "original", note });

const carbon12 = carbon12Scene();
const isotopes = isotopeScene();
const penetration = penetrationScene();
const reactor = reactorScene();

export const BLOCKS = [
  {
    lesson: "meet-the-atom",
    block: {
      id: "visual-atom-carbon-12",
      kind: "model",
      learningObjective: "Name the three particles in an atom and say where each one is found.",
      title: "Inside a carbon atom",
      explanation:
        "Every atom has a tiny nucleus made of protons and neutrons, with electrons moving around it. The number of protons decides the element: 6 protons always means carbon. In a neutral atom, the electrons balance the protons. This picture is a simplified model: real electrons are not tiny planets, and the nucleus is far smaller than the picture suggests.",
      altText:
        "Model of a carbon-12 atom: a cluster of 6 red protons and 6 grey neutrons in the centre, with 6 small blue electrons on two rings around it.",
      plainText:
        "Model of a carbon-12 atom. Nucleus: at the centre, made of 6 protons (positive charge) and 6 neutrons (no charge). Electron shells: two rings around the nucleus. Electrons: 6 tiny negative particles, 2 on the inner ring and 4 on the outer ring. In the picture a Proton is a solid red dot, a Neutron is a pale grey dot and an Electron is a small blue dot. The picture is simplified and not to scale: the nucleus is much smaller than shown, and most of an atom is empty space.",
      caption: "Simplified and not to scale.",
      source: ORIGINAL("Created for AtomIQ from standard atomic structure; carbon has 6 protons and carbon-12 has 6 neutrons."),
      credit: "Illustration: AtomIQ",
      ...carbon12,
      key: [
        { tone: "danger", label: "Proton", swatch: "circle" },
        { tone: "neutral", label: "Neutron", swatch: "circle" },
        { tone: "info", label: "Electron", swatch: "circle" },
      ],
    },
  },
  {
    lesson: "what-is-isotope",
    block: {
      id: "visual-isotopes-c12-c14",
      kind: "model",
      learningObjective: "Explain that isotopes of one element have the same number of protons but different numbers of neutrons.",
      title: "Carbon-12 and carbon-14",
      explanation:
        "Both atoms are carbon because both have 6 protons. Carbon-14 has 8 neutrons instead of 6. The number in the name is the mass number, protons plus neutrons: 6 + 6 = 12 and 6 + 8 = 14. Carbon-12 is stable. The two extra neutrons make carbon-14 unstable, so it slowly decays, which is why it is used for radiocarbon dating.",
      altText:
        "Two atomic nuclei side by side: carbon-12 with 6 red protons and 6 grey neutrons, and carbon-14 with the same 6 protons plus 8 neutrons, two of them highlighted in yellow.",
      plainText:
        "Comparison of two isotopes of carbon. Carbon-12 has 6 protons and 6 neutrons and is stable. Carbon-14 has 6 protons and 8 neutrons and is radioactive. Both have 6 protons, so both are carbon. The Two extra neutrons are the only difference. In the picture a Proton is a solid red dot, a Neutron is a pale grey dot and an Extra neutron is a yellow dot.",
      caption: "Electrons are left out to keep the focus on the nucleus.",
      source: ORIGINAL("Created for AtomIQ; nucleon counts follow the standard definition of carbon-12 and carbon-14."),
      credit: "Illustration: AtomIQ",
      ...isotopes,
      key: [
        { tone: "danger", label: "Proton", swatch: "circle" },
        { tone: "neutral", label: "Neutron", swatch: "circle" },
        { tone: "warning", label: "Extra neutron", swatch: "circle" },
      ],
    },
  },
  {
    lesson: "radiation-shielding",
    block: {
      id: "visual-penetration-alpha-beta-gamma",
      kind: "diagram",
      learningObjective: "Match alpha, beta and gamma radiation to the material that stops each one.",
      title: "What stops alpha, beta and gamma?",
      explanation:
        "The three rays start at the same source but travel different distances. Alpha particles are heavy and are stopped by paper. Beta particles are lighter and fast, and need a few millimetres of aluminium or plastic. Gamma rays are energy, not particles, and need dense material such as lead or thick concrete. Neutrons are different again and are slowed by water or other hydrogen-rich materials.",
      altText:
        "Diagram of three horizontal rays leaving a source and meeting three upright barriers: the alpha ray ends at paper, the beta ray ends at aluminium, and the gamma ray reaches the thick lead barrier, where it is greatly reduced.",
      plainText:
        "Three rays leave a radioactive source, in front of three barriers placed in order: paper, aluminium, lead. Alpha particles are stopped by the paper. Beta particles pass through the paper but are stopped by the aluminium. Gamma rays pass through paper and aluminium and are greatly reduced, but not completely removed, by thick lead.",
      caption: "Not to scale. Real shielding thickness depends on the radiation's energy.",
      source: ORIGINAL("Created for AtomIQ from standard radiation-protection teaching; thicknesses are deliberately qualitative."),
      credit: "Illustration: AtomIQ",
      ...penetration,
    },
  },
  {
    lesson: "radioactive-decay",
    block: {
      id: "visual-half-life-decay",
      kind: "process_flow",
      learningObjective: "Use a half-life to work out how much of a radioactive sample is left after one, two or three half-lives.",
      title: "Half-life in four steps",
      explanation:
        "A half-life is the time it takes for half of the radioactive atoms in a sample to decay. After each half-life, half of what was left is left again: 100%, then 50%, then 25%, then 12.5%. The half-life of a given isotope is fixed; heat, pressure or chemistry do not change it. The example uses iodine-131, whose half-life is about 8 days.",
      altText:
        "Four boxes in a row joined by arrows, each with a bar that is half as long as the one before: 100%, 50%, 25% and 12.5% of the sample remaining.",
      plainText:
        "Start: 100% of the sample is still radioactive. After 1 half-life (day 8 for iodine-131): 50% remains. After 2 half-lives (day 16): 25% remains. After 3 half-lives (day 24): 12.5% remains. Each step halves the amount left.",
      source: ORIGINAL("Created for AtomIQ; the iodine-131 half-life (about 8 days) is a standard value."),
      credit: "Illustration: AtomIQ",
      steps: [
        { label: "Start", value: "100%", meter: 1, detail: "All of the sample is still radioactive." },
        { label: "After 1 half-life", value: "50%", meter: 0.5, detail: "Day 8 for iodine-131. Half has decayed." },
        { label: "After 2 half-lives", value: "25%", meter: 0.25, detail: "Day 16. Half of the remaining half has decayed." },
        { label: "After 3 half-lives", value: "12.5%", meter: 0.125, detail: "Day 24. It never reaches exactly zero, but it keeps shrinking." },
      ],
    },
  },
  {
    lesson: "background-radiation",
    block: {
      id: "visual-dose-comparison",
      kind: "comparison_cards",
      learningObjective: "Compare everyday and medical radiation doses and see that a year of natural background is far more than one X-ray.",
      title: "Everyday radiation doses compared",
      explanation:
        "Doses are measured in millisieverts (mSv). The cards are ordered from smallest to largest and the bars use a log scale, so each step to the right is many times bigger, not just a little bigger. The values are typical and rounded: your own dose depends on where you live, the equipment used and your body size.",
      altText:
        "Six cards in order of size, from eating a banana at about 0.0001 millisieverts up to a CT scan at about 2 to 10 millisieverts, each with a bar on a log scale.",
      plainText:
        "Typical radiation doses in millisieverts (mSv), smallest to largest. Eating a banana: about 0.0001 mSv. Dental X-ray: about 0.005 mSv. Long-haul flight: about 0.05 mSv. Chest X-ray: about 0.1 mSv. One year of natural background radiation: about 2.4 mSv worldwide average. CT scan: about 2 to 10 mSv depending on the body part. Values are approximate and vary by person, place and equipment; bars use a log scale.",
      source: {
        type: "reference",
        publisher: "UNSCEAR and NCRP",
        title: "UNSCEAR 2008 Report (global natural background average) and NCRP Report No. 160 (typical medical doses)",
        note: "Banana, flight and dental values are commonly quoted rounded estimates.",
        verify: true,
      },
      credit: "Illustration: AtomIQ",
      scale: "log",
      scaleNote: "Approximate typical values. Bars use a log scale and show the middle of any range.",
      items: [
        { label: "Eating a banana", value: "about 0.0001 mSv", numeric: 0.0001, tone: "success", detail: "Natural potassium-40 in the fruit. The body keeps its potassium level steady, so it does not build up." },
        { label: "Dental X-ray", value: "about 0.005 mSv", numeric: 0.005, tone: "info", detail: "One small picture of the teeth." },
        { label: "Long-haul flight", value: "about 0.05 mSv", numeric: 0.05, tone: "info", detail: "More cosmic rays reach you at cruising altitude. It varies with route and length." },
        { label: "Chest X-ray", value: "about 0.1 mSv", numeric: 0.1, tone: "info", detail: "A single front-view image." },
        { label: "One year of natural background", value: "about 2.4 mSv", numeric: 2.4, tone: "primary", detail: "World average from cosmic rays, rocks, radon and radioactive atoms in our own bodies. It varies by place." },
        { label: "CT scan", value: "about 2 to 10 mSv", numeric: 5, tone: "warning", detail: "Many X-ray images combined into a 3D picture. Used when the medical benefit clearly outweighs the dose." },
      ],
    },
  },
  {
    lesson: "medical-applications",
    block: {
      id: "visual-pet-scan",
      kind: "real_life_example",
      learningObjective: "Describe how a radioactive tracer lets a PET scan show how the body is working.",
      title: "A PET scan: sugar with a glowing tag",
      headline: "How a tiny radioactive tag lights up busy cells",
      explanation:
        "Nuclear medicine gives a very small amount of a short-lived radioactive tracer so doctors can see how organs and tumours behave, not just their shape.",
      whatYouSee:
        "You get a small injection, rest quietly while it spreads through the body, then lie still while a ring-shaped scanner slowly passes over you. A computer turns the signals into a coloured 3D picture.",
      theScience:
        "The tracer is a sugar-like molecule attached to fluorine-18, which has a half-life of about 110 minutes. Each fluorine-18 atom emits a positron. The positron meets an electron and both turn into two gamma rays that fly off in opposite directions. The ring of detectors records these pairs and works out where they came from. Cells that use a lot of sugar, such as many tumours, collect more tracer and show up brighter.",
      whyItMatters:
        "Doctors can find disease early and check whether a treatment is working. Because the half-life is short, most of the radioactivity has gone within a day, and the dose is chosen to be as low as reasonably achievable.",
      facts: [
        "Technetium-99m, with a half-life of about 6 hours, gives off gamma rays and is used in bone, heart and thyroid scans.",
        "Tracers are used in tiny amounts, far too small to change how your body works.",
      ],
      altText:
        "Text card in three parts describing a PET scan: what the patient experiences, the physics of a positron and an electron producing two gamma rays, and why the scan helps doctors.",
      plainText:
        "PET scan example. What you see: a small injection, a rest while the tracer spreads, then lying still in a ring-shaped scanner that produces a coloured 3D picture. The science: a sugar-like tracer carries fluorine-18 (half-life about 110 minutes), which emits positrons; each positron meets an electron and makes two gamma rays going in opposite directions, which the detector ring uses to locate the source; busy cells such as many tumours take up more sugar and look brighter. Why it matters: doctors can find disease early and check treatment, and the radioactivity is mostly gone within a day. Technetium-99m (half-life about 6 hours) is used in bone, heart and thyroid scans.",
      source: ORIGINAL("Summarised from standard nuclear-medicine physics (fluorine-18 about 110 minutes, technetium-99m about 6 hours). Check against IAEA or NRC educational pages before wider publication."),
      credit: "Illustration: AtomIQ",
    },
  },
  {
    lesson: "medical-applications",
    block: {
      id: "visual-radiotherapy-beams",
      kind: "real_life_example",
      learningObjective: "Explain how radiotherapy targets a tumour while sparing most healthy tissue.",
      title: "Radiotherapy: beams that meet at the tumour",
      headline: "Many weak beams, one strong spot",
      explanation:
        "Radiotherapy uses high-energy radiation to damage the DNA of cancer cells so they cannot keep dividing.",
      scene: radiotherapyScene(),
      whatYouSee:
        "You lie on a table while a large machine rotates around you and delivers short, painless pulses of radiation. The treatment is repeated over several days or weeks.",
      theScience:
        "Each beam alone carries a modest dose, so the healthy tissue it crosses receives little. The beams are aimed from different directions so that they all cross at the tumour, where the doses add up. A planning scan maps exactly where the tumour sits. Splitting the treatment into many small sessions gives healthy cells time to repair between them.",
      whyItMatters:
        "Radiotherapy can shrink or remove tumours without surgery, or help after surgery. Careful planning, shielding and dose checks keep the risk to healthy tissue as low as reasonably achievable.",
      facts: [
        "The beams usually come from a machine called a linear accelerator that makes high-energy X-rays.",
        "Brachytherapy is a different method: a small sealed radioactive source is placed inside or next to the tumour.",
      ],
      altText:
        "Diagram of a round body outline with a small red tumour in the middle and three blue arrows coming from different sides, all pointing at the tumour.",
      plainText:
        "Radiotherapy example. What you see: lying on a table while a machine rotates around you and gives short painless pulses of radiation over several days or weeks. The science: each beam gives a modest dose to healthy tissue it crosses, but beams from three or more directions all cross at the tumour so the dose adds up there; a planning scan locates the tumour and many small sessions let healthy cells repair. Why it matters: it can shrink or remove tumours, with planning and shielding keeping risk to healthy tissue as low as reasonably achievable.",
      source: ORIGINAL("Summarised from standard external-beam radiotherapy principles (multiple beam angles, fractionation). Check against IAEA or national cancer-society pages before wider publication."),
      credit: "Illustration: AtomIQ",
    },
  },
  {
    lesson: "nuclear-energy-explained",
    block: {
      id: "visual-simple-reactor",
      kind: "diagram",
      learningObjective: "Name the main parts of a simple nuclear reactor and say what each one does.",
      title: "A simple nuclear power plant",
      explanation:
        "Inside the reactor, uranium fuel splits (fission) and releases heat. Water takes that heat to a steam generator; the steam spins a turbine that makes electricity. Control rods set how fast the chain reaction runs, and a strong containment building surrounds the reactor. This is a simplified pressurised-water design: real plants have many extra systems.",
      altText:
        "Cutaway diagram: inside a large containment building, a water-filled reactor vessel holds upright fuel rods with control rods lowered between them; pipes carry hot and cooler water to a steam generator, and a steam pipe leads outside to a turbine.",
      plainText:
        "Simplified pressurised-water reactor. Fuel rods inside the reactor vessel make heat by fission. Control rods lowered between them absorb neutrons to slow or stop the reaction. Water around the fuel slows neutrons and carries heat away. Hot water flows to the steam generator and returns as cooler water; the two water loops stay separate. Steam from the steam generator spins the turbine, which drives a generator that makes electricity. A thick concrete and steel containment building surrounds the reactor. In the picture, Hot water is a red line, Cooler water is a blue line and Steam is an orange line.",
      caption: "Simplified. Real reactors differ and have many more safety systems.",
      source: ORIGINAL("Created for AtomIQ from the standard layout of a pressurised-water reactor."),
      credit: "Illustration: AtomIQ",
      ...reactor,
    },
  },
  {
    lesson: "nuclear-safety-systems",
    block: {
      id: "visual-defence-in-depth",
      kind: "process_flow",
      learningObjective: "Describe defence in depth as several independent layers, so that one failure does not lead to harm.",
      title: "Defence in depth: layers of protection",
      explanation:
        "No single part is trusted to do everything. Each layer is designed to work even if the one before it fails. Moving outward from the fuel, the layers below are the ones described in this lesson.",
      altText:
        "Five boxes joined by downward arrows, from the fuel pellets at the top to the emergency shutdown at the bottom, each describing one layer of nuclear plant safety.",
      plainText:
        "Layers of protection from the fuel outward. Fuel design: ceramic pellets stay stable even at high temperature. Fuel cladding: sealed metal tubes hold the fuel and its radioactive products inside. Reactor coolant: circulating water removes heat and prevents overheating. Containment building: a thick concrete and steel shell surrounds the reactor. Emergency shutdown (SCRAM): control rods drop in within seconds to stop the chain reaction. Each layer works even if another fails.",
      source: ORIGINAL("Summarises the layers listed in this lesson; the defence-in-depth idea is a standard nuclear-safety principle."),
      credit: "Illustration: AtomIQ",
      steps: [
        { label: "Fuel design", detail: "Ceramic pellets stay stable even at high temperature." },
        { label: "Fuel cladding", detail: "Sealed metal tubes hold the fuel and its radioactive products inside." },
        { label: "Reactor coolant", detail: "Circulating water removes heat and prevents overheating." },
        { label: "Containment building", detail: "A thick concrete and steel shell surrounds the reactor." },
        { label: "Emergency shutdown (SCRAM)", detail: "Control rods drop in within seconds to stop the chain reaction." },
      ],
    },
  },
  {
    lesson: "industrial-agricultural-uses",
    block: {
      id: "visual-sterile-insect-technique",
      kind: "real_life_example",
      learningObjective: "Explain how the sterile insect technique controls a pest without pesticides or making insects radioactive.",
      title: "Sterile insect technique",
      headline: "Beating a pest with sterile males",
      explanation:
        "The sterile insect technique (SIT) uses radiation to stop a pest species from reproducing.",
      whatYouSee:
        "Factory-raised male insects are released in large numbers over orchards or farmland, often from small boxes on aircraft. They look like the wild insects but cannot father young.",
      theScience:
        "The insects are exposed to a carefully chosen dose of radiation, usually gamma rays or X-rays, while still pupae. The dose damages their reproductive cells but does not kill them. When a sterile male mates with a wild female, her eggs do not hatch. Many pest females mate only once or twice, so each sterile mating removes a female from the breeding population.",
      whyItMatters:
        "Pest numbers fall without spraying chemicals over crops, and the method affects only the target species. It has been used against the Mediterranean fruit fly and the screwworm. Treated insects are not radioactive afterwards.",
      facts: [
        "SIT is species-specific: releasing sterile fruit flies has no effect on other insects.",
      ],
      altText:
        "Text card in three parts about the sterile insect technique: releasing sterile male insects, the radiation dose that makes them sterile, and the benefit of reducing pests without pesticides.",
      plainText:
        "Sterile insect technique example. What you see: factory-raised male insects released over orchards or farmland. The science: pupae receive a radiation dose that makes them sterile without killing them; when they mate with wild females the eggs do not hatch, and females that mate only once or twice are removed from the breeding population. Why it matters: pests fall without pesticides, only the target species is affected, it has been used against the Mediterranean fruit fly and screwworm, and the insects are not radioactive afterwards.",
      source: ORIGINAL("Summarised from the widely described sterile insect technique (IAEA/FAO programmes). Check against the IAEA/FAO Joint Centre pages before wider publication."),
      credit: "Illustration: AtomIQ",
    },
  },
  {
    lesson: "industrial-agricultural-uses",
    block: {
      id: "visual-food-irradiation",
      kind: "real_life_example",
      learningObjective: "Explain why irradiated food is safe to eat and not radioactive.",
      title: "Food irradiation",
      headline: "Radiation passes through, but nothing stays behind",
      explanation:
        "Food irradiation exposes food to a controlled amount of radiation to kill germs and pests and to slow spoilage.",
      whatYouSee:
        "Packaged food, such as spices, herbs or some fruit, rides on a conveyor belt through a shielded room and out the other side. It looks and feels the same. Some packages show a small symbol called the Radura.",
      theScience:
        "Gamma rays, X-rays or electron beams pass through the food and damage the DNA of bacteria, moulds and insects so they cannot multiply. The energy used is too low to make the food radioactive, and the radiation source never touches the food. It is similar to a luggage scanner: the beam goes through, and nothing is left behind.",
      whyItMatters:
        "It reduces the germs that cause food poisoning, controls pests in stored or exported produce and keeps food fresh for longer, which cuts waste. It does not replace clean handling and cooking.",
      altText:
        "Text card in three parts about food irradiation: packaged food on a conveyor through a shielded room, how radiation damages germs but leaves no radioactivity, and the benefits for food safety.",
      plainText:
        "Food irradiation example. What you see: packaged food riding a conveyor belt through a shielded room, looking the same afterwards, sometimes marked with the Radura symbol. The science: gamma rays, X-rays or electron beams damage the DNA of bacteria, moulds and insects so they cannot multiply; the energy is too low to make food radioactive and the source never touches the food. Why it matters: fewer food-poisoning germs, pest control for stored produce and longer freshness, but it does not replace clean handling and cooking.",
      source: {
        type: "reference",
        publisher: "Codex Alimentarius (FAO/WHO)",
        title: "General Standard for Irradiated Foods (CODEX STAN 106-1983)",
        note: "Summary written for AtomIQ.",
        verify: true,
      },
      credit: "Illustration: AtomIQ",
    },
  },
  {
    lesson: "environmental-protection",
    block: {
      id: "visual-water-isotope-tracers",
      kind: "real_life_example",
      learningObjective: "Describe how isotopes in water act as a natural fingerprint that shows where water came from and how old it is.",
      title: "Isotope tracers in water",
      headline: "Reading the fingerprint in a glass of water",
      explanation:
        "Scientists use isotopes in water to find out where it came from, how fast aquifers refill and whether pollution is spreading.",
      whatYouSee:
        "A scientist fills small bottles from a well, river or rain gauge, labels them and sends them to a laboratory. Weeks later there is a map showing where the water came from and roughly how old it is.",
      theScience:
        "A few water molecules contain heavier isotopes, such as oxygen-18 or hydrogen-2 (deuterium). Rain that falls in different places and seasons carries slightly different mixtures, so water has a natural fingerprint. Tritium (hydrogen-3), which has a half-life of about 12 years, shows how recently water entered the ground: less tritium means older water.",
      whyItMatters:
        "Communities can see whether their drinking-water aquifer is being refilled or used up faster than it recharges, protect recharge areas and trace the source of pollution. This helps plan water use more sustainably.",
      altText:
        "Text card in three parts about isotope tracers in water: sampling a well or river, how heavier isotopes and tritium act as a fingerprint and a clock, and how that helps manage water resources.",
      plainText:
        "Isotope tracers in water example. What you see: water samples collected from wells, rivers or rain gauges and analysed in a laboratory to map where the water came from and roughly how old it is. The science: oxygen-18 and hydrogen-2 (deuterium) make a natural fingerprint that differs with place and season, and tritium (half-life about 12 years) acts as a clock: less tritium means older water. Why it matters: it shows whether aquifers are refilling or being used up, helps protect recharge areas, traces pollution sources and supports sustainable water planning.",
      source: ORIGINAL("Summarised from the standard principles of isotope hydrology (oxygen-18, deuterium, tritium half-life about 12 years). Check against IAEA isotope-hydrology pages before wider publication."),
      credit: "Illustration: AtomIQ",
    },
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  const dryRun = argv.includes("--dry-run");
  const dbArg = argv.indexOf("--db");
  const dbPath = dbArg >= 0 ? path.resolve(argv[dbArg + 1]) : path.join(REPO, "content", "database", "content.db");

  const { validateVisualBlock } = await import(pathToFileURL(path.join(REPO, "content", "visual-blocks.ts")).href);

  const problems = [];
  const ids = new Set();
  for (const { lesson, block } of BLOCKS) {
    if (ids.has(block.id)) problems.push(`${lesson}/${block.id}: duplicate block id in script`);
    ids.add(block.id);
    const v = validateVisualBlock(block);
    if (!v.ok) problems.push(`${lesson}/${block.id}: ${v.errors.join("; ")}`);
  }
  if (problems.length) {
    console.error("Validation failed, nothing written:\n  " + problems.join("\n  "));
    process.exit(1);
  }

  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000");
  const summary = { added: 0, updated: 0, unchanged: 0 };
  const lines = [];

  const byLesson = new Map();
  for (const entry of BLOCKS) {
    if (!byLesson.has(entry.lesson)) byLesson.set(entry.lesson, []);
    byLesson.get(entry.lesson).push(entry.block);
  }

  db.exec("BEGIN IMMEDIATE");
  try {
    const read = db.prepare("SELECT data FROM lesson_steps WHERE lesson_id = ? AND id = 'micro-learn' AND step_type = 'micro_learn'");
    const write = db.prepare("UPDATE lesson_steps SET data = ?, updated_at = strftime('%s','now') WHERE lesson_id = ? AND id = 'micro-learn'");
    for (const [lesson, blocks] of byLesson) {
      const row = read.get(lesson);
      if (!row) throw new Error(`No micro_learn step 'micro-learn' for lesson '${lesson}'`);
      const data = JSON.parse(row.data);
      const visuals = Array.isArray(data.visuals) ? data.visuals : [];
      let changed = false;
      for (const block of blocks) {
        const idx = visuals.findIndex((b) => b && b.id === block.id);
        if (idx < 0) {
          visuals.push(block);
          summary.added++;
          lines.push(`  + ${lesson}/micro-learn: ${block.id} (${block.kind})`);
          changed = true;
        } else if (JSON.stringify(visuals[idx]) !== JSON.stringify(block)) {
          visuals[idx] = block;
          summary.updated++;
          lines.push(`  ~ ${lesson}/micro-learn: ${block.id} (${block.kind})`);
          changed = true;
        } else {
          summary.unchanged++;
        }
      }
      if (changed) {
        data.visuals = visuals;
        write.run(JSON.stringify(data), lesson);
      }
    }
    if (dryRun) db.exec("ROLLBACK");
    else db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    console.error("Rolled back:", err.message);
    process.exit(1);
  } finally {
    db.close();
  }

  console.log(`${dryRun ? "[dry run] " : ""}Visual blocks in ${path.relative(REPO, dbPath)}`);
  if (lines.length) console.log(lines.join("\n"));
  console.log(`Summary: ${summary.added} added, ${summary.updated} updated, ${summary.unchanged} unchanged, ${BLOCKS.length} total`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
