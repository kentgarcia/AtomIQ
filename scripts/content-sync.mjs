#!/usr/bin/env node
/**
 * content:sync: build the content database from the source files (content/source/**.atomiq).
 *
 *   npm run content:sync                          dry run: every insert, update, delete, the move count, the validation result
 *   npm run content:sync -- --apply               write it (backup first, then the tests that read the touched tables)
 *   npm run content:sync -- --check               change nothing; exit 1 if the files cannot be read or differ from the DB
 *   npm run content:sync -- chat                  only that adapter (default: every owned adapter)
 *
 * Flags: --retire "<reason>" (needed to delete an id that has shipped), --force (overwrite DB changes that are not in the
 * files), --no-verify (skip the tests), --full (print every change). Exit code 1 on any problem.
 * Spec: docs/features/CONTENT_SOURCE_SPEC.md (section 8).
 */
import { makePaths } from "./lib/content-paths.mjs";
import { checkSync, runSync } from "./lib/content-source/sync.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const option = (n) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
const names = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--retire");
const paths = makePaths();

if (flag("--help") || flag("-h")) {
  console.log("Usage: content:sync [adapter...] [--apply] [--check] [--retire \"reason\"] [--force] [--no-verify] [--full]");
  process.exit(0);
}
const code = flag("--check")
  ? checkSync({ paths, names })
  : await runSync({ paths, names, apply: flag("--apply"), retire: option("--retire"), force: flag("--force"), verify: !flag("--no-verify"), full: flag("--full") });
process.exit(code);
