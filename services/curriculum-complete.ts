/**
 * What happens when a path node is finished: save completion, award XP (in full the first time, a
 * very small repeat amount after, `repeatXp`), log activity, and update objective mastery. UI-free; the screen passes in the two
 * storage-context actions it needs.
 */

import type { Lesson, PathNode } from "@/content/curriculum/types";
import { recordActivity } from "@/services/activity-log";
import { recordAnswers, markObjectivesFamiliar, type RecordedAnswer } from "@/services/curriculum-progress";
import { getLevelProgress, getUserProfile, logDailyActivity, updateLevelProgress } from "@/services/database";
import { emitFeedEvent, emitNodeCompleted } from "@/services/feed";
import { recordMissionEvent } from "@/services/missions";
import { toLocalIsoDate } from "@/services/utils";
import { repeatXp } from "@/services/xp-core";

export interface CompleteOptions {
  node: PathNode;
  /** Set for lesson nodes. */
  lesson?: Lesson;
  stars: 1 | 2 | 3;
  xp: number;
  /** False for a checkpoint below its pass mark: answers are recorded, the node stays open. */
  passed: boolean;
  sessionId: string;
  answers: RecordedAnswer[];
  addXP: (amount: number) => Promise<void>;
  updateUserProfile: (updates: { lessons_completed?: number }) => Promise<void>;
}

export interface CompleteResult {
  /** True the first time this node was completed (the full XP was awarded). */
  firstCompletion: boolean;
  /** What was paid: the full amount the first time, the small repeat amount on a replay, 0 when not passed. */
  xpAwarded: number;
}

export async function completeNode(opts: CompleteOptions): Promise<CompleteResult> {
  const { node, lesson, stars, xp, passed, sessionId, answers, addXP, updateUserProfile } = opts;

  await recordAnswers(sessionId, answers);

  if (!passed) return { firstCompletion: false, xpAwarded: 0 };

  const existing = (await getLevelProgress(node.id)) as { status?: string; completed_at?: string; stars?: number; xp_earned?: number } | null;
  const already = existing?.status === "completed";

  await updateLevelProgress(node.id, {
    status: "completed",
    xp_earned: Math.max(existing?.xp_earned ?? 0, xp),
    stars: Math.max(existing?.stars ?? 0, stars),
    completed_at: existing?.completed_at || new Date().toISOString(),
    unit_id: node.unitId,
    type: node.kind,
  });

  if (lesson) {
    await markObjectivesFamiliar(lesson.teaches);
    recordActivity("lesson_complete", { id: node.id });
    // Counts toward the weekly "Finish lessons" quest (a replay counts too)
    void recordMissionEvent("lesson", 1);
  } else {
    recordActivity("quiz_complete", { id: node.id });
  }

  if (already) {
    // A replay: only a very small share of the XP, no new lesson count and no feed post
    const repeat = repeatXp(xp);
    if (repeat > 0) {
      await addXP(repeat);
      await logDailyActivity(toLocalIsoDate(), { xp_earned: repeat });
    }
    return { firstCompletion: false, xpAwarded: repeat };
  }

  await addXP(xp);
  if (lesson) {
    const profile = (await getUserProfile()) as { lessons_completed?: number } | null;
    if (profile) await updateUserProfile({ lessons_completed: (profile.lessons_completed ?? 0) + 1 });
  }
  await logDailyActivity(toLocalIsoDate(), {
    xp_earned: xp,
    lessons_completed: lesson ? 1 : 0,
    time_spent_minutes: lesson?.estimatedMinutes ?? 4,
  });
  // The NPC feed hears about it last (fire-and-forget: it can never fail or delay the completion).
  emitNodeCompleted({ nodeId: node.id, unitId: node.unitId, kind: node.kind, lessonId: lesson?.id, perfect: stars === 3 });
  return { firstCompletion: true, xpAwarded: xp };
}

/** Record a unit test-out: the unit counts as complete and its objectives start as Familiar. */
export async function completeTestOut(opts: {
  unitId: string;
  objectiveIds: string[];
  sessionId: string;
  answers: RecordedAnswer[];
  passed: boolean;
}): Promise<void> {
  await recordAnswers(opts.sessionId, opts.answers);
  if (!opts.passed) return;
  await updateLevelProgress(`testout:${opts.unitId}`, {
    status: "completed",
    stars: 3,
    completed_at: new Date().toISOString(),
    unit_id: opts.unitId,
    type: "testout",
  });
  await markObjectivesFamiliar(opts.objectiveIds);
  emitFeedEvent({ type: "testout_pass", unitId: opts.unitId });
}
