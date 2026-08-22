/**
 * AtomIQ Guide — user context provider.
 *
 * Aggregates the learner's real progress from the app's existing stores:
 *   - profile + xp/level/streaks via `getUserProfile` (services/database.ts)
 *   - lesson/quiz completion via `getAllLevels` (the same `levels` table the
 *     Home map uses)
 *   - weak areas derived deterministically from quiz stars/attempts (no new
 *     schema required for MVP)
 *
 * This module is intentionally hook-free; the screen passes the live profile
 * from `useStorage()` in and receives a plain `GuideContext` back.
 */

import { UNITS } from "@/content/units";
import { getAllLevels, getUserProfile } from "@/services/database";

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

const isUnitUnlockedByProgress = (
  unitOrder: number,
  completedIds: string[],
): boolean => {
  if (unitOrder <= 1) return true;
  const previous = UNITS.find((u) => u.order === unitOrder - 1);
  if (!previous) return false;
  return previous.lessonIds.every((id) => completedIds.includes(id));
};

export const getGuideContext = async (
  liveProfile?: {
    display_name?: string;
    total_xp?: number;
    myths_busted?: number;
    lessons_completed?: number;
  } | null,
): Promise<GuideContext> => {
  const [dbProfile, levels] = await Promise.all([getUserProfile(), getAllLevels()]);

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

  const completedIds = levelRows
    .filter((r) => r.status === "completed")
    .map((r) => r.id);

  const currentLevel = levelRows.find(
    (r) => r.status === "current" && r.type === "lesson",
  );
  const currentLevelId = currentLevel?.id ?? null;

  // Weak quizzes: completed, but low mastery after more than one attempt.
  const weakQuizIds = levelRows
    .filter(
      (r) =>
        r.type === "quiz" &&
        r.status === "completed" &&
        r.attempts > 1 &&
        r.stars <= 1,
    )
    .map((r) => r.id);

  const unlockedUnitIds = UNITS.filter((u) =>
    isUnitUnlockedByProgress(u.order, completedIds),
  ).map((u) => u.id);

  const currentUnit =
    UNITS.find((u) => u.lessonIds.includes(currentLevelId ?? "")) ??
    UNITS.find((u) => u.quizIds.includes(currentLevelId ?? "")) ??
    null;

  return {
    profile: level,
    currentLevelId,
    currentUnitId: currentUnit?.id ?? null,
    completedIds,
    weakQuizIds,
    unlockedUnitIds,
  };
};
