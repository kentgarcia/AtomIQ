/**
 * The adapter engine: a table is described by DATA (an adapter) and this module turns that description into
 * "rows <-> AST". The core (parse/write) knows nothing about tables, and an adapter knows nothing about syntax.
 *
 * defineAdapter({
 *   name, version,
 *   owns(relPath) -> bool                 which files under content/source belong to this adapter
 *   scope: [Field]                        attributes written once at the top of a file (e.g. npc: npc-ada)
 *   records: [{
 *     keyword, table, id: [col...],       a record header is `keyword <id parts>`
 *     scope?: [col...],                   columns that come from the file scope (not written per record)
 *     scopeOptional?: [col...],           scope columns that may be null (a file with no such header line)
 *     parent?: { keyword, map: { childCol: parentCol } },   a sub-record takes columns from the nearest parent above it
 *     fields: [Field],                    attributes in canonical order
 *     links?: [{ key, table, fk, target }],  link-table rows written as `key: id` lines on the parent
 *     linksBefore?: col                     write the links just before this field (default: after the last)
 *     position?: { col, scope: [col...], base }   derived from file and record order, never written
 *   }],
 *   layout(rowsByTable) -> [{ path, scope: { col: value }, items: [{ keyword, row }] }]
 * })
 *
 * Field: { col, key?, type: text|prose|int|num|id|json|list|jsonl|custom, body?, nullable?, default?,
 *          omitDefault?, translatable? } ; custom: { keys: [...], encode(value, row) -> Entry[], decode(entries) -> value }
 *   A custom field with `open: true` (at most one a record, `keys` may be empty) also takes every attribute key the record's
 *   other fields do not name: the translation files, whose keys are field paths, are written that way.
 */
import { SourceError } from "../core/errors.mjs";
import { decodeValue, encodeValue, sameValue } from "../core/values.mjs";
import { ID_PATTERN } from "../core/parse.mjs";

const keyOf = (f) => f.key ?? f.col;
const keysOf = (f) => (f.type === "custom" ? (f.keys ?? []) : [keyOf(f)]);

/** Validate an adapter definition once, up front: a bad adapter is a programming error, not a data error. */
export function defineAdapter(spec) {
  const problems = [];
  const keywords = new Set();
  for (const r of spec.records) {
    if (keywords.has(r.keyword)) problems.push(`duplicate record keyword ${r.keyword}`);
    keywords.add(r.keyword);
    const seen = new Set();
    let bodies = 0;
    let blocks = 0;
    for (const f of r.fields) {
      if (f.body) bodies++;
      if (!f.body && (f.type === "prose" || f.type === "jsonl")) blocks++;
      for (const k of keysOf(f)) {
        if (seen.has(k)) problems.push(`${r.keyword}: key "${k}" is used twice`);
        seen.add(k);
      }
      if (f.type === "list" && f.nullable) problems.push(`${r.keyword}.${f.col}: a list cannot be nullable (absent means empty)`);
      if (f.open && f.type !== "custom") problems.push(`${r.keyword}.${f.col}: only a custom field can be open`);
      if (f.type === "custom" && ((!f.keys?.length && !f.open) || !f.encode || !f.decode)) problems.push(`${r.keyword}.${f.col}: a custom field needs keys, encode and decode`);
    }
    if (r.fields.filter((f) => f.open).length > 1) problems.push(`${r.keyword}: more than one open field`);
    if (bodies > 1) problems.push(`${r.keyword}: more than one body field`);
    if (bodies && blocks) problems.push(`${r.keyword}: a body and a prose or jsonl attribute would read back as one block (use a body OR block attributes)`);
    if (r.parent && !spec.records.some((x) => x.keyword === r.parent.keyword)) problems.push(`${r.keyword}: unknown parent ${r.parent.keyword}`);
  }
  if (problems.length) throw new Error(`Adapter ${spec.name}: ${problems.join("; ")}`);

  const byKeyword = new Map(spec.records.map((r) => [r.keyword, r]));
  const tableOrder = [...new Set(spec.records.flatMap((r) => [r.table, ...(r.links ?? []).map((l) => l.table)]))];
  const tables = new Set(tableOrder);
  // tableOrder: a parent before the tables that point at it (insert in this order, delete in reverse)
  return Object.freeze({ ...spec, byKeyword, tables, tableOrder, scope: spec.scope ?? [] });
}

/** Columns an adapter handles for a table (for the coverage test, spec T9). */
export function coveredColumns(adapter, table) {
  const cols = new Set();
  for (const r of adapter.records) {
    if (r.table === table) {
      r.id.forEach((c) => cols.add(c));
      r.fields.forEach((f) => cols.add(f.col));
      (r.scope ?? []).forEach((c) => cols.add(c));
      if (r.parent) Object.keys(r.parent.map).forEach((c) => cols.add(c));
      if (r.position) cols.add(r.position.col);
    }
    for (const l of r.links ?? []) if (l.table === table) [l.fk, l.target].forEach((c) => cols.add(c));
  }
  return cols;
}

