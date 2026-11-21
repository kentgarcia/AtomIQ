#!/usr/bin/env node
/**
 * Shrodi's first story becomes the tour of the app (docs/features/TUTORIAL_SPEC.md §15). Idempotent.
 *
 * The thread "Your first lesson!" (`chat-shrodi-up-first`, trigger `lessons_completed:1`) is the message Shrodi's tour sends the
 * learner to open once the first lesson is done. Until now it only said well done; it now offers a short walk round the app
 * (the map, Quests, Games, Profile and the Shop, the phone) in a few short bubbles, one node per stop, each with "Next" and a way out.
 *
 *   - `chat-shrodi-up-first` keeps its id (a shipped id is never renamed) and gets the new text and replies, but only while its
 *     text is still the one this script replaced: a line edited in Content Studio since is left alone (pass `--overwrite` to replace it).
 *   - the new nodes `chat-shrodi-tour-*` are added; ones already there are left alone unless `--overwrite`.
 *
 * Checked with the same rules as validate:content before anything is written; takes a backup first. Does not publish.
 *
 *   node --no-warnings scripts/content-migration/legacy/update-shrodi-tour-chat.mjs [--dry-run] [--overwrite] [--db path]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";
import { validateChat } from "../../lib/chat-rules.mjs";
import { CHAT_MASCOT_ID } from "../../lib/chat-vocab.mjs";

/**
 * RETIRED (content source files, phase 2). Chat is now written in the .atomiq files under content/source/chat and built with
 * `npm run content:sync`; this script would overwrite those words in the database and is kept only as history.
 * Do not run it. Edit the files (docs/features/CONTENT_SOURCE_SPEC.md, docs/features/NPC_VOICE_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("update-shrodi-tour-chat.mjs is retired: chat lives in content/source/chat and is built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

const reply = (label, next, action) => ({ label, ...(next ? { next } : {}), ...(action ? { action } : {}) });
const node = (id, kind, pose, text, replies = []) => ({ id, kind, pose, text, replies });

const FIRST_ID = "chat-shrodi-up-first";
/** What the node said before this script, so a line edited in Studio since is not lost. */
const OLD_FIRST_TEXT = "You finished your first lesson!\n\nThat is how every scientist starts: one question at a time.\n\nThe map has more waiting for you.";

const FIRST = node(
  FIRST_ID,
  "unprompted",
  "cheer",
  "You finished your first lesson!\n\nThat is how every scientist starts: one question at a time.\n\nWant a quick tour of AtomIQ? It takes about a minute.",
  [reply("Show me around", "chat-shrodi-tour-map"), reply("What should I do next?", "chat-shrodi-next"), reply("Thanks, Shrodi", "chat-shrodi-bye")],
);

const SKIP = "Skip the rest";
const TOUR = [
  node("chat-shrodi-tour-map", "reply", "point", "Home is your map. Each circle is a lesson.\n\n[[pic:tour-map]]\n\nFinish one and the next circle opens. After a few lessons a new unit begins, with a new teacher.", [
    reply("Next", "chat-shrodi-tour-quests"),
    reply(SKIP, "chat-shrodi-tour-end"),
  ]),
  node("chat-shrodi-tour-quests", "reply", "point", "Quests are small goals for the day and the week.\n\n[[pic:tour-quests]]\n\nFinish them to claim XP, then open the chest for diamonds.", [
    reply("Next", "chat-shrodi-tour-games"),
    reply(SKIP, "chat-shrodi-tour-end"),
  ]),
  node("chat-shrodi-tour-games", "reply", "cheer", "Games is where you practise. In Atom Maze you run and jump, and answer questions to beat enemies.\n\n[[pic:tour-games]]\n\nMyth Buster is a quick round of fact or myth.", [
    reply("Next", "chat-shrodi-tour-profile"),
    reply(SKIP, "chat-shrodi-tour-end"),
  ]),
  node("chat-shrodi-tour-profile", "reply", "explain", "Profile is your explorer passport: your level, your badges and your streak.\n\n[[pic:tour-profile]]\n\nAfter your second lesson the Shop opens: spend diamonds on hair, outfits and more.", [
    reply("Next", "chat-shrodi-tour-phone"),
    reply(SKIP, "chat-shrodi-tour-end"),
  ]),
  node("chat-shrodi-tour-phone", "reply", "point", "And this is your phone. Teachers write to you in Chats, AtomDex is the encyclopedia, and new apps arrive as you learn.\n\n[[pic:tour-phone]]\n\nThere is a lot to find. Take your time.", [
    reply("Open AtomDex", null, { screen: "app", id: "atomdex" }),
    reply("Got it", "chat-shrodi-tour-end"),
    reply("Tell me again", "chat-shrodi-tour-map"),
  ]),
  node("chat-shrodi-tour-end", "sign_off", "proud", "That is the tour. Now it is your turn to explore.\n\nI am right here in your phone if you need me.", []),
];

