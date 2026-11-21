/**
 * content:sync (spec section 8): files -> database. Parse the files of the owned adapters, derive the rows they say
 * should exist, diff them against the database, and turn the difference into ONE `applyBatch` (one transaction, one
 * validation pass, the "no new error anywhere" check). A dry run by default; git is the undo.
 */
import path from "node:path";

import { checksFor } from "../content-checks.mjs";
import { backupUnlessIdentical } from "../backup.mjs";
import { applyBatchToMaster, dryRunBatch, printFailure, short, verifyChecks } from "../content-batch-run.mjs";
import { StoreError } from "../content-store.mjs";
import { SHIPPED_ID_TABLES, TIMESTAMP_COLS, openDb, tableInfo } from "../content-tables.mjs";
import { readShipped } from "../releases.mjs";
import { readRowsByTable } from "./adapters/default.mjs";
import { sameValue } from "./core/values.mjs";
import { SourceError } from "./core/errors.mjs";
import { canonicalizeText, readFiles } from "./pipeline.mjs";
import { readSourceFiles, strayFiles } from "./files.mjs";
import { ownedAdapters } from "./owned.mjs";
import { hashRows, readState, writeState } from "./state.mjs";

const pkOf = (row, pkCols) => pkCols.map((c) => String(row[c])).join("\u0000");

/** Tables whose UNIQUE index includes `position`: a reorder passes through temporary negative values. */
function uniquePositionTables(db, tables) {
  const out = new Set();
  for (const t of tables) {
    for (const idx of db.prepare(`PRAGMA index_list(${t})`).all()) {
      if (!idx.unique) continue;
      if (db.prepare(`PRAGMA index_info(${idx.name})`).all().some((c) => c.name === "position")) out.add(t);
    }
  }
  return out;
}

/** Rows of one table that differ between the database and the files. */
export function diffTable(db, table, current, desired) {
  const { pkCols, cols } = tableInfo(db, table);
  const colNames = cols.map((c) => c.name).filter((c) => !TIMESTAMP_COLS.has(c));
  const cur = new Map(current.map((r) => [pkOf(r, pkCols), r]));
  const want = new Map(desired.map((r) => [pkOf(r, pkCols), r]));
  const inserts = [];
  const updates = [];
  const deletes = [];
  for (const [k, row] of want) {
    const was = cur.get(k);
    if (!was) {
      inserts.push(row);
      continue;
    }
    const set = {};
    for (const c of colNames) if (c in row && !sameValue(was[c], row[c])) set[c] = row[c];
    if (Object.keys(set).length) updates.push({ row, was, set, moved: Object.keys(set).length === 1 && "position" in set });
  }
  for (const [k, row] of cur) if (!want.has(k)) deletes.push(row);
  return { pkCols, inserts, updates, deletes };
}

/** The batch of operations that makes the database match the files. */
export function buildOps(db, adapter, diffs, { retire, shipped }) {
  const unique = uniquePositionTables(db, adapter.tableOrder);
  const ops = [];
  const pk = (row, pkCols) => (pkCols.length === 1 ? String(row[pkCols[0]]) : pkCols.map((c) => String(row[c])));
  // 1) free the positions that are about to change or disappear
  for (const t of adapter.tableOrder) {
    if (!unique.has(t)) continue;
    const d = diffs[t];
    let n = 0;
    for (const u of d.updates) if ("position" in u.set) ops.push({ op: "update", table: t, pk: pk(u.was, d.pkCols), set: { position: -(++n) } });
    for (const r of d.deletes) ops.push({ op: "update", table: t, pk: pk(r, d.pkCols), set: { position: -(++n) } });
  }
  // 2) deletes, children before parents
  for (const t of [...adapter.tableOrder].reverse()) {
    const d = diffs[t];
    const isShipped = SHIPPED_ID_TABLES.includes(t);
    for (const r of d.deletes) {
      const op = { op: "delete", table: t, pk: pk(r, d.pkCols) };
      if (isShipped && (shipped[t] ?? []).includes(String(r[d.pkCols[0]]))) op.retire = retire;
      ops.push(op);
    }
  }
  // 3) inserts, parents before children; 4) updates
  for (const t of adapter.tableOrder) for (const r of diffs[t].inserts) ops.push({ op: "insert", table: t, values: r });
  for (const t of adapter.tableOrder) {
    const d = diffs[t];
    for (const u of d.updates) ops.push({ op: "update", table: t, pk: pk(u.was, d.pkCols), set: u.set });
  }
  return ops;
}

