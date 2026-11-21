/**
 * Paths used by the content tooling (sync, release, backup, Studio).
 *
 * Everything is derived from one root so tests can point the whole toolchain at
 * a throwaway copy of the repo layout instead of touching real content.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * @param {string} [root] repo root (defaults to $ATOMIQ_ROOT, then this repository)
 * @param {{ master?: string }} [opts] override the master DB path (relative to root; defaults to $ATOMIQ_DB)
 */
export function makePaths(root = process.env.ATOMIQ_ROOT || REPO_ROOT, opts = {}) {
  const content = path.join(root, "content");
  const masterOverride = opts.master ?? process.env.ATOMIQ_DB;
  return {
    root,
    master: masterOverride ? path.resolve(root, masterOverride) : path.join(content, "database", "content.db"),
    bundled: path.join(root, "assets", "database", "content.db"),
    tsFile: path.join(root, "services", "content-db.ts"),
    snapshotDir: path.join(content, "snapshot"),
    releasesDir: path.join(content, "releases"),
    ledger: path.join(content, "releases.json"),
    shippedIds: path.join(content, "shipped-ids.json"),
    retiredIds: path.join(content, "retired-ids.json"),
    sourceDir: path.join(content, "source"),
    backupDir: path.join(content, "backups"),
    historyDb: path.join(content, "database", "studio-history.db"),
    studioLock: path.join(content, "database", ".studio.lock"),
  };
}
