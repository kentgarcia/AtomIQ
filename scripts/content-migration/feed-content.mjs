#!/usr/bin/env node
/**
 * NPC feed and mini blog migration (docs/NPC_FEED_SPEC.md §6 and §9). Idempotent and additive:
 *
 *   1. Creates `feed_templates`, `blog_posts`, `blog_comments` and `blog_references` (the `feed`
 *      block of schema.sql) when they are missing.
 *   2. Seeds the first set of feed templates and blog pieces below, for the units that exist in the
 *      database (units 1 and 2 today; a unit without a row here, or whose lessons are not in the
 *      database, is skipped and gets its content when it is written).
 *   3. Rows that already exist are left alone, so later edits in Content Studio survive a re-run;
 *      pass `--overwrite` to reset the seeded rows to this file's text.
 *
 * Takes a backup first. Does not publish or run sync-content; the release step does. Sources are
 * existing `content_references` rows; none is marked verified here (a person has to open each one).
 *
 *   node --no-warnings scripts/content-migration/feed-content.mjs [--dry-run] [--overwrite] [--db path]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";
import { BLOG_LIMITS, LEARNER_POSTER, blogWordCount, readingMinutes } from "../lib/feed-vocab.mjs";
import { validateFeed } from "../lib/feed-rules.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// ---------------------------------------------------------------------------
// The seed content
// ---------------------------------------------------------------------------

const ADA = "npc-ada";
const HAL = "npc-hal";
const RAY = "npc-ray";
const MINA = "npc-mina";
const KOFI = "npc-kofi";
const TESS = "npc-tess";
const SAGE = "npc-sage";
/** The learner as poster: a template with this as its whole pool is written in the learner's voice. */
const LEARNER = LEARNER_POSTER;

/**
 * Per unit: who teaches it, who else posts about it, the lessons (two variants each: `a` for any
 * learner, `b` sometimes only for a perfect run), a tease, and the unit-level posts.
 * Texts speak to the learner ("You finished") or about them ("Someone just"): both voices are mixed.
 * `{lesson}` is the lesson title, `{unit}` the unit title. Titles can end in "?" so {lesson} is quoted.
 */
