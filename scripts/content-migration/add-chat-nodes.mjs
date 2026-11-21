#!/usr/bin/env node
/**
 * NPC chat migration (docs/features/PHONE_SPEC.md §5.2, §7.1). Idempotent and additive:
 *
 *   1. Creates `chat_nodes` (the `phone` block of schema.sql) when it is missing.
 *   2. Seeds the chats below for Hal (Inside the Atom) and Ada (Radioactivity): the free chat (a greeting, a menu,
 *      "What's next?", "Quiz me", "Remind me what...", a sign-off) and the story threads a trigger unlocks (each starts with an
 *      unprompted node that has a title; replies can be text chips, stickers or reactions). A teacher whose unit is not in the
 *      database is skipped; each later unit's teacher gets a thread when their node rows are written.
 *   3. Rows that already exist are left alone, so later edits in Content Studio survive a re-run; pass `--overwrite`
 *      to reset the seeded rows to this file's text.
 *
 * The threads are checked with the same rules as validate:content before anything is written. Takes a backup
 * first. Does not publish or run sync-content; the release step does.
 *
 *   node --no-warnings scripts/content-migration/add-chat-nodes.mjs [--dry-run] [--overwrite] [--npc npc-hal,npc-ada] [--db path]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";
import { validateChatData } from "../lib/chat-rules.mjs";
import { CHAT_MASCOT_ID } from "../lib/chat-vocab.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");
const npcArg = args.indexOf("--npc");
/** Only seed these teachers' threads (comma separated npc ids), so a re-seed with --overwrite leaves the others as they are. */
const onlyNpcs = npcArg >= 0 ? args[npcArg + 1].split(",") : null;
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

// ---------------------------------------------------------------------------
// The seed content. Plain text, in each teacher's voice, true to their unit.
// A reply with `next` goes to that node; with `action` it also (or instead) opens something; with neither it ends.
// ---------------------------------------------------------------------------

const reply = (label, next, action) => ({ label, ...(next ? { next } : {}), ...(action ? { action } : {}) });
/** A reaction on the teacher's last message (an id of CHAT_REACTIONS, drawn by components/phone/chat-art.ts); with no `next` the story ends. */
const react = (label, next) => ({ label, type: "react", ...(next ? { next } : {}) });
/** A sticker (an id of CHAT_STICKERS, drawn by components/phone/chat-art.ts) sent as a picture; with no `next` the story ends. */
const sticker = (label, next) => ({ label, type: "emoji", ...(next ? { next } : {}) });
const node = (id, npc, kind, pose, text, replies = [], trigger = null, title = null) => ({ id, npc, kind, pose, text, replies, trigger, title });

