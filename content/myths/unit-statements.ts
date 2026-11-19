/** The units' myth-or-fact decks (Myth Buster, Quick Play): DB-backed facade, like the rest of `content/myths`. */

import { contentRepository } from "@/services/content-db";

import type { UnitStatement } from "@/content/types";

/** Every unit's deck, or one unit's when an id is given. */
export const getUnitStatements = (unitId?: string): Promise<UnitStatement[]> =>
  contentRepository.getUnitStatements(unitId);
