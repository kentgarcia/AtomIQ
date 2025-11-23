/**
 * Fact Registry
 * Import and export all facts here
 */

import { Fact } from '../types';
import nuclearWasteVolumeFact from './nuclear-waste-volume';
import carbonEmissionsFact from './carbon-emissions';

// Fact registry
export const facts: Record<string, Fact> = {
  'nuclear-waste-volume': nuclearWasteVolumeFact,
  'carbon-emissions': carbonEmissionsFact,
};

// Helper functions
export const getFactById = (id: string): Fact | undefined => {
  return facts[id];
};

export const getFactsByCategory = (category: string): Fact[] => {
  return Object.values(facts).filter(fact => fact.category === category);
};

export const getFactsByTag = (tag: string): Fact[] => {
  return Object.values(facts).filter(fact => fact.tags.includes(tag));
};

export const getFactsByImportance = (importance: 'low' | 'medium' | 'high' | 'critical'): Fact[] => {
  return Object.values(facts).filter(fact => fact.importance === importance);
};

export const getCriticalFacts = (): Fact[] => {
  return Object.values(facts).filter(fact => fact.importance === 'critical');
};

export const getRecentFacts = (limit: number = 10): Fact[] => {
  return Object.values(facts)
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, limit);
};

export const getAllFacts = (): Fact[] => {
  return Object.values(facts);
};

export default facts;