// Each teacher chats in their own tone (docs/features/NPC_VOICE_SPEC.md), and the tones are extreme on purpose. Lessons are not like this:
// they share one plain tone.
//
// HAL is slow, formal and exact, and deadpan: whole sentences, "Hm.", "Ah.", counts things and corrects himself, names his rocks (Reginald,
// Doris, a flat one called Tuesday), is never in a hurry, and never uses "!" or "~".
// ADA texts like a best friend: lowercase, a "~" now and then, for an expression (at most one a bubble, never two bubbles in a row), stretched words (heyyy, soooo), hehe, eep, interrupts
// herself, names her flask Sparkle and her beaker Gary, wears a crooked bow. Her bubbles are short.
//
// A learner's reply label is shown as the learner's own message, so every label is something a person would actually type, and the
// teacher's next bubble answers those very words. No thread follows another's shape: some begin mid-scene, some end on a joke, one ends
// on a callback to an earlier chat.
const HAL = [
  // ---- free chat -------------------------------------------------------------------------------------------------------------------
  node("chat-hal-greeting", "npc-hal", "greeting", "greet", "Ah. Hello.\n\nI was in the middle of weighing a rock, but it will keep. Rocks are good at that.\n\nWhat can I do for you?", [
    reply("what are you up to?", "chat-hal-upto"),
    reply("what should I do next?", "chat-hal-next"),
    reply("quiz me", "chat-hal-quiz"),
    reply("can you remind me of something?", "chat-hal-remind"),
    reply("what's in your satchel?", "chat-hal-satchel"),
    reply("ok bye", "chat-hal-bye"),
  ]),
  node("chat-hal-menu", "npc-hal", "reply", "idle", "Hm. Yes?\n\nTake your time. I am not going anywhere, and neither is the rock.", [
    reply("what are you up to?", "chat-hal-upto"),
    reply("what should I do next?", "chat-hal-next"),
    reply("quiz me", "chat-hal-quiz"),
    reply("can you remind me of something?", "chat-hal-remind"),
    reply("what's in your satchel?", "chat-hal-satchel"),
    reply("ok bye", "chat-hal-bye"),
  ]),
  node("chat-hal-next", "npc-hal", "reply", "point", "There is a next lesson waiting on your map.\n\nI would go now, while you are still warm. Warm is the right temperature for learning. I read that somewhere. Possibly I wrote it.", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("later, maybe", "chat-hal-menu"),
  ]),
  node("chat-hal-quiz", "npc-hal", "reply", "explain", "A round of Myth Buster. On atoms.\n\nI will not say it is easy. I will say it is fair.", [
    reply("Start the round", null, { screen: "mythbuster", id: "inside-the-atom" }),
    reply("not right now", "chat-hal-menu"),
  ]),
  node("chat-hal-remind", "npc-hal", "reply", "think", "Certainly. I keep my notes in order, as it happens.\n\nWhich page?", [
    reply("the nucleus", "chat-hal-nucleus"),
    reply("isotopes", "chat-hal-isotope"),
    reply("never mind", "chat-hal-menu"),
  ]),
  node("chat-hal-nucleus", "npc-hal", "reply", "explain", "The nucleus.\n\nThe tiny core of an atom. The protons and the neutrons live in it, and so does nearly all of the atom's mass.\n\nSmall. Dense. Rather like a good paperweight.", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "nucleus" }),
    reply("thanks, back", "chat-hal-menu"),
  ]),
  node("chat-hal-isotope", "npc-hal", "reply", "explain", "Isotopes.\n\nAtoms of one element with different numbers of neutrons. The protons stay the same, so the element stays the same.\n\nSame name, different weight. I have a cousin like that.", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "isotope" }),
    reply("thanks, back", "chat-hal-menu"),
  ]),
  node("chat-hal-upto", "npc-hal", "reply", "think", "At this moment?\n\nI am sorting samples by weight. Then I will sort them by colour. Then I will discover that the colour order disagrees with the weight order, and I will begin again.\n\nIt is going very well.", [
    reply("that sounds exhausting", "chat-hal-upto2"),
    reply("ok anyway", "chat-hal-menu"),
  ]),
  node("chat-hal-upto2", "npc-hal", "reply", "explain", "Exhausting is not the word I would choose. Satisfying, perhaps.\n\nSlowly, a rock becomes a rock you know. You should try it with anything. A button. A leaf.\n\nLook at one thing for ten whole minutes.", [
    reply("ten whole minutes??", "chat-hal-minutes"),
    reply("maybe later lol", "chat-hal-menu"),
  ]),
  node("chat-hal-minutes", "npc-hal", "reply", "proud", "Ten minutes.\n\nFor the first three, nothing happens. At minute four you notice a scratch. By minute seven the scratch has a story.\n\nI do not recommend doing it before a meeting.", [
    reply("ok that's actually kind of cool", "chat-hal-menu"),
    reply("you're a strange person, Hal", "chat-hal-strange"),
  ]),
  node("chat-hal-strange", "npc-hal", "reply", "greet", "Yes. Thank you.\n\nI have been told so by several people and one pigeon.", [
    react("haha", "chat-hal-menu"),
    react("love", "chat-hal-menu"),
  ]),
  node("chat-hal-satchel", "npc-hal", "reply", "greet", "The satchel.\n\nTwo pencils, one of them not sharp. A magnifying glass with a crack I prefer not to discuss. A sandwich, sometimes. And my samples, each wrapped, each named.\n\nThis morning I carried a rock called Reginald four miles. He is not heavy. I simply felt I should.", [
    reply("you NAMED your rocks??", "chat-hal-named"),
    reply("ok anyway", "chat-hal-menu"),
  ]),
  node("chat-hal-named", "npc-hal", "reply", "proud", "Of course. A sample with a name is a sample you do not lose.\n\nReginald. Doris. A flat one called Tuesday.\n\nI will not be taking questions about Tuesday.", [
    sticker("nerd", "chat-hal-menu"),
    sticker("star", "chat-hal-menu"),
  ]),
  node("chat-hal-bye", "npc-hal", "sign_off", "proud", "Of course. Goodbye, then.\n\nGo gently. Come back when you are curious. I will be here, probably holding a rock.", []),

  // ---- story 1: his first message, awkward and formal, and one thing about air --------------------------------------------------------
  node("chat-hal-up-hello", "npc-hal", "unprompted", "greet", "Hello. This is Hal.\n\nI am told this is how one begins a message to a person. Forgive me if I do it wrong. I type with two fingers, and slowly.\n\nI saw that you finished your first lesson. I wanted to say: well done. Truly. Most people never look closely at the air. You did.", [
    reply("thanks, Hal", "chat-hal-hello-thanks"),
    reply("you typed all that with two fingers??", "chat-hal-hello-fingers"),
    reply("who are you again?", "chat-hal-hello-who"),
  ], "lessons_completed:1", "A small hello"),
  node("chat-hal-hello-thanks", "npc-hal", "reply", "proud", "You are welcome.\n\nI think it was the right thing to say. I rehearsed it.\n\nTwice. In the garden.", [
    reply("aw, that's sweet", "chat-hal-hello-end"),
    reply("tell me something about atoms", "chat-hal-hello-ball"),
  ]),
  node("chat-hal-hello-fingers", "npc-hal", "reply", "think", "Eleven minutes. I counted.\n\nThe longest word was 'forgive'. It fought me.\n\nI could use the other eight fingers. I am afraid they would start having opinions.", [
    reply("hahaha ok Hal", "chat-hal-hello-end"),
    reply("ok so tell me something about atoms", "chat-hal-hello-ball"),
  ]),
  node("chat-hal-hello-who", "npc-hal", "reply", "explain", "Fair. Fair.\n\nI am Hal. I teach the atom: what is inside it, and why that matters. I keep rocks. I hold few opinions, but I have several about air.\n\nAir, for instance, is matter. It can be weighed. A pumped-up ball is heavier than a flat one. Try it.", [
    reply("no way, air weighs something?", "chat-hal-hello-ball"),
    reply("ok cool", "chat-hal-hello-end"),
  ]),
  node("chat-hal-hello-ball", "npc-hal", "reply", "proud", "Yes. Really.\n\nThe air inside is made of atoms, and atoms are matter, and matter has mass. It is not much. But it is not nothing.\n\nThat is your whole first lesson, in one ball. You had it already. You only needed a ball.", [
    react("wow", "chat-hal-hello-end"),
    react("clap", "chat-hal-hello-end"),
  ]),
  node("chat-hal-hello-end", "npc-hal", "sign_off", "greet", "That is all for today.\n\nI must go and put a rock back where it lives.\n\nSlowly, then. Until the next lesson.", []),

  // ---- story 2: he is sitting in an empty stadium with a marble ----------------------------------------------------------------------
  node("chat-hal-up-stadium", "npc-hal", "unprompted", "explain", "I am sitting in a football stadium.\n\nEmpty. Very quiet. Someone left a gate open and I took it as an invitation.\n\nI have brought a marble. I am placing it on the centre spot. There. Now I would like to tell you something.", [
    reply("...okay?", "chat-hal-stadium-go"),
    reply("Hal, why are you in a stadium", "chat-hal-stadium-why"),
  ], "lessons_completed:3", "A marble in a stadium"),
  node("chat-hal-stadium-why", "npc-hal", "reply", "think", "A fair question. It is for the lesson. Mostly.\n\nAlso the grass is very good.\n\nMay I continue?", [
    reply("yes please", "chat-hal-stadium-go"),
    reply("you're so weird lol", "chat-hal-stadium-go"),
  ]),
  node("chat-hal-stadium-go", "npc-hal", "reply", "explain", "Good.\n\nImagine this stadium is an atom. All of it. The stands, the grass, the sky above.\n\nThe marble I have just set down is the nucleus.\n\nThat is its whole size.", [
    reply("wait, THAT small?", "chat-hal-stadium-small"),
    reply("where are the electrons", "chat-hal-stadium-electrons"),
    reply("so what's in the rest of it", "chat-hal-stadium-empty"),
  ]),
  node("chat-hal-stadium-small", "npc-hal", "reply", "proud", "That small. I measured the marble twice. I did not measure the stadium. It was too much.\n\nAlmost all of the atom's mass is in that marble. The electrons are far lighter than it is.", [
    reply("so where are the electrons?", "chat-hal-stadium-electrons"),
    reply("so the rest is... nothing?", "chat-hal-stadium-empty"),
  ]),
  node("chat-hal-stadium-electrons", "npc-hal", "reply", "point", "Out near the seats. Far out.\n\nThey are tiny and fast, and they keep their distance from the middle. At this moment I can see none of them, which is accurate to the science and also a little lonely.", [
    reply("so what's between them and the marble?", "chat-hal-stadium-empty"),
    reply("that's a lot of space", "chat-hal-stadium-empty"),
  ]),
  node("chat-hal-stadium-empty", "npc-hal", "reply", "proud", "Empty space.\n\nMostly empty space. I have stood in the middle for some time and I can confirm it is a great deal of nothing.\n\nThings still feel solid, because the electrons in them push back on the electrons in your hand. A great deal of nothing, politely declining to be walked through.", [
    sticker("mind-blown", "chat-hal-stadium-end"),
    sticker("nerd", "chat-hal-stadium-end"),
  ]),
  node("chat-hal-stadium-end", "npc-hal", "sign_off", "greet", "Someone is crossing the grass. I believe it is a groundskeeper.\n\nI will go. Slowly, but I will go.\n\nI am leaving the marble where it is. Think of it as yours.", []),

  // ---- story 3: three pebbles called Twelve, Thirteen and Fourteen; ends on a joke, with a callback to Tuesday -------------------------
  node("chat-hal-up-pebbles", "npc-hal", "unprompted", "think", "I have a confession.\n\nThree pebbles in my satchel have been renamed. They are now called Twelve, Thirteen and Fourteen.\n\nI believe you finished the isotopes lesson recently. You will see why.", [
    reply("carbon-12, 13 and 14??", "chat-hal-pebbles-carbon"),
    reply("that's so nerdy", "chat-hal-pebbles-nerdy"),
  ], "lessons_completed:4", "Twelve, Thirteen, Fourteen"),
  node("chat-hal-pebbles-nerdy", "npc-hal", "reply", "proud", "Yes. It is the highest compliment I know.\n\nBut there is a point to it. Look at them. All three pebbles look the same to me. Same shape. Same colour. And one of them, I cannot say which, is slightly heavier.", [
    reply("so they're like isotopes", "chat-hal-pebbles-carbon"),
    reply("which one is the heavy one", "chat-hal-pebbles-heavy"),
  ]),
  node("chat-hal-pebbles-carbon", "npc-hal", "reply", "explain", "Exactly so. Carbon-12, carbon-13, carbon-14.\n\nAll three are carbon. Six protons each. The protons make it carbon, and the protons do not change.\n\nWhat changes is the neutrons. Six, seven, eight. That is the entire difference between my pebbles.", [
    reply("and 14 is the unstable one, right?", "chat-hal-pebbles-unstable"),
    reply("ok but which pebble is which lol", "chat-hal-pebbles-heavy"),
  ]),
  node("chat-hal-pebbles-heavy", "npc-hal", "reply", "sorry", "I do not know.\n\nI put them in a bag together on Monday and I have lost the labels.\n\nThis is why I do not recommend naming things Twelve, Thirteen and Fourteen. They do not answer to their names. Neither does Tuesday.", [
    reply("oh Hal", "chat-hal-pebbles-unstable"),
    reply("ok but what about the real atoms", "chat-hal-pebbles-unstable"),
  ]),
  node("chat-hal-pebbles-unstable", "npc-hal", "reply", "explain", "Ah. Fourteen. Yes.\n\nIt is the unstable one. An unstable nucleus can change, and when it does it gives off radiation.\n\nBut note this, because it matters: isotope does not mean radioactive. Carbon-12 and carbon-13 are perfectly stable. Only some isotopes change.", [
    react("think", "chat-hal-pebbles-end"),
    react("clap", "chat-hal-pebbles-end"),
  ]),
  node("chat-hal-pebbles-end", "npc-hal", "sign_off", "idle", "That is all I wished to say.\n\nI am going to sit with three pebbles and a very long afternoon. If I ever sort them correctly I shall let you know.\n\nIt may take a while.", []),

  // ---- story 4: the end of his unit, written on a rock, and a warning about Ada -------------------------------------------------------
  node("chat-hal-up-unit", "npc-hal", "unprompted", "proud", "You finished the unit.\n\nI was not sure how to say what I wanted to say, so I wrote it on a rock. Then I could not carry the rock. So here is the short version.\n\nYou can say what is inside an atom, and why the number of protons matters so much. That is a real thing to be able to say.", [
    reply("thank you, Hal. really", "chat-hal-unit-thanks"),
    reply("wait, you wrote it on a ROCK", "chat-hal-unit-rock"),
    reply("so what's next?", "chat-hal-unit-ada"),
  ], "unit_complete:inside-the-atom", "Inside the Atom: done"),
  node("chat-hal-unit-rock", "npc-hal", "reply", "greet", "A large one. I named it Gerald.\n\nIt said 'Well done' on one side and, on the other, 'Sorry about the rock.'", [
    reply("that's the best thing ever", "chat-hal-unit-thanks"),
    reply("ok but what's next", "chat-hal-unit-ada"),
  ]),
  node("chat-hal-unit-thanks", "npc-hal", "reply", "proud", "You are welcome. And thank you for being a patient learner. I am a patient teacher. It is a good match.\n\nNow. I should warn you about something.", [
    reply("uh oh", "chat-hal-unit-ada"),
    reply("what is it", "chat-hal-unit-ada"),
  ]),
  node("chat-hal-unit-ada", "npc-hal", "reply", "point", "The next unit is Ada's. Radioactivity. Atoms that change.\n\nShe is... a great deal. She says 'hehe' aloud. She has named her flask. She has never once whispered.\n\nShe is also the best at what she does, and she will be kind to you. Go and meet her.", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("ok I'm ready", "chat-hal-unit-end"),
    reply("she sounds amazing", "chat-hal-unit-end"),
  ]),
  node("chat-hal-unit-end", "npc-hal", "sign_off", "proud", "Good. Go on.\n\nI will be here. The rocks keep me company. I think it was a good unit. I would do it again, slowly.", []),

  // ---- story 5: coming back after a while ------------------------------------------------------------------------------------------
  node("chat-hal-up-welcome-back", "npc-hal", "unprompted", "greet", "You are back.\n\nI did not count the days. That is a lie. I counted. It was a number. I will not say the number, because it was large and you are here now.\n\nI used the time to sort my samples. It went poorly. I lost count twice.", [
    reply("aw, did you miss me?", "chat-hal-back-miss"),
    reply("lol I'm back now", "chat-hal-back-here"),
    reply("what happened with the rocks?", "chat-hal-back-rocks"),
  ], "welcome_back", "Welcome back"),
  node("chat-hal-back-miss", "npc-hal", "reply", "greet", "I missed the questions. Most people ask very few. You ask good ones.\n\nAlso the satchel feels lighter without somebody to tell things to. Which is odd. I did not take anything out of it.", [
    reply("that's so sweet", "chat-hal-back-ready"),
    reply("ok I'm ready to learn", "chat-hal-back-ready"),
  ]),
  node("chat-hal-back-here", "npc-hal", "reply", "proud", "You are. Good.\n\nEverything is where you left it. The atoms waited. They are patient. So am I.", [
    reply("ok let's go", "chat-hal-back-ready"),
    reply("I need a warm-up first", "chat-hal-back-ready"),
  ]),
  node("chat-hal-back-rocks", "npc-hal", "reply", "sorry", "Reginald fell. Doris rolled. Tuesday is, as ever, unaccounted for.\n\nI blame the floor. I suspect the floor is level in a way that offends me.", [
    reply("hahaha poor Tuesday", "chat-hal-back-ready"),
    reply("ok Hal", "chat-hal-back-ready"),
  ]),
  node("chat-hal-back-ready", "npc-hal", "reply", "point", "Shall we pick up where you stopped?", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("A quick round first", null, { screen: "mythbuster", id: "inside-the-atom" }),
    reply("not today, sorry", "chat-hal-bye"),
  ]),
];

