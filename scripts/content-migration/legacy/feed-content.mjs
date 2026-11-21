#!/usr/bin/env node
/**
 * NPC feed and mini blog migration (docs/features/NPC_FEED_SPEC.md §6 and §9). Idempotent and additive:
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
 *   node --no-warnings scripts/content-migration/legacy/feed-content.mjs [--dry-run] [--overwrite] [--db path]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";
import { BLOG_LIMITS, LEARNER_POSTER, blogWordCount, readingMinutes } from "../../lib/feed-vocab.mjs";
import { validateFeed } from "../../lib/feed-rules.mjs";

/**
 * RETIRED (content source files). The rows this script writes (feed and blog) are written in content/source and built with
 * `npm run content:sync`; running this would overwrite them behind the files' back. Kept only as history.
 * Do not run it. Edit the files (docs/features/CONTENT_SOURCE_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("feed-content.mjs is retired: feed and blog live in content/source and are built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// ---------------------------------------------------------------------------
// The seed content
// ---------------------------------------------------------------------------

const HAL = "npc-hal";
const ADA = "npc-ada";
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
  // Hal posts slowly and exactly, deadpan, with a rock somewhere in it; Ada posts like a best friend, lowercase, a "~" only now and then for an expression.
  "inside-the-atom": {
    teacher: HAL,
    neighbour: ADA,
    lessons: {
      "atoms-are-everywhere": {
        a: "You finished “{lesson}”. Your hand, and the air around it, are made of atoms. They are far too small to see. I have checked. Twice.",
        b: { perfect: false, text: "Someone just zoomed in from a hand down to a single atom. Slowly, and all the way. That is the correct way to look at anything." },
      },
      "protons-neutrons-electrons": {
        a: "“{lesson}” is done. You met the proton, the neutron and the electron. Only one of the three is negative. I find it helps to remember which.",
        b: { perfect: true, text: "Someone just answered everything right in “{lesson}”. If an atom were a stadium, its nucleus would be a marble. They know it exactly. I am moved." },
      },
      "elements-and-the-periodic-table": {
        a: "You finished “{lesson}”. Six protons is always carbon. Seven is always nitrogen. Eight is always oxygen. It never varies. I find that restful.",
        b: { perfect: false, text: "Someone just turned carbon into nitrogen with one extra proton, in the atom builder. The protons decide the element. Exactly so." },
      },
      isotopes: {
        a: "“{lesson}” is done. Carbon-12, carbon-13 and carbon-14 are all carbon, with different numbers of neutrons. I have named three pebbles after them.",
        b: { perfect: true, text: "A perfect run through “{lesson}”. Same protons, different neutrons. And an isotope is not automatically radioactive. Well observed." },
      },
      "stable-and-unstable-nuclei": {
        a: "You finished “{lesson}”. Some nuclei stay the same and some can change. Most of the atoms in you are stable. I find that reassuring.",
        b: { perfect: false, text: "Someone just made unstable carbon-14 into a stable carbon atom by changing its neutrons. I looked at it for some time." },
      },
    },
    tease: { lesson: "elements-and-the-periodic-table", text: "Three lessons in. Isotopes are next: the same element, with a different number of neutrons. I will be sorting pebbles. Do not mind me." },
    checkpoint: "The {unit} checkpoint is passed. Protons, neutrons, electrons and isotopes: all of it, in its place. I have put a small rock on this post to mark the occasion.",
    unitPosts: [
      { by: "neighbour", text: "someone just finished “{unit}” with Hal. they know what's inside an atom. now they can find out how a nucleus changes, and that part is mine. hehe~" },
      { by: "teacher", text: "You finished “{unit}”. You know what an atom is made of, what makes an element, and why some nuclei can change. Ada is next. She is a great deal. She is also very good." },
    ],
    testout: "You tested out of “{unit}”. You already knew your atoms. That is a fine place to start, and I respect it. I will not make you sit my rock quiz.",
  },
  radioactivity: {
    teacher: ADA,
    neighbour: HAL,
    lessons: {
      "why-nuclei-decay": {
        a: "you finished “{lesson}”. an unstable nucleus can change all by itself, and nobody can say when. ooh, a little mystery~",
        b: { perfect: false, text: "someone just learned the parent and the daughter. one nucleus turns into another. nothing just vanishes, it only becomes something new. so cute" },
      },
      "alpha-beta-gamma": {
        a: "“{lesson}” is done. alpha is a chunk, beta is a fast electron, and gamma isn't a particle at all. three little surprises, hehe",
        b: { perfect: true, text: "a perfect score in “{lesson}”. three kinds of radiation and this learner can tell them ALL apart. eee, so clever~" },
      },
      "half-life": {
        a: "you finished “{lesson}”. half-life belongs to a whole crowd of atoms. it's not a little timer inside each one. hehe",
        b: { perfect: true, text: "a perfect “{lesson}”. start with 100 nuclei and after one half-life about 50 are left. note the word about. i love that word~" },
      },
      "decay-chains": {
        a: "“{lesson}” is done. one decay isn't always the end. every step makes a different nucleus, like a tiny staircase",
        b: { perfect: false, text: "someone just followed a nucleus as it changed again and again until it was stable. nothing vanishes, it just keeps becoming" },
      },
      "radioactivity-is-natural": {
        a: "you finished “{lesson}”. it's in rocks, in the air, in food, in you, and it was here long before people. so old, so cute~",
        b: { perfect: false, text: "someone just learned a banana is a little bit radioactive. radioactive doesn't automatically mean dangerous. banana fact of the day" },
      },
    },
    tease: { lesson: "half-life", text: "half-life is done, yay~ next you'll follow a nucleus that changes again and again. one decay isn't always the end" },
    checkpoint: "the {unit} checkpoint is passed. take a little moment. you earned every bit of it~",
    unitPosts: [
      { by: "neighbour", text: "Someone has finished “{unit}” with Ada. Nuclei change by themselves, a crowd follows a pattern, and radioactivity is natural. I am quietly proud. She will be insufferable about it. Rightly." },
      { by: "teacher", text: "you finished “{unit}”. now you know why nuclei change, what comes out, and how a crowd follows a pattern. radioactivity is a natural part of the world" },
    ],
    testout: "you tested out of “{unit}”. you already knew all this and now it's on your record. so sparkly~",
  },
};

const short = (npcId) => npcId.replace(/^npc-/, "");

/**
 * Posts that belong to no unit, one set per character, each in their own voice (docs/features/NPC_VOICE_SPEC.md): every teacher has
 * their own template for a chest, passing or being passed in the ranking, a first lesson, coming back and finishing the day's quests.
 * Which one is posted is picked by weight among the ones that fit, so the poster, and with them the tone, varies. The streak posts are
 * the learner's own voice (pool ["learner"]) and are shared.
 */
