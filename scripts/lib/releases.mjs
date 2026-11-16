/**
 * Content versioning, bundling and publishing (spec §3.1, §3.2, §3.7).
 *
 * Editing is a draft. A content version exists only because someone published:
 *   - `content/releases.json` is the append-only ledger of releases.
 *   - `content/releases/<version>.db.gz` archives the database of each release.
 *   - Between releases the bundle is labelled `<last>+draft.<hash6>`.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

import { createBackup, restoreMasterFrom, studioIsRunning } from "./backup.mjs";
import { validateDatabase } from "./content-validate.mjs";
import {
  SHIPPED_ID_TABLES,
  collectShippedIds,
  diffDatabases,
  dumpSnapshot,
  hashSnapshot,
  writeSnapshot,
} from "./content-tables.mjs";

export const BUMPS = ["patch", "minor", "major"];
const BUMP_RANK = { patch: 0, minor: 1, major: 2 };

const VERSION_RE = /export const CONTENT_DB_VERSION\s*=\s*(?:\d+|"[^"]*"|'[^']*');/;
const SCHEMA_RE = /export const CONTENT_SCHEMA_VERSION\s*=\s*(\d+);/;

// ---------------------------------------------------------------------------
// Small file helpers
// ---------------------------------------------------------------------------

export function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

export const readLedger = (paths) => {
  const ledger = readJson(paths.ledger, { releases: [] });
  if (!Array.isArray(ledger.releases)) ledger.releases = [];
  return ledger;
};
export const lastRelease = (ledger) => ledger.releases.at(-1) ?? null;
export const readShipped = (paths) => readJson(paths.shippedIds, {});
export const readRetired = (paths) => readJson(paths.retiredIds, {});

export function readSchemaVersion(paths) {
  const m = fs.readFileSync(paths.tsFile, "utf8").match(SCHEMA_RE);
  if (!m) throw new Error(`CONTENT_SCHEMA_VERSION not found in ${paths.tsFile}`);
  return Number(m[1]);
}

export function readBundledVersion(paths) {
  const m = fs.readFileSync(paths.tsFile, "utf8").match(/export const CONTENT_DB_VERSION\s*=\s*(?:(\d+)|"([^"]*)"|'([^']*)');/);
  return m ? (m[2] ?? m[3] ?? m[1]) : null;
}

export function archivePath(paths, version) {
  return path.join(paths.releasesDir, `${version}.db.gz`);
}

// ---------------------------------------------------------------------------
// Versions
// ---------------------------------------------------------------------------

const parseVersion = (v) => {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error(`Not a MAJOR.MINOR.PATCH version: ${v}`);
  return m.slice(1).map(Number);
};

export function bumpVersion(version, bump) {
  const [major, minor, patch] = parseVersion(version);
  if (bump === "major") return `${major + 1}.0.0`;
  if (bump === "minor") return `${major}.${minor + 1}.0`;
  if (bump === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(`Unknown bump: ${bump}`);
}

/**
 * Suggest a bump from a diff against the last release (spec §3.7):
 *  MAJOR  a shipped id was retired, or the schema version changed
 *  MINOR  entities or child rows (steps, questions, rooms) were added or removed
 *  PATCH  wording changes only
 */
export function suggestBump(diff, { schemaChanged = false } = {}) {
  const reasons = [];
  if (schemaChanged) reasons.push("schema version changed");
  const retiredIds = Object.entries(diff.removedIds ?? {}).filter(([t]) => SHIPPED_ID_TABLES.includes(t));
  for (const [t, ids] of retiredIds) reasons.push(`${ids.length} ${t} id(s) retired`);
  if (reasons.length) return { bump: "major", reasons };

  const added = Object.entries(diff.counts.added);
  const removed = Object.entries(diff.counts.retired);
  for (const [t, n] of added) reasons.push(`${n} ${t} added`);
  for (const [t, n] of removed) reasons.push(`${n} ${t} removed`);
  if (reasons.length) return { bump: "minor", reasons };

  const changed = Object.entries(diff.counts.changed);
  return { bump: "patch", reasons: changed.map(([t, n]) => `${n} ${t} edited`) };
}

