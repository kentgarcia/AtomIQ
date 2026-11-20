/**
 * Table metadata, snapshot dumping and database diffing for the content DB.
 *
 * Tables are discovered from the database itself, so adding a table needs no
 * change here. JSON columns are detected from their `json_valid(col)` CHECK.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

/** Columns that change on every edit and carry no content. */
export const TIMESTAMP_COLS = new Set(["created_at", "updated_at"]);

/** Tables whose single `id` column is referenced by user state or other content (spec §3.5). */
export const SHIPPED_ID_TABLES = [
  "units",
  "objectives",
  "lessons",
  "path_nodes",
  "items",
  "myths",
  "encyclopedia_entries",
  "npcs",
  "npc_lines",
  "feed_templates",
  "blog_posts",
  "chat_nodes",
  "scan_targets",
  "safety_cards",
  "map_sites",
];

/** Parent entity → child table that is edited and versioned together with it. */
export const ENTITY_CHILDREN = {
  lessons: { table: "lesson_cards", fk: "lesson_id" },
  blog_posts: { table: "blog_comments", fk: "blog_id" },
};

/**
 * Parent entity → link table (plain rows of ids, no position) that is saved and versioned with it:
 * a blog piece and the sources it cites.
 */
export const ENTITY_LINKS = {
  blog_posts: { table: "blog_references", fk: "blog_id", column: "reference_id" },
  scan_targets: { table: "scan_target_references", fk: "target_id", column: "reference_id" },
  safety_cards: { table: "safety_card_references", fk: "card_id", column: "reference_id" },
  map_sites: { table: "map_site_references", fk: "site_id", column: "reference_id" },
};

/** Child table → { parent, fk } (inverse of ENTITY_CHILDREN). */
export const PARENT_OF = Object.fromEntries(
  Object.entries(ENTITY_CHILDREN).map(([parent, c]) => [c.table, { parent, fk: c.fk }]),
);

const tableInfoCache = new WeakMap();

export function openDb(file, options = {}) {
  const db = new DatabaseSync(file, options);
  if (!options.readOnly) db.exec("PRAGMA foreign_keys = ON");
  return db;
}

/** Plain table/column names only: they are interpolated into SQL. */
export function ident(s) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(String(s))) throw new Error(`Invalid identifier: ${s}`);
  return String(s);
}

export function listContentTables(db) {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != 'content_meta' ORDER BY name",
    )
    .all()
    .map((r) => r.name);
}

export function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

/** @returns {{ name: string, cols: any[], pkCols: string[], jsonCols: Set<string> }} */
export function tableInfo(db, table) {
  const t = ident(table);
  let perDb = tableInfoCache.get(db);
  if (!perDb) tableInfoCache.set(db, (perDb = new Map()));
  if (perDb.has(t)) return perDb.get(t);
  const cols = db.prepare(`PRAGMA table_info(${t})`).all();
  if (!cols.length) throw new Error(`Unknown table: ${t}`);
  const pkCols = cols.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name=?").get(t)?.sql ?? "";
  const jsonCols = new Set([...sql.matchAll(/json_valid\((\w+)\)/g)].map((m) => m[1]));
  const info = { name: t, cols, pkCols, jsonCols };
  perDb.set(t, info);
  return info;
}

/** Drop cached column info after a schema change (e.g. a migration ran). */
export function resetTableInfoCache(db) {
  tableInfoCache.delete(db);
}

