import { useEffect, useMemo, useSyncExternalStore } from "react";

import { acquireTutorialBusy, currentPick, getTutorialSnapshot, subscribeTutorial, type TutorialSnapshot } from "@/services/tutorial";
import { tabLockHint, tabLocked, tabsFree, type Pick, type TabName } from "@/services/tutorial-core";

/** The tour's state, following the one store (docs/features/TUTORIAL_SPEC.md). */
export function useTutorial(): { snapshot: TutorialSnapshot; pick: Pick | null } {
  const snapshot = useSyncExternalStore(subscribeTutorial, getTutorialSnapshot, getTutorialSnapshot);
  // The beat is worked out from the snapshot only, so it changes exactly when the snapshot does
  const pick = useMemo(() => currentPick(snapshot), [snapshot]);
  return { snapshot, pick };
}

/**
 * Keep the overlay out of the way while `active` (a dialog is open, an install moment is playing). Several
 * holders add up; the overlay returns a moment after the last one lets go.
 */
export function useTutorialBusy(active: boolean, label = "unnamed"): void {
  useEffect(() => {
    if (!active) return;
    return acquireTutorialBusy(label);
  }, [active, label]);
}

/** The tabs the tour can lock, in the order their flags are written into the key below. */
const LOCKABLE: readonly TabName[] = ["index", "quests", "community", "phone", "awards", "profile"];

const lockKey = (s: TutorialSnapshot): string => `${s.loaded ? 1 : 0}|${LOCKABLE.map((t) => (tabLocked(t, s.steps, s.progress, s.enabled) ? 1 : 0)).join("")}|${tabLockHint(s.progress)}`;

/**
 * Which tabs are locked right now, and what to tell the learner when one is pressed. Nothing is locked until the first read has
 * finished (the tour's own read), so the bar never flashes locked for a learner who has no tour.
 *
 * The component re-renders only when the answer changes (a short key of the lock flags and the hint), never for the tour's other
 * state changes (a dialog opening, the screen changing, a beat moving on): the tab bar and every tab's header use this.
 */
export function useTabLocks(): { isLocked: (tab: TabName) => boolean; blocks: (tab: TabName) => boolean; hint: string } {
  const key = useSyncExternalStore(subscribeTutorial, () => lockKey(getTutorialSnapshot()), () => lockKey(getTutorialSnapshot()));
  return useMemo(() => {
    const snapshot = getTutorialSnapshot();
    return {
      /** Locked, for what is drawn and for the guard: nothing is drawn locked until the first read has finished. */
      isLocked: (tab: TabName) => snapshot.loaded && tabLocked(tab, snapshot.steps, snapshot.progress, snapshot.enabled),
      /** Whether a press on the tab does nothing: locked, or (before the first read) any tab but Home, so a cold start never lets a locked tab through. */
      blocks: (tab: TabName) => (snapshot.loaded ? tabLocked(tab, snapshot.steps, snapshot.progress, snapshot.enabled) : tab !== "index"),
      hint: tabLockHint(snapshot.progress),
    };
    // `key` stands for everything the answers depend on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}

/**
 * Whether Shrodi's tour is over for this learner (finished, skipped, an existing learner, or Tips off), once the tour has been read.
 * Other first-visit notices wait for it, so a new learner meets Shrodi first and nothing covers the tour. A boolean, so the Home map
 * re-renders only when it flips.
 */
export function useTourOver(): boolean {
  const get = () => {
    const s = getTutorialSnapshot();
    return s.loaded && tabsFree(s.steps, s.progress, s.enabled);
  };
  return useSyncExternalStore(subscribeTutorial, get, get);
}
