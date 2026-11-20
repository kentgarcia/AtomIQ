/**
 * Atom Maze story mode's saved progress: the best stars and score of each level, in the user-state
 * database (`story_progress`). Which levels are open is worked out from these by
 * components/platformer/story-core.ts, never stored.
 */

import { betterRecord, type LevelRecord } from "@/components/platformer/story-core";
import { getDatabase } from "@/services/database";

interface Row {
  level_id: string;
  stars: number;
  best_score: number;
  best_time: number | null;
}

export async function getStoryRecords(): Promise<LevelRecord[]> {
  const rows = await getDatabase().getAllAsync<Row>("SELECT level_id, stars, best_score, best_time FROM story_progress");
  return rows.map((r) => ({ levelId: r.level_id, stars: r.stars, bestScore: r.best_score, bestTime: r.best_time }));
}

/** What saving a run changed: the record now, and whether this run beat the time or the score that was there. */
export interface SavedResult {
  record: LevelRecord;
  newBestTime: boolean;
  newBestScore: boolean;
  /** No win of this level was saved before this one (it pays the full first-time XP). */
  firstWin: boolean;
}

/** Save a won run (stars from its points, its score and its time), keeping the best of each. */
export async function saveStoryResult(levelId: string, stars: number, score: number, time: number): Promise<SavedResult> {
  const db = getDatabase();
  const before = await db.getFirstAsync<Row>("SELECT level_id, stars, best_score, best_time FROM story_progress WHERE level_id = ?", [levelId]);
  const previous: LevelRecord | undefined = before ? { levelId, stars: before.stars, bestScore: before.best_score, bestTime: before.best_time } : undefined;
  const record = betterRecord(previous, { levelId, stars, bestScore: score, bestTime: time > 0 ? time : null });
  await db.runAsync(
    `INSERT INTO story_progress (level_id, stars, best_score, best_time, plays, updated_at) VALUES (?, ?, ?, ?, 1, ?)
     ON CONFLICT(level_id) DO UPDATE SET stars = excluded.stars, best_score = excluded.best_score, best_time = excluded.best_time, plays = plays + 1, updated_at = excluded.updated_at`,
    [levelId, record.stars, record.bestScore, record.bestTime, Date.now()],
  );
  return {
    record,
    newBestTime: time > 0 && (previous?.bestTime == null || time < previous.bestTime),
    newBestScore: !previous || score > previous.bestScore,
    firstWin: !previous,
  };
}
