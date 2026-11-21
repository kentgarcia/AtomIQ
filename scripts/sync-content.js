#!/usr/bin/env node
// Syncs the master content database into the app bundle.
//
//   1. Dumps every content table to content/snapshot/*.json (sorted, no
//      timestamps) so content changes are reviewable in git.
//   2. Works out the content version from the release ledger:
//        "1.4.0"              content equals the last published release
//        "1.4.0+draft.a1b2c3" there are unpublished changes
//   3. Rebuilds assets/database/content.db (with a content_meta table) when its
//      metadata no longer matches, and rewrites CONTENT_DB_VERSION in
//      services/content-db.ts.
//
// Editing never creates a version. Only `npm run release:content` (or Content
// Studio's Publish button) does. See docs/critical/CONTENT_SQLITE_AND_STUDIO_SPEC.md.

"use strict";

const path = require("path");
const { pathToFileURL } = require("url");

// node:sqlite prints an ExperimentalWarning on every run; this script runs on every
// install/start, so keep its output clean. Other warnings still show.
const emitWarning = process.emitWarning;
process.emitWarning = (warning, ...rest) =>
  /SQLite/i.test(String(warning)) ? undefined : emitWarning.call(process, warning, ...rest);

const lib = (name) => import(pathToFileURL(path.join(__dirname, "lib", name)).href);

(async () => {
  const { makePaths } = await lib("content-paths.mjs");
  const { syncContent } = await lib("releases.mjs");
  const paths = makePaths(path.resolve(__dirname, ".."));
  syncContent(paths, (m) => console.log(`[sync-content] ${m}`));
  // Files own some tables (content/source): say so, never fail a start or an install over it.
  try {
    const { checkSync } = await lib("content-source/sync.mjs");
    checkSync({ paths, log: (m) => console.log(`[sync-content] ${m}`), err: (m) => console.warn(`[sync-content] warning: ${m}`) });
  } catch (e) {
    console.warn(`[sync-content] warning: could not compare the source files with the database: ${e.message}`);
  }
})().catch((err) => {
  console.error(`[sync-content] ${err.message}`);
  process.exit(1);
});
