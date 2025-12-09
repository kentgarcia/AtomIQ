/**
 * Encyclopedia Database
 * Centralized database for nuclear science encyclopedia entries
 * Now using JSON files for faster loading and easier maintenance
 */

import { EncyclopediaEntry } from '../types';
import peopleData from './people.json';
import termsData from './terms.json';

/**
 * Combined encyclopedia entries from JSON files
 * Includes A-Z Nuclear Science Terms and Notable People
 */
export const encyclopediaDatabase: Record<string, EncyclopediaEntry> = {
  ...termsData,
  ...peopleData,
} as Record<string, EncyclopediaEntry>;

/**
 * API Integration Helper
 * Can be used to fetch additional data from external sources
 */
export interface EncyclopediaAPIConfig {
  wikipedia?: {
    enabled: boolean;
    endpoint?: string;
  };
  iaea?: {
    enabled: boolean;
    endpoint?: string;
  };
}

/**
 * Fetch entry from Wikipedia API (example)
 * This is a placeholder for future API integration
 */
export async function fetchFromWikipedia(term: string): Promise<Partial<EncyclopediaEntry> | null> {
  // Example: Wikipedia API endpoint
  // const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term)}`;
  // Implementation would go here
  return null;
}

/**
 * Get entry with API enhancement
 * First checks local database, then optionally fetches from API
 */
export async function getEncyclopediaEntryWithAPI(
  id: string,
  useAPI: boolean = false
): Promise<EncyclopediaEntry | null> {
  const localEntry = encyclopediaDatabase[id];
  
  if (!localEntry) {
    return null;
  }
  
  // If API is enabled, try to enhance with external data
  if (useAPI) {
    const apiData = await fetchFromWikipedia(localEntry.term);
    if (apiData) {
      return {
        ...localEntry,
        ...apiData,
      };
    }
  }
  
  return localEntry;
}

/**
 * Search entries with API enhancement
 */
export async function searchEncyclopediaWithAPI(
  query: string,
  useAPI: boolean = false
): Promise<EncyclopediaEntry[]> {
  const lowerQuery = query.toLowerCase();
  const localResults = Object.values(encyclopediaDatabase).filter(entry =>
    entry.term.toLowerCase().includes(lowerQuery) ||
    entry.definition.toLowerCase().includes(lowerQuery) ||
    entry.category.toLowerCase().includes(lowerQuery) ||
    entry.quickFacts.some(fact => fact.toLowerCase().includes(lowerQuery))
  );
  
  // If API is enabled, could also search external sources
  // and merge results
  
  return localResults.sort((a, b) => a.term.localeCompare(b.term));
}

export default encyclopediaDatabase;
