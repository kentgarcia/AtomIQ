/**
 * Loads the fixed questions of a story level from the content database (the curriculum's item bank)
 * and the lessons that teach them, for the recommendations after a level. Pure parts are in
 * components/platformer/story-core.ts and story-questions-core.ts.
 */

import { assignQuestions, type LessonRef } from "@/components/platformer/story-core";
import type { StoryLevel } from "@/components/platformer/story-levels";
import type { StoryQuestion } from "@/components/platformer/story-battle-core";
import { questionsFromItems } from "@/components/platformer/story-questions-core";
import { parseLevel } from "@/components/platformer/platformer-core";
import { contentRepository } from "@/services/content-db";

export interface StoryLoad {
  /** Per enemy of the level (in `parseLevel` order), its fixed questions. */
  lists: StoryQuestion[][];
  /** The lessons of the level's unit, to recommend from. */
  lessons: LessonRef[];
}

/** Every item of the level's pool, in the pool's order; a pool the bank cannot fill falls back to the unit's own fitting items. */
async function poolQuestions(level: StoryLevel): Promise<StoryQuestion[]> {
  const fromPool = questionsFromItems(await contentRepository.getItemsByIds([...level.questions]));
  if (fromPool.length >= 4) return fromPool;
  const objectives = await contentRepository.getObjectives(level.unitId);
  const items = await contentRepository.getItems({ objectiveIds: objectives.map((o) => o.id) });
  return questionsFromItems(items).sort((a, b) => a.difficulty.localeCompare(b.difficulty) || a.id.localeCompare(b.id));
}

export async function loadStoryQuestions(level: StoryLevel): Promise<StoryLoad> {
  const [questions, lessons] = await Promise.all([poolQuestions(level), contentRepository.getLessons(level.unitId)]);
  const byId = new Map(questions.map((q) => [q.itemId, q]));
  const parsed = parseLevel(level.def);
  // The ids of the fixed pool that the bank still has; the order is the level's
  const ids = level.questions.filter((id) => byId.has(id));
  const pool = ids.length >= 4 ? ids : questions.map((q) => q.itemId);
  const assigned = assignQuestions(parsed, pool);
  return {
    lists: assigned.map((list) => list.map((id) => byId.get(id) as StoryQuestion)),
    lessons: lessons.map((l) => ({ id: l.id, title: l.title, teaches: l.teaches })),
  };
}
