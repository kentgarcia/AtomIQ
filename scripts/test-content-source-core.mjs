/**
 * Tests of the content source core (spec docs/features/CONTENT_SOURCE_SPEC.md section 12):
 *   T1 default adapter round trip over every table of the real master   T2 golden files (canonical form is pinned)
 *   T3 hostile text   T4 parse errors with file:line   T6 determinism   T8 old versions still parse   T9 adapter coverage
 * Run: node --no-warnings --test scripts/test-content-source-core.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { listContentTables, openDb, tableInfo, TIMESTAMP_COLS } from "./lib/content-tables.mjs";
import { makePaths } from "./lib/content-paths.mjs";
import { parseSource } from "./lib/content-source/core/parse.mjs";
import { writeSource } from "./lib/content-source/core/write.mjs";
import { SourceError } from "./lib/content-source/core/errors.mjs";
import { sameValue } from "./lib/content-source/core/values.mjs";
import { coveredColumns } from "./lib/content-source/adapters/engine.mjs";
import { makeDefaultAdapter, readRowsByTable } from "./lib/content-source/adapters/default.mjs";
import { readFiles, renderFiles } from "./lib/content-source/pipeline.mjs";
import { walk } from "./lib/content-source/files.mjs";
import { sampleAdapter, TEST_ADAPTERS } from "./golden/content-source/test-adapters.mjs";
import { SAMPLE_ROWS } from "./golden/content-source/sample-rows.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(HERE, "golden", "content-source");
const master = makePaths().master;
const haveMaster = fs.existsSync(master);

const sample = (rows) => renderFiles(sampleAdapter, rows);
const read = (files) => readFiles(sampleAdapter, files).rows;
/** A minimal one-file source for the sample adapter. */
const src = (body) => new Map([["sample/x.atomiq", `format 1\nadapter sample 1\nowner: ada\n\n${body}`]]);
const throwsAt = (fn, line, re) => {
  try {
    fn();
  } catch (e) {
    assert.ok(e instanceof SourceError, `expected a SourceError, got ${e?.stack ?? e}`);
    if (line != null) assert.equal(e.line, line, `line of "${e.message}"`);
    if (re) assert.match(e.message, re);
    return e;
  }
  assert.fail("expected an error");
};

// --- T1 ----------------------------------------------------------------------------------------------------------------------------------------------
test("T1: the default adapter round-trips every table of the real master", { skip: !haveMaster }, () => {
  const db = openDb(master, { readOnly: true });
  const tables = listContentTables(db);
  assert.ok(tables.length >= 27, "the survey found 27 content tables");
  const rows = readRowsByTable(db, tables);
  for (const t of tables) {
    const adapter = makeDefaultAdapter(db, [t]);
    const files = renderFiles(adapter, { [t]: rows[t] });
    const back = readFiles(adapter, files).rows[t];
    assert.ok(sameValue(back, rows[t]), `${t}: rows -> files -> rows differ`);
    const again = renderFiles(adapter, { [t]: back });
    for (const [k, v] of files) assert.equal(again.get(k), v, `${t}: files -> rows -> files is not byte-identical`);
  }
  db.close();
});

// --- T2 ----------------------------------------------------------------------------------------------------------------------------------------------
test("T2: golden files pin the canonical form of core v1", () => {
  const dir = path.join(GOLDEN, "v1");
  const onDisk = new Map(walk(dir).map((rel) => [rel, fs.readFileSync(path.join(dir, rel), "utf8")]));
  const rendered = sample(SAMPLE_ROWS);
  assert.deepEqual([...rendered.keys()].sort(), [...onDisk.keys()].sort());
  for (const [k, v] of rendered) assert.equal(v, onDisk.get(k), `${k} no longer matches its golden file: the canonical form changed (that needs a version bump and content:migrate)`);
});

// --- T3 ----------------------------------------------------------------------------------------------------------------------------------------------
const HOSTILE = [
  "[[pic:tour-home]]", "(a whisper)", "- a dash", "# a hash", "reply: looks like a reply", "node looks-like-a-record", "choice: x -> y", "key: value",
  "a: b: c", "“curly” ‘quotes’ and an emoji 🙂", "x".repeat(900), "  leading spaces", "line one\nline two", "a\n\nb\n\n\nc", "    four spaces inside", "ends with colon:", "format 1", "adapter sample 1",
];

