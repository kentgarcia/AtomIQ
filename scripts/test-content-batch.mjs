/**
 * Batched content edits (`applyBatch` in content-store.mjs and `npm run content:edit`): one transaction
 * and one validation pass for a whole patch, atomic rollback, guard rails (no silent no-ops, shipped ids),
 * history, and the backup that is skipped when an identical one exists.
 *
 * Run: npm run test:content-batch
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { backupUnlessIdentical, listBackups } from "./lib/backup.mjs";
import { checksFor } from "./lib/content-checks.mjs";
import { createStore, openHistory, StoreError } from "./lib/content-store.mjs";
import { listContentTables, openDb } from "./lib/content-tables.mjs";
import { makeFixture, query, sql } from "./lib/test-fixture.mjs";

const fx = makeFixture();
let db;
let history;
let store;

before(() => {
  db = openDb(fx.paths.master);
  history = openHistory(fx.paths.historyDb);
  store = createStore({ db, history, paths: fx.paths });
});
after(() => {
  db.close();
  history.close();
  fx.cleanup();
});

const line = (id) => query(fx.paths, "SELECT id, npc_id, text FROM npc_lines WHERE id = ?", id)[0];
const lines = () => query(fx.paths, "SELECT id, npc_id, text FROM npc_lines ORDER BY id");
const changesFor = (id) => history.prepare("SELECT action, source FROM changes WHERE entity_pk = ? ORDER BY id").all(id).map((r) => ({ ...r }));

describe("applyBatch", () => {
  it("applies updates, a replace and an insert together and records history", () => {
    const [a, b] = lines();
    const out = store.applyBatch({
      source: "test",
      ops: [
        { op: "update", table: "npc_lines", pk: a.id, set: { text: `${a.text} (edited)` } },
        { op: "replace", table: "npc_lines", column: "text", find: b.text.slice(0, 6), with: "Edited", where: { id: b.id } },
        { op: "insert", table: "npc_lines", values: { id: "line-batch-new", npc_id: a.npc_id, kind: "tease", text: "A new line." } },
      ],
    });
    assert.equal(out.changes.length, 3);
    assert.equal(line(a.id).text, `${a.text} (edited)`);
    assert.ok(line(b.id).text.startsWith("Edited"));
    assert.equal(line("line-batch-new").text, "A new line.");
    assert.deepEqual(changesFor(a.id).at(-1), { action: "update", source: "test" });
    assert.deepEqual(changesFor("line-batch-new").at(-1), { action: "create", source: "test" });
  });

  it("rolls everything back when one operation fails", () => {
    const before = lines();
    assert.throws(
      () =>
        store.applyBatch({
          source: "test",
          ops: [
            { op: "update", table: "npc_lines", pk: before[0].id, set: { text: "should not stay" } },
            { op: "update", table: "npc_lines", pk: before[1].id, set: { no_such_column: 1 } },
          ],
        }),
      (e) => e instanceof StoreError && /op 2 \(update npc_lines\).*no column "no_such_column"/.test(e.message),
    );
    assert.deepEqual(lines(), before);
  });

  it("rolls back when the finished content fails validation", () => {
    const before = lines();
    assert.throws(() => store.applyBatch({ source: "test", ops: [{ op: "update", table: "npc_lines", pk: before[0].id, set: { npc_id: "npc-nobody" } }] }));
    assert.deepEqual(lines(), before);
  });

  it("refuses an operation that matches nothing unless it says so, and honours expect", () => {
    assert.throws(() => store.applyBatch({ source: "test", ops: [{ op: "update", table: "npc_lines", pk: "line-missing", set: { text: "x" } }] }), /matched no rows/);
    assert.throws(() => store.applyBatch({ source: "test", ops: [{ op: "replace", table: "npc_lines", column: "text", find: "zzz-not-there", with: "y" }] }), /matched no rows/);
    store.applyBatch({ source: "test", ops: [{ op: "replace", table: "npc_lines", column: "text", find: "zzz-not-there", with: "y", optional: true }] });
    assert.throws(() => store.applyBatch({ source: "test", ops: [{ op: "update", table: "npc_lines", where: { npc_id: "npc-hal" }, set: { text: "x" }, expect: 999 }] }), /expected 999 row\(s\)/);
    assert.throws(() => store.applyBatch({ source: "test", ops: [{ op: "update", table: "npc_lines", set: { text: "x" } }] }), /needs "pk" or "where"/);
  });

  it("counts rows that already hold the value instead of rewriting them", () => {
    const row = lines()[0];
    const out = store.applyBatch({ source: "test", ops: [{ op: "update", table: "npc_lines", pk: row.id, set: { text: row.text } }] });
    assert.equal(out.changes.length, 0);
    assert.equal(out.skipped, 1);
  });

  it("stores objects in JSON columns and replaces text inside them as stored", () => {
    const npc = query(fx.paths, "SELECT id, spec FROM npcs LIMIT 1")[0];
    const spec = { ...JSON.parse(npc.spec), probe: 'say "hi"' };
    store.applyBatch({ source: "test", ops: [{ op: "update", table: "npcs", pk: npc.id, set: { spec } }] });
    assert.equal(JSON.parse(query(fx.paths, "SELECT spec FROM npcs WHERE id = ?", npc.id)[0].spec).probe, 'say "hi"');
    store.applyBatch({ source: "test", ops: [{ op: "replace", table: "npcs", column: "spec", find: 'say "hi"', with: 'say "bye"', where: { id: npc.id } }] });
    assert.equal(JSON.parse(query(fx.paths, "SELECT spec FROM npcs WHERE id = ?", npc.id)[0].spec).probe, 'say "bye"');
  });

  it("protects shipped ids: no rename, and a delete needs a reason that is written down", () => {
    const row = { id: "line-ship-me" };
    store.applyBatch({ source: "test", ops: [{ op: "insert", table: "npc_lines", values: { id: row.id, npc_id: line("line-batch-new").npc_id, kind: "tease", text: "A line that will have shipped." } }] });
    fs.mkdirSync(path.dirname(fx.paths.shippedIds), { recursive: true });
    fs.writeFileSync(fx.paths.shippedIds, JSON.stringify({ npc_lines: [row.id] }));
    assert.throws(() => store.applyBatch({ source: "test", ops: [{ op: "update", table: "npc_lines", pk: row.id, set: { id: "line-renamed" } }] }), /has shipped/);
    assert.throws(() => store.applyBatch({ source: "test", ops: [{ op: "delete", table: "npc_lines", pk: row.id }] }), /retires the id/);
    store.applyBatch({ source: "test", ops: [{ op: "delete", table: "npc_lines", pk: row.id, retire: "replaced by a better line" }] });
    assert.equal(line(row.id), undefined);
    assert.match(JSON.parse(fs.readFileSync(fx.paths.retiredIds, "utf8")).npc_lines[row.id], /replaced by a better line/);
  });
});

describe("applyBatch across rows", () => {
  it("refuses deleting a lesson's only intro line, which breaks the untouched lesson", () => {
    const intro = query(fx.paths, "SELECT id, lesson_id FROM npc_lines WHERE kind = 'lesson_intro' LIMIT 1")[0];
    assert.throws(
      () => store.applyBatch({ source: "test", ops: [{ op: "delete", table: "npc_lines", pk: intro.id }] }),
      (e) => e instanceof StoreError && e.errors.some((f) => f.table === "lessons" && f.rule === "npc-lines"),
    );
    assert.ok(line(intro.id));
  });
});

describe("applyBatch across rows (chat threads)", () => {
  const chat = () => query(fx.paths, "SELECT id, npc_id, kind, replies FROM chat_nodes ORDER BY id").map((r) => ({ ...r, replies: JSON.parse(r.replies) }));

  it("refuses deleting a node that other nodes still point at", () => {
    const rows = chat();
    const target = rows.find((n) => n.kind === "reply" && rows.some((o) => o.npc_id === n.npc_id && o.replies.some((r) => r.next === n.id)));
    assert.ok(target, "the fixture has a reply node that others lead to");
    const before = chat().length;
    assert.throws(
      () => store.applyBatch({ source: "test", ops: [{ op: "delete", table: "chat_nodes", pk: target.id, retire: "test" }] }),
      (e) => e instanceof StoreError && e.errors.some((f) => f.rule === "chat-reply-next" && f.id !== target.id),
    );
    assert.equal(chat().length, before);
  });

  it("allows the same delete once the pointers are repointed in the same batch", () => {
    const rows = chat();
    const target = rows.find((n) => n.kind === "reply" && n.replies.length && rows.some((o) => o.npc_id === n.npc_id && o.replies.some((r) => r.next === n.id)));
    const pointers = rows.filter((o) => o.npc_id === target.npc_id && o.replies.some((r) => r.next === target.id));
    const onward = target.replies.find((r) => r.next)?.next;
    if (!onward) return; // this fixture's node ends its branch: nothing to repoint to
    const ops = pointers.map((p) => ({
      op: "update",
      table: "chat_nodes",
      pk: p.id,
      set: { replies: p.replies.map((r) => (r.next === target.id ? { ...r, next: onward } : r)) },
    }));
    const out = store.applyBatch({ source: "test", ops: [...ops, { op: "delete", table: "chat_nodes", pk: target.id, retire: "test" }] });
    assert.ok(out.changes.some((c) => c.op === "delete" && c.pk[0] === target.id));
  });
});

describe("backupUnlessIdentical", () => {
  it("makes a backup once, then reuses it until the content changes", () => {
    const first = backupUnlessIdentical(fx.paths, "pre-script", "edit-test");
    assert.equal(first.created, true);
    const second = backupUnlessIdentical(fx.paths, "pre-script", "edit-test");
    assert.equal(second.created, false);
    assert.equal(second.file, first.file);
    store.applyBatch({ source: "test", ops: [{ op: "update", table: "npc_lines", pk: "line-batch-new", set: { text: "changed again" } }] });
    assert.equal(backupUnlessIdentical(fx.paths, "pre-script", "edit-test").created, true);
    assert.equal(listBackups(fx.paths).length, 2);
  });
});

describe("checksFor", () => {
  it("names a gate for every table that has one and only those", () => {
    assert.deepEqual(checksFor(["chat_nodes"]).sort(), ["test:chats", "test:voice"]);
    assert.deepEqual(checksFor(["npcs", "npc_lines"]).sort(), ["test:npc", "test:voice"]);
    assert.deepEqual(checksFor(["content_translations"]), []);
  });
  it("only names scripts that exist in package.json", () => {
    const scripts = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8")).scripts;
    for (const t of listContentTables(db)) for (const s of checksFor([t])) assert.ok(scripts[s], `${t} -> ${s}`);
  });
});

describe("content:edit command (on a table the files do not own: a scratch table)", () => {
  const MYTH = "n1";
  const myth = () => query(fx.paths, "SELECT id, title FROM scratch_notes WHERE id = ?", MYTH)[0];
  const run = (...args) =>
    spawnSync(process.execPath, ["--no-warnings", new URL("./content-edit.mjs", import.meta.url).pathname, ...args], {
      env: { ...process.env, ATOMIQ_ROOT: fx.root },
      encoding: "utf8",
    });
  const patchFile = path.join(fx.root, "patch.json");
  before(() => {
    sql(fx.paths, "CREATE TABLE scratch_notes (id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT '')");
    sql(fx.paths, "INSERT INTO scratch_notes (id, title) VALUES ('n1', 'one')");
  });

  it("a dry run reports the change and leaves the master alone", () => {
    fs.writeFileSync(patchFile, JSON.stringify({ note: "cli test", ops: [{ op: "update", table: "scratch_notes", pk: MYTH, set: { title: "via cli" } }] }));
    const r = run(patchFile);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /update scratch_notes\[n1\]/);
    assert.match(r.stdout, /Dry run only/);
    assert.notEqual(myth().title, "via cli");
  });

  it("--apply writes it, and a second run says there is nothing to do", () => {
    const r = run(patchFile, "--apply", "--no-verify");
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Applied 1 change/);
    assert.equal(myth().title, "via cli");
    const again = run(patchFile, "--apply", "--no-verify");
    assert.equal(again.status, 0, again.stderr);
    assert.match(again.stdout, /Nothing to change/);
  });

  it("a bad patch exits 1 and changes nothing", () => {
    fs.writeFileSync(patchFile, JSON.stringify([{ op: "update", table: "scratch_notes", pk: MYTH, set: { no_such_column: 1 } }]));
    const r = run(patchFile, "--apply", "--no-verify");
    assert.equal(r.status, 1);
    assert.match(r.stderr, /Nothing was changed/);
    assert.equal(myth().title, "via cli");
  });

  it("thread lists a teacher's stories and fetches one by id, trigger or title", () => {
    const list = run("thread", "ada");
    assert.equal(list.status, 0, list.stderr);
    assert.match(list.stdout, /chat-ada-greeting\s+free chat/);
    const root = list.stdout.split("\n").find((l) => l.startsWith("chat-ada-up-"))?.split(/\s+/)[0];
    assert.ok(root, "Ada has a story");
    const byId = JSON.parse(run("thread", "ada", root).stdout);
    assert.equal(byId[0].id, root);
    assert.ok(byId.every((n) => n.id.startsWith("chat-ada-")), "only Ada's nodes");
    const trigger = byId[0].trigger;
    assert.deepEqual(JSON.parse(run("thread", "npc-ada", trigger).stdout).map((n) => n.id), byId.map((n) => n.id));
    assert.equal(JSON.parse(run("thread", "ada", byId[0].title.toUpperCase()).stdout)[0].id, root);
  });

  it("thread stops on an unknown teacher or an ambiguous story", () => {
    assert.match(run("thread", "nobody").stderr, /No chat nodes for "nobody"/);
    assert.equal(run("thread", "ada", "zzz-no-story").status, 1);
    assert.match(run("thread", "ada", "chat-ada-up").stderr, /No story|matches/);
  });

  it("get and sql read without writing", () => {
    const g = run("get", "scratch_notes", "--pk", MYTH, "--cols", "id,title");
    assert.equal(g.status, 0, g.stderr);
    assert.deepEqual(JSON.parse(g.stdout), [{ id: MYTH, title: "via cli" }]);
    assert.notEqual(run("sql", "DELETE FROM scratch_notes").status, 0);
  });
});
