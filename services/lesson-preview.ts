/**
 * What the lesson preview shows, loaded without opening the lesson screen: the Home map prefetches it
 * when a node's bubble opens, so the preview can fade in over the bubble's zoom with nothing to wait for.
 */

import type { Lesson, Objective, Unit } from "@/content/curriculum/types";
import { contentRepository } from "@/services/content-db";
import { getLevelProgress } from "@/services/database";
import { contentKeyOf, runProgress } from "@/services/lesson-progress-core";
import { loadLessonRun } from "@/services/lesson-runs";

export interface LessonPreviewData {
  lesson: Lesson;
  unit: Unit | null;
  /** The objectives this lesson teaches. */
  objectives: Objective[];
  referenceCount: number;
  /** Core cards only (what the learner will play). */
  cardCount: number;
  /** Already completed: the preview says "Review lesson". */
  isReplay: boolean;
  /** How far through a lesson left half way the learner was, 0 to 100; null when there is no run to carry on. */
  savedPercent: number | null;
}

/** Null when the lesson does not exist. Throws only on a database error (callers fall back to opening the lesson screen). */
export async function loadLessonPreview(lessonId: string): Promise<LessonPreviewData | null> {
  const content = await contentRepository.getLessonContent(lessonId);
  if (!content) return null;
  const [nodes, unit, objectives] = await Promise.all([
    contentRepository.getPathNodes(content.lesson.unitId),
    contentRepository.getUnitById(content.lesson.unitId),
    contentRepository.getObjectives(content.lesson.unitId),
  ]);
  const node = nodes.find((n) => n.lessonId === lessonId) ?? null;
  const progress = node ? ((await getLevelProgress(node.id)) as { status?: string } | null) : null;
  // A lesson left half way: the Home map asks "Continue or Start again" before opening it
  const saved = node ? await loadLessonRun(node.id, contentKeyOf(content.cards.map((c) => c.id))) : null;
  return {
    lesson: content.lesson,
    unit,
    objectives: objectives.filter((o) => content.lesson.teaches.includes(o.id)),
    referenceCount: content.references.length,
    cardCount: content.cards.filter((c) => c.tier === "core").length,
    isReplay: progress?.status === "completed",
    savedPercent: saved ? Math.round(runProgress(saved.run) * 100) : null,
  };
}
