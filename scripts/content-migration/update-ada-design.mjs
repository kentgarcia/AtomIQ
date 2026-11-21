#!/usr/bin/env node
/**
 * Ada's redesign (pigtails with green bows, pink shirt under a tan lab apron with the radiation badge, a glowing flask).
 * Idempotent. The drawing is in components/npc (`pigtailbows` hair, the `apron` outfit, the `flask` prop, `blush`); this only
 * swaps the `spec` JSON of the `npc-ada` row for the one in npc-roster.ts, and only while the row still holds her old design,
 * so a spec edited in Content Studio since is left alone (pass `--overwrite` to replace it anyway).
 *
 * Takes a backup first. Does not publish; the release step does.
 *
 *   node --no-warnings scripts/content-migration/update-ada-design.mjs [--dry-run] [--overwrite] [--db path]
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { DatabaseSync } from "node:sqlite";

import { backupBeforeScript } from "../lib/backup.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const overwrite = args.includes("--overwrite");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");

const { NPC_ROSTER } = await import(pathToFileURL(path.join(ROOT, "components/npc/npc-roster.ts")).href);
const ada = NPC_ROSTER.find((n) => n.id === "npc-ada");
const next = JSON.stringify(ada.spec);

const db = new DatabaseSync(dbPath);
const row = db.prepare("SELECT spec FROM npcs WHERE id = 'npc-ada'").get();
if (!row) {
  console.log("npc-ada is not in the npcs table: run add-npcs.mjs first.");
  process.exit(1);
}
if (row.spec === next) {
  console.log("Ada already has the new design.");
  process.exit(0);
}
const old = JSON.parse(row.spec);
const stillOld = old.hair?.style === "curls" && old.outfit?.kind === "sweater" && old.accent?.kind === "marble";
if (!stillOld && !overwrite) {
  console.log("Ada's spec was edited since the first seed: left alone (use --overwrite to replace it).");
  process.exit(0);
}
if (dryRun) {
  console.log("Dry run: would replace Ada's spec with\n" + JSON.stringify(ada.spec, null, 2));
  process.exit(0);
}
db.close();
backupBeforeScript("update-ada-design", dbPath);
const w = new DatabaseSync(dbPath);
w.prepare("UPDATE npcs SET spec = ? WHERE id = 'npc-ada'").run(next);
w.close();
console.log("Ada's spec updated (a draft: publish from Content Studio or `npm run release:content -- --publish`).");
