/**
 * AtomIQ Explorer Content Registry
 * Central hub for all Explorer journeys, mazes, and encyclopedia entries
 */

import { Journey, AtomMazeChallenge, EncyclopediaEntry } from './types';

// Import journeys
import radiationRealityJourney from './journeys/radiation-reality-journey';
import nuclearSafetyJourney from './journeys/nuclear-safety-journey';

// Import mazes
import safetyMaze from './mazes/safety-maze';
import radiationBasicsMaze from './mazes/radiation-basics-maze';
import nuclearHistoryMaze from './mazes/nuclear-history-maze';
import reactorTechMaze from './mazes/reactor-tech-maze';

// Import encyclopedia entries
import { encyclopediaDatabase } from './encyclopedia/database';

// Journey Registry
export const journeys: Record<string, Journey> = {
  'radiation-reality': radiationRealityJourney,
  'nuclear-safety': nuclearSafetyJourney,
};

// Maze Registry
export const atomMazes: Record<string, AtomMazeChallenge> = {
  'safety-maze': safetyMaze,
  'radiation-basics-maze': radiationBasicsMaze,
  'nuclear-history-maze': nuclearHistoryMaze,
  'reactor-tech-maze': reactorTechMaze,
};

// Encyclopedia Registry
export const encyclopedia: Record<string, EncyclopediaEntry> = encyclopediaDatabase;

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

export const getMazeById = (id: string): AtomMazeChallenge | undefined => {
  return atomMazes[id];
};

export const getAllMazes = (): AtomMazeChallenge[] => {
  return Object.values(atomMazes);
};

export const getEncyclopediaEntryById = (id: string): EncyclopediaEntry | undefined => {
  return encyclopedia[id];
};

export const getAllEncyclopediaEntries = (): EncyclopediaEntry[] => {
  return Object.values(encyclopedia);
};

export const searchEncyclopedia = (query: string): EncyclopediaEntry[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(encyclopedia).filter(entry =>
    entry.term.toLowerCase().includes(lowerQuery) ||
    entry.definition.toLowerCase().includes(lowerQuery) ||
    entry.category.toLowerCase().includes(lowerQuery) ||
    entry.quickFacts.some(fact => fact.toLowerCase().includes(lowerQuery))
  );
};

export const getEncyclopediaByCategory = (category: string): EncyclopediaEntry[] => {
  return Object.values(encyclopedia).filter(entry => entry.category === category);
};

export const getEncyclopediaByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): EncyclopediaEntry[] => {
  return Object.values(encyclopedia).filter(entry => entry.difficulty === difficulty);
};

// Export types
export type { Journey, AtomMazeChallenge, EncyclopediaEntry, JourneyNode, MythNodeContent, MultimediaPopUp, AtomMazeRoom } from './types';

