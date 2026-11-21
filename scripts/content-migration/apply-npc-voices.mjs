#!/usr/bin/env node
/**
 * Gives the characters their own voices in chat, feed and blog (docs/features/NPC_VOICE_SPEC.md). Lessons keep one shared tone.
 * Repeatable. The words live in the authoring scripts, this only applies them:
 *
 *   1. Feed: the shared posts that any of several teachers could post (one text for all) are removed and replaced by one template per
 *      character and moment (`ft-<npc>-chest-daily`, `ft-ray-rank-passed`...); every seeded feed template and blog piece (and its comments)
 *      is reset to the text in feed-content.mjs, so Hal's and Ada's unit posts and blog pieces now sound like them.
 *   2. Chat: Hal's and Ada's chats are removed and written again from add-chat-nodes.mjs (only theirs: Shrodi's tour chat is left alone).
 *   3. Lesson lines (`npc_lines`: meet, sign_off, tease, shown with lessons) are set to the one plain tone every teacher shares.
 *
 * It overwrites those seeded rows, so an edit made in Content Studio to one of them is replaced. Takes a backup first. Does not publish.
 *
 *   node --no-warnings scripts/content-migration/apply-npc-voices.mjs [--dry-run] [--db path]
 */

import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";
import { validateFeed } from "../lib/feed-rules.mjs";
import { seedFeed } from "./feed-content.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

/** The shared feed posts that had one text for several possible posters. */
const OLD_SHARED = [
  "ft-chest-daily", "ft-chest-weekly", "ft-chest-any", "ft-rank-passed", "ft-rank-passed-by", "ft-rank-any",
  "ft-first-lesson-1", "ft-first-lesson-2", "ft-comeback-3", "ft-comeback-3b", "ft-comeback-7", "ft-comeback-7b", "ft-comeback-14",
  "ft-quests-1", "ft-quests-2",
];

/** Lesson-side lines: one plain, friendly tone for every teacher. */
const LESSON_LINES = {
  "line-hal-meet": "Hi, I'm Hal. Let's find out what everything is made of.",
  "line-hal-sign-off": "Well done. Now you know what is inside an atom, and why that matters.",
  "line-ada-meet": "Hi, I'm Ada. Let's find out why some atoms change, and how long it takes.",
  "line-ada-sign-off": "Well done. Radioactivity is a natural part of the world, and now you know how it works.",
};

if (dryRun) {
  console.log("Dry run: would replace the shared feed posts with one set per character, reset the seeded feed and blog text, Hal's and Ada's chats, and the lesson lines.");
  process.exit(0);
}

backupBeforeScript("apply-npc-voices", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
db.exec("BEGIN");
try {
  const del = db.prepare("DELETE FROM feed_templates WHERE id = ?");
  let removed = 0;
  for (const id of OLD_SHARED) removed += Number(del.run(id).changes);
  const stats = seedFeed(db, { overwrite: true });
  const { findings } = validateFeed(db);
  const errors = findings.filter((f) => f.severity === "error");
  for (const f of errors) console.log(`  ERROR ${f.table} ${f.id} :: ${f.field} :: ${f.rule}: ${f.message}`);
  if (errors.length) throw new Error("the feed does not validate");
  const upd = db.prepare("UPDATE npc_lines SET text = ? WHERE id = ?");
  for (const [id, text] of Object.entries(LESSON_LINES)) upd.run(text, id);
  db.exec("COMMIT");
  console.log(`feed: ${removed} shared templates removed, ${stats.templates} templates and ${stats.posts} blog pieces written, ${stats.comments} comments.`);
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
} finally {
  db.close();
}

// Hal's and Ada's chats are written afresh: the nodes an older version had (and no longer has) must not linger
{
  const chat = new DatabaseSync(dbPath);
  const gone = Number(chat.prepare("DELETE FROM chat_nodes WHERE npc_id IN ('npc-hal', 'npc-ada')").run().changes);
  chat.close();
  console.log(`chat: ${gone} old nodes of Hal and Ada removed, the new ones follow.`);
}
execFileSync(process.execPath, ["--no-warnings", path.join(ROOT, "scripts/content-migration/add-chat-nodes.mjs"), "--overwrite", "--npc", "npc-hal,npc-ada", "--db", dbPath], { stdio: "inherit" });
console.log("Voices applied (a draft: publish from Content Studio or `npm run release:content -- --publish`).");
