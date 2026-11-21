/**
 * Whole-database backups for the content master DB (spec §3.8, "file backups").
 *
 * Backups are made with `VACUUM INTO`, which produces a consistent copy even
 * while Studio holds the database open in WAL mode. (Copying the raw file can
 * miss recent writes that still sit in the -wal sidecar.)
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { makePaths } from "./content-paths.mjs";
import { contentHash, diffDatabases, listContentTables } from "./content-tables.mjs";

export const BACKUP_REASONS = ["auto-daily", "pre-publish", "pre-restore", "pre-script", "manual"];

/** How many backups of each reason are kept. `manual` is never pruned. */
export const RETENTION = {
  "auto-daily": 14,
  "pre-publish": 20,
  "pre-restore": 20,
  "pre-script": 20,
  manual: Infinity,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const NAME_RE = /^content-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-([a-z-]+?)(?:--([a-z0-9-]+))?\.db$/;

const slug = (s) =>
  String(s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

const stampOf = (date) => date.toISOString().replace(/[:.]/g, "-");

function parseStamp(stamp) {
  // 2026-11-16T03-31-00-123Z → Date
  const m = stamp.match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/);
  return m ? new Date(`${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`) : null;
}

/**
 * @param {{ master: string, backupDir: string }} paths
 * @param {string} reason one of BACKUP_REASONS
 * @param {string} [label]
 * @returns {string} absolute path of the new backup
 */
export function createBackup(paths, reason, label, now = new Date()) {
  if (!BACKUP_REASONS.includes(reason)) throw new Error(`Unknown backup reason: ${reason}`);
  fs.mkdirSync(paths.backupDir, { recursive: true });
  const suffix = label && slug(label) ? `--${slug(label)}` : "";
  const dest = path.join(paths.backupDir, `content-${stampOf(now)}-${reason}${suffix}.db`);
  const db = new DatabaseSync(paths.master);
  try {
    db.exec(`VACUUM INTO '${dest.replace(/'/g, "''")}'`);
  } finally {
    db.close();
  }
  mirrorBackup(dest);
  pruneBackups(paths);
  return dest;
}

/** Optional off-machine copy (e.g. a cloud-synced folder). Failures never block a backup. */
function mirrorBackup(file) {
  const dir = process.env.ATOMIQ_BACKUP_DIR;
  if (!dir) return;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(file, path.join(dir, path.basename(file)));
  } catch (err) {
    console.warn(`[backup] Could not copy to ATOMIQ_BACKUP_DIR: ${err.message}`);
  }
}

/**
 * A restore point for the current master, unless the newest backup already holds exactly this
 * content (a re-run, or edits that changed nothing, then costs no extra file).
 * @returns {{ file: string, created: boolean }}
 */
export function backupUnlessIdentical(paths, reason, label) {
  const newest = listBackups(paths)[0];
  if (newest) {
    const a = new DatabaseSync(paths.master, { readOnly: true });
    const b = new DatabaseSync(newest.file, { readOnly: true });
    try {
      if (contentHash(a) === contentHash(b)) return { file: newest.file, created: false };
    } finally {
      a.close();
      b.close();
    }
  }
  return { file: createBackup(paths, reason, label), created: true };
}