const ADA = [
  // ---- free chat -------------------------------------------------------------------------------------------------------------------
  node("chat-ada-greeting", "npc-ada", "greeting", "cheer", "heyyy. it's ada\n\nsorry sorry, my flask just made The Noise. ok it stopped. i think~ hi hi\n\nwhat's up?", [
    reply("what are you doing?", "chat-ada-upto"),
    reply("what should i do next?", "chat-ada-next"),
    reply("quiz me", "chat-ada-quiz"),
    reply("can you remind me of something?", "chat-ada-remind"),
    reply("what's in your flask?", "chat-ada-flask"),
    reply("i have to go", "chat-ada-bye"),
  ]),
  node("chat-ada-menu", "npc-ada", "reply", "idle", "ooh ok. what else?\n\ni've got time. a little. i have a snack appointment at 3", [
    reply("what are you doing?", "chat-ada-upto"),
    reply("what should i do next?", "chat-ada-next"),
    reply("quiz me", "chat-ada-quiz"),
    reply("can you remind me of something?", "chat-ada-remind"),
    reply("what's in your flask?", "chat-ada-flask"),
    reply("i have to go", "chat-ada-bye"),
  ]),
  node("chat-ada-next", "npc-ada", "reply", "point", "your next lesson is waiting on the map\n\nwant me to take you there? i'll pretend i didn't see you procrastinate hehe~", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("maybe later", "chat-ada-menu"),
  ]),
  node("chat-ada-quiz", "npc-ada", "reply", "explain", "a lil round of myth buster?? on radioactivity??\n\nyes yes yes. i love these. no pressure. ok a little pressure. a cute amount~", [
    reply("Start the round", null, { screen: "mythbuster", id: "radioactivity" }),
    reply("not now", "chat-ada-menu"),
  ]),
  node("chat-ada-remind", "npc-ada", "reply", "think", "ofc~ which one?\n\ni'll try not to ramble. (i will ramble)", [
    reply("half-life", "chat-ada-half-life"),
    reply("decay", "chat-ada-decay"),
    reply("nvm", "chat-ada-menu"),
  ]),
  node("chat-ada-half-life", "npc-ada", "reply", "explain", "ok ok half-life\n\nit's how long it takes for half of the atoms in a sample to decay. half of the CROWD, not one atom. one atom is a mystery, a crowd is a pattern\n\nlike popcorn~ (don't quote me on popcorn)", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "half-life" }),
    reply("ok thanks", "chat-ada-menu"),
  ]),
  node("chat-ada-decay", "npc-ada", "reply", "explain", "decay. ok so\n\nan unstable nucleus changes all by itself into a steadier one, and gives off radiation while it does\n\nit's like a nucleus tidying its room. except the room is, uh, itself", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "decay" }),
    reply("ok thanks", "chat-ada-menu"),
  ]),
  node("chat-ada-upto", "npc-ada", "reply", "cheer", "ahh you asked\n\nso i'm trying to make a flask glow on purpose, instead of by accident\n\nso far: 0 glows. 3 small explosions. 1 very sad bow~", [
    reply("explosions?!", "chat-ada-boom"),
    reply("is your bow ok", "chat-ada-bow"),
    reply("ok lol anyway", "chat-ada-menu"),
  ]),
  node("chat-ada-boom", "npc-ada", "reply", "sorry", "tiny ones. like. poof. nobody's hurt (the bow's feelings are hurt)\n\ni always wear goggles, don't worry. safety first, glitter second~", [
    reply("the bow has feelings??", "chat-ada-bow"),
    reply("ok good, safety first", "chat-ada-menu"),
  ]),
  node("chat-ada-bow", "npc-ada", "reply", "sorry", "my left bow. it fell in the flask. eep. it's fine. it's pink and also slightly green now\n\ni'm calling it 'a look'~", [
    react("love", "chat-ada-menu"),
    react("haha", "chat-ada-menu"),
  ]),
  node("chat-ada-flask", "npc-ada", "reply", "greet", "ooh she's called Sparkle. she's glowy and a little moody~\n\ni'm not telling you what's inside. it's a secret. ok it's mostly water and hope", [
    reply("SPARKLE?? love her", "chat-ada-menu"),
    reply("is it safe tho", "chat-ada-safe"),
  ]),
  node("chat-ada-safe", "npc-ada", "reply", "proud", "yes yes. i promise. i have goggles and a very serious lab coat\n\nthe apron is tan. it looks like a sandwich. i love it", [
    reply("ok cute", "chat-ada-menu"),
    reply("i have to go", "chat-ada-bye"),
  ]),
  node("chat-ada-bye", "npc-ada", "sign_off", "greet", "aww ok bye bye\n\ncome back soon?? i'll be here. probably with something bubbling~", []),

  // ---- story 1: her first message, in a rush, with a trick question ----------------------------------------------------------------
  node("chat-ada-up-hello", "npc-ada", "unprompted", "cheer", "HELLO\n\n(sorry. i've been waiting to say that forever. i saw you finished a lesson in my unit and i dropped a flask)\n\ni'm ada. i teach the atoms that change. hehe. you'll see~", [
    reply("hi ada", "chat-ada-hello-q"),
    reply("you dropped a flask?", "chat-ada-hello-flask"),
    reply("Hal told me about you", "chat-ada-hello-hal"),
  ], "lessons_completed:6", "hi hi hi. it's ada"),
  node("chat-ada-hello-flask", "npc-ada", "reply", "sorry", "ok so. it was sparkle. my flask. she slipped. she's fine. she's glass but she's brave\n\nanyway. hi", [
    reply("aww poor sparkle", "chat-ada-hello-q"),
    reply("ok hi ada", "chat-ada-hello-q"),
  ]),
  node("chat-ada-hello-hal", "npc-ada", "reply", "cheer", "HAL TOLD YOU ABOUT ME??\n\nwhat did he say. no wait. don't tell me. he said i'm loud. he always says i'm loud\n\nhe's right. but he says it fondly. i think. it's hard to tell with hal", [
    reply("he said you're 'a great deal'", "chat-ada-hello-q"),
    reply("he said you're the best at it", "chat-ada-hello-q"),
  ]),
  node("chat-ada-hello-q", "npc-ada", "reply", "point", "ok anyway\n\nquestion. i have ONE unstable nucleus. just one. sitting there\n\ncan you tell me the exact second it will change?", [
    reply("no way to know", "chat-ada-hello-right"),
    reply("yes, with math", "chat-ada-hello-wrong"),
    reply("is this a trick question", "chat-ada-hello-trick"),
  ]),
  node("chat-ada-hello-right", "npc-ada", "reply", "cheer", "YES. you got it, nobody can say when\n\nthe nucleus is just sitting there. then one day, poof. it changes. nobody pushes it. nobody knows when", [
    reply("so nothing is predictable?", "chat-ada-hello-crowd"),
    reply("that's kinda spooky", "chat-ada-hello-spooky"),
  ]),
  node("chat-ada-hello-wrong", "npc-ada", "reply", "idle", "ooh so close, hehe. it's a super common guess\n\nbut nope. for one nucleus, nobody can say when. not with math, not with a bigger computer, not with my fanciest flask", [
    reply("huh. so what CAN we know?", "chat-ada-hello-crowd"),
    reply("that's kinda spooky", "chat-ada-hello-spooky"),
  ]),
  node("chat-ada-hello-trick", "npc-ada", "reply", "greet", "it's not a trick. it's a tiny trick. ok it's a trick\n\nthe answer is: you can't. nobody can say when one nucleus will change", [
    reply("ok so what CAN we know?", "chat-ada-hello-crowd"),
    reply("that's kinda spooky", "chat-ada-hello-spooky"),
  ]),
  node("chat-ada-hello-spooky", "npc-ada", "reply", "think", "a little. but i like it. it's like every atom has a secret clock and it won't tell anyone\n\n(not a REAL clock. don't put that in your notes. there's no timer inside)", [
    reply("ok but what about a crowd?", "chat-ada-hello-crowd"),
    reply("ok i get it, thanks ada", "chat-ada-hello-end"),
  ]),
  node("chat-ada-hello-crowd", "npc-ada", "reply", "cheer", "ooh. here's the magic part\n\none nucleus? mystery. a CROWD of them? pattern\n\nlike if i roll one die, no idea. but roll it 600 times and about 100 of them are sixes. same energy", [
    react("wow", "chat-ada-hello-end"),
    react("haha", "chat-ada-hello-end"),
  ]),
  node("chat-ada-hello-end", "npc-ada", "sign_off", "greet", "ok i have to go. sparkle's doing the noise again\n\nit was SO nice to meet you. come say hi any time. i'll be here. probably covered in glitter~", []),

  // ---- story 2: she is eating a banana ---------------------------------------------------------------------------------------------
  node("chat-ada-up-banana", "npc-ada", "unprompted", "think", "ok so i'm eating a banana right now\n\nand i just realised something that is going to ruin it for you in a good way\n\nit's radioactive. a little. the banana. the one in my hand. hehe~", [
    reply("WHAT", "chat-ada-banana-what"),
    reply("lol ada no", "chat-ada-banana-no"),
    reply("ok but is it safe to eat", "chat-ada-banana-safe"),
  ], "level_reached:4", "i'm eating a banana"),
  node("chat-ada-banana-what", "npc-ada", "reply", "cheer", "yes. well. a tiny bit. a very tiny bit\n\nbananas have potassium. and a teeny part of ALL potassium is a radioactive kind called potassium-40\n\nit's in bananas, in nuts, in the soil. and in you~", [
    reply("wait, in ME?", "chat-ada-banana-me"),
    reply("is it safe??", "chat-ada-banana-safe"),
  ]),
  node("chat-ada-banana-no", "npc-ada", "reply", "proud", "ada yes. it's real. i'd never lie about bananas\n\nit's the potassium. a tiny share of potassium is potassium-40, which is unstable. so. banana. slightly radioactive. hehe", [
    reply("ok but is it safe?", "chat-ada-banana-safe"),
    reply("wait, is that in ME?", "chat-ada-banana-me"),
  ]),
  node("chat-ada-banana-safe", "npc-ada", "reply", "proud", "completely safe. the amount is soooo small it doesn't matter\n\nyour own body has the same kind of atom and you're fine. i've been eating bananas this whole time and look at me. i'm fine (the glow is the flask)", [
    reply("in ME?", "chat-ada-banana-me"),
    reply("ok going to eat a banana now", "chat-ada-banana-end"),
  ]),
  node("chat-ada-banana-me", "npc-ada", "reply", "cheer", "yes. everybody has some. a few potassium-40 atoms in you decay every single second\n\nit's ok. it decays super slowly. its half-life is more than a billion years, which is why it's still around", [
    sticker("mind-blown", "chat-ada-banana-end"),
    sticker("banana"),
  ]),
  node("chat-ada-banana-end", "npc-ada", "sign_off", "greet", "ok ok back to my banana\n\nnow you have a fun fact for the fruit stand hehe. go tell someone. watch their face~", []),

  // ---- story 3: 100 gummy bears and a rule (half-life), it plays like a little game ------------------------------------------------
  node("chat-ada-up-gummy", "npc-ada", "unprompted", "cheer", "ok i need your help with something very serious\n\ni have 100 gummy bears. a whole bag. and i have a rule\n\nevery tick, i eat HALF of the ones that are left. only half. it's science~", [
    reply("ok i'm in", "chat-ada-gummy-q"),
    reply("can i have some?", "chat-ada-gummy-share"),
  ], "lessons_completed:8", "gummy bear half-life"),
  node("chat-ada-gummy-share", "npc-ada", "reply", "sorry", "no. they're for science. ... ok fine. one. i'm giving you one. imaginary. it's very good\n\nok now. serious. ready?", [
    reply("ready", "chat-ada-gummy-q"),
    reply("i can taste it", "chat-ada-gummy-q"),
  ]),
  node("chat-ada-gummy-q", "npc-ada", "reply", "point", "tick one. i eat half\n\nhow many bears are left?", [
    reply("50", "chat-ada-gummy-50"),
    reply("about 50", "chat-ada-gummy-about"),
    reply("none, you ate them all lol", "chat-ada-gummy-lol"),
  ]),
  node("chat-ada-gummy-lol", "npc-ada", "reply", "sorry", "nooo i can't eat them ALL. that's the whole point\n\nevery tick i only eat half. there's always some left. ok try again. how many after one tick?", [
    reply("50", "chat-ada-gummy-50"),
    reply("about 50", "chat-ada-gummy-about"),
  ]),
  node("chat-ada-gummy-50", "npc-ada", "reply", "proud", "50. yes. and with bears it's exactly 50\n\nwith real atoms it'd be about 50. a crowd follows a pattern but nobody gets exactly half. write that down~", [
    reply("ok tick two", "chat-ada-gummy-t2"),
    reply("'about' is a great word", "chat-ada-gummy-t2"),
  ]),
  node("chat-ada-gummy-about", "npc-ada", "reply", "cheer", "ooh you said ABOUT. i could cry\n\nwith bears it's exactly 50. with real atoms it's only about 50. that little word is the whole trick", [
    reply("ok tick two", "chat-ada-gummy-t2"),
    reply("i'm a genius", "chat-ada-gummy-t2"),
  ]),
  node("chat-ada-gummy-t2", "npc-ada", "reply", "point", "tick two. half of the 50 that are left\n\nhow many bears now?", [
    reply("25", "chat-ada-gummy-25"),
    reply("idk, 20?", "chat-ada-gummy-hint"),
  ]),
  node("chat-ada-gummy-hint", "npc-ada", "reply", "think", "so close. half of 50. 50, split in two", [
    reply("25", "chat-ada-gummy-25"),
    reply("ohh 25", "chat-ada-gummy-25"),
  ]),
  node("chat-ada-gummy-25", "npc-ada", "reply", "cheer", "25. yes. 100, then 50, then 25. every tick, half of what's left\n\nthat's a half-life. the time it takes for half to go. and then half of THAT. and then half of that again", [
    react("wow", "chat-ada-gummy-end"),
    react("clap", "chat-ada-gummy-end"),
  ]),
  node("chat-ada-gummy-end", "npc-ada", "sign_off", "greet", "ok i have 25 gummy bears left and a stomachache\n\nthank you for helping with the science. i owe you one. (an imaginary bear)", []),

  // ---- story 4: the end of her unit ------------------------------------------------------------------------------------------------
  node("chat-ada-up-unit", "npc-ada", "unprompted", "cheer", "YOU. DID. IT\n\ni'm not crying. i'm a little crying. it's the flask fumes\n\nyou finished my whole unit. you know why nuclei change, what comes out, and how a crowd follows a pattern. i'm so proud i could pop~", [
    reply("thank you ada", "chat-ada-unit-thanks"),
    reply("you're crying??", "chat-ada-unit-cry"),
    reply("what was your favourite part?", "chat-ada-unit-fav"),
  ], "unit_complete:radioactivity", "Radioactivity: done"),
  node("chat-ada-unit-cry", "npc-ada", "reply", "sorry", "NO. ok yes. a little\n\ni just really love when someone gets it. you just. get it. it's my favourite feeling in the whole world", [
    reply("aww, come here", "chat-ada-unit-thanks"),
    reply("ok but what's your favourite part?", "chat-ada-unit-fav"),
  ]),
  node("chat-ada-unit-fav", "npc-ada", "reply", "cheer", "ooh ooh ooh. favourite favourite\n\nit's the banana. every time. nobody expects it. you tell someone a banana is radioactive and their face goes, like, ?????\n\nand it's completely normal. radioactivity was here long before people. i love that. a little bit of old magic~", [
    reply("i love the banana too", "chat-ada-unit-thanks"),
    reply("old magic, ok poet", "chat-ada-unit-end"),
  ]),
  node("chat-ada-unit-thanks", "npc-ada", "reply", "proud", "you're SO welcome\n\nand thank YOU for being so curious. you asked the best questions. i kept a list. it's on my fridge. it's very long\n\nhal's going to be so smug that he taught you first, hehe", [
    sticker("party", "chat-ada-unit-end"),
    sticker("star", "chat-ada-unit-end"),
  ]),
  node("chat-ada-unit-end", "npc-ada", "sign_off", "greet", "ok i have to go lie on the lab floor and feel things\n\ncome back any time. i mean it. even just to say hi\n\nbye bye, scientist~", []),

  // ---- story 5: coming back after a while ------------------------------------------------------------------------------------------
  node("chat-ada-up-welcome-back", "npc-ada", "unprompted", "cheer", "YOU'RE BACK\n\nit's been so quiet. sparkle was sad. i talked to a beaker. it wasn't the same\n\nhi hi hi hi~", [
    reply("aw, did you miss me?", "chat-ada-back-miss"),
    reply("lol hi ada", "chat-ada-back-hi"),
    reply("sorry i was away", "chat-ada-back-sorry"),
  ], "welcome_back", "welcome back"),
  node("chat-ada-back-miss", "npc-ada", "reply", "sorry", "sooo much. the beaker is a bad listener\n\nit just sits there. it does not say 'oh no' or 'wait really'. you say 'oh no' so nicely", [
    reply("aw ada", "chat-ada-back-ready"),
    reply("the beaker has a name?", "chat-ada-back-beaker"),
  ]),
  node("chat-ada-back-beaker", "npc-ada", "reply", "greet", "his name is Gary. he's very tall and he doesn't say much. i love him. don't tell sparkle~", [
    reply("hahaha ok", "chat-ada-back-ready"),
    reply("hi Gary", "chat-ada-back-ready"),
  ]),
  node("chat-ada-back-hi", "npc-ada", "reply", "cheer", "hiii. you're here you're here\n\neverything's right where you left it. the atoms waited. i told them to. they were very good", [
    reply("ok, let's go", "chat-ada-back-ready"),
    reply("need a warm-up first", "chat-ada-back-ready"),
  ]),
  node("chat-ada-back-sorry", "npc-ada", "reply", "proud", "no no no don't be sorry. life happens\n\nyou're here now, that's the only thing that counts. and i saved your seat~ (it's a stool. it's wobbly. but it's yours)", [
    reply("thanks ada", "chat-ada-back-ready"),
    reply("ok let's go", "chat-ada-back-ready"),
  ]),
  node("chat-ada-back-ready", "npc-ada", "reply", "point", "so~ wanna pick up where you stopped?", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("A quick round first", null, { screen: "mythbuster", id: "radioactivity" }),
    reply("not today", "chat-ada-bye"),
  ]),
];