/** `1.4.0` when the content equals the last release, otherwise `1.4.0+draft.<hash6>`. */
export function resolveVersion({ hash, schemaVersion, ledger }) {
  const last = lastRelease(ledger);
  if (!last) return { version: `0.0.0+draft.${hash.slice(0, 6)}`, published: false, last: null };
  const same = last.contentHash === hash && last.schemaVersion === schemaVersion;
  return {
    version: same ? last.version : `${last.version}+draft.${hash.slice(0, 6)}`,
    published: same,
    last,
  };
}

// ---------------------------------------------------------------------------
// Archives
// ---------------------------------------------------------------------------

/** A consistent, rollback-journal copy of the master (no WAL state) in `dest`. */
function vacuumCopy(masterFile, dest) {
  fs.rmSync(dest, { force: true });
  const src = new DatabaseSync(masterFile);
  try {
    src.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  } finally {
    src.close();
  }
  const out = new DatabaseSync(dest);
  try {
    out.exec("PRAGMA journal_mode = DELETE");
  } finally {
    out.close();
  }
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "atomiq-content-"));
}

/** Decompress a release archive into a temp file and return its path. */
export function extractArchive(paths, version) {
  const file = archivePath(paths, version);
  if (!fs.existsSync(file)) throw new Error(`No archive for release ${version}`);
  const dir = tempDir();
  const out = path.join(dir, `${version}.db`);
  fs.writeFileSync(out, zlib.gunzipSync(fs.readFileSync(file)));
  return out;
}

/** Run `fn(db)` against a read-only copy of a release's database. */
export function withReleaseDb(paths, version, fn) {
  const file = extractArchive(paths, version);
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    return fn(db);
  } finally {
    db.close();
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
}

/** Diff the master against a release archive (null release → everything is "added"). */
export function diffAgainstRelease(paths, release) {
  const master = new DatabaseSync(paths.master, { readOnly: true });
  let extracted = null;
  try {
    if (!release) return diffDatabases(null, master);
    extracted = extractArchive(paths, release.version);
    const old = new DatabaseSync(extracted, { readOnly: true });
    try {
      return diffDatabases(old, master);
    } finally {
      old.close();
    }
  } finally {
    master.close();
    if (extracted) fs.rmSync(path.dirname(extracted), { recursive: true, force: true });
  }
}