test("T3: hostile text survives every value position", () => {
  for (const s of HOSTILE) {
    const rows = {
      sample_items: [{ id: "h", owner: "ada", position: 0, kind: s.includes("\n") || s.length > 120 || /^\s/.test(s) ? "k" : s, count: 1, ratio: null, meta: s.length < 60 ? { s } : null, tags: s.includes("\n") || s.length > 120 || /^\s/.test(s) ? [] : [s], choices: [{ label: s.includes(" -> ") || s.includes("\n") || s.length > 120 || /^\s/.test(s) ? "ok" : s }], text: s }],
      sample_refs: [],
      sample_cards: [{ lesson: "l", id: "c", title: s.includes("\n") || s.length > 120 ? null : s, level: 1, summary: s, data: { s }, log: [{ s }] }],
    };
    const files = sample(rows);
    const back = read(files);
    assert.ok(sameValue(back.sample_items, rows.sample_items.map((r) => ({ ...r }))), `items: ${JSON.stringify(s.slice(0, 40))}`);
    assert.ok(sameValue(back.sample_cards, rows.sample_cards), `cards: ${JSON.stringify(s.slice(0, 40))}`);
    for (const [k, v] of files) assert.equal(sample(back).get(k), v, "stable on a second write");
  }
});

test("T3: empty string is not null, and the two stay apart", () => {
  const rows = { sample_cards: [{ lesson: "l", id: "a", title: "", level: 1, summary: "", data: {}, log: [] }, { lesson: "l", id: "b", title: null, level: 1, summary: "x", data: {}, log: null }] };
  const back = read(sample(rows)).sample_cards;
  assert.equal(back[0].title, "");
  assert.equal(back[0].summary, "");
  assert.equal(back[1].title, null);
  assert.equal(back[1].log, null);
  assert.deepEqual(back[0].log, []);
});

test("T3: values the format cannot hold are refused when written, never altered", () => {
  const bad = (text) => ({ sample_items: [{ id: "b", owner: "ada", position: 0, kind: "k", count: 1, ratio: null, meta: null, tags: [], choices: [], text }] });
  assert.throws(() => sample(bad("trailing space ")), /trailing whitespace/);
  assert.throws(() => sample(bad("tab\there")), /tab/);
  assert.throws(() => sample(bad("\nstarts with newline")), /newline/);
  assert.throws(() => sample(bad("ends with newline\n")), /newline/);
  assert.throws(() => sample(bad("crlf\r\nline")), /carriage return|tab/);
  assert.throws(() => sample({ sample_items: [{ ...bad("x").sample_items[0], id: "has space" }] }), /not a valid id/);
  assert.throws(() => sample({ sample_items: [{ ...bad("x").sample_items[0], count: 1.5 }] }), /integer/);
  assert.throws(() => sample({ sample_items: [{ ...bad("x").sample_items[0], tags: ["two\nlines"] }] }), /one line/);
});

test("T3: a body cannot share a record with a block attribute", () => {
  const long = "k".repeat(200 + 1);
  assert.throws(() => sample({ sample_items: [{ id: "b", owner: "ada", position: 0, kind: long, count: 1, ratio: null, meta: null, tags: [], choices: [], text: "body" }] }), /too long to sit above the body/);
});

test("T3: comments survive parse and write, and never reach the rows", () => {
  const text = "# header note\nformat 1\nadapter sample 1\nowner: ada\n\n# about this item\nitem a\n# kind note\nkind: k\ncount: 1\n\n    body\n\n# the end\n";
  const ast = parseSource(text, { file: "t" });
  assert.deepEqual(ast.comments, ["header note"]);
  assert.deepEqual(ast.records[0].comments, ["about this item"]);
  assert.deepEqual(ast.records[0].entries[0].comments, ["kind note"]);
  assert.deepEqual(ast.trailing, ["the end"]);
  assert.equal(writeSource(ast), text);
  const rows = read(new Map([["sample/x.atomiq", text]]));
  assert.equal(JSON.stringify(rows).includes("note"), false);
});