// Shrodi, the mascot: he chats like a teacher (npc id "shrodi", not a row of `npcs`), is always in Contacts and has no unit. His menu
// points at the things the old Guide did: the next lesson, an explanation, a quick round, the phone. The links open a page and send
// nothing; "Back" and "Maybe later" are the real replies.
const SHRODI = [
  node("chat-shrodi-greeting", CHAT_MASCOT_ID, "greeting", "greet", "Hi, I'm Shrodi, your guide in AtomIQ!\n\nAsk me what to learn next, how something works, or for a quick quiz.", [
    reply("What should I do next?", "chat-shrodi-next"),
    reply("Explain something", "chat-shrodi-explain"),
    reply("Quiz me", "chat-shrodi-quiz"),
    reply("Show me around", "chat-shrodi-around"),
    reply("Bye for now", "chat-shrodi-bye"),
  ]),
  node("chat-shrodi-menu", CHAT_MASCOT_ID, "reply", "idle", "What else can I help with?", [
    reply("What should I do next?", "chat-shrodi-next"),
    reply("Explain something", "chat-shrodi-explain"),
    reply("Quiz me", "chat-shrodi-quiz"),
    reply("Show me around", "chat-shrodi-around"),
    reply("Bye for now", "chat-shrodi-bye"),
  ]),
  node("chat-shrodi-next", CHAT_MASCOT_ID, "reply", "point", "Your next lesson is waiting on the map.\n\nShall I take you there?", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("Maybe later", "chat-shrodi-menu"),
  ]),
  node("chat-shrodi-explain", CHAT_MASCOT_ID, "reply", "explain", "Sure! Pick something and I'll show you where to read about it.", [
    reply("The atom", "chat-shrodi-atom"),
    reply("Isotopes", "chat-shrodi-isotope"),
    reply("Radioactive decay", "chat-shrodi-decay"),
    reply("Half-life", "chat-shrodi-half-life"),
    reply("Something else", "chat-shrodi-menu"),
  ]),
  node("chat-shrodi-atom", CHAT_MASCOT_ID, "reply", "explain", "Everything is made of atoms.\n\nAt the middle of each is a tiny nucleus of protons and neutrons, with electrons far outside it.", [
    reply("Open the nucleus in AtomDex", null, { screen: "entry", id: "nucleus" }),
    reply("Back", "chat-shrodi-explain"),
  ]),
  node("chat-shrodi-isotope", CHAT_MASCOT_ID, "reply", "explain", "Isotopes are atoms of one element with different numbers of neutrons.\n\nSame protons, so the same element. A different mass.", [
    reply("Open isotopes in AtomDex", null, { screen: "entry", id: "isotope" }),
    reply("Back", "chat-shrodi-explain"),
  ]),
  node("chat-shrodi-decay", CHAT_MASCOT_ID, "reply", "explain", "Some nuclei are unstable, so they change on their own and give off radiation.\n\nThat change is called decay.", [
    reply("Open decay in AtomDex", null, { screen: "entry", id: "decay" }),
    reply("Back", "chat-shrodi-explain"),
  ]),
  node("chat-shrodi-half-life", CHAT_MASCOT_ID, "reply", "explain", "A half-life is how long it takes for half of a radioactive sample to decay.\n\nIt can be a fraction of a second or billions of years.", [
    reply("Open half-life in AtomDex", null, { screen: "entry", id: "half-life" }),
    reply("Back", "chat-shrodi-explain"),
  ]),
  node("chat-shrodi-quiz", CHAT_MASCOT_ID, "reply", "cheer", "Ready for a quick round? Myth Buster is a fast one.", [
    reply("Start the round", null, { screen: "mythbuster" }),
    reply("Not now", "chat-shrodi-menu"),
  ]),
  node("chat-shrodi-around", CHAT_MASCOT_ID, "reply", "point", "This is your phone.\n\nChats is where your teachers write to you, AtomDex is the encyclopedia, and new apps arrive as you learn.", [
    reply("Open AtomDex", null, { screen: "app", id: "atomdex" }),
    reply("Open Field Notes", null, { screen: "app", id: "field-notes" }),
    reply("Back", "chat-shrodi-menu"),
  ]),
  node("chat-shrodi-bye", CHAT_MASCOT_ID, "sign_off", "proud", "Any time. I'm right here in your phone.", []),
  // Unprompted
  node("chat-shrodi-up-first", CHAT_MASCOT_ID, "unprompted", "cheer", "You finished your first lesson!\n\nThat is how every scientist starts: one question at a time.\n\nThe map has more waiting for you.", [
    reply("What should I do next?", "chat-shrodi-next"),
    reply("Thanks, Shrodi", "chat-shrodi-bye"),
  ], "lessons_completed:1", "Your first lesson!"),
];