/** Parse the JSON columns of a raw row; unparseable values are kept as strings. */
export function hydrateRow(row, jsonCols) {
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (jsonCols.has(k) && typeof v === "string") {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = v;
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

const pkString = (row, pkCols) => pkCols.map((c) => String(row[c])).join("\u0000");

/** Stable key used to match rows between two databases: `a~b` (same format as Studio row urls). */
export function pkKey(row, pkCols) {
  return pkCols.map((c) => encodeURIComponent(String(row[c]))).join("~");
}

function sortRows(rows, pkCols, colNames) {
  // Children read most naturally in `position` order within their parent.
  const byPosition = pkCols.length === 2 && colNames.includes("position");
  const keyOf = (r) => (byPosition ? `${r[pkCols[0]]}\u0000${String(r.position).padStart(8, "0")}` : pkString(r, pkCols));
  return [...rows].sort((a, b) => (keyOf(a) < keyOf(b) ? -1 : keyOf(a) > keyOf(b) ? 1 : 0));
}

/** Rows of one table in snapshot form: sorted, JSON parsed, timestamps removed. */
export function snapshotRows(db, table) {
  const { cols, pkCols, jsonCols } = tableInfo(db, table);
  const colNames = cols.map((c) => c.name);
  const order = pkCols.length ? pkCols.map(ident).join(", ") : "rowid";
  const rows = db.prepare(`SELECT * FROM ${ident(table)} ORDER BY ${order}`).all();
  const out = rows.map((r) => {
    const h = hydrateRow(r, jsonCols);
    for (const c of TIMESTAMP_COLS) delete h[c];
    return h;
  });
  return sortRows(out, pkCols, colNames);
}

/** @returns {Map<string, string>} table name → snapshot file text */
export function dumpSnapshot(db) {
  const files = new Map();
  for (const table of listContentTables(db)) {
    const { pkCols } = tableInfo(db, table);
    const body = { table, primaryKey: pkCols, rows: snapshotRows(db, table) };
    files.set(table, `${JSON.stringify(body, null, 2)}\n`);
  }
  return files;
}

/** First 12 hex digits of sha256 over every snapshot file (name + text, sorted by name). */
export function hashSnapshot(files) {
  const h = crypto.createHash("sha256");
  for (const name of [...files.keys()].sort()) {
    h.update(name);
    h.update("\u0000");
    h.update(files.get(name));
    h.update("\u0000");
  }
  return h.digest("hex").slice(0, 12);
}

/** Write snapshot files, touching only those that changed and removing stale ones. */
export function writeSnapshot(dir, files) {
  fs.mkdirSync(dir, { recursive: true });
  const keep = new Set();
  let changed = 0;
  for (const [table, text] of files) {
    const file = path.join(dir, `${table}.json`);
    keep.add(`${table}.json`);
    let current = null;
    try {
      current = fs.readFileSync(file, "utf8");
    } catch {
      /* new file */
    }
    if (current !== text) {
      fs.writeFileSync(file, text);
      changed++;
    }
  }
  for (const f of fs.readdirSync(dir)) {
    if (f.endsWith(".json") && !keep.has(f)) {
      fs.rmSync(path.join(dir, f));
      changed++;
    }
  }
  return changed;
}

/** Content hash of an open database (see hashSnapshot). */
export function contentHash(db) {
  return hashSnapshot(dumpSnapshot(db));
}

/**
 * Row-level diff between two databases, keyed by primary key.
 * Comparison ignores timestamps and JSON formatting.
 *
 * @returns {{
 *   tables: Record<string, { added: string[], changed: string[], removed: string[] }>,
 *   counts: { added: Record<string, number>, changed: Record<string, number>, retired: Record<string, number> },
 *   removedIds: Record<string, string[]>,
 *   total: number,
 * }}
 */
export function diffDatabases(oldDb, newDb) {
  const names = new Set([
    ...(oldDb ? listContentTables(oldDb) : []),
    ...(newDb ? listContentTables(newDb) : []),
  ]);
  const tables = {};
  const counts = { added: {}, changed: {}, retired: {} };
  const removedIds = {};
  let total = 0;
  for (const table of [...names].sort()) {
    const has = (db) => db && tableExists(db, table);
    const oldRows = has(oldDb) ? snapshotRows(oldDb, table) : [];
    const newRows = has(newDb) ? snapshotRows(newDb, table) : [];
    const pkCols = has(newDb) ? tableInfo(newDb, table).pkCols : tableInfo(oldDb, table).pkCols;
    const oldMap = new Map(oldRows.map((r) => [pkKey(r, pkCols), JSON.stringify(r)]));
    const newMap = new Map(newRows.map((r) => [pkKey(r, pkCols), JSON.stringify(r)]));
    const added = [];
    const changed = [];
    const removed = [];
    for (const [k, v] of newMap) {
      if (!oldMap.has(k)) added.push(k);
      else if (oldMap.get(k) !== v) changed.push(k);
    }
    for (const k of oldMap.keys()) if (!newMap.has(k)) removed.push(k);
    if (!added.length && !changed.length && !removed.length) continue;
    tables[table] = { added, changed, removed };
    if (added.length) counts.added[table] = added.length;
    if (changed.length) counts.changed[table] = changed.length;
    if (removed.length) {
      counts.retired[table] = removed.length;
      removedIds[table] = removed.map(decodeURIComponent);
    }
    total += added.length + changed.length + removed.length;
  }
  return { tables, counts, removedIds, total };
}

/** Ids of every shipped-id table in an open database. */
export function collectShippedIds(db) {
  const out = {};
  for (const table of SHIPPED_ID_TABLES) {
    if (!tableExists(db, table)) continue;
    out[table] = db.prepare(`SELECT id FROM ${table} ORDER BY id`).all().map((r) => r.id);
  }
  return out;
}