const VOICES = {
  [HAL]: {
    chestDaily: "A daily chest, opened. A small reward for a steady day. Steady days are how a pebble becomes a cliff. Slowly.",
    chestWeekly: "The weekly chest is open. Every quest of the week is done, one after another. I should like to shake your hand. I will do so in spirit.",
    rankPassed: "You passed {rival} in the weekly ranking. Quietly done. I did not see it happen. I only saw that it had.",
    rankPassedBy: "{rival} passed you in the weekly ranking. No need to hurry. A rock does not hurry, and yet there are mountains.",
    firstLesson: "Your first lesson is done: “{lesson}”. A good start. We will go slowly, and we will go exactly.",
    comeback3: "Welcome back, {name}. Everything is where you left it, which is more than I can say for my samples. Shall we pick it up?",
    comeback14: "It has been a while, {name}. That is all right. The atoms waited, and so did I. I have sorted my rocks four times since. One lesson is a fine place to begin.",
    quests: "Every daily quest is claimed. A full day, done carefully. The chest is waiting. I will not open it for you. It would be rude.",
  },
  [ADA]: {
    chestDaily: "ooh a daily chest, opened. a tiny sparkle for a tiny habit. yay you~",
    chestWeekly: "the weekly chest is open. every quest of the week, done. that's SO many little steps hehe~",
    rankPassed: "you passed {rival} in the weekly ranking. eep, so quick. keep going, friend~",
    rankPassedBy: "oh no, {rival} passed you in the weekly ranking. just one more lesson and you could zoom ahead again",
    firstLesson: "your first lesson is done: “{lesson}”. hehe, i knew you could. every big thing starts tiny~",
    comeback3: "there you are, {name}. i saved your seat~ ready for one more tiny lesson?",
    comeback14: "welcome back, {name}. the door was open the whole time and i kept the flask warm. let's find where you stopped",
    quests: "all the daily quests are claimed. go open the chest, i think it's sparkly~",
  },
  [RAY]: {
    chestDaily: "Daily chest opened. Small reward. Same time tomorrow.",
    chestWeekly: "Weekly chest open. Every quest of the week done. Checked off.",
    rankPassed: "You passed {rival} in the weekly ranking. Noted. Hold the spot.",
    rankPassedBy: "{rival} passed you in the weekly ranking. One lesson fixes that. Go do it.",
    firstLesson: "First lesson done: “{lesson}”. Good. The next one is on the map.",
    comeback3: "{name}. You are back. Pick up where you stopped. One lesson is enough.",
    comeback14: "Two weeks, {name}. Fine. Start with one lesson. Do not try to catch up all at once.",
    quests: "All daily quests done. Open the chest. That is the whole job for today.",
  },
  [MINA]: {
    chestDaily: "You opened the daily chest. A small reward, and a gentle reminder that small steps count.",
    chestWeekly: "The weekly chest is open. A whole week of quests, done at your own pace. That takes care and patience.",
    rankPassed: "You passed {rival} in the weekly ranking. Lovely. And remember, it is fine to go at your own speed.",
    rankPassedBy: "{rival} passed you in the weekly ranking. That is okay. A ranking is only a snapshot. One lesson at a time.",
    firstLesson: "Your first lesson is done: “{lesson}”. Well done. It is normal to feel a little unsure at the start, and you did it anyway.",
    comeback3: "Welcome back, {name}. No pressure at all. Pick up wherever feels comfortable.",
    comeback14: "Hello again, {name}. Life gets busy, and that is okay. One calm lesson is plenty to start.",
    quests: "Every daily quest is claimed. You did well today. Take a breath, then open your chest.",
  },
  [KOFI]: {
    chestDaily: "Daily chest, opened! Small reward, solid habit. That is how you build something.",
    chestWeekly: "Weekly chest is open. Every quest of the week bolted into place, brick by brick. Solid work.",
    rankPassed: "You passed {rival} in the weekly ranking! Nice push. Keep that engine running.",
    rankPassedBy: "{rival} passed you in the weekly ranking. Time to fire the engine back up. One lesson gets you moving.",
    firstLesson: "First lesson done: “{lesson}”! That is the foundation poured. Now we build on it.",
    comeback3: "{name}, welcome back! Hard hat is on. Let's get back to work, one lesson at a time.",
    comeback14: "Long time, {name}. No problem. Every project has a pause. Let's restart with one good lesson.",
    quests: "Every daily quest is claimed! That is a full day's work. Open the chest, you earned it.",
  },
  [TESS]: {
    chestDaily: "Ping. Daily chest opened. Small reward, tiny habit, big streak potential.",
    chestWeekly: "Weekly chest unlocked! Every quest of the week done. Gadget level: maxed out.",
    rankPassed: "Ooh, you passed {rival} in the weekly ranking. Zoom! Keep that speed.",
    rankPassedBy: "{rival} just passed you in the weekly ranking. Quick fix: one lesson. Go, go.",
    firstLesson: "First lesson done: “{lesson}”. Unlocked! Lots more shiny things ahead.",
    comeback3: "Welcome back, {name}. Quick one: pick up where you stopped. I kept your place.",
    comeback14: "Hey {name}, long time. Rebooting is easy: one lesson and you are right back in.",
    quests: "All daily quests, claimed. Done and done. Go tap that chest.",
  },
  [SAGE]: {
    chestDaily: "A daily chest, opened. A small reward. Worth asking what small, steady habits add up to over a month.",
    chestWeekly: "The weekly chest is open. A week of quests, finished. Effort and patience both counted here.",
    rankPassed: "You passed {rival} in the weekly ranking. A fair result. It is also worth asking what you learned on the way.",
    rankPassedBy: "{rival} passed you in the weekly ranking. On one hand, that stings a little. On the other, one lesson can change it.",
    firstLesson: "Your first lesson is done: “{lesson}”. A good beginning. What question did it leave you with?",
    comeback3: "Welcome back, {name}. Whenever you are ready, the lessons are where you left them.",
    comeback14: "Welcome back, {name}. A pause is not a failure. When you are ready, one lesson is enough to see where you stand.",
    quests: "Every daily quest is claimed. A full day. Weigh it fairly: you did a lot, and the chest is waiting.",
  },
};

