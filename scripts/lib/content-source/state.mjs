/**
 * content/source/.state.json (spec 8.1): per owned table, a hash of the DB rows as the last sync or export left
 * them. It is how sync notices that the database was changed behind the files' back (drift). Committed.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const STATE_VERSION = 1;

const canon = (v) => {
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  return JSON.stringify(v);
};

/** A hash of a table's rows that ignores row order, JSON key order and timestamps (snapshot rows have none). */
export function hashRows(rows) {
  const lines = rows.map(canon).sort();
  return crypto.createHash("sha256").update(lines.join("\n")).digest("hex").slice(0, 16);
}

export const stateFile = (sourceDir) => path.join(sourceDir, ".state.json");

export function readState(sourceDir) {
  const file = stateFile(sourceDir);
  if (!fs.existsSync(file)) return { version: STATE_VERSION, tables: {} };
  const s = JSON.parse(fs.readFileSync(file, "utf8"));
  return { version: s.version ?? STATE_VERSION, tables: s.tables ?? {} };
}

/** Record the hashes for `rowsByTable` (merged into what is there). */
export function writeState(sourceDir, rowsByTable) {
  const state = readState(sourceDir);
  for (const [t, rows] of Object.entries(rowsByTable)) state.tables[t] = hashRows(rows);
  const sorted = Object.fromEntries(Object.keys(state.tables).sort().map((k) => [k, state.tables[k]]));
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.writeFileSync(stateFile(sourceDir), `${JSON.stringify({ version: STATE_VERSION, tables: sorted }, null, 2)}\n`);
}