const UNITS = {
  "inside-the-atom": {
    teacher: ADA,
    neighbour: HAL,
    lessons: {
      "atoms-are-everywhere": {
        a: "You finished “{lesson}”. Your hand, and the air around it, are made of atoms. They are far too small to see.",
        b: { perfect: false, text: "Someone just zoomed in from a hand all the way down to a single atom. Welcome to the very small." },
      },
      "protons-neutrons-electrons": {
        a: "“{lesson}” is done. You met the proton, the neutron and the electron. Only one of the three is negative.",
        b: { perfect: true, text: "Someone just answered everything right in “{lesson}”. If an atom were a stadium, its nucleus would be a marble. They know it." },
      },
      "elements-and-the-periodic-table": {
        a: "You finished “{lesson}”. Six protons is always carbon. Seven is always nitrogen. Eight is always oxygen.",
        b: { perfect: false, text: "Someone just turned carbon into nitrogen with one extra proton, in the atom builder. The protons decide the element." },
      },
      isotopes: {
        a: "“{lesson}” is done. Carbon-12, carbon-13 and carbon-14 are all carbon, with different numbers of neutrons.",
        b: { perfect: true, text: "A perfect run through “{lesson}”. Same protons, different neutrons. And an isotope is not automatically radioactive." },
      },
      "stable-and-unstable-nuclei": {
        a: "You finished “{lesson}”. Some nuclei stay the same and some can change. Most of the atoms in you are stable.",
        b: { perfect: false, text: "Someone just made unstable carbon-14 into a stable carbon atom by changing its neutrons. Worth a look." },
      },
    },
    tease: { lesson: "elements-and-the-periodic-table", text: "Three lessons in. Isotopes are next: the same element, with a different number of neutrons." },
    checkpoint: "The {unit} checkpoint is passed. Protons, neutrons, electrons and isotopes: all there.",
    unitPosts: [
      { by: "neighbour", text: "Someone just finished “{unit}” with Ada. They know what is inside an atom. Now they can learn how a nucleus changes. That part is mine." },
      { by: "teacher", text: "You finished “{unit}”. You know what an atom is made of, what makes an element, and why some nuclei can change. Hal is next." },
    ],
    testout: "You tested out of “{unit}”. You already knew your atoms. That is a fine place to start.",
  },
  radioactivity: {
    teacher: HAL,
    neighbour: ADA,
    lessons: {
      "why-nuclei-decay": {
        a: "You finished “{lesson}”. An unstable nucleus can change all by itself, and nobody can say when.",
        b: { perfect: false, text: "Someone just learned the parent and the daughter. One nucleus changes into another. Nothing simply vanishes." },
      },
      "alpha-beta-gamma": {
        a: "“{lesson}” is done. Alpha is a chunk, beta is a fast electron, and gamma is not a particle at all.",
        b: { perfect: true, text: "A perfect score in “{lesson}”. Three kinds of radiation, and this learner can tell them apart." },
      },
      "half-life": {
        a: "You finished “{lesson}”. Half-life belongs to a whole crowd of atoms. It is not a timer inside each one.",
        b: { perfect: true, text: "A perfect “{lesson}”. Start with 100 nuclei and after one half-life about 50 are left. Note the word about." },
      },
      "decay-chains": {
        a: "“{lesson}” is done. One decay is not always the end. Each step makes a different nucleus.",
        b: { perfect: false, text: "Someone just followed a nucleus as it changed again and again until it was stable. Nothing simply vanishes." },
      },
      "radioactivity-is-natural": {
        a: "You finished “{lesson}”. It is in rocks, in the air, in food and in you, and it was here long before people.",
        b: { perfect: false, text: "Someone just learned that a banana is a little bit radioactive. Radioactive does not automatically mean dangerous." },
      },
    },
    tease: { lesson: "half-life", text: "Half-life is done. Next you will follow a nucleus that changes again and again. One decay is not always the end." },
    checkpoint: "The {unit} checkpoint is passed. Take a moment. You earned it.",
    unitPosts: [
      { by: "neighbour", text: "Someone has finished “{unit}” with Hal. Nuclei change by themselves, a crowd follows a pattern, and radioactivity is natural. I am proud of them." },
      { by: "teacher", text: "You finished “{unit}”. Now you know why nuclei change, what comes out, and how a crowd follows a pattern. Radioactivity is a natural part of the world." },
    ],
    testout: "You tested out of “{unit}”. You knew this already, and now it is on your record. Good.",
  },
};

const short = (npcId) => npcId.replace(/^npc-/, "");

