/**
 * What the learner owns in the shop, and buying: written against a small database interface so
 * `scripts/test-shop-store.mjs` can run the real SQL on an in-memory SQLite. The app binds it to the
 * user-state database in `services/shop.ts`.
 *
 * Tables (`services/database.ts`): `shop_owned` (one row per bought item id) and `wallet` (the diamonds, one row).
 * What a starting design wears is owned from the start and never stored; every other item, a free one too, is got first (a
 * "buy" of price zero takes nothing). What is worn is not stored here: it is the avatar the
 * learner saved (`user_profile.avatar_url`). A buy is one transaction (the diamonds go and the item arrives, or
 * neither), and the price, the level and the balance are all checked again inside it.
 */

export interface ShopDb {
  runAsync(sql: string, params?: (string | number | null)[]): Promise<{ changes: number }>;
  getAllAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: (string | number | null)[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}

export const SHOP_OWNED_SCHEMA = `
  CREATE TABLE IF NOT EXISTS shop_owned (
    item_id TEXT PRIMARY KEY,
    bought_at INTEGER NOT NULL DEFAULT 0,
    price INTEGER NOT NULL DEFAULT 0
  );
`;

export type BuyResult = { ok: true; diamonds: number } | { ok: false; reason: "owned" | "locked" | "poor" | "invalid" };

/** What the shop badges read: how many items the learner has got (a free one too), and the diamonds they spent on them. */
export async function shopStats(db: ShopDb): Promise<{ owned: number; spent: number }> {
  const row = await db.getFirstAsync<{ owned: number; spent: number | null }>("SELECT COUNT(*) AS owned, SUM(price) AS spent FROM shop_owned");
  return { owned: Math.max(0, Math.round(row?.owned ?? 0)), spent: Math.max(0, Math.round(row?.spent ?? 0)) };
}

export async function listOwned(db: ShopDb): Promise<string[]> {
  const rows = await db.getAllAsync<{ item_id: string }>("SELECT item_id FROM shop_owned ORDER BY bought_at, item_id");
  return rows.map((r) => r.item_id);
}

/**
 * Buy an item: `price` diamonds (maybe none) and the learner's `level` against the item's. Nothing changes unless all of it holds.
 * The balance guard is in the UPDATE itself, so two buys at once cannot take the balance below zero.
 */
export async function buy(db: ShopDb, item: { id: string; price: number; level: number }, level: number, now: number = Date.now()): Promise<BuyResult> {
  if (!item.id || !Number.isInteger(item.price) || item.price < 0) return { ok: false, reason: "invalid" };
  let result: BuyResult = { ok: false, reason: "invalid" };
  await db.withTransactionAsync(async () => {
    const have = await db.getFirstAsync<{ item_id: string }>("SELECT item_id FROM shop_owned WHERE item_id = ?", [item.id]);
    if (have) {
      result = { ok: false, reason: "owned" };
      return;
    }
    if (level < item.level) {
      result = { ok: false, reason: "locked" };
      return;
    }
    // A free item takes nothing, so it needs no wallet row either
    const spent = item.price === 0 ? { changes: 1 } : await db.runAsync("UPDATE wallet SET diamonds = diamonds - ?, updated_at = ? WHERE id = 1 AND diamonds >= ?", [item.price, now, item.price]);
    if (spent.changes === 0) {
      result = { ok: false, reason: "poor" };
      return;
    }
    await db.runAsync("INSERT INTO shop_owned (item_id, bought_at, price) VALUES (?, ?, ?)", [item.id, now, item.price]);
    const row = await db.getFirstAsync<{ diamonds: number }>("SELECT diamonds FROM wallet WHERE id = 1");
    result = { ok: true, diamonds: Math.max(0, Math.round(row?.diamonds ?? 0)) };
  });
  return result;
}
