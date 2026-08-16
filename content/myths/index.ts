/**
 * Myth registry — DB-backed facade.
 *
 * The hardcoded TypeScript myth objects (including the in-doc `myths-facts-pack`)
 * were migrated into the pre-populated SQLite database (`content.db`, bundled
 * under `assets/database/`). This module keeps the app's existing import surface
 * (`getMythById`, `getAllMyths`, and the filter/sort helpers) stable while
 * delegating every lookup to the on-device database via `services/content-db.ts`.
 *
 * NOTE: lookups are now asynchronous (SQLite reads on device are async), so
 * callers must `await` the results where they previously read plain objects.
 */

import { contentRepository } from "@/services/content-db";

import type { Myth } from "@/content/types";

/** Fetch a myth by its id, or `null`. */
export const getMythById = (id: string): Promise<Myth | null> =>
  contentRepository.getMythById(id);

/** Every myth, fully hydrated, ordered by id. */
export const getAllMyths = (): Promise<Myth[]> =>
  contentRepository.getAllMyths();

/** Myths sharing a category (e.g. 'safety', 'basics'). */
export const getMythsByCategory = (category: string): Promise<Myth[]> =>
  contentRepository.getAllMyths().then((myths) =>
    myths.filter((myth) => myth.category === category),
  );

/** Myths whose tags include `tag`. */
export const getMythsByTag = (tag: string): Promise<Myth[]> =>
  contentRepository.getAllMyths().then((myths) =>
    myths.filter((myth) => myth.tags.includes(tag)),
  );

/** Myths matching a difficulty pool (easy/medium/hard). */
export const getMythsByDifficulty = (
  difficulty: "easy" | "medium" | "hard",
): Promise<Myth[]> =>
  contentRepository.getAllMyths().then((myths) =>
    myths.filter((myth) => myth.difficulty === difficulty),
  );

/** The most common/popular myths, ranked by `popularity` desc. */
export const getPopularMyths = async (limit = 10): Promise<Myth[]> => {
  const myths = await contentRepository.getAllMyths();
  return [...myths].sort((a, b) => b.popularity - a.popularity).slice(0, limit);
};

export default {
  getMythById,
  getAllMyths,
  getMythsByCategory,
  getMythsByTag,
  getMythsByDifficulty,
  getPopularMyths,
};
