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

  it("every adapter owns the files it writes, and no file belongs to two adapters", () => {
    for (const a of adapters) {
      assert.ok(a.dir, `${a.name} has no dir`);
      assert.ok(!a.owns("other/y.atomiq"));
      for (const rel of renderFiles(a, ADAPTER_SAMPLES[a.name]).keys()) {
        assert.ok(rel.startsWith(`${a.dir}/`), `${a.name} writes ${rel} outside ${a.dir}/`);
        const owners = adapters.filter((x) => x.owns(rel)).map((x) => x.name);
        assert.deepEqual(owners, [a.name], `${rel} is owned by ${owners.join(" and ")}`);
      }
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

describe("T4: bad input is refused (reference, game and phone data)", () => {
  const A = (n) => FRIENDLY_ADAPTERS.get(n);
  const header = (adapter, scope) => `format 1\nadapter ${adapter} 1\n${scope}\n\n`;
  const fails = (fn, re, line) => {
    try {
      fn();
    } catch (e) {
      assert.match(e.message, re);
      if (line != null) assert.equal(e.line, line);
      return;
    }
    assert.fail(`expected an error matching ${re}`);
  };

  it("a list item must fit on one line, and a block attribute cannot be a list item", () => {
    const entry = { id: "e1", term: "T", definition: "d", category: "science", related_terms: [], quick_facts: ["two\nlines"], sources: [], image: null, debunking_snippet: null, related_myths: [], difficulty: "beginner" };
    fails(() => renderFiles(A("encyclopedia"), { encyclopedia_entries: [entry] }), /quick_facts item[\s\S]*one line/);
  });

  it("numbers and JSON are checked with the line", () => {
    const m = header("mythbuster", "difficulty: easy") + "question mb-x\n\nquestion:\n    q\n\nanswer: two\noptions: a\n\nexplanation:\n    e\n";
    fails(() => readFiles(A("mythbuster"), new Map([["games/mythbuster/010-easy.atomiq", m]])), /not an integer/, 10);
    const s = header("scanner", "scene: kitchen") + "target scan-x\nname: N\nobject: water\nblurb: b\nfun_fact: f\n\ncomposition:\n    {broken\n";
    fails(() => readFiles(A("scanner"), new Map([["phone/scanner/010-kitchen.atomiq", s]])), /invalid JSON/, 11);
    const mp = "format 1\nadapter map 1\n\nsite site-x\nname: N\nplace: P\nkind: history\nyear: 1900\nlat: north\nlon: 2\nblurb: b\nfact: f\n";
    fails(() => readFiles(A("map"), new Map([["phone/map/sites.atomiq", mp]])), /not a number/, 9);
  });

  it("an unknown attribute or a missing required one is an error, never a guess", () => {
    const r = header("references", "kind: official") + "source ref-x\npublisher: P\ntitle: T\ncolour: red\n";
    fails(() => readFiles(A("references"), new Map([["reference/sources/official.atomiq", r]])), /unknown attribute "colour"/, 8);
    const noTitle = header("references", "kind: official") + "source ref-x\npublisher: P\n";
    fails(() => readFiles(A("references"), new Map([["reference/sources/official.atomiq", noTitle]])), /title/);
    const dup = header("statements", "unit: u") + "statement s1\nverdict: fact\nstatement: a\nexplanation:\n    e\n\nstatement s1\nverdict: myth\nstatement: b\nexplanation:\n    e\n";
    fails(() => readFiles(A("statements"), new Map([["units/u/statements.atomiq", dup]])), /is defined twice/);
  });

  it("a scope that the file does not say is an error (a card needs its section)", () => {
    const text = "format 1\nadapter safety 1\n\ncard c1\ntitle: T\nicon: Sun1\nsummary: s\n";
    fails(() => readFiles(A("safety"), new Map([["phone/safety/010-basics.atomiq", text]])), /section/);
  });

  it("each adapter owns only its own directory", () => {
    const own = (n, rel) => A(n).owns(rel);
    assert.ok(own("statements", "units/inside-the-atom/statements.atomiq") && !own("statements", "units/inside-the-atom/lessons.atomiq"));
    assert.ok(own("encyclopedia", "reference/encyclopedia/people/x.atomiq") && !own("encyclopedia", "reference/encyclopedia/x.atomiq"));
    assert.ok(own("references", "reference/sources/official.atomiq") && !own("references", "reference/myths/safety.atomiq"));
  });
});

describe("T4: bad input is refused (lessons)", () => {
  const A = FRIENDLY_ADAPTERS.get("curriculum");
  const fails = (fn, re, line) => {
    try {
      fn();
    } catch (e) {
      assert.match(e.message, re);
      if (line != null) assert.equal(e.line, line);
      return;
    }
    assert.fail(`expected an error matching ${re}`);
  };
  const base = JSON.parse(JSON.stringify(ADAPTER_SAMPLES.curriculum));
  const withCard = (data, over = {}) => ({ ...base, lesson_cards: [{ ...base.lesson_cards[0], data, ...over }] });
  const withItem = (data) => ({ ...base, items: [{ ...base.items[0], data }] });

  it("a data key the format has no place for is an error, not a silent loss", () => {
    fails(() => renderFiles(A, withCard({ title: "t", body: "b", sparkle: true })), /"sparkle", which the lesson format cannot write for a teach explain/);
    fails(() => renderFiles(A, withItem({ prompt: "p", explanation: "e", colour: "red" })), /"colour", which the lesson format cannot write/);
    // a sim keeps anything it has in its config instead
    const sim = renderFiles(A, withCard({ task: "t", mode: "x", anything: [1] }, { kind: "sim", type: "atom-builder" }));
    assert.match([...sim.values()].find((t) => t.includes("lesson demo-lesson")), /config: \{"mode":"x","anything":\[1\]\}/);
  });

  it("a figure has a ref or a scene, and nothing else the format cannot write", () => {
    fails(() => renderFiles(A, withCard({ body: "b", figure: { ref: "x", scene: { height: 1, shapes: [] } } })), /a ref or a scene, never both/);
    fails(() => renderFiles(A, withCard({ body: "b", figure: { altText: "only words that are long enough" } })), /a ref or a scene, never both and never neither/);
    fails(() => renderFiles(A, withCard({ body: "b", figure: { ref: "x", colour: 1 } })), /"colour", which the lesson format cannot write/);
  });

  it("reading: an unknown attribute, a duplicate card in one lesson and a missing unit header all stop with the line", () => {
    const head = "format 1\nadapter curriculum 1\nunit: u\n\nlesson l1\ntitle: T\nminutes: 3\n\n";
    const read = (text, rel = "units/u/lessons/010-l1.atomiq") => readFiles(A, new Map([[rel, text]]));
    fails(() => read(`${head}card c01\nkind: teach\ntype: explain\nsparkle: 1\n`), /unknown attribute "sparkle"/, 12);
    fails(() => read(`${head}card c01\nkind: teach\ntype: explain\n\nbody:\n    b\n\ncard c01\nkind: teach\ntype: explain\n\nbody:\n    b\n`), /is defined twice/);
    fails(() => read(head.replace("unit: u\n", "")), /needs "unit_id" in the file header/, 4);
    fails(() => read(`${head}card c01\nkind: teach\ntype: explain\nfigure_at: soon\n`), /not an integer/, 12);
    // the same card id in two lessons is fine
    const two = `${head}card c01\nkind: teach\ntype: explain\n\nbody:\n    b\n\nlesson l2\ntitle: T2\nminutes: 3\n\ncard c01\nkind: teach\ntype: explain\n\nbody:\n    b\n`;
    assert.equal(read(two).rows.lesson_cards.length, 2);
  });
});

describe("a sync across adapters keeps foreign keys valid", () => {
  it("orderOps: parks, then deletes last adapter first, then inserts first adapter first, then updates", async () => {
    const { orderOps } = await import("./lib/content-source/sync.mjs");
    const refs = [{ op: "insert", table: "content_references", values: { id: "r" } }, { op: "delete", table: "content_references", pk: "old" }];
    const cards = [
      { op: "update", table: "safety_cards", pk: "a", set: { position: -1 } },
      { op: "delete", table: "safety_card_references", pk: ["old-card", "old"] },
      { op: "insert", table: "safety_card_references", values: { card_id: "c", reference_id: "r" } },
      { op: "update", table: "safety_cards", pk: "a", set: { position: 0 } },
    ];
    const order = orderOps([refs, cards]).map((o) => `${o.op}:${o.table}`);
    assert.deepEqual(order, [
      "update:safety_cards",
      "delete:safety_card_references",
      "delete:content_references",
      "insert:content_references",
      "insert:safety_card_references",
      "update:safety_cards",
    ]);
  });
});

describe("table ranks", { skip: !haveMaster }, () => {
  it("a table that others point at ranks before them, even across adapters (npcs, units, lessons, npc_lines)", async () => {
    const { tableRanks, orderOps } = await import("./lib/content-source/sync.mjs");
    const db = openDb(paths.master, { readOnly: true });
    const rank = tableRanks(db);
    db.close();
    const r = (t) => rank.get(t);
    assert.ok(r("npcs") < r("units") && r("units") < r("lessons") && r("lessons") < r("npc_lines"));
    assert.ok(r("content_references") < r("lesson_references") && r("items") < r("lesson_cards") && r("blog_posts") < r("blog_comments"));
    const order = orderOps(
      [[{ op: "insert", table: "npc_lines", values: {} }, { op: "delete", table: "npcs", pk: "n" }], [{ op: "insert", table: "lessons", values: {} }, { op: "delete", table: "npc_lines", pk: "l" }]],
      rank,
    ).map((o) => `${o.op}:${o.table}`);
    assert.deepEqual(order, ["delete:npc_lines", "delete:npcs", "insert:lessons", "insert:npc_lines"]);
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