// --- encode: rows -> AST --------------------------------------------------------------------------------------------------------------------

const wrap = (where, fn) => {
  try {
    return fn();
  } catch (err) {
    if (err instanceof SourceError) throw err;
    throw new Error(`${where}: ${err.message}`);
  }
};

/** @returns {object[]} the entries of one field for one row value (empty when it is omitted). */
function encodeField(field, value, row) {
  if (field.derived) return [];
  if (field.type === "list" && (value === null || value === undefined)) throw new Error(`${field.col} is null, but a list is never null (use [] for none)`);
  if (field.omitDefault && field.default !== undefined && sameValue(value, field.default)) return [];
  if (field.type === "custom") return value === null || value === undefined ? [] : field.encode(value, row);
  return encodeValue(field, value);
}

export function encodeRecord(adapter, spec, row, linksByKey = {}) {
  const where = `${spec.table} ${spec.id.map((c) => row[c]).join(" ")}`;
  return wrap(where, () => {
    const ids = spec.id.map((c) => String(row[c]));
    for (const id of ids) if (!ID_PATTERN.test(id)) throw new Error(`id "${id}" is not a valid id (letters, digits and . _ / - only)`);
    const entries = [];
    let linked = false;
    const pushLinks = () => {
      linked = true;
      for (const l of spec.links ?? []) entries.push(...encodeValue({ col: l.key, type: "list" }, linksByKey[l.key] ?? []));
    };
    for (const f of spec.fields) {
      if (spec.linksBefore === f.col) pushLinks();
      entries.push(...encodeField(f, row[f.col], row));
    }
    if (!linked) pushLinks();
    // A body after a block attribute would be read back as more of that block, so the two cannot share a record.
    if (entries.some((e) => e.key === null) && entries.some((e) => e.key !== null && e.lines)) {
      const long = entries.find((e) => e.key !== null && e.lines);
      throw new Error(`"${long.key}" is too long to sit above the body (keep it to one line, under 120 characters)`);
    }
    return { keyword: spec.keyword, ids, line: null, comments: [], entries };
  });
}

/**
 * @param {object} adapter
 * @param {{ path: string, scope: Record<string, unknown>, items: Array<{ keyword: string, row: object }> }} file
 * @param {Record<string, object[]>} rowsByTable
 */
export function encodeFile(adapter, file, rowsByTable) {
  const linkIndex = new Map();
  const linksFor = (spec, row) => {
    const out = {};
    for (const l of spec.links ?? []) {
      let idx = linkIndex.get(l.table);
      if (!idx) {
        idx = new Map();
        for (const lr of rowsByTable[l.table] ?? []) {
          const k = String(lr[l.fk]);
          if (!idx.has(k)) idx.set(k, []);
          idx.get(k).push(String(lr[l.target]));
        }
        for (const v of idx.values()) v.sort();
        linkIndex.set(l.table, idx);
      }
      out[l.key] = idx.get(String(row[spec.id[0]])) ?? [];
    }
    return out;
  };
  const scope = [];
  for (const f of adapter.scope) scope.push(...wrap(`${file.path} scope`, () => encodeField(f, file.scope[f.col], file.scope)));
  const records = file.items.map(({ keyword, row }) => {
    const spec = adapter.byKeyword.get(keyword);
    if (!spec) throw new Error(`adapter ${adapter.name} has no record keyword "${keyword}"`);
    return encodeRecord(adapter, spec, row, linksFor(spec, row));
  });
  return { file: file.path, format: 1, adapter: { name: adapter.name, version: adapter.version }, comments: [], scope, records, trailing: [] };
}

// --- decode: AST -> rows ---------------------------------------------------------------------------------------------------------------------

function groupEntries(rec) {
  const m = new Map();
  for (const e of rec.entries) {
    const k = e.key;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(e);
  }
  return m;
}

function decodeFields(file, fields, byKey, owner, line = null) {
  const open = fields.find((f) => f.open);
  const known = new Set(fields.flatMap((f) => (f.body ? [null] : keysOf(f))));
  for (const [k, es] of byKey) {
    if (!known.has(k) && !(open && k !== null)) throw new SourceError(k === null ? `${owner} has a body but its adapter has none` : `unknown attribute "${k}" in ${owner}`, { file, line: es[0].line });
  }
  const row = {};
  for (const f of fields) {
    const es = f.open
      ? [...byKey].filter(([k]) => k !== null && !known.has(k)).flatMap(([, v]) => v)
      : f.body ? (byKey.get(null) ?? []) : keysOf(f).flatMap((k) => byKey.get(k) ?? []);
    let got;
    try {
      if (f.type === "custom") got = es.length ? { value: f.decode(es.sort((a, b) => a.line - b.line)) } : { absent: true };
      else got = decodeValue(f, es);
    } catch (err) {
      throw new SourceError(`${owner}: ${err.message}`, { file, line: err.entry?.line ?? es[0]?.line ?? null });
    }
    if ("absent" in got) {
      if (f.derived) continue;
      if (f.type === "list") {
        row[f.col] = [];
        continue;
      }
      if (f.default !== undefined) row[f.col] = structuredClone(f.default);
      else if (f.nullable) row[f.col] = null;
      else throw new SourceError(`${owner} is missing "${f.body ? "its body" : keyOf(f)}"`, { file, line });
    } else row[f.col] = got.value;
  }
  return row;
}

