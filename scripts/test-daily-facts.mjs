import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { pathToFileURL } from "node:url";
import path from "node:path";

const core = await import(pathToFileURL(path.resolve("services/daily-facts-core.ts")).href);

function memoryDb() {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE daily_facts_read (fact_id TEXT PRIMARY KEY, title TEXT NOT NULL, read_on TEXT NOT NULL, read_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL DEFAULT 0, synced_at INTEGER, is_dirty INTEGER DEFAULT 1, deleted_at INTEGER, version INTEGER DEFAULT 1)`);
  return {
    async runAsync(sql, params = []) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
    async getAllAsync(sql, params = []) { return db.prepare(sql).all(...params); },
  };
}

test("a fact is recorded once, the first time it is read", async () => {
  const store = core.createDailyFactsStore(((db) => () => db)(memoryDb()));
  assert.equal(await store.recordRead("m1", "Bananas", "2026-11-18", 100), true);
  assert.equal(await store.recordRead("m1", "Bananas", "2026-11-19", 200), false);
  const rows = await store.listRead();
  assert.deepEqual(rows, [{ factId: "m1", title: "Bananas", readOn: "2026-11-18", readAt: 100 }]);
});

test("the list is newest first", async () => {
  const store = core.createDailyFactsStore(((db) => () => db)(memoryDb()));
  await store.recordRead("a", "A", "2026-11-16", 1);
  await store.recordRead("b", "B", "2026-11-17", 2);
  await store.recordRead("c", "C", "2026-11-18", 3);
  assert.deepEqual((await store.listRead()).map((r) => r.factId), ["c", "b", "a"]);
});

test("labels", () => {
  assert.equal(core.factDayLabel("2026-11-08"), "8 Nov");
  assert.equal(core.factDayLabel("garbage"), "garbage");
  assert.equal(core.readCountLabel(0), "No facts read yet");
  assert.equal(core.readCountLabel(1), "1 fact read");
  assert.equal(core.readCountLabel(4), "4 facts read");
});
