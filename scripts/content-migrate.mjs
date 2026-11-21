#!/usr/bin/env node
/**
 * content:migrate: bring source files up to the current format version (spec section 10). Reads each file with the reader
 * its header names, writes it with the current writer, and refuses to write anything unless the rows and comments read back
 * identical. A format or adapter version bump ships with a run of this and a commit that changes no row.
 *
 *   npm run content:migrate [adapter...] [--dry-run]
 */
import { makePaths } from "./lib/content-paths.mjs";
import { migrateAdapter } from "./lib/content-source/migrate.mjs";
import { ownedAdapters } from "./lib/content-source/owned.mjs";

const argv = process.argv.slice(2);
const names = argv.filter((a) => !a.startsWith("--"));
const paths = makePaths();
for (const adapter of ownedAdapters().filter((a) => !names.length || names.includes(a.name))) {
  try {
    const { changed, unchanged } = migrateAdapter({ sourceDir: paths.sourceDir, adapter, write: !argv.includes("--dry-run") });
    console.log(`${adapter.name}: ${changed.length} file(s) ${argv.includes("--dry-run") ? "would be " : ""}rewritten, ${unchanged} already current`);
  } catch (e) {
    console.error(`✗ ${e.format ? e.format() : e.message}`);
    process.exit(1);
  }
}