// The teacher's unit decides whether they get a thread yet: a thread is only seeded once the unit exists.
const THREADS = [
  { npc: "npc-hal", unit: "inside-the-atom", nodes: HAL },
  { npc: "npc-ada", unit: "radioactivity", nodes: ADA },
  // the mascot has no unit and is not a row of npcs
  { npc: CHAT_MASCOT_ID, unit: null, nodes: SHRODI },
];

if (onlyNpcs) THREADS.splice(0, THREADS.length, ...THREADS.filter((t) => onlyNpcs.includes(t.npc)));

// ---------------------------------------------------------------------------

const sql = fs.readFileSync(path.join(ROOT, "scripts/content-migration/schema.sql"), "utf8");
const a = sql.indexOf("-- BEGIN phone");
const b = sql.indexOf("-- END phone");
if (a < 0 || b < 0) throw new Error("schema.sql is missing the phone markers");
const ddl = sql.slice(a, b);

if (!dryRun) backupBeforeScript("add-chat-nodes", dbPath);
const db = new DatabaseSync(dryRun ? ":memory:" : dbPath);
db.exec("PRAGMA foreign_keys = ON");
if (dryRun) {
  db.exec("CREATE TABLE npcs (id TEXT PRIMARY KEY)");
  for (const t of THREADS) if (t.npc !== CHAT_MASCOT_ID) db.prepare("INSERT INTO npcs (id) VALUES (?)").run(t.npc);
}
db.exec(ddl);
// A table made before Shrodi chatted has a foreign key to npcs: SQLite cannot drop it in place, so rebuild the table with its rows
const chatSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='chat_nodes'").get()?.sql ?? "";
if (/REFERENCES\s+npcs/i.test(chatSql)) {
  const cols = db.prepare("PRAGMA table_info(chat_nodes)").all().map((c) => c.name);
  const list = cols.map((c) => `"${c}"`).join(", ");
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec("ALTER TABLE chat_nodes RENAME TO chat_nodes_old");
  db.exec("DROP INDEX IF EXISTS idx_chat_nodes_npc");
  db.exec(ddl);
  if (!db.prepare("PRAGMA table_info(chat_nodes)").all().some((c) => c.name === "title")) db.exec("ALTER TABLE chat_nodes ADD COLUMN title TEXT");
  db.exec(`INSERT INTO chat_nodes (${list}) SELECT ${list} FROM chat_nodes_old`);
  db.exec("DROP TABLE chat_nodes_old");
  db.exec("PRAGMA foreign_keys = ON");
  console.log("chat_nodes: rebuilt without the foreign key to npcs (the mascot's nodes are not in npcs).");
}
// A database made before stories has no title column
if (!db.prepare("PRAGMA table_info(chat_nodes)").all().some((c) => c.name === "title")) db.exec("ALTER TABLE chat_nodes ADD COLUMN title TEXT");

