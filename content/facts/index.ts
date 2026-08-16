/**
 * Fact registry — DB-backed facade.
 *
 * The hardcoded TypeScript fact objects were migrated into the pre-populated
 * SQLite database (`content.db`, bundled under `assets/database/`). This module
 * keeps the app's existing import surface (`getFactById`, `getAllFacts`, and the
 * filter/sort helpers) stable while delegating every lookup to the on-device
 * database via `services/content-db.ts`.
 *
 * NOTE: lookups are now asynchronous (SQLite reads on device are async), so
 * callers must `await` the results where they previously read plain objects.
 */

import { contentRepository } from "@/services/content-db";

import type { Fact } from "@/content/types";

/** Fetch a fact by its id, or `null`. */
export const getFactById = (id: string): Promise<Fact | null> =>
  contentRepository.getFactById(id);

/** Every fact, fully hydrated, ordered by id. */
export const getAllFacts = (): Promise<Fact[]> =>
  contentRepository.getAllFacts();

/** Facts sharing a category (e.g. 'environment'). */
export const getFactsByCategory = (category: string): Promise<Fact[]> =>
  contentRepository.getAllFacts().then((facts) =>
    facts.filter((fact) => fact.category === category),
  );

/** Facts whose tags include `tag`. */
export const getFactsByTag = (tag: string): Promise<Fact[]> =>
  contentRepository.getAllFacts().then((facts) =>
    facts.filter((fact) => fact.tags.includes(tag)),
  );

/** Facts of a given importance (low/medium/high/critical). */
export const getFactsByImportance = (
  importance: "low" | "medium" | "high" | "critical",
): Promise<Fact[]> =>
  contentRepository.getAllFacts().then((facts) =>
    facts.filter((fact) => fact.importance === importance),
  );

/** Only the critical facts. */
export const getCriticalFacts = (): Promise<Fact[]> =>
  getFactsByImportance("critical");

/** The most recently added facts, by `dateAdded` desc. */
export const getRecentFacts = async (limit = 10): Promise<Fact[]> => {
  const facts = await contentRepository.getAllFacts();
  return [...facts]
    .sort((a, b) => Date.parse(b.dateAdded) - Date.parse(a.dateAdded))
    .slice(0, limit);
};

export default {
  getFactById,
  getAllFacts,
  getFactsByCategory,
  getFactsByTag,
  getFactsByImportance,
  getCriticalFacts,
  getRecentFacts,
};
