/**
 * Developer admin: the things the panel does to local data, so a tester can set a state instead of
 * playing to it. Development builds only (see `DevAdminFab.tsx`). Every function writes through the
 * app's own services, so what the screens show is what a real run would have left behind.
 *
 * TO REMOVE THE ADMIN CONTROLS: delete the `components/dev/` folder and the two lines in
 * `app/(tabs)/index.tsx` marked `dev-admin`.
 */

import { STORY_LEVELS } from "@/components/platformer/story-levels";
import { contentRepository } from "@/services/content-db";
import { getDatabase, getAllLevels, updateLevelProgress } from "@/services/database";
import { reconcileFeed } from "@/services/feed";
import { DAILY_MISSIONS, recordMissionEvent } from "@/services/missions";
import { saveStoryResult } from "@/services/story-progress";
import { removeItem } from "@/services/storage";

/** The saved quest counters (the keys `services/missions.ts` keeps them under). */
const QUEST_KEYS = ["@atomiq:daily_missions", "@atomiq:weekly_missions"] as const;

/** Mark path nodes completed (3 stars, no XP) in path order, through the end of unit number `unitCount`. Returns how many nodes it marked. */
export async function completeThroughUnit(unitCount: number): Promise<number> {
  const [units, nodes] = await Promise.all([contentRepository.getUnits(), contentRepository.getPathNodes()]);
  const wanted = units.slice(0, unitCount);
  const base = Date.now();
  let n = 0;
  for (const unit of wanted) {
    const unitNodes = nodes.filter((x) => x.unitId === unit.id).sort((a, b) => a.position - b.position);
    for (const node of unitNodes) {
      n += 1;
      await updateLevelProgress(node.id, { status: "completed", stars: 3, xp_earned: 0, completed_at: new Date(base + n).toISOString(), unit_id: node.unitId, type: node.kind });
    }
  }
  return n;
}

/** Complete the first path node that is not completed yet. Returns its id, or `null` when everything is done. */
export async function completeNextNode(): Promise<string | null> {
  const [units, nodes, levels] = await Promise.all([contentRepository.getUnits(), contentRepository.getPathNodes(), getAllLevels() as Promise<{ id: string; status?: string }[]>]);
  const done = new Set(levels.filter((l) => l.status === "completed").map((l) => l.id));
  for (const unit of units) {
    const next = nodes.filter((x) => x.unitId === unit.id).sort((a, b) => a.position - b.position).find((x) => !done.has(x.id));
    if (!next) continue;
    await updateLevelProgress(next.id, { status: "completed", stars: 3, xp_earned: 0, completed_at: new Date().toISOString(), unit_id: next.unitId, type: next.kind });
    return next.id;
  }
  return null;
}

/** Forget every completed node and every lesson left half way: the map goes back to the start. */
export async function resetPath(): Promise<void> {
  const db = getDatabase();
  await db.runAsync("DELETE FROM levels");
  await db.runAsync("DELETE FROM lesson_runs");
}

/** Count every daily quest as done (not claimed: claiming is the learner's tap). */
export async function finishDailyQuests(): Promise<void> {
  for (const m of DAILY_MISSIONS) await recordMissionEvent(m.type, m.target);
}

/** Zero the daily and weekly quest counters and claims. */
export async function resetQuests(): Promise<void> {
  for (const key of QUEST_KEYS) await removeItem(key);
}

/** Post what progress says is missing; resolves with how many posts it made. */
export const reconcileFeedNow = (): Promise<number> => reconcileFeed();

/** Delete every post and reaction, then rebuild the feed from progress. Resolves with how many posts it made. */
export async function rebuildFeed(): Promise<number> {
  const db = getDatabase();
  await db.runAsync("DELETE FROM feed_posts");
  await db.runAsync("DELETE FROM reactions");
  return reconcileFeed();
}

/** Atom Maze story mode: every level won with three stars. */
export async function unlockAllStory(): Promise<number> {
  for (const level of STORY_LEVELS) await saveStoryResult(level.id, 3, 1000, 60);
  return STORY_LEVELS.length;
}

export async function resetStory(): Promise<void> {
  await getDatabase().runAsync("DELETE FROM story_progress");
}