const has = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
const ids = (table) => (has(table) ? db.prepare(`SELECT id FROM ${table}`).all().map((r) => r.id) : []);
const unitIds = new Set(ids("units"));
const npcIds = new Set(ids("npcs"));

for (const t of THREADS) for (const n of t.nodes) if (n.kind === "greeting" && !n.title) n.title = "Chat";

const rows = [];
let skipped = 0;
for (const thread of THREADS) {
  if ((thread.npc !== CHAT_MASCOT_ID && !npcIds.has(thread.npc)) || (!dryRun && thread.unit !== null && !unitIds.has(thread.unit))) {
    skipped += thread.nodes.length;
    continue;
  }
  thread.nodes.forEach((n, position) => rows.push({ ...n, position }));
}

// Check the whole seed with the validator's rules, against what the database holds
const findings = validateChatData({
  npcs: [...npcIds].map((id) => ({ id })),
  units: dryRun ? THREADS.filter((t) => t.unit).map((t) => ({ id: t.unit })) : [...unitIds].map((id) => ({ id })),
  lessons: ids("lessons").map((id) => ({ id })),
  nodes: ids("path_nodes").map((id) => ({ id })),
  entryIds: dryRun ? ["nucleus", "isotope", "half-life", "decay"] : ids("encyclopedia_entries"),
  chatNodes: rows.map((r) => ({ id: r.id, npc_id: r.npc, kind: r.kind, trigger: r.trigger, title: r.title, text: r.text, pose: r.pose, replies: r.replies, position: r.position })),
}).findings.filter((f) => f.severity === "error" || f.severity === "warning");
if (findings.length) {
  for (const f of findings) console.error(`${f.severity}: ${f.id} (${f.rule}) ${f.message}`);
  if (findings.some((f) => f.severity === "error")) {
    console.error("The seed has errors; nothing was written.");
    process.exit(1);
  }
}

const verb = overwrite ? "INSERT OR REPLACE" : "INSERT OR IGNORE";
const ins = db.prepare(`${verb} INTO chat_nodes (id, npc_id, kind, "trigger", title, text, pose, replies, position) VALUES (?,?,?,?,?,?,?,?,?)`);
let added = 0;
for (const r of rows) added += Number(ins.run(r.id, r.npc, r.kind, r.trigger, r.title, r.text, r.pose, JSON.stringify(r.replies), r.position).changes);

console.log(`${dryRun ? "(dry run) " : ""}chat_nodes: ${added} written, ${rows.length - added} already there, ${skipped} skipped (unit not in the database).`);
db.close();
