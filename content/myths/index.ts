/**
 * Myth Registry
 * Import and export all myths here
 */

import { Myth } from "../types";

// Unit 1
import allRadiationManmadeMyth from "./all-radiation-manmade";
import radiationGlowsGreenMyth from "./radiation-glows-green";

// Unit 2
import fukushimaWasNuclearExplosionMyth from "./fukushima-was-nuclear-explosion";
import livingNearPlantDangerousMyth from "./living-near-plant-dangerous";
import nuclearPlantsExplodeMyth from "./nuclear-plants-explode";

// Unit 5
import nuclearNotCleanMyth from "./nuclear-not-clean";
import nuclearWasteForeverMyth from "./nuclear-waste-forever";

// Myth registry
export const myths: Record<string, Myth> = {
  // Unit 1
  "all-radiation-manmade": allRadiationManmadeMyth,
  "radiation-glows-green": radiationGlowsGreenMyth,

  // Unit 2
  "nuclear-plants-explode": nuclearPlantsExplodeMyth,
  "living-near-plant-dangerous": livingNearPlantDangerousMyth,
  "fukushima-was-nuclear-explosion": fukushimaWasNuclearExplosionMyth,

  // Unit 5
  "nuclear-waste-forever": nuclearWasteForeverMyth,
  "nuclear-not-clean": nuclearNotCleanMyth,
};

// Helper functions
export const getMythById = (id: string): Myth | undefined => {
  return myths[id];
};

export const getMythsByCategory = (category: string): Myth[] => {
  return Object.values(myths).filter((myth) => myth.category === category);
};

export const getMythsByTag = (tag: string): Myth[] => {
  return Object.values(myths).filter((myth) => myth.tags.includes(tag));
};

export const getMythsByDifficulty = (
  difficulty: "easy" | "medium" | "hard",
): Myth[] => {
  return Object.values(myths).filter((myth) => myth.difficulty === difficulty);
};

export const getPopularMyths = (limit: number = 10): Myth[] => {
  return Object.values(myths)
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
};

export const getAllMyths = (): Myth[] => {
  return Object.values(myths);
};

export default myths;
