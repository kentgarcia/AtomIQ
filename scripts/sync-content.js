#!/usr/bin/env node
// Syncs the master content database into the app bundle and keeps
// CONTENT_DB_VERSION truthful — automatically.
//
//   1. If master (content/database/content.db) differs from the bundled
//      copy (assets/database/content.db), copy it over.
//   2. Derive CONTENT_DB_VERSION from a hash of the bundled DB bytes,
//      rewriting services/content-db.ts when it changes.
//
// Because the number is derived from content, any real content change
// ALWAYS produces a new version -> every device re-seeds on update.
// No manual bumping, no stale-content-in-production failure mode.

"use strict";

const fs = require("fs");
const crypto = require("crypto");
const { execFileSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const MASTER = path.join(ROOT, "content", "database", "content.db");
const BUNDLED = path.join(ROOT, "assets", "database", "content.db");
const TS_FILE = path.join(ROOT, "services", "content-db.ts");

if (!fs.existsSync(MASTER)) {
  console.error(`[sync-content] Master db missing: ${MASTER}`);
  process.exit(1);
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}
function stableVersion(file) {
  // 9-digit decimal derived from content hash — fits comfortably in a JS number.
  return parseInt(sha256(file).slice(0, 9), 16) % 1_000_000_000;
}

let synced = false;
if (!fs.existsSync(BUNDLED) || sha256(MASTER) !== sha256(BUNDLED)) {
  // Checkpoint any WAL sidecars on the master so we copy complete data.
  try {
    execFileSync(process.execPath, [
      "-e",
      `const{DatabaseSync}=require("node:sqlite");` +
        `new DatabaseSync(${JSON.stringify(MASTER)}).exec("PRAGMA wal_checkpoint(TRUNCATE)");`,
    ]);
  } catch {
    /* node without sqlite — copy anyway */
  }
  fs.copyFileSync(MASTER, BUNDLED);
  synced = true;
  console.log("[sync-content] Bundled db updated from master.");
}

// Derive the version from what is actually shipped.
const version = stableVersion(BUNDLED);

const src = fs.readFileSync(TS_FILE, "utf8");
const pattern = /export const CONTENT_DB_VERSION = \d+;/;
if (!pattern.test(src)) {
  console.error(`[sync-content] Could not find CONTENT_DB_VERSION in ${TS_FILE}`);
  process.exit(1);
}
const next = src.replace(pattern, `export const CONTENT_DB_VERSION = ${version};`);
if (next !== src) {
  fs.writeFileSync(TS_FILE, next);
}
console.log(`[sync-content] CONTENT_DB_VERSION = ${version}${synced ? " (db was resynced)" : ""}`);