/** Templates that belong to no unit: the poster is picked from `pool` when the post is made. */
const SHARED = [
  // Streak posts are the learner's own voice (pool ["learner"]): "I kept a 7 day streak", with their avatar. Friends react.
  { id: "ft-streak-3", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 3 }, text: "{days} days in a row. A habit is starting, and I want to see it through.", chip: "quests", reactors: [TESS] },
  { id: "ft-streak-7", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 7 }, text: "A full week: {days} days in a row. I keep showing up for atoms.", chip: "quests", reactors: [RAY] },
  { id: "ft-streak-14", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 14 }, text: "{days} days in a row. Two weeks of learning something every single day.", chip: "quests", reactors: [MINA] },
  { id: "ft-streak-30", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 30 }, text: "{days} days. A whole month of showing up for atoms. I am proud of that.", chip: null, reactors: [SAGE] },
  { id: "ft-streak-60", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 60 }, text: "{days} days in a row. Two months of steady learning, one day at a time.", chip: "quests", reactors: [KOFI] },
  { id: "ft-streak-100", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 100 }, text: "{days} days in a row. One hundred days! I did not think I would make it this far.", chip: null, reactors: [ADA] },
  { id: "ft-chest-daily", pool: [TESS, KOFI], kind: "celebrate", trigger: "chest_opened", condition: { period: "daily" }, text: "A daily chest, opened. Small reward, steady habit.", chip: "quests" },
  { id: "ft-chest-weekly", pool: [ADA, MINA], kind: "celebrate", trigger: "chest_opened", condition: { period: "weekly" }, text: "The weekly chest is open. Every quest of the week is done. That was a lot of small steps.", chip: "quests" },
  { id: "ft-chest-any", pool: [RAY, SAGE], kind: "celebrate", trigger: "chest_opened", condition: {}, text: "Someone just opened a chest on Quests. Nice and steady.", chip: "quests" },
  { id: "ft-rank-passed", pool: [ADA, HAL, KOFI, SAGE, TESS], kind: "celebrate", trigger: "rank_change", condition: { direction: "passed" }, text: "You passed {rival} in the weekly ranking. Keep going.", chip: "ranks" },
  { id: "ft-rank-passed-by", pool: [ADA, HAL, KOFI, SAGE, TESS], kind: "nudge", trigger: "rank_change", condition: { direction: "passed_by" }, text: "{rival} passed you in the weekly ranking. One more lesson could change that.", chip: "ranks" },
  { id: "ft-rank-any", pool: [RAY, MINA, KOFI, SAGE], kind: "nudge", trigger: "rank_change", condition: {}, text: "The weekly ranking moved: you and {rival} traded places. Take a look.", chip: "ranks" },
  { id: "ft-first-lesson-1", pool: [ADA, SAGE], kind: "celebrate", trigger: "first_lesson", condition: {}, text: "Someone just finished a very first lesson, “{lesson}”. Everyone starts somewhere.", chip: "lesson" },
  { id: "ft-first-lesson-2", pool: [ADA, KOFI], kind: "celebrate", trigger: "first_lesson", condition: {}, text: "Your first lesson is done: “{lesson}”. That is one lesson closer to knowing what everything is made of.", chip: "lesson" },
  // Comeback posts are a teacher welcoming the learner back.
  { id: "ft-comeback-3", pool: [TESS, MINA], kind: "nudge", trigger: "comeback", condition: { minDays: 3 }, text: "Welcome back, {name}. Pick up where you left off. The atoms waited.", chip: null },
  { id: "ft-comeback-3b", pool: [ADA, KOFI], kind: "nudge", trigger: "comeback", condition: { minDays: 3 }, text: "There you are, {name}. We saved your seat. Ready for one more lesson?", chip: null },
  { id: "ft-comeback-7", pool: [HAL, SAGE], kind: "nudge", trigger: "comeback", condition: { minDays: 7 }, text: "It has been a while, {name}. No rush. One lesson is enough to start again.", chip: null },
  { id: "ft-comeback-7b", pool: [MINA, RAY], kind: "nudge", trigger: "comeback", condition: { minDays: 7 }, text: "{name}, you are back, and we missed you. Start small. One lesson is plenty.", chip: null },
  { id: "ft-comeback-14", pool: [ADA, HAL, SAGE], kind: "nudge", trigger: "comeback", condition: { minDays: 14 }, text: "Welcome back, {name}. The door was open the whole time. Let's find where you stopped.", chip: null },
  { id: "ft-quests-1", pool: [KOFI, TESS], kind: "celebrate", trigger: "daily_quests_done", condition: {}, text: "Every daily quest is claimed. That was a full day's work, and the chest is waiting.", chip: "quests" },
  { id: "ft-quests-2", pool: [RAY, MINA], kind: "celebrate", trigger: "daily_quests_done", condition: {}, text: "All the daily quests are done. Go and open the chest.", chip: "quests" },
];

/**
 * Mini blog pieces. `read_min` is computed from the words. Blocks: p h quote fact figure list next.
 * Every fact here is in the unit's lessons (docs/NPC_FEED_SPEC.md §4.3) or is repeated from them.
 */
