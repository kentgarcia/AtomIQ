/**
 * The shop's owned items and buying, over the user-state database (SQL and rules in `shop-store-core.ts`).
 * `useOwnedItems` (hooks/use-owned-items.ts) keeps a screen current.
 */

import { getDatabase, getUserProfile } from "@/services/database";
import { buy, listOwned, shopStats, type BuyResult, type ShopDb } from "@/services/shop-store-core";
import { levelFromXp } from "@/services/achievements-core";
import { refreshDiamonds } from "@/services/wallet";
import type { ShopItem } from "@/components/shop/shop-core";

/** expo-sqlite's database, as the small interface the store is written against (the same cast the feed store makes). */
const db = () => getDatabase() as unknown as ShopDb;

type Listener = (owned: string[]) => void;
const listeners = new Set<Listener>();

export function subscribeOwned(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The ids of the items the learner has bought (free items are not listed: they are owned from the start). */
export const getOwnedItems = (): Promise<string[]> => listOwned(db());

/** Items got and diamonds spent, for the Style Collector and Big Spender badges. */
export const getShopStats = (): Promise<{ owned: number; spent: number }> => shopStats(db());

/** Spend diamonds on an item, checking the level, the balance and that it is not already owned, all in one transaction. */
export async function buyItem(item: ShopItem): Promise<BuyResult> {
  const profile = (await getUserProfile()) as { total_xp?: number } | null;
  const result = await buy(db(), item, levelFromXp(profile?.total_xp ?? 0));
  if (result.ok) {
    await refreshDiamonds();
    const owned = await getOwnedItems();
    listeners.forEach((l) => l(owned));
  }
  return result;
}
