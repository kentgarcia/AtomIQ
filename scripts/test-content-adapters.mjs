/**
 * The real adapters (chat, characters, feed, blog): every column is covered (T9), the real master round-trips through
 * each of them, the canonical form of each is pinned by golden files (T2) and still read (T8), bad input is refused with
 * a useful message (T4), and the roster in code says what the characters' files say.
 *
 * Run: npm run test:source-adapters
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { listContentTables, openDb, tableInfo, TIMESTAMP_COLS } from "./lib/content-tables.mjs";
import { makePaths } from "./lib/content-paths.mjs";
import { SourceError } from "./lib/content-source/core/errors.mjs";
import { coveredColumns } from "./lib/content-source/adapters/engine.mjs";
import { readRowsByTable } from "./lib/content-source/adapters/default.mjs";
import { renderFiles, readFiles } from "./lib/content-source/pipeline.mjs";
import { FRIENDLY_ADAPTERS } from "./lib/content-source/registry.mjs";
import { OWNED_ADAPTERS, ownedAdapters, ownedTables } from "./lib/content-source/owned.mjs";
import { readSourceFiles, walk } from "./lib/content-source/files.mjs";
import { parseSource } from "./lib/content-source/core/parse.mjs";
import { ADAPTER_SAMPLES } from "./golden/content-source/adapter-samples.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GOLDEN = path.join(HERE, "golden", "content-source", "adapters-v1");
const paths = makePaths();
const haveMaster = fs.existsSync(paths.master);
const adapters = [...FRIENDLY_ADAPTERS.values()];

describe("adapter registry", () => {
  it("every owned adapter exists and no two adapters own the same table", () => {
    for (const n of OWNED_ADAPTERS) assert.ok(FRIENDLY_ADAPTERS.has(n), `${n} is owned but not defined`);
    const seen = new Map();
    for (const a of adapters) for (const t of a.tables) {
      assert.ok(!seen.has(t), `${t} is written by both ${seen.get(t)} and ${a.name}`);
      seen.set(t, a.name);
    }
    assert.equal(ownedTables().size, [...seen.keys()].filter((t) => ownedAdapters().some((a) => a.tables.has(t))).length);
  });

  it("every adapter has a directory that its files are under", () => {
    for (const a of adapters) {
      assert.ok(a.dir, `${a.name} has no dir`);
      assert.ok(a.owns(`${a.dir}/x/y.atomiq`));
      assert.ok(!a.owns(`${a.dir}x/y.atomiq`) && !a.owns(`other/y.atomiq`));
    }
  });
});

describe("T9: coverage", { skip: !haveMaster }, () => {
  it("every column of every table an adapter handles is covered, and no adapter names a column that is not there", () => {
    const db = openDb(paths.master, { readOnly: true });
    for (const a of adapters) {
      for (const t of a.tables) {
        const real = new Set(tableInfo(db, t).cols.map((c) => c.name).filter((c) => !TIMESTAMP_COLS.has(c)));
        const covered = coveredColumns(a, t);
        for (const c of real) assert.ok(covered.has(c), `${a.name}: ${t}.${c} is not covered`);
        for (const c of covered) assert.ok(real.has(c), `${a.name}: names ${t}.${c}, which is not a column`);
      }
    }
    assert.ok(listContentTables(db).length >= 27);
    db.close();
  });
});

/** Rows as a set: the master is read in id order and the files in position order, and `position` is a column, so order carries nothing else. */
const canon = (v) => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v);
const asSet = (rows) => [...(rows ?? [])].map((r) => JSON.stringify(canon(r))).sort();