const BLOGS = [
  {
    id: "blog-the-smallest-thing",
    unit: "inside-the-atom",
    author: ADA,
    lesson: "atoms-are-everywhere",
    position: 0,
    title: "The smallest thing you will ever meet",
    hook: "You have never seen one, yet you are made of them. Here is how small they really are.",
    cover: "atom",
    unlock: { trigger: "none" },
    reactors: [],
    blocks: [
      { t: "p", text: "Look at your hand. Now look at the air around it. Both are matter, and all matter is made of atoms." },
      { t: "p", text: "Yes, even the air, which feels like nothing. That is why a pumped-up ball weighs more than a flat one: the air inside it is matter too." },
      { t: "quote", text: "I have asked what things are made of since I was small. I still ask it every day." },
      { t: "h", text: "How small is small?" },
      { t: "p", text: "Take a skin cell. You need a microscope to see it. A virus is about 300 times smaller than that cell. And an atom is about 300 times smaller again." },
      { t: "figure", ref: "atom", caption: "An atom: far too small to see, even with an ordinary microscope." },
      { t: "list", items: ["Your hand: about 10 cm", "A skin cell: about 0.03 mm", "A virus: about 100 nm", "An atom: a few tenths of a nm"] },
      { t: "fact", text: "About 2,400 years ago the Greek thinker Democritus imagined cutting something in half again and again, until he reached a piece that could not be cut. He called it atomos. Seeing atoms took far longer." },
      { t: "p", text: "Light and heat are different. They are energy, not matter, so they are not made of atoms." },
      { t: "p", text: "So the next time you pick something up, remember that you are holding a huge crowd of atoms you can never see." },
      { t: "next", label: "Zoom in on an atom yourself", lessonId: "atoms-are-everywhere" },
    ],
    refs: ["ref-openstax-chem-ch1", "ref-openstax-chem-ch2"],
    comments: [
      { npc: RAY, text: "Plain words: matter is anything that has mass and takes up space. Light and heat do not, so they are not matter.", chip: { entryId: "atom" } },
      { npc: HAL, text: "Atoms are tiny, and the nucleus inside one can change all by itself. That is what my lessons are about.", chip: { lessonId: "why-nuclei-decay" } },
    ],
  },
  {
    id: "blog-three-kinds-of-carbon",
    unit: "inside-the-atom",
    author: ADA,
    lesson: "isotopes",
    position: 1,
    title: "Three kinds of carbon",
    hook: "Carbon-12, carbon-13 and carbon-14 are all carbon. One of them is not like the others.",
    cover: "diamond",
    unlock: { trigger: "unit_complete", unitId: "inside-the-atom" },
    reactors: [HAL],
    blocks: [
      { t: "p", text: "Here is a puzzle. Three atoms are all carbon, yet they are not the same. How can that be?" },
      { t: "p", text: "Count the protons. Every carbon atom has 6, and that number is what makes it carbon. Change it and you get a different element." },
      { t: "h", text: "The neutrons are the difference" },
      { t: "p", text: "The number after the name is the mass number: protons plus neutrons. Carbon has 6 protons, so carbon-14 has 14 - 6 = 8 neutrons." },
      { t: "list", items: ["Carbon-12: 6 protons, 6 neutrons, stable", "Carbon-13: 6 protons, 7 neutrons, stable", "Carbon-14: 6 protons, 8 neutrons, unstable"] },
      { t: "p", text: "These versions of one element are called isotopes. Most of the atoms around you are stable isotopes." },
      { t: "quote", text: "Isotope does not mean radioactive. It only means a different number of neutrons." },
      { t: "fact", text: "Carbon-14 is the unstable one. An unstable nucleus can change, and when it does it gives off radiation. That is called radioactivity." },
      { t: "p", text: "Even so, nothing here is strange or new. Unstable atoms are in rocks, in the air and in food, and they were here long before us." },
      { t: "p", text: "Which brings a question. What exactly comes out when a nucleus changes? Hal knows, and he tells it slowly." },
      { t: "next", label: "Meet Hal and radioactivity", unitId: "radioactivity" },
    ],
    refs: ["ref-openstax-chem-ch2", "ref-iaea-isotopes"],
    comments: [
      { npc: MINA, text: "Calm note: unstable does not mean dangerous. Your own body holds a little natural potassium-40, and that is normal.", chip: { lessonId: "stable-and-unstable-nuclei" } },
    ],
  },
  {
    id: "blog-nobody-knows-when",
    unit: "radioactivity",
    author: HAL,
    lesson: "why-nuclei-decay",
    position: 0,
    title: "Nobody knows when",
    hook: "Look at one unstable nucleus and its moment is a surprise. Look at a crowd and it is a pattern.",
    cover: "radiation",
    unlock: { trigger: "lesson_complete", lessonId: "why-nuclei-decay" },
    reactors: [ADA],
    blocks: [
      { t: "p", text: "Take one unstable nucleus. Leave it alone. It has a chance of changing, and nobody can say when." },
      { t: "p", text: "Nobody pushes it. The nucleus that changes is the parent. The nucleus it becomes is the daughter. The change gives off radiation." },
      { t: "quote", text: "My pocket watch ticks for a crowd of atoms, never for one." },
      { t: "h", text: "Think of a die" },
      { t: "p", text: "Roll a die once and you cannot say whether it will show a six. Roll it 600 times and you can say that about 100 of the rolls will." },
      { t: "p", text: "A nucleus is like that. One is a surprise. A big group follows a pattern, and in the half-life lesson you will see the pattern for yourself." },
      { t: "figure", ref: "radiation", caption: "The radiation sign, used to mark a source of radiation." },
      { t: "fact", text: "Heating, cooling and chemistry hardly change how fast an unstable nucleus changes. In a flame or in ice, it is still unstable." },
      { t: "list", items: ["One nucleus: you cannot say when", "A big group: it follows a pattern"] },
      { t: "p", text: "So when someone asks you when an atom will change, you can answer slowly and exactly: you cannot know. A crowd of them, though, you can know." },
      { t: "next", label: "See what comes out of a decay", lessonId: "alpha-beta-gamma" },
    ],
    refs: ["ref-iaea-decay", "ref-openstax-up3-ch10"],
    comments: [
      { npc: RAY, text: "Plain words: a group follows a pattern even though one nucleus does not. You will see exactly how in the half-life lesson.", chip: { lessonId: "half-life" } },
    ],
  },
  {
    id: "blog-the-banana-on-your-counter",
    unit: "radioactivity",
    author: HAL,
    lesson: "radioactivity-is-natural",
    position: 1,
    title: "The banana on your counter",
    hook: "A banana is a little bit radioactive. So are you. That is normal, and here is why.",
    cover: "banana",
    unlock: { trigger: "unit_complete", unitId: "radioactivity" },
    reactors: [ADA, MINA],
    blocks: [
      { t: "p", text: "Here is something nobody expects. The banana on your counter is a little bit radioactive." },
      { t: "p", text: "It holds potassium, and a tiny share of that potassium is potassium-40, which is unstable. You carry some too, in your own body." },
      { t: "h", text: "It was here first" },
      { t: "p", text: "Radioactivity was not invented. It was here long before people were. You can find it in four places." },
      { t: "list", items: ["Rocks and soil: uranium and thorium", "The air: radon, a radioactive gas from the ground", "Food and your body: potassium-40", "Space: cosmic radiation, all the time"] },
      { t: "figure", ref: "banana", caption: "A banana holds a little natural potassium-40." },
      { t: "quote", text: "Radioactivity was always here. We only learned to see it." },
      { t: "fact", text: "In 1896 Henri Becquerel left a uranium mineral on a wrapped photographic plate. The plate fogged, even with no sunlight. Radioactivity was found in a natural mineral, long before anyone made nuclear technology." },
      { t: "h", text: "Is it dangerous?" },
      { t: "p", text: "Radioactive does not automatically mean dangerous. What matters is the type of radiation, how much there is, and how it reaches the body." },
      { t: "p", text: "A banana and your own body are radioactive, and that is normal. Later, you will learn why being exposed to radiation is not the same as becoming radioactive." },
      { t: "next", label: "Find where radioactivity hides around you", lessonId: "radioactivity-is-natural" },
    ],
    refs: ["ref-background-radiation", "ref-becquerel-1896", "ref-potassium-40"],
    comments: [],
  },
];