/** What each shared post is: its id part, kind, trigger, condition and chip (the text comes from VOICES). */
const SHARED_SHAPES = [
  ["chestDaily", "chest-daily", "celebrate", "chest_opened", { period: "daily" }, "quests"],
  ["chestWeekly", "chest-weekly", "celebrate", "chest_opened", { period: "weekly" }, "quests"],
  ["rankPassed", "rank-passed", "celebrate", "rank_change", { direction: "passed" }, "ranks"],
  ["rankPassedBy", "rank-passed-by", "nudge", "rank_change", { direction: "passed_by" }, "ranks"],
  ["firstLesson", "first-lesson", "celebrate", "first_lesson", {}, "lesson"],
  ["comeback3", "comeback-3", "nudge", "comeback", { minDays: 3 }, null],
  ["comeback14", "comeback-14", "nudge", "comeback", { minDays: 14 }, null],
  ["quests", "quests", "celebrate", "daily_quests_done", {}, "quests"],
];

const SHARED = [
  // Streak posts are the learner's own voice (pool ["learner"]): "I kept a 7 day streak", with their avatar. Friends react.
  { id: "ft-streak-3", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 3 }, text: "{days} days in a row. A habit is starting, and I want to see it through.", chip: "quests", reactors: [TESS] },
  { id: "ft-streak-7", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 7 }, text: "A full week: {days} days in a row. I keep showing up for atoms.", chip: "quests", reactors: [RAY] },
  { id: "ft-streak-14", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 14 }, text: "{days} days in a row. Two weeks of learning something every single day.", chip: "quests", reactors: [MINA] },
  { id: "ft-streak-30", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 30 }, text: "{days} days. A whole month of showing up for atoms. I am proud of that.", chip: null, reactors: [SAGE] },
  { id: "ft-streak-60", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 60 }, text: "{days} days in a row. Two months of steady learning, one day at a time.", chip: "quests", reactors: [KOFI] },
  { id: "ft-streak-100", pool: [LEARNER], kind: "milestone", trigger: "streak", condition: { days: 100 }, text: "{days} days in a row. One hundred days! I did not think I would make it this far.", chip: null, reactors: [HAL] },
  // One template per character and moment, so the post sounds like the person who posts it
  ...Object.entries(VOICES).flatMap(([npc, say]) =>
    SHARED_SHAPES.map(([key, part, kind, trigger, condition, chip]) => ({ id: `ft-${short(npc)}-${part}`, npc, kind, trigger, condition, text: say[key], chip })),
  ),
];

