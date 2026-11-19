/**
 * Loads a level's pictures before it starts, so the first frames are not drawn while they still
 * decode: everything the level can show (its terrain set, scenery, props, enemies, the biome, the
 * hero's sheet and the HUD's pictures). Reports progress for the loading screen.
 */

import { Asset } from "expo-asset";

import {
  BACKGROUND_CLOUDS,
  BACKGROUND_SKY,
  BIOMES,
  ENEMY_SPRITES,
  HERO_SHEET,
  HUD_DIGITS,
  HUD_MULTIPLY,
  PROP_SPRITES,
  CONTROL_SPRITES,
  EMOTE_SPRITES,
  SCENERY_SPRITES,
  TERRAIN,
  WATER_SPRITES,
  LAVA_SPRITES,
} from "./sprites";
import type { BiomeName, TerrainTheme } from "./platformer-view";

/** Every module id (the number `require` gives) found anywhere inside `value`, each once. */
export const collectSources = (value: unknown, out: Set<number> = new Set()): number[] => {
  if (typeof value === "number") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => collectSources(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectSources(v, out));
  return [...out];
};

/** The pictures of a level in this terrain set and biome. */
export const levelSources = (theme: TerrainTheme, biome: BiomeName): number[] =>
  collectSources([TERRAIN[theme], WATER_SPRITES, LAVA_SPRITES, SCENERY_SPRITES, PROP_SPRITES, ENEMY_SPRITES, BIOMES[biome], BACKGROUND_CLOUDS, BACKGROUND_SKY, HERO_SHEET, HUD_DIGITS, HUD_MULTIPLY, CONTROL_SPRITES, EMOTE_SPRITES]);

/** Download and decode them, calling `onProgress(done, total)` after each. A picture that fails does not stop the rest. */
export async function preloadSources(sources: readonly number[], onProgress: (done: number, total: number) => void): Promise<void> {
  let done = 0;
  onProgress(0, sources.length);
  await Promise.all(
    sources.map((source) =>
      Asset.fromModule(source)
        .downloadAsync()
        .catch(() => undefined)
        .then(() => {
          done += 1;
          onProgress(done, sources.length);
        }),
    ),
  );
}
