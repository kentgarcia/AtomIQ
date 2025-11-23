/**
 * Quiz Registry
 * Import and export all quizzes here
 */

import { Quiz } from '../types';
import radiationSafetyQuiz from './radiation-safety-quiz';
import atomicBasicsQuiz from './atomic-basics-quiz';

// Quiz registry
export const quizzes: Record<string, Quiz> = {
  'radiation-safety-quiz': radiationSafetyQuiz,
  'atomic-basics-quiz': atomicBasicsQuiz,
};

// Helper functions
export const getQuizById = (id: string): Quiz | undefined => {
  return quizzes[id];
};

export const getQuizzesByCategory = (category: string): Quiz[] => {
  return Object.values(quizzes).filter(quiz => quiz.category === category);
};

export const getQuizzesByTag = (tag: string): Quiz[] => {
  return Object.values(quizzes).filter(quiz => quiz.tags.includes(tag));
};

export const getQuizzesByDifficulty = (difficulty: 'easy' | 'medium' | 'hard'): Quiz[] => {
  return Object.values(quizzes).filter(quiz => quiz.difficulty === difficulty);
};

export const getAllQuizzes = (): Quiz[] => {
  return Object.values(quizzes);
};

export default quizzes;