/** Parse the files of an adapter into rows. Throws SourceError (with file:line) on the first problem. */
export function loadDesired(paths, adapter) {
  const files = readSourceFiles(paths.sourceDir, adapter.owns);
  const { rows, where } = readFiles(adapter, files);
  return { files, rows, where };
}

/**
 * @param {{ paths: object, names?: string[], retire?: string }} opts
 * @returns the plan: per adapter files, rows, diffs; the operations; drift; shipped deletes; warnings
 */
export function planSync({ paths, names, retire }) {
  const adapters = ownedAdapters().filter((a) => !names?.length || names.includes(a.name));
  if (names?.length) {
    const missing = names.filter((n) => !adapters.some((a) => a.name === n));
    if (missing.length) throw new Error(`Not an owned adapter: ${missing.join(", ")}`);
  }
  const db = openDb(paths.master, { readOnly: true });
  try {
    const shipped = readShipped(paths);
    const state = readState(paths.sourceDir);
    const plan = { adapters: [], ops: [], drift: [], warnings: [], shippedDeletes: [], tables: new Set(), diffs: {}, desiredRows: {}, files: 0 };
    for (const adapter of adapters) {
      const { files, rows } = loadDesired(paths, adapter);
      plan.files += files.size;
      const current = readRowsByTable(db, [...adapter.tables]);
      const diffs = {};
      for (const t of adapter.tableOrder) {
        diffs[t] = diffTable(db, t, current[t], rows[t] ?? []);
        plan.diffs[t] = diffs[t];
        plan.desiredRows[t] = rows[t] ?? [];
        const recorded = state.tables[t];
        if (recorded && recorded !== hashRows(current[t])) plan.drift.push({ table: t, rows: current[t].length });
      }
      for (const [rel, text] of files) {
        try {
          if (canonicalizeText(adapter, text, rel) !== text) plan.warnings.push(`${rel}: not in canonical form (run npm run content:format)`);
        } catch (e) {
          if (!(e instanceof SourceError)) throw e;
        }
      }
      const ops = buildOps(db, adapter, diffs, { retire: retire ?? "", shipped });
      for (const op of ops) {
        if (op.op === "delete" && "retire" in op && !op.retire?.trim()) plan.shippedDeletes.push(`${op.table} ${[op.pk].flat().join(" ")}`);
        if (op.op !== "update" || !("position" in op.set) || op.set.position >= 0) plan.tables.add(op.table);
      }
      plan.ops.push(...ops);
      plan.adapters.push(adapter.name);
    }
    for (const rel of strayFiles(paths.sourceDir)) plan.warnings.push(`${rel}: not a .atomiq file (only .atomiq, README.md and .state.json belong in content/source)`);
    return plan;
  } finally {
    db.close();
  }
}

/** Counts per table for the report. */
export function summarize(plan) {
  return Object.entries(plan.diffs).map(([table, d]) => ({
    table,
    inserts: d.inserts.length,
    updates: d.updates.filter((u) => !u.moved).length,
    moved: d.updates.filter((u) => u.moved).length,
    deletes: d.deletes.length,
  }));
}

export const hasChanges = (plan) => summarize(plan).some((s) => s.inserts || s.updates || s.moved || s.deletes);

function printPlan(plan, log, full) {
  for (const s of summarize(plan)) {
    if (!(s.inserts || s.updates || s.moved || s.deletes)) continue;
    log(`${s.table}: ${s.inserts} to add, ${s.updates} to change, ${s.moved} moved, ${s.deletes} to delete`);
  }
  const lines = [];
  for (const [table, d] of Object.entries(plan.diffs)) {
    for (const r of d.deletes) lines.push(`  DELETE ${table}[${d.pkCols.map((c) => r[c]).join(",")}]`);
  }
  for (const [table, d] of Object.entries(plan.diffs)) {
    for (const r of d.inserts) lines.push(`  insert ${table}[${d.pkCols.map((c) => r[c]).join(",")}]`);
    for (const u of d.updates.filter((x) => !x.moved)) {
      const f = Object.entries(u.set).map(([k, v]) => `${k}: ${short(u.was[k], 50)} → ${short(v, 50)}`);
      lines.push(`  update ${table}[${d.pkCols.map((c) => u.was[c]).join(",")}]  ${f.join("; ")}`);
    }
  }
  const shown = full ? lines : lines.slice(0, 40);
  if (shown.length) log(shown.join("\n"));
  if (shown.length < lines.length) log(`  … ${lines.length - shown.length} more (--full shows all)`);
}

