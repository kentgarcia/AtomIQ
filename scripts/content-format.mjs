#!/usr/bin/env node
/**
 * content:format: rewrite source files in canonical form (comments kept), or just check them.
 *
 *   npm run content:format                 every owned adapter
 *   npm run content:format -- chat         one adapter
 *   npm run content:format -- --check      change nothing; exit 1 if any file is not canonical (a hand edit is never blocked by it)
 *   npm run content:format -- --paths      also renumber the NNN- prefixes of each folder back to 010, 020, ... (a rename; git sees a move)
 */
import fs from "node:fs";
import path from "node:path";
import { makePaths } from "./lib/content-paths.mjs";
import { SourceError } from "./lib/content-source/core/errors.mjs";
import { readSourceFiles, walk } from "./lib/content-source/files.mjs";
import { renumberFolder } from "./lib/content-source/migrate.mjs";
import { ownedAdapters } from "./lib/content-source/owned.mjs";
import { canonicalizeText } from "./lib/content-source/pipeline.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const names = argv.filter((a) => !a.startsWith("--"));
const paths = makePaths();
let bad = 0;
let rewritten = 0;
for (const adapter of ownedAdapters().filter((a) => !names.length || names.includes(a.name))) {
  for (const [rel, text] of readSourceFiles(paths.sourceDir, adapter.owns)) {
    let out;
    try {
      out = canonicalizeText(adapter, text, rel);
    } catch (e) {
      if (!(e instanceof SourceError)) throw e;
      console.error(`✗ ${e.format()}`);
      bad++;
      continue;
    }
    if (out === text) continue;
    if (flag("--check")) {
      console.error(`not canonical: ${rel}`);
      bad++;
    } else {
      fs.writeFileSync(path.join(paths.sourceDir, rel), out, "utf8");
      rewritten++;
    }
  }
}
if (flag("--paths") && !flag("--check")) {
  const dirs = [...new Set(walk(paths.sourceDir).filter((r) => r.endsWith(".atomiq")).map((r) => path.dirname(r)))];
  for (const d of dirs) for (const [a, b] of renumberFolder(path.join(paths.sourceDir, d))) console.log(`renamed ${d}/${a} -> ${b}`);
}
console.log(flag("--check") ? (bad ? `${bad} file(s) need formatting` : "ok: every source file is canonical") : `${rewritten} file(s) rewritten`);
process.exit(bad ? 1 : 0);