describe("real data", { skip: !haveMaster }, () => {
  for (const a of adapters) {
    it(`${a.name}: the real master round-trips, positions included`, () => {
      const db = openDb(paths.master, { readOnly: true });
      const rows = readRowsByTable(db, [...a.tables]);
      db.close();
      const files = renderFiles(a, rows);
      const back = readFiles(a, files).rows;
      for (const t of a.tables) assert.deepEqual(asSet(back[t]), asSet(rows[t]), `${a.name}: ${t} differs after a round trip`);
      const again = renderFiles(a, back);
      for (const [k, v] of files) assert.equal(again.get(k), v, `${k}: not stable on a second write`);
    });

    it(`${a.name}: the committed source files are exactly what the database exports`, () => {
      if (!OWNED_ADAPTERS.includes(a.name)) return;
      const db = openDb(paths.master, { readOnly: true });
      const exported = renderFiles(a, readRowsByTable(db, [...a.tables]));
      db.close();
      const onDisk = readSourceFiles(paths.sourceDir, a.owns);
      assert.deepEqual([...onDisk.keys()].sort(), [...exported.keys()].sort(), "the same files");
      for (const [k, v] of exported) assert.equal(onDisk.get(k), v, `${k} differs from the database (run npm run content:sync)`);
    });
  }
});

describe("golden files", () => {
  const onDisk = new Map(walk(GOLDEN).map((rel) => [rel, fs.readFileSync(path.join(GOLDEN, rel), "utf8")]));
  for (const a of adapters) {
    it(`T2: ${a.name} canonical form is pinned`, () => {
      const rendered = renderFiles(a, ADAPTER_SAMPLES[a.name]);
      const mine = [...onDisk.keys()].filter((k) => a.owns(k));
      assert.deepEqual([...rendered.keys()].sort(), mine.sort());
      for (const [k, v] of rendered) assert.equal(v, onDisk.get(k), `${k} no longer matches its golden file: the canonical form changed (an adapter version bump and content:migrate)`);
    });
    it(`T8: ${a.name} golden files are still read to the same rows`, () => {
      const files = new Map([...onDisk].filter(([k]) => a.owns(k)));
      assert.ok(parseSource([...files.values()][0], { file: "golden" }).adapter.name === a.name);
      const { rows } = readFiles(a, files);
      for (const t of a.tables) assert.deepEqual(asSet(rows[t]), asSet(ADAPTER_SAMPLES[a.name][t]), `${a.name}: ${t} reads differently`);
    });
  }
});

