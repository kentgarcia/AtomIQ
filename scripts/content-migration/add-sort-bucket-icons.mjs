#!/usr/bin/env node
/**
 * Sort-into-groups items get an icon per group (`buckets[].icon`): the lesson shows a legend of
 * icon + group name, and the learner sorts each thing by tapping an icon button. Idempotent: an icon
 * is only set when the bucket has none, so edits made in Content Studio survive a re-run. A draft
 * edit of the master db with a backup first; it does not publish.
 *
 *   node --no-warnings scripts/content-migration/add-sort-bucket-icons.mjs [--dry-run]
 *
 * (curriculum/unit-N.mjs carries the same icons, for a fresh cutover.)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");

/** Icon names (checked by `npm run check:icons`), by group id: AtomIQ's own `Aq...` icons (components/ui/custom-icons.ts). */
export const BUCKET_ICONS = {
  atoms: "AqAtom",
  not: "AqAtomOff",
  in: "AqNucleus",
  out: "AqOrbit",
  carbon: "AqCarbon",
  other: "AqCarbonOff",
  iso: "AqSameElement",
  diff: "AqDiffElement",
  stable: "AqStable",
  unstable: "AqUnstable",
  nature: "AqLeaf",
  people: "AqFlask",
  particle: "AqParticle",
  em: "AqWave",
  natural: "AqMountain",
  cosmic: "AqCosmic",
};

if (!dryRun) backupBeforeScript("add-sort-bucket-icons", dbPath); // safety net: scripts/lib/backup.mjs
const db = new DatabaseSync(dbPath);
const rows = db.prepare("SELECT id, data FROM items WHERE type = 'sort'").all();
const update = db.prepare("UPDATE items SET data = ?, updated_at = strftime('%s','now') WHERE id = ?");
let set = 0;
let missing = 0;
db.exec("BEGIN");
for (const r of rows) {
  const data = JSON.parse(r.data);
  let changed = false;
  for (const b of data.buckets) {
    if (b.icon) continue;
    const icon = BUCKET_ICONS[b.id];
    if (!icon) {
      missing++;
      console.warn(`no icon chosen for group "${b.id}" of ${r.id}`);
      continue;
    }
    b.icon = icon;
    set++;
    changed = true;
  }
  if (changed) update.run(JSON.stringify(data), r.id);
}
db.exec(dryRun ? "ROLLBACK" : "COMMIT");
console.log(`${dryRun ? "[dry run] " : ""}${set} group icons set across ${rows.length} sort items${missing ? `; ${missing} groups have no icon chosen` : ""}.`);