// --- T4 ----------------------------------------------------------------------------------------------------------------------------------------------
test("T4: parse errors name the file and line, and nothing is partly read", () => {
  const p = (t) => () => parseSource(t, { file: "f.atomiq" });
  const ok = "format 1\nadapter sample 1\n";
  throwsAt(p("adapter sample 1\n"), 1, /first line must be "format 1"/);
  throwsAt(p("format 2\nadapter sample 1\n"), 1, /unknown format 2/);
  throwsAt(p("format 1\nowner: x\n"), 2, /second line must be "adapter/);
  throwsAt(p("﻿format 1\n"), 1, /byte order mark/);
  throwsAt(p(ok + "owner: a\r\n"), 3, /carriage return/);
  throwsAt(p(ok + "owner: a\n\nitem x\nkind:\tk\n"), 6, /tab/);
  throwsAt(p(ok + "owner: a \n"), 3, /trailing whitespace/);
  throwsAt(p(ok + "owner:  a\n"), 3, /extra space/);
  throwsAt(p(ok + "    stray\n"), 3, /no block above/);
  throwsAt(p(ok + "\nitem x\nkind: k\n    glued to the attribute\n"), 6, /no block above/);
  throwsAt(p(ok + "\nitem x\n\n    one\n\nkind: k\n\n    two\n"), 10, /two bodies/);
  throwsAt(p(ok + "\nitem\n"), 4, /has no id/);
  throwsAt(p(ok + "\nItem x\n"), 4, /not a record keyword/);
  throwsAt(p(ok + "\nitem bad!id\n"), 4, /not a valid id/);
  throwsAt(p(ok + "\nitem x  y\n"), 4, /extra spaces/);
  throwsAt(p(ok + "\nitem x\nsummary:\n  two spaces\n"), 6, /exactly 4 spaces/);
});

test("T4: reading errors (unknown things are never ignored)", () => {
  throwsAt(() => read(src("item a\nkind: k\ncount: 1\nbogus: 1\n\n    t\n")), 8, /unknown attribute "bogus"/);
  throwsAt(() => read(src("item a\nkind: k\ncount: 1\ncount: 2\n\n    t\n")), 8, /given twice/);
  throwsAt(() => read(src("item a\nkind: k\ncount: one\n\n    t\n")), 7, /not an integer/);
  throwsAt(() => read(src("item a\nkind: k\ncount: 1\nratio: x\n\n    t\n")), 8, /not a number/);
  throwsAt(() => read(src("item a\nkind: k\ncount: 1\nmeta: {nope\n\n    t\n")), 8, /invalid JSON/);
  throwsAt(() => read(src("item a\nkind: k\n\n    t\n")), 5, /missing "count"/);
  throwsAt(() => read(src("item a\nkind: k\ncount: 1\n")), 5, /missing "its body"/);
  throwsAt(() => read(src("thing a\nkind: k\n")), 5, /unknown record kind "thing"/);
  throwsAt(() => read(src("item a b\nkind: k\n")), 5, /1 id part/);
  throwsAt(() => read(src("item a\nkind: k\ncount: 1\n\n    t\n\nitem a\nkind: k\ncount: 1\n\n    t\n")), 11, /defined twice \(first at sample\/x.atomiq:5\)/);
  throwsAt(() => read(src("item a\nkind: k\ncount: 1\nreferences: ref-a\nreferences: ref-a\n\n    t\n")), 8, /lists ref-a twice/);
  throwsAt(() => read(new Map([["sample/x.atomiq", "format 1\nadapter sample 1\n\nitem a\nkind: k\ncount: 1\n\n    t\n"]])), 4, /needs "owner"/);
  throwsAt(() => read(new Map([["sample/x.atomiq", "format 1\nadapter sample 2\nowner: a\n"]])), 2, /version 2 is not supported/);
  throwsAt(() => read(new Map([["sample/x.atomiq", "format 1\nadapter chat 1\nowner: a\n"]])), 2, /for adapter "chat"/);
});

test("T4: an error aborts before anything is returned", () => {
  const files = new Map([
    ["sample/a.atomiq", "format 1\nadapter sample 1\nowner: a\n\nitem a1\nkind: k\ncount: 1\n\n    ok\n"],
    ["sample/b.atomiq", "format 1\nadapter sample 1\nowner: b\n\nitem b1\nkind: k\ncount: nope\n\n    bad\n"],
  ]);
  const e = throwsAt(() => readFiles(sampleAdapter, files), 7, /not an integer/);
  assert.equal(e.file, "sample/b.atomiq");
});

// --- T6 ----------------------------------------------------------------------------------------------------------------------------------------------
test("T6: output is deterministic, and a second pass changes nothing", { skip: !haveMaster }, () => {
  const db = openDb(master, { readOnly: true });
  const tables = listContentTables(db);
  const adapter = makeDefaultAdapter(db, tables);
  const rows = readRowsByTable(db, tables);
  const a = renderFiles(adapter, rows);
  const b = renderFiles(adapter, rows);
  assert.deepEqual([...a], [...b]);
  const back = readFiles(adapter, a).rows;
  const c = renderFiles(adapter, back);
  assert.deepEqual([...a], [...c]);
  db.close();
});

test("T6: derived positions follow file order, then record order", () => {
  const files = new Map([
    ["sample/a.atomiq", "format 1\nadapter sample 1\nowner: ada\n\nitem z\nkind: k\ncount: 1\n\n    t\n\nitem y\nkind: k\ncount: 1\n\n    t\n"],
    ["sample/b.atomiq", "format 1\nadapter sample 1\nowner: ada\n\nitem x\nkind: k\ncount: 1\n\n    t\n"],
  ]);
  const items = read(files).sample_items;
  assert.deepEqual(items.map((r) => [r.id, r.position]), [["z", 0], ["y", 1], ["x", 2]]);
});

// --- T8 ----------------------------------------------------------------------------------------------------------------------------------------------
test("T8: every golden file ever committed is still read by the current code", () => {
  const versions = fs.readdirSync(GOLDEN, { withFileTypes: true }).filter((d) => d.isDirectory());
  assert.ok(versions.length >= 1);
  for (const v of versions) {
    const dir = path.join(GOLDEN, v.name);
    const files = new Map(walk(dir).map((rel) => [rel, fs.readFileSync(path.join(dir, rel), "utf8")]));
    const first = parseSource([...files.values()][0], { file: "golden" });
    const adapter = TEST_ADAPTERS[first.adapter.name];
    assert.ok(adapter, `golden ${v.name} uses adapter ${first.adapter.name}`);
    assert.ok(sameValue(readFiles(adapter, files).rows, SAMPLE_ROWS), `${v.name} no longer reads to the same rows`);
  }
});

// --- T9 ----------------------------------------------------------------------------------------------------------------------------------------------
test("T9: a default adapter exists for every table and covers every column", { skip: !haveMaster }, () => {
  const db = openDb(master, { readOnly: true });
  const tables = listContentTables(db);
  const adapter = makeDefaultAdapter(db, tables);
  for (const t of tables) {
    assert.ok(adapter.tables.has(t), `${t} has a default record`);
    const covered = coveredColumns(adapter, t);
    for (const c of tableInfo(db, t).cols) {
      if (TIMESTAMP_COLS.has(c.name)) continue;
      assert.ok(covered.has(c.name), `${t}.${c.name} is not covered by the default adapter`);
    }
  }
  db.close();
});

test("T9: an adapter definition with a conflict is refused when it is defined", async () => {
  const { defineAdapter } = await import("./lib/content-source/adapters/engine.mjs");
  const base = { name: "x", version: 1, owns: () => true, layout: () => [] };
  assert.throws(() => defineAdapter({ ...base, records: [{ keyword: "a", table: "t", id: ["id"], fields: [{ col: "a", type: "text" }, { col: "b", type: "text", key: "a" }] }] }), /used twice/);
  assert.throws(() => defineAdapter({ ...base, records: [{ keyword: "a", table: "t", id: ["id"], fields: [{ col: "a", type: "text", body: true }, { col: "b", type: "prose" }] }] }), /body and a prose/);
  assert.throws(() => defineAdapter({ ...base, records: [{ keyword: "a", table: "t", id: ["id"], fields: [{ col: "a", type: "text", body: true }, { col: "b", type: "text", body: true }] }] }), /more than one body/);
});
