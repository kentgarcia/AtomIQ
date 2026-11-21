#!/usr/bin/env node
/**
 * Headless, batched editing of the master content DB: the same validation, history and shipped-id
 * protection as Content Studio, with no server and no one-off script. One patch is one transaction.
 *
 *   npm run content:edit -- patch.json              dry run: shows every change and the validation result
 *   npm run content:edit -- patch.json --apply      writes it (backup, then the tests that read those tables)
 *   npm run content:edit -- get                     lists tables with row counts
 *   npm run content:edit -- get <table> [--pk a,b] [--q text] [--where col=val ...] [--cols a,b] [--limit n]
 *   npm run content:edit -- sql "SELECT ..."        read-only SQL
 *   npm run content:edit -- thread <teacher>        a teacher's stories: first node, title, trigger, node count
 *   npm run content:edit -- thread <teacher> <story>  one story's nodes only, in reading order (story = first node id,
 *                                                   trigger like lessons_completed:1, or part of its title)
 *
 * A patch is JSON: an array of operations, or { "note": "why", "ops": [...] }; a `.mjs` file may export
 * default an array or a (possibly async) function returning one, for edits worth generating. `-` reads
 * stdin. Operations (see `applyBatch` in scripts/lib/content-store.mjs):
 *
 *   { "op": "update",  "table": "npcs", "pk": "npc-ada", "set": { "bio": "..." } }
 *   { "op": "update",  "table": "chat_nodes", "where": { "npc_id": "ada" }, "set": { ... }, "expect": 12 }
 *   { "op": "replace", "table": "npc_lines", "column": "text", "find": "Ada", "with": "Hal", "where": { "npc_id": "hal" } }
 *   { "op": "insert",  "table": "npc_lines", "values": { ... } }
 *   { "op": "delete",  "table": "chat_nodes", "pk": "chat-x", "retire": "only for a shipped id" }
 *
 * Flags: --apply, --no-verify (skip the tests), --full (print every change), --note "text".
 * Edits stay drafts until published. Exit code 1 on a validation failure or a failed test.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { backupUnlessIdentical, studioIsRunning } from "./lib/backup.mjs";
import { checksFor } from "./lib/content-checks.mjs";
import { makePaths } from "./lib/content-paths.mjs";
import { applyBatchToMaster, dryRunBatch, printFailure, printReport, short, verifyChecks } from "./lib/content-batch-run.mjs";
import { StoreError } from "./lib/content-store.mjs";
import { ownedTables } from "./lib/content-source/owned.mjs";
import { hydrateRow, ident, listContentTables, openDb, tableInfo } from "./lib/content-tables.mjs";

const paths = makePaths();
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const option = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const options = (name) => argv.flatMap((a, i) => (a === name ? [argv[i + 1]] : []));
const fail = (message, code = 1) => {
  console.error(message);
  process.exit(code);
};

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Nodes reachable from `rootId` by following replies[].next (a story is exactly that). */
function reachable(byId, rootId) {
  const seen = [];
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift();
    if (seen.includes(id) || !byId.has(id)) continue;
    seen.push(id);
    for (const r of byId.get(id).replies) if (r?.next) queue.push(r.next);
  }
  return seen;
}

