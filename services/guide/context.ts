/**
 * AtomIQ Guide — user context provider.
 *
 * Aggregates the learner's real progress from the app's existing stores:
 *   - profile + xp/level/streaks via `getUserProfile` (services/database.ts)
 *   - node completion via `getAllLevels` (the same `levels` table the Home map
 *     uses), combined with the path rules in `path-core.ts`
 *   - weak areas derived deterministically from practice/checkpoint stars and
 *     attempts
 *
 * This module is intentionally hook-free; the screen passes the live profile
 * from `useStorage()` in and receives a plain `GuideContext` back.
 */

import { contentRepository } from "@/services/content-db";
import { getAllLevels, getUserProfile } from "@/services/database";
import { computePathState } from "@/services/path-core";

import type { GuideContext, GuideProfile } from "./types";

interface LevelRow {
  id: string;
  unit_id: string;
  type: string;
  status: string;
  xp_earned: number;
  stars: number;
  attempts: number;
  completed_at?: string | null;
}

export const getGuideContext = async (
  liveProfile?: {
    display_name?: string;
    total_xp?: number;
    myths_busted?: number;
    lessons_completed?: number;
  } | null,
): Promise<GuideContext> => {
  const [dbProfile, levels, units, nodes] = await Promise.all([
    getUserProfile(),
    getAllLevels(),
    contentRepository.getUnits(),
    contentRepository.getPathNodes(),
  ]);

  const profile = (dbProfile ?? {}) as Partial<{
    display_name: string;
    total_xp: number;
    myths_busted: number;
    lessons_completed: number;
  }>;

  const mergedProfile = {
    displayName: liveProfile?.display_name ?? profile.display_name ?? "Scientist",
    totalXp: Math.max(
      0,
      Math.round(
        (liveProfile?.total_xp ?? profile.total_xp ?? 0) as number,
      ),
    ),
    mythsBusted: Math.max(
      0,
      Math.round(
        (liveProfile?.myths_busted ?? profile.myths_busted ?? 0) as number,
      ),
    ),
    lessonsCompleted: Math.max(
      0,
      Math.round(
        (liveProfile?.lessons_completed ?? profile.lessons_completed ?? 0) as number,
      ),
    ),
  };

  const level: GuideProfile = {
    ...mergedProfile,
    level: Math.floor(mergedProfile.totalXp / 100) + 1,
  };

  const levelRows = (levels as LevelRow[]) ?? [];

  // Same path rules as the Home map: sequential nodes, units open when the one before is done.
  const completedNodeIds = new Set(levelRows.filter((r) => r.status === "completed" && r.type !== "testout").map((r) => r.id));
  const testedOut = new Set(levelRows.filter((r) => r.status === "completed" && r.type === "testout").map((r) => r.unit_id));
  const pathState = computePathState(units, nodes, completedNodeIds, testedOut);

  // Lessons are identified by lesson id (what the Guide links to); other nodes by node id.
  const idOfNode = (nodeId: string) => nodes.find((n) => n.id === nodeId)?.lessonId ?? nodeId;
  const completedIds = nodes.filter((n) => completedNodeIds.has(n.id)).map((n) => idOfNode(n.id));

  const currentNode = nodes.find((n) => n.id === pathState.currentNodeId) ?? null;
  const currentLesson = currentNode?.kind === "lesson" ? currentNode : nodes.find((n) => n.kind === "lesson" && pathState.nodes[n.id] === "current");
  const currentLevelId = currentLesson?.lessonId ?? null;

  // Weak practice: completed, but low stars after more than one attempt.
  const weakQuizIds = levelRows
    .filter(
      (r) =>
        (r.type === "practice" || r.type === "checkpoint") &&
        r.status === "completed" &&
        r.attempts > 1 &&
        r.stars <= 1,
    )
    .map((r) => r.id);

  const unlockedUnitIds = units.filter((u) => pathState.units[u.id]?.unlocked).map((u) => u.id);
  const currentUnitId = currentNode?.unitId ?? currentLesson?.unitId ?? null;

  return {
    profile: level,
    currentLevelId,
    currentUnitId,
    completedIds,
    weakQuizIds,
    unlockedUnitIds,
  };
};
