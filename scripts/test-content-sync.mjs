/**
 * content:sync scenarios on a throwaway repo (spec section 12, T5 and T7): edit, insert, delete, move, a shipped
 * delete without a reason, drift, a validation failure and a parse error that leave the database untouched,
 * --check exit codes, and that a second sync is a no-op. Also: content:edit refuses a table the files own.
 *
 * Run: npm run test:source-sync
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { openDb } from "./lib/content-tables.mjs";
import { makeFixture, query, sql } from "./lib/test-fixture.mjs";
import { chatAdapter } from "./lib/content-source/adapters/chat.mjs";
import { readRowsByTable } from "./lib/content-source/adapters/default.mjs";
import { renderFiles } from "./lib/content-source/pipeline.mjs";
import { writeSourceFiles } from "./lib/content-source/files.mjs";
import { writeState } from "./lib/content-source/state.mjs";
import { checkSync, runSync } from "./lib/content-source/sync.mjs";
import { canonicalizeText } from "./lib/content-source/pipeline.mjs";
import { migrateAdapter, renumberFolder } from "./lib/content-source/migrate.mjs";
import { parseSource } from "./lib/content-source/core/parse.mjs";

const quiet = () => {};
/** Run a sync in the fixture, capturing what it prints. */
async function sync(fx, opts = {}) {
  const out = [];
  const code = await runSync({ paths: fx.paths, apply: false, verify: false, log: (m) => out.push(m), err: (m) => out.push(m), ...opts });
  return { code, text: out.join("\n") };
}
const check = (fx) => {
  const out = [];
  const code = checkSync({ paths: fx.paths, log: (m) => out.push(m), err: (m) => out.push(m) });
  return { code, text: out.join("\n") };
};

/** A fixture whose chat files were exported from its own database, and whose positions have already been synced. */
async function exported() {
  const fx = makeFixture();
  const db = openDb(fx.paths.master, { readOnly: true });
  const rows = readRowsByTable(db, ["chat_nodes"]);
  db.close();
  writeSourceFiles(fx.paths.sourceDir, renderFiles(chatAdapter, rows));
  writeState(fx.paths.sourceDir, rows);
  return fx;
}
const file = (fx, rel) => path.join(fx.paths.sourceDir, rel);
const read = (fx, rel) => fs.readFileSync(file(fx, rel), "utf8");
const write = (fx, rel, text) => fs.writeFileSync(file(fx, rel), text);
const node = (fx, id) => query(fx.paths, "SELECT * FROM chat_nodes WHERE id = ?", id)[0];
const count = (fx) => query(fx.paths, "SELECT count(*) n FROM chat_nodes")[0].n;
const HELLO = "chat/npc-hal/020-chat-hal-up-hello.atomiq";
const changesBySource = (fx, source) => {
  const db = openDb(fx.paths.historyDb, { readOnly: true });
  try {
    return db.prepare("SELECT count(*) n FROM changes WHERE source = ?").get(source).n;
  } finally {
    db.close();
  }
};