function threadCommand(db) {
  const given = argv[1];
  if (!given || given.startsWith("--")) fail("usage: content:edit -- thread <teacher> [<story>]", 2);
  const npc = [given, `npc-${given}`].find((id) => db.prepare("SELECT 1 FROM chat_nodes WHERE npc_id = ?").get(id));
  if (!npc) fail(`No chat nodes for "${given}". Teachers: ${db.prepare("SELECT DISTINCT npc_id FROM chat_nodes").all().map((r) => r.npc_id).join(", ")}`);
  const nodes = db
    .prepare('SELECT id, kind, "trigger" AS trigger, title, text, pose, replies FROM chat_nodes WHERE npc_id = ? ORDER BY position, id')
    .all(npc)
    .map((r) => ({ ...r, replies: JSON.parse(r.replies) }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const roots = nodes.filter((n) => n.kind === "greeting" || n.kind === "unprompted");
  const reach = new Map(roots.map((r) => [r.id, reachable(byId, r.id)]));
  const story = argv[2] && !argv[2].startsWith("--") ? argv[2] : null;

  if (!story) {
    for (const r of roots) {
      const ids = reach.get(r.id);
      const shared = ids.filter((id) => roots.some((o) => o.id !== r.id && reach.get(o.id).includes(id))).length;
      console.log(`${r.id.padEnd(34)} ${r.kind === "greeting" ? "free chat" : (r.trigger ?? "").padEnd(22)} ${String(ids.length).padStart(3)} nodes${shared ? ` (${shared} shared)` : ""}  ${short(r.title ?? "", 40)}`);
    }
    const orphans = nodes.filter((n) => ![...reach.values()].some((ids) => ids.includes(n.id)));
    if (orphans.length) console.log(`not in any story: ${orphans.map((n) => n.id).join(", ")}`);
    return;
  }

  const needle = story.toLowerCase();
  const hits = roots.filter((r) => r.id === story);
  const match = hits.length
    ? hits
    : roots.filter((r) => r.trigger === story).concat(roots.filter((r) => r.title && r.title.toLowerCase().includes(needle)));
  const unique = [...new Set(match)];
  if (unique.length !== 1) fail(unique.length ? `"${story}" matches ${unique.length} stories: ${unique.map((r) => r.id).join(", ")}` : `No story of ${npc} matches "${story}". Run: thread ${given}`);
  const root = unique[0];
  const out = reach.get(root.id).map((id) => {
    const n = byId.get(id);
    const also = roots.filter((o) => o.id !== root.id && reach.get(o.id).includes(id)).map((o) => o.id);
    return { id: n.id, kind: n.kind, ...(n.title ? { title: n.title } : {}), ...(n.trigger ? { trigger: n.trigger } : {}), pose: n.pose, text: n.text, replies: n.replies, ...(also.length ? { also_in: also } : {}) };
  });
  console.log(JSON.stringify(out, null, 1));
  console.error(`${out.length} node(s) of ${npc} from ${root.id}${out.some((n) => n.also_in) ? "; nodes marked also_in are used by other stories too" : ""}`);
}

function readCommand(cmd) {
  const db = openDb(paths.master, { readOnly: true });
  try {
    if (cmd === "thread") return threadCommand(db);
    if (cmd === "sql") {
      const statement = argv[1];
      if (!statement || !/^\s*(select|with|pragma)\b/i.test(statement)) fail('usage: content:edit -- sql "SELECT ..." (SELECT / WITH / PRAGMA only)', 2);
      console.log(JSON.stringify(db.prepare(statement).all(), null, 1));
      return;
    }
    const table = argv[1] && !argv[1].startsWith("--") ? argv[1] : null;
    if (!table) {
      for (const t of listContentTables(db)) console.log(`${t.padEnd(26)} ${db.prepare(`SELECT count(*) AS n FROM ${ident(t)}`).get().n}`);
      return;
    }
    const info = tableInfo(db, table);
    const known = new Set(info.cols.map((c) => c.name));
    const clauses = [];
    const params = [];
    const pk = option("--pk");
    if (pk) {
      const parts = pk.split(",");
      if (parts.length !== info.pkCols.length) fail(`${table} has a ${info.pkCols.length}-part key (${info.pkCols.join(", ")})`);
      info.pkCols.forEach((c, i) => (clauses.push(`${ident(c)} = ?`), params.push(parts[i])));
    }
    for (const w of options("--where")) {
      const [col, ...rest] = w.split("=");
      if (!known.has(col)) fail(`${table} has no column "${col}"`);
      clauses.push(`${ident(col)} = ?`);
      params.push(rest.join("="));
    }
    const q = option("--q");
    if (q) {
      const text = info.cols.filter((c) => !/INT|REAL|NUM/i.test(c.type)).map((c) => `${ident(c.name)} LIKE ? ESCAPE '\\'`);
      clauses.push(`(${text.join(" OR ")})`);
      params.push(...text.map(() => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`));
    }
    const cols = option("--cols")?.split(",");
    if (cols) for (const c of cols) if (!known.has(c)) fail(`${table} has no column "${c}"`);
    const limit = Number(option("--limit") ?? 20);
    const rows = db
      .prepare(`SELECT ${cols ? cols.map(ident).join(", ") : "*"} FROM ${ident(table)}${clauses.length ? ` WHERE ${clauses.join(" AND ")}` : ""} LIMIT ${Number.isInteger(limit) ? limit : 20}`)
      .all(...params)
      .map((r) => hydrateRow(r, info.jsonCols));
    console.log(JSON.stringify(rows, null, 1));
    console.error(`${rows.length} row(s) from ${table}${rows.length === limit ? ` (limit ${limit}; pass --limit for more)` : ""}`);
  } finally {
    db.close();
  }
}

// ---------------------------------------------------------------------------
// Patching
// ---------------------------------------------------------------------------

async function loadPatch(file) {
  let value;
  if (file === "-") value = JSON.parse(fs.readFileSync(0, "utf8"));
  else {
    const abs = path.resolve(file);
    if (!fs.existsSync(abs)) fail(`No such patch file: ${file}`, 2);
    if (/\.m?js$/.test(abs)) {
      const mod = (await import(pathToFileURL(abs).href)).default;
      value = typeof mod === "function" ? await mod({ paths }) : mod;
    } else value = JSON.parse(fs.readFileSync(abs, "utf8"));
  }
  const ops = Array.isArray(value) ? value : value?.ops;
  if (!Array.isArray(ops) || !ops.length) fail("A patch is an array of operations, or { note, ops: [...] }.", 2);
  return { ops, note: (Array.isArray(value) ? null : value.note) ?? null };
}

async function patchCommand(file) {
  const { ops, note: fileNote } = await loadPatch(file);
  const note = option("--note") ?? fileNote ?? path.basename(file, path.extname(file));

  // A table that source files own is edited in the files and built with content:sync; a direct write would drift the DB.
  const owned = ownedTables();
  const hit = ops.map((o) => o?.table).find((t) => owned.has(t));
  if (hit) {
    const { adapter, dir } = owned.get(hit);
    fail(
      `${hit} is owned by the source files (adapter "${adapter}"): edit content/source/${dir}/**/*.atomiq and run \`npm run content:sync\` (a dry run), then \`--apply\`.\nThe patch was not applied. See docs/features/CONTENT_SOURCE_SPEC.md.`,
    );
  }

  let preview;
  try {
    preview = dryRunBatch(paths, ops, "cli");
  } catch (err) {
    if (err instanceof StoreError) {
      printFailure(err);
      console.error("Nothing was changed.");
      process.exit(1);
    }
    throw err;
  }
  printReport(preview, { full: flag("--full") });
  if (!preview.changes.length) return console.log("Nothing to change: the database already matches this patch.");
  if (!flag("--apply")) return console.log("Dry run only. Add --apply to write it.");

  if (studioIsRunning(paths)) console.log("Note: Content Studio is open; reload it to see these edits.");
  const backup = backupUnlessIdentical(paths, "pre-script", `edit-${note}`);
  console.log(backup.created ? `Backup: ${path.relative(paths.root, backup.file)}` : "Backup: the newest one already holds this exact content.");

  const result = applyBatchToMaster(paths, ops, "cli");
  console.log(`Applied ${result.changes.length} change(s) (a draft: publish from Studio or \`npm run release:content -- --publish\`).`);

  if (flag("--no-verify")) return;
  const ok = await verifyChecks(paths, checksFor(new Set(result.changes.map((c) => c.table))));
  if (!ok) {
    console.error(`The edit is applied but a check failed. To undo it: restore ${path.relative(paths.root, backup.file)} from Studio > Backups, or revert the rows in Studio's history.`);
    process.exit(1);
  }
}

const first = argv[0];
if (!first || first === "--help" || first === "-h") fail(fs.readFileSync(new URL(import.meta.url), "utf8").match(/\/\*\*([\s\S]*?)\*\//)[1].replace(/^ \* ?/gm, "").trim(), 2);
else if (first === "get" || first === "sql" || first === "thread") readCommand(first);
else await patchCommand(first);
