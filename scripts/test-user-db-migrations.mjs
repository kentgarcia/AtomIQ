/**
 * Versioned migrations of the user-state database, on a real in-memory SQLite: the version is stamped, a migration
 * runs once and in order, a failed one rolls back whole and is retried, a database newer than the app is left
 * alone, and a brand new install is stamped without running anything.
 *
 * Run: npm run test:user-db
 */
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { loadTs } from "./lib/ts-require.mjs";

const core = loadTs("services/user-db-migrations-core.ts");

function open() {
  const raw = new DatabaseSync(":memory:");
  return {
    raw,
    async execAsync(sql) { raw.exec(sql); },
    async getFirstAsync(sql) { return raw.prepare(sql).get() ?? null; },
    async getAllAsync(sql) { return raw.prepare(sql).all(); },
  };
}
const version = (db) => db.raw.prepare("PRAGMA user_version").get().user_version;
const columns = (db, table) => db.raw.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);

const addColumn = {
  version: 2,
  name: "add notes.pinned",
  async up(db) { await db.execAsync("ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;"); },
};
const backfill = {
  version: 3,
  name: "pin the old notes",
  async up(db) { await db.execAsync("UPDATE notes SET pinned = 1 WHERE body LIKE 'old%';"); },
};

async function oldPhone() {
  const db = open();
  await db.execAsync("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT); INSERT INTO notes (body) VALUES ('old one'), ('new one');");
  return db;
}

test("the shipped list is valid and the build's version is the baseline until a migration is added", () => {
  assert.equal(core.checkMigrations(core.MIGRATIONS), null);
  assert.equal(core.latestUserDbVersion(core.MIGRATIONS), core.MIGRATIONS.length ? core.MIGRATIONS.at(-1).version : core.BASELINE_USER_DB_VERSION);
  assert.equal(core.BASELINE_USER_DB_VERSION, 1);
});

test("a list with a gap, a repeat or a nameless step is refused", () => {
  assert.match(core.checkMigrations([{ ...addColumn, version: 3 }]), /expected 2/);
  assert.match(core.checkMigrations([addColumn, { ...backfill, version: 2 }]), /expected 3/);
  assert.match(core.checkMigrations([{ ...addColumn, name: " " }]), /no name/);
  assert.equal(core.checkMigrations([]), null);
  assert.equal(core.checkMigrations([addColumn, backfill]), null);
});

test("a phone from before versions existed is stamped with the baseline, and nothing else runs", async () => {
  const db = await oldPhone();
  const r = await core.migrateUserDb(db, { migrations: [] });
  assert.deepEqual({ from: r.from, to: r.to, applied: r.applied, failed: r.failed }, { from: 0, to: 1, applied: [], failed: null });
  assert.equal(version(db), 1);
});

test("migrations run once each, in order, and a second start does nothing", async () => {
  const db = await oldPhone();
  const r = await core.migrateUserDb(db, { migrations: [addColumn, backfill] });
  assert.deepEqual(r.applied, ["add notes.pinned", "pin the old notes"]);
  assert.equal(r.to, 3);
  assert.equal(version(db), 3);
  assert.deepEqual(db.raw.prepare("SELECT body, pinned FROM notes ORDER BY id").all().map((x) => [x.body, x.pinned]), [["old one", 1], ["new one", 0]]);
  const again = await core.migrateUserDb(db, { migrations: [addColumn, backfill] });
  assert.deepEqual({ from: again.from, to: again.to, applied: again.applied }, { from: 3, to: 3, applied: [] });
});

test("a phone that is part way only runs what it has not had", async () => {
  const db = await oldPhone();
  await core.migrateUserDb(db, { migrations: [addColumn] });
  const r = await core.migrateUserDb(db, { migrations: [addColumn, backfill] });
  assert.deepEqual(r.applied, ["pin the old notes"]);
  assert.equal(version(db), 3);
});

test("a failed migration rolls back whole, keeps the earlier ones and is retried on the next start", async () => {
  const db = await oldPhone();
  let broken = true;
  const flaky = {
    version: 3,
    name: "half done then fails",
    async up(d) {
      await d.execAsync("ALTER TABLE notes ADD COLUMN half INTEGER;");
      if (broken) throw new Error("disk full");
    },
  };
  const first = await core.migrateUserDb(db, { migrations: [addColumn, flaky] });
  assert.deepEqual(first.applied, ["add notes.pinned"]);
  assert.deepEqual(first.failed, { version: 3, name: "half done then fails", error: "disk full" });
  assert.equal(version(db), 2, "the version stays at the last good one");
  assert.ok(!columns(db, "notes").includes("half"), "the failed one left nothing behind");
  broken = false;
  const second = await core.migrateUserDb(db, { migrations: [addColumn, flaky] });
  assert.equal(second.failed, null);
  assert.deepEqual(second.applied, ["half done then fails"]);
  assert.equal(version(db), 3);
  assert.ok(columns(db, "notes").includes("half"));
});

test("a database newer than the app is left alone and reported", async () => {
  const db = await oldPhone();
  await db.execAsync("PRAGMA user_version = 9;");
  const r = await core.migrateUserDb(db, { migrations: [addColumn] });
  assert.equal(r.newerThanApp, true);
  assert.deepEqual(r.applied, []);
  assert.equal(version(db), 9);
  assert.ok(!columns(db, "notes").includes("pinned"));
});

test("a brand new install is stamped with the newest version and no migration runs on it", async () => {
  const db = open();
  await db.execAsync("CREATE TABLE notes (id INTEGER PRIMARY KEY, body TEXT, pinned INTEGER NOT NULL DEFAULT 0);");
  const r = await core.migrateUserDb(db, { fresh: true, migrations: [addColumn, backfill] });
  assert.equal(r.fresh, true);
  assert.deepEqual(r.applied, []);
  assert.equal(version(db), 3);
});

test("a bad list stops everything and says why, without throwing", async () => {
  const db = await oldPhone();
  const r = await core.migrateUserDb(db, { migrations: [{ ...addColumn, version: 5 }] });
  assert.match(r.failed.error, /expected 2/);
  assert.equal(version(db), 0);
  assert.ok(!columns(db, "notes").includes("pinned"));
});

test("the shipped migration adds chat_threads.reward_claimed to a phone that has threads, unclaimed, and a second start does nothing", async () => {
  const db = open();
  await db.execAsync("CREATE TABLE chat_threads (id TEXT PRIMARY KEY, title TEXT NOT NULL, origin TEXT NOT NULL DEFAULT 'free', plays INTEGER NOT NULL DEFAULT 1); INSERT INTO chat_threads (id, title, origin) VALUES ('t1', 'A story', 'event');");
  const first = await core.migrateUserDb(db);
  assert.equal(first.failed, null);
  assert.ok(first.applied.includes("add chat_threads.reward_claimed"));
  assert.ok(columns(db, "chat_threads").includes("reward_claimed"));
  assert.equal(db.raw.prepare("SELECT reward_claimed FROM chat_threads WHERE id = 't1'").get().reward_claimed, 0);
  assert.equal(version(db), core.latestUserDbVersion());
  const second = await core.migrateUserDb(db);
  assert.deepEqual(second.applied, []);
});
