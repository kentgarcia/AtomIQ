/**
 * Lifetime count of quests the learner has claimed, for the Quest Crusher badge. A small number in
 * AsyncStorage, like the quest counters themselves. Quests claimed before this counter existed are
 * not counted.
 */

import { getItem, setItem, STORAGE_KEYS } from "@/services/storage";

type Listener = (total: number) => void;
const listeners = new Set<Listener>();

export function subscribeQuestsClaimed(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function getQuestsClaimed(): Promise<number> {
  const n = Number(await getItem<number>(STORAGE_KEYS.QUESTS_CLAIMED_TOTAL));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Count one more claimed quest and return the new total. */
export async function recordQuestClaimed(): Promise<number> {
  const total = (await getQuestsClaimed()) + 1;
  await setItem(STORAGE_KEYS.QUESTS_CLAIMED_TOTAL, total);
  listeners.forEach((l) => l(total));
  return total;
}
