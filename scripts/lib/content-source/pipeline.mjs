/**
 * rows <-> files for one adapter, with no disk and no database: the pure pipeline that export, sync, format,
 * migrate and every test share.
 */
import { parseSource } from "./core/parse.mjs";
import { writeSource } from "./core/write.mjs";
import { decodeFile, encodeFile, finishDecode, newAccumulator } from "./adapters/engine.mjs";

/** @returns {Map<string, string>} relPath -> canonical text */
export function renderFiles(adapter, rowsByTable) {
  const out = new Map();
  for (const file of adapter.layout(rowsByTable)) {
    if (out.has(file.path)) throw new Error(`layout of ${adapter.name} gives ${file.path} twice`);
    out.set(file.path, writeSource(encodeFile(adapter, file, rowsByTable)));
  }
  return out;
}

/**
 * @param {Map<string, string>} files relPath -> text (any order; they are read in path order, which sets `position`)
 * @returns {{ rows: Record<string, object[]>, where: Map<string, { file: string, line: number }> }}
 */
export function readFiles(adapter, files) {
  const acc = newAccumulator();
  for (const rel of [...files.keys()].sort()) decodeFile(adapter, parseSource(files.get(rel), { file: rel }), acc);
  for (const t of adapter.tables) acc.rows[t] ??= [];
  finishDecode(adapter, acc);
  return { rows: acc.rows, where: acc.where };
}

/** Carry the comments of a parsed file over to a freshly encoded AST of the same records. */
function transplantComments(orig, fresh) {
  fresh.comments = orig.comments;
  fresh.trailing = orig.trailing;
  const take = (from, to) => {
    const used = new Set();
    for (const e of to) {
      const i = from.findIndex((o, k) => !used.has(k) && o.key === e.key);
      if (i >= 0) {
        used.add(i);
        e.comments = from[i].comments;
      }
    }
  };
  take(orig.scope, fresh.scope);
  orig.records.forEach((r, i) => {
    const f = fresh.records[i];
    f.comments = r.comments;
    take(r.entries, f.entries);
  });
}

/**
 * The canonical text of one file: parse it, read it, write it again in the adapter's order and forms, keeping its
 * comments. This is `content:format`, and what `--check` compares a file with (a difference is only a warning).
 */
export function canonicalizeText(adapter, text, file) {
  const ast = parseSource(text, { file });
  const acc = newAccumulator();
  const { scopeRow } = decodeFile(adapter, ast, acc);
  const fresh = encodeFile(adapter, { path: file, scope: scopeRow, items: acc.order.map(({ spec, row }) => ({ keyword: spec.keyword, row })) }, acc.rows);
  transplantComments(ast, fresh);
  return writeSource(fresh);
}
