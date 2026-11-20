/**
 * Owning and buying in the shop: the real SQL on an in-memory SQLite. A buy takes the diamonds and gives the
 * item in one go, or changes nothing (owned, level too low, not enough diamonds).
 *
 * Run: npm run test:shop-store
 */
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

import { loadTs } from "./lib/ts-require.mjs";

const { SHOP_OWNED_SCHEMA, buy, listOwned, shopStats } = loadTs("services/shop-store-core.ts");

function fresh(diamonds = 100) {
  const db = new DatabaseSync(":memory:");
  db.exec(`CREATE TABLE wallet (id INTEGER PRIMARY KEY CHECK (id = 1), diamonds INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL DEFAULT 0); ${SHOP_OWNED_SCHEMA}`);
  db.prepare("INSERT INTO wallet (id, diamonds) VALUES (1, ?)").run(diamonds);
  let depth = 0;
  return {
    raw: db,
    async runAsync(sql, params = []) { const r = db.prepare(sql).run(...params); return { changes: Number(r.changes) }; },
    async getAllAsync(sql, params = []) { return db.prepare(sql).all(...params); },
    async getFirstAsync(sql, params = []) { return db.prepare(sql).get(...params) ?? null; },
    async withTransactionAsync(task) {
      db.exec("BEGIN");
      try { depth++; await task(); db.exec("COMMIT"); } catch (e) { db.exec("ROLLBACK"); throw e; } finally { depth--; }
    },
  };
}
const balance = (db) => db.raw.prepare("SELECT diamonds FROM wallet WHERE id = 1").get().diamonds;
const item = { id: "hair-style-wavy", price: 25, level: 4 };

test("a buy takes the price and gives the item", async () => {
  const db = fresh(100);
  const r = await buy(db, item, 4, 1000);
  assert.deepEqual(r, { ok: true, diamonds: 75 });
  assert.equal(balance(db), 75);
  assert.deepEqual(await listOwned(db), ["hair-style-wavy"]);
});

test("the same item cannot be bought twice, and the second try costs nothing", async () => {
  const db = fresh(100);
  await buy(db, item, 9);
  assert.deepEqual(await buy(db, item, 9), { ok: false, reason: "owned" });
  assert.equal(balance(db), 75);
});

test("a level that is too low blocks the buy, and nothing changes", async () => {
  const db = fresh(100);
  assert.deepEqual(await buy(db, item, 3), { ok: false, reason: "locked" });
  assert.equal(balance(db), 100);
  assert.deepEqual(await listOwned(db), []);
  assert.deepEqual(await buy(db, item, 4), { ok: true, diamonds: 75 });
});

test("not enough diamonds blocks the buy, down to the last diamond", async () => {
  const db = fresh(24);
  assert.deepEqual(await buy(db, item, 9), { ok: false, reason: "poor" });
  assert.equal(balance(db), 24);
  assert.deepEqual(await listOwned(db), []);
  const exact = fresh(25);
  assert.deepEqual(await buy(exact, item, 9), { ok: true, diamonds: 0 });
});

test("a malformed item is not a buy", async () => {
  const db = fresh(100);
  for (const bad of [{ id: "", price: 5, level: 1 }, { id: "x", price: 2.5, level: 1 }, { id: "x", price: -5, level: 1 }]) {
    assert.deepEqual(await buy(db, bad, 9), { ok: false, reason: "invalid" });
  }
  assert.equal(balance(db), 100);
  assert.deepEqual(await listOwned(db), []);
});

test("a free item is got like any other: it is stored as owned and takes nothing, even with an empty or missing wallet", async () => {
  const free = { id: "skin-blue", price: 0, level: 1 };
  const db = fresh(0);
  assert.deepEqual(await buy(db, free, 1), { ok: true, diamonds: 0 });
  assert.deepEqual(await listOwned(db), ["skin-blue"]);
  assert.deepEqual(await buy(db, free, 1), { ok: false, reason: "owned" }, "not twice");
  const rich = fresh(40);
  await buy(rich, free, 1);
  assert.equal(balance(rich), 40);
  const none = fresh(0);
  none.raw.exec("DELETE FROM wallet");
  assert.deepEqual(await buy(none, { id: "skin-aqua", price: 0, level: 1 }, 1), { ok: true, diamonds: 0 });
});

test("a failure part way undoes the whole buy (the diamonds come back)", async () => {
  const db = fresh(100);
  const flaky = { ...db, async runAsync(sql, params) { if (sql.startsWith("INSERT INTO shop_owned")) throw new Error("disk full"); return db.runAsync(sql, params); } };
  await assert.rejects(buy(flaky, item, 9), /disk full/);
  assert.equal(balance(db), 100);
  assert.deepEqual(await listOwned(db), []);
});

test("with no wallet row yet, a buy is refused as poor", async () => {
  const db = fresh(0);
  db.raw.exec("DELETE FROM wallet");
  assert.deepEqual(await buy(db, item, 9), { ok: false, reason: "poor" });
});

test("the totals for the shop badges: items got (free ones too) and diamonds spent, zero when nothing is bought", async () => {
  const db = fresh(500);
  assert.deepEqual(await shopStats(db), { owned: 0, spent: 0 });
  await buy(db, { id: "a", price: 40, level: 1 }, 1);
  await buy(db, { id: "b", price: 0, level: 1 }, 1);
  await buy(db, { id: "c", price: 90, level: 1 }, 1);
  await buy(db, { id: "d", price: 1000, level: 1 }, 1); // too dear: not counted
  assert.deepEqual(await shopStats(db), { owned: 3, spent: 130 });
});
