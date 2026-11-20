/**
 * AtomIQ Explorer Content Registry
 * Central hub for all Explorer journeys and encyclopedia entries.
 *
 * Encyclopedia entries are stored in the SQLite content database
 * (see @/services/content-db) and fetched through the async repository;
 * journeys remain in-repo data registries below.
 */

import { EncyclopediaEntry, Journey } from './types';

import { contentRepository } from '@/services/content-db';

// Import journeys
import nuclearSafetyJourney from './journeys/nuclear-safety-journey';
import radiationRealityJourney from './journeys/radiation-reality-journey';

// Journey Registry
export const journeys: Record<string, Journey> = {
  'radiation-reality': radiationRealityJourney,
  'nuclear-safety': nuclearSafetyJourney,
};

// Helper Functions

export const getJourneyById = (id: string): Journey | undefined => {
  return journeys[id];
};

export const getAllJourneys = (): Journey[] => {
  return Object.values(journeys);
};

export const getJourneysByCategory = (category: string): Journey[] => {
  return Object.values(journeys).filter(journey => journey.category === category);
};

export const getJourneysByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): Journey[] => {
  return Object.values(journeys).filter(journey => journey.difficulty === difficulty);
};

export const getEncyclopediaEntryById = async (id: string): Promise<EncyclopediaEntry | undefined> => {
  const entry = await contentRepository.getEncyclopediaEntryById(id);
  return entry ?? undefined;
};

export const getAllEncyclopediaEntries = async (): Promise<EncyclopediaEntry[]> => {
  return contentRepository.getAllEncyclopediaEntries();
};

export const searchEncyclopedia = async (query: string): Promise<EncyclopediaEntry[]> => {
  return contentRepository.searchEncyclopedia(query);
};

export const getEncyclopediaByCategory = async (category: string): Promise<EncyclopediaEntry[]> => {
  return contentRepository.getEncyclopediaByCategory(category);
};

export const getEncyclopediaByDifficulty = async (
  difficulty: 'beginner' | 'intermediate' | 'advanced',
): Promise<EncyclopediaEntry[]> => {
  return contentRepository.getEncyclopediaByDifficulty(difficulty);
};

// Export types
export type {
  BattleQuestion, EncyclopediaEntry, Journey, JourneyNode,
  MultimediaPopUp, MythNodeContent, QuestionType,
  QuizQuestion,
  ScrambleQuestion
} from './types';