// ---------------------------------------------------------------------------
// Build rows
// ---------------------------------------------------------------------------

export function buildTemplates(unitIds, lessonIds) {
  const rows = [];
  const push = (r) => rows.push({ pool: [], chip: null, reactors: [], weight: 1, ...r });
  for (const [unitId, u] of Object.entries(UNITS)) {
    if (!unitIds.has(unitId)) continue;
    const t = short(u.teacher);
    for (const [lessonId, v] of Object.entries(u.lessons)) {
      if (!lessonIds.has(lessonId)) continue;
      push({ id: `ft-${t}-lesson-${lessonId}-1`, npc: u.teacher, kind: "celebrate", trigger: "lesson_complete", condition: { unitId, lessonId }, text: v.a, chip: "lesson", weight: 2 });
      push({
        id: `ft-${t}-lesson-${lessonId}-2`,
        npc: u.teacher,
        kind: "celebrate",
        trigger: "lesson_complete",
        condition: v.b.perfect ? { unitId, lessonId, perfect: true } : { unitId, lessonId },
        text: v.b.text,
        chip: "lesson",
      });
    }
    if (lessonIds.has(u.tease.lesson)) {
      push({ id: `ft-${t}-tease-${unitId}`, npc: u.teacher, kind: "tease", trigger: "lesson_complete", condition: { unitId, lessonId: u.tease.lesson }, text: u.tease.text, chip: "unit" });
    }
    push({ id: `ft-${t}-checkpoint-${unitId}`, npc: u.teacher, kind: "milestone", trigger: "checkpoint_pass", condition: { unitId }, text: u.checkpoint, chip: "unit", reactors: [u.neighbour] });
    u.unitPosts.forEach((p, i) => {
      const poster = p.by === "teacher" ? u.teacher : u.neighbour;
      // The unit's teacher always reacts to a unit milestone; when the teacher posts it, the neighbour does.
      const reactor = p.by === "teacher" ? u.neighbour : u.teacher;
      push({ id: `ft-${short(poster)}-unit-${unitId}-${i + 1}`, npc: poster, kind: "milestone", trigger: "unit_complete", condition: { unitId }, text: p.text, chip: "unit", reactors: [reactor], weight: 2 });
    });
    push({ id: `ft-${t}-testout-${unitId}`, npc: u.teacher, kind: "milestone", trigger: "testout_pass", condition: { unitId }, text: u.testout, chip: "unit", reactors: [u.neighbour] });
  }
  for (const s of SHARED) push({ ...s, npc: null });
  return rows;
}

