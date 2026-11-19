/**
 * Which sound the hero's feet and the ground make (pure rules, no audio, unit-tested with
 * `npm run test:platformer`). The cues are in `services/sfx-core.ts`; the screen only asks here.
 *
 * Each level has one ground (its terrain theme): grass, snow, sand, stone, and the purple ground of the
 * last level, which sounds like soil. A footstep sounds each half stride the hero covers on the ground
 * (the walk's four frames are two steps), left foot then right.
 */

import type { SfxCue } from "../../services/sfx-core.ts";
import { STRIDE } from "./hero-anim-core.ts";

export type Ground = "grass" | "snow" | "sand" | "stone" | "soil";
export type Theme = "grass" | "sand" | "stone" | "purple" | "snow";

export const groundOf = (theme: Theme): Ground => (theme === "purple" ? "soil" : theme);

/** Tiles between two footstep sounds: a whole stride (every other footfall of the walk animation), so running is not a constant patter. */
export const STEP_LENGTH = STRIDE;

/** The footfall number (0, 1, 2...) the hero has reached after walking `distance` tiles. */
export const stepIndex = (distance: number): number => Math.floor(Math.max(0, distance) / STEP_LENGTH);

export const stepCue = (theme: Theme, index: number): SfxCue => `game.step-${groundOf(theme)}-${index % 2 === 0 ? "left" : "right"}` as SfxCue;
/** The hop is one sound on every ground. */
export const JUMP_CUE: SfxCue = "game.jump";
export const landCue = (theme: Theme): SfxCue => `game.land-${groundOf(theme)}` as SfxCue;
/** The thud of a defeated hero falling to the floor (there is no snow recording: the grass one is soft too). */
export const fallCue = (theme: Theme): SfxCue => `game.fall-${groundOf(theme) === "snow" ? "grass" : groundOf(theme)}` as SfxCue;

/** Every cue a level on this ground can ask for, to warm their players before the first step. */
export const cuesFor = (theme: Theme): SfxCue[] => [stepCue(theme, 0), stepCue(theme, 1), JUMP_CUE, landCue(theme), fallCue(theme), "game.checkpoint", "game.fireworks-launch", "game.fireworks-burst"];

/**
 * A footstep is due when the hero is on the ground, moving, and has walked into a new footfall since
 * `last` (the index heard last). Returns the index to play, or null.
 */
export const footstepDue = (last: number, distance: number, onGround: boolean, speed: number): number | null => {
  if (!onGround || Math.abs(speed) < 0.5) return null;
  const now = stepIndex(distance);
  return now !== last ? now : null;
};