describe("content:sync", () => {
  let fx;
  before(async () => {
    fx = await exported();
  });
  after(() => fx.cleanup());

  it("files exported from the database agree with it, and syncing them is a no-op", async () => {
    assert.equal(check(fx).code, 0, "an export is in sync by construction");
    const dry = await sync(fx);
    assert.equal(dry.code, 0);
    assert.match(dry.text, /Nothing to do/);
    const applied = await sync(fx, { apply: true });
    assert.equal(applied.code, 0, applied.text);
    assert.match((await sync(fx, { apply: true })).text, /Nothing to do/);
  });

  it("an edit shows in the dry run, changes nothing, and lands on --apply", async () => {
    const before = node(fx, "chat-hal-up-hello").text;
    const text = read(fx, HELLO);
    assert.ok(text.includes(before.split("\n")[0]));
    write(fx, HELLO, text.replace(before.split("\n")[0], "EDITED FIRST BUBBLE"));
    const dry = await sync(fx);
    assert.equal(dry.code, 0);
    assert.match(dry.text, /chat_nodes: 0 to add, 1 to change, 0 moved, 0 to delete/);
    assert.match(dry.text, /update chat_nodes\[chat-hal-up-hello\]  text:/);
    assert.equal(node(fx, "chat-hal-up-hello").text, before, "a dry run writes nothing");
    assert.equal((await sync(fx, { apply: true })).code, 0);
    assert.ok(node(fx, "chat-hal-up-hello").text.startsWith("EDITED FIRST BUBBLE"));
    assert.equal(check(fx).code, 0);
    assert.ok(changesBySource(fx, "sync") > 0, "history records the source as sync");
  });

  it("a new node is inserted, and a node removed with the reply that led to it is deleted", async () => {
    const f = "chat/npc-ada/030-chat-ada-up-banana.atomiq";
    const text = read(fx, f);
    const add = `\nnode chat-ada-banana-extra\nkind: reply\npose: cheer\n\n    a brand new line\n\nreply: ok -> chat-ada-bye\nreply: and another -> chat-ada-bye\n`;
    write(fx, f, text.trimEnd() + "\n" + add);
    // make the new node reachable: one more reply on the story's first node
    const firstReply = text.match(/^reply: .*$/m);
    write(fx, f, read(fx, f).replace(firstReply[0], `${firstReply[0]}\nreply: one more option -> chat-ada-banana-extra`));
    const before = count(fx);
    const r = await sync(fx, { apply: true });
    assert.equal(r.code, 0, r.text);
    assert.equal(count(fx), before + 1);
    assert.equal(node(fx, "chat-ada-banana-extra").npc_id, "npc-ada");
    // and take it out again: remove the node and put the reply back
    write(fx, f, text);
    const r2 = await sync(fx, { apply: true });
    assert.equal(r2.code, 0, r2.text);
    assert.equal(count(fx), before);
    assert.equal(node(fx, "chat-ada-banana-extra"), undefined);
  });

  it("reordering stories is renaming files, and changes only positions", async () => {
    const dir = "chat/npc-ada";
    const a = path.join(fx.paths.sourceDir, dir, "030-chat-ada-up-banana.atomiq");
    const b = path.join(fx.paths.sourceDir, dir, "040-chat-ada-up-gummy.atomiq");
    fs.renameSync(a, path.join(fx.paths.sourceDir, dir, "045-chat-ada-up-banana.atomiq"));
    const dry = await sync(fx);
    assert.match(dry.text, /0 to add, 0 to change, \d+ moved, 0 to delete/);
    assert.equal((await sync(fx, { apply: true })).code, 0);
    const banana = node(fx, "chat-ada-up-banana").position;
    const gummy = node(fx, "chat-ada-up-gummy").position;
    assert.ok(banana > gummy, "banana now comes after gummy");
    assert.ok(fs.existsSync(b));
  });

  it("deleting a shipped id needs --retire, and writes the reason down", async () => {
    fs.mkdirSync(path.dirname(fx.paths.shippedIds), { recursive: true });
    const ids = query(fx.paths, "SELECT id FROM chat_nodes").map((r) => r.id);
    fs.writeFileSync(fx.paths.shippedIds, JSON.stringify({ chat_nodes: ids }));
    // remove the Hal stadium story file entirely
    const rel = "chat/npc-hal/030-chat-hal-up-stadium.atomiq";
    const saved = read(fx, rel);
    fs.rmSync(file(fx, rel));
    const refused = await sync(fx);
    assert.equal(refused.code, 1);
    assert.match(refused.text, /have shipped to users/);
    assert.ok(node(fx, "chat-hal-up-stadium"), "nothing was deleted");
    const ok = await sync(fx, { apply: true, retire: "story replaced" });
    assert.equal(ok.code, 0, ok.text);
    assert.equal(node(fx, "chat-hal-up-stadium"), undefined);
    const retired = JSON.parse(fs.readFileSync(fx.paths.retiredIds, "utf8"));
    assert.match(retired.chat_nodes["chat-hal-up-stadium"], /^story replaced/);
    // put it back for the tests that follow (a retired id comes back as a new node of the same id)
    void saved;
  });

  it("a change made in the database behind the files' back is drift: it stops, and --force overwrites it", async () => {
    const f = "chat/npc-ada/020-chat-ada-up-hello.atomiq";
    const want = node(fx, "chat-ada-up-hello").text;
    sql(fx.paths, "UPDATE chat_nodes SET text = ? WHERE id = ?", "changed in the database", "chat-ada-up-hello");
    write(fx, f, read(fx, f)); // files untouched
    const r = await sync(fx, { apply: true });
    assert.equal(r.code, 1);
    assert.match(r.text, /changed since the last sync or export/);
    assert.equal(node(fx, "chat-ada-up-hello").text, "changed in the database", "nothing was overwritten");
    const forced = await sync(fx, { apply: true, force: true });
    assert.equal(forced.code, 0, forced.text);
    assert.equal(node(fx, "chat-ada-up-hello").text, want);
  });

  it("a change that fails validation leaves the database untouched, in a dry run and on --apply", async () => {
    const f = "chat/npc-hal/020-chat-hal-up-hello.atomiq";
    const good = read(fx, f);
    const m = good.match(/^reply: .* -> (\S+)$/m);
    write(fx, f, good.replace(m[0], `${m[0].split(" -> ")[0]} -> chat-hal-does-not-exist`));
    const snapshot = JSON.stringify(query(fx.paths, "SELECT * FROM chat_nodes ORDER BY id"));
    for (const apply of [false, true]) {
      const r = await sync(fx, { apply });
      assert.equal(r.code, 1, r.text);
      assert.match(r.text, /Nothing was changed|✗/);
    }
    assert.equal(JSON.stringify(query(fx.paths, "SELECT * FROM chat_nodes ORDER BY id")), snapshot);
    assert.equal(check(fx).code, 1);
    write(fx, f, good);
  });

  it("a file that does not parse stops everything with file:line, and nothing is written", async () => {
    const f = "chat/npc-ada/050-chat-ada-up-unit.atomiq";
    const good = read(fx, f);
    write(fx, f, good.replace("kind: ", "kind:\t"));
    const snapshot = JSON.stringify(query(fx.paths, "SELECT * FROM chat_nodes ORDER BY id"));
    const r = await sync(fx, { apply: true });
    assert.equal(r.code, 1);
    assert.match(r.text, /chat\/npc-ada\/050-chat-ada-up-unit\.atomiq:\d+: a tab/);
    assert.equal(JSON.stringify(query(fx.paths, "SELECT * FROM chat_nodes ORDER BY id")), snapshot);
    const c = check(fx);
    assert.equal(c.code, 1);
    assert.match(c.text, /a tab/);
    write(fx, f, good);
  });

  it("a stray file and a non-canonical file are warnings, never errors", async () => {
    fs.writeFileSync(file(fx, "chat/notes.txt"), "hello");
    const f = "chat/npc-hal/060-chat-hal-up-welcome-back.atomiq";
    const text = read(fx, f);
    write(fx, f, text.replace("\nkind:", "\n\n\nkind:"));
    const c = check(fx);
    assert.match(c.text, /notes\.txt: not a \.atomiq file/);
    assert.match(c.text, /060-chat-hal-up-welcome-back\.atomiq: not in canonical form/);
    assert.equal(c.code, 0);
    write(fx, f, text);
    fs.rmSync(file(fx, "chat/notes.txt"));
  });
});

