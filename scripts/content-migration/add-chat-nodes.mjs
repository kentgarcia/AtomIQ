#!/usr/bin/env node
/**
 * NPC chat migration (docs/features/PHONE_SPEC.md §5.2, §7.1). Idempotent and additive:
 *
 *   1. Creates `chat_nodes` (the `phone` block of schema.sql) when it is missing.
 *   2. Seeds the chats below for Ada (Inside the Atom) and Hal (Radioactivity): the free chat (a greeting, a menu,
 *      "What's next?", "Quiz me", "Remind me what...", a sign-off) and the story threads a trigger unlocks (each starts with an
 *      unprompted node that has a title; replies can be text chips, stickers or reactions). A teacher whose unit is not in the
 *      database is skipped; each later unit's teacher gets a thread when their node rows are written.
 *   3. Rows that already exist are left alone, so later edits in Content Studio survive a re-run; pass `--overwrite`
 *      to reset the seeded rows to this file's text.
 *
 * The threads are checked with the same rules as validate:content before anything is written. Takes a backup
 * first. Does not publish or run sync-content; the release step does.
 *
 *   node --no-warnings scripts/content-migration/add-chat-nodes.mjs [--dry-run] [--overwrite] [--db path]
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

const ADA = [
  node("chat-ada-greeting", "npc-ada", "greeting", "greet", "Hi, it's Ada. Ask me about atoms any time. What would you like?", [
    reply("What's next?", "chat-ada-next"),
    reply("Quiz me", "chat-ada-quiz"),
    reply("Remind me of something", "chat-ada-remind"),
    reply("Bye for now", "chat-ada-bye"),
  ]),
  node("chat-ada-menu", "npc-ada", "reply", "idle", "What else can I help with?", [
    reply("What's next?", "chat-ada-next"),
    reply("Quiz me", "chat-ada-quiz"),
    reply("Remind me of something", "chat-ada-remind"),
    reply("Bye for now", "chat-ada-bye"),
  ]),
  node("chat-ada-next", "npc-ada", "reply", "point", "There is always a next lesson waiting on your map. Shall I take you there?", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("Maybe later", "chat-ada-menu"),
  ]),
  node("chat-ada-quiz", "npc-ada", "reply", "explain", "A quick round of Myth Buster on atoms will show what stuck. Ready?", [
    reply("Start the round", null, { screen: "mythbuster", id: "inside-the-atom" }),
    reply("Not now", "chat-ada-menu"),
  ]),
  node("chat-ada-remind", "npc-ada", "reply", "think", "Of course. Which one shall we look at again?", [
    reply("The nucleus", "chat-ada-nucleus"),
    reply("Isotopes", "chat-ada-isotope"),
    reply("Never mind", "chat-ada-menu"),
  ]),
  node("chat-ada-nucleus", "npc-ada", "reply", "explain", "The nucleus is the tiny core of an atom. It holds the protons and the neutrons, and nearly all of the atom's mass.", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "nucleus" }),
    reply("Back", "chat-ada-menu"),
  ]),
  node("chat-ada-isotope", "npc-ada", "reply", "explain", "Isotopes are atoms of one element with different numbers of neutrons. The protons stay the same, so the element does too.", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "isotope" }),
    reply("Back", "chat-ada-menu"),
  ]),
  node("chat-ada-bye", "npc-ada", "sign_off", "proud", "Any time. I'm here whenever you're curious.", []),
  // Unprompted
  node("chat-ada-up-unit", "npc-ada", "unprompted", "proud", "You did it. That was the last lesson of my unit.\n\nYou can say what is inside an atom now, and why the number of protons matters so much.\n\nHal is next, with atoms that change.", [
    reply("What's next?", "chat-ada-next"),
    reply("Thanks, Ada", "chat-ada-bye"),
  ], "unit_complete:inside-the-atom", "Inside the Atom: done!"),
  node("chat-ada-up-welcome-back", "npc-ada", "unprompted", "greet", "Hello again!\n\nThe atoms waited for you. They are patient like that.\n\nWant a quick round to warm up?", [
    reply("A quick round", null, { screen: "mythbuster", id: "inside-the-atom" }),
    reply("Maybe later", "chat-ada-bye"),
  ], "welcome_back", "Welcome back"),
];

// Story threads, unlocked by what the learner does (docs/features/PHONE_SPEC.md §5.2). A blank line in a text starts a new bubble, so a
// long message arrives as several short ones, one after another.
ADA.push(
  node("chat-ada-up-stadium", "npc-ada", "unprompted", "explain", "Hi! Ada here. I have to tell you something that still surprises me.\n\nPicture an atom blown up until it is as big as a football stadium.\n\nHow big would its nucleus be, right in the middle? About the size of a marble.", [
    react("wow", "chat-ada-stadium-wow"),
    react("think", "chat-ada-stadium-why"),
  ], "lessons_completed:3", "A marble in a stadium"),
  node("chat-ada-stadium-wow", "npc-ada", "reply", "proud", "Really. Almost all of the atom's mass is packed into that marble.\n\nThe electrons are far lighter, and they are out near the seats.\n\nSo what is in between?", [
    reply("Nothing at all?", "chat-ada-stadium-empty"),
    reply("Where are the electrons?", "chat-ada-stadium-why"),
  ]),
  node("chat-ada-stadium-why", "npc-ada", "reply", "explain", "Good thing to wonder about.\n\nThe nucleus is made of protons and neutrons, packed tightly together.\n\nThe electrons are tiny and fast, and they keep their distance from it.", [
    reply("So what is between?", "chat-ada-stadium-empty"),
    reply("Open the nucleus in AtomDex", null, { screen: "entry", id: "nucleus" }),
  ]),
  node("chat-ada-stadium-empty", "npc-ada", "reply", "proud", "Empty space. Mostly just empty space!\n\nThat is why an atom is so much bigger than its nucleus.\n\nThings still feel solid, because the electrons in them push back on the electrons in your hand.", [
    sticker("mind-blown", "chat-ada-stadium-end"),
    sticker("star"),
  ]),
  node("chat-ada-stadium-end", "npc-ada", "sign_off", "proud", "That was the marble in the stadium.\n\nCome back to it any time. I will tell it again.", []),
);

const HAL = [
  node("chat-hal-greeting", "npc-hal", "greeting", "greet", "Hello. I'm Hal. Ask me about atoms that change whenever you like. There is no hurry.", [
    reply("What's next?", "chat-hal-next"),
    reply("Quiz me", "chat-hal-quiz"),
    reply("Remind me of something", "chat-hal-remind"),
    reply("Goodbye", "chat-hal-bye"),
  ]),
  node("chat-hal-menu", "npc-hal", "reply", "idle", "What would you like to look at?", [
    reply("What's next?", "chat-hal-next"),
    reply("Quiz me", "chat-hal-quiz"),
    reply("Remind me of something", "chat-hal-remind"),
    reply("Goodbye", "chat-hal-bye"),
  ]),
  node("chat-hal-next", "npc-hal", "reply", "point", "When you are ready, the next lesson is on your map. I can take you there.", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("Not yet", "chat-hal-menu"),
  ]),
  node("chat-hal-quiz", "npc-hal", "reply", "explain", "A short round of Myth Buster on radioactivity will show what you remember. Shall we?", [
    reply("Start the round", null, { screen: "mythbuster", id: "radioactivity" }),
    reply("Not now", "chat-hal-menu"),
  ]),
  node("chat-hal-remind", "npc-hal", "reply", "think", "Certainly. Which one shall I remind you of?", [
    reply("Half-life", "chat-hal-half-life"),
    reply("Decay", "chat-hal-decay"),
    reply("Never mind", "chat-hal-menu"),
  ]),
  node("chat-hal-half-life", "npc-hal", "reply", "explain", "Half-life is the time it takes for half of the atoms in a sample to decay. Not one atom: a whole crowd of them.", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "half-life" }),
    reply("Back", "chat-hal-menu"),
  ]),
  node("chat-hal-decay", "npc-hal", "reply", "explain", "Decay is an unstable nucleus changing by itself into a steadier one, and giving off radiation as it does.", [
    reply("Open it in AtomDex", null, { screen: "entry", id: "decay" }),
    reply("Back", "chat-hal-menu"),
  ]),
  node("chat-hal-bye", "npc-hal", "sign_off", "proud", "Take care. I'll be here when you want to talk about decay.", []),
  // Unprompted
  node("chat-hal-up-unit", "npc-hal", "unprompted", "proud", "That was the end of my unit.\n\nRadioactivity is part of the natural world, and now you know how it behaves.\n\nGood work. Truly.", [
    reply("Remind me of something", "chat-hal-remind"),
    reply("Thanks, Hal", "chat-hal-bye"),
  ], "unit_complete:radioactivity", "Radioactivity: done!"),
  node("chat-hal-up-welcome-back", "npc-hal", "unprompted", "greet", "Welcome back.\n\nEverything waited exactly as you left it.\n\nShall we pick up where you stopped?", [
    reply("Take me there", null, { screen: "next-lesson" }),
    reply("Not today", "chat-hal-bye"),
  ], "welcome_back", "Welcome back"),
];

HAL.push(
  node("chat-hal-up-banana", "npc-hal", "unprompted", "think", "Hello, Hal here. A small thing, for fun.\n\nDid you know a banana is a little bit radioactive?\n\nIt is true, and it is nothing to worry about.", [
    react("wow", "chat-hal-banana-k"),
    react("think", "chat-hal-banana-safe"),
  ], "level_reached:4", "Is a banana radioactive?"),
  node("chat-hal-banana-k", "npc-hal", "reply", "explain", "A banana holds potassium, and a tiny part of all potassium is a radioactive isotope called potassium-40.\n\nIt is in bananas, in nuts, in the soil, and in you.", [
    reply("In me?", "chat-hal-banana-me"),
    reply("Is it safe?", "chat-hal-banana-safe"),
    reply("Open half-life in AtomDex", null, { screen: "entry", id: "half-life" }),
  ]),
  node("chat-hal-banana-safe", "npc-hal", "reply", "explain", "Completely safe. The amount is far too small to matter.\n\nYour own body holds the same kind of atom, and you are fine.\n\nEating bananas is good for you.", [
    reply("In me?", "chat-hal-banana-me"),
    reply("Thanks, Hal", "chat-hal-banana-end"),
  ]),
  node("chat-hal-banana-me", "npc-hal", "reply", "proud", "Yes. Every person carries some potassium-40, and a few of its atoms decay every second.\n\nIt decays very slowly. Its half-life is more than a billion years, which is why it is still around.", [
    sticker("mind-blown", "chat-hal-banana-end"),
    sticker("banana"),
  ]),
  node("chat-hal-banana-end", "npc-hal", "sign_off", "proud", "Good talking.\n\nNow you have something to say at the fruit stand. Come back and read this again whenever you like.", []),
);

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
  { npc: "npc-ada", unit: "inside-the-atom", nodes: ADA },
  { npc: "npc-hal", unit: "radioactivity", nodes: HAL },
  // the mascot has no unit and is not a row of npcs
  { npc: CHAT_MASCOT_ID, unit: null, nodes: SHRODI },
];

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
