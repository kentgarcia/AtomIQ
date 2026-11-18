#!/usr/bin/env node
/**
 * Sort-into-groups legends use AtomIQ's own icons (`components/ui/custom-icons.ts`, names `Aq...`),
 * drawn in the Iconsax Bold style for exactly these groups, instead of whichever library icon was
 * nearest (a tick, a cross, a tree...). Idempotent: a group's icon is replaced only when it is missing
 * or still the earlier stand-in, so an icon chosen in Content Studio survives a re-run. A draft edit of
 * the master db with a backup first; it does not publish.
 *
 *   node --no-warnings scripts/content-migration/set-sort-custom-icons.mjs [--dry-run]
 *
 * (curriculum/unit-N.mjs and add-sort-bucket-icons.mjs carry the same icons, for a fresh cutover.)
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const dbPath = path.join(ROOT, "content/database/content.db");
const dryRun = process.argv.includes("--dry-run");

/** By group id: the stand-in it had, and the icon drawn for it. */
const ICONS = {
  atoms: { was: "TickCircle", icon: "AqAtom" },
  not: { was: "CloseCircle", icon: "AqAtomOff" },
  in: { was: "Login", icon: "AqNucleus" },
  out: { was: "Logout", icon: "AqOrbit" },
  carbon: { was: "TickCircle", icon: "AqCarbon" },
  other: { was: "CloseCircle", icon: "AqCarbonOff" },
  iso: { was: "Copy", icon: "AqSameElement" },
  diff: { was: "Shuffle", icon: "AqDiffElement" },
  stable: { was: "ShieldTick", icon: "AqStable" },
  unstable: { was: "Flash", icon: "AqUnstable" },
  nature: { was: "Tree", icon: "AqLeaf" },
  people: { was: "Building", icon: "AqFlask" },
  particle: { was: "Record", icon: "AqParticle" },
  em: { was: "Wifi", icon: "AqWave" },
  natural: { was: "Tree", icon: "AqMountain" },
  cosmic: { was: "Star1", icon: "AqCosmic" },
};

if (!dryRun) backupBeforeScript("set-sort-custom-icons", dbPath); // safety net: scripts/lib/backup.mjs
const db = new DatabaseSync(dbPath);
const rows = db.prepare("SELECT id, data FROM items WHERE type = 'sort'").all();
const update = db.prepare("UPDATE items SET data = ?, updated_at = strftime('%s','now') WHERE id = ?");
let set = 0;
let kept = 0;
let missing = 0;
db.exec("BEGIN");
for (const r of rows) {
  const data = JSON.parse(r.data);
  let changed = false;
  for (const b of data.buckets) {
    const choice = ICONS[b.id];
    if (!choice) {
      missing++;
      console.warn(`no custom icon drawn for group "${b.id}" of ${r.id}`);
      continue;
    }
    if (b.icon === choice.icon) continue;
    if (b.icon && b.icon !== choice.was) {
      kept++;
      console.log(`kept "${b.icon}" on ${r.id}/${b.id} (chosen in Studio)`);
      continue;
    }
    b.icon = choice.icon;
    set++;
    changed = true;
  }
  if (changed) update.run(JSON.stringify(data), r.id);
}
db.exec(dryRun ? "ROLLBACK" : "COMMIT");
console.log(`${dryRun ? "[dry run] " : ""}${set} group icons set across ${rows.length} sort items${kept ? `; ${kept} kept` : ""}${missing ? `; ${missing} groups have no icon drawn` : ""}.`);
