/**
 * The phone's runtime (docs/features/PHONE_SPEC.md): gathers the learner's progress from the stores the app
 * already has, binds `phone_seen` to the user-state database, and tells listeners when something
 * changed. Rules are in `services/phone-core.ts`. Nothing here throws: a failed read gives the
 * starting apps and no badges.
 */

import { levelFromXp } from "@/services/achievements-core";
import { listReadFacts } from "@/services/daily-facts";
import { getUnreadChats } from "@/services/chats";
import { getDatabase, getUserProfile } from "@/services/database";
import { getDailyFact } from "@/services/missions";
import { countCompletedLessons } from "@/services/path-core";
import { loadPathSnapshot } from "@/services/path-snapshot";
import { createPhoneSeenStore, NO_PROGRESS, type PhoneDb, type PhoneProgress, type PhoneSignals, type SeenApp } from "@/services/phone-core";
import { getOwnedItems } from "@/services/shop";

const seenStore = createPhoneSeenStore(() => getDatabase() as unknown as PhoneDb);

type Listener = () => void;
const listeners = new Set<Listener>();

/** Something the phone shows may have changed (an install played, a switch flipped). */
export function subscribePhone(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyPhone(): void {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // A listener's failure never stops the others.
    }
  });
}

/** What the unlock rules read, from the path, the profile and the shop. */
export async function loadPhoneProgress(): Promise<PhoneProgress> {
  try {
    const [{ nodes, state }, profile, owned] = await Promise.all([
      loadPathSnapshot(),
      getUserProfile() as Promise<{ total_xp?: number } | null>,
      getOwnedItems().catch(() => [] as string[]),
    ]);
    return {
      lessonsCompleted: countCompletedLessons(nodes, state),
      unitsCompleted: Object.entries(state.units)
        .filter(([, u]) => u.completed)
        .map(([id]) => id),
      level: levelFromXp(profile?.total_xp ?? 0),
      shopItemsOwned: owned.length,
    };
  } catch (error) {
    console.warn("[phone] progress", error);
    return NO_PROGRESS;
  }
}

/** The badge inputs: whether today's fact is unread, and how many chat messages are. */
export async function loadPhoneSignals(): Promise<PhoneSignals> {
  let dailyFactUnread = false;
  try {
    const [fact, read] = await Promise.all([getDailyFact(), listReadFacts()]);
    dailyFactUnread = !read.some((r) => r.factId === fact.id);
  } catch (error) {
    console.warn("[phone] signals", error);
  }
  return { dailyFactUnread, unreadChats: await getUnreadChats() };
}

/** The apps whose install moment has played, and whether each was opened since. Never rejects. */
export async function loadSeenApps(): Promise<SeenApp[]> {
  try {
    return await seenStore.listSeen();
  } catch (error) {
    console.warn("[phone] seen", error);
    return [];
  }
}

/** Record an install moment as played (`opened`: no "New" dot, for the starting apps), then tell listeners. Never rejects. */
export async function markAppSeen(appId: string, opened = false): Promise<void> {
  try {
    await seenStore.markSeen(appId, Date.now(), opened);
    notifyPhone();
  } catch (error) {
    console.warn("[phone] mark seen", error);
  }
}

/** The learner opened an app: its "New" dot goes. Never rejects. */
export async function markAppOpened(appId: string): Promise<void> {
  try {
    await seenStore.markOpened(appId, Date.now());
    notifyPhone();
  } catch (error) {
    console.warn("[phone] mark opened", error);
  }
}