describe("T4: bad input is refused", () => {
  const chat = FRIENDLY_ADAPTERS.get("chat");
  const blog = FRIENDLY_ADAPTERS.get("blog");
  const feed = FRIENDLY_ADAPTERS.get("feed");
  const characters = FRIENDLY_ADAPTERS.get("characters");
  const node = (extra = "", body = "    words\n") => new Map([["chat/npc-x/010-a.atomiq", `format 1\nadapter chat 1\nnpc: npc-x\n\nnode chat-x-a\nkind: reply\npose: idle\n\n${body}\n${extra}`]]);
  const fails = (fn, re, line) => {
    try {
      fn();
    } catch (e) {
      assert.ok(e instanceof SourceError || e instanceof Error);
      assert.match(e.message, re);
      if (line != null) assert.equal(e.line, line);
      return;
    }
    assert.fail(`expected an error matching ${re}`);
  };
  const rowOf = (replies) => ({ chat_nodes: [{ id: "chat-x-a", npc_id: "npc-x", kind: "reply", pose: "idle", trigger: null, title: null, position: 0, text: "x", replies }] });

  it("chat: replies that the format cannot write are refused when written", () => {
    fails(() => renderFiles(chat, rowOf([{ label: "a -> b", next: "chat-x-b" }])), /cannot contain " -> "/);
    fails(() => renderFiles(chat, rowOf([{ label: "ok", next: "chat-x-b", requires: "x" }])), /"requires", which the chat format cannot write/);
    fails(() => renderFiles(chat, rowOf([{ label: "two words", type: "react" }])), /must be an id of chat-art/);
    fails(() => renderFiles(chat, rowOf([{ label: "ok", type: "react", action: { screen: "app" } }])), /cannot also open a screen/);
    fails(() => renderFiles(chat, rowOf([{ label: "ok", type: "shout" }])), /use react or emoji/);
    fails(() => renderFiles(chat, rowOf([{ label: "ok", action: { screen: "app", x: 1 } }])), /action the chat format cannot write/);
  });

  it("chat: reading errors point at the line", () => {
    fails(() => readFiles(chat, node("link: a => app\nlink: b -> chat-x-b => app\n")), /a link opens a screen and leads nowhere/, 12);
    fails(() => readFiles(chat, node("react: two words -> chat-x-b\n")), /must be an id of chat-art/, 11);
    fails(() => readFiles(chat, node("reply:\n")), /cannot read the reply|expected/, 11);
    fails(() => readFiles(chat, node("sticker: ok => app\n")), /cannot also open a screen/, 11);
    fails(() => readFiles(chat, node("shout: hi\n")), /unknown attribute "shout"/, 11);
  });

  it("blog: unknown blocks and misplaced captions are refused", () => {
    const post = (blocks) => ({ blog_posts: [{ id: "blog-a", npc_id: "npc-x", unit_id: "u", lesson_id: null, position: 0, title: "t", hook: "h", cover: "atom", read_min: 1, unlock: { trigger: "none" }, reactors: [], blocks }], blog_comments: [], blog_references: [] });
    fails(() => renderFiles(blog, post([{ t: "video", text: "x" }])), /block of type "video"/);
    fails(() => renderFiles(blog, post([{ t: "p", text: "x", color: "red" }])), /"color", which the blog format cannot write/);
    fails(() => renderFiles(blog, post([{ t: "list", items: ["ok", "two\nlines"] }])), /one line/);
    fails(() => renderFiles(blog, post([{ t: "next", label: "go" }])), /needs a label and a lessonId or unitId/);
    const text = "format 1\nadapter blog 1\nunit: u\n\npost blog-a\nauthor: npc-x\ntitle: t\nhook: h\ncover: atom\nread: 1\n\ncaption: lonely\n";
    fails(() => readFiles(blog, new Map([["blog/u/010-a.atomiq", text]])), /a caption belongs right after its figure/, 12);
    fails(() => readFiles(blog, new Map([["blog/u/010-a.atomiq", text.replace("caption: lonely", "next: broken")]])), /expected: next: <label> => lesson <id>/, 12);
  });

  it("feed and characters: types are checked", () => {
    const f = "format 1\nadapter feed 1\nnpc: npc-x\n\npost ft-x\nkind: celebrate\ntrigger: t\nweight: heavy\n\ntext:\n    hi\n";
    fails(() => readFiles(feed, new Map([["feed/npc-x.atomiq", f]])), /not an integer/, 8);
    const c = "format 1\nadapter characters 1\n\nnpc npc-x\nname: X\ntitle: T\nfield: f\nbio:\n    b\nspec: {broken\n";
    fails(() => readFiles(characters, new Map([["characters/010-npc-x.atomiq", c]])), /invalid JSON/, 10);
    const orphan = "format 1\nadapter characters 1\n\nline line-x\nkind: meet\n\n    hi\n";
    fails(() => readFiles(characters, new Map([["characters/010-x.atomiq", orphan]])), /must come after a npc record/, 4);
  });
});

describe("the roster in code says what the files say (spec open item 2)", { skip: !haveMaster }, () => {
  it("name, title, field, bio and every voice line of components/npc/npc-roster.ts equal content/source/characters", async () => {
    const { NPC_ROSTER, NPC_LINES } = await import(pathToFileURL(path.join(HERE, "..", "components/npc/npc-roster.ts")).href);
    const { rows } = readFiles(FRIENDLY_ADAPTERS.get("characters"), readSourceFiles(paths.sourceDir, FRIENDLY_ADAPTERS.get("characters").owns));
    const npcs = new Map(rows.npcs.map((r) => [r.id, r]));
    for (const n of NPC_ROSTER) {
      const r = npcs.get(n.id);
      assert.ok(r, `${n.id} is in the roster but has no file`);
      for (const f of ["name", "title", "field", "bio"]) assert.equal(n[f], r[f], `${n.id}.${f}: components/npc/npc-roster.ts and content/source/characters differ (change both)`);
    }
    const lines = new Map(rows.npc_lines.map((r) => [r.id, r]));
    for (const l of NPC_LINES) {
      const r = lines.get(l.id);
      if (!r) continue; // a roster line whose lesson is not in this database yet
      assert.equal(l.text, r.text, `${l.id}.text differs between the roster and the files`);
      assert.equal(l.pose, r.pose, `${l.id}.pose differs between the roster and the files`);
    }
  });
});
