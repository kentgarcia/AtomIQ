/**
 * Running a batch of content operations (see `applyBatch` in content-store.mjs) the way every CLI should:
 * first on a throwaway copy of the master (nothing real is touched), then for real after a backup, then the
 * tests that read the touched tables. Shared by `content:edit` and `content:sync`.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { createStore, openHistory } from "./content-store.mjs";
import { openDb } from "./content-tables.mjs";

export const short = (v, n = 70) => {
  const t = typeof v === "string" ? v : JSON.stringify(v);
  const flat = String(t ?? "null").replace(/\s+/g, " ");
  return JSON.stringify(flat.length > n ? `${flat.slice(0, n - 1)}…` : flat);
};

/** Run the batch against `db` (a throwaway copy or the real master). */
export function runOn(db, historyFile, batchPaths, ops, source) {
  const history = openHistory(historyFile);
  try {
    return createStore({ db, history, paths: batchPaths }).applyBatch({ ops, source });
  } finally {
    history.close();
  }
}

/** The whole batch on a copy of the master: nothing real is touched. Throws what applyBatch throws. */
export function dryRunBatch(paths, ops, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atomiq-batch-"));
  try {
    const master = path.join(dir, "content.db");
    const src = new DatabaseSync(paths.master, { readOnly: true });
    try {
      src.exec(`VACUUM INTO '${master.replace(/'/g, "''")}'`);
    } finally {
      src.close();
    }
    const retiredIds = path.join(dir, "retired-ids.json");
    if (fs.existsSync(paths.retiredIds)) fs.copyFileSync(paths.retiredIds, retiredIds);
    const db = openDb(master);
    try {
      return runOn(db, path.join(dir, "history.db"), { ...paths, master, retiredIds }, ops, source);
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** The batch on the real master, recorded in the same history as Studio. */
export function applyBatchToMaster(paths, ops, source) {
  const db = openDb(paths.master);
  db.exec("PRAGMA busy_timeout = 5000");
  try {
    return runOn(db, paths.historyDb, paths, ops, source);
  } finally {
    db.close();
  }
}

export function printFailure(err, log = console.error) {
  log(`✗ ${err.message}`);
  for (const e of err.errors ?? []) log(`  - ${e.table} ${e.id} :: ${e.field} :: ${e.message}`);
}

export function printReport(result, { full = false, log = console.log } = {}) {
  const lines = result.changes.map((c) => {
    const where = `${c.table}[${c.pk.join(",")}]`;
    if (c.op === "update") {
      const f = Object.entries(c.fields).map(([k, [b, a]]) => `${k}: ${short(b)} → ${short(a)}`);
      return `  update ${where}  ${f.join("; ")}`;
    }
    if (c.op === "insert") return `  insert ${where}  ${Object.keys(c.values).length} field(s)`;
    return `  delete ${where}`;
  });
  const shown = full ? lines : lines.slice(0, 40);
  log(shown.join("\n"));
  if (shown.length < lines.length) log(`  … ${lines.length - shown.length} more (--full shows all)`);
  const tables = [...new Set(result.changes.map((c) => c.table))];
  log(`${result.changes.length} change(s) in ${tables.join(", ") || "no tables"}${result.skipped ? `; ${result.skipped} row(s) already had these values` : ""}`);
  for (const w of result.warnings.slice(0, 10)) log(`  warning: ${w.table} ${w.id} :: ${w.field} :: ${w.message}`);
  if (result.warnings.length > 10) log(`  … ${result.warnings.length - 10} more warning(s)`);
}

/** Run the test scripts that read the touched tables, all at once. */
export async function verifyChecks(paths, scripts, log = console.log) {
  if (!scripts.length) return true;
  log(`Checking: ${scripts.join(", ")}`);
  const runs = scripts.map(
    (name) =>
      new Promise((resolve) => {
        const t0 = Date.now();
        const child = spawn("npm", ["run", "-s", name], { cwd: paths.root, stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        child.on("close", (code) => resolve({ name, ok: code === 0, out, secs: (Date.now() - t0) / 1000 }));
      }),
  );
  let ok = true;
  for (const r of await Promise.all(runs)) {
    log(`  ${r.ok ? "✓" : "✗"} ${r.name} (${r.secs.toFixed(1)}s)`);
    if (!r.ok) {
      ok = false;
      log(r.out.trim().split("\n").slice(-25).join("\n"));
    }
  }
  return ok;
}
