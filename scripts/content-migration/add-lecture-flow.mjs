#!/usr/bin/env node
/**
 * Lecture flow content pass (components/lesson/lecture-core.ts). Idempotent: each key is only set when
 * the card does not have it yet, so edits made in Content Studio survive a re-run.
 *
 *   1. `figureAt` on every teaching card with a figure: how many of the teacher's bubbles come before
 *      the figure (0 = the picture leads, N = it lands after the Nth). Chosen per lecture, below.
 *   2. `connected: true` on a light activity (a single-tap choice or true-or-myth) that comes straight
 *      after a teaching card and checks what that card just said: it then joins the lecture's page.
 *
 * A draft edit of the master db, with a backup first. It does not publish; review in Studio, then publish.
 *
 *   node --no-warnings scripts/content-migration/add-lecture-flow.mjs [--dry-run]
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");
const { lectureSteps } = await import(pathToFileURL(path.join(ROOT, "components/lesson/lecture-core.ts")).href);

/**
 * Where the figure lands, per card ("lesson/card": bubbles before it). A card not listed here gets 1:
 * the teacher says what it is, then the learner sees it. Picture-led cards come first (0); a figure
 * that shows the payoff of what was just said comes after more of it.
 */
const FIGURE_AT = {
  "alpha-beta-gamma/c05": 2, // "a fast electron" ... then see it ... then "far lighter"
  "alpha-beta-gamma/c06": 2, // "not a particle" + "electromagnetic like light", then the wave
  "atoms-are-everywhere/c12": 2, // air feels like nothing ... made of atoms ... then the two balls
  "atoms-are-everywhere/c06": 2, // too small ... a skin cell ... then the zoom, ending on the atom
  "atoms-are-everywhere/c09": 2, // the question and the idea, then the bar cut in half
  "decay-chains/c04": 2, // the definition first, then the chain it describes
  "decay-chains/c12": 2,
  "half-life/c12": 2, // fast and slow, then the ladder of bars
  "isotopes/c05": 2,
  "isotopes/c10": 2, // the rule, the worked sum, then the equation as a summary
  "protons-neutrons-electrons/c04": 0, // the three particles lead
  "protons-neutrons-electrons/c07": 0, // the stadium picture is the answer
  "why-nuclei-decay/c07": 2,
};
const DEFAULT_FIGURE_AT = 1;

/** Item types light enough to sit inside a lecture. */
const CONNECTABLE = new Set(["choice", "true_or_myth"]);

if (!dryRun) backupBeforeScript("add-lecture-flow", dbPath); // safety net: scripts/lib/backup.mjs
// A dry run changes the real database inside a transaction and rolls it back
const conn = new DatabaseSync(dbPath);

const cards = conn.prepare("SELECT c.lesson_id, c.id, c.kind, c.position, c.data, i.type AS item_type FROM lesson_cards c LEFT JOIN items i ON i.id = c.item_id ORDER BY c.lesson_id, c.position").all();
const update = conn.prepare("UPDATE lesson_cards SET data = ?, updated_at = strftime('%s','now') WHERE lesson_id = ? AND id = ?");

let placed = 0;
let connected = 0;
conn.exec("BEGIN");
try {
  cards.forEach((c, i) => {
    const data = JSON.parse(c.data);
    let changed = false;
    if (c.kind === "teach" && data.figure && data.figureAt === undefined) {
      const wanted = FIGURE_AT[`${c.lesson_id}/${c.id}`] ?? DEFAULT_FIGURE_AT;
      const bubbles = lectureSteps(String(data.body), false).length;
      data.figureAt = Math.min(wanted, bubbles);
      placed++;
      changed = true;
    }
    const before = cards[i - 1];
    if (c.kind === "item" && CONNECTABLE.has(c.item_type) && data.connected === undefined && before && before.lesson_id === c.lesson_id && before.kind === "teach") {
      data.connected = true;
      connected++;
      changed = true;
    }
    if (changed) update.run(JSON.stringify(data), c.lesson_id, c.id);
  });
  conn.exec(dryRun ? "ROLLBACK" : "COMMIT");
} catch (e) {
  conn.exec("ROLLBACK");
  throw e;
}
console.log(`${dryRun ? "[dry run] " : ""}figureAt set on ${placed} teaching cards; connected set on ${connected} activities.`);
