#!/usr/bin/env node
/**
 * Gives every teacher a bio in their own first-person voice ("I am Hal. I teach what is inside the atom..."), the one on their
 * profile and on the meet-your-teacher card. The words live in components/npc/npc-roster.ts (the seed and the fallback), and this
 * writes them to the `npcs` rows of the master DB. Idempotent. Takes a backup first. Does not publish; the release step does.
 *
 *   node --no-warnings scripts/content-migration/legacy/set-npc-bios.mjs [--dry-run] [--db path]
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
  console.error("set-npc-bios.mjs is retired: characters live in content/source and are built by `npm run content:sync`.");
  process.exit(1);
}


const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbArg = args.indexOf("--db");
const dbPath = path.resolve(ROOT, dbArg >= 0 ? args[dbArg + 1] : "content/database/content.db");
const { NPC_ROSTER } = await import(pathToFileURL(path.join(ROOT, "components/npc/npc-roster.ts")).href);

const db = new DatabaseSync(dbPath, { readOnly: dryRun });
const rows = new Map(db.prepare("SELECT id, bio FROM npcs").all().map((r) => [r.id, r.bio]));
const todo = NPC_ROSTER.filter((n) => rows.has(n.id) && rows.get(n.id) !== n.bio);
if (dryRun || todo.length === 0) {
  console.log(dryRun ? `Dry run: would rewrite ${todo.length} bio(s).` : "Every bio is already up to date.");
  db.close();
  process.exit(0);
}
db.close();
backupBeforeScript("set-npc-bios", dbPath);
const w = new DatabaseSync(dbPath);
const upd = w.prepare("UPDATE npcs SET bio = ? WHERE id = ?");
for (const n of todo) upd.run(n.bio, n.id);
w.close();
console.log(`Bios rewritten for ${todo.map((n) => n.name).join(", ")} (a draft: publish from Content Studio or \`npm run release:content -- --publish\`).`);