/** Diff two published releases (`from` may be null for "since the beginning"). */
export function diffReleases(paths, fromVersion, toVersion) {
  const a = fromVersion ? extractArchive(paths, fromVersion) : null;
  const b = extractArchive(paths, toVersion);
  try {
    const dbA = a ? new DatabaseSync(a, { readOnly: true }) : null;
    const dbB = new DatabaseSync(b, { readOnly: true });
    try {
      return diffDatabases(dbA, dbB);
    } finally {
      dbA?.close();
      dbB.close();
    }
  } finally {
    if (a) fs.rmSync(path.dirname(a), { recursive: true, force: true });
    fs.rmSync(path.dirname(b), { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * Current state of the working database relative to the release ledger.
 * `unpublished` is a row-level change count against the last release.
 */
export function describeState(paths, { withDiff = true } = {}) {
  const db = new DatabaseSync(paths.master, { readOnly: true });
  let files;
  try {
    files = dumpSnapshot(db);
  } finally {
    db.close();
  }
  const hash = hashSnapshot(files);
  const schemaVersion = readSchemaVersion(paths);
  const ledger = readLedger(paths);
  const resolved = resolveVersion({ hash, schemaVersion, ledger });
  let diff = null;
  if (withDiff && !resolved.published) diff = diffAgainstRelease(paths, resolved.last);
  return {
    hash,
    schemaVersion,
    version: resolved.version,
    published: resolved.published,
    lastVersion: resolved.last?.version ?? null,
    unpublished: resolved.published ? 0 : (diff?.total ?? null),
    diff,
    suggestion: diff ? suggestBump(diff, { schemaChanged: !!resolved.last && resolved.last.schemaVersion !== schemaVersion }) : null,
  };
}

// ---------------------------------------------------------------------------
// Bundle (assets/database/content.db) + services/content-db.ts
// ---------------------------------------------------------------------------

function readMeta(file) {
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const rows = db.prepare("SELECT key, value FROM content_meta").all();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

/**
 * Build the bundled database from the master and stamp `content_meta`.
 * An existing bundle whose metadata already matches is left untouched, so
 * different machines (or SQLite versions) do not churn the binary in git.
 *
 * @returns {boolean} true when the bundle was (re)written
 */
export function buildBundle(paths, { version, hash, schemaVersion, builtAt }) {
  const wanted = { content_version: version, content_hash: hash, schema_version: String(schemaVersion), built_at: builtAt };
  if (fs.existsSync(paths.bundled)) {
    const meta = readMeta(paths.bundled);
    if (meta && Object.entries(wanted).every(([k, v]) => meta[k] === v)) return false;
  }
  fs.mkdirSync(path.dirname(paths.bundled), { recursive: true });
  const tmp = `${paths.bundled}.tmp`;
  vacuumCopy(paths.master, tmp);
  const db = new DatabaseSync(tmp);
  try {
    db.exec("DROP TABLE IF EXISTS content_meta");
    db.exec("CREATE TABLE content_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");
    const ins = db.prepare("INSERT INTO content_meta (key, value) VALUES (?, ?)");
    for (const [k, v] of Object.entries(wanted)) ins.run(k, v);
    db.exec("PRAGMA journal_mode = DELETE");
  } finally {
    db.close();
  }
  for (const ext of ["-wal", "-shm", "-journal"]) fs.rmSync(`${tmp}${ext}`, { force: true });
  fs.renameSync(tmp, paths.bundled);
  for (const ext of ["-wal", "-shm"]) fs.rmSync(`${paths.bundled}${ext}`, { force: true });
  return true;
}

/** Rewrite CONTENT_DB_VERSION in services/content-db.ts. Returns true when the file changed. */
export function writeVersionConstant(paths, version) {
  const src = fs.readFileSync(paths.tsFile, "utf8");
  if (!VERSION_RE.test(src)) throw new Error(`CONTENT_DB_VERSION not found in ${paths.tsFile}`);
  const next = src.replace(VERSION_RE, `export const CONTENT_DB_VERSION = ${JSON.stringify(version)};`);
  if (next === src) return false;
  fs.writeFileSync(paths.tsFile, next);
  return true;
}

/**
 * What `npm run sync-content` does: snapshot the master, work out the version,
 * refresh the bundle and the version constant.
 */
export function syncContent(paths, log = () => {}) {
  if (!fs.existsSync(paths.master)) throw new Error(`Master db missing: ${paths.master}`);

  // Fold WAL sidecars into the main file so the master is complete on disk.
  try {
    const rw = new DatabaseSync(paths.master);
    try {
      rw.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } finally {
      rw.close();
    }
  } catch {
    /* read-only checkout: reading still works */
  }

  const db = new DatabaseSync(paths.master, { readOnly: true });
  let files;
  try {
    files = dumpSnapshot(db);
  } finally {
    db.close();
  }
  const hash = hashSnapshot(files);
  const snapshotChanged = writeSnapshot(paths.snapshotDir, files);

  const schemaVersion = readSchemaVersion(paths);
  const ledger = readLedger(paths);
  const { version, published, last } = resolveVersion({ hash, schemaVersion, ledger });
  const builtAt = published ? last.date : "draft";

  const bundleChanged = buildBundle(paths, { version, hash, schemaVersion, builtAt });
  const constantChanged = writeVersionConstant(paths, version);

  if (snapshotChanged) log(`Snapshot updated (${snapshotChanged} file(s)).`);
  if (bundleChanged) log("Bundled db rebuilt from master.");
  log(`CONTENT_DB_VERSION = ${version}${published ? "" : "  (draft: not published)"}`);
  return { version, published, hash, schemaVersion, snapshotChanged, bundleChanged, constantChanged };
}

/** Gate for release builds: the bundled content must be a published version. */
export function checkPublished(paths) {
  const state = describeState(paths, { withDiff: false });
  const declared = readBundledVersion(paths);
  const meta = fs.existsSync(paths.bundled) ? readMeta(paths.bundled) : null;
  if (!state.published) {
    return { ok: false, message: `Content has unpublished changes (would be ${state.version}). Publish with: npm run release:content` };
  }
  if (declared !== state.version) {
    return { ok: false, message: `CONTENT_DB_VERSION is ${declared} but the content is ${state.version}. Run: npm run sync-content` };
  }
  if (!meta || meta.content_version !== state.version || meta.content_hash !== state.hash) {
    return { ok: false, message: "Bundled content.db does not match the published content. Run: npm run sync-content" };
  }
  return { ok: true, message: `Content ${state.version} is published.`, version: state.version };
}

// ---------------------------------------------------------------------------
// Publish / restore / record
// ---------------------------------------------------------------------------

const localDate = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** typecheck + icon check, run as part of every publish. */
export function defaultChecks(paths, log) {
  for (const [label, args] of [
    ["typecheck", ["run", "typecheck", "--silent"]],
    ["check:icons", ["run", "check:icons", "--silent"]],
  ]) {
    log(`Running ${label}…`);
    const r = spawnSync("npm", args, { cwd: paths.root, encoding: "utf8", shell: process.platform === "win32" });
    if (r.status !== 0) {
      throw new Error(`${label} failed:\n${(r.stdout || "") + (r.stderr || "")}`.trim());
    }
  }
}

function captureFiles(paths, archive) {
  const files = new Map();
  const grab = (f) => files.set(f, fs.existsSync(f) ? fs.readFileSync(f) : null);
  for (const f of [paths.bundled, paths.tsFile, paths.ledger, paths.shippedIds, paths.retiredIds, archive]) grab(f);
  if (fs.existsSync(paths.snapshotDir)) {
    for (const f of fs.readdirSync(paths.snapshotDir)) grab(path.join(paths.snapshotDir, f));
  }
  return files;
}

function restoreFiles(paths, files) {
  for (const [f, buf] of files) {
    if (buf === null) fs.rmSync(f, { force: true });
    else {
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, buf);
    }
  }
  // Snapshot files created by the failed publish.
  if (fs.existsSync(paths.snapshotDir)) {
    for (const f of fs.readdirSync(paths.snapshotDir)) {
      if (!files.has(path.join(paths.snapshotDir, f))) fs.rmSync(path.join(paths.snapshotDir, f), { force: true });
    }
  }
}

export class PublishError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = "PublishError";
    Object.assign(this, details);
  }
}

/**
 * Create a release.
 *
 * @param {ReturnType<typeof import("./content-paths.mjs").makePaths>} paths
 * @param {{ bump?: "patch"|"minor"|"major", notes?: string, log?: (m: string) => void,
 *           runChecks?: (paths: any, log: any) => void, strictReview?: boolean, now?: Date }} [opts]
 */
export function publishRelease(paths, opts = {}) {
  const { bump, notes = "", log = () => {}, runChecks = defaultChecks, strictReview = true, now = new Date() } = opts;
  if (bump && !BUMPS.includes(bump)) throw new PublishError(`Unknown bump "${bump}" (use patch, minor or major).`);

  const ledger = readLedger(paths);
  const last = lastRelease(ledger);
  const state = describeState(paths, { withDiff: false });

  // 1. Nothing to publish?
  if (last && state.published) {
    throw new PublishError(`Nothing to publish: content already matches ${last.version}.`);
  }

  // 2. Work out the version.
  const diff = diffAgainstRelease(paths, last);
  const schemaChanged = !!last && last.schemaVersion !== state.schemaVersion;
  const suggestion = suggestBump(diff, { schemaChanged });
  let version;
  let appliedBump;
  if (!last) {
    version = "1.0.0";
    appliedBump = "baseline";
  } else {
    appliedBump = bump ?? suggestion.bump;
    if (BUMP_RANK[appliedBump] < BUMP_RANK[suggestion.bump]) {
      throw new PublishError(
        `Bump "${appliedBump}" is below the suggested "${suggestion.bump}" (${suggestion.reasons.join(", ")}).`,
        { suggestion },
      );
    }
    version = bumpVersion(last.version, appliedBump);
  }
  log(`Publishing ${version} (${appliedBump}${bump || !last ? "" : ", suggested"}): ${suggestion.reasons.join(", ") || "no row changes"}`);

  // 3. Validate (release gate).
  log("Validating content…");
  const readDb = new DatabaseSync(paths.master, { readOnly: true });
  let shippedNow;
  try {
    const result = validateDatabase(readDb, { strictReview, shipped: readShipped(paths), retired: readRetired(paths) });
    if (result.errors.length) {
      const sample = result.errors.slice(0, 8).map((f) => `  ${f.table} ${f.id} :: ${f.field} :: ${f.message}`).join("\n");
      throw new PublishError(`Validation failed with ${result.errors.length} error(s):\n${sample}`, { errors: result.errors });
    }
    shippedNow = collectShippedIds(readDb);
  } finally {
    readDb.close();
  }

  // 4. Typecheck, icons.
  runChecks(paths, log);

  // 5. Backup, then write everything. Failures roll the files back.
  log("Taking pre-publish backup…");
  const backup = createBackup(paths, "pre-publish", version, now);
  const archive = archivePath(paths, version);
  const before = captureFiles(paths, archive);
  try {
    const db = new DatabaseSync(paths.master, { readOnly: true });
    let files;
    try {
      files = dumpSnapshot(db);
    } finally {
      db.close();
    }
    const hash = hashSnapshot(files);
    writeSnapshot(paths.snapshotDir, files);

    // Archive (restorable master copy, no content_meta).
    fs.mkdirSync(paths.releasesDir, { recursive: true });
    const dir = tempDir();
    try {
      const copy = path.join(dir, "release.db");
      vacuumCopy(paths.master, copy);
      fs.writeFileSync(archive, zlib.gzipSync(fs.readFileSync(copy), { level: 9 }));
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    const entry = {
      version,
      date: localDate(now),
      bump: appliedBump,
      schemaVersion: state.schemaVersion,
      contentHash: hash,
      summary: { added: diff.counts.added, changed: diff.counts.changed, retired: diff.counts.retired },
      notes: notes.trim(),
      update: { channel: "production", groupId: null },
      ...(strictReview ? {} : { unreviewedAllowed: true }),
    };
    ledger.releases.push(entry);
    writeJson(paths.ledger, ledger);

    // Shipped ids only ever grow.
    const shipped = readShipped(paths);
    for (const [table, ids] of Object.entries(shippedNow)) {
      shipped[table] = [...new Set([...(shipped[table] ?? []), ...ids])].sort();
    }
    writeJson(paths.shippedIds, shipped);

    buildBundle(paths, { version, hash, schemaVersion: state.schemaVersion, builtAt: entry.date });
    writeVersionConstant(paths, version);

    log(`Release ${version} written.`);
    const firstLine = entry.notes.split("\n")[0] || `Content ${version}`;
    return {
      release: entry,
      backup,
      commands: [
        "git add content assets services/content-db.ts",
        `git commit -m "content: release ${version}"`,
        `git tag content-v${version}`,
        `eas update --channel production --message ${JSON.stringify(`Content ${version}: ${firstLine}`)}`,
        `npm run release:content -- --record-update <update-group-id>`,
      ],
    };
  } catch (err) {
    restoreFiles(paths, before);
    log("Publish failed; derived files restored.");
    throw err;
  }
}

/** Load a past release into the master DB as a draft (spec §3.7 "Rollback"). */
export function restoreRelease(paths, version, { force = false } = {}) {
  if (studioIsRunning(paths)) {
    throw new Error("Content Studio is running. Use its Releases view, or stop it first.");
  }
  const ledger = readLedger(paths);
  if (!ledger.releases.some((r) => r.version === version)) throw new Error(`Unknown release ${version}`);
  const extracted = extractArchive(paths, version);
  try {
    return restoreMasterFrom(paths, extracted, { force });
  } finally {
    fs.rmSync(path.dirname(extracted), { recursive: true, force: true });
  }
}

/** Remember which EAS update group carried a release (default: the newest). */
export function recordUpdate(paths, groupId, { version, channel } = {}) {
  const ledger = readLedger(paths);
  const target = version ? ledger.releases.find((r) => r.version === version) : lastRelease(ledger);
  if (!target) throw new Error(version ? `Unknown release ${version}` : "No releases yet");
  target.update = { channel: channel ?? target.update?.channel ?? "production", groupId };
  writeJson(paths.ledger, ledger);
  return target;
}
