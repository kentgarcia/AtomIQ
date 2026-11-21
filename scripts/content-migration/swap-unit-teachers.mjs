#!/usr/bin/env node
/**
 * Swaps the first two teachers: Unit 1 "Inside the Atom" is taught by Hal (it was Ada) and Unit 2 "Radioactivity" by Ada (it was Hal).
 * Idempotent: it looks at `units.teacher_npc_id` and does nothing once Unit 1 already belongs to `npc-hal`.
 *
 * Everything that belonged to a unit's teacher moves with the unit, and whatever carried a teacher's name in it is renamed:
 *   - units.teacher_npc_id, and the title / field / bio / position of the two `npcs` rows (their drawing, name and cover stay with the person)
 *   - lesson_cards: a story card's `speaker`
 *   - npc_lines, chat_nodes, feed_templates and blog_comments: owner (`npc_id`), id (`-ada-` and `-hal-` trade places; nothing here was
 *     published yet, so the ids may change), reply links, `reactors` / `poster_pool`, and the name written in the text
 *   - blog_posts: author, reactors, and the name in the text of the blocks
 * A few voice lines are rewritten by hand (VOICE) because they spoke as the other person ("My pocket watch ticks...").
 *
 * ONE-OFF, ALREADY APPLIED (2026-11-22). Its chat_nodes part now belongs to the source files (content/source/chat): do not run it again,
 * it would write the chat in the database behind the files' back (content:sync would then report drift).
 *
 * Takes a backup first. Does not publish; the release step does.
 *
 *   node --no-warnings scripts/content-migration/swap-unit-teachers.mjs [--dry-run] [--db path]
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

const BIO = {
  "npc-hal": "Hal is patient and tells things slowly and exactly. He teaches the atom: what is inside it, and why that matters.",
  "npc-ada": "Ada is curious about everything and loves a surprise. She teaches why some atoms change, and how long that takes.",
};

/** `-ada-` and `-hal-` trade places in an id (`chat-ada-next` becomes `chat-hal-next`, `bc-x-hal` becomes `bc-x-ada`). */
export const swapId = (s) => s.replace(/-(ada|hal)(?=-|$)/g, (_, w) => (w === "ada" ? "-hal" : "-ada"));
/** The npc ids and the names Ada and Hal trade places in a piece of text or JSON. */
export const swapNames = (s) =>
  s.replace(/npc-(ada|hal)\b/g, (_, w) => (w === "ada" ? "npc-hal" : "npc-ada")).replace(/\b(Ada|Hal)\b/g, (m) => (m === "Ada" ? "Hal" : "Ada"));
const swapIdsInJson = (s) => s.replace(/"(next|id)":"([^"]+)"/g, (m, k, v) => (k === "next" ? `"next":"${swapId(v)}"` : m));

/** Lines the swap alone would leave in the wrong voice, by their NEW id (text is exactly as it should read now). */
const VOICE = {
  "line-hal-meet": "I'm Hal. Take your time. We'll look at what everything is made of, slowly and exactly.",
  "line-ada-meet": "Hi, I'm Ada! Let's find out why some atoms change, and how long it takes.",
  "line-hal-sign-off": "Well done. Now you know what is inside an atom, and why that matters.",
  "line-ada-sign-off": "Nice work! Radioactivity is a natural part of the world, and now you know how it works.",
  "line-ada-intro-half-life": "A half-life ticks for a whole crowd of atoms, not for one. Let's see how.",
};
/** Chat openings that read oddly in the other voice once the name is swapped ("Hi! Hal here"), by their NEW id. */
const CHAT_TEXT = [
  ["chat-hal-up-stadium", "Hi! Hal here.", "Hello, Hal here."],
  ["chat-ada-up-banana", "Hello, Ada here.", "Hi! Ada here."],
];
/** The blog: "Hal knows, and he tells it slowly" is Ada now (and she is not the slow one), and the pocket watch was Hal's prop. */
const BLOG_FIXES = [
  ["Ada knows, and he tells it slowly.", "Ada knows, and she loves to tell it."],
  ["My pocket watch ticks for a crowd of atoms, never for one.", "A half-life ticks for a crowd of atoms, never for one."],
];

const db0 = new DatabaseSync(dbPath, { readOnly: true });
const owner = db0.prepare("SELECT teacher_npc_id AS t FROM units WHERE id = 'inside-the-atom'").get()?.t;
db0.close();
if (owner === "npc-hal") {
  console.log("Unit 1 already belongs to Hal: nothing to do.");
  process.exit(0);
}
if (owner !== "npc-ada") {
  console.log(`Unit 1's teacher is ${owner}, not Ada: this migration does not apply.`);
  process.exit(1);
}
if (dryRun) {
  console.log("Dry run: would swap Unit 1 (Ada to Hal) and Unit 2 (Hal to Ada) and everything that belongs to them.");
  process.exit(0);
}

backupBeforeScript("swap-unit-teachers", dbPath);
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON");
const counts = {};
const tally = (k, n = 1) => (counts[k] = (counts[k] ?? 0) + n);

