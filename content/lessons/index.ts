/**
 * Lesson registry — DB-backed facade.
 *
 * The hardcoded TypeScript lesson objects were migrated into a pre-populated
 * SQLite database (`content.db`, bundled under `assets/database/`). This module
 * keeps the app's existing import surface (`getLessonById`, etc.) stable while
 * delegating every lookup to the on-device database via `services/content-db.ts`.
 *
 * NOTE: lookups are now asynchronous (SQLite reads on device are async), so
 * callers must `await` the results where they previously read a plain object.
 */

import { contentRepository } from "@/services/content-db";

import type { Lesson } from "@/content/types";

/** Fetch a full lesson (steps + parsed JSON) by its id, or `null`. */
export const getLessonById = (id: string): Promise<Lesson | null> =>
  contentRepository.getLessonById(id);

/** Every lesson, fully hydrated, ordered by id. */
export const getAllLessons = (): Promise<Lesson[]> =>
  contentRepository.getAllLessons();

/** Lessons belonging to a single unit. */
export const getLessonsByUnit = (unitId: string): Promise<Lesson[]> =>
  contentRepository.getLessonsByUnit(unitId);

/** Total number of lessons in the bundled db. */
export const getLessonCount = (): Promise<number> =>
  contentRepository.getLessonCount();

export default {
  getLessonById,
  getAllLessons,
  getLessonsByUnit,
  getLessonCount,
};