/**
 * Mini blog pieces. `read_min` is computed from the words. Blocks: p h quote fact figure list next.
 * Every fact here is in the unit's lessons (docs/features/NPC_FEED_SPEC.md §4.3) or is repeated from them.
 */
const BLOGS = [
  {
    id: "blog-the-smallest-thing",
    unit: "inside-the-atom",
    author: HAL,
    lesson: "atoms-are-everywhere",
    position: 0,
    title: "The smallest thing you will ever meet",
    hook: "You have never seen one, yet you are made of them. Let us look at how small they really are.",
    cover: "atom",
    unlock: { trigger: "none" },
    reactors: [],
    blocks: [
      { t: "p", text: "Look at your hand. Now look at the air around it. Both are matter, and all matter is made of atoms." },
      { t: "p", text: "Yes, even the air, which gives every impression of being nothing. That is why a pumped-up ball is heavier than a flat one: the air inside it is matter too. I have weighed several balls to be certain. The neighbours have asked me to stop." },
      { t: "quote", text: "Small things are best looked at slowly. I still look at them every day." },
      { t: "h", text: "How small is small?" },
      { t: "p", text: "Take a skin cell. You need a microscope to see it. A virus is about 300 times smaller than that cell. And an atom is about 300 times smaller again." },
      { t: "figure", ref: "atom", caption: "An atom: far too small to see, even with an ordinary microscope." },
      { t: "list", items: ["Your hand: about 10 cm", "A skin cell: about 0.03 mm", "A virus: about 100 nm", "An atom: a few tenths of a nm"] },
      { t: "fact", text: "About 2,400 years ago the Greek thinker Democritus imagined cutting something in half again and again, until he reached a piece that could not be cut. He called it atomos. Seeing atoms took far longer." },
      { t: "p", text: "Light and heat are different. They are energy, not matter, so they are not made of atoms." },
      { t: "p", text: "So the next time you pick something up, remember that you are holding a huge crowd of atoms you can never see. Take a moment with that. I will wait." },
      { t: "next", label: "Zoom in on an atom yourself", lessonId: "atoms-are-everywhere" },
    ],
refs: ["ref-openstax-chem-ch1", "ref-openstax-chem-ch2"],
    comments: [
      { npc: RAY, text: "Plain words: matter is anything that has mass and takes up space. Light and heat do not, so they are not matter.", chip: { entryId: "atom" } },
      { npc: ADA, text: "ooh, tiny. and inside one, the nucleus can change all by itself. that's what my lessons are about~", chip: { lessonId: "why-nuclei-decay" } },
    ],
  },
  {
    id: "blog-three-kinds-of-carbon",
    unit: "inside-the-atom",
    author: HAL,
    lesson: "isotopes",
    position: 1,
    title: "Three kinds of carbon",
    hook: "Carbon-12, carbon-13 and carbon-14 are all carbon. One of them is not like the others. Let us see which.",
    cover: "diamond",
    unlock: { trigger: "unit_complete", unitId: "inside-the-atom" },
    reactors: [ADA],
    blocks: [
      { t: "p", text: "Here is a puzzle. Three atoms are all carbon, yet they are not the same. How can that be? Let us count." },
      { t: "p", text: "Count the protons. Every carbon atom has 6, and that number is what makes it carbon. Change it and you get a different element." },
      { t: "h", text: "The neutrons are the difference" },
      { t: "p", text: "The number after the name is the mass number: protons plus neutrons. Carbon has 6 protons, so carbon-14 has 14 - 6 = 8 neutrons. I checked the subtraction. Twice." },
      { t: "list", items: ["Carbon-12: 6 protons, 6 neutrons, stable", "Carbon-13: 6 protons, 7 neutrons, stable", "Carbon-14: 6 protons, 8 neutrons, unstable"] },
      { t: "p", text: "These versions of one element are called isotopes. Most of the atoms around you are stable isotopes." },
      { t: "quote", text: "Isotope does not mean radioactive. It only means a different number of neutrons." },
      { t: "fact", text: "Carbon-14 is the unstable one. An unstable nucleus can change, and when it does it gives off radiation. That is called radioactivity." },
      { t: "p", text: "Even so, nothing here is strange or new. Unstable atoms are in rocks, in the air and in food, and they were here long before us. The rocks have been very patient about it." },
      { t: "p", text: "Which brings a question. What exactly comes out when a nucleus changes? Ada knows. She tells it brightly. Please be prepared." },
      { t: "next", label: "Meet Ada and radioactivity", unitId: "radioactivity" },
    ],
refs: ["ref-openstax-chem-ch2", "ref-iaea-isotopes"],
    comments: [
      { npc: MINA, text: "Calm note: unstable does not mean dangerous. Your own body holds a little natural potassium-40, and that is normal.", chip: { lessonId: "stable-and-unstable-nuclei" } },
    ],
  },
  {
    id: "blog-nobody-knows-when",
    unit: "radioactivity",
    author: ADA,
    lesson: "why-nuclei-decay",
    position: 0,
    title: "nobody knows when",
    hook: "one unstable nucleus is a surprise. a whole crowd of them follows a pattern. isn't that neat?",
    cover: "radiation",
    unlock: { trigger: "lesson_complete", lessonId: "why-nuclei-decay" },
    reactors: [HAL],
    blocks: [
      { t: "p", text: "ok so take one unstable nucleus. leave it alone. it has a chance of changing, and nobody can say when. eep, so mysterious~" },
      { t: "p", text: "nobody pushes it. the nucleus that changes is the parent. the nucleus it becomes is the daughter. the change gives off radiation" },
      { t: "quote", text: "a half-life ticks for a crowd of atoms, never for one" },
      { t: "h", text: "think of a die" },
      { t: "p", text: "roll a die once and you can't say if it will show a six. roll it 600 times and you can say that about 100 of the rolls will. hehe" },
      { t: "p", text: "a nucleus is like that. one is a surprise. a big group follows a pattern, and in the half-life lesson you'll see the pattern for yourself. it's so pretty~" },
      { t: "figure", ref: "radiation", caption: "The radiation sign, used to mark a source of radiation." },
      { t: "fact", text: "Heating, cooling and chemistry hardly change how fast an unstable nucleus changes. In a flame or in ice, it is still unstable." },
      { t: "list", items: ["One nucleus: you can't say when", "A big group: it follows a pattern"] },
      { t: "p", text: "so when someone asks you when an atom will change, you can say: you can't know. a crowd of them, though, you can know. hehe, tiny mystery solved~" },
      { t: "next", label: "see what comes out of a decay", lessonId: "alpha-beta-gamma" },
    ],
refs: ["ref-iaea-decay", "ref-openstax-up3-ch10"],
    comments: [
      { npc: RAY, text: "Plain words: a group follows a pattern even though one nucleus does not. You will see exactly how in the half-life lesson.", chip: { lessonId: "half-life" } },
    ],
  },
  {
    id: "blog-the-banana-on-your-counter",
    unit: "radioactivity",
    author: ADA,
    lesson: "radioactivity-is-natural",
    position: 1,
    title: "the banana on your counter",
    hook: "a banana is a little bit radioactive. so are you. that's normal, and here's why",
    cover: "banana",
    unlock: { trigger: "unit_complete", unitId: "radioactivity" },
    reactors: [HAL, MINA],
    blocks: [
      { t: "p", text: "ok here's something nobody expects. the banana on your counter is a little bit radioactive. surprise~" },
      { t: "p", text: "it holds potassium, and a tiny share of that potassium is potassium-40, which is unstable. you carry some too, in your own body" },
      { t: "h", text: "it was here first" },
      { t: "p", text: "radioactivity wasn't invented. it was here long before people were. you can find it in four places" },
      { t: "list", items: ["Rocks and soil: uranium and thorium", "The air: radon, a radioactive gas from the ground", "Food and your body: potassium-40", "Space: cosmic radiation, all the time"] },
      { t: "figure", ref: "banana", caption: "A banana holds a little natural potassium-40." },
      { t: "quote", text: "radioactivity was always here. we only learned to see it" },
      { t: "fact", text: "In 1896 Henri Becquerel left a uranium mineral on a wrapped photographic plate. The plate fogged, even with no sunlight. Radioactivity was found in a natural mineral, long before anyone made nuclear technology." },
      { t: "h", text: "is it dangerous?" },
      { t: "p", text: "radioactive doesn't automatically mean dangerous. what matters is the type of radiation, how much there is, and how it reaches the body." },
      { t: "p", text: "a banana and your own body are radioactive, and that's normal. later you'll learn why being exposed to radiation isn't the same as becoming radioactive." },
      { t: "next", label: "find where radioactivity hides around you", lessonId: "radioactivity-is-natural" },
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
  for (const s of SHARED) push({ npc: null, ...s });
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