/** Rename ids in two steps so two rows can trade places under a UNIQUE key. */
function renameIds(table, mapRow) {
  const rows = db.prepare(`SELECT * FROM ${table}`).all();
  const touched = rows.filter((r) => /-(ada|hal)(?=-|$)/.test(r.id));
  for (const r of touched) db.prepare(`UPDATE ${table} SET id = ? WHERE id = ?`).run(`tmp-swap:${r.id}`, r.id);
  for (const r of touched) {
    const next = mapRow(r);
    const sets = Object.keys(next).filter((k) => k !== "id");
    db.prepare(`UPDATE ${table} SET id = ?${sets.map((k) => `, ${k} = ?`).join("")} WHERE id = ?`).run(swapId(r.id), ...sets.map((k) => next[k]), `tmp-swap:${r.id}`);
    tally(table);
  }
}

db.exec("BEGIN");
try {
  // Units and the two teachers' own rows
  db.prepare("UPDATE units SET teacher_npc_id = 'npc-hal' WHERE id = 'inside-the-atom'").run();
  db.prepare("UPDATE units SET teacher_npc_id = 'npc-ada' WHERE id = 'radioactivity'").run();
  const npc = (id) => db.prepare("SELECT title, field, position FROM npcs WHERE id = ?").get(id);
  const ada = npc("npc-ada");
  const hal = npc("npc-hal");
  db.prepare("UPDATE npcs SET position = position + 100 WHERE id IN ('npc-ada','npc-hal')").run();
  db.prepare("UPDATE npcs SET title = ?, field = ?, position = ?, bio = ? WHERE id = 'npc-hal'").run(ada.title, ada.field, ada.position, BIO["npc-hal"]);
  db.prepare("UPDATE npcs SET title = ?, field = ?, position = ?, bio = ? WHERE id = 'npc-ada'").run(hal.title, hal.field, hal.position, BIO["npc-ada"]);

  // A story card's speaker
  for (const r of db.prepare("SELECT rowid AS rid, data FROM lesson_cards WHERE data LIKE '%\"speaker\":\"npc-%'").all()) {
    const next = r.data.replace(/"speaker":"(npc-(?:ada|hal))"/, (_, v) => `"speaker":"${v === "npc-ada" ? "npc-hal" : "npc-ada"}"`);
    if (next !== r.data) {
      db.prepare("UPDATE lesson_cards SET data = ? WHERE rowid = ?").run(next, r.rid);
      tally("lesson_cards");
    }
  }

  // Voice lines
  renameIds("npc_lines", (r) => ({ id: r.id, npc_id: swapNames(r.npc_id), text: VOICE[swapId(r.id)] ?? swapNames(r.text) }));

  // Chats
  renameIds("chat_nodes", (r) => {
    const id = swapId(r.id);
    let text = swapNames(r.text ?? "");
    for (const [want, from, to] of CHAT_TEXT) if (id === want) text = text.replace(from, to);
    return {
      id,
      npc_id: swapNames(r.npc_id),
      text,
      title: r.title == null ? null : swapNames(r.title),
      replies: swapNames(swapIdsInJson(r.replies ?? "[]")),
    };
  });

  // Feed templates
  renameIds("feed_templates", (r) => ({
    id: r.id,
    npc_id: r.npc_id == null ? null : swapNames(r.npc_id),
    poster_pool: swapNames(r.poster_pool ?? "[]"),
    reactors: swapNames(r.reactors ?? "[]"),
    text: swapNames(r.text),
  }));
  // The general posts keep their id; only their pool and reactors trade places
  for (const r of db.prepare("SELECT id, poster_pool, reactors FROM feed_templates WHERE id NOT LIKE '%-ada-%' AND id NOT LIKE '%-hal-%' AND id NOT LIKE '%-ada' AND id NOT LIKE '%-hal'").all()) {
    const pool = swapNames(r.poster_pool ?? "[]");
    const reactors = swapNames(r.reactors ?? "[]");
    if (pool !== r.poster_pool || reactors !== r.reactors) {
      db.prepare("UPDATE feed_templates SET poster_pool = ?, reactors = ? WHERE id = ?").run(pool, reactors, r.id);
      tally("feed_templates (general)");
    }
  }

  // Blog pieces and the comments under them
  for (const r of db.prepare("SELECT id, npc_id, reactors, blocks FROM blog_posts").all()) {
    let blocks = swapNames(r.blocks);
    for (const [from, to] of BLOG_FIXES) blocks = blocks.replace(from, to);
    db.prepare("UPDATE blog_posts SET npc_id = ?, reactors = ?, blocks = ? WHERE id = ?").run(swapNames(r.npc_id), swapNames(r.reactors ?? "[]"), blocks, r.id);
    tally("blog_posts");
  }
  renameIds("blog_comments", (r) => ({ id: r.id, npc_id: swapNames(r.npc_id), text: r.text, chip: r.chip }));
  // A comment by Ray or Mina keeps its id; one by Ada or Hal on a post that changed hands may now be by the post's author, which the rules refuse
  for (const c of db.prepare("SELECT c.id, c.npc_id, p.npc_id AS author FROM blog_comments c JOIN blog_posts p ON p.id = c.blog_id").all()) {
    if (c.npc_id === c.author) throw new Error(`comment ${c.id} is by the author of its own post`);
  }

  db.exec("COMMIT");
} catch (e) {
  db.exec("ROLLBACK");
  throw e;
}
db.close();
console.log("Teachers swapped (a draft: publish from Content Studio or `npm run release:content -- --publish`).", counts);
