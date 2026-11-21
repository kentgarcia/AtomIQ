/**
 * content:migrate (spec section 10): bring every source file of an adapter up to the current format. Each file is read
 * with the reader its header names, written with the current writer, read again, and the ROWS (and comments) must be
 * identical, or the migration is wrong and nothing is written. The migration commit therefore changes no row.
 */
import fs from "node:fs";
import path from "node:path";

import { canonicalizeText, readFiles } from "./pipeline.mjs";
import { readSourceFiles } from "./files.mjs";
import { formatOf } from "./readers/index.mjs";
import { parseSource } from "./core/parse.mjs";
import { sameValue } from "./core/values.mjs";

/**
 * @returns {{ changed: string[], unchanged: number }}
 * @throws when a migrated file would read back to different rows
 */
export function migrateAdapter({ sourceDir, adapter, write = true }) {
  const files = readSourceFiles(sourceDir, adapter.owns);
  const before = readFiles(adapter, files).rows;
  const next = new Map();
  const changed = [];
  for (const [rel, text] of files) {
    formatOf(text); // a file with no format line is not migratable
    const out = canonicalizeText(adapter, text, rel);
    next.set(rel, out);
    if (out !== text) changed.push(rel);
  }
  const after = readFiles(adapter, next).rows;
  for (const t of adapter.tables) {
    if (!sameValue(before[t], after[t])) throw new Error(`migration of ${adapter.name} would change the rows of ${t}: the migration is wrong, nothing was written`);
  }
  for (const [rel, text] of files) {
    const a = parseSource(text, { file: rel });
    const b = parseSource(next.get(rel), { file: rel });
    const comments = (x) => JSON.stringify([x.comments, x.trailing, x.records.map((r) => [r.comments, r.entries.map((e) => e.comments)])]);
    if (comments(a) !== comments(b)) throw new Error(`migration of ${rel} would lose comments: nothing was written`);
  }
  if (write) for (const rel of changed) fs.writeFileSync(path.join(sourceDir, rel), next.get(rel), "utf8");
  return { changed, unchanged: files.size - changed.length };
}

/** Renumber the `NNN-` prefixes of the files of one folder back to 010, 020, ... in their current order. */
export function renumberFolder(dir) {
  const names = fs.readdirSync(dir).filter((n) => /^\d{3}-.+\.atomiq$/.test(n)).sort();
  const plan = names.map((n, i) => [n, `${String((i + 1) * 10).padStart(3, "0")}-${n.slice(4)}`]).filter(([a, b]) => a !== b);
  // two passes so a rename never lands on a name still in use
  for (const [a] of plan) fs.renameSync(path.join(dir, a), path.join(dir, `${a}.renumber`));
  for (const [a, b] of plan) fs.renameSync(path.join(dir, `${a}.renumber`), path.join(dir, b));
  return plan;
}
