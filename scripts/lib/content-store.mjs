/**
 * Transactional, validated, history-recorded writes to the content master DB.
 *
 * Content Studio's API (and any script that wants the same safety) goes through
 * `createStore`. One call = one transaction: the SQL runs, the affected entity
 * is validated with the same rules as `npm run validate:content`, and only then
 * is it committed and recorded in the history database.
 *
 * "Entity" = a top-level row plus its children (a lesson and its steps, a quiz
 * and its questions, a maze and its rooms). Standalone rows are their own entity.
 */
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import { validateDatabase } from "./content-validate.mjs";
import {
  ENTITY_CHILDREN,
  PARENT_OF,
  SHIPPED_ID_TABLES,
  TIMESTAMP_COLS,
  ident,
  pkKey,
  tableInfo,
} from "./content-tables.mjs";
import { readRetired, readShipped } from "./releases.mjs";

const DAY_MS = 24 * 60 * 60 * 1000;
export const HISTORY_RETENTION_DAYS = 90;
export const HISTORY_MIN_REVISIONS = 50;

export class StoreError extends Error {
  constructor(message, status = 400, details = {}) {
    super(message);
    this.name = "StoreError";
    this.status = status;
    Object.assign(this, details);
  }
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/** Parent-level reference for any row: a lesson step belongs to its lesson. */
export function entityRefFor(db, table, row) {
  const parent = PARENT_OF[table];
  if (parent) return { table: parent.parent, pk: [String(row[parent.fk])] };
  const { pkCols } = tableInfo(db, table);
  return { table, pk: pkCols.map((c) => String(row[c])) };
}

const refKey = (ref) => ref.pk.map(encodeURIComponent).join("~");

function whereFor(pkCols, pk) {
  if (pkCols.length !== pk.length) throw new StoreError("Bad primary key");
  return { where: pkCols.map((c) => `${ident(c)} = ?`).join(" AND "), params: pk };
}

/** Raw rows of an entity as stored (JSON columns stay strings), or null if it does not exist. */
export function readEntity(db, ref) {
  const { pkCols } = tableInfo(db, ref.table);
  const { where, params } = whereFor(pkCols, ref.pk);
  const row = db.prepare(`SELECT * FROM ${ident(ref.table)} WHERE ${where}`).get(...params);
  if (!row) return null;
  const entity = { row, children: {} };
  const child = ENTITY_CHILDREN[ref.table];
  if (child) {
    const order = tableInfo(db, child.table).cols.some((c) => c.name === "position") ? "position" : "rowid";
    entity.children[child.table] = db
      .prepare(`SELECT * FROM ${ident(child.table)} WHERE ${ident(child.fk)} = ? ORDER BY ${order}`)
      .all(ref.pk[0]);
  }
  return entity;
}

const stripTimestamps = (row) => Object.fromEntries(Object.entries(row).filter(([k]) => !TIMESTAMP_COLS.has(k)));

/** Entity content without timestamps, for "did anything change?" comparisons. */
function comparable(entity) {
  if (!entity) return null;
  return JSON.stringify({
    row: stripTimestamps(entity.row),
    children: Object.fromEntries(
      Object.entries(entity.children).map(([t, rows]) => [t, rows.map(stripTimestamps)]),
    ),
  });
}

/**
 * Write an entity back (upsert the parent, replace its children).
 * Used by "restore revision" and "restore deleted". Caller owns the transaction.
 */
export function writeEntity(db, ref, entity) {
  const { cols, pkCols } = tableInfo(db, ref.table);
  const names = new Set(cols.map((c) => c.name));
  const row = Object.fromEntries(Object.entries(entity.row).filter(([k]) => names.has(k)));
  const { where, params } = whereFor(pkCols, ref.pk);
  const exists = db.prepare(`SELECT 1 FROM ${ident(ref.table)} WHERE ${where}`).get(...params);
  if (exists) {
    const sets = Object.keys(row).filter((c) => !pkCols.includes(c));
    if (sets.length) {
      db.prepare(`UPDATE ${ident(ref.table)} SET ${sets.map((c) => `${ident(c)} = ?`).join(", ")} WHERE ${where}`).run(
        ...sets.map((c) => row[c]),
        ...params,
      );
    }
  } else {
    insertRow(db, ref.table, row);
  }
  const child = ENTITY_CHILDREN[ref.table];
  if (child) {
    db.prepare(`DELETE FROM ${ident(child.table)} WHERE ${ident(child.fk)} = ?`).run(ref.pk[0]);
    const childNames = new Set(tableInfo(db, child.table).cols.map((c) => c.name));
    for (const r of entity.children[child.table] ?? []) {
      insertRow(db, child.table, Object.fromEntries(Object.entries(r).filter(([k]) => childNames.has(k))));
    }
  }
}

function insertRow(db, table, row) {
  const cols = Object.keys(row);
  if (!cols.length) throw new StoreError("Empty row");
  return db
    .prepare(`INSERT INTO ${ident(table)} (${cols.map(ident).join(", ")}) VALUES (${cols.map(() => "?").join(", ")}) RETURNING *`)
    .get(...cols.map((c) => row[c]));
}

// ---------------------------------------------------------------------------
// History database
// ---------------------------------------------------------------------------

export function openHistory(file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const h = new DatabaseSync(file);
  h.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS changes (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      ts           INTEGER NOT NULL,
      entity_table TEXT NOT NULL,
      entity_pk    TEXT NOT NULL,
      action       TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
      source       TEXT NOT NULL,
      before       TEXT,
      after        TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_changes_entity ON changes(entity_table, entity_pk, id DESC);
  `);
  return h;
}

export function recordChange(history, { table, pk, action, source, before, after, ts = Date.now() }) {
  history
    .prepare("INSERT INTO changes (ts, entity_table, entity_pk, action, source, before, after) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(ts, table, pk, action, source, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null);
}

/** Newest first. Rows include parsed `before`/`after`. */
export function listRevisions(history, table, pk, limit = 100) {
  return history
    .prepare("SELECT * FROM changes WHERE entity_table = ? AND entity_pk = ? ORDER BY id DESC LIMIT ?")
    .all(table, pk, limit)
    .map(parseChange);
}

export function getRevision(history, id) {
  const r = history.prepare("SELECT * FROM changes WHERE id = ?").get(id);
  return r ? parseChange(r) : null;
}

function parseChange(r) {
  return { ...r, before: r.before ? JSON.parse(r.before) : null, after: r.after ? JSON.parse(r.after) : null };
}

/** Entities whose most recent change is a delete (and which are not back in the DB). */
export function listDeleted(history, db) {
  const rows = history
    .prepare(
      `SELECT c.* FROM changes c
       JOIN (SELECT entity_table t, entity_pk p, MAX(id) m FROM changes GROUP BY entity_table, entity_pk) latest
         ON latest.m = c.id
       WHERE c.action = 'delete' ORDER BY c.id DESC LIMIT 200`,
    )
    .all()
    .map(parseChange);
  return rows.filter((r) => {
    const ref = { table: r.entity_table, pk: r.entity_pk.split("~").map(decodeURIComponent) };
    try {
      return !readEntity(db, ref);
    } catch {
      return false;
    }
  });
}

/** Keep 90 days of history, or the newest 50 revisions of an entity, whichever keeps more. */
export function pruneHistory(history, now = Date.now()) {
  const cutoff = now - HISTORY_RETENTION_DAYS * DAY_MS;
  const r = history
    .prepare(
      `DELETE FROM changes WHERE ts < ? AND id NOT IN (
         SELECT id FROM (
           SELECT id, ROW_NUMBER() OVER (PARTITION BY entity_table, entity_pk ORDER BY id DESC) AS rn FROM changes
         ) WHERE rn <= ?)`,
    )
    .run(cutoff, HISTORY_MIN_REVISIONS);
  return Number(r.changes);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Does a validator finding belong to this entity? Child findings use `<parent>/<child>` ids. */
function findingBelongsTo(f, ref) {
  const id = refKey(ref);
  const child = ENTITY_CHILDREN[ref.table];
  if (f.table === ref.table) return f.id === ref.pk.join("/") || f.id === id || String(f.id).startsWith(`${ref.pk.join("/")}/`);
  if (child && f.table === child.table) return String(f.id).startsWith(`${ref.pk[0]}/`);
  return false;
}

/**
 * @param {{ db: DatabaseSync, history: DatabaseSync, paths: ReturnType<typeof import("./content-paths.mjs").makePaths> }} deps
 */
export function createStore({ db, history, paths }) {
  /** One full validation pass, filtered per entity (a pass costs far more than the filtering). */
  function validateEntities(refs) {
    const result = validateDatabase(db, { shipped: readShipped(paths), retired: readRetired(paths) });
    const errors = [];
    const warnings = [];
    for (const ref of refs) {
      errors.push(...result.errors.filter((f) => findingBelongsTo(f, ref)));
      warnings.push(...result.warnings.filter((f) => findingBelongsTo(f, ref)));
    }
    return { errors, warnings };
  }

  const validateEntity = (ref) => validateEntities([ref]);

  function shippedIds(table) {
    return SHIPPED_ID_TABLES.includes(table) ? new Set(readShipped(paths)[table] ?? []) : new Set();
  }

  /**
   * Run `work` in a transaction, validate the entity it touched, record history.
   * `work` returns the entity ref(s) it touched (one or two: a primary-key change touches two).
   * `beforeRefs` are read before the SQL runs.
   */
  function transact({ source, action, beforeRefs, work }) {
    const before = new Map(beforeRefs.map((r) => [refKey(r) + "@" + r.table, { ref: r, entity: readEntity(db, r) }]));
    db.exec("BEGIN IMMEDIATE");
    let afterRefs;
    let report = { errors: [], warnings: [] };
    try {
      afterRefs = work();
      const r = validateEntities(afterRefs.filter((ref) => readEntity(db, ref)));
      report.errors.push(...r.errors);
      report.warnings.push(...r.warnings);
      if (report.errors.length) {
        throw new StoreError("Validation failed", 422, { errors: report.errors, warnings: report.warnings });
      }
      db.exec("COMMIT");
    } catch (err) {
      try {
        db.exec("ROLLBACK");
      } catch {
        /* nothing open */
      }
      // A foreign key / unique / check failure is a content mistake, not a server fault.
      if (!(err instanceof StoreError) && /constraint failed/i.test(String(err?.message))) {
        throw new StoreError(`The database rejected this save: ${err.message}`, 422, { errors: [{ table: "", id: "", field: "", rule: "constraint", message: String(err.message) }], warnings: [] });
      }
      throw err;
    }

    // History + WAL hygiene happen after the commit; failures here must not undo a good save.
    try {
      const seen = new Set();
      const touched = [...beforeRefs, ...afterRefs];
      for (const ref of touched) {
        const k = refKey(ref) + "@" + ref.table;
        if (seen.has(k)) continue;
        seen.add(k);
        const b = before.get(k)?.entity ?? null;
        const a = readEntity(db, ref);
        if (comparable(b) === comparable(a)) continue;
        recordChange(history, {
          table: ref.table,
          pk: refKey(ref),
          action: action === "restore" ? "restore" : !b ? "create" : !a ? "delete" : "update",
          source,
          before: b,
          after: a,
        });
      }
      pruneHistory(history);
      db.exec("PRAGMA wal_checkpoint(TRUNCATE)");
    } catch (err) {
      console.warn(`[store] history/checkpoint failed: ${err.message}`);
    }
    return { refs: afterRefs, warnings: report.warnings };
  }

  const rowOr404 = (table, pk) => {
    const { pkCols } = tableInfo(db, table);
    const { where, params } = whereFor(pkCols, pk);
    const row = db.prepare(`SELECT * FROM ${ident(table)} WHERE ${where}`).get(...params);
    if (!row) throw new StoreError(`No such row in ${table}`, 404);
    return { row, where, params };
  };

  return {
    /** Insert one row (any table). Returns the stored row. */
    insertRow({ table, values, source }) {
      let stored;
      const out = transact({
        source,
        action: "write",
        beforeRefs: [],
        work: () => {
          stored = insertRow(db, table, values);
          return [entityRefFor(db, table, stored)];
        },
      });
      return { row: stored, warnings: out.warnings };
    },

    /** Update columns of one row. Renaming a shipped id is refused. */
    updateRow({ table, pk, values, source }) {
      const { pkCols } = tableInfo(db, table);
      const { row } = rowOr404(table, pk);
      for (const c of pkCols) {
        if (c in values && String(values[c]) !== String(row[c]) && shippedIds(table).has(String(row[c]))) {
          throw new StoreError(
            `Cannot rename ${table} id "${row[c]}": it has shipped. Create a new id and retire the old one.`,
            409,
          );
        }
      }
      let updated;
      const out = transact({
        source,
        action: "write",
        beforeRefs: [entityRefFor(db, table, row)],
        work: () => {
          const { where, params } = whereFor(pkCols, pk);
          const sets = Object.keys(values);
          if (!sets.length) throw new StoreError("No fields to update");
          const stamp = !("updated_at" in values) && tableInfo(db, table).cols.some((c) => c.name === "updated_at");
          db.prepare(
            `UPDATE ${ident(table)} SET ${sets.map((c) => `${ident(c)} = ?`).join(", ")}${stamp ? ", updated_at = strftime('%s', 'now')" : ""} WHERE ${where}`,
          ).run(...sets.map((c) => values[c]), ...params);
          const newPk = pkCols.map((c, i) => (c in values ? String(values[c]) : pk[i]));
          updated = rowOr404(table, newPk).row;
          return [entityRefFor(db, table, updated)];
        },
      });
      return { row: updated, warnings: out.warnings };
    },

    /**
     * Delete one row. A shipped id needs `retireReason`, which is appended to
     * content/retired-ids.json so validation accepts its absence.
     */
    deleteRow({ table, pk, source, retireReason }) {
      const { row } = rowOr404(table, pk);
      const ref = entityRefFor(db, table, row);
      const isTopLevel = ref.table === table && !PARENT_OF[table];
      const id = ref.pk[0];
      if (isTopLevel && shippedIds(table).has(id) && !retireReason?.trim()) {
        throw new StoreError(
          `"${id}" has shipped to users. Deleting it retires the id: provide a reason.`,
          409,
          { needsReason: true, table, id },
        );
      }
      transact({
        source,
        action: "write",
        beforeRefs: [ref],
        work: () => {
          const { where, params } = whereFor(tableInfo(db, table).pkCols, pk);
          db.prepare(`DELETE FROM ${ident(table)} WHERE ${where}`).run(...params);
          return [ref];
        },
      });
      if (isTopLevel && shippedIds(table).has(id)) {
        const retired = readRetired(paths);
        retired[table] = { ...(retired[table] ?? {}), [id]: `${retireReason.trim()} (${new Date().toISOString().slice(0, 10)})` };
        fs.mkdirSync(path.dirname(paths.retiredIds), { recursive: true });
        fs.writeFileSync(paths.retiredIds, `${JSON.stringify(retired, null, 2)}\n`);
      }
      return { ok: true };
    },

    /**
     * Save a whole entity at once: the parent row and its ordered children.
     * `children` rows get their `position` assigned from array order.
     */
    saveEntity({ table, pk, row, children, source }) {
      const child = ENTITY_CHILDREN[table];
      if (!child && children) throw new StoreError(`${table} has no child rows`);
      const { pkCols } = tableInfo(db, table);
      const existing = pk ? readEntity(db, { table, pk }) : null;
      if (existing) {
        for (const c of pkCols) {
          if (c in row && String(row[c]) !== String(existing.row[c]) && shippedIds(table).has(String(existing.row[c]))) {
            throw new StoreError(`Cannot rename ${table} id "${existing.row[c]}": it has shipped.`, 409);
          }
        }
      }
      const newPk = pkCols.map((c, i) => String(row[c] ?? pk?.[i]));
      const beforeRefs = existing ? [{ table, pk }] : [];
      const now = Math.floor(Date.now() / 1000);
      const out = transact({
        source,
        action: "write",
        beforeRefs,
        work: () => {
          // Children go first: their FK has no ON UPDATE, so a renamed parent id would fail otherwise.
          const keep = existing?.children?.[child?.table] ?? [];
          if (child && existing) {
            db.prepare(`DELETE FROM ${ident(child.table)} WHERE ${ident(child.fk)} = ?`).run(pk[0]);
          }
          if (existing) {
            const sets = Object.keys(row).filter((c) => !TIMESTAMP_COLS.has(c));
            const where = whereFor(pkCols, pk);
            db.prepare(`UPDATE ${ident(table)} SET ${[...sets.map((c) => `${ident(c)} = ?`), "updated_at = ?"].join(", ")} WHERE ${where.where}`).run(
              ...sets.map((c) => row[c]),
              now,
              ...where.params,
            );
          } else {
            insertRow(db, table, row);
          }
          if (child) {
            const created = new Map(keep.map((r) => [String(r.id), r.created_at]));
            // No `children` supplied: keep the existing ones (re-pointed at the possibly renamed parent).
            const rows = children ?? keep;
            rows.forEach((r, i) => {
              const withMeta = { ...r, [child.fk]: newPk[0], position: i };
              if (!("created_at" in withMeta) && created.has(String(r.id))) withMeta.created_at = created.get(String(r.id));
              insertRow(db, child.table, withMeta);
            });
          }
          return [{ table, pk: newPk }];
        },
      });
      return { entity: readEntity(db, out.refs[0]), warnings: out.warnings };
    },

    /** Put a history revision (or a deleted entity) back. */
    restoreRevision({ id, side = "before", source = "studio" }) {
      const rev = getRevision(history, id);
      if (!rev) throw new StoreError("No such revision", 404);
      const snapshot = rev[side];
      const ref = { table: rev.entity_table, pk: rev.entity_pk.split("~").map(decodeURIComponent) };
      if (!snapshot) throw new StoreError("That revision has no content to restore (it was a creation).", 400);
      const current = readEntity(db, ref);
      transact({
        source,
        action: "restore",
        beforeRefs: current ? [ref] : [],
        work: () => {
          writeEntity(db, ref, snapshot);
          return [ref];
        },
      });
      return { entity: readEntity(db, ref) };
    },

    /**
     * Rewrite `position` for a standalone pool (e.g. MythBuster questions of one
     * difficulty) in the order given. Two passes avoid tripping UNIQUE(scope, position).
     */
    reorderPool({ table, scopeColumn, scopeValue, ids, source }) {
      const { cols } = tableInfo(db, table);
      if (PARENT_OF[table] || !cols.some((c) => c.name === "position") || !cols.some((c) => c.name === scopeColumn)) {
        throw new StoreError(`${table} cannot be reordered this way`);
      }
      const refs = ids.map((id) => ({ table, pk: [String(id)] }));
      transact({
        source,
        action: "write",
        beforeRefs: refs,
        work: () => {
          const up = db.prepare(`UPDATE ${ident(table)} SET position = ? WHERE id = ? AND ${ident(scopeColumn)} = ?`);
          ids.forEach((id, i) => up.run(-(i + 1), String(id), scopeValue));
          ids.forEach((id, i) => up.run(i, String(id), scopeValue));
          return refs;
        },
      });
      return { ok: true };
    },

    validateEntity,
    readEntity: (ref) => readEntity(db, ref),
  };
}

export { pkKey };
