/**
 * The facts the learner has read, in the user-state database. `getDailyFact()` (services/missions.ts)
 * picks today's; reading one records it here (once, the first time) so the Daily facts screen can list it.
 */

import { getDatabase } from "@/services/database";
import { createDailyFactsStore, type FactsDb, type ReadFactRow } from "@/services/daily-facts-core";

export { factDayLabel, readCountLabel, type ReadFactRow } from "@/services/daily-facts-core";

const store = createDailyFactsStore(() => getDatabase() as unknown as FactsDb);

const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type ReadListener = () => void;
const readListeners = new Set<ReadListener>();

/** Called when a fact is read for the first time (the phone's Daily Fact badge follows it). */
export function subscribeFactsRead(listener: ReadListener): () => void {
  readListeners.add(listener);
  return () => {
    readListeners.delete(listener);
  };
}

/** Record a fact as read today (first time only). Never rejects; `true` when it was new. */
export async function recordFactRead(factId: string, title: string): Promise<boolean> {
  try {
    const isNew = await store.recordRead(factId, title, todayKey(), Date.now());
    if (isNew) readListeners.forEach((l) => l());
    return isNew;
  } catch (error) {
    console.warn("[daily-facts] record read", error);
    return false;
  }
}

/** The facts read so far, newest first. Never rejects. */
export async function listReadFacts(): Promise<ReadFactRow[]> {
  try {
    return await store.listRead();
  } catch (error) {
    console.warn("[daily-facts] list read", error);
    return [];
  }
}
