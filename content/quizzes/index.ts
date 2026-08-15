/**
 * Quiz registry — DB-backed facade.
 *
 * The hardcoded TypeScript quiz objects (and the standalone atom-maze
 * mythbuster question banks) were migrated into the pre-populated SQLite
 * database (`content.db`, bundled under `assets/database/`). This module keeps
 * the app's existing import surface (`getQuizById`, `getAllQuizzes`, the
 * mythbuster bank helpers) stable while delegating every lookup to the
 * on-device database via `services/content-db.ts`.
 *
 * NOTE: lookups are now asynchronous (SQLite reads on device are async), so
 * callers must `await` the results where they previously read plain objects.
 */

import { contentRepository } from "@/services/content-db";

import type { Myth as MythType, Quiz, QuizQuestion } from "@/content/types";

/** Mythbuster pool difficulties mirror the old repository keys. */
export type MythBusterQuizDifficulty = "easy" | "medium" | "hard";

/** Record of every mythbuster difficulty pool -> its questions. */
export type MythBusterQuizRepository = Record<
  MythBusterQuizDifficulty,
  QuizQuestion[]
>;

/** Hypothetical Myth-derived seed shape (kept for API compatibility). */
export type MythBusterStatementSeed = Pick<
  MythType,
  "id" | "mythStatement" | "reality" | "explanation" | "category" | "difficulty"
>;

/** Fetch a full quiz (questions + parsed JSON) by its id, or `null`. */
export const getQuizById = (id: string): Promise<Quiz | null> =>
  contentRepository.getQuizById(id);

/** Every quiz, fully hydrated, ordered by id. */
export const getAllQuizzes = (): Promise<Quiz[]> =>
  contentRepository.getAllQuizzes();

/** Quizzes sharing a category. */
export const getQuizzesByCategory = (category: string): Promise<Quiz[]> =>
  contentRepository.getAllQuizzes().then((quizzes) =>
    quizzes.filter((quiz) => quiz.category === category),
  );

/** Quizzes whose tags include `tag`. */
export const getQuizzesByTag = (tag: string): Promise<Quiz[]> =>
  contentRepository.getAllQuizzes().then((quizzes) =>
    quizzes.filter((quiz) => quiz.tags.includes(tag)),
  );

/** Quizzes matching a difficulty. */
export const getQuizzesByDifficulty = (
  difficulty: "easy" | "medium" | "hard",
): Promise<Quiz[]> =>
  contentRepository.getAllQuizzes().then((quizzes) =>
    quizzes.filter((quiz) => quiz.difficulty === difficulty),
  );

/**
 * Mythbuster question bank for a single difficulty pool (easy/medium/hard),
 * used by the atom-maze boss battles.
 */
export const getMythBusterQuizQuestionsByDifficulty = (
  difficulty: MythBusterQuizDifficulty,
): Promise<QuizQuestion[]> =>
  contentRepository.getMythBusterQuizQuestionsByDifficulty(difficulty);

/** Every question across all mythbuster difficulty pools. */
export const getAllMythBusterQuizQuestions = (): Promise<QuizQuestion[]> =>
  contentRepository.getAllMythBusterQuizQuestions();

export default {
  getQuizById,
  getAllQuizzes,
  getQuizzesByCategory,
  getQuizzesByTag,
  getQuizzesByDifficulty,
  getMythBusterQuizQuestionsByDifficulty,
  getAllMythBusterQuizQuestions,
};
