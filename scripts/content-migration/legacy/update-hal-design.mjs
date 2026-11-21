#!/usr/bin/env node
/**
 * Hal's redesign (a cloud of golden hair, an oval face, a pale lab coat over a blue jumper, a satchel with the radiation badge, a rock sample,
 * a yellow cover kept as his brand). Idempotent. The drawing is in components/npc (the `cloud` hair, the `whitecoat` outfit, `hal-art.ts`,
 * `cover` on the spec); this only swaps the `spec` JSON of the `npc-hal` row for the one in npc-roster.ts, and only while the row
 * still holds his old design, so a spec edited in Content Studio since is left alone (pass `--overwrite` to replace it anyway).
 *
 * Takes a backup first. Does not publish; the release step does.
 *
 *   node --no-warnings scripts/content-migration/legacy/update-hal-design.mjs [--dry-run] [--overwrite] [--db path]
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../../lib/backup.mjs";

/**
 * RETIRED (content source files). The rows this script writes (characters) are written in content/source and built with
 * `npm run content:sync`; running this would overwrite them behind the files' back. Kept only as history.
 * Do not run it. Edit the files (docs/features/CONTENT_SOURCE_SPEC.md).
 */
if (!process.argv.includes("--i-know-this-is-retired")) {
  console.error("update-hal-design.mjs is retired: characters live in content/source and are built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

const { NPC_ROSTER } = await import(pathToFileURL(path.join(ROOT, "components/npc/npc-roster.ts")).href);
const hal = NPC_ROSTER.find((n) => n.id === "npc-hal");
const next = JSON.stringify(hal.spec);

const db = new DatabaseSync(dbPath);
const row = db.prepare("SELECT spec FROM npcs WHERE id = 'npc-hal'").get();
if (!row) {
  console.log("npc-hal is not in the npcs table: run add-npcs.mjs first.");
  process.exit(1);
}
if (row.spec === next) {
  console.log("Hal already has the new design.");
  process.exit(0);
}
const old = JSON.parse(row.spec);
const stillOld = old.hair?.style === "crop" && old.outfit?.kind === "vest" && old.accent?.kind === "watch";
if (!stillOld && !overwrite) {
  console.log("Hal's spec was edited since the first seed: left alone (use --overwrite to replace it).");
  process.exit(0);
}
if (dryRun) {
  console.log("Dry run: would replace Hal's spec with\n" + JSON.stringify(hal.spec, null, 2));
  process.exit(0);
}
db.close();
backupBeforeScript("update-hal-design", dbPath);
const w = new DatabaseSync(dbPath);
w.prepare("UPDATE npcs SET spec = ? WHERE id = 'npc-hal'").run(next);
w.close();
console.log("Hal's spec updated (a draft: publish from Content Studio or `npm run release:content -- --publish`).");
