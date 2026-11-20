/**
 * What every repeatable thing pays in XP, as pure functions (no React, no storage), tested by
 * `npm run test:xp`. Tune the numbers here and nowhere else.
 *
 * - The first time always pays in full: a lesson its `xpReward`, a practice or checkpoint node its
 *   fixed amount, an Atom Maze level `ATOM_MAZE_FIRST_XP`.
 * - Every repeat pays a very small share of that (`repeatXp`).
 * - Myth Buster has no first-time reward, only a repeat reward, and the smallest one: a round takes
 *   a fifth of the time of a lesson, so its largest round (Quick Play) pays a fifth of a lesson's repeat.
 * - Endless is the one Myth Buster mode whose most scales with the score.
 */

/** A repeat pays this share of the first-time amount (rounded, never less than `REPEAT_MIN`). */
export const REPEAT_RATE = 0.1;
export const REPEAT_MIN = 1;

/** The XP for doing something again that already paid `first` XP the first time. */
export const repeatXp = (first: number): number => {
  if (!(first > 0)) return 0;
  return Math.max(REPEAT_MIN, Math.round(first * REPEAT_RATE));
};

/* ------------------------------ Atom Maze ------------------------------ */

/** A level won for the first time (a lesson is about 50; a level is about as long). */
export const ATOM_MAZE_FIRST_XP = 40;

export interface AtomMazeXp {
  xp: number;
  /** True when this was the level's first win (the full amount). */
  first: boolean;
}

/** A won level pays in full once, then the small repeat amount. A lost run pays nothing. */
export const atomMazeXp = (won: boolean, firstWin: boolean): AtomMazeXp => {
  if (!won) return { xp: 0, first: false };
  return firstWin ? { xp: ATOM_MAZE_FIRST_XP, first: true } : { xp: repeatXp(ATOM_MAZE_FIRST_XP), first: false };
};

/* ------------------------------ Myth Buster ------------------------------ */

export type MythBusterMode = "quick" | "challenge" | "endless";

/** The most a round of each mode can pay. Quick Play is the smallest of every repeatable thing in the app. */
export const MYTHBUSTER_MAX_XP: Record<MythBusterMode, number> = { quick: 1, challenge: 2, endless: 5 };

/** Endless: the score that earns the whole maximum (a long, clean streak under the clock). */
export const ENDLESS_FULL_SCORE = 500;

export interface MythBusterRound {
  mode: MythBusterMode;
  correct: number;
  /** Statements in the mode's round (ignored by Endless, which has no end). */
  rounds: number;
  /** The round's points (what the leaderboard sees). */
  score: number;
}

/**
 * XP for one finished Myth Buster round, never a first-time reward.
 * Quick Play and Challenge scale with how much of the deck was answered right; Endless with the score,
 * and any score at all pays at least 1.
 */
export const mythBusterXp = ({ mode, correct, rounds, score }: MythBusterRound): number => {
  const max = MYTHBUSTER_MAX_XP[mode];
  if (mode === "endless") {
    if (!(score > 0)) return 0;
    return Math.min(max, Math.max(1, Math.round((score / ENDLESS_FULL_SCORE) * max)));
  }
  if (!(correct > 0) || !(rounds > 0)) return 0;
  return Math.min(max, Math.round((correct / rounds) * max));
};
