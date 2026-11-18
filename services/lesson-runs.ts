/**
 * Persistence for lessons in progress: one saved run per path node, in the user-state database.
 * The rules (what is worth saving, how a saved run is checked) are in
 * `services/lesson-progress-core.ts`; this file only reads and writes.
 *
 * Writes go through one queue, so a quick succession of saves (one per card) cannot land out of
 * order and an old state cannot overwrite a newer one or a clear.
 */

import { getDatabase } from "@/services/database";
import {
  parseSnapshot,
  runProgress,
  toSnapshot,
  type LessonSnapshot,
  type RunState,
} from "@/services/lesson-progress-core";

let queue: Promise<unknown> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  const next = queue.then(task).catch((error) => {
    console.error("Error saving lesson progress:", error);
  });
  queue = next;
  return next;
}

/** Save the run of `nodeId` as it is now. */
export function saveLessonRun(nodeId: string, lessonId: string, contentKey: string, state: RunState): Promise<void> {
  const snapshot = toSnapshot(nodeId, contentKey, state, Date.now());
  return enqueue(async () => {
    await getDatabase().runAsync(
      `INSERT INTO lesson_runs (node_id, lesson_id, snapshot, progress, updated_at)
       VALUES (?,?,?,?,?)
       ON CONFLICT(node_id) DO UPDATE SET
         lesson_id = excluded.lesson_id, snapshot = excluded.snapshot,
         progress = excluded.progress, updated_at = excluded.updated_at`,
      [nodeId, lessonId, JSON.stringify(snapshot), runProgress(state.run), snapshot.savedAt],
    );
  });
}

/** Forget the saved run of `nodeId` (the lesson was finished, or the learner chose to start again). */
export function clearLessonRun(nodeId: string): Promise<void> {
  return enqueue(async () => {
    await getDatabase().runAsync("DELETE FROM lesson_runs WHERE node_id = ?", [nodeId]);
  });
}

/** The saved run of `nodeId`, if it can still be used with the lesson's current cards. */
export async function loadLessonRun(nodeId: string, contentKey: string): Promise<LessonSnapshot | null> {
  try {
    await queue;
    const row = await getDatabase().getFirstAsync<{ snapshot: string }>("SELECT snapshot FROM lesson_runs WHERE node_id = ?", [nodeId]);
    const snapshot = parseSnapshot(row?.snapshot, { nodeId, contentKey });
    // A run that cannot be used is dropped, so it never shows a ring for something that will start over
    if (row && !snapshot) await clearLessonRun(nodeId);
    return snapshot;
  } catch (error) {
    console.error("Error loading lesson progress:", error);
    return null;
  }
}

/** How far through each saved lesson the learner is (0 to 0.95), by path node id, for the map. */
export async function getLessonRunProgress(): Promise<Record<string, number>> {
  try {
    await queue;
    const rows = await getDatabase().getAllAsync<{ node_id: string; progress: number }>("SELECT node_id, progress FROM lesson_runs");
    return Object.fromEntries(rows.map((r) => [r.node_id, r.progress]));
  } catch (error) {
    console.error("Error loading lesson progress:", error);
    return {};
  }
}