// A dry run does everything on a copy and rolls back, so the validator still has its say
let workPath = dbPath;
if (dryRun) {
  workPath = path.join(os.tmpdir(), `update-shrodi-tour-chat-${process.pid}.db`);
  fs.copyFileSync(dbPath, workPath);
} else {
  backupBeforeScript("update-shrodi-tour-chat", dbPath);
}
const target = new DatabaseSync(workPath);

const row = target.prepare("SELECT id, text, title, trigger FROM chat_nodes WHERE id = ?").get(FIRST_ID);
if (!row) {
  console.error(`${FIRST_ID} is not in the database: run add-chat-nodes.mjs first.`);
  process.exit(1);
}
const maxPos = target.prepare("SELECT COALESCE(MAX(position), -1) AS m FROM chat_nodes WHERE npc_id = ?").get(CHAT_MASCOT_ID).m;

const upd = target.prepare("UPDATE chat_nodes SET text = ?, pose = ?, replies = ?, updated_at = unixepoch() WHERE id = ?");
const ins = target.prepare(`${overwrite ? "INSERT OR REPLACE" : "INSERT OR IGNORE"} INTO chat_nodes (id, npc_id, kind, "trigger", title, text, pose, replies, position) VALUES (?,?,?,?,?,?,?,?,?)`);

const changes = [];
const firstEditedSince = row.text !== OLD_FIRST_TEXT && row.text !== FIRST.text;
if (firstEditedSince && !overwrite) console.warn(`${FIRST_ID}: its text was edited since the seed, so it is left alone (use --overwrite to replace it).`);
else if (row.text !== FIRST.text) changes.push(["update", FIRST_ID]);

let next = maxPos + 1;
for (const n of TOUR) {
  const there = target.prepare("SELECT 1 FROM chat_nodes WHERE id = ?").get(n.id);
  if (there && !overwrite) continue;
  changes.push(["add", n.id]);
}

if (changes.length === 0) {
  console.log("chat_nodes: already up to date.");
  target.close();
  if (dryRun) fs.rmSync(workPath, { force: true });
  process.exit(0);
}

target.exec("BEGIN");
try {
  for (const [kind, id] of changes) {
    if (kind === "update") upd.run(FIRST.text, FIRST.pose, JSON.stringify(FIRST.replies), FIRST_ID);
    else {
      const n = TOUR.find((x) => x.id === id);
      const existing = target.prepare("SELECT position FROM chat_nodes WHERE id = ?").get(id);
      ins.run(n.id, CHAT_MASCOT_ID, n.kind, null, null, n.text, n.pose, JSON.stringify(n.replies), existing ? existing.position : next++);
    }
  }
  // The same rules as validate:content, over the whole table, before the change is kept
  const findings = validateChat(target).findings.filter((f) => f.severity === "error" || f.severity === "warning");
  if (findings.length) {
    for (const f of findings) console.error(`${f.severity}: ${f.id} (${f.rule}) ${f.message}`);
    if (findings.some((f) => f.severity === "error")) throw new Error("the chat nodes have errors");
  }
  target.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (error) {
  target.exec("ROLLBACK");
  console.error(`Nothing was written: ${error.message}`);
  process.exit(1);
}
console.log(`${dryRun ? "(dry run, nothing kept) " : ""}chat_nodes: ${changes.length} written (${changes.map(([k, id]) => `${k} ${id}`).join(", ")}).`);
target.close();
if (dryRun) fs.rmSync(workPath, { force: true });
