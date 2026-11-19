/**
 * Story mode's rules, as pure functions (no React), unit-tested (`npm run test:platformer`): which
 * fixed questions each enemy of a level asks, which levels are open, how a finished level is scored
 * and which lessons to recommend after a level.
 */

import type { Level } from "./platformer-core.ts";
import { ENEMY_KINDS } from "./platformer-core.ts";

/** Questions an enemy gets beyond its life, for the times a wrong answer sends the learner back to it. */
export const SPARE_QUESTIONS = 2;

/**
 * The fixed question ids of each enemy of `level` (indexed like `level.enemies`). The enemies are taken
 * from the left of the level to the right and each gets the next `hp + SPARE_QUESTIONS` ids of `pool`,
 * so the questions get harder along the level and the boss at the end asks the last ones. A pool that
 * runs out starts again from its first id.
 */
export const assignQuestions = (level: Pick<Level, "enemies">, pool: readonly string[]): string[][] => {
  const out: string[][] = level.enemies.map(() => []);
  if (pool.length === 0) return out;
  const order = level.enemies.map((e, i) => i).sort((a, b) => level.enemies[a].x - level.enemies[b].x || a - b);
  let next = 0;
  for (const i of order) {
    const count = ENEMY_KINDS[level.enemies[i].kind].hp + SPARE_QUESTIONS;
    for (let k = 0; k < count; k++) out[i].push(pool[next++ % pool.length]);
  }
  return out;
};

/** The most question slots a level can use before its pool starts over. */
export const slotsNeeded = (level: Pick<Level, "enemies">): number =>
  level.enemies.reduce((n, e) => n + ENEMY_KINDS[e.kind].hp + SPARE_QUESTIONS, 0);

/* ------------------------------ progress ------------------------------ */

export interface LevelRecord {
  levelId: string;
  stars: number;
  bestScore: number;
  /** Fastest win, seconds outside battles; null before a first win. */
  bestTime: number | null;
}

/** The first level is always open; each other opens once the one before it has been finished (1 star or more). */
export const isLevelUnlocked = (index: number, ids: readonly string[], records: readonly LevelRecord[]): boolean => {
  if (index <= 0) return true;
  const before = records.find((r) => r.levelId === ids[index - 1]);
  return !!before && before.stars >= 1;
};

/** The level the learner should play next: the first one not finished, or the last. */
export const currentLevelIndex = (ids: readonly string[], records: readonly LevelRecord[]): number => {
  const i = ids.findIndex((id) => !records.some((r) => r.levelId === id && r.stars >= 1));
  return i === -1 ? ids.length - 1 : i;
};

/** Keep the better of two records of one level: most stars, highest score, fastest time. */
export const betterRecord = (a: LevelRecord | undefined, b: LevelRecord): LevelRecord => {
  if (!a) return b;
  const times = [a.bestTime, b.bestTime].filter((t): t is number => t !== null && t > 0);
  return { levelId: b.levelId, stars: Math.max(a.stars, b.stars), bestScore: Math.max(a.bestScore, b.bestScore), bestTime: times.length ? Math.min(...times) : null };
};

/** A run's time as m:ss.s, for the HUD (whole seconds) and the result (with a tenth). */
export const formatTime = (seconds: number, tenths: boolean = false): string => {
  const t = Math.max(0, seconds);
  const m = Math.floor(t / 60);
  const s = tenths ? (t - m * 60).toFixed(1).padStart(4, "0") : String(Math.floor(t - m * 60)).padStart(2, "0");
  return `${m}:${s}`;
};

/* ------------------------------ lesson recommendations ------------------------------ */

export interface LessonRef {
  id: string;
  title: string;
  /** Objective ids this lesson teaches. */
  teaches: readonly string[];
}

export interface Recommendation {
  lessonId: string;
  title: string;
  /** How many questions the learner missed on what this lesson teaches. */
  missed: number;
}

/**
 * The lessons that teach what was missed in a level, the most missed first (at most `limit`). `missed`
 * is one objective id for every wrong answer, so an objective missed twice counts twice.
 */
export const recommendLessons = (missed: readonly string[], lessons: readonly LessonRef[], limit: number = 3): Recommendation[] => {
  const counts = new Map<string, number>();
  for (const objective of missed) {
    const lesson = lessons.find((l) => l.teaches.includes(objective));
    if (lesson) counts.set(lesson.id, (counts.get(lesson.id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([lessonId, n]) => ({ lessonId, title: lessons.find((l) => l.id === lessonId)?.title ?? lessonId, missed: n }))
    .sort((a, b) => b.missed - a.missed || a.lessonId.localeCompare(b.lessonId))
    .slice(0, limit);
};