/**
 * @param {object} adapter
 * @param {{ file: string, adapter: {name:string,version:number}, scope: any[], records: any[] }} ast
 * @param {{ rows: Record<string, object[]>, order: object[], where: Map<string, {file:string,line:number}> }} acc
 */
export function decodeFile(adapter, ast, acc) {
  const file = ast.file;
  if (ast.adapter.name !== adapter.name) throw new SourceError(`this file is for adapter "${ast.adapter.name}", not "${adapter.name}"`, { file, line: ast.adapterLine });
  if (ast.adapter.version !== adapter.version) throw new SourceError(`adapter ${adapter.name} version ${ast.adapter.version} is not supported (current ${adapter.version}); run content:migrate`, { file, line: ast.adapterLine });

  const scopeGroups = new Map();
  for (const e of ast.scope) {
    if (!scopeGroups.has(e.key)) scopeGroups.set(e.key, []);
    scopeGroups.get(e.key).push(e);
  }
  const scopeRow = decodeFields(file, adapter.scope, scopeGroups, "the file header", ast.adapterLine);

  const lastOf = new Map();
  for (const rec of ast.records) {
    const spec = adapter.byKeyword.get(rec.keyword);
    if (!spec) throw new SourceError(`unknown record kind "${rec.keyword}" (this adapter has: ${[...adapter.byKeyword.keys()].join(", ")})`, { file, line: rec.line });
    if (rec.ids.length !== spec.id.length) throw new SourceError(`a ${spec.keyword} header has ${spec.id.length} id part(s) (${spec.id.join(", ")}), found ${rec.ids.length}`, { file, line: rec.line });
    const owner = `${rec.keyword} ${rec.ids.join(" ")}`;
    const row = {};
    spec.id.forEach((c, i) => (row[c] = rec.ids[i]));
    for (const c of spec.scope ?? []) {
      if (scopeRow[c] == null && !spec.scopeOptional?.includes(c)) throw new SourceError(`${owner} needs "${c}" in the file header`, { file, line: rec.line });
      row[c] = scopeRow[c];
    }
    if (spec.parent) {
      const p = lastOf.get(spec.parent.keyword);
      if (!p) throw new SourceError(`${owner} must come after a ${spec.parent.keyword} record`, { file, line: rec.line });
      for (const [child, parentCol] of Object.entries(spec.parent.map)) row[child] = p.row[parentCol];
    }
    const groups = groupEntries(rec);
    // link keys are decoded separately
    const links = {};
    for (const l of spec.links ?? []) {
      const es = groups.get(l.key) ?? [];
      groups.delete(l.key);
      for (const e of es) if (e.lines) throw new SourceError(`${owner}: "${l.key}" items are single lines`, { file, line: e.line });
      links[l.key] = es.map((e) => e.value);
      const dup = links[l.key].find((v, i, a) => a.indexOf(v) !== i);
      if (dup) throw new SourceError(`${owner}: "${l.key}" lists ${dup} twice`, { file, line: es[0].line });
      for (const v of links[l.key]) if (!ID_PATTERN.test(v)) throw new SourceError(`${owner}: "${v}" is not a valid id`, { file, line: es[0].line });
    }
    Object.assign(row, decodeFields(file, spec.fields, groups, owner, rec.line));
    const lineMeta = { file, line: rec.line };
    // a child record is unique within its parent (card c01 exists in every lesson), so the parent's columns are part of its key
    const pkId = `${spec.table}|${[...spec.id, ...Object.keys(spec.parent?.map ?? {})].map((c) => row[c]).join("~")}`;
    if (acc.where.has(pkId)) {
      const was = acc.where.get(pkId);
      throw new SourceError(`${owner} is defined twice (first at ${was.file}:${was.line})`, { file, line: rec.line });
    }
    acc.where.set(pkId, lineMeta);
    (acc.rows[spec.table] ??= []).push(row);
    for (const l of spec.links ?? []) {
      for (const target of links[l.key]) (acc.rows[l.table] ??= []).push({ [l.fk]: row[spec.id[0]], [l.target]: target });
    }
    acc.order.push({ spec, row });
    lastOf.set(spec.keyword, { row });
  }
  return { scopeRow };
}

/** Derived columns (position) from the order records were read in. Call once after every file is decoded. */
export function finishDecode(adapter, acc) {
  const counters = new Map();
  for (const { spec, row } of acc.order) {
    if (!spec.position) continue;
    const { col, scope = [], base = 0 } = spec.position;
    const k = `${spec.table}|${scope.map((c) => String(row[c])).join("\u0000")}`;
    const n = counters.get(k) ?? 0;
    counters.set(k, n + 1);
    row[col] = base + n;
  }
  return acc.rows;
}

export const newAccumulator = () => ({ rows: {}, order: [], where: new Map() });