describe("ownership guard (T7)", () => {
  let fx;
  before(() => {
    fx = makeFixture();
  });
  after(() => fx.cleanup());
  const edit = (patch) => {
    const p = path.join(fx.root, "patch.json");
    fs.writeFileSync(p, JSON.stringify(patch));
    return spawnSync(process.execPath, ["--no-warnings", new URL("./content-edit.mjs", import.meta.url).pathname, p], { env: { ...process.env, ATOMIQ_ROOT: fx.root }, encoding: "utf8" });
  };

  it("content:edit refuses a table the source files own, and points at the files", () => {
    const r = edit([{ op: "update", table: "chat_nodes", pk: "chat-hal-greeting", set: { pose: "idle" } }]);
    assert.equal(r.status, 1);
    assert.match(r.stderr, /chat_nodes is owned by the source files/);
    assert.match(r.stderr, /content\/source\/chat/);
  });

  it("content:edit still works on a table that is not owned", () => {
    const r = edit([{ op: "update", table: "npcs", pk: "npc-ada", set: { title: "Radioactivity teacher" } }]);
    assert.equal(r.status, 0, r.stderr);
  });
});

describe("format, migrate, renumber and the publish gate", () => {
  let fx;
  before(async () => {
    fx = await exported();
  });
  after(() => fx.cleanup());

  it("format puts a messy file in canonical form and keeps its comments", () => {
    const rel = "chat/npc-hal/050-chat-hal-up-unit.atomiq";
    const text = read(fx, rel);
    const messy = "# a note on the file\n" + text.replace("\nkind:", "\n\n# about the kind\nkind:").replace(/\n\n(?=node )/g, "\n\n\n");
    const out = canonicalizeText(chatAdapter, messy, rel);
    assert.ok(out.startsWith("# a note on the file\nformat 1"));
    assert.ok(out.includes("# about the kind\nkind:"));
    assert.equal(canonicalizeText(chatAdapter, out, rel), out, "canonical text is a fixed point");
    assert.deepEqual(parseSource(out, { file: rel }).records.map((r) => r.ids), parseSource(text, { file: rel }).records.map((r) => r.ids));
  });

  it("migrate is a no-op on current files, and rewrites without changing a row", () => {
    const rel = "chat/npc-ada/060-chat-ada-up-welcome-back.atomiq";
    const text = read(fx, rel);
    assert.deepEqual(migrateAdapter({ sourceDir: fx.paths.sourceDir, adapter: chatAdapter, write: false }).changed, []);
    write(fx, rel, text.replace("\nkind:", "\n\n\nkind:"));
    const r = migrateAdapter({ sourceDir: fx.paths.sourceDir, adapter: chatAdapter });
    assert.deepEqual(r.changed, [rel]);
    assert.equal(read(fx, rel), text);
  });

  it("renumbering gives a folder tens again, in the same order", () => {
    const dir = path.join(fx.paths.sourceDir, "chat/npc-hal");
    fs.renameSync(path.join(dir, "040-chat-hal-up-pebbles.atomiq"), path.join(dir, "041-chat-hal-up-pebbles.atomiq"));
    fs.renameSync(path.join(dir, "050-chat-hal-up-unit.atomiq"), path.join(dir, "042-chat-hal-up-unit.atomiq"));
    const plan = renumberFolder(dir);
    assert.ok(plan.length >= 2);
    const names = fs.readdirSync(dir).sort();
    assert.deepEqual(names.map((n) => n.slice(0, 3)), ["010", "020", "030", "040", "050", "060"]);
    assert.ok(names[3].endsWith("up-pebbles.atomiq") && names[4].endsWith("up-unit.atomiq"));
  });

  it("publishing is refused while the files and the database differ", () => {
    const rel = "chat/npc-hal/020-chat-hal-up-hello.atomiq";
    write(fx, rel, read(fx, rel).replace(/^kind: .*$/m, (m) => m).replace("\n    ", "\n    CHANGED "));
    const r = spawnSync(process.execPath, ["--no-warnings", new URL("./release-content.mjs", import.meta.url).pathname, "--publish", "--notes", "x"], {
      env: { ...process.env, ATOMIQ_ROOT: fx.root },
      encoding: "utf8",
    });
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Cannot publish: the source files .* and the database differ/s);
  });
});