function checkBlog(b) {
  const words = blogWordCount(b.blocks);
  if (words < BLOG_LIMITS.wordsMin || words > BLOG_LIMITS.wordsMax) throw new Error(`${b.id}: ${words} words, expected ${BLOG_LIMITS.wordsMin} to ${BLOG_LIMITS.wordsMax}`);
  return words;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export function seedFeed(db, { overwrite = false } = {}) {
  const sql = fs.readFileSync(path.join(ROOT, "scripts/content-migration/schema.sql"), "utf8");
  const a = sql.indexOf("-- BEGIN feed");
  const b = sql.indexOf("-- END feed");
  if (a < 0 || b < 0) throw new Error("schema.sql is missing the feed markers");
  db.exec(sql.slice(a, b));

  const ids = (table) => new Set(db.prepare(`SELECT id FROM ${table}`).all().map((r) => r.id));
  const unitIds = ids("units");
  const lessonIds = ids("lessons");
  const npcIds = ids("npcs");
  const refIds = ids("content_references");
  const entryIds = ids("encyclopedia_entries");
  const json = (v) => JSON.stringify(v);
  const stats = { templates: 0, posts: 0, comments: 0, refs: 0, skipped: [] };

  // feed templates
  const verb = overwrite ? "INSERT OR REPLACE" : "INSERT OR IGNORE";
  const insT = db.prepare(`${verb} INTO feed_templates (id, npc_id, poster_pool, kind, trigger, condition, text, chip, reactors, weight) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const t of buildTemplates(unitIds, lessonIds)) {
    for (const n of [t.npc, ...t.pool, ...t.reactors].filter((x) => x && x !== LEARNER_POSTER)) if (!npcIds.has(n)) throw new Error(`${t.id}: unknown NPC ${n}`);
    stats.templates += Number(insT.run(t.id, t.npc, json(t.pool), t.kind, t.trigger, json(t.condition), t.text, t.chip, json(t.reactors), t.weight).changes);
  }

  // blog pieces
  const insP = db.prepare(`${verb} INTO blog_posts (id, npc_id, unit_id, lesson_id, position, title, hook, cover, read_min, unlock, blocks, reactors) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insC = db.prepare(`${verb} INTO blog_comments (id, blog_id, npc_id, position, text, chip) VALUES (?,?,?,?,?,?)`);
  const insR = db.prepare("INSERT OR IGNORE INTO blog_references (blog_id, reference_id) VALUES (?,?)");
  for (const p of BLOGS) {
    const lessonsNeeded = [p.lesson, p.unlock.lessonId, ...p.blocks.map((x) => x.lessonId)].filter(Boolean);
    if (!unitIds.has(p.unit) || lessonsNeeded.some((l) => !lessonIds.has(l))) {
      stats.skipped.push(p.id);
      continue;
    }
    for (const n of [p.author, ...p.reactors, ...p.comments.map((c) => c.npc)]) if (!npcIds.has(n)) throw new Error(`${p.id}: unknown NPC ${n}`);
    for (const r of p.refs) if (!refIds.has(r)) throw new Error(`${p.id}: unknown reference ${r}`);
    for (const c of p.comments) if (c.chip?.entryId && !entryIds.has(c.chip.entryId)) throw new Error(`${p.id}: unknown encyclopedia entry ${c.chip.entryId}`);
    const words = checkBlog(p);
    stats.posts += Number(insP.run(p.id, p.author, p.unit, p.lesson, p.position, p.title, p.hook, p.cover, readingMinutes(words), json(p.unlock), json(p.blocks), json(p.reactors)).changes);
    p.comments.forEach((c, i) => {
      stats.comments += Number(insC.run(`bc-${p.id.replace(/^blog-/, "")}-${short(c.npc)}`, p.id, c.npc, i, c.text, c.chip ? json(c.chip) : null).changes);
    });
    for (const r of p.refs) stats.refs += Number(insR.run(p.id, r).changes);
  }
  return stats;
}

// Run only when executed directly (the tests import seedFeed).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const overwrite = args.includes("--overwrite");
  const dbArg = args.indexOf("--db");
  const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

  if (!dryRun) backupBeforeScript("feed-content", dbPath); // safety net: scripts/lib/backup.mjs
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("BEGIN");
  let stats;
  try {
    stats = seedFeed(db, { overwrite });
    const { findings, checked } = validateFeed(db);
    const errors = findings.filter((f) => f.severity === "error");
    console.log(`checked ${JSON.stringify(checked)}: ${errors.length} error(s), ${findings.length - errors.length} warning(s)`);
    for (const f of errors) console.log(`  ERROR ${f.table} ${f.id} :: ${f.field} :: ${f.rule}: ${f.message}`);
    if (errors.length) throw new Error("the seeded feed content does not validate");
    db.exec(dryRun ? "ROLLBACK" : "COMMIT");
  } catch (err) {
    try {
      db.exec("ROLLBACK");
    } catch {
      /* nothing open */
    }
    throw err;
  } finally {
    db.close();
  }
  console.log(
    `${dryRun ? "[dry run] " : ""}feed templates +${stats.templates}, blog pieces +${stats.posts}, comments +${stats.comments}, sources +${stats.refs}` +
      (stats.skipped.length ? `, skipped (their lessons are missing): ${stats.skipped.join(", ")}` : ""),
  );
}
