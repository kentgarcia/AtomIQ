#!/usr/bin/env node
/**
 * content:export: write the source files of an adapter from the database, in canonical form.
 *
 *   npm run content:export -- <adapter> [--to <dir>] [--force]
 *
 * The files are the master, so an export refuses to overwrite existing source files without --force (it is the
 * bootstrap for a table that is being migrated, and the recovery path if the files are ever lost). `--to` writes
 * somewhere else, for comparing. The `default` adapter is the lossless fallback for any table and is not part of the
 * source tree, so it always needs `--to`.
 */
import fs from "node:fs";
import path from "node:path";
import { openDb } from "./lib/content-tables.mjs";
import { makePaths } from "./lib/content-paths.mjs";
import { getAdapter, adapterNames } from "./lib/content-source/registry.mjs";
import { readRowsByTable } from "./lib/content-source/adapters/default.mjs";
import { renderFiles } from "./lib/content-source/pipeline.mjs";
import { readSourceFiles, writeSourceFiles } from "./lib/content-source/files.mjs";
import { writeState } from "./lib/content-source/state.mjs";

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : null);
const name = args.find((a) => !a.startsWith("--") && a !== val("--to"));
if (!name) {
  console.error(`Usage: content:export <adapter> [--to <dir>] [--force]\nAdapters: ${adapterNames().join(", ")}`);
  process.exit(2);
}

const paths = makePaths();
const db = openDb(paths.master, { readOnly: true });
const adapter = getAdapter(name, db);
const to = val("--to");
if (name === "default" && !to) {
  console.error("The default adapter is not part of the source tree: give --to <dir>.");
  process.exit(2);
}
const root = to ? path.resolve(to) : paths.sourceDir;
const rowsByTable = readRowsByTable(db, [...adapter.tables]);
const files = renderFiles(adapter, rowsByTable);
db.close();

const existing = readSourceFiles(root, adapter.owns);
if (existing.size && !flag("--force")) {
  console.error(`${existing.size} ${adapter.name} source file(s) already exist in ${root}. The files are the master: pass --force to overwrite them from the database.`);
  process.exit(1);
}
fs.mkdirSync(root, { recursive: true });
writeSourceFiles(root, files, [...existing.keys()]);
if (!to) writeState(paths.sourceDir, rowsByTable); // the files now say what the DB says: remember it for the drift check
const bytes = [...files.values()].reduce((n, t) => n + t.length, 0);
console.log(`Wrote ${files.size} file(s), ${bytes.toLocaleString()} bytes, to ${root}`);
