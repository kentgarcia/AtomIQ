/**
 * The learner's diamonds, the app's currency: one row in the user-state database. Quest chests pay
 * into it (`services/missions.ts`) and the top row of the tab screens shows it (`hooks/use-wallet.ts`).
 *
 * Adding is a single UPDATE, so two rewards landing together cannot overwrite each other.
 */

import { getDatabase } from "@/services/database";

type Listener = (diamonds: number) => void;
const listeners = new Set<Listener>();

/** Called with the new balance whenever it changes; returns the way to stop listening. */
export function subscribeDiamonds(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getDiamonds(): Promise<number> {
  const row = await getDatabase().getFirstAsync<{ diamonds: number }>("SELECT diamonds FROM wallet WHERE id = 1");
  return Math.max(0, Math.round(row?.diamonds ?? 0));
}

/** Add `amount` (whole diamonds, never negative) and return the new balance. */
export async function addDiamonds(amount: number): Promise<number> {
  const add = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  await getDatabase().runAsync(
    `INSERT INTO wallet (id, diamonds, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET diamonds = diamonds + excluded.diamonds, updated_at = excluded.updated_at`,
    [add, Date.now()],
  );
  const balance = await getDiamonds();
  listeners.forEach((l) => l(balance));
  return balance;
}
