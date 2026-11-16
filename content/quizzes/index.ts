/**
 * MythBuster question banks: DB-backed facade used by the Atom Maze boss battles.
 *
 * Quizzes were retired with curriculum v2: questions now live in the shared item
 * bank (see content/curriculum). MythBuster questions stay in their own table.
 */

import { contentRepository } from "@/services/content-db";

import type { Myth as MythType, QuizQuestion } from "@/content/types";

/** Mythbuster pool difficulties mirror the old repository keys. */
export type MythBusterQuizDifficulty = "easy" | "medium" | "hard";

/** Record of every mythbuster difficulty pool -> its questions. */
export type MythBusterQuizRepository = Record<MythBusterQuizDifficulty, QuizQuestion[]>;

/** Hypothetical Myth-derived seed shape (kept for API compatibility). */
export type MythBusterStatementSeed = Pick<
  MythType,
  "id" | "mythStatement" | "reality" | "explanation" | "category" | "difficulty"
>;

/** Mythbuster question bank for a single difficulty pool (easy/medium/hard). */
export const getMythBusterQuizQuestionsByDifficulty = (
  difficulty: MythBusterQuizDifficulty,
): Promise<QuizQuestion[]> => contentRepository.getMythBusterQuizQuestionsByDifficulty(difficulty);

/** Every question across all mythbuster difficulty pools. */
export const getAllMythBusterQuizQuestions = (): Promise<QuizQuestion[]> =>
  contentRepository.getAllMythBusterQuizQuestions();

export default {
  getMythBusterQuizQuestionsByDifficulty,
  getAllMythBusterQuizQuestions,
};
