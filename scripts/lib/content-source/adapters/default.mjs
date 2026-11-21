/**
 * The default adapter (spec 5.1): derived from the schema, so EVERY table has a lossless text form from day one.
 * It is deliberately plain: record keyword = table name, header = primary key parts, one attribute per column in
 * schema order, `position` written as an ordinary int. It is the proof the core can carry any table (test T1) and
 * the starting point for a table that has no friendly adapter yet.
 */
import { TIMESTAMP_COLS, snapshotRows, tableInfo } from "../../content-tables.mjs";
import { defineAdapter } from "./engine.mjs";

const DEFAULT_ADAPTER_VERSION = 1;

/** The SQL default of a column as a JS value, or undefined when it is an expression (a timestamp, say). */
function defaultOf(col, isJson) {
  const d = col.dflt_value;
  if (d == null) return undefined;
  const lit = /^'(.*)'$/.exec(d);
  const raw = lit ? lit[1].replace(/''/g, "'") : /^-?\d+(\.\d+)?$/.test(d) ? Number(d) : undefined;
  if (raw === undefined) return undefined;
  if (isJson && typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }
  return raw;
}

function typeOf(col, isJson) {
  if (isJson) return "json";
  const t = String(col.type).toUpperCase();
  if (t.includes("INT")) return "int";
  if (t.includes("REAL") || t.includes("FLOA") || t.includes("DOUB")) return "num";
  return "text";
}

/** One RecordSpec from the schema of a table. */
export function defaultRecordSpec(db, table) {
  const { cols, pkCols, jsonCols } = tableInfo(db, table);
  const fields = [];
  for (const c of cols) {
    if (pkCols.includes(c.name) || TIMESTAMP_COLS.has(c.name)) continue;
    const isJson = jsonCols.has(c.name);
    const f = { col: c.name, type: typeOf(c, isJson), nullable: !c.notnull };
    const d = defaultOf(c, isJson);
    if (d !== undefined) f.default = d;
    fields.push(f);
  }
  return { keyword: table, table, id: pkCols, fields };
}

/** @param {import("node:sqlite").DatabaseSync} db @param {string[]} tables */
export function makeDefaultAdapter(db, tables) {
  return defineAdapter({
    name: "default",
    version: DEFAULT_ADAPTER_VERSION,
    owns: (rel) => /^[a-z_][a-z0-9_]*\.atomiq$/.test(rel),
    records: tables.map((t) => defaultRecordSpec(db, t)),
    layout(rowsByTable) {
      return tables
        .filter((t) => (rowsByTable[t] ?? []).length)
        .map((t) => ({ path: `${t}.atomiq`, scope: {}, items: rowsByTable[t].map((row) => ({ keyword: t, row })) }));
    },
  });
}

/** Rows of the given tables in the form every adapter works on: JSON parsed, no timestamps, deterministic order. */
export function readRowsByTable(db, tables) {
  return Object.fromEntries(tables.map((t) => [t, snapshotRows(db, t)]));
}