/** @returns {Array<{ file: string, name: string, path: string, reason: string, label: string|null, createdAt: string, size: number }>} newest first */
export function listBackups(paths) {
  if (!fs.existsSync(paths.backupDir)) return [];
  const out = [];
  for (const name of fs.readdirSync(paths.backupDir)) {
    const m = name.match(NAME_RE);
    if (!m) continue;
    const file = path.join(paths.backupDir, name);
    const created = parseStamp(m[1]);
    out.push({
      file,
      name,
      path: file,
      reason: m[2],
      label: m[3] ?? null,
      createdAt: (created ?? fs.statSync(file).mtime).toISOString(),
      size: fs.statSync(file).size,
    });
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

export function pruneBackups(paths) {
  const removed = [];
  const byReason = new Map();
  for (const b of listBackups(paths)) {
    if (!byReason.has(b.reason)) byReason.set(b.reason, []);
    byReason.get(b.reason).push(b);
  }
  for (const [reason, list] of byReason) {
    const keep = RETENTION[reason] ?? Infinity;
    for (const b of list.slice(keep)) {
      fs.rmSync(b.file, { force: true });
      removed.push(b.name);
    }
  }
  return removed;
}

/** Take an `auto-daily` backup when the newest one is over 24 h old. Returns the path or null. */
export function maybeAutoDailyBackup(paths, now = new Date()) {
  const newest = listBackups(paths).find((b) => b.reason === "auto-daily");
  if (newest && now.getTime() - new Date(newest.createdAt).getTime() < DAY_MS) return null;
  return createBackup(paths, "auto-daily", undefined, now);
}

/** Row counts per table, for the Backups list. */
export function describeBackup(file) {
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    const counts = {};
    for (const t of listContentTables(db)) {
      counts[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n;
    }
    return counts;
  } finally {
    db.close();
  }
}

/** Summary of how a backup file differs from the current master. */
export function diffAgainstMaster(paths, file) {
  const a = new DatabaseSync(file, { readOnly: true });
  const b = new DatabaseSync(paths.master, { readOnly: true });
  try {
    const d = diffDatabases(a, b); // a → b: what changed since the backup
    return { total: d.total, counts: d.counts };
  } finally {
    a.close();
    b.close();
  }
}

/** PRAGMA quick_check plus a basic "is this a content DB" test. */
export function verifyDatabaseFile(file) {
  let db;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const check = db.prepare("PRAGMA quick_check").get();
    if (Object.values(check)[0] !== "ok") return { ok: false, error: "quick_check failed" };
    if (!listContentTables(db).includes("lessons")) return { ok: false, error: "no lessons table" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    db?.close();
  }
}

/** Compare table/column layouts of two database files. Returns a list of human-readable differences. */
export function schemaDifferences(fileA, fileB) {
  const shape = (file) => {
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      const out = {};
      for (const t of listContentTables(db)) {
        out[t] = db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name).join(",");
      }
      return out;
    } finally {
      db.close();
    }
  };
  const a = shape(fileA);
  const b = shape(fileB);
  const diffs = [];
  for (const t of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!(t in a)) diffs.push(`table ${t} is only in the current database`);
    else if (!(t in b)) diffs.push(`table ${t} is only in the restored file`);
    else if (a[t] !== b[t]) diffs.push(`columns of ${t} differ`);
  }
  return diffs;
}

/**
 * Replace the master with `source` (a verified database file).
 * Takes a `pre-restore` backup first. The caller must have closed any handle on
 * the master (Studio does this) because the sidecars are removed.
 *
 * @returns {{ preRestoreBackup: string }}
 */
export function restoreMasterFrom(paths, source, { force = false } = {}) {
  const verdict = verifyDatabaseFile(source);
  if (!verdict.ok) throw new Error(`Refusing to restore: ${verdict.error}`);
  if (fs.existsSync(paths.master)) {
    const diffs = schemaDifferences(paths.master, source);
    if (diffs.length && !force) {
      throw new Error(`Schema differs from the current database (${diffs.join("; ")}). Confirm to restore anyway.`);
    }
  }
  const preRestoreBackup = fs.existsSync(paths.master) ? createBackup(paths, "pre-restore") : null;
  const tmp = `${paths.master}.restore-tmp`;
  fs.copyFileSync(source, tmp);
  for (const ext of ["-wal", "-shm"]) fs.rmSync(`${paths.master}${ext}`, { force: true });
  fs.renameSync(tmp, paths.master);
  return { preRestoreBackup };
}

// ---------------------------------------------------------------------------
// Studio lock: stops CLI tools from replacing a database Studio has open.
// ---------------------------------------------------------------------------

export function writeStudioLock(paths) {
  fs.writeFileSync(paths.studioLock, String(process.pid));
}

export function clearStudioLock(paths) {
  try {
    if (fs.readFileSync(paths.studioLock, "utf8").trim() === String(process.pid)) fs.rmSync(paths.studioLock);
  } catch {
    /* already gone */
  }
}

/** True when a live Studio process holds the lock. Stale locks are removed. */
export function studioIsRunning(paths) {
  let pid;
  try {
    pid = Number(fs.readFileSync(paths.studioLock, "utf8").trim());
  } catch {
    return false;
  }
  if (!pid || pid === process.pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    fs.rmSync(paths.studioLock, { force: true });
    return false;
  }
}

/**
 * For one-off scripts under scripts/content-migration/: take a `pre-script`
 * backup of the database they are about to modify. No-op for a missing DB or a
 * dry run.
 *
 * @param {string} scriptName
 * @param {string} [dbPath] defaults to the master DB
 */
export function backupBeforeScript(scriptName, dbPath) {
  const paths = makePaths();
  const master = dbPath ? path.resolve(dbPath) : paths.master;
  if (!fs.existsSync(master)) return null;
  const file = createBackup({ ...paths, master }, "pre-script", scriptName);
  console.log(`[backup] pre-script backup: ${path.relative(paths.root, file)}`);
  return file;
}