/**
 * @returns {Promise<number>} the exit code
 */
export async function runSync({ paths, names, apply = false, retire, force = false, verify = true, full = false, log = console.log, err = console.error }) {
  let plan;
  try {
    plan = planSync({ paths, names, retire });
  } catch (e) {
    if (e instanceof SourceError) {
      err(`✗ ${e.format()}`);
      err("Nothing was read from or written to the database.");
      return 1;
    }
    throw e;
  }
  log(`Source: ${plan.files} file(s) of ${plan.adapters.join(", ")}`);
  printPlan(plan, log, full);
  for (const w of plan.warnings) log(`  warning: ${w}`);

  if (plan.drift.length) {
    err(`✗ The database was changed since the last sync or export: ${plan.drift.map((d) => `${d.table} (${d.rows} rows)`).join(", ")}.`);
    if (!force) {
      err("  Those changes are not in the files and a sync would overwrite them. Run `npm run content:export -- <adapter> --force` to take them into the files,");
      err("  or pass --force to overwrite the database from the files.");
      return 1;
    }
    log("  --force: overwriting the database from the files.");
  }
  if (!hasChanges(plan)) {
    log("Nothing to do: the database already matches the files.");
    if (apply) writeState(paths.sourceDir, plan.desiredRows);
    return 0;
  }
  if (plan.shippedDeletes.length && !retire?.trim()) {
    err(`✗ ${plan.shippedDeletes.length} id(s) to delete have shipped to users: ${plan.shippedDeletes.slice(0, 8).join(", ")}${plan.shippedDeletes.length > 8 ? ", …" : ""}`);
    err('  Deleting a shipped id retires it. Add --retire "<reason>" (or put the node back).');
    return 1;
  }

  let preview;
  try {
    preview = dryRunBatch(paths, plan.ops, "sync");
  } catch (e) {
    if (e instanceof StoreError) {
      printFailure(e, err);
      err("Nothing was changed.");
      return 1;
    }
    throw e;
  }
  log(`Validation passed (${preview.changes.length} row change(s)${preview.warnings.length ? `, ${preview.warnings.length} warning(s)` : ""}).`);
  if (!apply) {
    log("Dry run only. Add --apply to write it.");
    return 0;
  }

  const backup = backupUnlessIdentical(paths, "pre-script", `sync-${plan.adapters.join("-")}`);
  log(backup.created ? `Backup: ${path.relative(paths.root, backup.file)}` : "Backup: the newest one already holds this exact content.");
  const result = applyBatchToMaster(paths, plan.ops, "sync");
  log(`Applied ${result.changes.length} change(s) (a draft: publish with \`npm run release:content -- --publish\`).`);
  const db = openDb(paths.master, { readOnly: true });
  try {
    const touched = Object.keys(plan.desiredRows);
    writeState(paths.sourceDir, readRowsByTable(db, touched));
  } finally {
    db.close();
  }
  if (!verify) return 0;
  const ok = await verifyChecks(paths, checksFor(new Set(result.changes.map((c) => c.table))), log);
  if (!ok) {
    err(`The sync is applied but a check failed. To undo it: restore ${path.relative(paths.root, backup.file)} from Studio > Backups, or git-revert the source files and sync again.`);
    return 1;
  }
  return 0;
}

/** `content:sync --check`: changes nothing; exit 1 if the files cannot be read or differ from the database. */
export function checkSync({ paths, names, log = console.log, err = console.error }) {
  let plan;
  try {
    plan = planSync({ paths, names });
  } catch (e) {
    if (e instanceof SourceError) {
      err(`✗ ${e.format()}`);
      return 1;
    }
    throw e;
  }
  for (const w of plan.warnings) log(`warning: ${w}`);
  if (hasChanges(plan)) {
    err("✗ The source files and the database differ:");
    for (const s of summarize(plan)) if (s.inserts || s.updates || s.moved || s.deletes) err(`  ${s.table}: ${s.inserts} to add, ${s.updates} to change, ${s.moved} moved, ${s.deletes} to delete`);
    err("  Run `npm run content:sync` to see the changes, then `--apply`.");
    return 1;
  }
  log(`ok: ${plan.files} source file(s) of ${plan.adapters.join(", ")} match the database`);
  return 0;
}
