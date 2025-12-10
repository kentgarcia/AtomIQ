/**
 * Quiz Registry
 * Import and export all quizzes here
 */

import { Quiz } from '../types';
import atomicBasicsQuiz from './atomic-basics-quiz';
import everydayNuclearQuiz from './everyday-nuclear-quiz';
import nuclearReactionsQuiz from './nuclear-reactions-quiz';
import radiationEffectsQuiz from './radiation-effects-quiz';
import radiationSafetyQuiz from './radiation-safety-quiz';
import radiationTypesQuiz from './radiation-types-quiz';
import reactorMechanicsQuiz from './reactor-mechanics-quiz';
import safetySecurityQuiz from './safety-security-quiz';
import sustainabilityQuiz from './sustainability-quiz';

// Quiz registry
export const quizzes: Record<string, Quiz> = {
  'radiation-safety-quiz': radiationSafetyQuiz,
  'atomic-basics-quiz': atomicBasicsQuiz,
  'nuclear-reactions-quiz': nuclearReactionsQuiz,
  'radiation-effects-quiz': radiationEffectsQuiz,
  'everyday-nuclear-quiz': everydayNuclearQuiz,
  'safety-security-quiz': safetySecurityQuiz,
  'radiation-types-quiz': radiationTypesQuiz,
  'reactor-mechanics-quiz': reactorMechanicsQuiz,
  'sustainability-quiz': sustainabilityQuiz,
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

